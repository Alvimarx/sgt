#!/usr/bin/env bash
# ==============================================================
# Inicializa las DOS bases del SGT dentro del contenedor MySQL.
#
#   bash scripts/init_db.sh            # esquema + bootstrap + innhosp
#   SEED_DEMO=1 bash scripts/init_db.sh  # + poblado de demo (turnos de urgencias)
#
# Es seguro re-ejecutarlo: cada paso verifica si ya está aplicado.
# El orden importa (DDL_AUTO=validate: el esquema debe existir ANTES del backend).
# ==============================================================
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner"
ENV_FILE=".env.hetzner"

[ -f "$ENV_FILE" ] || { echo "ERROR: falta $ENV_FILE (copiar de .env.hetzner.example)"; exit 1; }
# shellcheck disable=SC1090
set -a; . "./$ENV_FILE"; set +a

# Ejecuta mysql y PROPAGA el código de salida: un error de SQL debe detener el script,
# no pasar inadvertido (regresión: un "No database selected" quedó oculto tras un `|| true`).
my() {
  local out rc
  out=$($COMPOSE exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 "$@" 2>&1); rc=$?
  printf '%s\n' "$out" | grep -v "Using a password on the command line" || true
  return $rc
}
q()  { $COMPOSE exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -B -e "$1" 2>/dev/null | tail -1; }

echo "==> Esperando a que MySQL esté listo..."
for i in $(seq 1 30); do
  if $COMPOSE exec -T mysql mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" >/dev/null 2>&1; then break; fi
  [ "$i" = 30 ] && { echo "ERROR: MySQL no respondió tras 150s"; exit 1; }
  sleep 5
done
echo "    MySQL responde."

# ---------- 1. Esquema de gestionturnos ----------
TABLAS=$(q "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='gestionturnos';")
if [ "${TABLAS:-0}" -eq 0 ]; then
  echo "==> [1/5] Creando esquema gestionturnos..."
  my < BaseDatosMySQL/despliegue/schema_gestionturnos.sql
else
  echo "==> [1/5] gestionturnos ya tiene $TABLAS tablas — omitido."
fi

# ---------- 2. Migración V2 (aditiva, NO idempotente en MySQL 8) ----------
# Se verifican los DOS objetos que crea la migración: la tabla y la columna. Guardar
# solo por la columna dejaba pasar el caso "columna sí, tabla no" (y viceversa).
TBL=$(q "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='gestionturnos' AND table_name='planificacion_ejecucion';")
COL=$(q "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='gestionturnos' AND table_name='Turnos' AND column_name='id_ejecucion';")
if [ "${TBL:-0}" -eq 0 ] || [ "${COL:-0}" -eq 0 ]; then
  echo "==> [2/5] Aplicando migración V2 (planificacion_ejecucion)..."
  # A diferencia del resto de los scripts, V2 NO trae "USE gestionturnos;": hay que
  # indicarle la base o MySQL falla con "No database selected".
  my gestionturnos < BaseDatosMySQL/migraciones/V2__planificacion_vigencia.sql
  TBL=$(q "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='gestionturnos' AND table_name='planificacion_ejecucion';")
  [ "${TBL:-0}" -eq 1 ] || { echo "ERROR: la migración V2 no creó planificacion_ejecucion."; exit 1; }
else
  echo "==> [2/5] Migración V2 ya aplicada — omitido."
fi

# ---------- 3. Bootstrap (roles, servicio inicial, admin de arranque) ----------
echo "==> [3/5] Bootstrap de catálogos y administrador (idempotente)..."
my < BaseDatosMySQL/despliegue/bootstrap_inicial.sql

# ---------- 4. innhosp (stand-in de la BD del hospital) ----------
# OJO: este script hace TRUNCATE de personalAux y carga usuarios de PRUEBA.
# Por eso solo corre si innhosp no existe todavía: nunca pisa datos reales.
INN=$(q "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='innhosp';")
if [ "${INN:-0}" -eq 0 ]; then
  echo "==> [4/5] Creando innhosp + vista viewPersonal + personal de prueba..."
  my < BaseDatosMySQL/despliegue/setup_innhosp.sql
else
  echo "==> [4/5] innhosp ya existe — OMITIDO (el script borraría personalAux)."
fi

# ---------- 5. Poblado de demo (opcional) ----------
if [ "${SEED_DEMO:-0}" = "1" ]; then
  SERV=$(q "SELECT COUNT(*) FROM gestionturnos.servicios;")
  if [ "${SERV:-0}" -le 1 ]; then
    echo "==> [5/5] Cargando poblado de demo (urgencias)..."
    my < BaseDatosMySQL/despliegue/poblado_urgencias_gestionturnos.sql
  else
    echo "==> [5/5] Ya hay $SERV servicios — poblado de demo omitido."
  fi
else
  echo "==> [5/5] SEED_DEMO no activo — sin datos de demo."
fi

# ---------- 6. Usuarios de aplicación con privilegio mínimo ----------
# El backend NUNCA usa root: R/W solo en gestionturnos, y SELECT solo sobre la
# vista viewPersonal (el datasource del hospital es read-only por diseño).
echo "==> Creando/actualizando usuarios de aplicación..."
my -e "
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'%' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USERNAME}'@'%' IDENTIFIED BY '${DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE ON gestionturnos.* TO '${DB_USERNAME}'@'%';
CREATE USER IF NOT EXISTS '${HOSPITAL_DB_USERNAME}'@'%' IDENTIFIED BY '${HOSPITAL_DB_PASSWORD}';
ALTER USER '${HOSPITAL_DB_USERNAME}'@'%' IDENTIFIED BY '${HOSPITAL_DB_PASSWORD}';
GRANT SELECT ON innhosp.viewPersonal TO '${HOSPITAL_DB_USERNAME}'@'%';
FLUSH PRIVILEGES;"

echo ""
echo "==> Resumen:"
echo "    gestionturnos: $(q "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='gestionturnos';") tablas, \
$(q "SELECT COUNT(*) FROM gestionturnos.Funcionario;") funcionarios, $(q "SELECT COUNT(*) FROM gestionturnos.servicios;") servicios"
echo "    innhosp: $(q "SELECT COUNT(*) FROM innhosp.viewPersonal;") personas en viewPersonal"
echo "    Listo. Ahora: $COMPOSE up -d backend frontend"
