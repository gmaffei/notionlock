import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DomainManager = ({ pageId, userStatus, userRole }) => {
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newDomain, setNewDomain] = useState('');
    const [adding, setAdding] = useState(false);
    const [verifying, setVerifying] = useState(null); // id of domain being verified
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const isPro = ['pro', 'lifetime', 'lifetime_pro'].includes(userStatus) || ['admin', 'superadmin'].includes(userRole);

    useEffect(() => {
        if (pageId) fetchDomains();
    }, [pageId]);

    const fetchDomains = async () => {
        try {
            const res = await api.get('/domains');
            // Filter client-side for simplicity as the API returns all user domains
            const pageDomains = res.data.domains ? res.data.domains.filter(d => d.page_id === pageId) : [];
            setDomains(pageDomains);
        } catch (err) {
            console.error("Failed to load domains");
        } finally {
            setLoading(false);
        }
    };

    const handleAddDomain = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setAdding(true);

        try {
            await api.post('/domains', {
                domain: newDomain,
                pageId: pageId
            });
            setMessage('Dominio aggiunto! Ora aggiungi il record CNAME.');
            setNewDomain('');
            fetchDomains();
        } catch (err) {
            setError(err.response?.data?.error || 'Errore aggiunta dominio');
        } finally {
            setAdding(false);
        }
    };

    const handleVerify = async (id) => {
        setVerifying(id);
        setError('');
        setMessage('');
        try {
            const res = await api.post(`/domains/${id}/verify`);
            if (res.data.success) {
                setMessage('Dominio Verificato con successo!');
                fetchDomains();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Verifica fallita. Riprova tra poco.');
        } finally {
            setVerifying(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Rimuovere questo dominio?")) return;
        try {
            await api.delete(`/domains/${id}`);
            fetchDomains();
        } catch (err) {
            setError('Errore cancellazione');
        }
    };

    if (!isPro) {
        return (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center mt-4">
                <p className="mb-2 text-gray-600 text-sm">I domini personalizzati sono riservati agli utenti Pro.</p>
            </div>
        );
    }

    return (
        <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Domini Personalizzati</h3>

            {/* List */}
            <div className="space-y-3 mb-6">
                {domains.map(domain => (
                    <div key={domain.id} className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                        <div>
                            <div className="font-medium text-gray-800 text-sm">{domain.domain}</div>
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                                Status:
                                <span className={`ml-1 font-semibold ${domain.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {domain.verified ? 'Attivo' : 'Da Verificare'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {!domain.verified && (
                                <button
                                    onClick={() => handleVerify(domain.id)}
                                    disabled={verifying === domain.id}
                                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                >
                                    {verifying === domain.id ? '...' : 'Verifica DNS'}
                                </button>
                            )}
                            <button onClick={() => handleDelete(domain.id)} className="text-red-500 hover:text-red-700">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Form */}
            <form onSubmit={handleAddDomain} className="flex gap-2">
                <input
                    type="text"
                    placeholder="docs.tuosito.com"
                    className="flex-1 border rounded px-3 py-2 text-sm"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    required
                />
                <button
                    type="submit"
                    disabled={adding}
                    className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 disabled:opacity-50"
                >
                    {adding ? '...' : 'Aggiungi'}
                </button>
            </form>

            {/* Help Text */}
            <div className="mt-4 text-xs text-gray-500 bg-blue-50 p-3 rounded">
                <strong>Configurazione DNS:</strong> Aggiungi un record <code>CNAME</code> sul tuo provider DNS:
                <br />
                Host: <code>{newDomain.split('.')[0] || 'docs'}</code> &rarr; Valore: <code>notionlock.com</code>
            </div>

            {message && <p className="mt-2 text-sm text-green-600 font-medium">{message}</p>}
            {error && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
        </div>
    );
};

export default DomainManager;
