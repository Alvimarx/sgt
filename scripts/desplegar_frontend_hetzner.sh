#!/usr/bin/env bash
# ==============================================================
# Despliega SOLO el frontend del SGT en la VM de Hetzner, sin construir allá.
#
# Por qué así: la VM (2 vCPU, ~4 GB) comparte espacio con otro sistema. El
# build de Vite pide hasta 2,5 GB y construir en la VM arriesga dejar sin
# memoria a lo demás. Aquí la imagen se construye en el notebook desde el
# último commit, que tiene que estar subido a GitHub; el checkout de la VM se
# pone al día con GitHub (la configuración de Apache sale de ahí) y en la VM
# solo se recrea el contenedor sgt-frontend (proyecto compose "sgt-huap").
# MySQL, backend y cualquier otro contenedor de la VM no se tocan. Detalle:
# docs/DESPLIEGUE_VM.md.
#
# Uso (desde la raíz del repo, con la sesión SSH configurada como "efeso"):
#   bash scripts/desplegar_frontend_hetzner.sh            # despliega HEAD
#   DATOS_DEMO=1 bash scripts/desplegar_frontend_hetzner.sh  # además genera turnos vigentes
#
# Variables (además de SSH_HOST y DIR_REMOTO, ver scripts/_hetzner_comun.sh):
#   URL_PUBLICA URL con que se abre el SGT       (por defecto http://167.233.77.149:8090)
#   DATOS_DEMO  1 = generar turnos de Urgencias desde el lunes actual (scripts/generar_turnos_demo.sh)
#
# Volver atrás: el script deja la imagen anterior etiquetada como
# sgt-frontend:previo-<fecha> e imprime el comando exacto para restaurarla.
# ==============================================================
set -euo pipefail

URL_PUBLICA="${URL_PUBLICA:-http://167.233.77.149:8090}"
DATOS_DEMO="${DATOS_DEMO:-0}"

RAIZ=$(git rev-parse --show-toplevel)
# shellcheck source=scripts/_hetzner_comun.sh
source "$RAIZ/scripts/_hetzner_comun.sh"
SHA=$(git -C "$RAIZ" rev-parse --short HEAD)
ETIQUETA="sgt-frontend:$SHA"
SELLO=$(date +%Y%m%d-%H%M)

# Las pruebas E2E y su configuración no entran en la imagen: no cuentan.
exigir_subido sgt-huap_frontend ':!sgt-huap_frontend/e2e' ':!sgt-huap_frontend/playwright.config.js' \
  apache/dev/httpd.conf docker-compose.hetzner.yml

echo "→ 1/6 Construyendo $ETIQUETA desde $RAMA_GH@$SHA (en este equipo)"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
git -C "$RAIZ" archive HEAD sgt-huap_frontend | tar -x -C "$TMP"
docker build -q -t "$ETIQUETA" --build-arg VITE_API_BASE_URL=/api/v2 "$TMP/sgt-huap_frontend"

echo "→ 2/6 Checkout de la VM"
actualizar_checkout_vm

echo "→ 3/6 Subiendo la imagen a $SSH_HOST (comprimida)"
docker save "$ETIQUETA" | gzip -1 | ssh "$SSH_HOST" 'gunzip | docker load'

echo "→ 4/6 Recreando solo sgt-frontend (la imagen actual queda como sgt-frontend:previo-$SELLO)"
ssh "$SSH_HOST" bash -s <<REMOTO
set -euo pipefail
cd "$DIR_REMOTO"
if docker image inspect sgt-frontend:latest >/dev/null 2>&1; then
  docker tag sgt-frontend:latest "sgt-frontend:previo-$SELLO"
fi
docker tag "$ETIQUETA" sgt-frontend:latest
docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner up -d --no-build --no-deps frontend
docker ps --filter name=sgt- --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
REMOTO

echo "→ 5/6 Verificación"
ssh "$SSH_HOST" 'curl -fsS http://127.0.0.1:8090/api/v2/health && echo && curl -fsSI http://127.0.0.1:8090/ | head -1 && curl -fsS http://127.0.0.1:8090/ | grep -o "assets/index-[A-Za-z0-9_-]*\.js" | head -1'

if [[ "$DATOS_DEMO" == "1" ]]; then
  echo "→ 6/6 Turnos de demostración vigentes en el servidor"
  API="$URL_PUBLICA/api/v2" ORIGEN="$URL_PUBLICA" bash "$RAIZ/scripts/generar_turnos_demo.sh"
else
  echo "→ 6/6 Sin datos de demo (DATOS_DEMO=1 para generar turnos de Urgencias desde el lunes actual)"
fi

cat <<FIN

Listo: $URL_PUBLICA  ($RAMA_GH@$SHA)
Para volver a la versión anterior:
  ssh $SSH_HOST 'cd $DIR_REMOTO && docker tag sgt-frontend:previo-$SELLO sgt-frontend:latest && docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner up -d --no-build --no-deps frontend'
FIN
