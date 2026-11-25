#!/usr/bin/env bash
# Atualiza para a versão mais recente do código (faz backup antes).
set -euo pipefail
cd "$(dirname "$0")"
./backup.sh
git -C .. pull --ff-only
docker compose up -d --build
docker image prune -f >/dev/null
echo "Atualizado."
