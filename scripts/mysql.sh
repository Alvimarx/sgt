#!/usr/bin/env bash
# ==============================================================
# Consola/carga MySQL con el charset CORRECTO, siempre.
#
# Dentro del contenedor mysql:8.0 el cliente `mysql` sin flags negocia latin1
# (locale POSIX): cualquier acento cargado así queda doble-codificado y la app
# muestra "Ãlvaro LÃ³pez". TODO comando manual debe pasar por este wrapper.
#
#   bash scripts/mysql.sh                        # consola interactiva
#   bash scripts/mysql.sh innhosp < archivo.sql  # cargar script en una BD
#   bash scripts/mysql.sh -e "SELECT ..."        # consulta suelta
# ==============================================================
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.hetzner; set +a
T="-T"; [ -t 0 ] && T=""   # TTY interactivo solo si stdin es una terminal
exec docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner \
  exec $T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 "$@"
