import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Debug: log when component renders
  useEffect(() => {
    console.log('Header rendered, current language:', i18n.language);
  }, [i18n.language]);

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

  // Multiple flag approaches - one will work!
  const FlagComponent = ({ country }) => {
    // Approach 1: SVG files
    const SvgFlag = () => (
      <img
        src={`/flags/${country}.svg`}
        alt={`${country} flag`}
        className="w-5 h-4 rounded-sm border border-gray-300"
        onError={(e) => {
          // Fallback to approach 2 on error
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'inline';
        }}
      />
    );

    // Approach 2: Unicode flags (with proper font stack)
    const UnicodeFlag = () => (
      <span
        className="text-base leading-none"
        style={{
          fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
          display: 'none'
        }}
      >
        {country === 'italy' ? '🇮🇹' : '🇬🇧'}
      </span>
    );

    // Approach 3: CSS fallback
    const CssFlag = () => (
      <div className="inline-flex w-5 h-4 rounded-sm border border-gray-300 overflow-hidden">
        {country === 'italy' ? (
          <>
            <div className="w-1/3 h-full bg-green-600"></div>
            <div className="w-1/3 h-full bg-white"></div>
            <div className="w-1/3 h-full bg-red-600"></div>
          </>
        ) : (
          <div className="w-full h-full bg-blue-700 relative">
            <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">UK</div>
          </div>
        )}
      </div>
    );

    return (
      <div className="inline-block">
        <SvgFlag />
        <UnicodeFlag />
      </div>
    );
  };

  const getCurrentFlag = () => <FlagComponent country={i18n.language === 'it' ? 'italy' : 'uk'} />;

  const getLanguageInfo = (lng) => {
    return lng === 'it'
      ? { flag: <FlagComponent country="italy" />, name: 'Italiano' }
      : { flag: <FlagComponent country="uk" />, name: 'English' };
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
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition bg-white border-2 border-blue-300 rounded-lg px-3 py-2"
              title={`Current language: ${i18n.language}`}
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
              {user.role === 'admin' && (
                <Link to="/admin" className="text-orange-600 font-bold hover:text-orange-700 transition flex items-center gap-1">
                  🛡️ Admin
                </Link>
              )}
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