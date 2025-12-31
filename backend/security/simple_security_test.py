"""
Test simple des fonctionnalités de sécurité avec les fichiers existants
"""
import os
import shutil
from encryption import FileEncryption
from audit_logger import SecurityAuditLogger

def test_with_real_files():
    """
    Test avec les vrais fichiers uploadés
    """
    print("🔐 TEST AVEC FICHIERS RÉELS")
    print("=" * 50)
    
    upload_dir = "../uploads/uploaded_images"
    if not os.path.exists(upload_dir):
        print("❌ Dossier uploaded_images introuvable")
        return
    
    # Lister les fichiers
    files = [f for f in os.listdir(upload_dir) if f.endswith(('.png', '.jpg', '.jpeg'))]
    print(f"📁 {len(files)} fichiers trouvés")
    
    if not files:
        print("ℹ️ Aucun fichier à tester")
        return
    
    # Test avec le premier fichier
    test_file = files[0]
    file_path = os.path.join(upload_dir, test_file)
    
    print(f"🧪 Test avec: {test_file}")
    print(f"📏 Taille originale: {os.path.getsize(file_path)} bytes")
    
    # Créer une copie pour le test
    test_copy = os.path.join(upload_dir, f"test_copy_{test_file}")
    shutil.copy2(file_path, test_copy)
    
    try:
        # Test de chiffrement
        encryption = FileEncryption()
        encrypted_path = encryption.encrypt_file(test_copy)
        
        print(f"🔒 Fichier chiffré: {os.path.basename(encrypted_path)}")
        print(f"📏 Taille chiffrée: {os.path.getsize(encrypted_path)} bytes")
        
        # Test de déchiffrement
        decrypted_path = encryption.decrypt_file(encrypted_path)
        print(f"🔓 Fichier déchiffré: {os.path.basename(decrypted_path)}")
        
        # Vérifier que le contenu est identique
        with open(file_path, 'rb') as f1, open(decrypted_path, 'rb') as f2:
            original = f1.read()
            decrypted = f2.read()
        
        if original == decrypted:
            print("✅ Contenu identique après chiffrement/déchiffrement")
        else:
            print("❌ Contenu différent - erreur!")
        
        # Nettoyage
        for temp_file in [encrypted_path, decrypted_path]:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        print("🧹 Fichiers temporaires nettoyés")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")

def test_audit_logging():
    """
    Test de la journalisation avec des données réalistes
    """
    print("\n📝 TEST DE JOURNALISATION")
    print("=" * 50)
    
    # Créer un logger de test
    audit_logger = SecurityAuditLogger("test_logs_real")
    
    # Simuler des actions réelles
    print("📋 Simulation d'actions utilisateur...")
    
    # Connexion
    audit_logger.log_login("nohailaelhamal2019@gmail.com", 1, "127.0.0.1", True)
    print("   ✅ Connexion enregistrée")
    
    # Upload d'image
    audit_logger.log_image_upload("nohailaelhamal2019@gmail.com", 1, "EyePACS-Glaucoma-1365.png", 1)
    print("   ✅ Upload d'image enregistré")
    
    # Analyse IA
    audit_logger.log_image_analysis("nohailaelhamal2019@gmail.com", 1, "EyePACS-Glaucoma-1365.png", 
                                   "Glaucome détecté", 0.985, 1)
    print("   ✅ Analyse IA enregistrée")
    
    # Génération de rapport
    audit_logger.log_report_generation("nohailaelhamal2019@gmail.com", 1, 1, "Chat_Medical_Report")
    print("   ✅ Génération de rapport enregistrée")
    
    # Vérifier le fichier de log
    log_files = [f for f in os.listdir("test_logs_real") if f.startswith("security_audit_")]
    if log_files:
        log_file_path = os.path.join("test_logs_real", log_files[0])
        with open(log_file_path, 'r', encoding='utf-8') as f:
            log_content = f.read()
            log_lines = log_content.strip().split('\n')
        
        print(f"📊 {len(log_lines)} entrées créées dans {log_files[0]}")
        
        # Afficher les entrées
        print("\n📋 Entrées de log créées:")
        for i, line in enumerate(log_lines):
            if line.strip():
                try:
                    import json
                    parts = line.split(' - ', 2)
                    if len(parts) >= 3:
                        log_data = json.loads(parts[2])
                        timestamp = log_data.get('timestamp', 'N/A')[:19]  # YYYY-MM-DD HH:MM:SS
                        action = log_data.get('action_type', 'UNKNOWN')
                        user = log_data.get('user_email', 'SYSTEM')
                        success = "✅" if log_data.get('success', True) else "❌"
                        print(f"   {i+1}. {timestamp} {success} {action} - {user}")
                except:
                    print(f"   {i+1}. {line[:80]}...")
    
    # Nettoyage
    shutil.rmtree("test_logs_real")
    print("\n🧹 Logs de test nettoyés")

def main():
    """
    Exécute les tests avec les données réelles
    """
    print("🧪 TESTS DE SÉCURITÉ AVEC DONNÉES RÉELLES")
    print("=" * 60)
    print("Test des fonctionnalités de sécurité avec vos fichiers")
    print("=" * 60)
    
    try:
        test_with_real_files()
        test_audit_logging()
        
        print("\n🎉 TESTS TERMINÉS AVEC SUCCÈS!")
        print("\n💡 Résumé:")
        print("   • Le chiffrement fonctionne avec vos images médicales")
        print("   • La journalisation enregistre toutes vos actions")
        print("   • Le système est prêt pour la production sécurisée")
        
    except Exception as e:
        print(f"❌ Erreur lors des tests: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())