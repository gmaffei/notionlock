const router = require('express').Router();
const jwt = require('jsonwebtoken');
const lemonSqueezyService = require('../utils/lemonsqueezy');

// Middleware to verify auth token
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token mancante' });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token non valido' });
    }
};

// Create Checkout Session (returns URL)
router.post('/', authenticate, async (req, res) => {
    const { variantId } = req.body;
    const user = req.user;

    // Use environment variable for variant ID if not passed (or validate passed one)
    // For simplicity, we can default to the one in env if matched or just use env
    const targetVariantId = variantId || process.env.LEMON_SQUEEZY_LIFETIME_VARIANT_ID;

    if (!targetVariantId) {
        return res.status(500).json({ error: 'Server configuration error: Variant ID missing' });
    }

    try {
        const checkoutUrl = await lemonSqueezyService.createCheckout(
            targetVariantId,
            user.userId,
            user.email
        );
        res.json({ url: checkoutUrl });
    } catch (error) {
        console.error('Checkout creation failed:', error);
        res.status(500).json({ error: 'Errore creazione checkout' });
    }
});

module.exports = router;
