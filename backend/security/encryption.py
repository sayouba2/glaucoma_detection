"""
Module de chiffrement AES pour sécuriser les fichiers images et rapports
"""
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)

class FileEncryption:
    def __init__(self, password: str = None):
        """
        Initialise le système de chiffrement avec une clé dérivée du mot de passe
        """
        if not password:
            password = os.getenv("ENCRYPTION_KEY", "default_glaucoma_key_2024")
        
        # Génération d'une clé à partir du mot de passe
        salt = b'glaucoma_salt_2024'  # Salt fixe pour la cohérence
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        self.cipher = Fernet(key)
    
    def encrypt_file(self, file_path: str) -> str:
        """
        Chiffre un fichier et retourne le chemin du fichier chiffré
        """
        try:
            with open(file_path, 'rb') as file:
                file_data = file.read()
            
            # Chiffrement des données
            encrypted_data = self.cipher.encrypt(file_data)
            
            # Sauvegarde du fichier chiffré
            encrypted_path = f"{file_path}.encrypted"
            with open(encrypted_path, 'wb') as encrypted_file:
                encrypted_file.write(encrypted_data)
            
            # Suppression du fichier original pour sécurité
            os.remove(file_path)
            
            logger.info(f"Fichier chiffré: {file_path} -> {encrypted_path}")
            return encrypted_path
            
        except Exception as e:
            logger.error(f"Erreur lors du chiffrement de {file_path}: {str(e)}")
            raise
    
    def decrypt_file(self, encrypted_path: str, output_path: str = None) -> str:
        """
        Déchiffre un fichier et retourne le chemin du fichier déchiffré
        """
        try:
            with open(encrypted_path, 'rb') as encrypted_file:
                encrypted_data = encrypted_file.read()
            
            # Déchiffrement des données
            decrypted_data = self.cipher.decrypt(encrypted_data)
            
            # Chemin de sortie
            if not output_path:
                output_path = encrypted_path.replace('.encrypted', '')
            
            # Sauvegarde du fichier déchiffré
            with open(output_path, 'wb') as decrypted_file:
                decrypted_file.write(decrypted_data)
            
            logger.info(f"Fichier déchiffré: {encrypted_path} -> {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Erreur lors du déchiffrement de {encrypted_path}: {str(e)}")
            raise
    
    def encrypt_data(self, data: bytes) -> bytes:
        """
        Chiffre des données en mémoire
        """
        return self.cipher.encrypt(data)
    
    def decrypt_data(self, encrypted_data: bytes) -> bytes:
        """
        Déchiffre des données en mémoire
        """
        return self.cipher.decrypt(encrypted_data)
    
    def is_encrypted_file(self, file_path: str) -> bool:
        """
        Vérifie si un fichier est chiffré
        """
        return file_path.endswith('.encrypted')