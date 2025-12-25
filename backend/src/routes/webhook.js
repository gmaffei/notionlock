const router = require('express').Router();
const lemonSqueezyService = require('../utils/lemonsqueezy');
const emailService = require('../utils/email');

router.post('/', async (req, res) => {
    try {
        // Verify signature
        if (!lemonSqueezyService.verifyWebhookSignature(req)) {
            return res.status(401).send('Invalid Signature');
        }

        const event = req.body;
        const { db } = req;

        console.log('Lemon Squeezy Webhook received:', event.meta.event_name);

        if (event.meta.event_name === 'order_created') {
            const data = event.data.attributes;
            const customData = event.meta.custom_data || {};
            const userId = customData.user_id; // Passed during checkout creation
            const userEmail = data.user_email;

            // Amount is in cents
            const total = data.total / 100;
            const currency = data.currency;

            if (userId) {
                console.log(`Processing order for user ${userId}`);

                // Update User
                await db.query(`
                    UPDATE users 
                    SET subscription_status = 'lifetime_pro', 
                        branding_enabled = false,
                        updated_at = NOW()
                    WHERE id = $1
                `, [userId]);

                // Send Email to User
                await emailService.sendPaymentSuccessEmail(userEmail, "Lifetime Pro", total, currency)
                    .catch(err => console.error("Email error:", err));

                console.log(`User ${userId} upgraded to lifetime_pro`);
            } else {
                console.warn('Order created without user_id in custom_data');
            }
        }

        res.status(200).send('Webhook received');
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send('Webhook Error');
    }
});

module.exports = router;
