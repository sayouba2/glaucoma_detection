import React, { useState, useRef, useEffect } from 'react';
import './EyeViewBlock.css';

const EyeViewBlock = ({ onImageReady }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    setError(null);
    if (!file) return;
    if (file.type !== "image/jpeg" && file.type !== "image/png" && file.type !== "image/gif" && file.type !== "image/jpp") {
      setError("Format non supporté. Utilisez JPG, PNG, GIF ou JPEG.");
      return;
    }
    
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
    setError(null);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

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
        <div className="evb-title-group">
            <h3>Photo de l'œil</h3>
            <span className="evb-badge">Requis</span>
        </div>
        <p>Importez une image claire pour l'analyse</p>
      </div>

      {/* --- BLOC D'ERREUR --- */}
      {error && (
        <div className="evb-error-message">
          <div className="evb-error-icon-bg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            </svg>
          </div>
          <span>{error}</span>
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
          type="file" accept="image/png, image/jpeg, image/jpg, image/gif" hidden
          ref={fileInputRef} onChange={(e) => handleFile(e.target.files[0])}
        />

        {previewUrl ? (
          <div className="evb-preview-wrapper">
            <img src={previewUrl} alt="Aperçu" className="evb-image" />
            <div className="evb-overlay">
                <div className="evb-overlay-content">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span>Modifier l'image</span>
                </div>
            </div>
            <button className="evb-btn-remove" onClick={removeImage} title="Supprimer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        ) : (
          <div className="evb-placeholder">
            <div className="evb-icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span className="evb-text-main">Glissez-déposez votre image</span>
            <span className="evb-text-sub">ou <span className="evb-link">parcourez vos fichiers</span></span>
            <div className="evb-tags">
                <span>JPG</span>
                <span>PNG</span>
                <span>Max 5Mo</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EyeViewBlock;