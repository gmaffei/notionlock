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
        const eventName = event.meta.event_name;

        console.log('Lemon Squeezy Webhook received:', eventName);

        const data = event.data.attributes;
        const customData = event.meta.custom_data || {};
        const userId = customData.user_id;

        // Process based on event type
        switch (eventName) {
            case 'order_created':
            case 'order_refunded':
                if (userId) {
                    const isRefund = eventName === 'order_refunded';
                    // For order_created (lifetime), we enable 'lifetime_pro'
                    // For refunded, we might want to revoke it or handle manually. 
                    // Let's assume refund revokes access.
                    const status = isRefund ? 'free' : 'lifetime_pro';
                    // Note: Reverting to 'free' might be aggressive if they had a previous sub, 
                    // but for lifetime purchase refund, it makes sense.

                    await db.query(`
                        UPDATE users 
                        SET subscription_status = $1, 
                            branding_enabled = $2,
                            updated_at = NOW()
                        WHERE id = $3
                    `, [status, !isRefund, userId]);

                    if (!isRefund) {
                        const userEmail = data.user_email;
                        const total = data.total / 100;
                        const currency = data.currency;
                        await emailService.sendPaymentSuccessEmail(userEmail, "Lifetime Pro", total, currency)
                            .catch(err => console.error("Email error:", err));
                    }
                    console.log(`User ${userId} order status updated to ${status}`);
                }
                break;

            case 'subscription_created':
            case 'subscription_updated':
            case 'subscription_resumed':
            case 'subscription_unpaused':
            case 'subscription_payment_success':
            case 'subscription_payment_recovered':
                if (userId) {
                    // Normalize status from Lemon Squeezy to our app's status
                    // Lemon Squeezy statuses: on_trial, active, paused, past_due, unpaid, cancelled, expired
                    // customized logic can be added here. For now, map 'active' events to 'pro'
                    let appStatus = 'pro';

                    // If receiving payment success etc, ensure they are pro
                    await db.query(`
                        UPDATE users 
                        SET subscription_status = $1, 
                            branding_enabled = true,
                            updated_at = NOW()
                        WHERE id = $2
                    `, [appStatus, userId]);
                    console.log(`User ${userId} subscription active/updated`);
                }
                break;

            case 'subscription_cancelled':
            case 'subscription_expired':
            case 'subscription_payment_failed':
                if (userId) {
                    // If cancelled, they might still have time left, but usually 'cancelled' event 
                    // means user action. Effective cancellation might be at period end.
                    // However, 'subscription_expired' definitely means access lost.
                    // 'subscription_payment_failed' might implementation grace period.

                    // For simplicity in this iteration:
                    // expired -> free
                    // payment_failed -> free (or could be 'past_due')
                    // cancelled -> might typically wait for 'subscription_expired' if at period end,
                    // but if it's immediate cancellation:

                    if (eventName === 'subscription_expired' || eventName === 'subscription_payment_failed') {
                        await db.query(`
                            UPDATE users 
                            SET subscription_status = 'free', 
                                branding_enabled = false,
                                updated_at = NOW()
                            WHERE id = $1
                        `, [userId]);
                        console.log(`User ${userId} subscription ended (${eventName})`);
                    }
                    // For 'subscription_cancelled', we often do nothing until it actually expires 
                    // unless it's immediate. Lemon Squeezy sends 'subscription_expired' when it actually ends.
                }
                break;

            case 'subscription_plan_changed':
                // Handle plan change logic if different tiers exist
                console.log(`User ${userId} changed plan`);
                break;

            case 'license_key_created':
            case 'license_key_updated':
                // If using license keys
                console.log(`License key event for User ${userId}`);
                break;

            default:
                console.log(`Unhandled event: ${eventName}`);
        }

        res.status(200).send('Webhook received');
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send('Webhook Error');
    }
});

module.exports = router;
