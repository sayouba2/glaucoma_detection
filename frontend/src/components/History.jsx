import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, AlertTriangle, CheckCircle, ImageOff, Calendar, Download, FileText } from 'lucide-react'; // ✅ Ajout Download/FileText
import { generateGlaucomaReport } from '../utils/pdfGenerator'; // ✅ IMPORT DU GÉNÉRATEUR

const API_URL = 'http://localhost:8000';

const History = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
            setError("Impossible de charger l'historique.");
        } finally {
            setLoading(false);
        }
    };

    // ✅ FONCTION POUR TÉLÉCHARGER DEPUIS L'HISTORIQUE
    const handleDownload = async (item) => {
        // On adapte les données de la BDD au format attendu par le générateur
        const reportData = {
            id: item.id,
            hasGlaucoma: item.has_glaucoma, // Attention à la casse (snake_case vs camelCase)
            confidence: item.confidence,
            timestamp: item.timestamp
        };

        // On lance la génération
        await generateGlaucomaReport(reportData, item.image_url);
    };

    if (loading) return <div className="text-center mt-20">Chargement...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8 flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                    <Clock size={32} />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Historique des analyses</h2>
                    <p className="text-slate-500">Vos résultats sont conservés ici.</p>
                </div>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-4">{error}</div>}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.map((item) => (
                    <div key={item.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100 hover:shadow-xl transition-shadow flex flex-col">

                        {/* Zone Image */}
                        <div className="h-48 w-full bg-slate-100 flex items-center justify-center relative">
                            {item.is_expired ? (
                                <div className="text-slate-400 flex flex-col items-center gap-2">
                                    <ImageOff size={32} />
                                    <span className="text-sm font-medium">Image expirée</span>
                                </div>
                            ) : (
                                <img
                                    src={item.image_url}
                                    alt="Scan"
                                    className="w-full h-full object-cover"
                                />
                            )}

                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                {(item.confidence * 100).toFixed(1)}% Confiance
                            </div>
                        </div>

                        {/* Contenu */}
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                                        <Calendar size={12} />
                                        {new Date(item.timestamp).toLocaleString()}
                                    </p>
                                    <h3 className="font-bold text-slate-800 truncate w-48">
                                        {item.filename.split('_').slice(2).join('_')}
                                    </h3>
                                </div>
                            </div>

                            <div className={`p-4 rounded-xl border mb-4 ${item.has_glaucoma ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                <div className="flex items-center gap-3">
                                    {item.has_glaucoma ? <AlertTriangle className="text-red-500" size={24} /> : <CheckCircle className="text-green-500" size={24} />}
                                    <div>
                                        <p className={`font-bold ${item.has_glaucoma ? 'text-red-700' : 'text-green-700'}`}>
                                            {item.has_glaucoma ? 'Risque Détecté' : 'Sain'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ✅ BOUTON TÉLÉCHARGEMENT */}
                            <button
                                onClick={() => handleDownload(item)}
                                disabled={item.is_expired} // Optionnel : on empêche le download si l'image n'est plus là ?
                                className={`mt-auto w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border
                        ${item.is_expired
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                    : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                                }`}
                            >
                                {item.is_expired ? (
                                    <>Image expirée</>
                                ) : (
                                    <>
                                        <FileText size={18} />
                                        Télécharger le rapport
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default History;