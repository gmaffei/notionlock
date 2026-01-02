import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const translations = {
  it: {
    pageNotFound: 'Pagina non trovata',
    pageLoadError: 'Errore nel caricamento della pagina',
    pageNotFoundDesc: 'La pagina che stai cercando non esiste o è stata rimossa.',
    backHome: 'Torna alla Home',
    heroTitle: 'NotionLock',
    heroSubtitle: 'Proteggi le tue pagine Notion gratuitamente',
    protectedContent: 'Contenuto Protetto',
    enterPassword: 'Inserisci la password per accedere',
    placeholder: 'Inserisci la password',
    wrongPassword: 'Password non corretta',
    tooManyAttempts: 'Troppi tentativi. Riprova tra qualche minuto.',
    genericError: 'Si è verificato un errore',
    verifying: 'Verifica in corso...',
    access: 'Accedi',
    protectedBy: 'Protetto da',
    footerText: 'Servizio 100% gratuito per proteggere le tue pagine Notion'
  },
  en: {
    pageNotFound: 'Page not found',
    pageLoadError: 'Error loading page',
    pageNotFoundDesc: 'The page you are looking for does not exist or has been removed.',
    backHome: 'Back to Home',
    heroTitle: 'NotionLock',
    heroSubtitle: 'Protect your Notion pages for free',
    protectedContent: 'Protected Content',
    enterPassword: 'Enter password to access',
    placeholder: 'Enter password',
    wrongPassword: 'Incorrect password',
    tooManyAttempts: 'Too many attempts. Please try again later.',
    genericError: 'An error occurred',
    verifying: 'Verifying...',
    access: 'Access',
    protectedBy: 'Protected by',
    footerText: '100% free service to protect your Notion pages'
  }
};

const PasswordEntry = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pageInfo, setPageInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    // Detect language
    const userLang = navigator.language || navigator.userLanguage;
    if (userLang.toLowerCase().startsWith('it')) {
      setLang('it');
    }
  }, []);

  const t = translations[lang];

  useEffect(() => {
    const fetchPageInfo = async () => {
      try {
        const { data } = await api.get(`/verify/${slug}/info`);
        setPageInfo(data);
      } catch (err) {
        if (err.response?.status === 404) {
          setError(translations.it.pageNotFound); // Fallback or use current lang? Using lang might be tricky inside async before render, but state is updated.
          // However, for error state string comparison later, usually checking status code is safer.
          // For display, we use the error state.
          // Let's rely on API status for logic and t for display.
          setError('404');
        } else {
          setError('500');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPageInfo();
  }, [slug]);

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
        setError('401');
      } else if (err.response?.status === 429) {
        setError('429');
      } else {
        setError('500');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getErrorMessage = (code) => {
    switch (code) {
      case '404': return t.pageNotFound;
      case '401': return t.wrongPassword;
      case '429': return t.tooManyAttempts;
      case '500': return t.genericError;
      default: return code || t.genericError;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pageInfo && error === '404') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.pageNotFound}</h1>
            <p className="text-gray-600 mb-6">{t.pageNotFoundDesc}</p>
            <Link
              to="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {t.backHome}
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
              <h1 className="text-3xl font-bold text-blue-600">{t.heroTitle}</h1>
            </Link>
            <p className="text-gray-600 mt-2">{t.heroSubtitle}</p>
          </div>
          {/* Password Form */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.protectedContent}</h1>
              <p className="text-gray-600">{pageInfo?.title || t.enterPassword}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                {getErrorMessage(error)}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="relative mb-4">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.placeholder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  required
                  autoFocus
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? t.verifying : t.access}
              </button>
            </form>
          </div>



          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {t.protectedBy}{' '}
              <Link to="/" className="text-blue-600 hover:underline font-medium">
                NotionLock
              </Link>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {t.footerText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordEntry; 