import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Auth = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialMode = searchParams.get('mode');

  const [isLogin, setIsLogin] = useState(initialMode === 'register' ? false : true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'it' ? 'en' : 'it';
    i18n.changeLanguage(newLang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRegistrationSuccess('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const { data } = await api.post(endpoint, { email, password });

      if (isLogin) {
        // Login: vai direttamente alla dashboard
        login(data.token);
        navigate('/dashboard');
      } else {
        // Registrazione: mostra messaggio di conferma senza fare login automatico
        setRegistrationSuccess(data.message || t('auth.success_register'));
        setEmail('');
        setPassword('');
        // Non fare login automatico per forzare l'utente a verificare l'email
      }
    } catch (err) {
      setError(err.response?.data?.error || t('password_entry.generic_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 relative">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={toggleLanguage}
          className="bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-1"
        >
          <span>{i18n.language === 'it' ? '🇮🇹 IT' : '🇬🇧 EN'}</span>
        </button>
      </div>

      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center space-x-3">
            <img src="/NotionLock_Logo.png" alt="NotionLock Logo" className="h-12 w-auto" />
            <h1 className="text-3xl font-bold text-blue-600">NotionLock</h1>
          </Link>
          <p className="text-gray-600 mt-2">{t('auth.hero_subtitle')}</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-6">
            {isLogin ? t('auth.login_title') : t('auth.register_title')}
          </h2>

          {!isLogin && (
            <div className="mb-6 space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span> {t('auth.no_credit_card')}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span> {t('auth.free_forever')}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span> {t('auth.quick_setup')}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {registrationSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {registrationSuccess}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setRegistrationSuccess('');
                }}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm underline"
              >
                {t('auth.go_to_login')}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.email_label')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('auth.email_placeholder')}
                autoComplete="email"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.password_label')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('auth.password_placeholder')}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {!isLogin && (
                <p className="text-xs text-gray-500 mt-1">{t('auth.min_chars')}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('auth.submit_loading') : (isLogin ? t('auth.submit_login') : t('auth.submit_register'))}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            {isLogin && (
              <Link
                to="/forgot-password"
                className="block text-blue-600 hover:underline text-sm"
              >
                {t('auth.forgot_pass')}
              </Link>
            )}
            <p className="text-gray-600">
              {isLogin ? t('auth.no_account') : t('auth.have_account')}{' '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setRegistrationSuccess('');
                }}
                className="text-blue-600 hover:underline font-medium"
              >
                {isLogin ? t('auth.start_free') : t('auth.login_title')}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-gray-500">
          {t('auth.terms_agree')}{' '}
          <Link to="/privacy" className="text-blue-600 hover:underline">
            {t('auth.terms_link')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Auth; 