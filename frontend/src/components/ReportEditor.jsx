import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, ArrowLeft, Download, QrCode, Lock } from 'lucide-react'; // ✅ Ajout Lock pour visuel
import { generateGlaucomaReport } from '../utils/pdfGenerator';

export default function ReportEditor() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { analysisData, imageUrl, patientName, patientId, doctorName, patientAge, patientGender } = location.state || {};

    // État du formulaire
    const [report, setReport] = useState({
        clinicName: t('report.clinic_default'),
        doctorName: doctorName || t('report.doctor_default'),
        patientName: patientName || t('history.unknown_patient'),
        patientId: patientId || "N/A",
        patientAge: patientAge || "",
        patientGender: patientGender || "",
        eyeSide: t('report.right_eye'),
        imageQuality: t('report.quality_good'),
        aiResult: analysisData?.hasGlaucoma ? t('upload.glaucoma_detected') : t('upload.healthy_retina'),
        aiConfidence: analysisData?.confidence || 0,
        observations: t('report.obs_default'),
        diagnosis: analysisData?.hasGlaucoma ? t('report.diag_suspect') : t('report.diag_normal'),
        recommendations: analysisData?.recommendations ? analysisData.recommendations.join('\n') : t('report.reco_default')
    });

    useEffect(() => {
        if (!analysisData) {
            navigate('/dashboard');
        }
    }, [analysisData, navigate]);

    const handleChange = (e) => {
        setReport({ ...report, [e.target.name]: e.target.value });
    };

    const handleBack = () => {
        navigate('/app', {
            state: {
                replayAnalysis: true,
                imageUrl: imageUrl,
                analysisData: analysisData
            }
        });
    };

    const handleGeneratePDF = async () => {
        const formattedData = {
            ...report,
            recommendations: report.recommendations.split('\n').filter(r => r.trim() !== '')
        };
        await generateGlaucomaReport(formattedData, imageUrl, t);
    };

    if (!analysisData) return null;

    return (
        <div className="min-h-screen bg-slate-100 p-6 fade-in">
            <div className="max-w-5xl mx-auto">

                {/* Barre d'outils */}
                <div className="flex justify-between items-center mb-6">
                    <button onClick={handleBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium">
                        <ArrowLeft size={20}/> {t('report.back')}
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={handleGeneratePDF}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                        >
                            <Download size={20}/> {t('report.download')}
                        </button>
                    </div>
                </div>

                {/* RAPPORT VISUEL */}
                <div className="bg-white rounded-none shadow-xl min-h-[1100px] w-full p-12 md:p-16 border border-slate-200 mx-auto grid grid-cols-1 gap-8 relative">

                    {/* Header Document */}
                    <div className="flex justify-between border-b border-slate-100 pb-8">
                        <div className="w-1/2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t('report.clinic_label')}</label>
                            <input name="clinicName" value={report.clinicName} onChange={handleChange} className="text-2xl font-bold text-slate-800 w-full border-none focus:ring-0 p-0 placeholder:text-slate-300" placeholder={t('report.clinic_placeholder')} />
                            <div className="mt-2 flex items-center gap-2 text-slate-600">
                                <span>Dr.</span>
                                <input name="doctorName" value={report.doctorName} onChange={handleChange} className="font-medium bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none w-48" />
                            </div>
                        </div>
                        <div className="text-right">
                            <h1 className="text-3xl font-black text-slate-900 mb-2">{t('report.doc_title')}</h1>
                            <p className="text-slate-500">{t('report.date_label')} {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* 🔒 Info Patient (LECTURE SEULE) */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 relative overflow-hidden">
                        {/* Petit indicateur visuel de verrouillage */}
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Lock size={64} className="text-slate-400" />
                        </div>

                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                            <FileText size={16}/> {t('report.patient_section')}
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {/* NOM - ReadOnly */}
                            <div>
                                <label className="text-xs text-slate-500 font-semibold block mb-1">{t('dashboard.table_name')}</label>
                                <input
                                    name="patientName"
                                    value={report.patientName}
                                    readOnly
                                    className="w-full bg-slate-200/50 border-none rounded px-2 py-1 text-slate-600 font-medium cursor-not-allowed focus:ring-0"
                                />
                            </div>

                            {/* AGE - ReadOnly */}
                            <div>
                                <label className="text-xs text-slate-500 font-semibold block mb-1">{t('dashboard.table_age')}</label>
                                <input
                                    name="patientAge"
                                    value={report.patientAge}
                                    readOnly
                                    className="w-full bg-slate-200/50 border-none rounded px-2 py-1 text-slate-600 cursor-not-allowed focus:ring-0"
                                />
                            </div>

                            {/* GENRE - ReadOnly (Remplacement du Select par un Input) */}
                            <div>
                                <label className="text-xs text-slate-500 font-semibold block mb-1">{t('dashboard.table_gender')}</label>
                                <input
                                    value={report.patientGender === 'M' ? t('dashboard.gender_m') : t('dashboard.gender_f')}
                                    readOnly
                                    className="w-full bg-slate-200/50 border-none rounded px-2 py-1 text-slate-600 cursor-not-allowed focus:ring-0"
                                />
                            </div>

                            {/* ID - ReadOnly (Déjà statique) */}
                            <div>
                                <label className="text-xs text-slate-500 font-semibold block mb-1">{t('report.folder_id')}</label>
                                <div className="text-slate-600 font-mono py-1 bg-slate-200/50 px-2 rounded w-fit">#{report.patientId}</div>
                            </div>
                        </div>
                    </div>

                    {/* Zone Analyse */}
                    <div className="flex gap-8 items-start">
                        <div className="w-48 h-48 bg-black rounded-lg overflow-hidden shrink-0 border border-slate-200 shadow-sm relative group">
                            <img src={imageUrl} alt="Fundus" className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 w-full bg-black/60 text-white text-[10px] p-1 text-center">{t('report.image_original')}</div>
                        </div>
                        <div className="flex-1 space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase border-b border-slate-100 pb-2">{t('report.tech_section')}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t('report.eye_examined')}</label>
                                    <select name="eyeSide" value={report.eyeSide} onChange={handleChange} className="w-full p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                                        <option value={t('report.right_eye')}>{t('report.right_eye')}</option><option value={t('report.left_eye')}>{t('report.left_eye')}</option><option value={t('report.both_eyes')}>{t('report.both_eyes')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t('report.image_quality')}</label>
                                    <select name="imageQuality" value={report.imageQuality} onChange={handleChange} className="w-full p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                                        <option value={t('report.quality_excellent')}>{t('report.quality_excellent')}</option><option value={t('report.quality_good')}>{t('report.quality_good')}</option><option value={t('report.quality_average')}>{t('report.quality_average')}</option><option value={t('report.quality_poor')}>{t('report.quality_poor')}</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <span className="text-sm text-blue-800 font-medium">{t('report.ai_analysis')}</span>
                                        <span className="text-sm font-bold text-blue-900">{report.aiResult} ({report.aiConfidence}%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Text Areas */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase mb-2 border-l-4 border-blue-600 pl-3">{t('report.observations')}</h3>
                        <textarea name="observations" value={report.observations} onChange={handleChange} className="w-full h-40 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 leading-relaxed resize-none" placeholder={t('report.obs_placeholder')}></textarea>
                        <p className="text-xs text-slate-400 mt-2 text-right">{t('report.obs_help')}</p>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase mb-2 border-l-4 border-slate-800 pl-3">{t('report.diagnosis')}</h3>
                        <input name="diagnosis" value={report.diagnosis} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white transition-colors outline-none"/>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase mb-2 border-l-4 border-green-500 pl-3">{t('report.reco_label')}</h3>
                        <textarea name="recommendations" value={report.recommendations} onChange={handleChange} className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-slate-700 leading-relaxed font-medium"></textarea>
                    </div>

                    {/* Footer QR Code Preview */}
                    <div className="mt-8 pt-8 border-t border-slate-200 flex justify-end items-center opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                        <div className="text-right mr-4">
                            <p className="text-xs font-bold text-slate-800">Signature Numérique</p>
                            <p className="text-[10px] text-slate-500">Un QR Code sécurisé sera généré</p>
                        </div>
                        <QrCode size={48} className="text-slate-800"/>
                    </div>

                </div>
            </div>
        </div>
    );
}