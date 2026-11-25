#!/usr/bin/env bash
# Instala ou atualiza o Gohan neste servidor. Correr a partir da pasta deploy/.
set -euo pipefail
cd "$(dirname "$0")"

command -v docker >/dev/null || { echo "Falta o Docker: https://docs.docker.com/engine/install/"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Falta o plugin 'docker compose'."; exit 1; }

if [ ! -f .env ]; then
  cp .env.example .env
  code=$(head -c 18 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 12)
  sed -i "s/^SIGNUP_CODE=.*/SIGNUP_CODE=${code}/" .env
  chmod 600 .env
  echo "Criei deploy/.env (código de registo: ${code})."
  echo "Preenche DOMAIN, ACME_EMAIL, ANTHROPIC_API_KEY e VAPID_SUBJECT e volta a correr ./install.sh"
  exit 0
fi

set -a; . ./.env; set +a
for v in DOMAIN ANTHROPIC_API_KEY SIGNUP_CODE; do
  [ -n "${!v:-}" ] || { echo "Falta $v em deploy/.env"; exit 1; }
done
[ "$DOMAIN" != "gohan.exemplo.pt" ] || { echo "Muda DOMAIN em deploy/.env para o teu domínio."; exit 1; }

echo "A construir e a arrancar…"
docker compose up -d --build

echo -n "A aguardar que a app responda"
for i in $(seq 1 60); do
  if docker compose exec -T gohan curl -fsS http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo " ok"; break; fi
  echo -n "."; sleep 2
done
docker compose ps
echo
echo "Pronto: https://${DOMAIN}"
echo "Cria a primeira conta com o código de registo: ${SIGNUP_CODE:-(ver deploy/.env)}"
echo "Depois cria um grupo e partilha o convite com os teus amigos."
