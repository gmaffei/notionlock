const router = require('express').Router();
const jwt = require('jsonwebtoken');
const paypalService = require('../utils/paypal');
const emailService = require('../utils/email');

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

// 1. Create Order
router.post('/create-order', authenticate, async (req, res) => {
    const { amount, currency } = req.body; // Passed from frontend based on selected pricing

    // Basic validation (In prod, fetch price from DB/Settings to prevent tampering)
    // For MVP, we trust amount but PayPal verifies on capture anyway

    try {
        const order = await paypalService.createOrder(amount, currency);
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Errore creazione ordine PayPal' });
    }
});

// 2. Capture Order & Activate features
router.post('/capture-order', authenticate, async (req, res) => {
    const { orderId } = req.body;
    const { db } = req;
    const userId = req.user.userId;

    try {
        // A. Capture Payment
        const captureData = await paypalService.captureOrder(orderId);

        if (captureData.status === 'COMPLETED') {
            const purchaseUnit = captureData.purchase_units[0];
            const amount = purchaseUnit.payments.captures[0].amount.value;
            const currency = purchaseUnit.payments.captures[0].amount.currency_code;

            console.log(`Payment captured for user ${userId}: ${amount} ${currency}`);

            // B. Update User Database
            await db.query(`
            UPDATE users 
            SET subscription_status = 'lifetime_pro', 
                branding_enabled = false,
                updated_at = NOW()
            WHERE id = $1
        `, [userId]);

            // C. Fetch User Email to send receipt
            const userRes = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
            if (userRes.rows.length > 0) {
                const email = userRes.rows[0].email;
                // D. Send Email
                await emailService.sendPaymentSuccessEmail(email, "Lifetime Pro", amount, currency)
                    .catch(err => console.error("Email error:", err));
            }

            res.json({ success: true, status: 'COMPLETED' });
        } else {
            res.status(400).json({ error: 'Pagamento non completato' });
        }
    } catch (error) {
        console.error('Capture Error:', error);
        res.status(500).json({ error: 'Errore durante la cattura del pagamento' });
    }
});

module.exports = router;
