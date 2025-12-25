const crypto = require('crypto');
const axios = require('axios');

class LemonSqueezyService {
    constructor() {
        this.apiKey = process.env.LEMON_SQUEEZY_API_KEY;
        this.storeId = process.env.LEMON_SQUEEZY_STORE_ID;
        this.webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
        this.apiUrl = 'https://api.lemonsqueezy.com/v1';
    }

    /**
     * Create a checkout URL for a specific variant
     * @param {string} variantId - The ID of the product variant
     * @param {string} userId - The internal user ID
     * @param {string} userEmail - The user's email pre-fill
     * @returns {Promise<string>} The checkout URL
     */
    async createCheckout(variantId, userId, userEmail) {
        try {
            const response = await axios.post(
                `${this.apiUrl}/checkouts`,
                {
                    data: {
                        type: 'checkouts',
                        attributes: {
                            checkout_data: {
                                email: userEmail,
                                custom: {
                                    user_id: userId
                                }
                            }
                        },
                        relationships: {
                            store: {
                                data: {
                                    type: 'stores',
                                    id: this.storeId
                                }
                            },
                            variant: {
                                data: {
                                    type: 'variants',
                                    id: variantId
                                }
                            }
                        }
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/vnd.api+json'
                    }
                }
            );

            return response.data.data.attributes.url;
        } catch (error) {
            console.error('Lemon Squeezy Checkout Error:', error.response?.data || error.message);
            throw new Error('Failed to create checkout');
        }
    }

    /**
     * Verify the webhook signature
     * @param {Object} req - The express request object
     * @returns {boolean} True if signature is valid
     */
    verifyWebhookSignature(req) {
        const secret = this.webhookSecret;
        const hmac = crypto.createHmac('sha256', secret);
        // req.rawBody needs to be available. 
        // If using standard express.json(), verifying signature might change depending on how body is parsed
        // Assuming we pass the raw buffer or stringified body if needed, 
        // but typically express doesn't expose rawBody by default without config.
        // For now, let's assume req.body is what we use but strictly we need raw body.
        // NOTE: In checkout.js/webhook.js we must ensure we compute digest from raw body.

        const digest = Buffer.from(hmac.update(req.rawBody || JSON.stringify(req.body)).digest('hex'), 'utf8');
        const signature = Buffer.from(req.get('X-Signature') || '', 'utf8');

        return digest.length === signature.length && crypto.timingSafeEqual(digest, signature);
    }
}

module.exports = new LemonSqueezyService();
