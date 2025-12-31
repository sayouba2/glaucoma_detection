"""
Service de sécurité local pour éviter les problèmes d'imports
"""
import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'security'))

from encryption import FileEncryption
from audit_logger import SecurityAuditLogger, ActionType

class SecurityService:
    def __init__(self):
        self.encryption = FileEncryption()
        self.audit_logger = SecurityAuditLogger()
        self.enabled = True
    
    def secure_file_upload(self, file_path: str, user_email: str, user_id: int, patient_id: int = None):
        """Sécurise un fichier uploadé : chiffrement + audit"""
        try:
            # Chiffrement
            encrypted_path = self.encryption.encrypt_file(file_path)
            
            # Audit
            if self.enabled:
                filename = os.path.basename(file_path)
                self.audit_logger.log_image_upload(user_email, user_id, filename, patient_id)
                self.audit_logger.log_encryption_action(user_email, user_id, "encrypt", filename)
            
            return encrypted_path
        except Exception as e:
            if self.enabled:
                self.audit_logger.log_security_violation({
                    "error": "File encryption failed",
                    "file_path": file_path,
                    "user_email": user_email,
                    "error_message": str(e)
                })
            raise
    
    def secure_file_access(self, encrypted_path: str, user_email: str, user_id: int, temp_access: bool = True):
        """Accès sécurisé à un fichier chiffré"""
        try:
            if temp_access:
                temp_path = f"{encrypted_path}.temp_{user_id}"
                decrypted_path = self.encryption.decrypt_file(encrypted_path, temp_path)
            else:
                decrypted_path = self.encryption.decrypt_file(encrypted_path)
            
            if self.enabled:
                filename = os.path.basename(encrypted_path)
                self.audit_logger.log_encryption_action(user_email, user_id, "decrypt", filename)
            
            return decrypted_path
        except Exception as e:
            if self.enabled:
                self.audit_logger.log_security_violation({
                    "error": "File decryption failed",
                    "encrypted_path": encrypted_path,
                    "user_email": user_email,
                    "error_message": str(e)
                })
            raise
    
    def cleanup_temp_file(self, temp_path: str, user_email: str, user_id: int):
        """Nettoie les fichiers temporaires"""
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
                if self.enabled:
                    filename = os.path.basename(temp_path)
                    self.audit_logger.log_action(
                        ActionType.DELETE_FILE,
                        user_email=user_email,
                        user_id=user_id,
                        details={"temp_file_cleanup": filename}
                    )
        except Exception as e:
            if self.enabled:
                self.audit_logger.log_security_violation({
                    "error": "Temp file cleanup failed",
                    "temp_path": temp_path,
                    "error_message": str(e)
                })