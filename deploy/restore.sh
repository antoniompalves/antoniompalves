#!/usr/bin/env bash
# Repõe uma cópia de segurança: ./restore.sh backups/gohan-AAAAMMDD-HHMM.tar.gz
set -euo pipefail
cd "$(dirname "$0")"
f=${1:?Indica o ficheiro de backup}
read -rp "Isto substitui os dados atuais pelos de $f. Continuar? [s/N] " ok; [ "$ok" = "s" ] || exit 1
docker compose stop gohan
docker compose run --rm -T --entrypoint sh gohan -c 'cd /data && tar -xzf - && mv -f backup.db recipes.db && rm -f recipes.db-wal recipes.db-shm' < "$f"
docker compose start gohan
echo "Reposto."
