# backend/main.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import httpx # Nécessaire pour appeler l'autre API (pip install httpx)

app = FastAPI()

# Configuration CORS
origins = ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constantes
UPLOAD_DIRECTORY = "uploaded_images"
DL_SERVICE_URL = "http://localhost:8001/analyze/"  # L'adresse de votre service DL
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

@app.post("/uploadfile/")
async def create_upload_file(file: UploadFile = File(...)):
    # 1. Validation basique
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Fichier invalide.")

    # 2. STOCKAGE : Sauvegarde sur le disque du backend
    file_location = os.path.join(UPLOAD_DIRECTORY, file.filename)
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de sauvegarde: {e}")
    finally:
        await file.close() # On ferme le flux entrant

    # 3. ANALYSE : Appel au service de Deep Learning
    # On rouvre le fichier qu'on vient de sauvegarder pour l'envoyer au DL
    analysis_result = {}
    try:
        async with httpx.AsyncClient(timeout=60.0) as client: # Timeout long pour le DL
            # On lit le fichier depuis le disque
            with open(file_location, "rb") as f:
                files = {'file': (file.filename, f, file.content_type)}
                response = await client.post(DL_SERVICE_URL, files=files)

            if response.status_code == 200:
                analysis_result = response.json()
            else:
                analysis_result = {"error": "Le service DL a renvoyé une erreur", "details": response.text}

    except httpx.RequestError:
        analysis_result = {"error": "Le service DL est injoignable (est-il lancé ?)"}

    # 4. RETOUR AU FRONTEND
    # On renvoie le nom du fichier stocké ET les résultats de l'analyse
    return {
        "filename": file.filename,
        "message": "Image stockée et analysée avec succès.",
        "analysis": analysis_result
    }