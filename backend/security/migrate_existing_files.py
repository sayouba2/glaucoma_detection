"""
Script de migration pour chiffrer les fichiers existants
À exécuter une seule fois lors de la mise en place de la sécurité
"""
import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

# Ajouter le chemin parent pour les imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from uploads.main import Analysis, DATABASE_URL
from security.encryption import FileEncryption

def migrate_existing_files():
    """
    Chiffre tous les fichiers existants et met à jour la base de données
    """
    print("🔐 Début de la migration des fichiers existants...")
    
    # Initialisation
    encryption = FileEncryption()
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    upload_directory = "uploaded_images"
    migrated_count = 0
    error_count = 0
    
    try:
        # Récupérer toutes les analyses
        analyses = db.execute(select(Analysis)).scalars().all()
        
        for analysis in analyses:
            filename = analysis.filename
            
            # Ignorer les fichiers déjà chiffrés
            if filename.endswith('.encrypted'):
                print(f"⏭️  Fichier déjà chiffré: {filename}")
                continue
            
            file_path = os.path.join(upload_directory, filename)
            
            # Vérifier que le fichier existe
            if not os.path.exists(file_path):
                print(f"⚠️  Fichier introuvable: {filename}")
                continue
            
            try:
                # Chiffrer le fichier
                encrypted_path = encryption.encrypt_file(file_path)
                encrypted_filename = os.path.basename(encrypted_path)
                
                # Mettre à jour la base de données
                analysis.filename = encrypted_filename
                db.commit()
                
                print(f"✅ Fichier chiffré: {filename} -> {encrypted_filename}")
                migrated_count += 1
                
            except Exception as e:
                print(f"❌ Erreur lors du chiffrement de {filename}: {str(e)}")
                error_count += 1
                db.rollback()
    
    except Exception as e:
        print(f"❌ Erreur générale: {str(e)}")
        db.rollback()
    
    finally:
        db.close()
    
    print(f"\n📊 Migration terminée:")
    print(f"   ✅ Fichiers chiffrés: {migrated_count}")
    print(f"   ❌ Erreurs: {error_count}")
    
    if migrated_count > 0:
        print(f"\n🔒 {migrated_count} fichiers ont été sécurisés avec succès!")
    
    return migrated_count, error_count

def verify_migration():
    """
    Vérifie que la migration s'est bien déroulée
    """
    print("\n🔍 Vérification de la migration...")
    
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    upload_directory = "uploaded_images"
    
    try:
        analyses = db.execute(select(Analysis)).scalars().all()
        encrypted_count = 0
        missing_count = 0
        
        for analysis in analyses:
            filename = analysis.filename
            file_path = os.path.join(upload_directory, filename)
            
            if filename.endswith('.encrypted'):
                if os.path.exists(file_path):
                    encrypted_count += 1
                else:
                    missing_count += 1
                    print(f"⚠️  Fichier chiffré manquant: {filename}")
        
        print(f"📊 Résultats de vérification:")
        print(f"   🔐 Fichiers chiffrés présents: {encrypted_count}")
        print(f"   ⚠️  Fichiers manquants: {missing_count}")
        
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Script de migration de sécurité - Glaucoma Detection")
    print("=" * 60)
    
    # Vérifier que nous sommes dans le bon répertoire
    if not os.path.exists("uploaded_images"):
        print("❌ Erreur: Le dossier 'uploaded_images' n'existe pas.")
        print("   Assurez-vous d'exécuter ce script depuis le dossier backend/uploads/")
        sys.exit(1)
    
    # Demander confirmation
    response = input("\n⚠️  Cette opération va chiffrer tous les fichiers existants. Continuer? (y/N): ")
    if response.lower() != 'y':
        print("❌ Migration annulée.")
        sys.exit(0)
    
    # Exécuter la migration
    migrated, errors = migrate_existing_files()
    
    # Vérification
    if migrated > 0:
        verify_migration()
    
    print("\n🎉 Migration terminée!")