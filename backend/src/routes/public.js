const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios'); // Added missing import
const { fetchAndRewriteNotionPage } = require('../utils/proxy');
const { encrypt, decrypt, hashIP } = require('../utils/crypto');

// Public routes (no auth required)

// Lookup Domain -> Slug
router.get('/lookup-domain', async (req, res) => {
  const { domain } = req.query;
  if (!domain) return res.status(400).json({ error: 'Domain required' });

  const { db } = req;

  try {
    const result = await db.query(
      `SELECT p.slug 
             FROM custom_domains d
             JOIN protected_pages p ON d.page_id = p.id
             WHERE d.domain = $1 AND d.verified = TRUE`,
      [domain]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    res.json({ slug: result.rows[0].slug });
  } catch (error) {
    console.error('Lookup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify password and get access
router.post('/:slug', async (req, res) => {
  const { slug } = req.params;
  const { password } = req.body;
  const { db, redis } = req;

  if (!password) {
    return res.status(400).json({ error: 'Password richiesta' });
  }

  // Rate limiting per IP e slug
  const clientIP = req.ip || 'unknown';
  const rateLimitKey = `rate_limit:${clientIP}:${slug}`;
  const attempts = await redis.get(rateLimitKey);

  if (attempts && parseInt(attempts) >= 5) {
    return res.status(429).json({
      error: 'Troppi tentativi falliti. Riprova tra 15 minuti.'
    });
  }

  try {
    // Try cache first
    let pageData = await redis.get(`page:${slug}`);

    if (!pageData) {
      // Fallback to database
      const result = await db.query(
        'SELECT id, notion_url, password_hash, title FROM protected_pages WHERE slug = $1',
        [slug]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pagina non trovata' });
      }

      pageData = result.rows[0];

      // Cache for next time - normalize field names
      const normalizedData = {
        id: pageData.id,
        notionUrl: pageData.notion_url,
        passwordHash: pageData.password_hash,
        title: pageData.title
      };

      await redis.setex(
        `page:${slug}`,
        3600, // 1 hour
        JSON.stringify(normalizedData)
      );
    } else {
      pageData = JSON.parse(pageData);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, pageData.passwordHash || pageData.password_hash);

    if (!isValid) {
      // Increment rate limit counter
      const currentAttempts = await redis.get(rateLimitKey) || 0;
      await redis.setex(rateLimitKey, 900, parseInt(currentAttempts) + 1); // 15 minutes

      // Log failed attempt
      const ipHash = crypto.createHash('sha256')
        .update(clientIP)
        .digest('hex');

      await db.query(
        'INSERT INTO access_logs (protected_page_id, ip_hash, success) VALUES ($1, $2, $3)',
        [pageData.id, ipHash, false]
      );

      return res.status(401).json({ error: 'Password non corretta' });
    }

    // Reset rate limit on successful login
    await redis.del(rateLimitKey);

    // Create access token
    const accessToken = jwt.sign(
      { pageId: pageData.id, slug },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update visit count
    db.query(
      'UPDATE protected_pages SET visits_count = visits_count + 1 WHERE id = $1',
      [pageData.id]
    ).catch(console.error);

    res.json({
      success: true,
      notionUrl: pageData.notionUrl || pageData.notion_url,
      accessToken,
      proxyUrl: `/api/p/view/${slug}`
    });
  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({ error: 'Errore verifica password' });
  }
});

// NEW: Proxy Viewer Endpoint
router.get('/view/:slug', async (req, res) => {
  const { slug } = req.params;
  const { redis, db } = req;

  // 1. Verify authentication via query parameter (cross-domain compatible)
  const token = req.query.token;
  if (!token) {
    return res.status(401).send('<h1>Unauthorized</h1><p>Please log in first.</p>');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.slug !== slug) {
      return res.status(403).send('<h1>Forbidden</h1><p>Token mismatch.</p>');
    }

    // 2. Get Notion URL and Branding Settings
    let pageData = await redis.get(`page:${slug}`);
    let showBranding = true;

    if (!pageData) {
      // Fetch Page AND User config
      const result = await db.query(`
        SELECT p.notion_url, u.branding_enabled, u.subscription_status 
        FROM protected_pages p
        JOIN users u ON p.user_id = u.id
        WHERE p.slug = $1
      `, [slug]);

      if (result.rows.length === 0) return res.status(404).send('Not Found');

      const row = result.rows[0];
      pageData = { notionUrl: row.notion_url };

      // If user is FREE, branding is ALWAYS enabled regardless of setting
      // If user is PRO/LIFETIME, respect their setting
      const isPro = row.subscription_status && row.subscription_status !== 'free';
      showBranding = isPro ? (row.branding_enabled !== false) : true;
    } else {
      pageData = JSON.parse(pageData);
      // For cached pages, we need to decide how to store branding info. 
      // For now, let's just make a separate lightweight query for branding/settings if cache doesn't have it
      // OR invalidating cache on setting change.
      // Easiest for now: just re-query branding status quickly or assume true if missing.
      // Ideally we'd cache this too. Let's do a quick DB lookup for settings to be reactive.
      const settingsRes = await db.query(`
          SELECT u.branding_enabled, u.subscription_status
          FROM protected_pages p
          JOIN users u ON p.user_id = u.id
          WHERE p.slug = $1
      `, [slug]);
      if (settingsRes.rows.length > 0) {
        const row = settingsRes.rows[0];
        const isPro = row.subscription_status && row.subscription_status !== 'free';
        showBranding = isPro ? (row.branding_enabled !== false) : true;
      }
    }

    // 3. Serve Iframe with Direct Notion URL
    const notionUrl = pageData.notionUrl || pageData.notion_url;

    // Generate page HTML with iframe pointing to Notion
    const iframeHtml = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>${pageData.title || 'Protected Page'}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html { width: 100%; height: 100%; overflow: hidden; }
        iframe { width: 100%; height: 100%; border: none; display: block; }
        .loading {
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            font-family: system-ui, -apple-system, sans-serif;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="loading">Loading protected content...</div>
    <iframe id="notion-frame" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer"></iframe>
    <script>
        (function() {
            // Obfuscated URL (basic protection from casual inspection)
            const parts = ['${notionUrl.substring(0, 30)}', '${notionUrl.substring(30)}'];
            const iframe = document.getElementById('notion-frame');
            iframe.src = parts.join('');
            
            iframe.onload = () => document.querySelector('.loading').style.display = 'none';
            
            // Disable right-click
            document.addEventListener('contextmenu', e => e.preventDefault());
            
            // Make iframe src harder to extract
            Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
                get: function() { return iframe === this ? 'about:blank' : this.getAttribute('src'); }
            });
        })();
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Show-Branding', showBranding.toString());
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    // Allow iframe from same origin (notionlock.com -> api.notionlock.com)
    res.removeHeader('X-Frame-Options');
    res.send(iframeHtml);

  } catch (error) {
    console.error('Proxy Route Error:', error);
    console.error('Proxy Route Error:', error);
    res.status(500).json({ error: 'Error loading page', details: error.message });
  }
});

// NEW: Notion API Endpoint - Returns JSON data for react-notion-x
router.get('/view/:slug/data', async (req, res) => {
  const { slug } = req.params;
  const { db, redis } = req;

  try {
    // Import NotionService
    const notionService = require('../services/notion');

    // 1. Get page data from DB
    const pageResult = await db.query(
      'SELECT * FROM protected_pages WHERE slug = $1',
      [slug]
    );

    if (pageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const pageData = pageResult.rows[0];

    // 2. Check password if required
    if (pageData.password_hash) {
      // Check for valid JWT token in cookies
      const token = req.cookies[`auth_${slug}`];

      if (!token) {
        return res.status(401).json({
          error: 'Password required',
          requiresPassword: true
        });
      }

      try {
        jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({
          error: 'Invalid or expired token',
          requiresPassword: true
        });
      }
    }

    // 3. Extract and validate page ID
    const pageId = notionService.extractPageId(pageData.notionUrl || pageData.notion_url);

    if (!pageId) {
      return res.status(400).json({ error: 'Invalid Notion URL format' });
    }

    // 4. Try to get from cache first
    const cacheKey = `notion:page:${pageId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      console.log(`[API] Cache hit for page ${pageId}`);
      return res.json(JSON.parse(cached));
    }

    // 5. Fetch from Notion API
    console.log(`[API] Fetching from Notion API: ${pageId}`);
    const notionData = await notionService.getPageData(pageId);
    const recordMap = notionService.toRecordMap(notionData);

    // 6. Determine branding visibility
    let showBranding = true;
    if (pageData.user_id) {
      const settingsRes = await db.query(
        'SELECT subscription_status, branding_enabled FROM users WHERE id = $1',
        [pageData.user_id]
      );

      if (settingsRes.rows.length > 0) {
        const row = settingsRes.rows[0];
        const isPro = row.subscription_status && row.subscription_status !== 'free';
        showBranding = isPro ? (row.branding_enabled !== false) : true;
      }
    }

    // 7. Prepare response
    const response = {
      recordMap,
      showBranding,
      pageTitle: notionData.page.properties?.title?.title?.[0]?.plain_text || 'Untitled'
    };

    // 8. Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(response));

    res.json(response);

  } catch (error) {
    console.error('Notion API Route Error:', error);

    if (error.message?.includes('API client not initialized')) {
      return res.status(503).json({
        error: 'Notion API not configured. Please add NOTION_API_KEY to environment variables.'
      });
    }

    res.status(500).json({
      error: 'Error loading page from Notion',
      details: error.message
    });
  }
});

// NEW: Asset Proxy Endpoint (Moved out of view/:slug scope)
router.get('/asset', async (req, res) => {
  const { url } = req.query;
  const { redis } = req;

  if (!url) return res.status(400).send('URL required');

  // Common headers helper
  const setProxyHeaders = (res, contentType) => {
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24h

    // CRITICAL: Headers for worker scripts to enable importScripts
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Cross-Origin-Embedder-Policy', 'credentialless');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Service-Worker-Allowed', '/'); // Allow workers from any path

    res.removeHeader('Access-Control-Allow-Credentials');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
  };

  try {
    const cacheKey = `asset:${url}`;
    const cacheTypeKey = `asset:${url}:type`;

    // 1. Try to get from Cache
    // We use getBuffer for binary data
    const [cachedData, cachedType] = await Promise.all([
      redis.getBuffer(cacheKey),
      redis.get(cacheTypeKey)
    ]);

    if (cachedData && cachedType) {
      setProxyHeaders(res, cachedType);
      return res.send(cachedData);
    }

    // 2. Fetch from Source if not cached
    const response = await axios.get(url, {
      responseType: 'arraybuffer', // Important for images/fonts
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const contentType = response.headers['content-type'];

    // 3. Save to Cache (24 hours)
    // Pipeline to set both keys atomically-ish
    const pipeline = redis.pipeline();
    pipeline.setex(cacheKey, 86400, response.data);
    pipeline.setex(cacheTypeKey, 86400, contentType);
    await pipeline.exec();

    // 4. Serve
    setProxyHeaders(res, contentType);
    res.send(response.data);

  } catch (error) {
    console.error('Asset Proxy Error for:', url, error.message);
    if (error.response && error.response.status === 429) {
      console.error('Rate Limit Hit on Notion API!');
    }
    // Attempt to serve something or just error
    res.status(500).send('Error loading asset');
  }
});

// NEW: CORS Proxy Endpoint for API calls (fetch/XHR)
router.get('/cors-proxy', async (req, res) => {
  const { url } = req.query;

  if (!url) return res.status(400).send('URL required');

  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    // Forward the content type from the original response
    const contentType = response.headers['content-type'] || 'application/json';

    // Set CORS headers
    res.set('Content-Type', contentType);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.removeHeader('Access-Control-Allow-Credentials');
    res.removeHeader('Cross-Origin-Resource-Policy');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');

    res.send(response.data);

  } catch (error) {
    console.error('CORS Proxy Error for:', url, error.message);
    res.status(error.response?.status || 500).send(error.response?.data || 'Error proxying request');
  }
});

// CORS Proxy POST endpoint
router.post('/cors-proxy', async (req, res) => {
  const { url } = req.query;

  if (!url) return res.status(400).send('URL required');

  try {
    const response = await axios({
      method: 'post',
      url: url,
      data: req.body,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': req.headers['content-type'] || 'application/json'
      }
    });

    // Forward the content type from the original response
    const contentType = response.headers['content-type'] || 'application/json';

    // Set CORS headers
    res.set('Content-Type', contentType);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.removeHeader('Access-Control-Allow-Credentials');
    res.removeHeader('Cross-Origin-Resource-Policy');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');

    res.send(response.data);

  } catch (error) {
    console.error('CORS Proxy POST Error for:', url, error.message);
    res.status(error.response?.status || 500).send(error.response?.data || 'Error proxying request');
  }
});

// Handle OPTIONS preflight for CORS proxy
router.options('/cors-proxy', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(204);
});

// Handle OPTIONS preflight for asset endpoint
router.options('/asset', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(204);
});

// Get page info (for displaying password form)
router.get('/:slug/info', async (req, res) => {
  const { slug } = req.params;
  const { redis, db } = req;

  try {
    let pageData = await redis.get(`page:${slug}`);

    if (!pageData) {
      const result = await db.query(
        'SELECT title FROM protected_pages WHERE slug = $1',
        [slug]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pagina non trovata' });
      }

      pageData = { title: result.rows[0].title };
    } else {
      pageData = JSON.parse(pageData);
    }

    res.json({ title: pageData.title });
  } catch (error) {
    console.error('Get page info error:', error);
    res.status(500).json({ error: 'Errore recupero informazioni' });
  }
});

// JavaScript Rewriting Proxy - Strips SharedWorker/Worker code
router.get('/js-proxy', async (req, res) => {
  const { url } = req.query;
  const { redis } = req;

  if (!url) return res.status(400).send('URL required');

  try {
    const cacheKey = `js:${url}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      res.set('Content-Type', 'application/javascript; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('Access-Control-Allow-Origin', '*');
      return res.send(cached);
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.notion.so/'
      },
      responseType: 'text'
    });

    let code = response.data;

    // Strip SharedWorker/Worker instantiations
    code = code.replace(
      /new\s+SharedWorker\s*\(/g,
      '(function(){console.warn("[NotionLock] SharedWorker blocked");return{port:{start:function(){},addEventListener:function(){},postMessage:function(){}}}})&&new SharedWorker('
    );

    code = code.replace(
      /new\s+Worker\s*\(/g,
      '(function(){console.warn("[NotionLock] Worker blocked");return{postMessage:function(){},addEventListener:function(){},terminate:function(){}}})&&new Worker('
    );

    code = code.replace(
      /navigator\.storage\.getDirectory\s*\(/g,
      '(async function(){console.warn("[NotionLock] OPFS blocked");throw new Error("OPFS not available")})&&navigator.storage.getDirectory('
    );

    await redis.setex(cacheKey, 86400, code);

    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(code);

  } catch (error) {
    console.error('[JS-Proxy] Error:', error.message);
    res.status(500).send('// Error fetching script');
  }
});

// Secure Iframe Endpoint - Serves Notion page via encrypted token
router.get('/secure-frame', async (req, res) => {
  const { token } = req.query;
  const { redis } = req;

  if (!token) return res.status(400).send('Token required');

  try {
    // Verify JWT token
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // ONE-TIME USE: Check if token already used
    const tokenStatus = await redis.get(`token:${payload.tokenId}`);
    if (tokenStatus === 'used') {
      return res.status(401).send('<h1>Token Already Used</h1><p>This link can only be used once. Please refresh the main page.</p>');
    }
    if (!tokenStatus) {
      return res.status(401).send('<h1>Token Invalid or Expired</h1>');
    }

    // Mark token as used
    await redis.set(`token:${payload.tokenId}`, 'used', 'EX', 300);

    // Check token expiration (5 minutes)
    if (Date.now() - payload.iat > 300000) {
      return res.status(401).send('<h1>Token Expired</h1><p>Please refresh the page.</p>');
    }

    // Rate limiting per IP per page
    const clientIP = req.ip || req.connection.remoteAddress;
    const rateKey = `rate:iframe:${clientIP}:${payload.pageId}`;
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, 60);

    if (count > 30) { // Allow 30 requests per minute
      return res.status(429).send('<h1>Too Many Requests</h1><p>Please wait a moment.</p>');
    }

    // Decrypt Notion URL
    const notionUrl = decrypt(payload.encryptedUrl);

    // Fetch and serve Notion HTML directly
    // NOTE: Worker errors will appear in console but page should still function
    const response = await axios.get(notionUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      maxRedirects: 5
    });

    // Send HTML as-is (no modifications needed)
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(response.data);

  } catch (error) {
    console.error('[Secure-Frame] Error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).send('<h1>Invalid Token</h1>');
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).send('<h1>Token Expired</h1><p>Please refresh the page.</p>');
    }

    res.status(500).send('<h1>Error Loading Page</h1>');
  }
});

module.exports = router;