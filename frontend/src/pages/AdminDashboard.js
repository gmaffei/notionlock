import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            // Fix: Use REACT_APP_API_URL or default
            const apiUrl = process.env.REACT_APP_API_URL || 'https://api.notionlock.com/api';
            const response = await fetch(`${apiUrl}/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();
            setStats(data);
        } catch (err) {
            setError('Errore nel caricamento delle statistiche');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Caricamento...</div>;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8 text-gray-800">Superadmin Dashboard 🛡️</h1>

                {/* Analytics Shortcuts */}
                <div className="mb-8">
                    <button
                        onClick={() => window.open('https://analytics.google.com/', '_blank')}
                        className="bg-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-700 shadow flex items-center gap-2"
                    >
                        📊 Apri Google Analytics
                    </button>
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

                {/* Recent Activity */}
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
