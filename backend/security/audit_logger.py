"""
Module de journalisation des actions sensibles pour audit et traçabilité
"""
import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum

class ActionType(Enum):
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    UPLOAD_IMAGE = "UPLOAD_IMAGE"
    ANALYZE_IMAGE = "ANALYZE_IMAGE"
    GENERATE_REPORT = "GENERATE_REPORT"
    CREATE_PATIENT = "CREATE_PATIENT"
    VIEW_PATIENT = "VIEW_PATIENT"
    DELETE_FILE = "DELETE_FILE"
    ENCRYPTION_ACTION = "ENCRYPTION_ACTION"
    SECURITY_VIOLATION = "SECURITY_VIOLATION"

class SecurityAuditLogger:
    def __init__(self, log_directory: str = "logs"):
        """
        Initialise le logger d'audit de sécurité
        """
        self.log_directory = log_directory
        os.makedirs(log_directory, exist_ok=True)
        
        # Configuration du logger
        self.logger = logging.getLogger("security_audit")
        self.logger.setLevel(logging.INFO)
        
        # Handler pour fichier de log quotidien
        log_filename = f"security_audit_{datetime.now().strftime('%Y%m%d')}.log"
        log_path = os.path.join(log_directory, log_filename)
        
        handler = logging.FileHandler(log_path, encoding='utf-8')
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        
        # Éviter les doublons de handlers
        if not self.logger.handlers:
            self.logger.addHandler(handler)
    
    def log_action(self, 
                   action_type: ActionType, 
                   user_email: str = None,
                   user_id: int = None,
                   details: Dict[str, Any] = None,
                   ip_address: str = None,
                   success: bool = True,
                   error_message: str = None):
        """
        Enregistre une action dans les logs d'audit
        """
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "action_type": action_type.value,
            "user_email": user_email,
            "user_id": user_id,
            "ip_address": ip_address,
            "success": success,
            "details": details or {},
            "error_message": error_message
        }
        
        # Log au format JSON pour faciliter l'analyse
        log_message = json.dumps(log_entry, ensure_ascii=False)
        
        if success:
            self.logger.info(log_message)
        else:
            self.logger.error(log_message)
    
    def log_login(self, user_email: str, user_id: int, ip_address: str = None, success: bool = True):
        """Log d'authentification"""
        self.log_action(
            ActionType.LOGIN,
            user_email=user_email,
            user_id=user_id,
            ip_address=ip_address,
            success=success,
            details={"login_attempt": True}
        )
    
    def log_image_upload(self, user_email: str, user_id: int, filename: str, patient_id: int = None):
        """Log d'upload d'image"""
        self.log_action(
            ActionType.UPLOAD_IMAGE,
            user_email=user_email,
            user_id=user_id,
            details={
                "filename": filename,
                "patient_id": patient_id,
                "file_type": "medical_image"
            }
        )
    
    def log_image_analysis(self, user_email: str, user_id: int, filename: str, 
                          prediction: str, confidence: float, patient_id: int = None):
        """Log d'analyse d'image"""
        self.log_action(
            ActionType.ANALYZE_IMAGE,
            user_email=user_email,
            user_id=user_id,
            details={
                "filename": filename,
                "prediction": prediction,
                "confidence": confidence,
                "patient_id": patient_id
            }
        )
    
    def log_report_generation(self, user_email: str, user_id: int, patient_id: int, report_type: str):
        """Log de génération de rapport"""
        self.log_action(
            ActionType.GENERATE_REPORT,
            user_email=user_email,
            user_id=user_id,
            details={
                "patient_id": patient_id,
                "report_type": report_type
            }
        )
    
    def log_patient_creation(self, user_email: str, user_id: int, patient_name: str, patient_id: int):
        """Log de création de patient"""
        self.log_action(
            ActionType.CREATE_PATIENT,
            user_email=user_email,
            user_id=user_id,
            details={
                "patient_name": patient_name,
                "patient_id": patient_id
            }
        )
    
    def log_encryption_action(self, user_email: str, user_id: int, action: str, filename: str):
        """Log d'action de chiffrement/déchiffrement"""
        self.log_action(
            ActionType.ENCRYPTION_ACTION,
            user_email=user_email,
            user_id=user_id,
            details={
                "encryption_action": action,
                "filename": filename
            }
        )
    
    def log_security_violation(self, details: Dict[str, Any], ip_address: str = None):
        """Log de violation de sécurité"""
        self.log_action(
            ActionType.SECURITY_VIOLATION,
            ip_address=ip_address,
            success=False,
            details=details
        )
    
    def get_logs_summary(self, days: int = 7) -> Dict[str, Any]:
        """
        Retourne un résumé des logs des derniers jours
        """
        # Cette méthode pourrait être étendue pour analyser les logs
        # et retourner des statistiques d'usage et de sécurité
        return {
            "period_days": days,
            "log_directory": self.log_directory,
            "message": "Analyse des logs disponible via les fichiers de log"
        }

# Instance globale du logger d'audit
audit_logger = SecurityAuditLogger()