import React, { useState, useEffect } from 'react'; // ✅ Ajout useEffect
import axios from 'axios'; // ✅ Ajout axios
import api from '../utils/api';
import { Upload, Info, Activity, FileText, RefreshCw, AlertTriangle, CheckCircle, Loader2, Users } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Fundus3DViewer from './Fundus3DViewer';
import DoctorChat from './DoctorChat';
import { useNavigate } from 'react-router-dom';

const API_URL_BASE = 'http://localhost:8000'; // ✅ Définition de la base URL
const API_URL = `${API_URL_BASE}/uploadfile/`;

// Fonction utilitaire pour le PDF
/*const getImageData = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = reject;
    img.src = url;
  });
};
*/

const GlaucomaDetectionApp = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const location = useLocation();
  // États pour les patients
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const navigate = useNavigate();
  // 1. Charger les patients au démarrage
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
      console.error("Erreur chargement patients", e); // ✅ Utilisation de 'e'
    }
  };

  useEffect(() => {
    if (location.state && location.state.replayAnalysis) {
      // On charge les données envoyées par l'historique
      const { imageUrl, analysisData } = location.state;

      setPreviewUrl(imageUrl);
      setAnalysisResult(analysisData);

      // On "nettoie" l'état pour que si on rafraichit la page, on ne recharge pas ça en boucle
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  const MAX_SIZE_MB = 5;

  // --- LOGIQUE DE GESTION ---
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };

  const handleFile = (file) => {
    setError(''); setAnalysisResult(null);
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`L'image est trop lourde. Maximum autorisé: ${MAX_SIZE_MB} Mo.`);
      setSelectedFile(null); setPreviewUrl(''); return;
    }
    if (!file.type.match('image.*')) {
      setError('Veuillez sélectionner un fichier image valide.'); return;
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
    if (!selectedFile) { setError("Veuillez choisir une image d'abord."); return; }

    // ❌ ERREUR AVANT : if (!selectedPatientId) ...
    // ✅ CORRECTION : On vérifie l'objet selectedPatient
    if (!selectedPatient) { setError("Veuillez sélectionner un patient pour ce dossier."); return; }

    const token = localStorage.getItem('token');
    if (!token) {
      const go = window.confirm("Vous devez être connecté pour lancer l'analyse. Voulez-vous vous connecter maintenant ?");
      if (go) window.location.href = '/login';
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    // ❌ ERREUR AVANT : formData.append('patient_id', selectedPatientId);
    // ✅ CORRECTION : On envoie l'ID contenu dans l'objet patient
    formData.append('patient_id', selectedPatient.id);

    try {
      setIsAnalyzing(true); setError(''); setAnalysisResult(null); setUploadStatus('Analyse IA en cours...');
      const response = await api.post(API_URL, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const data = response.data;
      const analysis = data.analysis;
      if (analysis.error) throw new Error(analysis.error);

      const isGlaucoma = analysis.prediction_class === 1;
      const confidencePercent = (analysis.probability * 100).toFixed(1);

      const dynamicRecommendations = isGlaucoma
          ? ["Examen OCT requis", "Contrôle pression intraoculaire"]
          : ["Fond d'œil normal", "Contrôle annuel recommandé", "Surveillance standard"];

      const realResult = {
        confidence: confidencePercent,
        hasGlaucoma: isGlaucoma,
        message: isGlaucoma ? "Signes de glaucome détectés" : "Rétine saine",
        recommendations: dynamicRecommendations,
        gradcamImage: analysis.gradcam_image,
        prediction_class: analysis.prediction_class,
        probability: analysis.probability
      };
      setAnalysisResult(realResult); setUploadStatus('Terminé');
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'analyse.");
      setUploadStatus('');
    } finally { setIsAnalyzing(false); }
  };

  const handleOpenReportEditor = () => {
    if (!analysisResult) return;

    // On récupère le nom du médecin depuis le dashboard (ou une autre source, sinon "Médecin")
    // Pour faire simple, on passe les données disponibles
    navigate('/report-editor', {
      state: {
        patientName: selectedPatient?.full_name,
        patientAge: selectedPatient?.age,
        analysisData: analysisResult, // Indispensable pour l'éditeur
        imageUrl: previewUrl,         // Indispensable pour l'image
        patientGender: selectedPatient?.gender,
        patientId: selectedPatient?.id, // Tu devras peut-être récupérer l'info complète du patient ici si tu veux son nom
        // Astuce : Quand tu sélectionnes le patient dans le <select>, stocke l'objet patient entier, pas juste l'ID
      }
    });
  };

  const handleReset = () => { setSelectedFile(null); setPreviewUrl(''); setUploadStatus(''); setError(''); setAnalysisResult(null); setIsAnalyzing(false); };

  return (
      <div className="max-w-7xl mx-auto fade-in pb-12">

        {/* HEADER DE L'APP */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 mb-6">

          {/* --- PARTIE 1 : UPLOAD (Visible tant qu'il n'y a pas de résultat) --- */}
          {!analysisResult ? (
              <>
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-10 text-center text-white relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                  <h1 className="text-3xl font-bold mb-2 relative z-10">Centre d'Analyse Rétinienne</h1>
                  <p className="text-slate-300 relative z-10">Interface Médecin • Deep Learning • Assistance 3D</p>
                </div>

                <div className="p-10">

                  {/* ✅ SÉLECTION DU PATIENT (C'était manquant dans ton code, d'où les erreurs) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 max-w-xl mx-auto">
                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <Users size={16} className="text-blue-600"/> 1. Sélectionner le Patient
                    </h3>
                    <select
                        // ✅ AJOUT : Pour que le select reflète l'état React
                        value={selectedPatient ? selectedPatient.id : ""}
                        onChange={(e) => {
                          const p = patients.find(pat => pat.id === parseInt(e.target.value));
                          setSelectedPatient(p);
                        }}
                    >
                      <option value="">-- Choisir un dossier patient --</option>
                      {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name} ({p.age} ans)</option>
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
                          <h3 className="text-lg font-semibold text-slate-700">Déposez l'image du fond d'œil</h3>
                          <p className="text-slate-400 text-sm mt-1">ou cliquez pour parcourir (JPG, PNG)</p>
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
                      {isAnalyzing ? <><Loader2 className="animate-spin" size={20}/> Traitement...</> : <><Activity size={20}/> Lancer Diagnostic</>}
                    </button>
                  </div>

                  {/* ✅ Affichage du status (Corrige l'erreur uploadStatus unused) */}
                  {uploadStatus && !error && (
                      <div className="mt-4 text-center text-blue-600 font-medium animate-pulse">{uploadStatus}</div>
                  )}
                  {error && <div className="mt-4 text-center text-red-500 text-sm font-medium">{error}</div>}
                </div>

                <div className="bg-blue-50 p-4 border-t border-blue-100 flex justify-center items-center gap-2 text-blue-700 text-sm">
                  <Info size={16} /> Mode sécurisé pour professionnels de santé
                </div>
              </>
          ) : (

              /* --- PARTIE 2 : INTERFACE IA & RÉSULTATS (Split Screen Pro) --- */
              <div className="bg-slate-50 min-h-screen flex flex-col">

                {/* Header Resultats */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="text-blue-600"/>
                    Résultat de l'analyse
                  </h2>
                  <button onClick={handleReset} className="text-sm font-medium text-slate-500 hover:text-red-500 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
                    <RefreshCw size={16}/> Nouvelle image
                  </button>
                </div>

                {/* CONTAINER PRINCIPAL : Hauteur fixée pour permettre le scroll indépendant */}
                {/* On calcule la hauteur totale moins le header (environ 140px navbar + header) */}
                <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] overflow-hidden">

                  {/* --- COLONNE GAUCHE : VISUEL & DONNÉES (Scrollable indépendamment) --- */}
                  <div className="w-full lg:w-1/2 h-full overflow-y-auto p-6 border-r border-slate-200 bg-slate-50 scrollbar-thin scrollbar-thumb-slate-300">
                    <div className="flex flex-col gap-6">

                      {/* Visualiseur 3D (Taille fixe pour éviter qu'il ne grandisse trop) */}
                      <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 relative shrink-0">
                        <div className="absolute top-4 left-4 z-10 bg-slate-800/80 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur">
                          Topographie Rétinienne 3D
                        </div>
                        {/* On force une hauteur fixe pour le viewer pour éviter qu'il disparaisse ou s'étire */}
                        <div className="h-[400px] w-full rounded-xl overflow-hidden bg-slate-900">
                          <Fundus3DViewer imageUrl={previewUrl} />
                        </div>
                      </div>

                      {/* Carte de Résultat Rapide */}
                      <div className={`p-6 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 ${analysisResult.hasGlaucoma ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                        <div className="flex items-center gap-4">
                          {analysisResult.hasGlaucoma
                              ? <div className="p-3 bg-red-100 text-red-600 rounded-full shadow-sm"><AlertTriangle size={32}/></div>
                              : <div className="p-3 bg-green-100 text-green-600 rounded-full shadow-sm"><CheckCircle size={32}/></div>
                          }
                          <div>
                            <h3 className={`text-xl font-bold ${analysisResult.hasGlaucoma ? 'text-red-700' : 'text-green-700'}`}>
                              {analysisResult.hasGlaucoma ? 'Glaucome Détecté' : 'Rétine Saine'}
                            </h3>
                            <p className="text-slate-600 text-sm">Confiance IA : <strong>{analysisResult.confidence}%</strong></p>
                          </div>
                        </div>
                        <button
                            onClick={handleOpenReportEditor}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-3 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                            title="Télécharger Rapport PDF"
                        >
                          <FileText size={24} />
                        </button>
                      </div>

                      {/* Tu peux ajouter d'autres infos ici (ex: Recommandations statiques) */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">Recommandations Standards</h3>
                        <ul className="space-y-2">
                          {analysisResult.recommendations.map((rec, i) => (
                              <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                <span className="text-blue-500 mt-1">•</span> {rec}
                              </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* --- COLONNE DROITE : ASSISTANT MÉDICAL (Chat) --- */}
                  {/* Prend tout l'espace restant, pas de scroll sur le container principal, le scroll est DANS DoctorChat */}
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