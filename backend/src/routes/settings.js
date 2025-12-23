const router = require('express').Router();
const admin = require('../middleware/admin');

// PUBLIC: Get pricing config
router.get('/public/pricing', async (req, res) => {
    const { db } = req;
    try {
        const result = await db.query(
            "SELECT value FROM app_settings WHERE key = 'pricing_config'"
        );

        if (result.rows.length === 0) {
            // Fallback defaults if DB is empty
            return res.json({
                monthly: { usd: 4.99, eur: 4.99 },
                yearly: { usd: 49.00, eur: 49.00 },
                lifetime: { enabled: true, usd: 99.00, eur: 99.00 },
                discount: { percent: 0, active: false }
            });
        }

        res.json(result.rows[0].value);
    } catch (error) {
        console.error('Error fetching pricing:', error);
        res.status(500).json({ error: 'Errore durante il recupero dei prezzi' });
    }
});

// ADMIN: Get all settings
router.get('/admin', admin, async (req, res) => {
    const { db } = req;
    try {
        const result = await db.query('SELECT key, value FROM app_settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (error) {
        console.error('Error fetching admin settings:', error);
        res.status(500).json({ error: 'Errore recupero configurazioni' });
    }
});

// ADMIN: Update settings
router.post('/admin', admin, async (req, res) => {
    const { db } = req;
    const { key, value } = req.body;

    if (!key || !value) {
        return res.status(400).json({ error: 'Key e Value richiesti' });
    }

    try {
        await db.query(
            `INSERT INTO app_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = $2, updated_at = NOW()`,
            [key, value]
        );

        res.json({ message: 'Configurazione aggiornata', key });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Errore aggiornamento configurazione' });
    }
});

module.exports = router;
