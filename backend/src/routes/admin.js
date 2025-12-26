const router = require('express').Router();
const adminMiddleware = require('../middleware/admin');

// Apply admin middleware to all routes
router.use(adminMiddleware);

// Get Dashboard Stats
router.get('/stats', async (req, res) => {
    const { db } = req;
    try {
        // 1. Total Users
        const usersResult = await db.query('SELECT COUNT(*) FROM users');
        const totalUsers = parseInt(usersResult.rows[0].count);

        // 2. Total Protected Pages
        const pagesResult = await db.query('SELECT COUNT(*) FROM protected_pages');
        const totalPages = parseInt(pagesResult.rows[0].count);

        // 3. Total Visits (sum of visits_count)
        const visitsResult = await db.query('SELECT SUM(visits_count) as total FROM protected_pages');
        const totalVisits = parseInt(visitsResult.rows[0].total) || 0;

        // 4. Recent Users (last 5)
        const recentUsers = await db.query('SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 5');

        res.json({
            totalUsers,
            totalPages,
            totalVisits,
            recentUsers: recentUsers.rows
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
    }
    // Get All Users (with subscription info)
    router.get('/users', async (req, res) => {
        const { db } = req;
        try {
            const result = await db.query(`
            SELECT id, email, role, subscription_status, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);
            res.json(result.rows);
        } catch (error) {
            console.error('Admin users fetch error:', error);
            res.status(500).json({ error: 'Errore nel recupero utenti' });
        }
    });

    module.exports = router;
