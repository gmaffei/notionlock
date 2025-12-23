// ===== routes/pages.js =====
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const { generateSlug } = require('../utils/slug');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Validation
const validatePage = [
  body('notionUrl').isURL().withMessage('URL Notion non valido'),
  body('password').isLength({ min: 4 }).withMessage('Password deve essere almeno 4 caratteri'),
  body('title').optional().trim()
];

// Get all user pages
router.get('/', async (req, res) => {
  const { db } = req;
  const userId = req.user.userId;

  try {
    const result = await db.query(
      `SELECT id, notion_url, slug, title, visits_count, created_at, updated_at 
       FROM protected_pages 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ pages: result.rows });
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({ error: 'Errore nel recupero pagine' });
  }
});

// Create protected page
router.post('/', validatePage, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { notionUrl, password, title } = req.body;
  const { db, redis } = req;
  const userId = req.user.userId;

  try {
    // Validate Notion URL more strictly
    const notionUrlPattern = /^https:\/\/[a-zA-Z0-9-]+\.(notion\.site|notion\.so)(\/.+)?$/;
    if (!notionUrlPattern.test(notionUrl)) {
      return res.status(400).json({ error: 'URL deve essere una pagina Notion pubblica valida (https://domain.notion.site/...)' });
    }

    // Generate unique slug
    let slug = generateSlug();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db.query(
        'SELECT id FROM protected_pages WHERE slug = $1',
        [slug]
      );
      if (existing.rows.length === 0) break;
      slug = generateSlug();
      attempts++;
    }

    // Check Plan Limits (Max 5 pages for Free)
    const userStatusRes = await db.query('SELECT subscription_status FROM users WHERE id = $1', [userId]);
    const status = userStatusRes.rows[0]?.subscription_status || 'free';

    if (status === 'free') {
      const countRes = await db.query('SELECT COUNT(*) FROM protected_pages WHERE user_id = $1', [userId]);
      const pageCount = parseInt(countRes.rows[0].count);
      if (pageCount >= 5) {
        return res.status(403).json({
          error: 'Limite raggiunto (Max 5 pagine). Passa a Pro per pagine illimitate.',
          code: 'LIMIT_REACHED'
        });
      }
    }

    // Hash password - use 12 rounds for better security
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create page
    const result = await db.query(
      `INSERT INTO protected_pages (id, user_id, notion_url, slug, password_hash, title)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, notion_url, slug, title, created_at`,
      [uuidv4(), userId, notionUrl, slug, hashedPassword, title || 'Pagina Protetta']
    );

    const page = result.rows[0];

    // Cache the page data for faster access
    await redis.setex(
      `page:${slug}`,
      3600, // 1 hour cache
      JSON.stringify({
        id: page.id,
        notionUrl: page.notion_url,
        passwordHash: hashedPassword,
        title: page.title
      })
    );

    res.status(201).json({
      page: {
        ...page,
        protectedUrl: `${process.env.FRONTEND_URL}/p/${slug}`
      }
    });
  } catch (error) {
    console.error('Create page error:', error);
    res.status(500).json({ error: 'Errore nella creazione pagina' });
  }
});

// Update page (password or title)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { password, title } = req.body;
  const { db, redis } = req;
  const userId = req.user.userId;

  try {
    // Check ownership
    const ownership = await db.query(
      'SELECT slug FROM protected_pages WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (ownership.rows.length === 0) {
      return res.status(404).json({ error: 'Pagina non trovata' });
    }

    const slug = ownership.rows[0].slug;
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      updateFields.push(`password_hash = $${paramCount++}`);
      values.push(hashedPassword);
    }

    if (title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      values.push(title);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' });
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id, userId);

    const result = await db.query(
      `UPDATE protected_pages 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount}
       RETURNING id, notion_url, slug, title, updated_at`,
      values
    );

    // Invalidate cache
    await redis.del(`page:${slug}`);

    res.json({ page: result.rows[0] });
  } catch (error) {
    console.error('Update page error:', error);
    res.status(500).json({ error: 'Errore aggiornamento pagina' });
  }
});

// Delete page
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { db, redis } = req;
  const userId = req.user.userId;

  try {
    const result = await db.query(
      'DELETE FROM protected_pages WHERE id = $1 AND user_id = $2 RETURNING slug',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pagina non trovata' });
    }

    // Clear cache
    await redis.del(`page:${result.rows[0].slug}`);

    res.json({ message: 'Pagina eliminata con successo' });
  } catch (error) {
    console.error('Delete page error:', error);
    res.status(500).json({ error: 'Errore eliminazione pagina' });
  }
});

module.exports = router;