#!/usr/bin/env bash
# Cópia de segurança consistente (base de dados + fotografias) para deploy/backups/.
# Sugestão de cron diário:  15 4 * * *  /caminho/para/deploy/backup.sh >/dev/null 2>&1
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups
stamp=$(date +%Y%m%d-%H%M)
docker compose exec -T gohan python - <<'PY'
import sqlite3
src = sqlite3.connect("/data/recipes.db"); dst = sqlite3.connect("/data/backup.db")
src.backup(dst); dst.close(); src.close()
PY
docker compose exec -T gohan tar -C /data -czf - backup.db uploads > "backups/gohan-${stamp}.tar.gz"
docker compose exec -T gohan rm -f /data/backup.db
# guarda as últimas 14
ls -1t backups/gohan-*.tar.gz | tail -n +15 | xargs -r rm -f
echo "backups/gohan-${stamp}.tar.gz"
