import os
import time
import logging
import asyncio

logger = logging.getLogger("Cleaner")

def remove_old_files(directory: str, ttl_minutes: int):
    if not os.path.exists(directory):
        return

    now = time.time()
    ttl_seconds = ttl_minutes * 60
    files_removed = 0

    # On utilise os.listdir pour lister le contenu
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        try:
            if os.path.isfile(file_path):
                file_age = now - os.path.getmtime(file_path)
                if file_age > ttl_seconds:
                    os.remove(file_path)
                    files_removed += 1
                    logger.info(f"🧹 Supprimé : {filename}")
        except Exception as e:
            logger.error(f"Erreur sur {filename} : {e}")

    if files_removed > 0:
        logger.info(f"--- Nettoyage : {files_removed} fichiers supprimés ---")

# 👇 C'EST CETTE FONCTION QUE L'ERREUR NE TROUVAIT PAS
async def start_cleanup_loop(directory: str, ttl_minutes: int, interval_seconds: int = 60):
    logger.info(f"Service de nettoyage démarré (TTL: {ttl_minutes}min)")
    while True:
        remove_old_files(directory, ttl_minutes)
        await asyncio.sleep(interval_seconds)