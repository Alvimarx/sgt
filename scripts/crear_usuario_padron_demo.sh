#!/usr/bin/env bash
# ==============================================================
# Crea (o actualiza) el usuario MySQL del simulador del padron (SOLO DEMO).
#
# Permisos minimos, solo sobre las tablas de personal de innhosp:
#   - personalAux: SELECT, INSERT, y UPDATE solo de las columnas estado y clave
#     (sin DELETE: sacar a alguien del padron es cambiarle el estado)
#   - conf_estados: SELECT (nombre del estado)
# La vista viewPersonal y el resto de las bases quedan fuera.
#
# La clave sale de la variable de entorno PADRON_DB_PASSWORD. Si no esta, se lee del
# archivo de entorno del modo (.env.hetzner o .env.local, ignorados por Git). Nunca
# se pasa por la linea de comandos ni se imprime.
#
#   # VM (desde /opt/sgt; usa scripts/mysql.sh, o sea el MySQL del compose de la VM):
#   PADRON_DB_PASSWORD=... bash scripts/crear_usuario_padron_demo.sh vm
#   # Local (contenedor huap-db-local):
#   PADRON_DB_PASSWORD=... bash scripts/crear_usuario_padron_demo.sh local
#
# Variables opcionales: PADRON_DB_USER (por defecto padron_demo).
# ==============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

MODO="${1:-}"
case "$MODO" in
  vm)    ARCHIVO_ENV=.env.hetzner ;;
  local) ARCHIVO_ENV=.env.local ;;
  *) echo "Uso: PADRON_DB_PASSWORD=... bash scripts/crear_usuario_padron_demo.sh vm|local" >&2; exit 2 ;;
esac

# Lee una variable de un archivo de entorno SIN ejecutarlo (en .env.local hay URLs con &).
# Toma la ÚLTIMA aparición, igual que docker compose con --env-file: si una variable quedó repetida,
# el usuario de MySQL y el contenedor usan la misma clave.
leer_env() { [ -f "$ARCHIVO_ENV" ] && grep "^$1=" "$ARCHIVO_ENV" | tail -n1 | cut -d= -f2- || true; }

USUARIO="${PADRON_DB_USER:-$(leer_env PADRON_DB_USER)}"
USUARIO="${USUARIO:-padron_demo}"
CLAVE="${PADRON_DB_PASSWORD:-$(leer_env PADRON_DB_PASSWORD)}"

if [ -z "$CLAVE" ]; then
  echo "ERROR: falta PADRON_DB_PASSWORD (variable de entorno o $ARCHIVO_ENV). No se crea nada." >&2
  exit 1
fi
# Se interpola dentro de SQL: solo caracteres seguros, y largo minimo.
if ! [[ "$CLAVE" =~ ^[A-Za-z0-9._@%^*-]{16,}$ ]]; then
  echo "ERROR: PADRON_DB_PASSWORD debe tener 16 o mas caracteres de [A-Za-z0-9._@%^*-]." >&2
  exit 1
fi
if ! [[ "$USUARIO" =~ ^[A-Za-z0-9_]{3,32}$ ]]; then
  echo "ERROR: PADRON_DB_USER invalido (letras, numeros y _)." >&2
  exit 1
fi

SQL="
CREATE USER IF NOT EXISTS '${USUARIO}'@'%' IDENTIFIED BY '${CLAVE}';
ALTER USER '${USUARIO}'@'%' IDENTIFIED BY '${CLAVE}';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${USUARIO}'@'%';
GRANT SELECT, INSERT ON innhosp.personalAux TO '${USUARIO}'@'%';
GRANT UPDATE (estado, clave) ON innhosp.personalAux TO '${USUARIO}'@'%';
GRANT SELECT ON innhosp.conf_estados TO '${USUARIO}'@'%';
FLUSH PRIVILEGES;
SHOW GRANTS FOR '${USUARIO}'@'%';"

echo "==> Creando/actualizando el usuario MySQL '${USUARIO}' (${MODO})..."
if [ "$MODO" = vm ]; then
  # El SQL entra por stdin: la clave no aparece en la lista de procesos.
  printf '%s\n' "$SQL" | bash scripts/mysql.sh
else
  printf '%s\n' "$SQL" | docker exec -i huap-db-local sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 2>/dev/null'
fi
echo "==> Listo. Variables del servicio: PADRON_DB_USER=${USUARIO}, PADRON_DB_PASSWORD (la misma clave)."
