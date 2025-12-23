import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DomainManager from './DomainManager';

const EditPageModal = ({ isOpen, onClose, page, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: page?.title || '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (page) {
      setFormData(prev => ({
        ...prev,
        title: page.title || ''
      }));
    }
  }, [page]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Le password non corrispondono');
      return;
    }

    if (formData.password && formData.password.length < 4) {
      setError('La password deve essere almeno 4 caratteri');
      return;
    }

    setLoading(true);

    try {
      const updateData = {
        title: formData.title
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      await api.put(`/pages/${page.id}`, updateData);

      onSuccess('Pagina aggiornata con successo');
      onClose();
      setFormData({ title: '', password: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Errore durante l\'aggiornamento');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !page) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Modifica Pagina</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titolo
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Titolo della pagina"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nuova Password (opzionale)
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Lascia vuoto per non cambiare"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Inserisci solo se vuoi cambiare la password di accesso
              </p>
            </div>

            {formData.password && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conferma Nuova Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Conferma la nuova password"
                  disabled={loading}
                />
              </div>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <DomainManager page={page} />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              disabled={loading}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salva Modifiche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPageModal;