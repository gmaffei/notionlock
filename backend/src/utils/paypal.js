const axios = require('axios');

class PayPalService {
    constructor() {
        this.baseUrl = process.env.PAYPAL_MODE === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        this.clientId = process.env.PAYPAL_CLIENT_ID;
        this.clientSecret = process.env.PAYPAL_SECRET;
    }

    async getAccessToken() {
        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        try {
            const response = await axios.post(`${this.baseUrl}/v1/oauth2/token`,
                'grant_type=client_credentials',
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
            return response.data.access_token;
        } catch (error) {
            console.error('PayPal Auth Error:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with PayPal');
        }
    }

    async createOrder(amount, currency = 'EUR') {
        const accessToken = await this.getAccessToken();
        const orderPayload = {
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: currency,
                    value: amount
                },
                description: 'NotionLock Pro Lifetime Deal'
            }]
        };

        try {
            const response = await axios.post(`${this.baseUrl}/v2/checkout/orders`,
                orderPayload,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('PayPal Create Order Error:', error.response?.data || error.message);
            throw error;
        }
    }

    async captureOrder(orderId) {
        const accessToken = await this.getAccessToken();
        try {
            const response = await axios.post(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('PayPal Capture Error:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new PayPalService();
