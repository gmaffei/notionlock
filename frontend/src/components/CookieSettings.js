import React from 'react';

const CookieSettings = ({ className = '' }) => {
  const handleOpenCookieSettings = () => {
    if (window.Cookiebot) {
      window.Cookiebot.show();
    }
  };

  return (
    <button
      onClick={handleOpenCookieSettings}
      className={`text-sm text-gray-600 hover:text-blue-600 underline ${className}`}
      aria-label="Gestisci impostazioni cookie"
    >
      🍪 Impostazioni Cookie
    </button>
  );
};

export default CookieSettings;