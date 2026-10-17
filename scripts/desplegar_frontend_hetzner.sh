#!/usr/bin/env bash
# ==============================================================
# Despliega SOLO el frontend del SGT en la VM de Hetzner, sin construir allá.
#
# Por qué así: la VM (2 vCPU, ~4 GB) comparte espacio con otro sistema. El
# build de Vite pide hasta 2,5 GB (ver .pilot/DEPLOY.md) y construir en la VM
# arriesga dejar sin memoria a lo demás. Aquí la imagen se construye en el
# notebook desde el último commit, se sube ya hecha y en la VM solo se
# recrea el contenedor sgt-frontend (proyecto compose "sgt-huap"). MySQL,
# backend y cualquier otro contenedor de la VM no se tocan.
#
# Uso (desde la raíz del repo, con la sesión SSH configurada como "efeso"):
#   bash scripts/desplegar_frontend_hetzner.sh            # despliega HEAD
#   DATOS_DEMO=1 bash scripts/desplegar_frontend_hetzner.sh  # además genera turnos vigentes
#
# Variables:
#   SSH_HOST    alias o usuario@host de la VM   (por defecto efeso)
#   DIR_REMOTO  carpeta del repo en la VM       (por defecto /opt/sgt)
#   URL_PUBLICA URL con que se abre el SGT       (por defecto http://167.233.77.149:8090)
#   DATOS_DEMO  1 = generar turnos de Urgencias desde el lunes actual (scripts/generar_turnos_demo.sh)
#
# Volver atrás: el script deja la imagen anterior etiquetada como
# sgt-frontend:previo-<fecha> e imprime el comando exacto para restaurarla.
# ==============================================================
set -euo pipefail

SSH_HOST="${SSH_HOST:-efeso}"
DIR_REMOTO="${DIR_REMOTO:-/opt/sgt}"
URL_PUBLICA="${URL_PUBLICA:-http://167.233.77.149:8090}"
DATOS_DEMO="${DATOS_DEMO:-0}"

RAIZ=$(git rev-parse --show-toplevel)
SHA=$(git -C "$RAIZ" rev-parse --short HEAD)
RAMA=$(git -C "$RAIZ" branch --show-current)
ETIQUETA="sgt-frontend:r18-$SHA"
SELLO=$(date +%Y%m%d-%H%M)

if [[ -n "$(git -C "$RAIZ" status --porcelain -- sgt-huap_frontend)" ]]; then
  echo "⚠ Hay cambios sin commit en sgt-huap_frontend/: se despliega el último commit ($SHA), no el árbol de trabajo." >&2
fi

echo "→ 1/5 Construyendo $ETIQUETA desde $RAMA@$SHA (en este equipo)"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
git -C "$RAIZ" archive HEAD sgt-huap_frontend | tar -x -C "$TMP"
docker build -q -t "$ETIQUETA" --build-arg VITE_API_BASE_URL=/api/v2 "$TMP/sgt-huap_frontend"

echo "→ 2/5 Subiendo la imagen a $SSH_HOST (comprimida)"
docker save "$ETIQUETA" | gzip -1 | ssh "$SSH_HOST" 'gunzip | docker load'

echo "→ 3/5 Recreando solo sgt-frontend (la imagen actual queda como sgt-frontend:previo-$SELLO)"
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

echo "→ 4/5 Verificación"
ssh "$SSH_HOST" 'curl -fsS http://127.0.0.1:8090/api/v2/health && echo && curl -fsSI http://127.0.0.1:8090/ | head -1'

if [[ "$DATOS_DEMO" == "1" ]]; then
  echo "→ 5/5 Turnos de demostración vigentes en el servidor"
  API="$URL_PUBLICA/api/v2" ORIGEN="$URL_PUBLICA" bash "$RAIZ/scripts/generar_turnos_demo.sh"
else
  echo "→ 5/5 Sin datos de demo (DATOS_DEMO=1 para generar turnos de Urgencias desde el lunes actual)"
fi

cat <<FIN

Listo: $URL_PUBLICA  ($RAMA@$SHA)
Para volver a la versión anterior:
  ssh $SSH_HOST 'cd $DIR_REMOTO && docker tag sgt-frontend:previo-$SELLO sgt-frontend:latest && docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner up -d --no-build --no-deps frontend'
FIN
