
---

````markdown
# 👁️ Glaucoma Detection AI

Une application web complète pour la détection du glaucome à partir d'images de fond d'œil.  
Ce projet utilise une architecture **Microservices** avec un frontend **React** et deux APIs **FastAPI** (Orchestration & Deep Learning).

---

## 🚀 Fonctionnalités

- **Upload d'image** : Interface Drag & Drop intuitive  
- **Analyse IA** : Détection du glaucome via un modèle *MobileNetV3* pré-entraîné  
- **Explicabilité (XAI)** : Visualisation *Grad-CAM* (Heatmap)  
- **Rapport PDF** : Génération et téléchargement d'un rapport médical côté client  

---

## 📂 Structure du Projet

L'architecture est divisée en trois dossiers principaux :

```text
📦 glaucoma_detection
├── 📂 frontend/              # Interface Utilisateur (React + Vite)
│   ├── src/
│   └── package.json
├── 📂 backend/
│   ├── 📂 DL_API/            # Service IA / Cerveau (Port 8001)
│   │   ├── main.py
│   │   ├── best_model.pth    # ⚠️ Le modèle PyTorch doit être ici
│   │   └── requirements.txt  # Dépendances IA (Torch, OpenCV…)
│   └── 📂 uploads/           # Service Orchestrateur (Port 8000)
│       ├── main.py
│       ├── uploaded_images/  # Stockage temporaire
│       └── requirements.txt  # Dépendances API (FastAPI, HTTPX…)
````

---

## 🛠️ Pré-requis

Assurez-vous d'avoir installé :

* **Node.js** (v16+) et **npm**
* **Python** (v3.9+)

---

## ⚙️ Installation

Il est recommandé d’ouvrir **3 terminaux** différents pour installer et lancer les trois parties du projet.

---

### 1️⃣ Installation du Service IA (DL_API)

Ce service gère PyTorch et le traitement d’images lourds.

```bash
cd backend/DL_API

# Créer un environnement virtuel (recommandé)
python -m venv venv

# Activer l'environnement (Windows)
.\venv\Scripts\activate

# Activer l'environnement (Mac / Linux)
source venv/bin/activate

# Installer les dépendances IA
pip install -r requirements.txt
```

> ⚠️ **Important**
> Vérifiez que le fichier `best_model.pth` se trouve bien dans le dossier
> `backend/DL_API/`.

---

### 2️⃣ Installation de l’Orchestrateur (Uploads)

Ce service gère les requêtes du frontend et le stockage de fichiers.

```bash
cd backend/uploads

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement (Windows)
.\venv\Scripts\activate

# Installer les dépendances API
pip install -r requirements.txt
```

---

### 3️⃣ Installation du Frontend

Interface utilisateur en React.

```bash
cd frontend

# Installer les dépendances Node
npm install
```

---

## ▶️ Démarrage du Projet

⚠️ **Les 3 services doivent tourner simultanément.**

---

### 🧠 Terminal 1 : Service IA (Port 8001)

```bash
cd backend/DL_API
uvicorn main:app --reload --port 8001
```

*Attendre le message :*
`Application startup complete`

---

### 👮‍♂️ Terminal 2 : Orchestrateur (Port 8000)

```bash
cd backend/uploads
uvicorn main:app --reload --port 8000
```

---

### 💻 Terminal 3 : Frontend (Port 5173 ou 3000)

```bash
cd frontend
npm run dev
```

Ouvrez ensuite votre navigateur à l’URL affichée, par exemple :
`http://localhost:5173`

---

## ❓ Dépannage (Troubleshooting)

### ❌ Erreur CORS (Network Error)

Si le frontend ne communique pas avec le backend :

1. Vérifiez le port du frontend (ex: `5173`)
2. Ouvrez `backend/uploads/main.py`
3. Ajoutez le port dans `origins` :

```python
origins = [
    "http://localhost:3000",
    "http://localhost:5173"
]
```

---

### ❌ Erreur : « Le modèle n'est pas chargé »

1. Vérifiez le **Terminal IA**
2. Assurez-vous que :

    * le fichier s'appelle `best_model.pth`
    * il est situé dans `backend/DL_API/`
    * il est au même niveau que `main.py`

---

### ❌ Erreur `npm error enoent`

Vous n’êtes pas dans le bon dossier.

```bash
cd frontend
npm run dev
```

