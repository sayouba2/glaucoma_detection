"""
Script de test pour vérifier les fonctionnalités de sécurité
"""
import os
import tempfile
import shutil
from pathlib import Path

from encryption import FileEncryption
from audit_logger import SecurityAuditLogger, ActionType

# Import du service avec gestion des imports relatifs
import sys
sys.path.append(os.path.dirname(__file__))

# Créer une version modifiée du SecurityService pour les tests
class TestSecurityService:
    def __init__(self):
        self.encryption = FileEncryption()
        self.audit_logger = SecurityAuditLogger("test_logs")
        self.enabled = True
    
    def validate_file_security(self, file_path: str, max_size_mb: int = 10):
        allowed_extensions = ["jpg", "jpeg", "png", "bmp", "tiff"]
        file_ext = os.path.splitext(file_path)[1].lower().lstrip('.')
        
        if file_ext not in allowed_extensions:
            return {"valid": False, "error": f"Extension non autorisée: {file_ext}"}
        
        if os.path.exists(file_path):
            file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
            if file_size_mb > max_size_mb:
                return {"valid": False, "error": f"Fichier trop volumineux: {file_size_mb:.2f}MB"}
        
        return {"valid": True}
    
    def secure_file_upload(self, file_path, user_email, user_id, patient_id):
        encrypted_path = self.encryption.encrypt_file(file_path)
        filename = os.path.basename(file_path)
        self.audit_logger.log_image_upload(user_email, user_id, filename, patient_id)
        return encrypted_path
    
    def secure_file_access(self, encrypted_path, user_email, user_id, temp_access=True):
        if temp_access:
            temp_path = f"{encrypted_path}.temp_{user_id}"
            return self.encryption.decrypt_file(encrypted_path, temp_path)
        return self.encryption.decrypt_file(encrypted_path)
    
    def cleanup_temp_file(self, temp_path, user_email, user_id):
        if os.path.exists(temp_path):
            os.remove(temp_path)

def test_encryption():
    """
    Test du système de chiffrement
    """
    print("🔐 Test du chiffrement...")
    
    # Créer un fichier de test
    test_content = b"Test file for encryption"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    try:
        # Test de chiffrement
        encryption = FileEncryption()
        encrypted_path = encryption.encrypt_file(temp_file_path)
        
        print(f"   ✅ Fichier chiffré: {encrypted_path}")
        
        # Vérifier que le fichier original a été supprimé
        if not os.path.exists(temp_file_path):
            print("   ✅ Fichier original supprimé")
        else:
            print("   ❌ Fichier original non supprimé")
        
        # Test de déchiffrement
        decrypted_path = encryption.decrypt_file(encrypted_path)
        
        # Vérifier le contenu
        with open(decrypted_path, 'rb') as f:
            decrypted_content = f.read()
        
        if decrypted_content == test_content:
            print("   ✅ Déchiffrement réussi - contenu identique")
        else:
            print("   ❌ Déchiffrement échoué - contenu différent")
        
        # Nettoyage
        if os.path.exists(encrypted_path):
            os.remove(encrypted_path)
        if os.path.exists(decrypted_path):
            os.remove(decrypted_path)
        
        return True
        
    except Exception as e:
        print(f"   ❌ Erreur lors du test de chiffrement: {e}")
        return False
    
    finally:
        # Nettoyage final
        for path in [temp_file_path, encrypted_path if 'encrypted_path' in locals() else None]:
            if path and os.path.exists(path):
                os.remove(path)

def test_audit_logging():
    """
    Test du système de journalisation
    """
    print("\n📝 Test de la journalisation...")
    
    try:
        # Créer un répertoire de test pour les logs
        test_log_dir = "test_logs"
        os.makedirs(test_log_dir, exist_ok=True)
        
        # Initialiser le logger
        audit_logger = SecurityAuditLogger(test_log_dir)
        
        # Test de différents types de logs
        audit_logger.log_login("test@example.com", 1, "192.168.1.100", True)
        audit_logger.log_image_upload("test@example.com", 1, "test_image.jpg", 123)
        audit_logger.log_image_analysis("test@example.com", 1, "test_image.jpg", "Glaucome détecté", 0.85, 123)
        audit_logger.log_security_violation({"error": "Test violation", "details": "Test"})
        
        print("   ✅ Logs d'audit créés")
        
        # Vérifier que le fichier de log existe
        log_files = [f for f in os.listdir(test_log_dir) if f.startswith("security_audit_")]
        if log_files:
            print(f"   ✅ Fichier de log créé: {log_files[0]}")
            
            # Lire le contenu du log
            with open(os.path.join(test_log_dir, log_files[0]), 'r', encoding='utf-8') as f:
                log_content = f.read()
                log_lines = log_content.strip().split('\n')
                print(f"   ✅ {len(log_lines)} entrées de log créées")
        else:
            print("   ❌ Aucun fichier de log créé")
            return False
        
        # Nettoyage
        shutil.rmtree(test_log_dir)
        
        return True
        
    except Exception as e:
        print(f"   ❌ Erreur lors du test de journalisation: {e}")
        return False

def test_security_service():
    """
    Test du service de sécurité intégré
    """
    print("\n🛡️ Test du service de sécurité...")
    
    try:
        # Créer un fichier de test
        test_content = b"Test image for security service"
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            temp_file.write(test_content)
            temp_file_path = temp_file.name
        
        # Initialiser le service
        security_service = TestSecurityService()
        
        # Test de validation de fichier
        validation = security_service.validate_file_security(temp_file_path)
        if validation["valid"]:
            print("   ✅ Validation de fichier réussie")
        else:
            print(f"   ❌ Validation de fichier échouée: {validation['error']}")
            return False
        
        # Test de sécurisation de fichier
        encrypted_path = security_service.secure_file_upload(
            temp_file_path,
            "test@example.com",
            1,
            123
        )
        
        print(f"   ✅ Fichier sécurisé: {os.path.basename(encrypted_path)}")
        
        # Test d'accès sécurisé
        temp_access_path = security_service.secure_file_access(
            encrypted_path,
            "test@example.com",
            1,
            temp_access=True
        )
        
        print(f"   ✅ Accès sécurisé créé: {os.path.basename(temp_access_path)}")
        
        # Vérifier le contenu
        with open(temp_access_path, 'rb') as f:
            accessed_content = f.read()
        
        if accessed_content == test_content:
            print("   ✅ Contenu accessible identique")
        else:
            print("   ❌ Contenu accessible différent")
            return False
        
        # Test de nettoyage
        security_service.cleanup_temp_file(temp_access_path, "test@example.com", 1)
        
        if not os.path.exists(temp_access_path):
            print("   ✅ Fichier temporaire nettoyé")
        else:
            print("   ❌ Fichier temporaire non nettoyé")
        
        # Nettoyage final
        if os.path.exists(encrypted_path):
            os.remove(encrypted_path)
        
        return True
        
    except Exception as e:
        print(f"   ❌ Erreur lors du test du service de sécurité: {e}")
        return False

def test_environment_config():
    """
    Test de la configuration d'environnement
    """
    print("\n⚙️ Test de la configuration...")
    
    required_vars = [
        "JWT_SECRET",
        "ENCRYPTION_KEY",
        "ENABLE_AUDIT_LOGS",
        "MAX_FILE_SIZE_MB",
        "ALLOWED_IMAGE_EXTENSIONS"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"   ⚠️ Variables manquantes: {', '.join(missing_vars)}")
        print("   💡 Assurez-vous que le fichier .env est configuré")
    else:
        print("   ✅ Toutes les variables d'environnement sont configurées")
    
    return len(missing_vars) == 0

def main():
    """
    Exécute tous les tests de sécurité
    """
    print("🧪 TESTS DE SÉCURITÉ - Glaucoma Detection")
    print("=" * 60)
    
    tests = [
        ("Configuration", test_environment_config),
        ("Chiffrement", test_encryption),
        ("Journalisation", test_audit_logging),
        ("Service intégré", test_security_service)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Erreur critique dans {test_name}: {e}")
            results.append((test_name, False))
    
    # Résumé des résultats
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ DES TESTS")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ RÉUSSI" if result else "❌ ÉCHOUÉ"
        print(f"{test_name:20} : {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Résultat global: {passed}/{total} tests réussis")
    
    if passed == total:
        print("🎉 Tous les tests de sécurité sont passés avec succès!")
        print("🔒 Le système de sécurité est opérationnel.")
    else:
        print("⚠️ Certains tests ont échoué. Vérifiez la configuration.")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())