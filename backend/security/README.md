# 🔐 Module de Sécurité - Glaucoma Detection

Ce module implémente les fonctionnalités de sécurité pour le projet de détection de glaucome, incluant le chiffrement des fichiers et la journalisation des actions sensibles.

## 🎯 Fonctionnalités Implémentées

### 1. 🔒 Chiffrement des Fichiers (AES)
- **Chiffrement automatique** de toutes les images uploadées
- **Déchiffrement temporaire** uniquement pendant l'analyse
- **Clé de chiffrement** stockée dans `.env`
- **Protection** contre l'accès non autorisé aux fichiers

### 2. 📝 Journalisation des Actions (Audit Logs)
- **Logs locaux** de toutes les actions sensibles
- **Traçabilité complète** des opérations
- **Format JSON** pour faciliter l'analyse
- **Rotation quotidienne** des fichiers de log

## 📂 Structure du Module

```
backend/security/
├── __init__.py                 # Module principal
├── encryption.py              # Chiffrement AES des fichiers
├── audit_logger.py           # Journalisation des actions
├── security_service.py       # Service intégré de sécurité
├── migrate_existing_files.py # Migration des fichiers existants
├── log_viewer.py             # Visualiseur de logs
└── README.md                 # Cette documentation
```

## ⚙️ Configuration

### Variables d'Environnement (.env)

```bash
# Clé JWT pour l'authentification
JWT_SECRET=votre_cle_jwt_secrete

# Clé de chiffrement pour les fichiers
ENCRYPTION_KEY=votre_cle_de_chiffrement_secrete

# Configuration des logs
LOG_LEVEL=INFO
ENABLE_AUDIT_LOGS=true

# Sécurité additionnelle
MAX_FILE_SIZE_MB=10
ALLOWED_IMAGE_EXTENSIONS=jpg,jpeg,png,bmp,tiff
SESSION_TIMEOUT_MINUTES=60
```

## 🚀 Installation et Déploiement

### 1. Installation des Dépendances

```bash
cd backend/uploads
pip install -r requirements.txt
```

### 2. Configuration de l'Environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Modifier les clés de sécurité
nano .env
```

### 3. Migration des Fichiers Existants (Optionnel)

Si vous avez déjà des fichiers dans le système :

```bash
cd backend/uploads
python ../security/migrate_existing_files.py
```

## 📊 Actions Journalisées

Le système enregistre automatiquement :

- ✅ **LOGIN** - Connexions utilisateur (succès/échec)
- 📤 **UPLOAD_IMAGE** - Upload d'images médicales
- 🔍 **ANALYZE_IMAGE** - Analyses IA des images
- 📄 **GENERATE_REPORT** - Génération de rapports
- 👤 **CREATE_PATIENT** - Création de dossiers patients
- 👁️ **VIEW_PATIENT** - Consultation de dossiers
- 🗑️ **DELETE_FILE** - Suppression de fichiers
- 🔐 **ENCRYPTION_ACTION** - Actions de chiffrement/déchiffrement
- 🚨 **SECURITY_VIOLATION** - Violations de sécurité

## 🔍 Visualisation des Logs

### Résumé de Sécurité

```bash
cd backend/security
python log_viewer.py --summary --days 7
```

### Activité d'un Utilisateur

```bash
python log_viewer.py --user "medecin@example.com" --days 7
```

### Activités Récentes

```bash
python log_viewer.py --recent 24
```

## 🛡️ Sécurité des Fichiers

### Processus de Chiffrement

1. **Upload** → Fichier sauvegardé temporairement
2. **Validation** → Vérification type/taille
3. **Chiffrement** → AES avec clé dérivée
4. **Suppression** → Fichier original supprimé
5. **Stockage** → Seul le fichier chiffré reste

### Processus d'Accès

1. **Authentification** → Vérification des droits
2. **Déchiffrement** → Fichier temporaire créé
3. **Accès** → Lecture/affichage du fichier
4. **Nettoyage** → Suppression immédiate du fichier temporaire

## 🔗 Intégration avec l'API

### Endpoints Sécurisés

- `POST /uploadfile/` - Upload avec chiffrement automatique
- `GET /secure-image/{filename}` - Accès sécurisé aux images
- `GET /security/stats` - Statistiques de sécurité
- `POST /token` - Authentification avec audit

### Exemple d'Utilisation

```python
from security.security_service import security_service

# Chiffrement d'un fichier
encrypted_path = security_service.secure_file_upload(
    file_path="image.jpg",
    user_email="medecin@example.com",
    user_id=1,
    patient_id=123
)

# Accès sécurisé
temp_path = security_service.secure_file_access(
    encrypted_path=encrypted_path,
    user_email="medecin@example.com",
    user_id=1
)

# Nettoyage
security_service.cleanup_temp_file(temp_path, "medecin@example.com", 1)
```

## 📈 Monitoring et Alertes

### Indicateurs de Sécurité

- **Taux de succès** des authentifications
- **Nombre de violations** de sécurité
- **Activité par utilisateur**
- **Tentatives d'accès non autorisé**

### Fichiers de Log

Les logs sont stockés dans `logs/security_audit_YYYYMMDD.log` avec rotation quotidienne.

Format JSON pour chaque entrée :
```json
{
  "timestamp": "2024-01-15T10:30:00",
  "action_type": "LOGIN",
  "user_email": "medecin@example.com",
  "user_id": 1,
  "ip_address": "192.168.1.100",
  "success": true,
  "details": {"login_attempt": true}
}
```

## 🚨 Gestion des Incidents

### En cas de Violation de Sécurité

1. **Vérifier les logs** avec `log_viewer.py`
2. **Identifier l'origine** de la violation
3. **Changer les clés** de chiffrement si nécessaire
4. **Notifier** les utilisateurs concernés

### Récupération de Fichiers

En cas de problème avec le chiffrement :

```python
from security.encryption import FileEncryption

encryption = FileEncryption()
decrypted_path = encryption.decrypt_file("fichier.encrypted")
```

## 🔧 Maintenance

### Nettoyage des Logs Anciens

```bash
# Supprimer les logs de plus de 30 jours
find logs/ -name "security_audit_*.log" -mtime +30 -delete
```

### Rotation des Clés

1. Générer une nouvelle clé dans `.env`
2. Redémarrer l'application
3. Les nouveaux fichiers utiliseront la nouvelle clé
4. Migrer les anciens fichiers si nécessaire

## 📞 Support

Pour toute question sur la sécurité :
- Vérifier les logs d'audit
- Consulter cette documentation
- Tester avec les scripts fournis

---

**⚠️ Important :** Ne jamais partager les clés de chiffrement ou les stocker en clair dans le code source.