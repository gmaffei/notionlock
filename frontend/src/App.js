import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import './i18n'; // Importa la configurazione di i18n
import ProtectedRoute from './components/ProtectedRoute';
import Homepage from './pages/Homepage';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminRoute from './components/AdminRoute';
import PasswordEntry from './pages/PasswordEntry';
import NotionViewer from './pages/NotionViewer';
import EmailVerification from './pages/EmailVerification';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import FAQ from './pages/FAQ';
import Privacy from './pages/Privacy';
import About from './pages/About';
import Accessibility from './pages/Accessibility';

function App() {
  return (
    <AuthProvider>
      <HelmetProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/p/:slug" element={<PasswordEntry />} />
            <Route path="/view/:slug" element={<NotionViewer />} />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/about" element={<About />} />
            <Route path="/accessibility" element={<Accessibility />} />
          </Routes>
        </Router>
      </HelmetProvider>
    </AuthProvider>
  );
}

export default App;