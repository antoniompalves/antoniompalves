#!/usr/bin/env bash
# Atualiza para a versão mais recente do código (faz backup antes).
set -euo pipefail
cd "$(dirname "$0")"
./backup.sh
if git -C .. rev-parse --git-dir >/dev/null 2>&1; then
  git -C .. pull --ff-only
else
  echo "Instalação a partir de arquivo: extrai o gohan-*.tar.gz novo por cima desta pasta antes de correr isto."
fi
docker compose up -d --build
docker image prune -f >/dev/null
echo "Atualizado."
