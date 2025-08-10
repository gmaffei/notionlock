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

  // Flag icons as emoji
  const getCurrentFlag = () => {
    return (
      <span className="text-lg">
        {i18n.language === 'it' ? '🇮🇹' : '🇬🇧'}
      </span>
    );
  };

  const getLanguageInfo = (lng) => {
    return lng === 'it' 
      ? { flag: '🇮🇹', name: 'Italiano' }
      : { flag: '🇬🇧', name: 'English' };
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
                  <span className="text-lg">{getLanguageInfo('it').flag}</span>
                  <span className="text-sm">{getLanguageInfo('it').name}</span>
                </button>
                <button
                  onClick={() => changeLanguage('en')}
                  className={`w-full px-3 py-2 text-left flex items-center space-x-2 hover:bg-gray-50 last:rounded-b-lg ${i18n.language === 'en' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                >
                  <span className="text-lg">{getLanguageInfo('en').flag}</span>
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