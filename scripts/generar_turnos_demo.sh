#!/usr/bin/env bash
# ==============================================================
# Genera turnos de demostración vigentes con la propia Planificación del SGT.
#
# El seed de desarrollo trae pocos turnos de Urgencias (3 días). Este script
# entra a la API como el administrador de desarrollo y genera el molde
# "Rotativa 2026" de Urgencias desde el lunes de la semana actual por N
# semanas, igual que lo haría una persona desde la pantalla Planificación.
#
# Solo para ambientes de desarrollo o demo con el seed ficticio
# (BaseDatosMySQL/desarrollo/): usa la clave común de desarrollo.
#
# Uso:
#   bash scripts/generar_turnos_demo.sh                  # 7 semanas, http://localhost:8080
#   SEMANAS=4 API=http://localhost:8090/api/v2 bash scripts/generar_turnos_demo.sh
#
# Variables:
#   API      base de la API         (por defecto http://localhost:8080/api/v2)
#   ORIGEN   cabecera Origin (CORS) (por defecto http://localhost:5173)
#   RUT      administrador          (por defecto 11111111-1, Admin Bootstrap)
#   CLAVE    su clave               (por defecto la de desarrollo)
#   SERVICIO id del servicio        (por defecto 4, Urgencias)
#   MOLDE    id de la planificación (por defecto 1, "Rotativa 2026")
#   SEMANAS  semanas a generar      (por defecto 7)
# ==============================================================
set -euo pipefail

API="${API:-http://localhost:8080/api/v2}"
ORIGEN="${ORIGEN:-http://localhost:5173}"
RUT="${RUT:-11111111-1}"
CLAVE="${CLAVE:-huap2025}"
SERVICIO="${SERVICIO:-4}"
MOLDE="${MOLDE:-1}"
SEMANAS="${SEMANAS:-7}"

json_campo() { sed -n "s/.*\"$1\":\"\([^\"]*\)\".*/\1/p"; }

post() {
  local ruta="$1" cuerpo="$2" token="${3:-}"
  local auth=()
  [[ -n "$token" ]] && auth=(-H "Authorization: Bearer $token")
  curl -sS -X POST "$API$ruta" -H "Origin: $ORIGEN" -H 'Content-Type: application/json' "${auth[@]}" -d "$cuerpo"
}

# Lunes de la semana actual en Chile continental (aprox. UTC−3).
HOY=$(TZ=America/Santiago date +%F)
DOW=$(TZ=America/Santiago date +%u)
LUNES=$(date -d "$HOY -$((DOW - 1)) days" +%F)
FIN=$(date -d "$LUNES +$((SEMANAS * 7 - 1)) days" +%F)

echo "→ login de $RUT"
PRE=$(post /funcionarios/login "{\"rut\":\"$RUT\",\"password\":\"$CLAVE\"}" | json_campo preAuthToken)
[[ -n "$PRE" ]] || { echo "No se pudo iniciar sesión (¿API arriba? ¿CORS?)" >&2; exit 1; }
TOKEN=$(post /funcionarios/login/select-service "{\"preAuthToken\":\"$PRE\",\"servicioId\":$SERVICIO}" | json_campo token)
[[ -n "$TOKEN" ]] || { echo "No se pudo seleccionar el servicio $SERVICIO" >&2; exit 1; }

CUERPO="{\"fechaInicioRotativa\":\"$LUNES\",\"fechaInicioEfectiva\":\"$LUNES\",\"fechaFinEfectiva\":\"$FIN\"}"

echo "→ conflictos del molde $MOLDE entre $LUNES y $FIN"
post "/planificaciones/$MOLDE/conflictos" "$CUERPO" "$TOKEN"
echo

echo "→ generando turnos"
post "/planificaciones/$MOLDE/generar" "$CUERPO" "$TOKEN" | head -c 600
echo
