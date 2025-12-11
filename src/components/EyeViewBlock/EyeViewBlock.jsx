import React, { useState, useRef, useEffect } from 'react';
import './EyeViewBlock.css';

const EyeViewBlock = ({ onImageReady }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // NOUVEL ÉTAT : Pour gérer le message d'erreur
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);

  // --- LOGIQUE INTERNE ---
  const handleFile = (file) => {
    // On réinitialise l'erreur à chaque nouvelle tentative
    setError(null);

    if (!file) return;

    // Vérification du format
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      // AU LIEU DE L'ALERTE, ON SET L'ERREUR
      setError("Format non supporté. Veuillez utiliser JPG, JPEG, GIF ou PNG.");
      return;
    }
    
    // Si c'est bon, on continue
    setSelectedFile(file);
    if (onImageReady) onImageReady(file);
  };

  const onDragOver = (e) => { 
    e.preventDefault(); 
    setIsDragging(true); 
  };
  
  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null); // On efface l'erreur précédente au drop
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  // On permet à l'utilisateur de cliquer pour réessayer (efface l'erreur)
  const handleZoneClick = () => {
    setError(null);
    fileInputRef.current.click();
  };

  useEffect(() => {
    if (!selectedFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const removeImage = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
    if (onImageReady) onImageReady(null);
  };

  return (
    <div className="evb-container">
      <div className="evb-header">
        <h3>Photo de l'œil</h3>
        <p>Glissez votre image ici</p>
      </div>

      {/* --- BLOC D'ERREUR --- */}
      {/* Il ne s'affiche que si 'error' contient du texte */}
      {error && (
        <div className="evb-error-message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          {error}
        </div>
      )}

      <div 
        className={`evb-dropzone ${isDragging ? "evb-dragging" : ""} ${previewUrl ? "evb-has-image" : ""} ${error ? "evb-has-error" : ""}`}
        onClick={handleZoneClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input 
          type="file" accept="image/png, image/jpeg" hidden 
          ref={fileInputRef} onChange={(e) => handleFile(e.target.files[0])} 
        />

        {previewUrl ? (
          <div className="evb-preview-wrapper">
            <img src={previewUrl} alt="Aperçu" className="evb-image" />
            <div className="evb-overlay"><span>Changer votre image</span></div>
            <button className="evb-btn-remove" onClick={removeImage}>✕</button>
          </div>
        ) : (
          <div className="evb-placeholder">
            <div className="evb-icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span className="evb-text-main">Ajouter une image</span>
            <span className="evb-text-sub">JPG, PNG (Max 5Mo)</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EyeViewBlock;