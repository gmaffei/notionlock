import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NotionRenderer } from 'react-notion-x';
import 'react-notion-x/src/styles.css';

const NotionViewer = ({ predefinedSlug }) => {
  const { slug: paramSlug } = useParams();
  const slug = predefinedSlug || paramSlug;
  const navigate = useNavigate();
  const [recordMap, setRecordMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBranding, setShowBranding] = useState(true);

  useEffect(() => {
    const accessToken = sessionStorage.getItem(`access_${slug}`);

    if (!accessToken) {
      navigate(`/p/${slug}`);
      return;
    }

    fetchNotionContent(accessToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchNotionContent = async (accessToken) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://api.notionlock.com/api'}/p/view/${slug}?token=${accessToken}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to load content');
      }

      const data = await response.json();
      setRecordMap(data.recordMap);
      setShowBranding(data.showBranding);
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
        <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-md">
          <h3 className="text-xl font-bold mb-2">Error Loading Page</h3>
          <p className="mb-4">{error}</p>
          <p className="text-sm text-gray-600">
            Make sure the page is public or shared with the NLock integration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {recordMap && (
        <NotionRenderer
          recordMap={recordMap}
          fullPage={true}
          darkMode={false}
        />
      )}

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