const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios'); // Added missing import
const { fetchAndRewriteNotionPage } = require('../utils/proxy');

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
  const authHeader = req.headers.authorization;

  // 1. Verify Token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized'); // Use send instead of json for simple status if prefer
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.slug !== slug) {
      return res.status(403).send('Forbidden: Token mismatch');
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

    // 3. Fetch and Serve Proxied Content
    const proxiedHtml = await fetchAndRewriteNotionPage(pageData.notionUrl || pageData.notion_url);

    // CRITICAL HEADERS FOR CROSS-ORIGIN WORKERS
    // These headers enable SharedWorker and OPFS to work across origins
    // This is how NotionHero and other production services solve the worker issue

    // ALTERNATIVE APPROACH: Disable features that OPFS requires via Permissions Policy
    // This forces Notion to skip OPFS/Worker initialization entirely
    res.setHeader('Permissions-Policy', 'shared-array-buffer=()');

    // Enable cross-origin isolation - required for SharedWorker/OPFS
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Standard CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Remove restrictive headers that Notion might set
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');

    // Ensure charset is UTF-8 to prevent encoding issues with special chars
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Show-Branding', showBranding.toString()); // Custom Header for Frontend
    res.send(proxiedHtml);

  } catch (error) {
    console.error('Proxy Route Error:', error);
    console.error('Proxy Route Error:', error);
    res.status(500).json({ error: 'Error loading page', details: error.message });
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
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Service-Worker-Allowed', '/'); // Allow workers from any path
    res.removeHeader('Access-Control-Allow-Credentials');
    res.removeHeader('Cross-Origin-Resource-Policy');
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

module.exports = router;