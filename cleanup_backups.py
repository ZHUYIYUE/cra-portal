#!/usr/bin/env python3
"""清理旧备份文件，只保留最近7天的"""
import os, glob, datetime

BACKUP_DIR = os.path.join(os.path.dirname(__file__), 'backups')
KEEP_DAYS = 7

if not os.path.exists(BACKUP_DIR):
    print("No backups directory, nothing to clean.")
    exit(0)

cutoff = datetime.datetime.now() - datetime.timedelta(days=KEEP_DAYS)
removed = 0
for f in glob.glob(os.path.join(BACKUP_DIR, 'cra-portal-backup-*.json')):
    mtime = datetime.datetime.fromtimestamp(os.path.getmtime(f))
    if mtime < cutoff:
        os.remove(f)
        removed += 1
        print(f"Removed: {os.path.basename(f)} (from {mtime.strftime('%Y-%m-%d')})")

print(f"Cleanup done. Removed {removed} old backup(s), kept files newer than {cutoff.strftime('%Y-%m-%d')}.")
