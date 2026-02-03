import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next'; // ✅ Import du hook
import {
    Users, Activity, ClipboardList, Plus, UserPlus,
    TrendingUp, Calendar, ArrowRight, PieChart as PieIcon, Loader2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:8000';

export default function Dashboard() {
    const { t } = useTranslation(); // ✅ Initialisation du hook
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddPatient, setShowAddPatient] = useState(false);

    // Form State
    const [newPatient, setNewPatient] = useState({ full_name: '', age: '', gender: 'M', phone: '' });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${API_URL}/dashboard/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPatient = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await axios.post(`${API_URL}/patients`, newPatient, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowAddPatient(false);
            setNewPatient({ full_name: '', age: '', gender: 'M', phone: '' });
            fetchStats();
        } catch (e) {
            alert(t('modals.error_add')); // ✅ Traduction de l'alerte
        }
    };

    if (loading) return (
        <div className="p-10 text-center flex items-center justify-center gap-2">
            <Loader2 className="animate-spin"/> {t('common.loading')}
        </div>
    );

    if (!stats) return (
        <div className="p-10 text-center text-red-500 bg-red-50 rounded-xl m-6 border border-red-100">
            <h3 className="font-bold text-lg">{t('dashboard.conn_err')}</h3>
            <p>{t('dashboard.error_re')}</p>
        </div>
    );

    // Données pour le graphique
    const dataPie = [
        { name: t('dashboard.chart_healthy'), value: stats.total_analyses - stats.total_glaucoma }, // ✅ Traduction "Sains"
        { name: t('dashboard.chart_glaucoma'), value: stats.total_glaucoma }, // ✅ Traduction "Glaucome"
    ];
    const COLORS = ['#10B981', '#EF4444'];

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in">

            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">{t('dashboard.title')}</h1>
                    <p className="text-slate-500">{t('dashboard.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/app" className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
                        <Activity size={18}/> {t('dashboard.new_analysis')}
                    </Link>
                    <button
                        onClick={() => setShowAddPatient(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/30"
                    >
                        <UserPlus size={18}/> {t('dashboard.new_patient')}
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid md:grid-cols-3 gap-6">
                <StatCard
                    title={t('dashboard.stats_patients')}
                    value={stats.total_patients}
                    icon={<Users size={24} className="text-blue-600"/>}
                    trend={t('dashboard.trend_patients')} // ✅ Traduction "+2 cette semaine"
                    color="bg-blue-50"
                />
                <StatCard
                    title={t('dashboard.stats_analyses')}
                    value={stats.total_analyses}
                    icon={<ClipboardList size={24} className="text-purple-600"/>}
                    trend={t('dashboard.trend_activity')} // ✅ Traduction "Activité constante"
                    color="bg-purple-50"
                />
                <StatCard
                    title={t('dashboard.stats_glaucoma')}
                    value={stats.total_glaucoma}
                    icon={<Activity size={24} className="text-red-600"/>}
                    // ✅ Traduction complexe avec calcul JS + texte traduit
                    trend={`${stats.total_analyses > 0 ? ((stats.total_glaucoma/stats.total_analyses)*100).toFixed(1) : 0}% ${t('dashboard.prevalence')}`}
                    color="bg-red-50"
                />
            </div>

            {/* Graphique & Liste */}
            <div className="grid lg:grid-cols-3 gap-8">

                {/* Graphique Circulaire */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <PieIcon size={20} className="text-slate-400"/> {t('dashboard.chart_title')}
                    </h3>
                    <div className="h-64">
                        {stats.total_analyses === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 italic">{t('dashboard.no_data')}</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dataPie}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {dataPie.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Liste Patients Récents */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Calendar size={20} className="text-slate-400"/> {t('dashboard.recent_patients')}
                        </h3>
                        <button className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
                            {t('dashboard.see_all')} <ArrowRight size={14}/>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="text-slate-400 text-xs uppercase border-b border-slate-100">
                                <th className="pb-3 pl-2">{t('dashboard.table_name')}</th>
                                <th className="pb-3">{t('dashboard.table_age')}</th>
                                <th className="pb-3">{t('dashboard.table_gender')}</th>
                                <th className="pb-3">{t('dashboard.table_phone')}</th>
                                <th className="pb-3">{t('dashboard.table_date')}</th>
                            </tr>
                            </thead>
                            <tbody className="text-sm text-slate-600">
                            {stats.recent_patients.length === 0 ? (
                                <tr><td colSpan="5" className="py-8 text-center text-slate-400">{t('dashboard.empty_table')}</td></tr>
                            ) : (
                                stats.recent_patients.map((p) => (
                                    <tr key={p.id} className="border-b border-slate-50 last:border-none hover:bg-slate-50 transition-colors">
                                        <td className="py-3 pl-2 font-medium text-slate-800">{p.full_name}</td>
                                        <td className="py-3">{p.age} {t('common.years')}</td> {/* ✅ Traduction "ans" */}
                                        <td className="py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${p.gender === 'M' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                            {p.gender === 'M' ? t('dashboard.gender_m') : t('dashboard.gender_f')} {/* ✅ Traduction Homme/Femme */}
                                        </span>
                                        </td>
                                        <td className="py-3 text-slate-400">{p.phone || '-'}</td>
                                        <td className="py-3">{new Date(p.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL AJOUT PATIENT */}
            {showAddPatient && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg">{t('modals.add_patient_title')}</h3>
                            <button onClick={() => setShowAddPatient(false)} className="hover:bg-slate-700 p-1 rounded"><Plus size={20} className="rotate-45"/></button>
                        </div>
                        <form onSubmit={handleAddPatient} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard.table_name')}</label>
                                <input required type="text" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                       value={newPatient.full_name} onChange={e => setNewPatient({...newPatient, full_name: e.target.value})}/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard.table_age')}</label>
                                    <input required type="number" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                           value={newPatient.age} onChange={e => setNewPatient({...newPatient, age: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard.table_gender')}</label>
                                    <select className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newPatient.gender} onChange={e => setNewPatient({...newPatient, gender: e.target.value})}>
                                        <option value="M">{t('dashboard.gender_m')}</option> {/* ✅ Traduction Homme */}
                                        <option value="F">{t('dashboard.gender_f')}</option> {/* ✅ Traduction Femme */}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard.table_phone')}</label>
                                <input type="tel" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                       value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})}/>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 mt-4">
                                {t('modals.save_btn')} {/* ✅ Traduction "Enregistrer" */}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Petit composant carte KPI
const StatCard = ({ title, value, icon, trend, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow">
        <div>
            <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded w-fit">
                <TrendingUp size={12}/> {trend}
            </div>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
            {icon}
        </div>
    </div>
);