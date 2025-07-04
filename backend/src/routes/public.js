const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Verify password and get access
router.post('/:slug', async (req, res) => {
  const { slug } = req.params;
  const { password } = req.body;
  const { db, redis } = req;

  if (!password) {
    return res.status(400).json({ error: 'Password richiesta' });
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
      
      // Cache for next time
      await redis.setex(
        `page:${slug}`,
        3600,
        JSON.stringify(pageData)
      );
    } else {
      pageData = JSON.parse(pageData);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, pageData.passwordHash || pageData.password_hash);
    
    if (!isValid) {
      // Log failed attempt
      const ipHash = crypto.createHash('sha256')
        .update(req.ip || 'unknown')
        .digest('hex');
      
      await db.query(
        'INSERT INTO access_logs (protected_page_id, ip_hash, success) VALUES ($1, $2, $3)',
        [pageData.id, ipHash, false]
      );

      return res.status(401).json({ error: 'Password non corretta' });
    }

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
      accessToken
    });
  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({ error: 'Errore verifica password' });
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