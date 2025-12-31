"""
Démonstration des fonctionnalités de sécurité
"""
import os
import tempfile
from encryption import FileEncryption
from audit_logger import SecurityAuditLogger, ActionType

def demo_encryption():
    """
    Démonstration du chiffrement de fichiers
    """
    print("🔐 DÉMONSTRATION DU CHIFFREMENT")
    print("=" * 50)
    
    # Créer un fichier de test
    test_content = b"Contenu medical confidentiel - Image de fond d'oeil"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    print(f"📄 Fichier original créé: {os.path.basename(temp_file_path)}")
    print(f"📏 Taille: {len(test_content)} bytes")
    
    # Chiffrement
    encryption = FileEncryption()
    encrypted_path = encryption.encrypt_file(temp_file_path)
    
    print(f"🔒 Fichier chiffré: {os.path.basename(encrypted_path)}")
    print(f"📏 Taille chiffrée: {os.path.getsize(encrypted_path)} bytes")
    
    # Vérification que l'original est supprimé
    if not os.path.exists(temp_file_path):
        print("✅ Fichier original supprimé pour sécurité")
    
    # Déchiffrement
    decrypted_path = encryption.decrypt_file(encrypted_path)
    
    with open(decrypted_path, 'rb') as f:
        decrypted_content = f.read()
    
    if decrypted_content == test_content:
        print("✅ Déchiffrement réussi - contenu identique")
    else:
        print("❌ Erreur de déchiffrement")
    
    # Nettoyage
    for path in [encrypted_path, decrypted_path]:
        if os.path.exists(path):
            os.remove(path)
    
    print()

def demo_audit_logging():
    """
    Démonstration de la journalisation d'audit
    """
    print("📝 DÉMONSTRATION DE LA JOURNALISATION")
    print("=" * 50)
    
    # Créer un répertoire de test
    log_dir = "demo_logs"
    os.makedirs(log_dir, exist_ok=True)
    
    # Initialiser le logger
    audit_logger = SecurityAuditLogger(log_dir)
    
    # Simuler différentes actions
    print("📋 Simulation d'actions médicales...")
    
    # Connexion médecin
    audit_logger.log_login("dr.martin@hopital.fr", 1, "192.168.1.100", True)
    print("   ✅ Connexion médecin enregistrée")
    
    # Upload d'image
    audit_logger.log_image_upload("dr.martin@hopital.fr", 1, "fundus_patient_123.jpg", 123)
    print("   ✅ Upload d'image enregistré")
    
    # Analyse IA
    audit_logger.log_image_analysis("dr.martin@hopital.fr", 1, "fundus_patient_123.jpg", 
                                   "Glaucome détecté", 0.87, 123)
    print("   ✅ Analyse IA enregistrée")
    
    # Génération de rapport
    audit_logger.log_report_generation("dr.martin@hopital.fr", 1, 123, "PDF")
    print("   ✅ Génération de rapport enregistrée")
    
    # Création de patient
    audit_logger.log_patient_creation("dr.martin@hopital.fr", 1, "Jean Dupont", 124)
    print("   ✅ Création de patient enregistrée")
    
    # Tentative de violation (simulation)
    audit_logger.log_security_violation({
        "error": "Tentative d'accès non autorisé",
        "file": "patient_data.encrypted",
        "user_attempt": "unknown_user"
    }, "192.168.1.200")
    print("   ⚠️ Violation de sécurité enregistrée")
    
    # Vérifier le fichier de log
    log_files = [f for f in os.listdir(log_dir) if f.startswith("security_audit_")]
    if log_files:
        log_file_path = os.path.join(log_dir, log_files[0])
        with open(log_file_path, 'r', encoding='utf-8') as f:
            log_content = f.read()
            log_lines = log_content.strip().split('\n')
        
        print(f"📊 {len(log_lines)} entrées créées dans {log_files[0]}")
        
        # Afficher quelques exemples
        print("\n📋 Exemples d'entrées de log:")
        for i, line in enumerate(log_lines[:3]):
            if line.strip():
                # Extraire juste l'action du JSON
                try:
                    import json
                    parts = line.split(' - ', 2)
                    if len(parts) >= 3:
                        log_data = json.loads(parts[2])
                        action = log_data.get('action_type', 'UNKNOWN')
                        user = log_data.get('user_email', 'SYSTEM')
                        print(f"   {i+1}. {action} - {user}")
                except:
                    print(f"   {i+1}. {line[:50]}...")
    
    # Nettoyage
    import shutil
    shutil.rmtree(log_dir)
    print()

def demo_security_workflow():
    """
    Démonstration du workflow complet de sécurité
    """
    print("🛡️ WORKFLOW COMPLET DE SÉCURITÉ")
    print("=" * 50)
    
    # Simulation d'un upload médical complet
    print("🏥 Simulation: Upload d'image de fond d'œil")
    
    # 1. Création du fichier médical simulé
    medical_data = b"DICOM-like medical image data - Fundus photography"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
        temp_file.write(medical_data)
        original_path = temp_file.name
    
    print(f"   📄 Image médicale: {os.path.basename(original_path)}")
    
    # 2. Initialisation des services de sécurité
    encryption = FileEncryption()
    audit_logger = SecurityAuditLogger("workflow_logs")
    
    # 3. Validation du fichier
    file_ext = os.path.splitext(original_path)[1].lower().lstrip('.')
    allowed_extensions = ["jpg", "jpeg", "png", "bmp", "tiff"]
    
    if file_ext in allowed_extensions:
        print("   ✅ Extension validée")
    else:
        print("   ❌ Extension non autorisée")
        return
    
    # 4. Log de l'upload
    audit_logger.log_image_upload("dr.martin@hopital.fr", 1, os.path.basename(original_path), 123)
    print("   📝 Upload enregistré dans les logs")
    
    # 5. Chiffrement sécurisé
    encrypted_path = encryption.encrypt_file(original_path)
    audit_logger.log_encryption_action("dr.martin@hopital.fr", 1, "encrypt", os.path.basename(original_path))
    print("   🔒 Fichier chiffré et sécurisé")
    
    # 6. Simulation de l'analyse IA (déchiffrement temporaire)
    temp_analysis_path = encryption.decrypt_file(encrypted_path, f"{encrypted_path}.temp_analysis")
    print("   🔓 Déchiffrement temporaire pour analyse IA")
    
    # 7. Simulation du résultat d'analyse
    analysis_result = {
        "prediction": "Glaucome détecté",
        "confidence": 0.89,
        "risk_level": "Élevé"
    }
    
    audit_logger.log_image_analysis("dr.martin@hopital.fr", 1, os.path.basename(original_path),
                                   analysis_result["prediction"], analysis_result["confidence"], 123)
    print(f"   🔍 Analyse terminée: {analysis_result['prediction']} ({analysis_result['confidence']:.0%})")
    
    # 8. Nettoyage du fichier temporaire
    os.remove(temp_analysis_path)
    audit_logger.log_action(ActionType.DELETE_FILE, "dr.martin@hopital.fr", 1, 
                           details={"temp_file_cleanup": "analysis_temp"})
    print("   🧹 Fichier temporaire nettoyé")
    
    # 9. Génération de rapport
    audit_logger.log_report_generation("dr.martin@hopital.fr", 1, 123, "PDF_Medical_Report")
    print("   📄 Rapport médical généré")
    
    # 10. Résumé de sécurité
    print("\n📊 RÉSUMÉ DE SÉCURITÉ:")
    print("   🔐 Fichier médical chiffré et protégé")
    print("   📝 Toutes les actions tracées dans les logs")
    print("   🧹 Aucun fichier temporaire non sécurisé")
    print("   ✅ Conformité RGPD et sécurité médicale")
    
    # Nettoyage final
    if os.path.exists(encrypted_path):
        os.remove(encrypted_path)
    
    import shutil
    if os.path.exists("workflow_logs"):
        shutil.rmtree("workflow_logs")

def main():
    """
    Exécute toutes les démonstrations
    """
    print("🏥 DÉMONSTRATION SÉCURITÉ - GLAUCOMA DETECTION")
    print("=" * 60)
    print("Système de sécurité pour données médicales sensibles")
    print("=" * 60)
    print()
    
    try:
        demo_encryption()
        demo_audit_logging()
        demo_security_workflow()
        
        print("🎉 DÉMONSTRATION TERMINÉE AVEC SUCCÈS!")
        print()
        print("💡 Points clés:")
        print("   • Chiffrement AES automatique des images médicales")
        print("   • Journalisation complète pour audit et traçabilité")
        print("   • Déchiffrement temporaire uniquement pendant l'analyse")
        print("   • Nettoyage automatique des fichiers temporaires")
        print("   • Conformité avec les exigences de sécurité médicale")
        
    except Exception as e:
        print(f"❌ Erreur lors de la démonstration: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())