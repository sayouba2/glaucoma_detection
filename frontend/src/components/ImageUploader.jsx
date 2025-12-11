import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Eye, CheckCircle, AlertCircle, Loader2, FileImage, Info } from 'lucide-react';

const API_URL = 'http://localhost:8000/uploadfile/';

const GlaucomaDetectionApp = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const MAX_SIZE_MB = 5;

  // Gestion du drag and drop
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file) => {
    setError('');
    setAnalysisResult(null);
    
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`L'image est trop lourde. Maximum autorisé: ${MAX_SIZE_MB} Mo.`);
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    if (!file.type.match('image.*')) {
      setError('Veuillez sélectionner un fichier image valide.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Veuillez choisir une image d\'abord.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setIsAnalyzing(true);
      setError('');
      setAnalysisResult(null);
      setUploadStatus('Analyse en cours...');
      
      const response = await axios.post(API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Simulation d'un résultat d'analyse (à remplacer par vos données réelles)
      const mockResult = {
        confidence: 94.7,
        hasGlaucoma: false,
        riskLevel: 'FAIBLE',
        analysisTime: 2.3,
        message: "Aucun signe évident de glaucome détecté",
        recommendations: [
          "Contrôle annuel recommandé",
          "Maintenir une pression intraoculaire normale",
          "Consulter un ophtalmologue pour confirmation"
        ]
      };

      // Si votre API retourne des données, utilisez-les :
      // setAnalysisResult(response.data);
      
      // Pour l'instant, utilisons le mock
      setAnalysisResult(mockResult);
      setUploadStatus('✅ Analyse terminée avec succès');
      
    } catch (err) {
      const errorMessage = err.response && err.response.data && err.response.data.detail
        ? `Erreur serveur : ${err.response.data.detail}`
        : 'Échec de l\'analyse. Problème de connexion au serveur.';
      
      setError(errorMessage);
      setUploadStatus('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setUploadStatus('');
    setError('');
    setAnalysisResult(null);
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Carte principale */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-blue-100">
          
          {/* En-tête */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                <Eye className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Détection du Glaucome</h1>
                <p className="text-blue-100 mt-2">Analyse d'images ophtalmologiques par IA</p>
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="p-8">
            {/* Étape 1 : Téléversement */}
            {!analysisResult ? (
              <>
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full">1</span>
                    Téléversez votre image
                  </h2>
                  <p className="text-blue-600 mb-6">Sélectionnez une image de l'œil pour analyse</p>

                  {/* Zone de drag & drop */}
                  <div
                    className={`border-3 border-dashed rounded-2xl p-8 text-center transition-all duration-300 mb-6
                      ${isDragging ? 'border-blue-500 bg-blue-50 border-blue-500' : 'border-blue-200'}
                      ${!previewUrl ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => !previewUrl && document.getElementById('fileInput').click()}
                  >
                    {!previewUrl ? (
                      <>
                        <div className="p-4 bg-blue-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                          <FileImage className="h-12 w-12 text-blue-500" />
                        </div>
                        <p className="text-blue-700 font-medium text-lg mb-3">
                          Glissez-déposez votre image
                        </p>
                        <p className="text-blue-500 mb-4">ou</p>
                        <label htmlFor="fileInput" className="cursor-pointer">
                          <div className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2 text-lg">
                            <Upload className="h-5 w-5" />
                            Sélectionner un fichier
                          </div>
                        </label>
                        <p className="text-blue-400 text-sm mt-6">
                          Formats: JPG, PNG, JPEG • Max {MAX_SIZE_MB} Mo
                        </p>
                      </>
                    ) : (
                      <div className="space-y-6">
                        <div className="relative mx-auto max-w-xs">
                          <img
                            src={previewUrl}
                            alt="Aperçu"
                            className="w-full h-48 object-cover rounded-xl border-2 border-blue-200 shadow-lg"
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-blue-700 font-medium truncate text-lg">{selectedFile?.name}</p>
                          <p className="text-blue-500">
                            {Math.round(selectedFile?.size / 1024)} KB
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReset();
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 mx-auto"
                        >
                          <span>Changer d'image</span>
                        </button>
                      </div>
                    )}
                    <input
                      id="fileInput"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Bouton d'analyse */}
                  <button
                    onClick={handleFileUpload}
                    disabled={!selectedFile || isAnalyzing}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3
                      ${!selectedFile || isAnalyzing
                        ? 'bg-blue-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                      } text-white`}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <Eye className="h-6 w-6" />
                        Démarrer l'analyse
                      </>
                    )}
                  </button>
                </div>

                {/* Messages d'état */}
                {error && (
                  <div className="p-4 rounded-xl mb-6 bg-red-50 border border-red-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">Erreur</p>
                        <p className="text-red-600 text-sm mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Informations */}
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800 mb-2">Pour une analyse optimale :</p>
                      <ul className="text-blue-600 text-sm space-y-1">
                        <li>• Image centrée sur la rétine</li>
                        <li>• Bon éclairage sans reflets</li>
                        <li>• Format JPG ou PNG recommandé</li>
                        <li>• Résolution minimum 1024x768 pixels</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Étape 2 : Résultats */
              <div className="space-y-6">
                <div className="text-center mb-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-blue-800">Analyse terminée</h2>
                  <p className="text-blue-600 mt-2">Résultats de l'analyse de l'image</p>
                </div>

                {/* Prévisualisation de l'image analysée */}
                {previewUrl && (
                  <div className="text-center">
                    <p className="text-blue-700 font-medium mb-3">Image analysée :</p>
                    <div className="relative inline-block">
                      <img
                        src={previewUrl}
                        alt="Image analysée"
                        className="w-64 h-64 object-cover rounded-xl border-2 border-blue-200 shadow-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Résultats détaillés */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4">Résultats de la détection</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className={`p-4 rounded-lg text-center ${analysisResult.hasGlaucoma ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                      <p className="text-sm text-blue-600 mb-1">Statut</p>
                      <p className={`text-xl font-bold ${analysisResult.hasGlaucoma ? 'text-red-700' : 'text-green-700'}`}>
                        {analysisResult.hasGlaucoma ? 'Risque détecté' : 'Aucun risque détecté'}
                      </p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-blue-100 text-center">
                      <p className="text-sm text-blue-600 mb-1">Niveau de confiance</p>
                      <p className="text-2xl font-bold text-blue-700">{analysisResult.confidence}%</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-blue-600 mb-1">Message d'analyse</p>
                      <p className="font-medium text-blue-800">{analysisResult.message}</p>
                    </div>

                    <div>
                      <p className="text-sm text-blue-600 mb-2">Recommandations :</p>
                      <ul className="space-y-2">
                        {analysisResult.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            <span className="text-blue-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-blue-200">
                      <p className="text-sm text-blue-500 text-center">
                        ⚠️ Ces résultats sont fournis à titre indicatif. Consultez un ophtalmologue pour un diagnostic médical complet.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    Analyser une nouvelle image
                  </button>
                  <button
                    onClick={() => {
                      // Fonctionnalité pour télécharger le rapport
                      alert('Fonctionnalité de téléchargement du rapport à implémenter');
                    }}
                    className="flex-1 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors"
                  >
                    Télécharger le rapport
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pied de page */}
          <div className="bg-blue-50 p-6 border-t border-blue-100">
            <div className="text-center">
              <p className="text-blue-600 text-sm">
                Système de détection du glaucome par IA • © 2024
              </p>
              <p className="text-blue-400 text-xs mt-2">
                Cet outil ne remplace pas une consultation médicale professionnelle
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlaucomaDetectionApp;