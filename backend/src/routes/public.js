const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { fetchAndRewriteNotionPage } = require('../utils/proxy');

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

    // 2. Get Notion URL
    let pageData = await redis.get(`page:${slug}`);
    if (!pageData) {
      const result = await db.query('SELECT notion_url FROM protected_pages WHERE slug = $1', [slug]);
      if (result.rows.length === 0) return res.status(404).send('Not Found');
      pageData = { notionUrl: result.rows[0].notion_url };
    } else {
      pageData = JSON.parse(pageData);
    }

    // 3. Fetch and Serve Proxied Content
    const proxiedHtml = await fetchAndRewriteNotionPage(pageData.notionUrl || pageData.notion_url);

    // Ensure charset is UTF-8 to prevent encoding issues with special chars
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(proxiedHtml);

  } catch (error) {
    console.error('Proxy Route Error:', error);
    res.status(500).send('Error loading page');
  }
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