from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import logging
from typing import IO

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Configuration ---
app = FastAPI(title="API d'Analyse Oculaire")

# 💡 Configuration CORS : Obligatoire pour la communication React (port 3000) et FastAPI (port 8000)
origins = ["http://localhost:5173"] # À ajuster si votre port React change

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constantes de validation
MAX_FILE_SIZE_MB = 2  # 5 Mo
UPLOAD_DIRECTORY = "uploaded_images"

# Crée le répertoire si il n'existe pas
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
logger.info(f"Dossier de sauvegarde : {UPLOAD_DIRECTORY}")

@app.post("/uploadfile/")
async def create_upload_file(file: UploadFile = File(...)):
    """
    Endpoint pour téléverser un fichier image, vérifier sa taille et le sauvegarder.
    """
    
    # 1. Vérification du type MIME côté backend (première ligne de défense)
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Le fichier n'est pas une image valide (Type: {file.content_type})."
        )

    # 2. Définition du chemin de sauvegarde
    # Nettoyage du nom de fichier pour éviter les injections de chemin (sécurité)
    safe_filename = os.path.basename(file.filename)
    file_location = os.path.join(UPLOAD_DIRECTORY, safe_filename)
    
    logger.info(f"Tentative de sauvegarde de {safe_filename} à {file_location}")
    
    try:
        # Écrire le contenu du fichier temporaire sur le disque
        with open(file_location, "wb") as buffer:
            # Lire les chunks pour gérer les fichiers potentiellement gros
            file_size = 0
            while True:
                chunk = await file.read(8192) # Lire par blocs de 8 KB
                if not chunk:
                    break
                
                # 3. Vérification de la taille pendant l'écriture
                file_size += len(chunk)
                if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
                    # Arrêter l'écriture et lever l'erreur si la taille est dépassée
                    buffer.close()
                    os.remove(file_location) # Supprimer le fichier partiellement écrit
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Image trop lourde. Taille max : {MAX_FILE_SIZE_MB} Mo. (Taille actuelle: {file_size / (1024 * 1024):.2f} Mo)"
                    )
                    
                buffer.write(chunk)

        # 4. Succès
        logger.info(f"Fichier sauvegardé avec succès: {safe_filename}. Taille: {file_size / (1024 * 1024):.2f} Mo")
        return {"filename": safe_filename, "message": "Fichier téléversé avec succès pour analyse."}

    except HTTPException:
        # Relancer l'HTTPException que nous avons déjà gérée (taille)
        raise
    except Exception as e:
        logger.error(f"Erreur lors du traitement du fichier: {e}")
        # Gérer toute autre erreur de lecture/écriture
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur interne du serveur lors du traitement du fichier."
        )
    finally:
        # Le UploadFile gère sa propre fermeture (await file.close() n'est plus strictement nécessaire avec le 'with open' si on a lu jusqu'à la fin)
        pass 

# Commande pour lancer le backend : uvicorn main:app --reload --port 8000