import React, { useState } from 'react';
import { jsPDF } from "jspdf";
import api from '../utils/api';
import { Upload, Eye, CheckCircle, AlertCircle, Loader2, FileImage, Info, Activity, FileText, RefreshCw } from 'lucide-react';

// ... FONCTIONS UTILITAIRES ET API_URL INCHANGÉES ...
const API_URL = 'http://localhost:8000/uploadfile/';
const getImageData = (url) => {
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

const GlaucomaDetectionApp = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const MAX_SIZE_MB = 5;

  // ... TOUTES VOS FONCTIONS DE GESTION (drag, drop, file, upload, download) RESTENT ICI ...
  // ... Je ne les répète pas pour gagner de la place, mais elles doivent être présentes dans le fichier final ...
  // ... (handleDragEnter, handleDragLeave, handleDragOver, handleDrop, handleFile, handleFileChange, handleFileUpload, handleDownloadReport, handleReset) ...
  
  // (Je réinclus les handlers ici pour que tu puisses copier-coller tout le fichier si besoin)
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  };
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
  const handleFileChange = (event) => { const file = event.target.files[0]; if (file) handleFile(file); };
  const handleFileUpload = async () => {
    if (!selectedFile) { setError("Veuillez choisir une image d'abord."); return; }
    const token = localStorage.getItem('token');
    if (!token) {
      const go = window.confirm("Vous devez être connecté pour lancer l'analyse. Voulez-vous vous connecter maintenant ?");
      if (go) window.location.href = '/login';
      return;
    }
    const formData = new FormData(); formData.append('file', selectedFile);
    try {
      setIsAnalyzing(true); setError(''); setAnalysisResult(null); setUploadStatus('Initialisation du modèle...');
      const response = await api.post(API_URL, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const data = response.data;
      const analysis = data.analysis;
      if (analysis.error) throw new Error(analysis.error);
      const isGlaucoma = analysis.prediction_class === 1;
      const confidencePercent = (analysis.probability * 100).toFixed(1);
      const dynamicRecommendations = isGlaucoma
        ? ["Consulter un ophtalmologue dans les plus brefs délais", "Effectuer un examen complet (fond d'œil, OCT)", "Vérifier la pression intraoculaire"]
        : ["Aucune anomalie détectée pour le moment", "Continuer les visites de contrôle annuelles", "Surveiller l'apparition de troubles visuels"];
      const realResult = {
        confidence: confidencePercent, hasGlaucoma: isGlaucoma,
        message: isGlaucoma ? "Signes de glaucome détectés par l'IA" : "L'analyse ne révèle pas de signes évidents",
        recommendations: dynamicRecommendations, gradcamImage: analysis.gradcam_image
      };
      setAnalysisResult(realResult); setUploadStatus('Terminé');
    } catch (err) {
    console.error(err);
    // Ne pas afficher les détails techniques
    setError("Une erreur s'est produite lors de l'analyse. Vérifiez que le fichier est valide et que vous êtes connecté.");
    setUploadStatus('');
  } finally { setIsAnalyzing(false); }
  };
  const handleDownloadReport = async () => {
    if (!analysisResult) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // En-tête
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Rapport d'Analyse - Glaucoma Detection", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Date : ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: "center" });
    
    // Résultat (SANS emojis)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("Résultat de l'analyse :", 20, 55);
    
    doc.setFontSize(16);
    const resultText = analysisResult.hasGlaucoma 
      ? `RISQUE DÉTECTÉ (${analysisResult.confidence}%)`
      : `AUCUNE ANOMALIE DÉTECTÉE (${analysisResult.confidence}%)`;
    if (analysisResult.hasGlaucoma) {
      doc.setTextColor(231, 76, 60); // Rouge
    } else {
      doc.setTextColor(39, 174, 96); // Vert
    }
    doc.text(resultText, 20, 68);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Message : ${analysisResult.message}`, 20, 80);
    
    // Images analysées
    
    try {
      doc.setFontSize(13);
      doc.text("Images analysées :", 20, 100);
      
      if (previewUrl) {
        const base64Original = await getImageData(previewUrl);
        doc.addImage(base64Original, 'JPEG', 10, 110, 85, 85);  // Augmenté à 85x85
        doc.setFontSize(10);
        doc.text("Image Originale", 52.5, 200, { align: "center" });
      }
      
      if (analysisResult.gradcamImage) {
        doc.addImage(analysisResult.gradcamImage, 'PNG', 105, 110, 85, 85);  // Augmenté à 85x85
        doc.setFontSize(10);
        doc.text("Analyse IA (Grad-CAM)", 147.5, 200, { align: "center" });
      }
    } catch (err) {
      console.error("Erreur images PDF", err);
    }
    
    // Recommandations
    doc.setFontSize(13);
    doc.text("Recommandations :", 20, 205);
    doc.setFontSize(11);
    let yPos = 215;
    analysisResult.recommendations.forEach((rec) => {
      const splitRec = doc.splitTextToSize(`• ${rec}`, 170);
      doc.text(splitRec, 20, yPos);
      yPos += splitRec.length * 6 + 2;
    });
    
    // Disclaimer
    doc.setTextColor(150);
    doc.setFontSize(9);
    const disclaimer = "AVERTISSEMENT : Ce document est généré à titre indicatif. Il ne remplace PAS un diagnostic médical. Consultez un ophtalmologue.";
    const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 40);
    doc.text(splitDisclaimer, 20, 270);
    
    doc.save("Rapport_Glaucome.pdf");
  };
  const handleReset = () => { setSelectedFile(null); setPreviewUrl(''); setUploadStatus(''); setError(''); setAnalysisResult(null); setIsAnalyzing(false); };

  // --- LE JSX REDESIGNÉ COMMENCE ICI ---
  return (
    <div className="max-w-6xl mx-auto fade-in">
      
      {/* Header de la carte principale */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 mb-8">
        {!analysisResult ? (
          <>
            <div className="bg-gradient-to-r from-blue-700 to-indigo-600 p-8 md:p-12 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3 relative z-10">Centre d'Analyse Rétinienne</h1>
                <p className="text-blue-100 text-lg relative z-10 max-w-2xl mx-auto">
                    Utilisez notre IA de pointe pour détecter les signes précoces de glaucome à partir d'images de fond d'œil.
                </p>
            </div>

            <div className="p-8 md:p-12">
                {/* Zone de Drag & Drop Améliorée */}
                <div 
                    className={`
                        relative group border-3 border-dashed rounded-3xl p-12 text-center transition-all duration-300
                        ${isDragging 
                            ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' 
                            : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                        }
                        ${!previewUrl ? 'cursor-pointer' : ''}
                    `}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => !previewUrl && document.getElementById('fileInput').click()}
                >
                    {!previewUrl ? (
                        <div className="flex flex-col items-center">
                            <div className="p-5 bg-blue-100 text-blue-600 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                <Upload size={40} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-2">Glissez-déposez votre image ici</h3>
                            <p className="text-slate-500 mb-6">Supporte JPG, PNG, JPEG (Max {MAX_SIZE_MB} Mo)</p>
                            <label className="cursor-pointer bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                                Parcourir les fichiers
                            </label>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center relative z-10">
                            <div className="relative group/img">
                                <img src={previewUrl} alt="Preview" className="h-64 object-contain rounded-lg shadow-md bg-black/5" />
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                                    className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                    title="Supprimer l'image"
                                >
                                    <RefreshCw size={16} />
                                </button>
                            </div>
                            <p className="mt-4 text-slate-600 font-medium bg-slate-100 px-4 py-1 rounded-full text-sm">
                                {selectedFile?.name} ({Math.round(selectedFile?.size / 1024)} KB)
                            </p>
                        </div>
                    )}
                    <input id="fileInput" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>

                {/* Status et Erreurs */}
                {error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-3 animate-pulse">
                        <AlertCircle className="flex-shrink-0" /> {error}
                    </div>
                )}

                {/* Bouton d'action */}
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleFileUpload}
                        disabled={!selectedFile || isAnalyzing}
                        className={`
                            px-12 py-4 rounded-xl font-bold text-lg shadow-xl transition-all duration-300 flex items-center gap-3
                            ${!selectedFile || isAnalyzing 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-2xl hover:-translate-y-1 hover:from-blue-700 hover:to-indigo-700'
                            }
                        `}
                    >
                        {isAnalyzing ? <><Loader2 className="animate-spin" /> Analyse en cours...</> : <><Activity /> Lancer le diagnostic</>}
                    </button>
                </div>

                {uploadStatus && !error && isAnalyzing && (
                    <div className="mt-4 text-center text-blue-600 font-medium animate-pulse">{uploadStatus}</div>
                )}
            </div>
            
            {/* Guide Info */}
            <div className="bg-blue-50/50 p-6 border-t border-slate-100 flex gap-4 items-start">
                <Info className="text-blue-500 mt-1 flex-shrink-0" />
                <div className="text-sm text-slate-600">
                    <p className="font-semibold text-slate-800 mb-1">Conseils pour de meilleurs résultats :</p>
                    <ul className="list-disc ml-4 space-y-1">
                        <li>Assurez-vous que la rétine est bien visible et centrée.</li>
                        <li>Évitez les images floues ou avec trop de reflets.</li>
                        <li>La résolution doit être suffisante (min 800x800px recommandé).</li>
                    </ul>
                </div>
            </div>
          </>
        ) : (
          /* SECTION RÉSULTATS */
          <div className="bg-slate-50 min-h-[600px] flex flex-col md:flex-row">
            
            {/* Sidebar Résultats (Gauche) */}
            <div className="w-full md:w-1/3 bg-white p-8 border-r border-slate-200 flex flex-col">
                <div className="mb-8 text-center md:text-left">
                    <h2 className="text-sm uppercase tracking-wider text-slate-400 font-bold mb-2">Diagnostic</h2>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-lg ${analysisResult.hasGlaucoma ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {analysisResult.hasGlaucoma ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
                        {analysisResult.hasGlaucoma ? 'Glaucome Détecté' : 'Œil Sain'}
                    </div>
                </div>

                <div className="mb-8">
                    <h2 className="text-sm uppercase tracking-wider text-slate-400 font-bold mb-2">Confiance IA</h2>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-4xl font-bold text-slate-800">{analysisResult.confidence}%</span>
                        <span className="text-slate-500 mb-1">de certitude</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ${analysisResult.hasGlaucoma ? 'bg-red-500' : 'bg-green-500'}`} 
                            style={{ width: `${analysisResult.confidence}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex-grow">
                    <h2 className="text-sm uppercase tracking-wider text-slate-400 font-bold mb-3">Recommandations</h2>
                    <ul className="space-y-3">
                        {analysisResult.recommendations.map((rec, i) => (
                            <li key={i} className="flex gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                                {rec}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col gap-3">
                    <button onClick={handleDownloadReport} className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors">
                        <FileText size={18} /> Télécharger le rapport
                    </button>
                    <button onClick={handleReset} className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        <RefreshCw size={18} /> Nouvelle analyse
                    </button>
                </div>
            </div>

            {/* Visualisation Images (Droite) */}
            <div className="w-full md:w-2/3 p-8 flex flex-col items-center justify-center bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                        <p className="text-center font-medium text-slate-500 mb-3">Image Originale</p>
                        <div className="aspect-square rounded-xl overflow-hidden bg-black/5 relative">
                             <img src={previewUrl} className="w-full h-full object-contain" alt="Original" />
                        </div>
                    </div>
                    {analysisResult.gradcamImage && (
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                            <p className="text-center font-medium text-purple-600 mb-3 flex items-center justify-center gap-2">
                                <Activity size={16}/> Analyse Grad-CAM
                            </p>
                            <div className="aspect-square rounded-xl overflow-hidden bg-black/5 relative">
                                <img src={analysisResult.gradcamImage} className="w-full h-full object-contain" alt="IA Analysis" />
                            </div>
                            <p className="text-xs text-center text-slate-400 mt-2">Les zones chaudes indiquent les focus de l'IA</p>
                        </div>
                    )}
                </div>
                
                <div className="mt-8 text-center max-w-2xl">
                    <p className="text-slate-600 italic">
                        "{analysisResult.message}"
                    </p>
                </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer minimaliste */}
      <div className="text-center text-slate-400 text-xs pb-8">
        IA Glaucoma Detection v1.0 • Ne remplace pas un avis médical.
      </div>
    </div>
  );
};

export default GlaucomaDetectionApp;