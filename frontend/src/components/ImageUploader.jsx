import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../utils/api';
import { useTranslation } from 'react-i18next';
import { Upload, Info, Activity, FileText, RefreshCw, AlertTriangle, CheckCircle, Loader2, Users, Eye, Maximize } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

// Imports des Visualiseurs
import Fundus3DViewer from './Fundus3DViewer';
// Assurez-vous que ce composant existe ou retirez l'import s'il n'est pas utilisé
// import Fundus3DTrue from './Fundus3DTrue'; 
import DoctorChat from './DoctorChat';
import BeforeAfterSlider from './BeforeAfterSlider';

const API_URL_BASE = 'http://localhost:8000';
const API_URL = `${API_URL_BASE}/uploadfile/`;

const GlaucomaDetectionApp = () => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const location = useLocation();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_URL_BASE}/patients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(res.data);
    } catch (e) {
      console.error("Erreur chargement patients", e);
    }
  };

  useEffect(() => {
    if (location.state && location.state.replayAnalysis) {
      const { imageUrl, analysisData } = location.state;
      setPreviewUrl(imageUrl);
      setAnalysisResult(analysisData);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const MAX_SIZE_MB = 5;

  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };

  const handleFile = (file) => {
    setError(''); setAnalysisResult(null);
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(t('upload.error_size', { max: MAX_SIZE_MB }));
      setSelectedFile(null); setPreviewUrl(''); return;
    }
    if (!file.type.match('image.*')) {
      setError(t('upload.error_type'));
      return;
    }
    setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  };

  const handleFileChange = (event) => { const file = event.target.files[0]; if (file) handleFile(file); };

  const handleFileUpload = async () => {
    if (!selectedFile) { setError(t('upload.error_file')); return; }
    if (!selectedPatient) { setError(t('upload.error_patient_select')); return; }

    const token = localStorage.getItem('token');
    if (!token) {
      const go = window.confirm(t('upload.login_confirm'));
      if (go) window.location.href = '/login';
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('patient_id', selectedPatient.id);

    try {
      setIsAnalyzing(true); setError(''); setAnalysisResult(null);
      setUploadStatus(t('upload.status_analyzing'));

      const response = await api.post(API_URL, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const data = response.data;
      const analysis = data.analysis;
      if (analysis.error) throw new Error(analysis.error);

      const isGlaucoma = analysis.prediction_class === 1;
      const confidencePercent = (analysis.probability * 100).toFixed(1);

      const dynamicRecommendations = isGlaucoma
        ? [t('history.reco_oct'), t('upload.reco_pressure')]
        : [t('upload.reco_normal'), t('history.reco_annual'), t('upload.reco_standard')];

      // --- CORRECTION ICI ---
      // On vérifie si l'URL existe (nouveau backend), sinon on prend l'image brute (ancien backend/fallback)
      const gradcamSource = analysis.gradcam_url || analysis.gradcam_image;

      const realResult = {
        confidence: confidencePercent,
        hasGlaucoma: isGlaucoma,
        message: isGlaucoma ? t('upload.msg_glaucoma') : t('upload.msg_healthy'),
        recommendations: dynamicRecommendations,
        gradcamImage: gradcamSource, // ✅ Utilisation de la source corrigée
        prediction_class: analysis.prediction_class,
        probability: analysis.probability
      };

      setAnalysisResult(realResult);
      setUploadStatus(t('upload.status_done'));
    } catch (err) {
      console.error(err);
      setError(t('upload.error_generic'));
      setUploadStatus('');
    } finally { setIsAnalyzing(false); }
  };

  const handleOpenReportEditor = () => {
    if (!analysisResult) return;
    navigate('/report-editor', {
      state: {
        patientName: selectedPatient?.full_name,
        patientAge: selectedPatient?.age,
        analysisData: analysisResult,
        imageUrl: previewUrl,
        gradcamImage: analysisResult?.gradcamImage,
        patientGender: selectedPatient?.gender,
        patientId: selectedPatient?.id,
      }
    });
  };

  const handleReset = () => { setSelectedFile(null); setPreviewUrl(''); setUploadStatus(''); setError(''); setAnalysisResult(null); setIsAnalyzing(false); };

  return (
    <div className="max-w-7xl mx-auto fade-in pb-12">

      {/* HEADER DE L'APP */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 mb-6">

        {/* --- PARTIE 1 : UPLOAD --- */}
        {!analysisResult ? (
          <>
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-10 text-center text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              <h1 className="text-3xl font-bold mb-2 relative z-10">{t('upload.title')}</h1>
              <p className="text-slate-300 relative z-10">{t('upload.subtitle')}</p>
            </div>

            <div className="p-10">

              {/* SÉLECTION DU PATIENT */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 max-w-xl mx-auto">
                <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Users size={16} className="text-blue-600" /> {t('upload.select_patient')}
                </h3>
                <select
                  value={selectedPatient ? selectedPatient.id : ""}
                  onChange={(e) => {
                    const p = patients.find(pat => pat.id === parseInt(e.target.value));
                    setSelectedPatient(p);
                  }}
                  className="w-full p-2 border rounded"
                >
                  <option value="">{t('upload.choose_placeholder')}</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.age} {t('common.years')})</option>
                  ))}
                </select>
              </div>

              {/* Zone de Drop */}
              <div
                className={`
                        relative group border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-300
                        ${isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}
                        ${!previewUrl ? 'cursor-pointer' : ''}
                      `}
                onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
                onClick={() => !previewUrl && document.getElementById('fileInput').click()}
              >
                {!previewUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-slate-100 text-slate-600 rounded-full mb-4 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      <Upload size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700">{t('upload.drop_title')}</h3>
                    <p className="text-slate-400 text-sm mt-1">{t('upload.drop_subtitle')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center relative z-10">
                    <img src={previewUrl} alt="Preview" className="h-48 object-contain rounded-lg shadow-sm border border-slate-200" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReset(); }}
                      className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow hover:bg-red-600"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                )}
                <input id="fileInput" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>

              {/* Bouton Action */}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleFileUpload}
                  disabled={!selectedFile || isAnalyzing}
                  className={`
                            px-8 py-3 rounded-full font-bold shadow-lg transition-all flex items-center gap-2
                            ${!selectedFile || isAnalyzing
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                    }
                        `}
                >
                  {isAnalyzing ? <><Loader2 className="animate-spin" size={20} /> {t('upload.btn_processing')}</> : <><Activity size={20} /> {t('upload.btn_analyze')}</>}
                </button>
              </div>

              {/* Status */}
              {uploadStatus && !error && (
                <div className="mt-4 text-center text-blue-600 font-medium animate-pulse">{uploadStatus}</div>
              )}
              {error && <div className="mt-4 text-center text-red-500 text-sm font-medium">{error}</div>}
            </div>

            <div className="bg-blue-50 p-4 border-t border-blue-100 flex justify-center items-center gap-2 text-blue-700 text-sm">
              <Info size={16} /> {t('upload.secure_mode')}
            </div>
          </>
        ) : (

          /* --- PARTIE 2 : RÉSULTATS --- */
          <div className="bg-slate-50 min-h-screen flex flex-col">

            {/* Header Resultats */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Activity className="text-blue-600" />
                {t('upload.result_title')}
              </h2>
              <button onClick={handleReset} className="text-sm font-medium text-slate-500 hover:text-red-500 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
                <RefreshCw size={16} /> {t('upload.new_image')}
              </button>
            </div>

            <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] overflow-hidden">

              {/* --- COLONNE GAUCHE (Résultats, Images, 3D, Heatmap) --- */}
              <div className="w-full lg:w-1/2 h-full overflow-y-auto p-6 border-r border-slate-200 bg-slate-50 scrollbar-thin scrollbar-thumb-slate-300">
                <div className="flex flex-col gap-6">

                  {/* 1. Carte de Résultat */}
                  <div className={`p-6 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 ${analysisResult.hasGlaucoma ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                    <div className="flex items-center gap-4">
                      {analysisResult.hasGlaucoma
                        ? <div className="p-3 bg-red-100 text-red-600 rounded-full shadow-sm"><AlertTriangle size={32} /></div>
                        : <div className="p-3 bg-green-100 text-green-600 rounded-full shadow-sm"><CheckCircle size={32} /></div>
                      }
                      <div>
                        <h3 className={`text-xl font-bold ${analysisResult.hasGlaucoma ? 'text-red-700' : 'text-green-700'}`}>
                          {analysisResult.hasGlaucoma ? t('upload.glaucoma_detected') : t('upload.healthy_retina')}
                        </h3>
                        <p className="text-slate-600 text-sm">{t('upload.confidence')} : <strong>{analysisResult.confidence}%</strong></p>
                      </div>
                    </div>
                    <button
                      onClick={handleOpenReportEditor}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-3 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                      title={t('upload.download_tooltip')}
                    >
                      <FileText size={24} />
                    </button>
                  </div>

                  {/* 2. Recommandations */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">{t('upload.recommendations')}</h3>
                    <ul className="space-y-2">
                      {(analysisResult.hasGlaucoma
                        ? [t('history.reco_oct'), t('upload.reco_pressure')]
                        : [t('upload.reco_normal'), t('history.reco_annual'), t('upload.reco_standard')]
                      ).map((rec, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span> {rec}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* --- 3. Visualiseurs 3D --- */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                      <p className="text-xs font-bold text-slate-400 mb-2 px-2">SIMULATION 2.5D</p>
                      <div className="h-64 rounded-xl overflow-hidden bg-slate-900 relative">
                        <Fundus3DViewer imageUrl={previewUrl} />
                      </div>
                    </div>
                  </div>

                  {/* --- 4. Heatmap / XAI --- */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <Eye className="text-purple-600" /> Analyse Visuelle (Comparaison AI)
                      </h3>
                    </div>

                    {analysisResult.gradcamImage ? (
                      <div className="w-full h-96 relative">
                        <BeforeAfterSlider
                          beforeImage={previewUrl}
                          afterImage={analysisResult.gradcamImage}
                        />
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center bg-slate-50 border border-dashed rounded-xl text-slate-400">
                        Heatmap non disponible
                      </div>
                    )}

                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={handleOpenReportEditor}
                        className="flex-1 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-bold rounded-lg transition-colors border border-purple-200"
                      >
                        Rapport PDF (+Heatmap)
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* --- COLONNE DROITE : CHAT --- */}
              <div className="w-full lg:w-1/2 h-full bg-white flex flex-col">
                <DoctorChat
                  analysisResult={analysisResult}
                  imageUrl={previewUrl}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlaucomaDetectionApp;