# 👁️ Glaucoma Detection AI

Une application web complète pour la détection du glaucome à partir d'images de fond d'œil.  
Ce projet utilise une architecture **Microservices** avec un frontend **React** et deux APIs **FastAPI** (Orchestration & Deep Learning).

---

## 🚀 Fonctionnalités

- **🔐 Authentification sécurisée** : Inscription/Connexion avec email et mot de passe (JWT + bcrypt)
- **Upload d'image** : Interface Drag & Drop intuitive  
- **Analyse IA** : Détection du glaucome via un modèle *MobileNetV3* pré-entraîné  
- **Explicabilité (XAI)** : Visualisation *Grad-CAM* (Heatmap)  
- **Rapport PDF** : Génération et téléchargement d'un rapport médical côté client  
- **Gestion d'accès** : Routes protégées, analyse réservée aux utilisateurs authentifiés  

---

## 📂 Structure du Projet

L'architecture est divisée en trois dossiers principaux :

```text
📦 glaucoma_detection
├── 📂 frontend/              # Interface Utilisateur (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx             # Page de connexion
│   │   │   ├── Signup.jsx            # Page d'inscription
│   │   │   └── ImageUploader.jsx     # Upload & analyse (protégé)
│   │   ├── utils/
│   │   │   └── api.js                # Axios avec Bearer token
│   │   ├── App.jsx                   # Routing avec React Router
│   │   └── main.jsx
│   └── package.json
├── 📂 backend/
│   ├── 📂 DL_API/            # Service IA / Cerveau (Port 8001)
│   │   ├── main.py
│   │   ├── best_model.pth    # ⚠️ Le modèle PyTorch doit être ici
│   │   └── requirements.txt  # Dépendances IA (Torch, OpenCV…)
│   └── 📂 uploads/           # Service Orchestrateur + Auth (Port 8000)
│       ├── main.py           # FastAPI + SQLAlchemy + JWT
│       ├── auth.db           # Base de données SQLite (auto-créée)
│       ├── uploaded_images/  # Stockage temporaire des images
│       └── requirements.txt  # Dépendances API (FastAPI, SQLAlchemy, etc.)

🛠️ Pré-requis
Assurez-vous d'avoir installé :

Node.js (v16+) et npm
Python (v3.9+)
⚙️ Installation
Il est recommandé d'ouvrir 3 terminaux différents pour installer et lancer les trois parties du projet.

1️⃣ Installation du Service IA (DL_API)
Ce service gère PyTorch et le traitement d'images lourds.

cd backend/DL_API

# Créer un environnement virtuel (recommandé)
python -m venv venv

# Activer l'environnement (Windows)
.\venv\Scripts\activate

# Activer l'environnement (Mac / Linux)
source venv/bin/activate

# Installer les dépendances IA
pip install -r requirements.txt
⚠️ Important
Vérifiez que le fichier best_model.pth se trouve bien dans le dossier DL_API.
2️⃣ Installation de l'Orchestrateur (Uploads)
Ce service gère les requêtes du frontend et le stockage de fichiers.

cd backend/uploads

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement (Windows)
.\venv\Scripts\activate

# Installer les dépendances API
pip install -r requirements.txt

3️⃣ Installation du Frontend
Interface utilisateur en React.

cd frontend

# Installer les dépendances Node
npm install

▶️ Démarrage du Projet
⚠️ Les 3 services doivent tourner simultanément.

🧠 Terminal 1 : Service IA (Port 8001)
cd backend/DL_API
uvicorn main:app --reload --port 8001

Attendre le message :
Application startup complete

👮‍♂️ Terminal 2 : Orchestrateur (Port 8000)
cd backend/uploads
uvicorn main:app --reload --port 8000

💻 Terminal 3 : Frontend (Port 5173 ou 3000)
cd frontend
npm run dev

Ouvrez ensuite votre navigateur à l'URL affichée, par exemple :
http://localhost:5173

❓ Dépannage (Troubleshooting)
❌ Erreur CORS (Network Error)
Si le frontend ne communique pas avec le backend :

Vérifiez le port du frontend (ex: 5173)
Ouvrez main.py
Ajoutez le port dans origins :
origins = [
    "http://localhost:3000",
    "http://localhost:5173"
]

❌ Erreur : « Le modèle n'est pas chargé »
Vérifiez le Terminal IA

Assurez-vous que :

le fichier s'appelle best_model.pth
il est situé dans DL_API
il est au même niveau que main.py
❌ Erreur npm error enoent
Vous n'êtes pas dans le bon dossier.
cd frontend
npm run dev

🔐 Authentification
Flux d'utilisation
Inscription : Créez un compte avec email + mot de passe
Connexion : Authentifiez-vous via le formulaire de login
Token JWT : Stocké dans localStorage (durée : 60 minutes)
Analyse protégée : Seuls les utilisateurs connectés peuvent uploader et analyser des images
Déconnexion : Le token est supprimé de localStorage
Endpoints d'authentification
Méthode	Route	Description
POST	/signup	Créer un nouvel utilisateur
POST	/token	Obtenir un JWT (login)
POST	/uploadfile/	Upload protégé (nécessite Bearer token)
Variables d'environnement (optionnel)
Créez un fichier .env dans uploads :
JWT_SECRET=your_secret_key_here_change_in_production

Note : Si JWT_SECRET n'est pas défini, un secret par défaut (non sécurisé) sera utilisé.

❌ Erreurs d'authentification
« Vous devez être connecté »
Accédez à la page de login via le bouton en haut à droite
Créez un compte via Signup si vous n'en avez pas
Vérifiez que le token JWT est stocké dans localStorage (DevTools → Application)
Erreur 401 Unauthorized
Votre token JWT a expiré (validité : 60 min)
Reconnectez-vous via la page de login
Erreur de base de données (« Table users not found »)
Supprimez auth.db si vous avez un problème de schéma
Relancez le service Orchestrateur → la BD sera recréée automatiquement
📦 Dépendances clés
Frontend
react : Framework UI
react-router-v6 : Routing client-side
axios : Client HTTP avec intercepteurs
jspdf : Génération de rapports PDF
tailwindcss : Styling
lucide-react : Icônes
Backend (Orchestrateur + Auth)
fastapi : Framework Web
sqlalchemy : ORM SQL
passlib[bcrypt] : Hachage sécurisé de mots de passe
python-jose[cryptography] : Gestion des JWT
email-validator : Validation d'email
httpx : Client HTTP asynchrone
python-multipart : Traitement des multipart/form-data
Backend (Service IA)
torch : Deep Learning
torchvision : Vision par ordinateur
opencv-python : Traitement d'images
numpy : Calculs numériques