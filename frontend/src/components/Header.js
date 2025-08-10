import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [showLanguageMenu, setShowLanguageMenu] = React.useState(false);

  // Chiudi menu al click fuori
  React.useEffect(() => {
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

  // Flag components
  const ItalyFlag = () => (
    <svg width="20" height="15" viewBox="0 0 20 15" className="inline-block">
      <rect width="6.67" height="15" fill="#009246"/>
      <rect x="6.67" width="6.67" height="15" fill="#FFFFFF"/>
      <rect x="13.33" width="6.67" height="15" fill="#CE2B37"/>
    </svg>
  );

  const UKFlag = () => (
    <svg width="20" height="15" viewBox="0 0 20 15" className="inline-block">
      <rect width="20" height="15" fill="#012169"/>
      <path d="M0 0L20 15M20 0L0 15" stroke="#FFFFFF" strokeWidth="2"/>
      <path d="M0 0L20 15M20 0L0 15" stroke="#C8102E" strokeWidth="1"/>
      <path d="M10 0V15M0 7.5H20" stroke="#FFFFFF" strokeWidth="3"/>
      <path d="M10 0V15M0 7.5H20" stroke="#C8102E" strokeWidth="2"/>
    </svg>
  );

  const getCurrentFlag = () => {
    return i18n.language === 'it' ? <ItalyFlag /> : <UKFlag />;
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
                  <ItalyFlag />
                  <span className="text-sm">Italiano</span>
                </button>
                <button
                  onClick={() => changeLanguage('en')}
                  className={`w-full px-3 py-2 text-left flex items-center space-x-2 hover:bg-gray-50 last:rounded-b-lg ${i18n.language === 'en' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                >
                  <UKFlag />
                  <span className="text-sm">English</span>
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