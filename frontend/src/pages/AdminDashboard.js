import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const API_URL = process.env.REACT_APP_API_URL || 'https://api.notionlock.com/api';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [statsRes, settingsRes] = await Promise.all([
                fetch(`${API_URL}/admin/stats`, { headers }),
                fetch(`${API_URL}/settings/admin`, { headers })
            ]);

            if (!statsRes.ok) throw new Error('Failed to fetch stats');
            const statsData = await statsRes.json();

            let settingsData = {};
            if (settingsRes.ok) {
                settingsData = await settingsRes.json();
            }

            setStats(statsData);
            // Parse pricing config or use defaults
            setSettings(settingsData.pricing_config || {
                monthly: { usd: 4.99, eur: 4.99, variant_id: '' },
                yearly: { usd: 49.00, eur: 49.00, variant_id: '' },
                lifetime: { enabled: true, usd: 99.00, eur: 99.00, variant_id: '' },
                discount: { percent: 0, active: false }
            });

        } catch (err) {
            setError('Errore nel caricamento dati');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = (section, field, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const saveSettings = async () => {
        setSaving(true);
        setSuccessMsg('');
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/settings/admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    key: 'pricing_config',
                    value: settings
                })
            });
            setSuccessMsg('Configurazione salvata con successo! 💾');
        } catch (err) {
            setError('Errore nel salvataggio');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Caricamento...</div>;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Superadmin Dashboard 🛡️</h1>
                    {/* Analytics Shortcuts */}
                    <div className="mb-8 flex gap-4 flex-wrap">
                        <button
                            onClick={() => window.open('https://analytics.google.com/analytics/web/#/a203713932p517311703/realtime/pages?params=_u..nav%3Dmaui', '_blank')}
                            className="bg-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-700 shadow flex items-center gap-2"
                        >
                            📊 Google Analytics
                        </button>
                        <button
                            onClick={() => window.open('https://search.google.com/search-console?resource_id=sc-domain%3Anotionlock.com&hl=it', '_blank')}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 shadow flex items-center gap-2"
                        >
                            🔍 Google Search Console
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium uppercase">Utenti Totali</h3>
                        <p className="text-4xl font-bold text-blue-600 mt-2">{stats?.totalUsers}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium uppercase">Pagine Protette</h3>
                        <p className="text-4xl font-bold text-purple-600 mt-2">{stats?.totalPages}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium uppercase">Visite Totali (Proxy)</h3>
                        <p className="text-4xl font-bold text-green-600 mt-2">{stats?.totalVisits}</p>
                    </div>
                </div>

                {/* --- MONETIZATION SETTINGS --- */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">💰 Impostazioni Monetizzazione</h2>
                        {successMsg && <span className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded">{successMsg}</span>}
                    </div>

                    {settings && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Monthly */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-700 border-b pb-2">Piano Mensile</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-600">Prezzo USD ($)</label>
                                        <input type="number" step="0.01" value={settings.monthly.usd}
                                            onChange={e => handleSettingChange('monthly', 'usd', parseFloat(e.target.value))}
                                            className="w-full border rounded p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600">Prezzo EUR (€)</label>
                                        <input type="number" step="0.01" value={settings.monthly.eur}
                                            onChange={e => handleSettingChange('monthly', 'eur', parseFloat(e.target.value))}
                                            className="w-full border rounded p-2" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm text-gray-600">Variant ID</label>
                                        <input type="text" value={settings.monthly.variant_id || ''}
                                            onChange={e => handleSettingChange('monthly', 'variant_id', e.target.value)}
                                            className="w-full border rounded p-2 text-xs font-mono" placeholder="variant_..." />
                                    </div>
                                </div>
                            </div>

                            {/* Yearly */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-700 border-b pb-2">Piano Annuale</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-600">Prezzo USD ($)</label>
                                        <input type="number" step="0.01" value={settings.yearly.usd}
                                            onChange={e => handleSettingChange('yearly', 'usd', parseFloat(e.target.value))}
                                            className="w-full border rounded p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600">Prezzo EUR (€)</label>
                                        <input type="number" step="0.01" value={settings.yearly.eur}
                                            onChange={e => handleSettingChange('yearly', 'eur', parseFloat(e.target.value))}
                                            className="w-full border rounded p-2" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm text-gray-600">Variant ID</label>
                                        <input type="text" value={settings.yearly.variant_id || ''}
                                            onChange={e => handleSettingChange('yearly', 'variant_id', e.target.value)}
                                            className="w-full border rounded p-2 text-xs font-mono" placeholder="variant_..." />
                                    </div>
                                </div>
                            </div>

                            {/* Lifetime */}
                            <div className="space-y-4 md:col-span-2 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <div className="flex justify-between items-center border-b border-yellow-200 pb-2">
                                    <h3 className="font-bold text-gray-800">💎 Lifetime Deal</h3>
                                    <label className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only" checked={settings.lifetime.enabled}
                                                onChange={e => handleSettingChange('lifetime', 'enabled', e.target.checked)} />
                                            <div className={`block w-10 h-6 rounded-full ${settings.lifetime.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${settings.lifetime.enabled ? 'transform translate-x-4' : ''}`}></div>
                                        </div>
                                        <span className="ml-3 text-sm font-medium text-gray-700">Abilita Offerta a Vita</span>
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-600">Prezzo USD ($)</label>
                                        <input type="number" step="0.01" value={settings.lifetime.usd}
                                            onChange={e => handleSettingChange('lifetime', 'usd', parseFloat(e.target.value))}
                                            className="w-full border rounded p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600">Prezzo EUR (€)</label>
                                        <input type="number" step="0.01" value={settings.lifetime.eur}
                                            onChange={e => handleSettingChange('lifetime', 'eur', parseFloat(e.target.value))}
                                            className="w-full border rounded p-2" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm text-gray-600">Variant ID</label>
                                        <input type="text" value={settings.lifetime.variant_id || ''}
                                            onChange={e => handleSettingChange('lifetime', 'variant_id', e.target.value)}
                                            className="w-full border rounded p-2 text-xs font-mono" placeholder="variant_..." />
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="md:col-span-2 flex justify-end">
                                <button onClick={saveSettings} disabled={saving}
                                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transform transition active:scale-95 disabled:opacity-50">
                                    {saving ? 'Salvataggio...' : 'Salva Configurazione'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Recent Activity Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-800">Ultimi Utenti Iscritti</h3>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm">
                            <tr>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Data Iscrizione</th>
                                <th className="px-6 py-3">ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stats?.recentUsers?.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 font-medium text-gray-900">{user.email}</td>
                                    <td className="px-6 py-3 text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-3 text-gray-400 font-mono text-xs">{user.id}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </main>
            <Footer />
        </div>
    );
};

export default AdminDashboard;
