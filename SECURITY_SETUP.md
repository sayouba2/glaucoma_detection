# 🔐 Guide d'Installation - Sécurité Glaucoma Detection

Ce guide vous aide à intégrer rapidement les fonctionnalités de sécurité dans votre branche `nouhaila`.

## 🚀 Installation Rapide

### 1. Installation des Dépendances

```bash
# Backend uploads
cd backend/uploads
pip install cryptography python-dotenv

# Backend DL_API  
cd ../DL_API
pip install cryptography python-dotenv
```

### 2. Configuration des Variables d'Environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Modifier les clés (IMPORTANT!)
# Remplacez les valeurs par défaut par des clés sécurisées
```

### 3. Test de l'Installation

```bash
cd backend/security
python test_security.py
```

## 🔧 Intégration dans votre Branche

### Fichiers Ajoutés

```
backend/security/
├── __init__.py                 # Module principal
├── encryption.py              # Chiffrement AES
├── audit_logger.py           # Logs d'audit
├── security_service.py       # Service intégré
├── migrate_existing_files.py # Migration
├── log_viewer.py             # Visualiseur de logs
├── test_security.py          # Tests
└── README.md                 # Documentation

.env                           # Configuration sécurisée
.env.example                  # Exemple de configuration
SECURITY_SETUP.md             # Ce guide
```

### Fichiers Modifiés

- `backend/uploads/main.py` - Intégration sécurité
- `backend/uploads/requirements.txt` - Nouvelles dépendances
- `backend/DL_API/requirements.txt` - Nouvelles dépendances
- `.gitignore` - Exclusion fichiers sensibles

## 📋 Fonctionnalités Implémentées

### ✅ Chiffrement des Fichiers
- **Automatique** lors de l'upload
- **AES-256** avec clé dérivée
- **Déchiffrement temporaire** pour l'analyse
- **Suppression sécurisée** des fichiers originaux

### ✅ Journalisation des Actions
- **Logs JSON** pour toutes les actions sensibles
- **Rotation quotidienne** des fichiers
- **Traçabilité complète** des opérations
- **Détection des violations** de sécurité

### ✅ Actions Auditées
- 🔑 Connexions/déconnexions
- 📤 Upload d'images
- 🔍 Analyses IA
- 📄 Génération de rapports
- 👤 Création de patients
- 🔐 Opérations de chiffrement

## 🛠️ Utilisation

### Démarrage Normal

```bash
# Terminal 1: Service IA
cd backend/DL_API
uvicorn main:app --reload --port 8001

# Terminal 2: Service principal (avec sécurité)
cd backend/uploads
uvicorn main:app --reload --port 8000

# Terminal 3: Frontend
cd frontend
npm run dev
```

### Visualisation des Logs

```bash
cd backend/security

# Résumé de sécurité
python log_viewer.py --summary --days 7

# Activité d'un utilisateur
python log_viewer.py --user "medecin@example.com"

# Activités récentes
python log_viewer.py --recent 24
```

## 🔍 Vérification

### Test des Fonctionnalités

```bash
cd backend/security
python test_security.py
```

### Vérification des Logs

```bash
# Les logs sont créés dans backend/uploads/logs/
ls -la backend/uploads/logs/
```

### Test d'Upload Sécurisé

1. Connectez-vous à l'application
2. Uploadez une image
3. Vérifiez que le fichier est chiffré (extension `.encrypted`)
4. Consultez les logs d'audit

## 🚨 Points d'Attention

### Sécurité des Clés

⚠️ **IMPORTANT**: Changez les clés par défaut dans `.env`

```bash
# Générer des clés sécurisées
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
```

### Migration des Fichiers Existants

Si vous avez déjà des images dans le système :

```bash
cd backend/uploads
python ../security/migrate_existing_files.py
```

### Compatibilité

- ✅ **Rétrocompatible** avec les fichiers existants
- ✅ **Pas de changement** dans l'interface utilisateur
- ✅ **Transparent** pour les utilisateurs finaux

## 📊 Monitoring

### Statistiques de Sécurité

Endpoint: `GET /security/stats`

```json
{
  "encryption_enabled": true,
  "audit_logging_enabled": true,
  "max_file_size_mb": "10",
  "allowed_extensions": ["jpg", "jpeg", "png", "bmp", "tiff"]
}
```

### Accès Sécurisé aux Images

Nouvel endpoint: `GET /secure-image/{filename}`

- ✅ Authentification requise
- ✅ Vérification des droits d'accès
- ✅ Déchiffrement temporaire
- ✅ Nettoyage automatique

## 🎯 Phrase de Rapport

> "Même si les données sont stockées localement, elles sont protégées par chiffrement AES-256 et toutes les actions sont tracées dans des logs d'audit pour renforcer la sécurité du système médical."

## 📞 Support

En cas de problème :

1. **Vérifiez les logs** : `python log_viewer.py --recent 1`
2. **Testez la sécurité** : `python test_security.py`
3. **Consultez la doc** : `backend/security/README.md`

---

**🎉 Félicitations !** Votre système de détection de glaucome est maintenant sécurisé avec chiffrement et audit complets.