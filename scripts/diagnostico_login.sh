#!/usr/bin/env bash
# ==============================================================
# Diagnostica por qué un RUT puede o no iniciar sesión.
#   bash scripts/diagnostico_login.sh 30000002-2
#
# Revisa, en orden, los tres requisitos que impone el backend:
#   1. El RUT existe en innhosp.viewPersonal  (el login SIEMPRE se valida ahí)
#   2. estado = 1 (activo) y la clave corresponde a huap2025
#   3. El RUT existe en gestionturnos.Funcionario (para operar dentro del sistema)
# ==============================================================
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -ge 1 ] || { echo "uso: bash scripts/diagnostico_login.sh <rut>   (ej: 30000002-2)"; exit 1; }

set -a; . ./.env.hetzner; set +a
COMPOSE="docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner"

# El backend limpia el RUT igual que acá: quita todo lo que no sea dígito o K,
# y descarta el ÚLTIMO carácter como dígito verificador.
CLEAN=$(printf '%s' "$1" | tr -d -c '0-9Kk' | tr '[:lower:]' '[:upper:]')
RUT="${CLEAN%?}"
DV="${CLEAN: -1}"
echo "RUT ingresado: $1  ->  busca rut='$RUT' (dv '$DV')"
echo ""

$COMPOSE exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -t 2>/dev/null <<SQL
SET @clave_dev = SHA2('huap2025', 512);
SELECT
  (SELECT COUNT(*) FROM innhosp.viewPersonal WHERE rut = '$RUT')                          AS en_viewPersonal,
  (SELECT COUNT(*) FROM innhosp.viewPersonal WHERE rut = '$RUT' AND estado = 1)           AS activo,
  (SELECT COUNT(*) FROM innhosp.viewPersonal WHERE rut = '$RUT' AND clave = @clave_dev)   AS clave_es_huap2025,
  (SELECT COUNT(*) FROM gestionturnos.Funcionario WHERE Rut = '$RUT' AND eliminado = 0)   AS en_funcionario;
SELECT rut, dv, nombre, apel_pat, estado, LENGTH(clave) AS largo_clave
  FROM innhosp.viewPersonal WHERE rut = '$RUT';
SQL

cat <<'TXT'

Cómo leer el resultado:
  en_viewPersonal = 0  -> la persona NO puede entrar: no existe en la BD del hospital.
                          Solución: agregarla a personalAux (ver personal_urgencias_innhosp.sql).
  activo = 0           -> existe pero está inactiva (estado <> 1): el login la rechaza.
  clave_es_huap2025=0  -> la clave guardada no es huap2025.
  en_funcionario = 0   -> entra, pero no está dada de alta en el SGT: hay que registrarla
                          desde el panel de administración.
  largo_clave debe ser 128 (hash SHA-512 en hexadecimal). Otro valor = dato mal cargado.
TXT
