# 👁️ Glaucoma Detection AI

Une application web complète pour la détection du glaucome à partir d'images de fond d'œil. Ce projet utilise une architecture **Microservices** avec un frontend React et deux APIs FastAPI (Orchestration & Deep Learning).

## 🚀 Fonctionnalités

* **Upload d'image** : Interface Drag & Drop intuitive.
* **Analyse IA** : Détection du glaucome via un modèle MobileNetV3 pré-entraîné.
* **Explicabilité (XAI)** : Visualisation GradCAM (Heatmap) pour identifier les zones d'intérêt.
* **Rapport PDF** : Génération et téléchargement d'un rapport médical complet côté client.

## 📂 Structure du Projet

L'architecture est divisée en trois dossiers principaux :


📦 glaucoma_detection
├── 📂 frontend/              # Interface Utilisateur (React + Vite)
│   ├── src/
│   └── package.json
├── 📂 backend/
│   ├── 📂 DL_API/            # Service IA / Cerveau (Port 8001)
│   │   ├── main.py
│   │   ├── best_model.pth    # ⚠️ Le modèle PyTorch doit être ici
│   │   └── requirements.txt  # Dépendances IA (Torch, OpenCV...)
│   └── 📂 uploads/           # Service Orchestrateur (Port 8000)
│       ├── main.py
│       ├── uploaded_images/  # Stockage temporaire
│       └── requirements.txt  # Dépendances API (FastAPI, HTTPX...)
````

-----

## 🛠️ Pré-requis

Assurez-vous d'avoir installé :

* **Node.js** (v16+) et **npm**
* **Python** (v3.9+)

-----

## ⚙️ Installation

Il est recommandé d'ouvrir **3 terminaux** différents pour installer et lancer les trois parties du projet.

### 1\. Installation du Service IA (DL\_API)

Ce service gère PyTorch et le traitement d'images lourds.

```bash
cd backend/DL_API

# Créer un environnement virtuel (recommandé)
python -m venv venv
# Activer l'environnement (Windows)
.\venv\Scripts\activate
# Activer l'environnement (Mac/Linux)
source venv/bin/activate

# Installer les dépendances spécifiques à l'IA
pip install -r requirements.txt
```

> **⚠️ Important :** Vérifiez que votre fichier `best_model.pth` se trouve bien dans le dossier `backend/DL_API/`.

### 2\. Installation de l'Orchestrateur (Uploads)

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

### 3\. Installation du Frontend

L'interface React.

```bash
cd frontend

# Installer les dépendances Node
npm install
```

-----

## ▶️ Démarrage du Projet

Pour que l'application fonctionne, **les 3 services doivent tourner simultanément**.

### Terminal 1 : Le Cerveau IA 🧠 (Port 8001)

```bash
cd backend/DL_API
# Si venv utilisé : .\venv\Scripts\activate
uvicorn main:app --reload --port 8001
```

*Attendre le message : "Application startup complete".*

### Terminal 2 : L'Orchestrateur 👮‍♂️ (Port 8000)

```bash
cd backend/uploads
# Si venv utilisé : .\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

### Terminal 3 : Le Frontend 💻 (Port 5173 ou 3000)

```bash
cd frontend
npm run dev
```

Ouvrez ensuite votre navigateur sur l'URL affichée (ex: `http://localhost:5173`).

-----

## ❓ Dépannage (Troubleshooting)

**Erreur CORS (Network Error)**
Si le frontend n'arrive pas à communiquer avec le backend :

1.  Vérifiez le port sur lequel tourne votre frontend (ex: 5173).
2.  Ouvrez `backend/uploads/main.py`.
3.  Ajoutez ce port dans la liste `origins` :
    ```python
    origins = ["http://localhost:3000", "http://localhost:5173"]
    ```

**Erreur "Le modèle n'est pas chargé"**

1.  Regardez le **Terminal 1**.
2.  Assurez-vous que le fichier `.pth` est bien nommé `best_model.pth` et qu'il est situé au même niveau que `backend/DL_API/main.py`.

**Erreur `npm error enoent`**
Vous n'êtes pas dans le bon dossier. Assurez-vous de faire `cd frontend` avant de lancer `npm run dev`.

-----

**Auteurs :** Équipe Projet Scrum

```
```