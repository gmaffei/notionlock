// Consolidated public.js with fixes for Proxy/COEP and removed duplicates

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const { fetchAndRewriteNotionPage } = require('../utils/proxy');
const { encrypt, decrypt, hashIP } = require('../utils/crypto');

// --- Helper for Proxy Headers ---
// CRITICAL FIX: Do NOT set COEP on proxied resources - it requires all resources to have CORP headers
// which Notion does not provide. We only set CORP on our proxy responses.
const setProxyHeaders = (res, contentType) => {
  if (contentType) res.set('Content-Type', contentType);
  res.set('Cache-Control', 'public, max-age=86400');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-notion-active-user-header, notion-client-version');
  res.set('Access-Control-Expose-Headers', '*');
  res.set('Timing-Allow-Origin', '*');

  // CORP header - allows our proxied resources to be loaded cross-origin
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');

  // Remove restrictive headers that could cause issues
  res.removeHeader('Access-Control-Allow-Credentials');
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy'); // CRITICAL: Remove COEP
  res.removeHeader('Cross-Origin-Opener-Policy'); // Remove COOP from sub-resources
};

// ==========================================
// 1. PROXY ROUTES (MUST BE FIRST - before :slug routes)
// ==========================================

// Asset Proxy
router.get('/asset', async (req, res) => {
  const { url } = req.query;
  const { redis } = req;
  if (!url) return res.status(400).send('URL required');

  try {
    const cacheKey = `asset:${url}`;
    const cacheTypeKey = `asset:${url}:type`;
    const [cachedData, cachedType] = await Promise.all([redis.getBuffer(cacheKey), redis.get(cacheTypeKey)]);

    if (cachedData && cachedType) {
      setProxyHeaders(res, cachedType);
      return res.send(cachedData);
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });

    const contentType = response.headers['content-type'];
    const pipeline = redis.pipeline();
    pipeline.setex(cacheKey, 86400, response.data);
    pipeline.setex(cacheTypeKey, 86400, contentType);
    await pipeline.exec();

    setProxyHeaders(res, contentType);
    res.send(response.data);
  } catch (error) {
    console.error(`[Asset Proxy] Error: ${url}`, error.message);
    setProxyHeaders(res, 'text/plain');
    if (error.response) {
      res.status(error.response.status).send(error.response.data || 'Proxy Error');
    } else {
      res.status(500).send('Asset Proxy Error');
    }
  }
});

router.options('/asset', (req, res) => {
  setProxyHeaders(res, null);
  res.sendStatus(204);
});

// CORS Proxy - Enhanced with better error handling and body parsing
router.all('/cors-proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  if (req.method === 'OPTIONS') {
    setProxyHeaders(res, null);
    return res.status(200).end();
  }

  try {
    let targetUrl = url;
    try {
      if (targetUrl.includes('%25')) {
        targetUrl = decodeURIComponent(targetUrl);
      }
    } catch (e) { /* URL is fine */ }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.notion.so',
      'Referer': 'https://www.notion.so/',
    };

    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
    if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];
    if (req.headers['x-notion-active-user-header']) headers['x-notion-active-user-header'] = req.headers['x-notion-active-user-header'];
    if (req.headers['notion-client-version']) headers['notion-client-version'] = req.headers['notion-client-version'];

    let requestBody = undefined;
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (req.rawBody) {
        requestBody = req.rawBody;
      } else if (req.body) {
        if (typeof req.body === 'object' && Object.keys(req.body).length > 0) {
          requestBody = JSON.stringify(req.body);
          if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
        } else if (typeof req.body === 'string') {
          requestBody = req.body;
        }
      }
    }

    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers,
      responseType: 'arraybuffer',
      data: requestBody,
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: () => true
    });

    setProxyHeaders(res, response.headers['content-type']);
    if (response.headers['x-notion-request-id']) {
      res.set('x-notion-request-id', response.headers['x-notion-request-id']);
    }
    res.status(response.status).send(response.data);

  } catch (error) {
    console.error(`[CORS Proxy] Error for ${url}:`, error.message);
    setProxyHeaders(res, 'application/json');
    if (error.code === 'ECONNREFUSED') return res.status(502).json({ error: 'Upstream server refused connection' });
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') return res.status(504).json({ error: 'Upstream server timeout' });
    if (error.code === 'ENOTFOUND') return res.status(502).json({ error: 'Upstream server not found' });
    if (error.response) return res.status(error.response.status).send(error.response.data || JSON.stringify({ error: 'Proxy Error' }));
    res.status(500).json({ error: 'Proxy error' });
  }
});

// JS Proxy (Rewriter)
router.get('/js-proxy', async (req, res) => {
  const { url } = req.query;
  const { redis } = req;
  if (!url) return res.status(400).send('URL required');

  try {
    const cacheKey = `js:${url}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      setProxyHeaders(res, 'application/javascript; charset=utf-8');
      return res.send(cached);
    }

    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      responseType: 'text'
    });

    let code = response.data;
    code = code.replace(/new\s+SharedWorker\s*\(/g, '(function(){console.warn("[NotionLock] SharedWorker blocked");return{port:{start:function(){},addEventListener:function(){},postMessage:function(){}}}})&&new SharedWorker(');
    code = code.replace(/new\s+Worker\s*\(/g, '(function(){console.warn("[NotionLock] Worker blocked");return{postMessage:function(){},addEventListener:function(){},terminate:function(){}}})&&new Worker(');
    code = code.replace(/navigator\.storage\.getDirectory\s*\(/g, '(async function(){console.warn("[NotionLock] OPFS blocked");throw new Error("OPFS not available")})&&navigator.storage.getDirectory(');

    await redis.setex(cacheKey, 86400, code);
    setProxyHeaders(res, 'application/javascript; charset=utf-8');
    res.send(code);

  } catch (error) {
    console.error('[JS Proxy] Error:', error.message);
    setProxyHeaders(res, 'application/javascript; charset=utf-8');
    res.status(500).send('// Error fetching script');
  }
});

router.options('/js-proxy', (req, res) => {
  setProxyHeaders(res, null);
  res.sendStatus(204);
});

// Secure Frame
router.get('/secure-frame', async (req, res) => {
  const { token } = req.query;
  const { redis } = req;
  if (!token) return res.status(400).send('Token required');

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const tokenStatus = await redis.get(`token:${payload.tokenId}`);
    if (tokenStatus === 'used') return res.status(401).send('<h1>Token Already Used</h1>');
    if (!tokenStatus) return res.status(401).send('<h1>Token Invalid</h1>');

    await redis.set(`token:${payload.tokenId}`, 'used', 'EX', 300);
    if (Date.now() - payload.iat > 300000) return res.status(401).send('<h1>Expired</h1>');

    const notionUrl = decrypt(payload.encryptedUrl);
    const html = await fetchAndRewriteNotionPage(notionUrl);

    setProxyHeaders(res, 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('[Secure-Frame] Error:', error.message);
    res.set('Content-Type', 'text/html');
    if (error.name === 'JsonWebTokenError') return res.status(401).send('<h1>Invalid Link</h1>');
    res.status(500).send('<h1>Error Loading Page</h1>');
  }
});

// ==========================================
// 2. Domain & Password Verification Routes
// ==========================================

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

// Refresh JWT token (before :slug routes)
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
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Proxy Viewer Endpoint (before :slug routes)
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

    if (!pageData.notionUrl) return res.status(500).json({ error: 'Missing Notion URL' });

    res.removeHeader('Cross-Origin-Embedder-Policy');
    res.removeHeader('Cross-Origin-Opener-Policy');

    try {
      const rewrittenHtml = await fetchAndRewriteNotionPage(pageData.notionUrl);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Show-Branding', (pageData.showBranding !== false).toString());
      res.send(rewrittenHtml);
    } catch (fetchError) {
      console.error('[View] Fetch error, fallback:', fetchError.message);
      const rawResponse = await axios.get(pageData.notionUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        responseType: 'text'
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Show-Branding', (pageData.showBranding !== false).toString());
      res.send(rawResponse.data);
    }
  } catch (error) {
    console.error('Proxy Route Error:', error);
    res.status(500).send('Error loading page');
  }
});

// Notion API JSON Endpoint
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
      try { jwt.verify(token, process.env.JWT_SECRET); } catch (e) { return res.status(401).json({ error: 'Invalid token', requiresPassword: true }); }
    }

    const pageId = notionService.extractPageId(pageData.notionUrl || pageData.notion_url);
    const cacheKey = `notion:page:${pageId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const notionData = await notionService.getPageData(pageId);
    const recordMap = notionService.toRecordMap(notionData);
    let showBranding = true;
    if (pageData.user_id) {
      const uRes = await db.query('SELECT subscription_status, branding_enabled FROM users WHERE id = $1', [pageData.user_id]);
      if (uRes.rows.length) {
        const row = uRes.rows[0];
        showBranding = (row.subscription_status && row.subscription_status !== 'free') ? (row.branding_enabled !== false) : true;
      }
    }
    const response = { recordMap, showBranding, pageTitle: notionData.page?.properties?.title?.title?.[0]?.plain_text || 'Untitled' };
    await redis.setex(cacheKey, 300, JSON.stringify(response));
    res.json(response);
  } catch (error) {
    console.error('Notion API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. SLUG ROUTES (MUST BE LAST)
// ==========================================

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

// Verify password and get access
router.post('/:slug', async (req, res) => {
  const { slug } = req.params;
  const { password } = req.body;
  const { db, redis } = req;

  if (!password) return res.status(400).json({ error: 'Password richiesta' });

  // Rate limiting per IP e slug
  const clientIP = req.ip || 'unknown';
  const rateLimitKey = `rate_limit:${clientIP}:${slug}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const limit = 10;
  const attemptsKey = `rate_limited:${clientIP}:${slug}`; // Corrected key name to be consistent

  // Simple key-based rate limit for now or use zset as before
  // Using the logic from previous valid block
  await redis.zremrangebyscore(attemptsKey, 0, now - windowMs);
  const attemptsCount = await redis.zcard(attemptsKey);
  if (attemptsCount >= limit) {
    return res.status(429).json({ error: 'Troppi tentativi falliti. Riprova tra 15 minuti.' });
  }
  await redis.zadd(attemptsKey, now, `${now}`);
  await redis.expire(attemptsKey, Math.ceil(windowMs / 1000));

  try {
    let pageData = await redis.get(`page:${slug}`);
    if (!pageData) {
      const result = await db.query(
        'SELECT p.id, p.notion_url, p.password_hash, p.title, u.subscription_status, u.branding_enabled FROM protected_pages p JOIN users u ON p.user_id = u.id WHERE p.slug = $1',
        [slug]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Pagina non trovata' });

      const row = result.rows[0];
      const isPro = row.subscription_status && row.subscription_status !== 'free';
      const showBranding = isPro ? (row.branding_enabled !== false) : true;

      pageData = {
        id: row.id,
        notionUrl: row.notion_url,
        passwordHash: row.password_hash,
        title: row.title,
        showBranding
      };
      await redis.setex(`page:${slug}`, 3600, JSON.stringify(pageData));
    } else {
      pageData = JSON.parse(pageData);
    }

    const isValid = await bcrypt.compare(password, pageData.passwordHash);
    if (!isValid) {
      const ipHash = crypto.createHash('sha256').update(clientIP).digest('hex');
      // Async logging
      db.query('INSERT INTO access_logs (protected_page_id, ip_hash, success) VALUES ($1, $2, $3)', [pageData.id, ipHash, false]).catch(console.error);
      return res.status(401).json({ error: 'Password non corretta' });
    }

    // Reset attempts on success
    await redis.del(attemptsKey);

    const accessToken = jwt.sign({ pageId: pageData.id, slug }, process.env.JWT_SECRET, { expiresIn: '24h' });
    db.query('UPDATE protected_pages SET visits_count = visits_count + 1 WHERE id = $1', [pageData.id]).catch(console.error);

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

module.exports = router;