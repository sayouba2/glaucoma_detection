import React, { useState, useEffect } from "react";
// Importe du CSS si besoin, ou utilise Tailwind directement
import "./ImagePreview.css"; 

const ImagePreview = () => {
  // 1. État pour stocker le fichier sélectionné
  const [selectedFile, setSelectedFile] = useState(null);
  
  // 2. État pour stocker l'URL de prévisualisation (ce que l'utilisateur voit)
  const [previewUrl, setPreviewUrl] = useState(null);

  // 3. Fonction déclenchée quand l'utilisateur choisit un fichier
  const onSelectFile = (e) => {
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    const file = e.target.files[0];
    
    // Vérification basique du type (Optionnel ici, mais demandé dans l'US 10)
    if (file.type !== "image/jpeg" && file.type !== "image/png" && file.type !== "image/jpg" && file.type !== "image/gif") {
      alert("Format non supporté. Veuillez choisir JPG, JPEG, GIF ou PNG.");
      return;
    }

    setSelectedFile(file);
  };

  // 4. Effet de bord : Quand 'selectedFile' change, on génère l'URL
  useEffect(() => {
    if (!selectedFile) {
      return;
    }

    // Crée une URL locale temporaire pour l'objet fichier
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    // Nettoyage de la mémoire quand le composant est démonté ou l'image change
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  return (
    <div className="preview-container">
      <h2>Votre Analyse</h2>
      
      {/* Zone d'upload (partagée avec US 1, mais tu peux la coder ici pour tester) */}
      <div className="upload-controls">
        <input 
            type="file" 
            accept="image/png, image/jpeg, image/jpg, image/gif" 
            onChange={onSelectFile} 
            id="file-upload"
        />
        <label htmlFor="file-upload" className="btn-upload">
            {selectedFile ? "Changer l'image" : "Choisir une image"}
        </label>
      </div>

      {/* Zone de visualisation (C'est le cœur de ton US 2) */}
      <div className="image-display-area">
        {previewUrl ? (
          <div className="image-frame">
            <img src={previewUrl} alt="Prévisualisation de l'œil" />
          </div>
        ) : (
          <p className="placeholder-text">Aucune image sélectionnée</p>
        )}
      </div>
    </div>
  );
};

export default ImagePreview;