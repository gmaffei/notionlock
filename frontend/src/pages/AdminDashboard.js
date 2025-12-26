import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'monetization'

    const API_URL = process.env.REACT_APP_API_URL || 'https://api.notionlock.com/api';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [statsRes, settingsRes, usersRes] = await Promise.all([
                fetch(`${API_URL}/admin/stats`, { headers }),
                fetch(`${API_URL}/settings/admin`, { headers }),
                fetch(`${API_URL}/admin/users`, { headers })
            ]);

            if (!statsRes.ok) throw new Error('Failed to fetch stats');
            const statsData = await statsRes.json();

            let usersData = [];
            if (usersRes.ok) usersData = await usersRes.json();

            let settingsData = {};
            if (settingsRes.ok) {
                settingsData = await settingsRes.json();
            }

            setStats(statsData);
            setUsers(usersData);

            // Parse pricing config or use defaults with enabled flags
            const pricingConfig = settingsData.pricing_config || {};
            setSettings({
                subtitle: '',
                monthly: { enabled: false, usd: 4.99, eur: 4.99, variant_id: '', ...pricingConfig.monthly },
                yearly: { enabled: false, usd: 49.00, eur: 49.00, variant_id: '', ...pricingConfig.yearly },
                lifetime: { enabled: true, usd: 99.00, eur: 99.00, variant_id: '', ...pricingConfig.lifetime },
                discount: { percent: 0, active: false, ...pricingConfig.discount },
                ...pricingConfig // Ensure other keys are preserved
            });

        } catch (err) {
            setError('Errore nel caricamento dati');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = (section, field, value) => {
        if (field === null) {
            // Update root level key directly
            setSettings(prev => ({
                ...prev,
                [section]: value
            }));
        } else {
            // Update nested object
            setSettings(prev => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            }));
        }
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
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError('Errore nel salvataggio');
        } finally {
            setSaving(false);
        }
    };

    // Helper for Toggles
    const Toggle = ({ label, checked, onChange, color = 'green' }) => (
        <label className="flex items-center cursor-pointer select-none">
            <div className="relative">
                <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
                <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ${checked ? `bg-${color}-500` : 'bg-gray-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${checked ? 'transform translate-x-4' : ''}`}></div>
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700">{label}</span>
        </label>
    );

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>;

    const premiumUsers = users.filter(u => u.subscription_status && u.subscription_status !== 'free');
    const freeUsers = users.filter(u => !u.subscription_status || u.subscription_status === 'free');

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            {/* Main Content */}
            <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Superadmin Dashboard</h1>
                        <p className="text-gray-500 mt-1">Gestisci utenti, abbonamenti e configurazioni.</p>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="bg-white rounded-t-xl border-b border-gray-200 px-6 py-2 mb-6 flex space-x-8 overflow-x-auto shadow-sm sticky top-0 z-10">
                    {['overview', 'users', 'monetization'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap capitalize ${activeTab === tab
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab === 'overview' && '📊 Panoramica'}
                            {tab === 'users' && '👥 Utenti'}
                            {tab === 'monetization' && '💰 Monetizzazione'}
                        </button>
                    ))}
                </div>

                {/* TAB: OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transform hover:scale-[1.01] transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Utenti Totali</h3>
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">👥</div>
                                </div>
                                <p className="text-4xl font-bold text-gray-900">{stats?.totalUsers}</p>
                                <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
                                    <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                                    <span>Database users</span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transform hover:scale-[1.01] transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Pagine Protette</h3>
                                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600">🔒</div>
                                </div>
                                <p className="text-4xl font-bold text-gray-900">{stats?.totalPages}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transform hover:scale-[1.01] transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Traffico Totale</h3>
                                    <div className="p-2 bg-green-50 rounded-lg text-green-600">🌐</div>
                                </div>
                                <p className="text-4xl font-bold text-gray-900">{stats?.totalVisits}</p>
                                <p className="text-xs text-gray-500 mt-2">Richieste gestite dal proxy</p>
                            </div>
                        </div>

                        {/* Analytics Shortcuts */}
                        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h3 className="text-xl font-bold mb-2">Strumenti Esterni</h3>
                                <p className="text-gray-300 text-sm">Monitora il traffico e l'indicizzazione in tempo reale.</p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => window.open('https://analytics.google.com/analytics/web/#/a203713932p517311703/realtime/pages?params=_u..nav%3Dmaui', '_blank')}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition border border-white/10 font-semibold"
                                >
                                    📊 Google Analytics
                                </button>
                                <button
                                    onClick={() => window.open('https://search.google.com/search-console?resource_id=sc-domain%3Anotionlock.com&hl=it', '_blank')}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition border border-white/10 font-semibold"
                                >
                                    🔍 Search Console
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: USERS */}
                {activeTab === 'users' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Premium Users Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-yellow-50 flex justify-between items-center">
                                <h3 className="font-bold text-yellow-900 flex items-center gap-2">
                                    <span>👑</span> Utenti Premium ({premiumUsers.length})
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white text-gray-500 text-xs font-semibold uppercase tracking-wider border-b">
                                        <tr>
                                            <th className="px-6 py-3">Utente</th>
                                            <th className="px-6 py-3">Piano</th>
                                            <th className="px-6 py-3">Iscritto il</th>
                                            <th className="px-6 py-3">Stato</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {premiumUsers.length > 0 ? premiumUsers.map(user => (
                                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{user.email}</div>
                                                    <div className="text-xs text-gray-400 font-mono">{user.id}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                        {user.subscription_status?.toUpperCase().replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded-full">ACTIVE</span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-400 italic">Nessun utente premium</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Free Users Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-gray-700">Utenti Free ({freeUsers.length})</h3>
                            </div>
                            <div className="overflow-x-auto h-96">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 bg-gray-50">Utente</th>
                                            <th className="px-6 py-3 bg-gray-50">Ruolo</th>
                                            <th className="px-6 py-3 bg-gray-50">Iscritto il</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {freeUsers.map(user => (
                                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900">{user.email}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500 capitalize">{user.role}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: MONETIZATION */}
                {activeTab === 'monetization' && settings && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 animate-fade-in">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Piano & Prezzi</h2>
                                <p className="text-gray-500 text-sm">Configura i piani visibili in homepage.</p>
                            </div>
                            {successMsg && <span className="text-green-700 bg-green-100 px-4 py-2 rounded-lg font-semibold animate-pulse">{successMsg}</span>}
                            {error && <span className="text-red-700 bg-red-100 px-4 py-2 rounded-lg font-semibold">{error}</span>}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* General Settings */}
                            <div className="lg:col-span-2 bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Testo Sottotitolo Prezzi (Opzionale)</label>
                                <p className="text-xs text-gray-500 mb-2">Lascia vuoto per usare il testo automatico basato sui piani attivi.</p>
                                <textarea
                                    value={settings.subtitle || ''}
                                    onChange={e => handleSettingChange('subtitle', null, e.target.value)} // Special handling for root level key
                                    className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                                    rows="2"
                                    placeholder="Es: Scegli il piano perfetto per te..."
                                />
                            </div>

                            {/* Monthly Plan */}
                            <div className={`space-y-6 p-6 rounded-2xl border ${settings.monthly.enabled ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-gray-800">📅 Piano Mensile</h3>
                                    <Toggle label={settings.monthly.enabled ? "Attivo" : "Disattivato"}
                                        checked={settings.monthly.enabled}
                                        onChange={val => handleSettingChange('monthly', 'enabled', val)} color="blue" />
                                </div>
                                <div className={`grid grid-cols-2 gap-4 ${!settings.monthly.enabled && 'opacity-50 pointer-events-none'}`}>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Prezzo USD</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-400">$</span>
                                            <input type="number" step="0.01" value={settings.monthly.usd} onChange={e => handleSettingChange('monthly', 'usd', parseFloat(e.target.value))}
                                                className="w-full pl-8 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Prezzo EUR</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-400">€</span>
                                            <input type="number" step="0.01" value={settings.monthly.eur} onChange={e => handleSettingChange('monthly', 'eur', parseFloat(e.target.value))}
                                                className="w-full pl-8 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-2">
                                            Variant ID (Lemon Squeezy)
                                            <span className="group relative">
                                                <span className="cursor-help text-gray-400 hover:text-gray-600">ⓘ</span>
                                                <span className="invisible group-hover:visible absolute left-5 bottom-0 w-64 p-2 bg-gray-800 text-white text-xs rounded z-50">
                                                    Trovi questo ID nell'URL del prodotto su Lemon Squeezy o nelle impostazioni del "Variant". È necessario per il checkout.
                                                </span>
                                            </span>
                                        </label>
                                        <input type="text" value={settings.monthly.variant_id} onChange={e => handleSettingChange('monthly', 'variant_id', e.target.value)}
                                            className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-white" placeholder="es. 123456" />
                                    </div>
                                </div>
                            </div>

                            {/* Yearly Plan */}
                            <div className={`space-y-6 p-6 rounded-2xl border ${settings.yearly.enabled ? 'border-purple-200 bg-purple-50/50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-gray-800">📅 Piano Annuale</h3>
                                    <Toggle label={settings.yearly.enabled ? "Attivo" : "Disattivato"}
                                        checked={settings.yearly.enabled}
                                        onChange={val => handleSettingChange('yearly', 'enabled', val)} color="purple" />
                                </div>
                                <div className={`grid grid-cols-2 gap-4 ${!settings.yearly.enabled && 'opacity-50 pointer-events-none'}`}>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Prezzo USD</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-400">$</span>
                                            <input type="number" step="0.01" value={settings.yearly.usd} onChange={e => handleSettingChange('yearly', 'usd', parseFloat(e.target.value))}
                                                className="w-full pl-8 border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Prezzo EUR</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-400">€</span>
                                            <input type="number" step="0.01" value={settings.yearly.eur} onChange={e => handleSettingChange('yearly', 'eur', parseFloat(e.target.value))}
                                                className="w-full pl-8 border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500" />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Variant ID</label>
                                        <input type="text" value={settings.yearly.variant_id} onChange={e => handleSettingChange('yearly', 'variant_id', e.target.value)}
                                            className="w-full border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 font-mono text-sm bg-white" placeholder="es. 654321" />
                                    </div>
                                </div>
                            </div>

                            {/* Lifetime Plan */}
                            <div className={`space-y-6 lg:col-span-2 p-6 rounded-2xl border ${settings.lifetime.enabled ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-yellow-900 flex items-center gap-2">💎 Lifetime Deal <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">Best Value</span></h3>
                                    <Toggle label={settings.lifetime.enabled ? "Attivo" : "Disattivato"}
                                        checked={settings.lifetime.enabled}
                                        onChange={val => handleSettingChange('lifetime', 'enabled', val)} color="yellow" />
                                </div>
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${!settings.lifetime.enabled && 'opacity-50 pointer-events-none'}`}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Prezzo USD</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-gray-400">$</span>
                                                <input type="number" step="0.01" value={settings.lifetime.usd} onChange={e => handleSettingChange('lifetime', 'usd', parseFloat(e.target.value))}
                                                    className="w-full pl-8 border-yellow-200 focus:border-yellow-400 focus:ring-yellow-400 rounded-lg" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Prezzo EUR</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-gray-400">€</span>
                                                <input type="number" step="0.01" value={settings.lifetime.eur} onChange={e => handleSettingChange('lifetime', 'eur', parseFloat(e.target.value))}
                                                    className="w-full pl-8 border-yellow-200 focus:border-yellow-400 focus:ring-yellow-400 rounded-lg" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Variant ID</label>
                                        <input type="text" value={settings.lifetime.variant_id} onChange={e => handleSettingChange('lifetime', 'variant_id', e.target.value)}
                                            className="w-full border-yellow-200 focus:border-yellow-400 focus:ring-yellow-400 rounded-lg font-mono text-sm bg-white" placeholder="es. 999999" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end pt-6 border-t border-gray-100">
                            <button onClick={saveSettings} disabled={saving}
                                className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transform transition active:scale-95 disabled:opacity-50 shadow-lg flex items-center gap-2">
                                {saving ? <span className="animate-spin">↻</span> : '💾'}
                                {saving ? 'Salvataggio...' : 'Salva Tutte le Modifiche'}
                            </button>
                        </div>
                    </div>
                )}

            </main>
            <Footer />
        </div>
    );
};

export default AdminDashboard;
