import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AdBanner from '../components/AdBanner';

const PasswordEntry = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [pageInfo, setPageInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPageInfo();
  }, [slug]);

  const fetchPageInfo = async () => {
    try {
      const { data } = await api.get(`/verify/${slug}/info`);
      setPageInfo(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Pagina non trovata');
      } else {
        setError('Errore nel caricamento della pagina');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { data } = await api.post(`/verify/${slug}`, { password });
      
      // Save access token and Notion URL for this page
      sessionStorage.setItem(`access_${slug}`, data.accessToken);
      sessionStorage.setItem(`notion_${slug}`, data.notionUrl);
      
      // Redirect to our viewer page with banner
      navigate(`/view/${slug}`);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Password non corretta');
      } else if (err.response?.status === 429) {
        setError('Troppi tentativi. Riprova tra qualche minuto.');
      } else {
        setError('Si è verificato un errore');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pageInfo && error === 'Pagina non trovata') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagina non trovata</h1>
            <p className="text-gray-600 mb-6">La pagina che stai cercando non esiste o è stata rimossa.</p>
            <Link
              to="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Torna alla Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center justify-center space-x-3">
              <img src="/NotionLock_Logo.png" alt="NotionLock Logo" className="h-12 w-auto" />
              <h1 className="text-3xl font-bold text-blue-600">NotionLock</h1>
            </Link>
            <p className="text-gray-600 mt-2">Proteggi le tue pagine Notion gratuitamente</p>
          </div>
          {/* Password Form */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Contenuto Protetto</h1>
              <p className="text-gray-600">{pageInfo?.title || 'Inserisci la password per accedere'}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci la password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                required
                autoFocus
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Verifica in corso...' : 'Accedi'}
              </button>
            </form>
          </div>

          {/* Ad Banner */}
          <AdBanner size="square" className="mb-6" />

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Protetto da{' '}
              <Link to="/" className="text-blue-600 hover:underline font-medium">
                NotionLock
              </Link>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Servizio 100% gratuito per proteggere le tue pagine Notion
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordEntry; 