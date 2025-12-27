import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // ✅ Import du hook
import { Clock, AlertTriangle, CheckCircle, ImageOff, Calendar, FileText, Eye, User } from 'lucide-react';
import { generateGlaucomaReport } from '../utils/pdfGenerator';

const API_URL = 'http://localhost:8000';

const History = () => {
    const { t } = useTranslation(); // ✅ Initialisation du hook
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login';
                return;
            }
            const response = await axios.get(`${API_URL}/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(response.data);
        } catch (err) {
            console.error(err);
            setError(t('history.error_load')); // ✅ Erreur traduite
        } finally {
            setLoading(false);
        }
    };

    // ✅ LOGIQUE DE REGROUPEMENT PAR PATIENT
    const groupedHistory = history.reduce((acc, item) => {
        // ✅ Traduction du patient inconnu
        const patientName = item.patient_name || t('history.unknown_patient');
        if (!acc[patientName]) {
            acc[patientName] = [];
        }
        acc[patientName].push(item);
        return acc;
    }, {});

    const handleDownload = async (item) => {
        const reportData = {
            id: item.id,
            hasGlaucoma: item.has_glaucoma,
            confidence: item.confidence,
            timestamp: item.timestamp
        };
        // Note: generateGlaucomaReport devra aussi recevoir 't' idéalement,
        // mais ici on garde ta structure actuelle.
        await generateGlaucomaReport(reportData, item.image_url, t);
    };

    // ✅ NOUVELLE FONCTION : Rediriger vers l'interface de résultat
    const handleViewAnalysis = (item) => {
        // On reconstruit l'objet analysisResult tel que ImageUploader l'attend
        const reconstructedResult = {
            confidence: (item.confidence * 100).toFixed(1),
            hasGlaucoma: item.has_glaucoma,
            prediction_class: item.has_glaucoma ? 1 : 0,
            probability: item.confidence,
            // ✅ Messages traduits dynamiquement
            message: item.has_glaucoma ? t('history.msg_glaucoma') : t('history.msg_healthy'),
            // ✅ Recommandations traduites dynamiquement
            recommendations: item.has_glaucoma
                ? [t('history.reco_consult'), t('history.reco_oct')]
                : [t('history.reco_annual')],
            gradcamImage: null
        };

        // On navigue vers /app en passant les données via le "state" du router
        navigate('/app', {
            state: {
                replayAnalysis: true,
                imageUrl: item.image_url,
                analysisData: reconstructedResult
            }
        });
    };

    if (loading) return <div className="text-center mt-20 text-slate-500">{t('history.loading_records')}</div>; // ✅ Traduit

    return (
        <div className="max-w-7xl mx-auto p-6 animate-in fade-in">
            <div className="mb-8 flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                    <Clock size={32} />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">{t('history.title')}</h2> {/* ✅ Traduit */}
                    <p className="text-slate-500">{t('history.subtitle')}</p> {/* ✅ Traduit */}
                </div>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-4">{error}</div>}

            {Object.keys(groupedHistory).length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400">
                    {t('history.empty')} {/* ✅ Traduit */}
                </div>
            ) : (
                <div className="space-y-12">
                    {/* On boucle sur chaque patient */}
                    {Object.entries(groupedHistory).map(([patientName, items]) => (
                        <div key={patientName} className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200/60">

                            {/* En-tête Patient */}
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
                                <div className="bg-white p-2 rounded-full shadow-sm text-slate-700">
                                    <User size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">{patientName}</h3>
                                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                                    {items.length} {t('history.analysis_unit')}{items.length > 1 ? 's' : ''} {/* ✅ Traduit */}
                                </span>
                            </div>

                            {/* Grille des analyses de ce patient */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {items.map((item) => (
                                    <div key={item.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 overflow-hidden flex flex-col group">

                                        {/* Image */}
                                        <div className="h-40 w-full bg-slate-100 relative overflow-hidden">
                                            {item.is_expired ? (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                                    <ImageOff size={24} />
                                                    <span className="text-xs">{t('history.expired')}</span> {/* ✅ Traduit */}
                                                </div>
                                            ) : (
                                                <>
                                                    <img src={item.image_url} alt="Scan" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                    {/* Overlay au survol */}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            onClick={() => handleViewAnalysis(item)}
                                                            className="bg-white text-blue-600 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform"
                                                        >
                                                            <Eye size={16}/> {t('history.view_details')} {/* ✅ Traduit */}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm">
                                                {(item.confidence * 100).toFixed(0)}%
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-3">
                                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Calendar size={12} /> {new Date(item.timestamp).toLocaleDateString()}
                                                </p>
                                                {item.has_glaucoma
                                                    ? <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md flex gap-1 items-center"><AlertTriangle size={12}/> {t('history.badge_glaucoma')}</span> // ✅ Traduit
                                                    : <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md flex gap-1 items-center"><CheckCircle size={12}/> {t('history.badge_healthy')}</span> // ✅ Traduit
                                                }
                                            </div>

                                            <div className="mt-auto flex gap-2">
                                                <button
                                                    onClick={() => handleViewAnalysis(item)}
                                                    disabled={item.is_expired}
                                                    className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-1"
                                                >
                                                    <Eye size={14}/> {t('history.view_btn')} {/* ✅ Traduit */}
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(item)}
                                                    className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex justify-center items-center gap-1"
                                                >
                                                    <FileText size={14}/> {t('history.pdf_btn')} {/* ✅ Traduit */}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default History;