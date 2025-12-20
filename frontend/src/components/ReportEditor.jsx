import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios'; // Pour récupérer le nom du docteur si besoin
import { FileText, Save, ArrowLeft, Download, Printer, Eye } from 'lucide-react';
import { generateGlaucomaReport } from '../utils/pdfGenerator';

const API_URL = 'http://localhost:8000';

export default function ReportEditor() {
    const location = useLocation();
    const navigate = useNavigate();
    const { analysisData, imageUrl, patientName, patientId, doctorName, patientAge, patientGender } = location.state || {};

    // État du formulaire (Rapport)
    const [report, setReport] = useState({
        clinicName: "Cabinet d'Ophtalmologie",
        doctorName: doctorName || "Médecin",
        patientName: patientName || "Patient Inconnu",
        patientId: patientId || "N/A",
        patientAge: patientAge || "",
        patientGender: patientGender || "",
        eyeSide: "OD (Droit)", // Valeur par défaut
        imageQuality: "Bonne",
        aiResult: analysisData?.hasGlaucoma ? "Risque de Glaucome Détecté" : "Rétine Saine",
        aiConfidence: analysisData?.confidence || 0,
        observations: "L'examen du fond d'œil révèle...\n\n(Rédigez ici vos observations sur la papille, le rapport C/D, la présence d'hémorragies, etc.)",
        diagnosis: analysisData?.hasGlaucoma ? "Suspicion de neuropathie glaucomateuse." : "Examen du fond d'œil dans les limites de la normale.",
        recommendations: analysisData?.recommendations ? analysisData.recommendations.join('\n') : "Contrôle annuel."
    });

    // Si pas de données, on redirige
    useEffect(() => {
        if (!analysisData) {
            navigate('/dashboard');
        }
    }, [analysisData, navigate]);

    const handleChange = (e) => {
        setReport({ ...report, [e.target.name]: e.target.value });
    };

    const handleGeneratePDF = async () => {
        // On transforme le texte des recommandations en tableau pour le PDF
        const formattedData = {
            ...report,
            recommendations: report.recommendations.split('\n').filter(r => r.trim() !== '')
        };
        await generateGlaucomaReport(formattedData, imageUrl);
    };

    if (!analysisData) return null;

    return (
        <div className="min-h-screen bg-slate-100 p-6 fade-in">
            <div className="max-w-5xl mx-auto">

                {/* Barre d'outils supérieure */}
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium">
                        <ArrowLeft size={20}/> Retour
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={handleGeneratePDF}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                        >
                            <Download size={20}/> Télécharger le PDF
                        </button>
                    </div>
                </div>

                {/* L'INTERFACE PAPIER (WYSIWYG) */}
                <div className="bg-white rounded-none shadow-xl min-h-[1100px] w-full p-12 md:p-16 border border-slate-200 mx-auto grid grid-cols-1 gap-8 relative">

                    {/* Header Document */}
                    <div className="flex justify-between border-b border-slate-100 pb-8">
                        <div className="w-1/2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nom de la Clinique / Cabinet</label>
                            <input
                                name="clinicName"
                                value={report.clinicName}
                                onChange={handleChange}
                                className="text-2xl font-bold text-slate-800 w-full border-none focus:ring-0 p-0 placeholder:text-slate-300"
                                placeholder="Nom de votre clinique"
                            />
                            <div className="mt-2 flex items-center gap-2 text-slate-600">
                                <span>Dr.</span>
                                <input
                                    name="doctorName"
                                    value={report.doctorName}
                                    onChange={handleChange}
                                    className="font-medium bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none w-48"
                                />
                            </div>
                        </div>
                        <div className="text-right">
                            <h1 className="text-3xl font-black text-slate-900 mb-2">RAPPORT</h1>
                            <p className="text-slate-500">Date : {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Info Patient (Grille) */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                            <FileText size={16}/> Information Patient
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <label className="text-xs text-slate-500 font-semibold block mb-1">Nom Complet</label>
                                <input name="patientName" value={report.patientName} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 font-medium"/>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-semibold block mb-1">Âge</label>
                                <input name="patientAge" value={report.patientAge} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"/>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-semibold block mb-1">Sexe</label>
                                <select name="patientGender" value={report.patientGender} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800">
                                    <option value="M">Homme</option>
                                    <option value="F">Femme</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-semibold block mb-1">ID Dossier</label>
                                <div className="text-slate-800 font-mono py-1">#{report.patientId}</div>
                            </div>
                        </div>
                    </div>

                    {/* Zone Analyse Image */}
                    <div className="flex gap-8 items-start">
                        <div className="w-48 h-48 bg-black rounded-lg overflow-hidden shrink-0 border border-slate-200 shadow-sm relative group">
                            <img src={imageUrl} alt="Fundus" className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 w-full bg-black/60 text-white text-[10px] p-1 text-center">
                                Image Originale
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase border-b border-slate-100 pb-2">Données Techniques</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Œil Examiné</label>
                                    <select name="eyeSide" value={report.eyeSide} onChange={handleChange} className="w-full p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                                        <option value="OD (Droit)">OD (Droit)</option>
                                        <option value="OS (Gauche)">OS (Gauche)</option>
                                        <option value="OU (Binoculaire)">OU (Binoculaire)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Qualité Image</label>
                                    <select name="imageQuality" value={report.imageQuality} onChange={handleChange} className="w-full p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                                        <option value="Excellente">Excellente</option>
                                        <option value="Bonne">Bonne</option>
                                        <option value="Moyenne">Moyenne</option>
                                        <option value="Médiocre">Médiocre</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <span className="text-sm text-blue-800 font-medium">Analyse IA MobileNetV3</span>
                                        <span className="text-sm font-bold text-blue-900">{report.aiResult} ({report.aiConfidence}%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* OBSERVATIONS (TextArea) */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase mb-2 border-l-4 border-blue-600 pl-3">Observations Cliniques</h3>
                        <textarea
                            name="observations"
                            value={report.observations}
                            onChange={handleChange}
                            className="w-full h-40 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 leading-relaxed resize-none"
                            placeholder="Décrivez l'aspect de la papille, les vaisseaux..."
                        ></textarea>
                        <p className="text-xs text-slate-400 mt-2 text-right">Utilisez l'assistant IA pour générer ce texte si besoin.</p>
                    </div>

                    {/* CONCLUSION */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase mb-2 border-l-4 border-slate-800 pl-3">Diagnostic & Conclusion</h3>
                        <input
                            name="diagnosis"
                            value={report.diagnosis}
                            onChange={handleChange}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white transition-colors outline-none"
                        />
                    </div>

                    {/* RECOMMANDATIONS */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase mb-2 border-l-4 border-green-500 pl-3">Conduite à tenir (1 par ligne)</h3>
                        <textarea
                            name="recommendations"
                            value={report.recommendations}
                            onChange={handleChange}
                            className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-slate-700 leading-relaxed font-medium"
                        ></textarea>
                    </div>

                    {/* SIGNATURE */}
                    <div className="mt-8 flex justify-end">
                        <div className="w-64 border-t border-slate-800 pt-2 text-center">
                            <p className="font-bold text-slate-800 text-sm">Dr. {report.doctorName}</p>
                            <p className="text-xs text-slate-400">Signature</p>
                            <div className="h-16"></div> {/* Espace pour signature manuscrite après impression */}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}