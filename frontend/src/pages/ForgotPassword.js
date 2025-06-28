import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data.message);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Errore durante la richiesta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {sent ? 'Email Inviata' : 'Recupera Password'}
            </h1>
            <p className="text-gray-600">
              {sent 
                ? 'Controlla la tua email per il link di reset'
                : 'Inserisci la tua email per ricevere il link di reset'
              }
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4">
              {message}
            </div>
          )}

          {!sent ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="La tua email"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Inviando...' : 'Invia Link di Reset'}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-sm text-gray-600">
                Se non ricevi l'email entro qualche minuto, controlla la cartella spam
              </div>
              <button
                onClick={() => {
                  setSent(false);
                  setMessage('');
                  setEmail('');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Invia di nuovo
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/auth"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Torna al Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;