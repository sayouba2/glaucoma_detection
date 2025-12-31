"""
Service de sécurité intégré pour le projet Glaucoma Detection
Combine chiffrement et audit logging
"""
import os
import shutil
from typing import Optional, Dict, Any
from fastapi import Request
from .encryption import FileEncryption
from .audit_logger import SecurityAuditLogger, ActionType

class SecurityService:
    def __init__(self):
        """
        Initialise le service de sécurité avec chiffrement et audit
        """
        self.encryption = FileEncryption()
        self.audit_logger = SecurityAuditLogger()
        self.enabled = os.getenv("ENABLE_AUDIT_LOGS", "true").lower() == "true"
    
    def secure_file_upload(self, 
                          file_path: str, 
                          user_email: str, 
                          user_id: int, 
                          patient_id: int = None,
                          request: Request = None) -> str:
        """
        Sécurise un fichier uploadé : chiffrement + audit
        """
        try:
            # 1. Chiffrement du fichier
            encrypted_path = self.encryption.encrypt_file(file_path)
            
            # 2. Log d'audit
            if self.enabled:
                filename = os.path.basename(file_path)
                ip_address = self._get_client_ip(request) if request else None
                
                self.audit_logger.log_image_upload(
                    user_email=user_email,
                    user_id=user_id,
                    filename=filename,
                    patient_id=patient_id
                )
                
                self.audit_logger.log_encryption_action(
                    user_email=user_email,
                    user_id=user_id,
                    action="encrypt",
                    filename=filename
                )
            
            return encrypted_path
            
        except Exception as e:
            # Log d'erreur de sécurité
            if self.enabled:
                self.audit_logger.log_security_violation({
                    "error": "File encryption failed",
                    "file_path": file_path,
                    "user_email": user_email,
                    "error_message": str(e)
                })
            raise
    
    def secure_file_access(self, 
                          encrypted_path: str, 
                          user_email: str, 
                          user_id: int,
                          temp_access: bool = True) -> str:
        """
        Accès sécurisé à un fichier chiffré : déchiffrement temporaire + audit
        """
        try:
            # 1. Déchiffrement temporaire
            if temp_access:
                # Créer un fichier temporaire pour l'accès
                temp_path = f"{encrypted_path}.temp_{user_id}"
                decrypted_path = self.encryption.decrypt_file(encrypted_path, temp_path)
            else:
                decrypted_path = self.encryption.decrypt_file(encrypted_path)
            
            # 2. Log d'audit
            if self.enabled:
                filename = os.path.basename(encrypted_path)
                self.audit_logger.log_encryption_action(
                    user_email=user_email,
                    user_id=user_id,
                    action="decrypt",
                    filename=filename
                )
            
            return decrypted_path
            
        except Exception as e:
            # Log d'erreur de sécurité
            if self.enabled:
                self.audit_logger.log_security_violation({
                    "error": "File decryption failed",
                    "encrypted_path": encrypted_path,
                    "user_email": user_email,
                    "error_message": str(e)
                })
            raise
    
    def cleanup_temp_file(self, temp_path: str, user_email: str, user_id: int):
        """
        Nettoie les fichiers temporaires déchiffrés
        """
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
    
    def log_user_login(self, user_email: str, user_id: int, request: Request = None, success: bool = True):
        """
        Log d'authentification utilisateur
        """
        if self.enabled:
            ip_address = self._get_client_ip(request) if request else None
            self.audit_logger.log_login(user_email, user_id, ip_address, success)
    
    def log_analysis_result(self, 
                           user_email: str, 
                           user_id: int, 
                           filename: str,
                           prediction: str, 
                           confidence: float, 
                           patient_id: int = None):
        """
        Log des résultats d'analyse
        """
        if self.enabled:
            self.audit_logger.log_image_analysis(
                user_email=user_email,
                user_id=user_id,
                filename=filename,
                prediction=prediction,
                confidence=confidence,
                patient_id=patient_id
            )
    
    def log_patient_creation(self, user_email: str, user_id: int, patient_name: str, patient_id: int):
        """
        Log de création de patient
        """
        if self.enabled:
            self.audit_logger.log_patient_creation(user_email, user_id, patient_name, patient_id)
    
    def log_report_generation(self, user_email: str, user_id: int, patient_id: int, report_type: str = "PDF"):
        """
        Log de génération de rapport
        """
        if self.enabled:
            self.audit_logger.log_report_generation(user_email, user_id, patient_id, report_type)
    
    def validate_file_security(self, file_path: str, max_size_mb: int = None) -> Dict[str, Any]:
        """
        Valide la sécurité d'un fichier avant traitement
        """
        if not max_size_mb:
            max_size_mb = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
        
        allowed_extensions = os.getenv("ALLOWED_IMAGE_EXTENSIONS", "jpg,jpeg,png,bmp,tiff").split(",")
        
        # Vérification de l'extension
        file_ext = os.path.splitext(file_path)[1].lower().lstrip('.')
        if file_ext not in allowed_extensions:
            return {
                "valid": False,
                "error": f"Extension non autorisée: {file_ext}",
                "allowed_extensions": allowed_extensions
            }
        
        # Vérification de la taille
        if os.path.exists(file_path):
            file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
            if file_size_mb > max_size_mb:
                return {
                    "valid": False,
                    "error": f"Fichier trop volumineux: {file_size_mb:.2f}MB (max: {max_size_mb}MB)",
                    "file_size_mb": file_size_mb
                }
        
        return {"valid": True}
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Extrait l'adresse IP du client
        """
        # Vérifier les headers de proxy
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # IP directe
        return request.client.host if request.client else "unknown"
    
    def get_security_stats(self) -> Dict[str, Any]:
        """
        Retourne des statistiques de sécurité
        """
        return {
            "encryption_enabled": True,
            "audit_logging_enabled": self.enabled,
            "log_directory": self.audit_logger.log_directory,
            "max_file_size_mb": os.getenv("MAX_FILE_SIZE_MB", "10"),
            "allowed_extensions": os.getenv("ALLOWED_IMAGE_EXTENSIONS", "jpg,jpeg,png,bmp,tiff").split(",")
        }

# Instance globale du service de sécurité
security_service = SecurityService()