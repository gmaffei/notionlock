// Updated public.js with fixes for NotionLock password protection bugs

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios'); // Added missing import
const { fetchAndRewriteNotionPage } = require('../utils/proxy');
const { encrypt, decrypt, hashIP } = require('../utils/crypto');

// Public routes (no auth required)

// NEW: Proxy Viewer Endpoint
router.get('/view/:slug', async (req, res) => {
  const { slug } = req.params;
  const { redis, db } = req;
  const token = req.query.token;
  if (!token) return res.status(401).send('<h1>Unauthorized</h1><p>Please log in first.</p>');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.slug !== slug) return res.status(403).send('<h1>Forbidden</h1><p>Token mismatch.</p>');

    let pageData = await redis.get(`page:${slug}`);
    if (!pageData) {
      const result = await db.query(`
            SELECT p.notion_url, p.id, u.subscription_status, u.branding_enabled
            FROM protected_pages p
            JOIN users u ON p.user_id = u.id
            WHERE p.slug = $1
          `, [slug]);
      if (result.rows.length === 0) return res.status(404).send('Not Found');
      const row = result.rows[0];
      const isPro = row.subscription_status && row.subscription_status !== 'free';
      const showBranding = isPro ? (row.branding_enabled !== false) : true;
      pageData = { notionUrl: row.notion_url, id: row.id, showBranding };
      await redis.setex(`page:${slug}`, 3600, JSON.stringify(pageData));
    } else {
      pageData = JSON.parse(pageData);
    }

    if (!pageData.notionUrl) {
      console.error('Missing notionUrl for slug', slug);
      return res.status(500).json({ error: 'Missing Notion URL for page' });
    }
    const notionUrl = pageData.notionUrl;
    try {
      const rewrittenHtml = await fetchAndRewriteNotionPage(notionUrl);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Show-Branding', (pageData.showBranding !== false).toString());
      return res.send(rewrittenHtml);
    } catch (fetchError) {
      console.error('[View] Notion fetch error:', fetchError.message);
      try {
        const rawResponse = await axios.get(notionUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.1 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
          }
        });
        const rawHtml = rawResponse.data;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('X-Show-Branding', (pageData.showBranding !== false).toString());
        return res.send(rawHtml);
      } catch (fallbackError) {
        console.error('Fallback fetch error:', fallbackError.message);
        return res.status(500).send(`
            <h1>Error Loading Page</h1>
            <p>Could not fetch content from Notion.</p>
            <hr>
            <h3>Debug Info:</h3>
            <p><strong>Primary Error:</strong> ${fetchError.message}</p>
            <p><strong>Fallback Error:</strong> ${fallbackError.message}</p>
          `);
      }
    }
  } catch (error) {
    console.error('Proxy Route Error:', error);
    res.status(500).json({ error: 'Error loading page', details: error.message });
  }
});

// NEW: Notion API Endpoint - Returns JSON data for react-notion-x
router.get('/view/:slug/data', async (req, res) => {
  const { slug } = req.params;
  const { db, redis } = req;

  try {
    const notionService = require('../services/notion');
    const pageResult = await db.query('SELECT * FROM protected_pages WHERE slug = $1', [slug]);
    if (pageResult.rows.length === 0) return res.status(404).json({ error: 'Page not found' });
    const pageData = pageResult.rows[0];
    if (pageData.password_hash) {
      const token = req.cookies[`auth_${slug}`];
      if (!token) return res.status(401).json({ error: 'Password required', requiresPassword: true });
      try { jwt.verify(token, process.env.JWT_SECRET); } catch (err) { return res.status(401).json({ error: 'Invalid or expired token', requiresPassword: true }); }
    }
    const pageId = notionService.extractPageId(pageData.notionUrl || pageData.notion_url);
    if (!pageId) return res.status(400).json({ error: 'Invalid Notion URL format' });
    const cacheKey = `notion:page:${pageId}`;
    const cached = await redis.get(cacheKey);
    if (cached) { console.log(`[API] Cache hit for page ${pageId}`); return res.json(JSON.parse(cached)); }
    const notionData = await notionService.getPageData(pageId);
    const recordMap = notionService.toRecordMap(notionData);
    let showBranding = true;
    if (pageData.user_id) {
      const settingsRes = await db.query('SELECT subscription_status, branding_enabled FROM users WHERE id = $1', [pageData.user_id]);
      if (settingsRes.rows.length > 0) {
        const row = settingsRes.rows[0];
        const isPro = row.subscription_status && row.subscription_status !== 'free';
        showBranding = isPro ? (row.branding_enabled !== false) : true;
      }
    }
    const response = { recordMap, showBranding, pageTitle: notionData.page.properties?.title?.title?.[0]?.plain_text || 'Untitled' };
    await redis.setex(cacheKey, 300, JSON.stringify(response));
    res.json(response);
  } catch (error) {
    console.error('Notion API Route Error:', error);
    if (error.message?.includes('API client not initialized')) {
      return res.status(503).json({ error: 'Notion API not configured. Please add NOTION_API_KEY to environment variables.' });
    }
    res.status(500).json({ error: 'Error loading page from Notion', details: error.message });
  }
});

// NEW: Asset Proxy Endpoint (Moved out of view/:slug scope)
router.get('/asset', async (req, res) => {
  const { url } = req.query;
  const { redis } = req;
  if (!url) return res.status(400).send('URL required');
  const setProxyHeaders = (res, contentType) => {
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Cross-Origin-Opener-Policy', 'same-origin');
    res.set('Cross-Origin-Embedder-Policy', 'require-corp');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Service-Worker-Allowed', '/');
    res.removeHeader('Access-Control-Allow-Credentials');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
  };
  try {
    const cacheKey = `asset:${url}`;
    const cacheTypeKey = `asset:${url}:type`;
    const [cachedData, cachedType] = await Promise.all([redis.getBuffer(cacheKey), redis.get(cacheTypeKey)]);
    if (cachedData && cachedType) { setProxyHeaders(res, cachedType); return res.send(cachedData); }
    const response = await axios.get(url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } });
    const contentType = response.headers['content-type'];
    const pipeline = redis.pipeline();
    pipeline.setex(cacheKey, 86400, response.data);
    pipeline.setex(cacheTypeKey, 86400, contentType);
    await pipeline.exec();
    setProxyHeaders(res, contentType);
    res.send(response.data);
  } catch (error) {
    console.error(`[CORS-Proxy] Error fetching ${url}:`, error.message);
    if (error.response) {
      console.error('[CORS-Proxy] Upstream Response Status:', error.response.status);
      console.error('[CORS-Proxy] Upstream Response Data:', JSON.stringify(error.response.data).slice(0, 500));
      return res.status(error.response.status).send(error.response.data);
    }
    res.status(500).json({ error: 'Proxy request failed: ' + error.message });
  }
});

// NEW: CORS Proxy Endpoint for API calls (fetch/XHR) - Supports GET, POST, etc.
router.all('/cors-proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('URL required');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-notion-active-user-header, notion-client-version');
    return res.status(200).end();
  }
  try {
    const method = req.method;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Origin': 'https://www.notion.so',
      'Referer': 'https://www.notion.so/',
    };
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
    if (req.headers['notion-client-version']) headers['notion-client-version'] = req.headers['notion-client-version'];
    if (req.headers['x-notion-active-user-header']) headers['x-notion-active-user-header'] = req.headers['x-notion-active-user-header'];
    if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];
    const requestData = req.rawBody || req.body;
    const axiosConfig = { method, url, responseType: 'arraybuffer', headers, data: (method === 'POST' || method === 'PUT') ? requestData : undefined, validateStatus: () => true };
    const response = await axios(axiosConfig);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-notion-active-user-header, notion-client-version');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    const contentType = response.headers['content-type'];
    if (contentType) res.setHeader('Content-Type', contentType);
    if (response.status >= 400) { res.status(response.status).send(response.data); } else { res.send(response.data); }
  } catch (error) {
    console.error(`CORS Proxy Error [${req.method} ${url}]:`, error.message);
    if (error.response) {
      console.error('[CORS-Proxy] Upstream Response Status:', error.response.status);
      console.error('[CORS-Proxy] Upstream Response Data:', JSON.stringify(error.response.data).slice(0, 500));
      res.status(error.response.status);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      if (error.response.data) res.send(error.response.data);
      else res.end();
    } else {
      res.status(500).send('Proxy Error: ' + error.message);
    }
  }
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
      const result = await db.query('SELECT title FROM protected_pages WHERE slug = $1', [slug]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Pagina non trovata' });
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

// New route: refresh JWT token
router.post('/refresh/:slug', async (req, res) => {
  const { slug } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.slug !== slug) return res.status(403).json({ error: 'Token slug mismatch' });
    const newToken = jwt.sign({ pageId: decoded.pageId, slug }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ accessToken: newToken });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
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
    const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': '*/*', 'Referer': 'https://www.notion.so/' }, responseType: 'text' });
    let code = response.data;
    code = code.replace(/new\s+SharedWorker\s*\(/g, (match) => {
      return '(function(){console.warn("[NotionLock] SharedWorker blocked");return{port:{start:function(){},addEventListener:function(){},postMessage:function(){}}})' + match;
    });
    code = code.replace(/new\s+Worker\s*\(/g, (match) => {
      return '(function(){console.warn("[NotionLock] Worker blocked");return{postMessage:function(){},addEventListener:function(){},terminate:function(){}}})' + match;
    });
    code = code.replace(/navigator\.storage\.getDirectory\s*\(/g, (match) => {
      return '(async function(){console.warn("[NotionLock] OPFS blocked");throw new Error("OPFS not available")})' + match;
    });
    await redis.setex(cacheKey, 86400, code);
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Opener-Policy', 'same-origin');
    res.set('Cross-Origin-Embedder-Policy', 'require-corp');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');

    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Expose-Headers', '*');
    res.set('Timing-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(code);
  } catch (error) {
    console.error('[JS-Proxy] Error:', error.message);
    res.status(500).send('// Error fetching script');
  }
});

// Handle OPTIONS preflight for js-proxy
router.options('/js-proxy', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');
  res.sendStatus(204);
});

// Secure Iframe Endpoint - Serves Notion page via encrypted token
router.get('/secure-frame', async (req, res) => {
  const { token } = req.query;
  const { redis } = req;
  if (!token) return res.status(400).send('Token required');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const tokenStatus = await redis.get(`token:${payload.tokenId}`);
    if (tokenStatus === 'used') return res.status(401).send('<h1>Token Already Used</h1><p>This link can only be used once. Please refresh the main page.</p>');
    if (!tokenStatus) return res.status(401).send('<h1>Token Invalid or Expired</h1>');
    await redis.set(`token:${payload.tokenId}`, 'used', 'EX', 300);
    if (Date.now() - payload.iat > 300000) return res.status(401).send('<h1>Token Expired</h1><p>Please refresh the page.</p>');
    const clientIP = req.ip || req.connection.remoteAddress;
    const rateKey = `rate:iframe:${clientIP}:${payload.pageId}`;
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, 60);
    if (count > 30) return res.status(429).send('<h1>Too Many Requests</h1><p>Please wait a moment.</p>');
    const notionUrl = decrypt(payload.encryptedUrl);
    const response = await axios.get(notionUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' }, maxRedirects: 5 });
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Cross-Origin-Opener-Policy', 'same-origin');
    res.set('Cross-Origin-Embedder-Policy', 'require-corp');
    res.send(response.data);
  } catch (error) {
    console.error('[Secure-Frame] Error:', error.message);
    if (error.name === 'JsonWebTokenError') return res.status(401).send('<h1>Invalid Token</h1>');
    if (error.name === 'TokenExpiredError') return res.status(401).send('<h1>Token Expired</h1><p>Please refresh the page.</p>');
    res.status(500).send('<h1>Error Loading Page</h1>');
  }
});



// Duplicate imports removed

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
  // Sliding window rate limit: max 10 attempts per 15 minutes
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const limit = 10;
  const attemptsKey = `rate_limit:${clientIP}:${slug}`;
  // Remove old entries
  await redis.zremrangebyscore(attemptsKey, 0, now - windowMs);
  // Count current attempts
  const attemptsCount = await redis.zcard(attemptsKey);
  if (attemptsCount >= limit) {
    return res.status(429).json({
      error: 'Troppi tentativi falliti. Riprova tra 15 minuti.'
    });
  }
  // Record this attempt
  await redis.zadd(attemptsKey, now, `${now}`);
  // Set TTL so key expires after window
  await redis.expire(attemptsKey, Math.ceil(windowMs / 1000));

  try {
    // Try cache first
    let pageData = await redis.get(`page:${slug}`);

    if (!pageData) {
      // Fallback to database
      const result = await db.query(
        'SELECT p.id, p.notion_url, p.password_hash, p.title, u.subscription_status, u.branding_enabled FROM protected_pages p\n          JOIN users u ON p.user_id = u.id WHERE p.slug = $1',
        [slug]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pagina non trovata' });
      }

      const row = result.rows[0];
      // Determine branding based on plan
      const isPro = row.subscription_status && row.subscription_status !== 'free';
      const showBranding = isPro ? (row.branding_enabled !== false) : true;

      pageData = {
        id: row.id,
        notionUrl: row.notion_url,
        passwordHash: row.password_hash,
        title: row.title,
        showBranding
      };

      // Cache for next time (include branding flag)
      await redis.setex(
        `page:${slug}`,
        3600, // 1 hour
        JSON.stringify(pageData)
      );
    } else {
      pageData = JSON.parse(pageData);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, pageData.passwordHash);

    if (!isValid) {
      // Increment rate limit counter
      // This is the old counter, the new sliding window is above.
      // For now, we'll keep this for logging purposes, but the primary rate limit is the sliding window.
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

    // Reset sliding window attempts on successful login
    await redis.del(`rate_limit:${clientIP}:${slug}`);

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
      notionUrl: pageData.notionUrl,
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

    // 2. Get page data (including branding) from cache or DB
    let pageData = await redis.get(`page:${slug}`);
    if (!pageData) {
      const result = await db.query(`
            SELECT p.notion_url, p.id, u.subscription_status, u.branding_enabled
            FROM protected_pages p
            JOIN users u ON p.user_id = u.id
            WHERE p.slug = $1
          `, [slug]);
      if (result.rows.length === 0) return res.status(404).send('Not Found');
      const row = result.rows[0];
      const isPro = row.subscription_status && row.subscription_status !== 'free';
      const showBranding = isPro ? (row.branding_enabled !== false) : true;
      pageData = {
        notionUrl: row.notion_url,
        id: row.id,
        showBranding
      };
      // Cache including branding flag
      await redis.setex(`page:${slug}`, 3600, JSON.stringify(pageData));
    } else {
      pageData = JSON.parse(pageData);
    }

    // 3. Fetch and return HTML (supports all content)
    // Ensure notionUrl is present
    if (!pageData.notionUrl) {
      console.error('Missing notionUrl for slug', slug);
      return res.status(500).json({ error: 'Missing Notion URL for page' });
    }
    const notionUrl = pageData.notionUrl;
    try {
      const rewrittenHtml = await fetchAndRewriteNotionPage(notionUrl);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      const showBrandingVal = (pageData.showBranding !== false).toString();
      res.setHeader('X-Show-Branding', showBrandingVal);
      // CORS headers to allow assets and scripts to load correctly
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(rewrittenHtml);
    } catch (fetchError) {
      console.error('[View] Notion fetch error:', fetchError.message);
      // Fallback: try to fetch raw Notion page without rewriting
      try {
        const rawResponse = await axios.get(notionUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
          }
        });
        const rawHtml = rawResponse.data;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        const showBrandingVal = (pageData.showBranding !== false).toString();
        res.setHeader('X-Show-Branding', showBrandingVal);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(rawHtml);
      } catch (fallbackError) {
        console.error('Fallback fetch error:', fallbackError.message);
        // Return the actual error message to the client for debugging
        return res.status(500).send(`
            <h1>Error Loading Page</h1>
            <p>Could not fetch content from Notion.</p>
            <hr>
            <h3>Debug Info:</h3>
            <p><strong>Primary Error:</strong> ${fetchError.message}</p>
            <p><strong>Fallback Error:</strong> ${fallbackError.message}</p>
          `);
      }
    }
  } catch (error) {
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

// NEW: CORS Proxy Endpoint for API calls (fetch/XHR) - Supports GET, POST, etc.
router.all('/cors-proxy', async (req, res) => {
  const { url } = req.query;

  if (!url) return res.status(400).send('URL required');

  // Handle preflight OPTIONS explicitly
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-notion-active-user-header, notion-client-version');
    return res.status(200).end();
  }

  try {
    const method = req.method;

    // Construct headers to forward to Notion
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Origin': 'https://www.notion.so',
      'Referer': 'https://www.notion.so/',
    };

    // Forward crucial headers if present
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
    if (req.headers['notion-client-version']) headers['notion-client-version'] = req.headers['notion-client-version'];
    if (req.headers['x-notion-active-user-header']) headers['x-notion-active-user-header'] = req.headers['x-notion-active-user-header'];
    if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];

    // Use rawBody if available (from express.json verify), otherwise fall back to body
    // dealing with buffer/string issues
    const requestData = req.rawBody || req.body;

    const axiosConfig = {
      method: method,
      url: url,
      responseType: 'arraybuffer',
      headers: headers,
      data: (method === 'POST' || method === 'PUT') ? requestData : undefined,
      validateStatus: () => true // Do NOT throw on 4xx/5xx, return them normally
    };

    const response = await axios(axiosConfig);

    // Set CORS headers on response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-notion-active-user-header, notion-client-version');

    // Forward Content-Type
    const contentType = response.headers['content-type'];
    if (contentType) res.setHeader('Content-Type', contentType);

    res.send(response.data);

  } catch (error) {
    console.error(`CORS Proxy Error [${req.method} ${url}]:`, error.message);

    // If Notion returned an error response, forward it
    if (error.response) {
      res.status(error.response.status);
      res.setHeader('Access-Control-Allow-Origin', '*'); // Ensure CORS on error too
      if (error.response.data) res.send(error.response.data);
      else res.end();
    } else {
      res.status(500).send('Proxy Error');
    }
  }
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

// New route: refresh JWT token
router.post('/refresh/:slug', async (req, res) => {
  const { slug } = req.params;
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.slug !== slug) {
      return res.status(403).json({ error: 'Token slug mismatch' });
    }
    const newToken = jwt.sign({ pageId: decoded.pageId, slug }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ accessToken: newToken });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
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

    // Comprehensive CORS headers for cross-origin script loading
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Expose-Headers', '*');
    res.set('Timing-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(code);

  } catch (error) {
    console.error('[JS-Proxy] Error:', error.message);
    res.status(500).send('// Error fetching script');
  }
});

// Handle OPTIONS preflight for js-proxy
router.options('/js-proxy', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');
  res.sendStatus(204);
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

    // Use the comprehensive proxy function to fetch and rewrite content
    const { fetchAndRewriteNotionPage } = require('../utils/proxy');

    // Pass the decrypted URL to our proxy utility
    const html = await fetchAndRewriteNotionPage(notionUrl);

    // Serve the modified HTML
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Add COOP/COEP headers to allow SharedArrayBuffer usage
    res.set('Cross-Origin-Opener-Policy', 'same-origin');
    res.set('Cross-Origin-Embedder-Policy', 'require-corp');

    res.send(html);

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