import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdBanner from '../components/AdBanner';

const NotionViewer = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [proxyUrl, setProxyUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    // Check if user has valid access token
    const accessToken = sessionStorage.getItem(`access_${slug}`);

    if (!accessToken) {
      navigate(`/p/${slug}`);
      return;
    }

    setToken(accessToken);
    // Construct local proxy url. 
    // In production we might want a full URL, but relative works if proxy is on same domain/port or proxied by Nginx
    // We need to pass the token. Since iframe can't easily pass headers, we might need a query param 
    // OR we rely on the fact that we can't easily secure the GET request without a cookie or query param.
    // For MVP security, we will try to fetch the content via a blob or just set the src with a ?token query param
    // But our backend expects Bearer header.
    // simpler approach for MVP:
    // Change backend to accept token in query param too for the view route.
    // Let's assume we update backend to accept check query param for iframe usage.

    // Actually, to keep it secure without query params in URL history, 
    // we can fetch the HTML via fetch() with headers, then set the iframe srcdoc.
    fetchProxyContent(accessToken);
  }, [slug, navigate]);

  const fetchProxyContent = async (accessToken) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/p/view/${slug}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load content');
      }

      const html = await response.text();
      setProxyUrl(html); // storing HTML string
    } catch (err) {
      setError('Errore nel caricamento del contenuto');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      {/* 
        Using srcDoc to inject the fetched HTML. 
        This is secure against XSS from our own backend, but Notion content scripts might be tricky.
        Ideally we sandbox it slightly but allow scripts for Notion to work.
      */}
      <iframe
        title="Notion Content"
        srcDoc={proxyUrl}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />

      {/* Branding overlay/footer if needed */}
      <div className="fixed bottom-0 right-0 p-2 bg-white/80 backdrop-blur text-xs text-gray-500 rounded-tl-lg pointer-events-none">
        Powered by NotionLock
      </div>
    </div>
  );
};

export default NotionViewer;