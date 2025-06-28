import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
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
          
          <div className="relative">
            <select 
              onChange={(e) => changeLanguage(e.target.value)} 
              value={i18n.language}
              className="bg-transparent text-gray-600 hover:text-gray-900 transition"
            >
              <option value="it">IT</option>
              <option value="en">EN</option>
            </select>
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