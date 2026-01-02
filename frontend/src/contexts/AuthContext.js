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
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for impersonation token in URL
    const searchParams = new URLSearchParams(window.location.search);
    const impToken = searchParams.get('impersonate_token');

    if (impToken) {
      localStorage.setItem('token', impToken);
      setToken(impToken);
      // Clean URL to remove token
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const fetchUser = async () => {
      try {
        const currentToken = impToken || token; // Use new token if just set
        if (!currentToken) {
          setLoading(false);
          return;
        }

        // Ensure api client has the token
        // (Assuming api.js uses localStorage or we might need to set it explicitly if it relies on interception)

        const { data } = await api.get('/auth/me');
        setUser(data.user);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        // Don't call logout() here to avoid infinite loop
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setLoading(false);
      }
    };

    fetchUser();
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