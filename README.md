
# 👁️ Glaucoma Detection AI

Une application web complète pour la détection du glaucome à partir d'images de fond d'œil.
Ce projet utilise une architecture **microservices** avec un frontend **React** et deux APIs **FastAPI** (Orchestrateur & Deep Learning).

---

## 🚀 Fonctionnalités

- Upload d'image : interface Drag & Drop intuitive
- Analyse IA : détection du glaucome via un modèle *MobileNetV3* pré‑entraîné
- Explicabilité (XAI) : visualisation *Grad‑CAM* (heatmap)
- Rapport PDF : génération et téléchargement d'un rapport médical côté client

---

## 📂 Structure du projet

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
```

---

## 🛠️ Pré‑requis

Assurez‑vous d'avoir installé :

- Node.js (v16+) et npm
- Python (v3.9+)

Optionnel mais recommandé : créer et activer un environnement virtuel Python pour chaque service backend.

---

## ⚙️ Installation

Il est recommandé d’ouvrir **3 terminaux** différents pour installer et lancer les trois parties du projet.

### 1️⃣ Service IA (DL_API)

Ce service gère PyTorch et le traitement d’images.

```bash
cd backend/DL_API
# Installer les dépendances IA
pip install -r requirements.txt
```

> ⚠️ Vérifiez que le fichier `best_model.pth` se trouve bien dans `backend/DL_API/` (au même niveau que `main.py`).

### 2️⃣ Orchestrateur (uploads)

Ce service gère l'authentification, l'upload et la communication avec le service IA.

```bash
cd backend/uploads
# Installer les dépendances API
pip install -r requirements.txt
```

### 3️⃣ Frontend

```bash
cd frontend
npm install
```

---

## ▶️ Démarrage du projet

⚠️ Les 3 services doivent tourner simultanément.

### 🧠 Terminal 1 : Service IA (port 8001)

```bash
cd backend/DL_API
uvicorn main:app --reload --port 8001
```

Attendre le message: `Application startup complete`.

### 👮‍♂️ Terminal 2 : Orchestrateur (port 8000)

```bash
cd backend/uploads
uvicorn main:app --reload --port 8000
```

### 💻 Terminal 3 : Frontend (port 5173 ou 3000)

```bash
cd frontend
npm run dev
```

Ouvrez votre navigateur à l’URL affichée, par ex. `http://localhost:5173`.

---

## 🔐 Variables d’environnement utiles

- `JWT_SECRET` (optionnel mais recommandé) : clé secrète JWT utilisée par `backend/uploads`. Exemple (PowerShell) :

```powershell
$Env:JWT_SECRET = "change_me_with_a_strong_secret"
```

La base SQLite `auth.db` est créée automatiquement dans `backend/uploads/` au premier lancement.

---

## 🌐 Points d’attention (CORS & accès aux images)

- Si le frontend ne communique pas avec le backend, vérifiez la liste `origins` dans `backend/uploads/main.py` et ajoutez le port du frontend (`5173` ou `3000`).
- Les images uploadées sont servies via `http://localhost:8000/images/<nom_fichier>`.

Exemple de configuration CORS dans `backend/uploads/main.py` :

```python
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]
```

---

## ❓ Dépannage

### « Le modèle n'est pas chargé »

1. Vérifiez le terminal du service IA.
2. Confirmez que `best_model.pth` est bien dans `backend/DL_API/` (même niveau que `main.py`).

### `npm error enoent`

Vous n’êtes probablement pas dans le bon dossier.

```bash
cd frontend
npm run dev
```