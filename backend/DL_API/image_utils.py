import cv2
import numpy as np
from PIL import Image
import torch
import torchvision.transforms as transforms
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import io
import base64
from model_utils import GradCAM, GradCAMPlusPlus
import torch.nn.functional as F

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# Configurer matplotlib pour ne pas utiliser d'interface graphique (serveur)
import matplotlib
matplotlib.use('Agg')

def preprocess_image_from_bytes(image_bytes):
    """
    Lit les bytes de l'image, applique le prétraitement OpenCV (CLAHE, etc.)
    et retourne une image PIL.
    """
    # Convertir les bytes en numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Prétraitement (Le code original de votre Streamlit)
    lab_image = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab_image)
    
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    lab_image = cv2.merge((cl, a, b))
    
    clahe_image = cv2.cvtColor(lab_image, cv2.COLOR_LAB2BGR)
    median_filtered_image = cv2.medianBlur(clahe_image, 5)
    image_rgb = cv2.cvtColor(median_filtered_image, cv2.COLOR_BGR2RGB)
    
    return Image.fromarray(image_rgb)

def prepare_tensor(image_pil):
    """Transforme l'image PIL en Tensor PyTorch"""
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])

    if image_pil.mode == 'RGBA':
        image_pil = image_pil.convert('RGB')
    
    image_tensor = transform(image_pil).unsqueeze(0) 
    return image_tensor

def generate_gradcam_base64(model, image_tensor):
    """
    Génère la visualisation GradCAM et la retourne sous forme de chaîne Base64
    pour qu'elle puisse être affichée directement dans React via <img src="..." />
    """
    gradcam = GradCAM(model)
    gradcam_pp = GradCAMPlusPlus(model)
    
    gradcam_map = gradcam(image_tensor)
    gradcam_pp_map = gradcam_pp(image_tensor)
    
    image = image_tensor.squeeze().cpu().numpy().transpose(1, 2, 0)
    image = (image - image.min()) / (image.max() - image.min())
    
    # Création du plot Matplotlib
    fig = plt.figure(figsize=(10, 6))
    gs = gridspec.GridSpec(1, 2, width_ratios=[1, 1])  
    
    ax0 = plt.subplot(gs[0, 0])
    ax0.imshow(image)
    ax0.imshow(cv2.resize(gradcam_map[0], (image.shape[1], image.shape[0])), 
           cmap='jet', alpha=0.5)
    ax0.set_title('GradCAM')
    ax0.axis('off')

    ax1 = plt.subplot(gs[0, 1])
    ax1.imshow(image)
    ax1.imshow(cv2.resize(gradcam_pp_map, (image.shape[1], image.shape[0])), 
           cmap='jet', alpha=0.5)
    ax1.set_title('GradCAM++')
    ax1.axis('off')

    # Sauvegarde dans un buffer mémoire au lieu d'un fichier
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig) # Important pour libérer la mémoire
    buf.seek(0)
    
    # Encodage en Base64
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    return f"data:image/png;base64,{img_str}"