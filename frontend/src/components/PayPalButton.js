
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PayPalButton = ({ amount, currency, onSuccess, onError }) => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const buttonRef = useRef(null);
    const [sdkReady, setSdkReady] = useState(false);

    useEffect(() => {
        // If already loaded
        if (window.paypal) {
            setSdkReady(true);
            return;
        }

        // Load SDK Dynamically
        const clientId = process.env.REACT_APP_PAYPAL_CLIENT_ID;
        if (!clientId) {
            console.error("PayPal Client ID not found in environment variables");
            onError("Configuration Error: PayPal Client ID missing");
            return;
        }

        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`;
        script.async = true;
        script.onload = () => setSdkReady(true);
        script.onerror = () => onError("Failed to load PayPal SDK");
        document.body.appendChild(script);

        return () => {
            // Cleanup if needed, but usually we keep the script
        };
    }, [currency, onError]);

    useEffect(() => {
        if (!sdkReady || !buttonRef.current || !token) return;

        // Clear previous buttons if any (though React usually handles DOM)
        buttonRef.current.innerHTML = "";

        window.paypal.Buttons({
            style: {
                layout: 'vertical',
                color: 'gold',
                shape: 'rect',
                label: 'pay'
            },
            createOrder: async (data, actions) => {
                try {
                    const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/checkout/create-order`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            amount: amount,
                            currency: currency
                        })
                    });

                    if (!res.ok) throw new Error('Order creation failed');
                    const orderData = await res.json();
                    return orderData.id;
                } catch (err) {
                    console.error("Create Order Error:", err);
                    onError("Could not initiate payment");
                }
            },
            onApprove: async (data, actions) => {
                try {
                    const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/checkout/capture-order`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            orderId: data.orderID
                        })
                    });

                    const captureData = await res.json();

                    if (captureData.status === 'COMPLETED') {
                        onSuccess(captureData);
                    } else {
                        onError("Payment not completed");
                    }
                } catch (err) {
                    console.error("Capture Error:", err);
                    onError("Payment verification failed");
                }
            },
            onError: (err) => {
                console.error("PayPal Button Error:", err);
                onError("Payment Service Unavailable");
            }
        }).render(buttonRef.current);

    }, [sdkReady, token, amount, currency, onSuccess, onError]);

    if (!token) {
        return (
            <button
                onClick={() => navigate('/auth')}
                className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
            >
                Login to Purchase
            </button>
        );
    }

    if (!sdkReady) {
        return <div className="text-center py-4 text-gray-400">Loading secure payment...</div>;
    }

    return <div ref={buttonRef} className="w-full relative z-0" />;
};

export default PayPalButton;
