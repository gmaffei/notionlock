import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LemonSqueezyButton = ({ variantId, children, className }) => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        if (!token) {
            navigate('/auth?mode=register');
            return;
        }

        setLoading(true);
        try {
            const apiUrl = process.env.REACT_APP_API_URL || 'https://api.notionlock.com/api';
            const res = await fetch(`${apiUrl}/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ variantId })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    alert('Errore: URL di checkout non ricevuto');
                }
            } else {
                const err = await res.json();
                alert(`Errore: ${err.error || 'Checkout fallito'}`);
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Si è verificato un errore durante il checkout');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleCheckout}
            disabled={loading}
            className={className || "bg-yellow-400 text-yellow-900 px-8 py-3 rounded-lg font-bold hover:bg-yellow-300 transition shadow-lg w-full"}
        >
            {loading ? 'Caricamento...' : (children || 'Acquista Ora')}
        </button>
    );
};

export default LemonSqueezyButton;
