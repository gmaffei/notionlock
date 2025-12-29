import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdBanner from '../components/AdBanner';

const NotionViewer = ({ predefinedSlug }) => {
  const { slug: paramSlug } = useParams();
  const slug = predefinedSlug || paramSlug;
  const navigate = useNavigate();
  const [proxyUrl, setProxyUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  /* State for Branding */
  const [showBranding, setShowBranding] = useState(true);

  useEffect(() => {
    // Check if user has valid access token
    const accessToken = sessionStorage.getItem(`access_${slug}`);

    if (!accessToken) {
      navigate(`/p/${slug}`);
      return;
    }

    setToken(accessToken);
    fetchProxyContent(accessToken);
  }, [slug, navigate]);

  const fetchProxyContent = async (accessToken) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://api.notionlock.com/api'}/p/view/${slug}?token=${accessToken}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to load content');
      }

      const brandingHeader = response.headers.get('X-Show-Branding');
      setShowBranding(brandingHeader === 'true');

      const html = await response.text();
      setProxyUrl(html);
    } catch (err) {
      setError(err.message || 'Errore nel caricamento del contenuto');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center">
          <h3 className="text-xl font-bold mb-2">Access Denied</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }


  return (
    <div className="h-screen w-screen overflow-hidden relative bg-gray-100">
      <iframe
        title="Notion Content"
        srcDoc={proxyUrl}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />

      {/* Powered By Branding - Only if enabled */}
      {showBranding && (
        <a
          href="https://notionlock.com?utm_source=badge"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 z-50 group flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg border border-gray-100 font-sans hover:-translate-y-1 transition-all duration-300 hover:shadow-xl text-gray-700 hover:text-blue-600 no-underline"
        >
          <div className="bg-blue-600 text-white p-1 rounded-full">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <span className="text-xs font-semibold tracking-wide">Powered by <span className="font-bold">NotionLock</span></span>
        </a>
      )}
    </div>
  );
};

export default NotionViewer;