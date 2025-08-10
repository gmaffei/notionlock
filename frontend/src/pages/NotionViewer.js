import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdBanner from '../components/AdBanner';

const NotionViewer = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [notionUrl, setNotionUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error] = useState('');

  useEffect(() => {
    // Check if user has valid access token
    const accessToken = sessionStorage.getItem(`access_${slug}`);
    const notionPageUrl = sessionStorage.getItem(`notion_${slug}`);
    
    if (!accessToken || !notionPageUrl) {
      navigate(`/p/${slug}`);
      return;
    }

    setNotionUrl(notionPageUrl);
    setLoading(false);
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate(`/p/${slug}`)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Torna alla pagina di accesso
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header with banner */}
      <div className="bg-white border-b shadow-sm">
        <AdBanner />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Accesso Autorizzato</h1>
            <p className="text-gray-600 mb-6">
              La tua richiesta è stata verificata. Sarai reindirizzato alla pagina Notion.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => window.open(notionUrl, '_blank')}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Apri Pagina Notion
            </button>
            
            <p className="text-sm text-gray-500">
              La pagina si aprirà in una nuova scheda del browser
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Pagina protetta da{' '}
              <a href="/" className="text-blue-600 hover:underline font-medium">
                NotionLock
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Footer banner */}
      <div className="bg-white border-t">
        <AdBanner />
      </div>
    </div>
  );
};

export default NotionViewer;