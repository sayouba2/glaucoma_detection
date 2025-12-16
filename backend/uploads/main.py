# backend/uploads/main.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import shutil
import os
import httpx
import asyncio
import logging

# 👇 IMPORT DEPUIS TON NOUVEAU FICHIER
from cleanup import start_cleanup_loop

# --- Configuration ---
UPLOAD_DIRECTORY = "uploaded_images"
DL_SERVICE_URL = "http://localhost:8001/analyze/"
TTL_MINUTES = 10

logging.basicConfig(level=logging.INFO)

# --- LIFESPAN (Gestion du cycle de vie) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Démarrage : On lance la boucle importée en tâche de fond
    task = asyncio.create_task(
        start_cleanup_loop(UPLOAD_DIRECTORY, TTL_MINUTES)
    )
    yield
    # 2. Arrêt : On annule la tâche proprement
    task.cancel()

app = FastAPI(lifespan=lifespan)

# --- Le reste de ton code reste identique ---
origins = ["http://localhost:3000", "http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

@app.post("/uploadfile/")
async def create_upload_file(file: UploadFile = File(...)):
    # ... (Ton code d'upload existant ne change pas) ...
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Fichier invalide.")

    file_location = os.path.join(UPLOAD_DIRECTORY, file.filename)
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de sauvegarde: {e}")
    finally:
        await file.close()

    analysis_result = {}
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(file_location, "rb") as f:
                files = {'file': (file.filename, f, file.content_type)}
                response = await client.post(DL_SERVICE_URL, files=files)

            if response.status_code == 200:
                analysis_result = response.json()
            else:
                analysis_result = {"error": "Erreur DL Service", "details": response.text}
    except httpx.RequestError:
        analysis_result = {"error": "Service DL injoignable"}

    return {
        "filename": file.filename,
        "message": "Succès",
        "analysis": analysis_result
    }