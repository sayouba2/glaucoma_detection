from fastapi import FastAPI, File, UploadFile, HTTPException
from contextlib import asynccontextmanager
import torch
import torch.nn.functional as F
from model_utils import load_model_weights
from image_utils import preprocess_image_from_bytes, prepare_tensor, generate_gradcam_base64
import logging

# --- Configuration ---
MODEL_PATH = "best_model.pth"
logger = logging.getLogger("uvicorn")

# Variables globales pour le modèle
ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Charger le modèle au démarrage de l'app (pour ne le faire qu'une fois)
    try:
        logger.info("Chargement du modèle Deep Learning...")
        ml_models["glaucoma_net"] = load_model_weights(MODEL_PATH)
        logger.info("Modèle chargé avec succès sur CPU.")
    except Exception as e:
        logger.error(f"Erreur lors du chargement du modèle: {e}")
        ml_models["glaucoma_net"] = None
    yield
    # Nettoyage à l'arrêt (si besoin)
    ml_models.clear()

app = FastAPI(title="Glaucoma DL Service", lifespan=lifespan)

@app.post("/analyze/")
async def analyze_image(file: UploadFile = File(...)):
    if ml_models["glaucoma_net"] is None:
        raise HTTPException(status_code=503, detail="Le modèle n'est pas chargé.")

    # 1. Lecture du fichier
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Fichier invalide.")
    
    contents = await file.read()
    
    try:
        # 2. Prétraitement (OpenCV + PIL)
        pil_image = preprocess_image_from_bytes(contents)
        
        # 3. Préparation Tensor
        image_tensor = prepare_tensor(pil_image)
        
        # 4. Prédiction
        model = ml_models["glaucoma_net"]
        with torch.no_grad():
            output = model(image_tensor)
            probs = F.softmax(output, dim=1)
            pred_idx = output.argmax(dim=1).item()
            probability = probs[0][pred_idx].item()
        
        # 5. Génération GradCAM (Visualisation)
        # Note: GradCAM nécessite le calcul des gradients, donc on réactive le contexte nécessaire
        gradcam_image_base64 = generate_gradcam_base64(model, image_tensor)

        # Mapping des labels
        labels = {0: "No Glaucoma", 1: "Glaucoma Detected"}
        
        return {
            "prediction_class": pred_idx,
            "prediction_label": labels[pred_idx],
            "probability": round(probability, 4),
            "gradcam_image": gradcam_image_base64 # Image encodée en base64 pour affichage direct
        }

    except Exception as e:
        logger.error(f"Erreur lors de l'analyse: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse: {str(e)}")

# Lancer avec: uvicorn main:app --reload --port 8001