"""
Visualiseur de logs d'audit pour le système de sécurité
"""
import os
import json
import argparse
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from typing import Dict, List, Any

class SecurityLogViewer:
    def __init__(self, log_directory: str = "logs"):
        self.log_directory = log_directory
        
    def get_log_files(self, days: int = 7) -> List[str]:
        """
        Récupère les fichiers de log des derniers jours
        """
        log_files = []
        
        if not os.path.exists(self.log_directory):
            return log_files
        
        # Calculer les dates à inclure
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        for i in range(days + 1):
            date = start_date + timedelta(days=i)
            log_filename = f"security_audit_{date.strftime('%Y%m%d')}.log"
            log_path = os.path.join(self.log_directory, log_filename)
            
            if os.path.exists(log_path):
                log_files.append(log_path)
        
        return log_files
    
    def parse_log_entry(self, line: str) -> Dict[str, Any]:
        """
        Parse une ligne de log
        """
        try:
            # Format: TIMESTAMP - LEVEL - JSON_DATA
            parts = line.strip().split(' - ', 2)
            if len(parts) >= 3:
                timestamp_str = parts[0]
                level = parts[1]
                json_data = parts[2]
                
                log_entry = json.loads(json_data)
                log_entry['log_level'] = level
                log_entry['log_timestamp'] = timestamp_str
                
                return log_entry
        except (json.JSONDecodeError, IndexError):
            pass
        
        return None
    
    def load_logs(self, days: int = 7) -> List[Dict[str, Any]]:
        """
        Charge tous les logs des derniers jours
        """
        log_files = self.get_log_files(days)
        all_logs = []
        
        for log_file in log_files:
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        log_entry = self.parse_log_entry(line)
                        if log_entry:
                            all_logs.append(log_entry)
            except Exception as e:
                print(f"Erreur lors de la lecture de {log_file}: {e}")
        
        # Trier par timestamp
        all_logs.sort(key=lambda x: x.get('timestamp', ''))
        
        return all_logs
    
    def generate_summary(self, days: int = 7) -> Dict[str, Any]:
        """
        Génère un résumé des activités de sécurité
        """
        logs = self.load_logs(days)
        
        if not logs:
            return {"message": "Aucun log trouvé", "period_days": days}
        
        # Statistiques générales
        total_actions = len(logs)
        action_types = Counter(log.get('action_type', 'UNKNOWN') for log in logs)
        users = Counter(log.get('user_email', 'UNKNOWN') for log in logs if log.get('user_email'))
        success_rate = sum(1 for log in logs if log.get('success', True)) / total_actions * 100
        
        # Activités par jour
        daily_activity = defaultdict(int)
        for log in logs:
            date = log.get('timestamp', '')[:10]  # YYYY-MM-DD
            daily_activity[date] += 1
        
        # Détection d'anomalies
        security_violations = [log for log in logs if log.get('action_type') == 'SECURITY_VIOLATION']
        failed_logins = [log for log in logs if log.get('action_type') == 'LOGIN' and not log.get('success', True)]
        
        # Top utilisateurs
        top_users = users.most_common(10)
        
        # Activités récentes (dernières 24h)
        recent_cutoff = (datetime.now() - timedelta(hours=24)).isoformat()
        recent_activities = [log for log in logs if log.get('timestamp', '') > recent_cutoff]
        
        return {
            "period_days": days,
            "total_actions": total_actions,
            "success_rate": round(success_rate, 2),
            "action_types": dict(action_types),
            "daily_activity": dict(daily_activity),
            "top_users": top_users,
            "security_violations": len(security_violations),
            "failed_logins": len(failed_logins),
            "recent_activities_24h": len(recent_activities),
            "violation_details": security_violations[-5:] if security_violations else [],
            "failed_login_details": failed_logins[-5:] if failed_logins else []
        }
    
    def show_user_activity(self, user_email: str, days: int = 7) -> List[Dict[str, Any]]:
        """
        Affiche l'activité d'un utilisateur spécifique
        """
        logs = self.load_logs(days)
        user_logs = [log for log in logs if log.get('user_email') == user_email]
        
        return user_logs
    
    def show_recent_activities(self, hours: int = 24) -> List[Dict[str, Any]]:
        """
        Affiche les activités récentes
        """
        logs = self.load_logs(days=7)  # Charger une semaine pour être sûr
        cutoff = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        recent_logs = [log for log in logs if log.get('timestamp', '') > cutoff]
        return recent_logs[-50:]  # Limiter à 50 entrées récentes

def print_summary(summary: Dict[str, Any]):
    """
    Affiche un résumé formaté
    """
    print("🔐 RÉSUMÉ DE SÉCURITÉ")
    print("=" * 50)
    print(f"📅 Période: {summary['period_days']} derniers jours")
    print(f"📊 Total d'actions: {summary['total_actions']}")
    print(f"✅ Taux de succès: {summary['success_rate']}%")
    print(f"🚨 Violations de sécurité: {summary['security_violations']}")
    print(f"🔑 Échecs de connexion: {summary['failed_logins']}")
    print(f"⏰ Activités récentes (24h): {summary['recent_activities_24h']}")
    
    print("\n📈 TYPES D'ACTIONS:")
    for action_type, count in summary['action_types'].items():
        print(f"   {action_type}: {count}")
    
    print("\n👥 TOP UTILISATEURS:")
    for user, count in summary['top_users']:
        print(f"   {user}: {count} actions")
    
    if summary['violation_details']:
        print("\n🚨 DERNIÈRES VIOLATIONS:")
        for violation in summary['violation_details']:
            timestamp = violation.get('timestamp', 'N/A')
            details = violation.get('details', {})
            print(f"   {timestamp}: {details.get('error', 'Violation inconnue')}")
    
    if summary['failed_login_details']:
        print("\n🔑 DERNIERS ÉCHECS DE CONNEXION:")
        for failed_login in summary['failed_login_details']:
            timestamp = failed_login.get('timestamp', 'N/A')
            user = failed_login.get('user_email', 'N/A')
            ip = failed_login.get('ip_address', 'N/A')
            print(f"   {timestamp}: {user} depuis {ip}")

def main():
    parser = argparse.ArgumentParser(description="Visualiseur de logs de sécurité")
    parser.add_argument("--days", type=int, default=7, help="Nombre de jours à analyser")
    parser.add_argument("--user", type=str, help="Afficher l'activité d'un utilisateur spécifique")
    parser.add_argument("--recent", type=int, help="Afficher les activités des X dernières heures")
    parser.add_argument("--summary", action="store_true", help="Afficher le résumé (par défaut)")
    
    args = parser.parse_args()
    
    viewer = SecurityLogViewer()
    
    if args.user:
        print(f"👤 ACTIVITÉ DE L'UTILISATEUR: {args.user}")
        print("=" * 50)
        user_logs = viewer.show_user_activity(args.user, args.days)
        for log in user_logs[-20:]:  # Dernières 20 actions
            timestamp = log.get('timestamp', 'N/A')
            action = log.get('action_type', 'N/A')
            success = "✅" if log.get('success', True) else "❌"
            print(f"{timestamp} {success} {action}")
    
    elif args.recent:
        print(f"⏰ ACTIVITÉS RÉCENTES ({args.recent}h)")
        print("=" * 50)
        recent_logs = viewer.show_recent_activities(args.recent)
        for log in recent_logs:
            timestamp = log.get('timestamp', 'N/A')
            action = log.get('action_type', 'N/A')
            user = log.get('user_email', 'N/A')
            success = "✅" if log.get('success', True) else "❌"
            print(f"{timestamp} {success} {action} - {user}")
    
    else:
        # Résumé par défaut
        summary = viewer.generate_summary(args.days)
        print_summary(summary)

if __name__ == "__main__":
    main()