// src/pages/Checkout.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Checkout = ({ planId }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);

    const startCheckout = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem(`access_${new URLSearchParams(window.location.search).get('slug')}`);
            const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/payments/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ variantId: planId })
            });
            const { url } = await res.json();

            // Load Lemon Squeezy script only after Cookiebot consent for marketing
            if (window.Cookiebot?.consent?.marketing) {
                const script = document.createElement('script');
                script.src = 'https://app.lemonsqueezy.com/js/v1/checkout.js';
                script.async = true;
                script.onload = () => {
                    // LemonSqueezy exposes a global object
                    window.LemonSqueezy?.UrlRedirect(url);
                };
                document.body.appendChild(script);
            } else {
                alert('Please accept marketing cookies to proceed with payment.');
                if (window.Cookiebot) window.Cookiebot.show();
            }
        } catch (e) {
            console.error('Checkout error', e);
            alert('Unable to start checkout.');
        } finally {
            setLoading(false);
        }
    };

    // Handle redirect after successful payment (Lemon Squeezy can redirect back with ?payment=success)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('payment') === 'success') {
            alert('Payment successful! Your account is now PRO.');
            navigate('/');
        }
    }, [location, navigate]);

    return (
        <div className="checkout-page" style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Upgrade to PRO</h2>
            <button onClick={startCheckout} disabled={loading} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                {loading ? 'Redirecting…' : 'Pay with Lemon Squeezy'}
            </button>
        </div>
    );
};

export default Checkout;
