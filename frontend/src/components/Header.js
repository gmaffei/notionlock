import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Chiudi menu al click fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLanguageMenu && !event.target.closest('.language-dropdown')) {
        setShowLanguageMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLanguageMenu]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLanguageMenu(false);
    // Salva la preferenza nel localStorage
    localStorage.setItem('language', lng);
  };

  // Simple flag components with fallback
  const ItalyFlag = () => (
    <div className="inline-flex w-5 h-4 border border-gray-300 rounded-sm overflow-hidden">
      <div className="w-1/3 h-full bg-green-600"></div>
      <div className="w-1/3 h-full bg-white"></div>
      <div className="w-1/3 h-full bg-red-600"></div>
    </div>
  );

  const UKFlag = () => (
    <div className="inline-flex w-5 h-4 bg-blue-700 border border-gray-300 rounded-sm overflow-hidden relative">
      {/* White cross */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-white transform translate-y-1.5"></div>
      <div className="absolute top-0 left-0 w-0.5 h-full bg-white transform translate-x-2"></div>
      {/* Red cross (smaller) */}
      <div className="absolute top-0 left-0 w-full h-px bg-red-500 transform translate-y-1.5"></div>
      <div className="absolute top-0 left-0 w-px h-full bg-red-500 transform translate-x-2"></div>
    </div>
  );

  const getCurrentFlag = () => {
    return i18n.language === 'it' ? <ItalyFlag /> : <UKFlag />;
  };

  const getLanguageInfo = (lng) => {
    return lng === 'it' 
      ? { flag: <ItalyFlag />, name: 'Italiano' }
      : { flag: <UKFlag />, name: 'English' };
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-3">
          <img src="/NotionLock_Logo.png" alt="NotionLock Logo" className="h-12 w-auto" />
          <span className="text-3xl font-bold text-blue-600 hover:text-blue-700 transition">NotionLock</span>
        </Link>
        
        <nav className="flex items-center space-x-6">
          <Link to="/faq" className="text-gray-600 hover:text-gray-900 transition">{t('faq')}</Link>
          <Link to="/about" className="text-gray-600 hover:text-gray-900 transition">{t('about')}</Link>
          
          <div className="relative language-dropdown">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition bg-white border border-gray-300 rounded-lg px-3 py-2"
            >
              {getCurrentFlag()}
              <span className="text-sm font-medium">{i18n.language.toUpperCase()}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showLanguageMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                <button
                  onClick={() => changeLanguage('it')}
                  className={`w-full px-3 py-2 text-left flex items-center space-x-2 hover:bg-gray-50 first:rounded-t-lg ${i18n.language === 'it' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                >
                  {getLanguageInfo('it').flag}
                  <span className="text-sm">{getLanguageInfo('it').name}</span>
                </button>
                <button
                  onClick={() => changeLanguage('en')}
                  className={`w-full px-3 py-2 text-left flex items-center space-x-2 hover:bg-gray-50 last:rounded-b-lg ${i18n.language === 'en' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                >
                  {getLanguageInfo('en').flag}
                  <span className="text-sm">{getLanguageInfo('en').name}</span>
                </button>
              </div>
            )}
          </div>

          {user ? (
            <>
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 transition">{t('dashboard')}</Link>
              <span className="text-gray-500">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 transition"
              >
                {t('logout')}
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {t('login')}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header; 