import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(
    sessionStorage.getItem('token') || localStorage.getItem('token')
  );
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for impersonation token in URL
    const searchParams = new URLSearchParams(window.location.search);
    const impToken = searchParams.get('impersonate_token');

    if (impToken) {
      // Impersonation: use sessionStorage to isolate from main admin session
      sessionStorage.setItem('token', impToken);
      setToken(impToken);
      // Clean URL to remove token
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const fetchUser = async () => {
      try {
        // Priority: current state token -> sessionStorage -> localStorage
        const currentToken = token || sessionStorage.getItem('token') || localStorage.getItem('token');

        if (!currentToken) {
          setLoading(false);
          return;
        }

        // Ensure api client has the token (handled by interceptor, but good for local state sync)

        const { data } = await api.get('/auth/me');
        setUser(data.user);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch user:', error);

        // If error with impersonation token, clear only session
        if (sessionStorage.getItem('token')) {
          sessionStorage.removeItem('token');
          // If we have a fallback local token, revert to it? 
          // For safety, just clear state. The user can refresh to fall back to admin.
        } else {
          localStorage.removeItem('token');
        }

        setToken(null);
        setUser(null);
        setLoading(false);
      }
    };

    fetchUser();
    // listening to token might cause loop if not careful, but setToken updates it.
    // impToken check runs on mount.
  }, [token]);

  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    token,
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 