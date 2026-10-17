#!/usr/bin/env bash
# ==============================================================
# Despliega SOLO el backend del SGT en la VM de Hetzner, sin construir allá.
#
# Igual que desplegar_frontend_hetzner.sh: la imagen se construye en este
# equipo desde el último commit, que tiene que estar subido a GitHub; el
# checkout de la VM se pone al día con GitHub (compose, configuración y SQL),
# y en la VM solo se recrea el contenedor sgt-backend (proyecto compose
# "sgt-huap"). MySQL, el frontend y cualquier otro contenedor de la VM no se
# tocan. Detalle: docs/DESPLIEGUE_VM.md.
#
# Uso (desde cualquier carpeta, con la sesión SSH configurada como "efeso"):
#   bash scripts/desplegar_backend_hetzner.sh
#
# Variables (además de SSH_HOST y DIR_REMOTO, ver scripts/_hetzner_comun.sh):
#   MIGRACIONES_APLICADAS  1 = ya aplicaste a mano las migraciones nuevas de
#                          BaseDatosMySQL/migraciones/ en la base de la VM
#
# Corte: la API no responde mientras arranca el backend nuevo (1 a 2 min).
# Volver atrás: el script deja la imagen anterior etiquetada como
# sgt-backend:previo-<fecha> e imprime el comando exacto para restaurarla.
# ==============================================================
set -euo pipefail

RAIZ=$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)
# shellcheck source=scripts/_hetzner_comun.sh
source "$RAIZ/scripts/_hetzner_comun.sh"

SHA=$(git -C "$RAIZ" rev-parse --short HEAD)
ETIQUETA="sgt-backend:$SHA"
SELLO=$(date +%Y%m%d-%H%M)
MARCA="$DIR_REMOTO/.sgt-backend-desplegado"

exigir_subido huap_backend docker-compose.hetzner.yml BaseDatosMySQL/migraciones

echo "→ 1/5 Construyendo $ETIQUETA desde $RAMA_GH@$SHA (en este equipo; Maven dentro de Docker, unos minutos)"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
git -C "$RAIZ" archive HEAD huap_backend | tar -x -C "$TMP"
docker build -q -t "$ETIQUETA" "$TMP/huap_backend"

echo "→ 2/5 Checkout de la VM"
actualizar_checkout_vm
# Migraciones nuevas desde el último backend desplegado por este script.
NUEVAS=$(ssh "$SSH_HOST" bash -s -- "$DIR_REMOTO" "$MARCA" <<'REMOTO'
set -euo pipefail
cd "$1"
if [[ -f "$2" ]]; then git diff --name-only "$(cat "$2")" HEAD -- BaseDatosMySQL/migraciones; fi
REMOTO
)
if [[ -n "$NUEVAS" && "${MIGRACIONES_APLICADAS:-0}" != "1" ]]; then
  echo "✗ Hay migraciones nuevas desde el último backend desplegado:" >&2
  echo "$NUEVAS" | sed 's/^/    /' >&2
  echo "  Aplícalas en la VM con scripts/mysql.sh (docs/DESPLIEGUE_VM.md) y vuelve a correr con MIGRACIONES_APLICADAS=1." >&2
  exit 1
fi

echo "→ 3/5 Subiendo la imagen a $SSH_HOST (comprimida)"
docker save "$ETIQUETA" | gzip -1 | ssh "$SSH_HOST" 'gunzip | docker load'

echo "→ 4/5 Recreando solo sgt-backend (la imagen actual queda como sgt-backend:previo-$SELLO)"
ssh "$SSH_HOST" bash -s -- "$DIR_REMOTO" "$ETIQUETA" "$SELLO" <<'REMOTO'
set -euo pipefail
cd "$1"
if docker image inspect sgt-backend:latest >/dev/null 2>&1; then
  docker tag sgt-backend:latest "sgt-backend:previo-$3"
fi
docker tag "$2" sgt-backend:latest
docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner up -d --no-build --no-deps backend
REMOTO

echo "→ 5/5 Esperando que el backend responda (hasta 4 min)"
ssh "$SSH_HOST" bash -s <<'REMOTO'
for _ in $(seq 1 48); do
  if curl -fsS http://127.0.0.1:8090/api/v2/health 2>/dev/null; then echo; exit 0; fi
  sleep 5
done
echo "✗ El backend no respondió en 4 minutos. Últimas líneas del log:" >&2
docker logs --tail 60 sgt-backend >&2
exit 1
REMOTO
ssh "$SSH_HOST" "git -C '$DIR_REMOTO' rev-parse HEAD > '$MARCA' && docker ps --filter name=sgt- --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'"

cat <<FIN

Listo: backend $RAMA_GH@$SHA en la VM.
Para volver a la versión anterior:
  ssh $SSH_HOST 'cd $DIR_REMOTO && docker tag sgt-backend:previo-$SELLO sgt-backend:latest && docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner up -d --no-build --no-deps backend'
FIN
