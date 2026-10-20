#!/usr/bin/env bash
# ==============================================================
# Genera la rotativa completa de Urgencias con la propia aplicación.
#
# Entra a la API como administrador y hace, en este orden, lo mismo que haría
# una persona desde la pantalla Planificación:
#   1. Completa el molde «Rotativa 2026»: cada cupo (rotativa × puesto) sin
#      médico recibe un médico de Urgencias que no esté en otro puesto del
#      molde (solo rol MEDICO y activos; nunca jefaturas). Meta: PORCENTAJE.
#   2. Genera los turnos de las 6 rotativas de Urgencias para DESDE–HASTA,
#      con el ciclo de 42 días anclado para que «Lunes Turno (T III)» calce con
#      el calendario real: en octubre de 2026, Día el 5, 12, 19 y 24, y Noche
#      el 6, 13, 20, 25 y 30 (el índice 0 de la secuencia cae el lunes 19 oct).
#   3. Verifica contra la API (no supone nada) y muestra el resumen.
#
# Uso (en la VM, desde /opt/sgt):
#   SIMULAR=1 bash scripts/generar_rotativa_urgencias.sh      # muestra qué haría; no cambia nada
#   bash scripts/generar_rotativa_urgencias.sh                # genera (pide RUT y clave)
#   REEMPLAZAR=1 bash scripts/generar_rotativa_urgencias.sh   # rehace desde mañana lo que ya exista
#   RESTAURAR_MOLDE=backups/molde-urgencias-AAAAMMDD-HHMMSS.json bash scripts/generar_rotativa_urgencias.sh
#
# Requisitos: bash, curl, python3 (solo para leer JSON) y date de GNU.
# No usa SQL: todo sale de los endpoints de la aplicación.
#
# Variables:
#   API          base de la API         (por defecto http://127.0.0.1:<PUBLIC_PORT de .env.hetzner, o 8090>/api/v2:
#                                        el puerto que publica el frontend, que hace de proxy de /api/v2)
#   RUT, CLAVE   administrador; si faltan, los pide (la clave con read -s). Sin valores por defecto.
#   SERVICIO_NOMBRE  servicio                         (por defecto Urgencias)
#   MOLDE_NOMBRE     planificación (molde)            (por defecto «Rotativa 2026»)
#   DESDE, HASTA     rango a generar, inclusive       (por defecto 2026-10-01 y 2026-12-31).
#                    La aplicación acepta generar fechas pasadas; el rango parte donde lo pidas.
#   ANCLA        lunes en que cae el índice 0 del ciclo; sirve cualquier lunes equivalente
#                módulo 42 días (7 sep, 27 jul, 30 nov…)  (por defecto 2026-10-19)
#   PORCENTAJE   mínimo de cupos llenos (turnos con médico), en %   (por defecto 80)
#   SIMULAR=1    muestra el plan y no cambia nada
#   REEMPLAZAR=1 si ya hay turnos o vigencias en el rango, los rehace desde mañana
#   EXCLUIR      ids de funcionario que no se deben asignar nunca (separados por espacio o coma)
#   REGLAS       reglas de horario del servicio a aplicar, por nombre y separadas por | (por defecto ninguna:
#                Día 08–20 y Noche 20–08 todos los días). La vigencia de agosto que trae el seed de la VM
#                (turnos_agosto2026_urgencias.sql) se generó con «Regla urgencias» (+60 min en fines de
#                semana y feriados); REGLAS="Regla urgencias" las aplica
#   ESPERA       segundos que espera la respuesta de la generación (por defecto 600). Si se agota o el
#                proxy corta, NO reintenta: mira durante 5 min si la vigencia se creó
#   ORIGEN       cabecera Origin opcional (CORS); sin ella, la API no aplica CORS
#   RESTAURAR_MOLDE  archivo de respaldo del molde (ver «Cómo deshacerlo»)
#   T3_ROTATIVA, T3_MES, T3_DIA, T3_NOCHE, T3_HASTA  calendario real contra el que se verifica
#                (Lunes Turno (T III), 2026-10, «5 12 19 24», «6 13 20 25 30», día 30; vacíos = no verifica)
#
# Cómo fija el ancla: el backend calcula el día del ciclo como
#   indice = (día − fechaInicioRotativa) módulo (semanas × 7)      (PlanificacionService.indiceDelDia)
# y exige que fechaInicioRotativa sea lunes y no posterior al inicio efectivo. El script
# toma el lunes ≡ ANCLA (módulo 42) más cercano hacia atrás desde el primer día que genera
# (para DESDE=2026-10-01 es el lunes 7 sep) y lo envía como fechaInicioRotativa.
# Antes de tocar nada comprueba que la secuencia de T III con ese ancla da el calendario real.
#
# Seguridad (es un servidor con uso real):
#   - Si en el rango ya hay turnos generados o vigencias activas, SE DETIENE y los lista.
#   - Con REEMPLAZAR=1 usa el mecanismo de la aplicación: acorta o anula la vigencia
#     («Acortar»/«Anular») y «Eliminar turnos generados» para los turnos sin vigencia (legado),
#     siempre desde mañana. NUNCA borra turnos ya empezados ni turnos con solicitudes u ofertas:
#     lo empezado se conserva y la generación nueva parte después; si un turno futuro tiene
#     solicitudes u ofertas, se detiene sin tocar nada y lo lista.
#   - Todas las comprobaciones se hacen antes del primer cambio.
#
# Qué toca: las filas del molde (solo agrega médicos a cupos libres, o filas vacías para que cada
# cupo exista; guarda el estado anterior en backups/), una vigencia nueva (planificacion_ejecucion),
# sus turnos y la bitácora de generación. Con REEMPLAZAR=1 además acorta/anula vigencias y borra
# (soft-delete) turnos futuros. No toca personas, claves, solicitudes ni ofertas.
#
# Cómo deshacerlo:
#   - Turnos: en la aplicación, Planificación → vigencia → «Anular» (o DELETE
#     /api/v2/planificaciones/ejecuciones/<id>); el script imprime el id de la vigencia creada.
#   - Molde: RESTAURAR_MOLDE=<archivo de backups/ que imprime el script> deja las filas como estaban.
#
# Salida: 0 bien; 1 error; 2 se detuvo por seguridad (nada cambió); 3 terminó pero no cumple la
# meta de cupos llenos o T III no calza con el calendario.
# ==============================================================
set -euo pipefail
# Una ruta relativa de RESTAURAR_MOLDE se entiende desde donde se llamó al script, no desde la raíz del repo.
if [[ -n "${RESTAURAR_MOLDE:-}" ]]; then RESTAURAR_MOLDE=$(realpath -m -- "$RESTAURAR_MOLDE" 2>/dev/null || echo "$RESTAURAR_MOLDE"); fi
cd "$(dirname "$0")/.."

# --- Parámetros ----------------------------------------------------------------------------------
PUERTO_FRONTEND=$(sed -n 's/^PUBLIC_PORT=//p' .env.hetzner 2>/dev/null | tail -n 1 | tr -d "\"' \r" || true)
[[ "$PUERTO_FRONTEND" =~ ^[0-9]+$ ]] || PUERTO_FRONTEND=8090
API="${API:-http://127.0.0.1:$PUERTO_FRONTEND/api/v2}"
ORIGEN="${ORIGEN:-}"
RUT="${RUT:-}"
CLAVE="${CLAVE:-}"
SERVICIO_NOMBRE="${SERVICIO_NOMBRE:-Urgencias}"
MOLDE_NOMBRE="${MOLDE_NOMBRE:-Rotativa 2026}"
ROTATIVAS="${ROTATIVAS:-Miercoles Turno (T I)|Martes Turno (T II)|Lunes Turno (T III)|Viernes Turno (T IV)|Jueves Turno (T V)|Volante (T VOL)}"
DESDE="${DESDE:-2026-10-01}"
HASTA="${HASTA:-2026-12-31}"
ANCLA="${ANCLA:-2026-10-19}"
PORCENTAJE="${PORCENTAJE:-80}"
SIMULAR="${SIMULAR:-0}"
REEMPLAZAR="${REEMPLAZAR:-0}"
EXCLUIR="${EXCLUIR:-}"
RESTAURAR_MOLDE="${RESTAURAR_MOLDE:-}"
ESPERA="${ESPERA:-600}"
REGLAS="${REGLAS:-}"
T3_ROTATIVA="${T3_ROTATIVA-Lunes Turno (T III)}"
T3_MES="${T3_MES-2026-10}"
T3_DIA="${T3_DIA-5 12 19 24}"
T3_NOCHE="${T3_NOCHE-6 13 20 25 30}"
T3_HASTA="${T3_HASTA-30}"

# --- Utilidades ----------------------------------------------------------------------------------
paso()  { echo "→ $*"; }
aviso() { echo "⚠ $*" >&2; }
fallo() { echo "✗ $*" >&2; exit 1; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
HTTP=000

# api METODO RUTA [ARCHIVO_CUERPO] [SEGUNDOS]
#   Deja el cuerpo de la respuesta en $TMP/resp.json y el código HTTP en $HTTP (000 = sin respuesta).
#   El token va en un archivo temporal (-H @archivo) para que no aparezca en la lista de procesos.
api() {
  local metodo="$1" ruta="$2" cuerpo="${3:-}" limite="${4:-60}"
  local args=(-sS --connect-timeout 15 --max-time "$limite" -o "$TMP/resp.json" -w '%{http_code}' -X "$metodo" -H 'Accept: application/json')
  if [[ -n "$ORIGEN" ]]; then args+=(-H "Origin: $ORIGEN"); fi
  if [[ -s "$TMP/auth" ]]; then args+=(-H "@$TMP/auth"); fi
  if [[ -n "$cuerpo" ]]; then args+=(-H 'Content-Type: application/json' --data-binary "@$cuerpo"); fi
  : > "$TMP/resp.json"
  HTTP=$(curl "${args[@]}" "$API$ruta" 2>"$TMP/curl.err") || HTTP=000
}
api_ok() { [[ "$HTTP" =~ ^2[0-9][0-9]$ ]]; }

# jv ARCHIVO clave... : valor anidado de un JSON (vacío si no existe). Los números de lista van como clave.
jv() {
  python3 -I -c '
import json, sys
try:
    v = json.load(open(sys.argv[1], encoding="utf-8"))
    for k in sys.argv[2:]:
        v = v[int(k)] if isinstance(v, list) else v[k]
except Exception:
    v = None
if v is None:
    v = ""
print(v if not isinstance(v, (dict, list)) else json.dumps(v))
' "$@"
}

# Mensaje de error de la última respuesta (campo error/message, o el texto cortado).
api_msg() {
  if [[ "$HTTP" == "000" ]]; then head -c 300 "$TMP/curl.err" | tr '\n' ' '; return; fi
  python3 -I -c '
import json, sys
t = open(sys.argv[1], encoding="utf-8", errors="replace").read()
try:
    d = json.loads(t)
    m = (d.get("error") or d.get("message") or d.get("mensaje")) if isinstance(d, dict) else None
    print(m if m else t[:300])
except Exception:
    print(t[:300].replace("\n", " "))
' "$TMP/resp.json"
}

# leer ETIQUETA RUTA ARCHIVO [SEGUNDOS] : GET que debe salir bien; guarda el JSON en $TMP/ARCHIVO.
leer() {
  api GET "$2" "" "${4:-120}"
  api_ok || fallo "No pude leer $1 (GET $2): HTTP $HTTP. $(api_msg)"
  mv "$TMP/resp.json" "$TMP/$3"
}

# --- Motor: lee los JSON y calcula el plan y el resumen (python3, solo la parte de datos) --------
IFS= read -r -d '' MOTOR <<'PY' || true
import io, json, os, sys, unicodedata
from datetime import date, datetime, timedelta

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)
TMP = os.environ.get('TMP', '.')


def env(k, d=''):
    return os.environ.get(k, d)


def cargar(nombre):
    with open(os.path.join(TMP, nombre), encoding='utf-8') as f:
        return json.load(f)


def fecha(s):
    return datetime.strptime(str(s)[:10], '%Y-%m-%d').date()


def norm(s):
    s = unicodedata.normalize('NFKD', s or '')
    return ' '.join(''.join(c for c in s if not unicodedata.combining(c)).lower().split())


def minutos(hhmm):
    p = str(hhmm).split(':')
    return int(p[0]) * 60 + int(p[1])


def pct(a, b):
    return 100.0 * a / b if b else 0.0


def coma(x, dec=1):
    return ('%.*f' % (dec, x)).replace('.', ',')


def terminar(msg, codigo=1):
    print('✗ ' + msg, file=sys.stderr)
    sys.exit(codigo)


def linea(etiqueta, valor):
    print('  %-27s %s' % (etiqueta, valor))


def escribir(nombre, texto):
    with open(os.path.join(TMP, nombre), 'w', encoding='utf-8') as f:
        f.write(texto)


def secuencia(r):
    """indice -> lista de (inicio_min, fin_min, nombre) de los turnos de ese día del ciclo."""
    s = {}
    for d in r.get('secuenciaDias') or []:
        t = d.get('turno')
        if t:
            s.setdefault(int(d['diaIndex']), []).append(
                (minutos(t['horaInicio']), minutos(t['horaTermino']), t.get('nombre') or ''))
    return s


def clase_turno(inicio, nombre):
    n = norm(nombre)
    if n in ('dia', 'noche'):
        return 'Día' if n == 'dia' else 'Noche'
    return 'Día' if inicio == 8 * 60 else ('Noche' if inicio == 20 * 60 else nombre)


def cupos_molde(filas, ids_rot, puestos):
    """Cupos = rotativa × puesto. Devuelve (total, llenos)."""
    cupos = set((r, p) for p in puestos for r in ids_rot)
    llenos = set((f['idRotativa'], f['idPuesto']) for f in filas
                 if f['idFuncionario'] is not None and f['idPuesto'] is not None)
    return len(cupos), len(llenos & cupos)


def contexto():
    """Lo común a plan y resumen: servicio, rotativas, puestos, molde."""
    c = {}
    c['sid'] = int(env('ID_SERVICIO'))
    c['sn'] = env('SERVICIO_NOMBRE')
    rots = cargar('rotativas.json')
    por_nombre = dict((norm(r['nombre']), r) for r in rots)
    seis = []
    for n in [x for x in env('ROTATIVAS').split('|') if x.strip()]:
        r = por_nombre.get(norm(n))
        if r is None:
            terminar('No encuentro la rotativa «%s» en %s. Rotativas del servicio: %s'
                     % (n, c['sn'], ', '.join(sorted(x['nombre'] for x in rots))))
        seis.append(r)
    ciclos = set(int(r['semanas']) * 7 for r in seis)
    if len(ciclos) != 1:
        terminar('Las rotativas de %s no tienen el mismo largo de ciclo (%s días); el ancla no sería única.'
                 % (c['sn'], ', '.join(str(x) for x in sorted(ciclos))))
    c['ciclo'] = ciclos.pop()
    c['rots'] = rots
    c['por_nombre'] = por_nombre
    c['por_id'] = dict((r['idRotativa'], r) for r in rots)
    c['seis'] = seis
    c['ids6'] = [r['idRotativa'] for r in seis]
    c['seq'] = dict((r['idRotativa'], secuencia(r)) for r in rots)
    c['ciclo_de'] = dict((r['idRotativa'], int(r['semanas']) * 7) for r in rots)
    c['puestos'] = sorted(p['idPuesto'] for p in cargar('puestos.json') if not p.get('eliminado'))
    cand = [p for p in cargar('planes.json') if norm(p['nombre']) == norm(env('MOLDE_NOMBRE'))]
    if len(cand) != 1:
        terminar('No encuentro (o hay más de una) planificación «%s» en %s.' % (env('MOLDE_NOMBRE'), c['sn']))
    c['molde'] = cand[0]
    return c


def filas_de(molde):
    filas, descartadas = [], 0
    for a in molde.get('asignaciones') or []:
        if a.get('idRotativa') is None:
            descartadas += 1
            continue
        filas.append({'idRotativa': a['idRotativa'], 'idFuncionario': a.get('idFuncionario'),
                      'idPuesto': a.get('idPuesto')})
    return filas, descartadas


def calendario_t3(c, ref, mes):
    """Días Día/Noche de la rotativa T III según su secuencia y el ancla de referencia."""
    r = c['por_nombre'].get(norm(env('T3_ROTATIVA')))
    if r is None:
        return None
    y, m = [int(x) for x in mes.split('-')]
    d = date(y, m, 1)
    obt = {'Día': set(), 'Noche': set()}
    while d.month == m:
        idx = (d - ref).days % c['ciclo_de'][r['idRotativa']]
        for (ini, fin, nombre) in c['seq'][r['idRotativa']].get(idx, []):
            k = clase_turno(ini, nombre)
            if k in obt:
                obt[k].add(d.day)
        d += timedelta(days=1)
    return obt


def esperado_t3():
    dia = set(int(x) for x in env('T3_DIA').split())
    noche = set(int(x) for x in env('T3_NOCHE').split())
    tope = int(env('T3_HASTA') or '0')
    return {'Día': dia, 'Noche': noche}, tope


def tabla_t3(obtenido, esperado, tope, titulo, detalle=None):
    """Imprime la tabla esperado/obtenido; devuelve True si coinciden en los días 1..tope."""
    ok = True
    print('  %s' % titulo)
    print('  %-7s %-22s %-26s %s' % ('turno', 'esperado (calendario)', 'obtenido', 'coincide'))
    for k in ('Día', 'Noche'):
        e = sorted(x for x in esperado[k] if x <= tope)
        o = sorted(x for x in obtenido[k] if x <= tope)
        extra = sorted(x for x in obtenido[k] if x > tope)
        igual = (e == o)
        ok = ok and igual
        txt = ' '.join(str(x) for x in o) or '—'
        dif = ''
        if not igual:
            faltan = [x for x in e if x not in o]
            sobran = [x for x in o if x not in e]
            dif = 'NO' + (' faltan ' + ' '.join(str(x) for x in faltan) if faltan else '') + \
                  (' sobran ' + ' '.join(str(x) for x in sobran) if sobran else '')
        print('  %-7s %-22s %-26s %s' % (k, ' '.join(str(x) for x in e) or '—', txt, dif or 'sí'))
        if extra:
            print('          (además, fuera de los días 1..%d: %s)' % (tope, ' '.join(str(x) for x in extra)))
    if detalle:
        for k in ('Día', 'Noche'):
            partes = ['%d:%d/%d' % (d, detalle[k][d][0], detalle[k][d][1]) for d in sorted(detalle[k])]
            if partes:
                print('  cupos por día de %-6s (turnos/con médico): %s' % (k, ' '.join(partes)))
    return ok


def plan():
    c = contexto()
    desde, hasta, ref = fecha(env('DESDE')), fecha(env('HASTA')), fecha(env('ANCLA'))
    hoy = fecha(env('HOY'))
    manana = hoy + timedelta(days=1)
    ahora = env('AHORA')
    meta = float(env('PORCENTAJE').replace(',', '.'))
    reemplazar = env('REEMPLAZAR') == '1'
    excluir = set(int(x) for x in env('EXCLUIR').replace(',', ' ').split())
    ciclo, ids6, seq, por_id = c['ciclo'], c['ids6'], c['seq'], c['por_id']
    motivos = []          # por qué se detendría
    acciones = []

    # --- Reglas de horario pedidas (por nombre) -----------------------------------------------
    ids_reglas, nombres_reglas = [], []
    pedidas = [x.strip() for x in env('REGLAS').split('|') if x.strip()]
    if pedidas:
        reglas = cargar('reglas.json')
        for n in pedidas:
            hit = [r for r in reglas if norm(r.get('nombre')) == norm(n)]
            if len(hit) != 1:
                terminar('No encuentro (o hay más de una) regla de horario «%s» en %s. Reglas: %s'
                         % (n, c['sn'], ', '.join(r.get('nombre', '') for r in reglas) or 'ninguna'))
            ids_reglas.append(hit[0]['idRegla'])
            nombres_reglas.append(hit[0]['nombre'])

    # --- Molde y cupos -----------------------------------------------------------------------
    antes, descartadas = filas_de(c['molde'])
    filas = [dict(f) for f in antes]
    total, llenos_antes = cupos_molde(filas, ids6, c['puestos'])
    usados = set(f['idFuncionario'] for f in filas if f['idFuncionario'] is not None)
    candidatos = []
    for f in cargar('funcionarios.json'):
        if f.get('estado') != 1 or f['idFuncionario'] in excluir:
            continue
        for s in f.get('servicios') or []:
            if s.get('idServicio') == c['sid'] and norm(s.get('rolServicioNombre')) == 'medico':
                candidatos.append(f['idFuncionario'])
                break
    pool = [m for m in sorted(set(candidatos)) if m not in usados]
    n_pool = len(pool)
    cupos = [(r, p) for p in c['puestos'] for r in ids6]
    llenos = set((f['idRotativa'], f['idPuesto']) for f in filas
                 if f['idFuncionario'] is not None and f['idPuesto'] is not None)
    por_llenar = [x for x in cupos if x not in llenos]
    rellenadas = nuevas_con = nuevas_sin = 0
    for (r, p) in por_llenar:
        existente = None
        for f in filas:
            if f['idRotativa'] == r and f['idPuesto'] == p:
                existente = f
                break
        if pool:
            m = pool.pop(0)
            if existente is not None:
                existente['idFuncionario'] = m
                rellenadas += 1
            else:
                filas.append({'idRotativa': r, 'idFuncionario': m, 'idPuesto': p})
                nuevas_con += 1
        elif existente is None:
            filas.append({'idRotativa': r, 'idFuncionario': None, 'idPuesto': p})
            nuevas_sin += 1
    _, llenos_despues = cupos_molde(filas, ids6, c['puestos'])
    hay_cambio = bool(rellenadas or nuevas_con or nuevas_sin or descartadas)

    # --- Qué existe en el rango --------------------------------------------------------------
    ejecs = []
    for e in cargar('ejecuciones.json'):
        if e.get('estado') == 'ACTIVA':
            e['_ini'], e['_fin'] = fecha(e['fechaInicioEfectiva']), fecha(e['fechaFinEfectiva'])
            ejecs.append(e)
    cruzan = sorted([e for e in ejecs if e['_ini'] <= hasta and e['_fin'] >= desde], key=lambda x: x['_ini'])
    prot_ids = set()
    for s in cargar('solicitudes.json'):
        for k in ('turno', 'turnoReceptor'):
            if isinstance(s.get(k), dict) and s[k].get('idTurno') is not None:
                prot_ids.add(s[k]['idTurno'])
    for o in cargar('ofertas.json'):
        if isinstance(o.get('turno'), dict) and o['turno'].get('idTurno') is not None:
            prot_ids.add(o['turno']['idTurno'])
    en_rango = [t for t in cargar('turnos.json') if desde <= fecha(t['fecha']) <= hasta]
    gen = [t for t in en_rango if t.get('nombreRotativa')]
    manuales = [t for t in en_rango if not t.get('nombreRotativa')]

    def dueno(t):
        fe = fecha(t['fecha'])
        for e in ejecs:
            if e['_ini'] <= fe <= e['_fin']:
                return e
        return None

    def empezado(t):
        return (t['fecha'][:10] + ' ' + (t.get('horaInicio') or '00:00')[:5]) <= ahora

    def protegido(t):
        return t['idTurno'] in prot_ids

    legado = [t for t in gen if dueno(t) is None]

    # --- Reemplazo: qué se borra y qué se conserva -------------------------------------------
    retener_fin = None
    a_borrar = []
    corte = max(desde, manana)
    if reemplazar:
        for e in sorted(cruzan, key=lambda x: x['_ini']):
            if e['_fin'] >= corte:
                if e['_fin'] > hasta:
                    motivos.append('La vigencia #%d llega hasta %s, después de HASTA (%s): al acortarla se perderían turnos '
                                   'fuera del rango. Sube HASTA a %s o anúlala desde la aplicación.'
                                   % (e['idEjecucion'], e['_fin'], hasta, e['_fin']))
                    continue
                if e['_ini'] >= corte:
                    acciones.append('ANULAR %d' % e['idEjecucion'])
                    a_borrar += [t for t in gen if dueno(t) is e]
                else:
                    acciones.append('ACORTAR %d %s' % (e['idEjecucion'], corte))
                    a_borrar += [t for t in gen if dueno(t) is e and fecha(t['fecha']) >= corte]
                    retener_fin = max(retener_fin or (corte - timedelta(days=1)), corte - timedelta(days=1))
            else:
                retener_fin = max(retener_fin or e['_fin'], e['_fin'])
        l_borrar = [t for t in legado if fecha(t['fecha']) >= corte]
        l_quedan = [t for t in legado if fecha(t['fecha']) < corte]
        if l_quedan:
            retener_fin = max(retener_fin or fecha(l_quedan[0]['fecha']), max(fecha(t['fecha']) for t in l_quedan))
        if l_borrar:
            en_molde = set(norm(por_id[f['idRotativa']]['nombre']) for f in filas if f['idRotativa'] in por_id)
            fuera = sorted(set(t['nombreRotativa'] for t in l_borrar if norm(t['nombreRotativa']) not in en_molde))
            if fuera:
                motivos.append('Hay turnos sin vigencia de rotativas que no están en el molde (%s); '
                               '«Eliminar turnos generados» solo borra los del molde.' % ', '.join(fuera))
            else:
                f1 = min(fecha(t['fecha']) for t in l_borrar)
                f2 = max(fecha(t['fecha']) for t in l_borrar)
                acciones.append('LEGADO %s %s' % (f1, f2))
                a_borrar += l_borrar
        prot = [t for t in a_borrar if protegido(t)]
        emp = [t for t in a_borrar if empezado(t)]
        if prot:
            motivos.append('%d turno(s) que habría que borrar tienen solicitudes u ofertas (ids %s%s). '
                           'Resuélvelas en la aplicación y vuelve a correr.'
                           % (len(prot), ' '.join(str(t['idTurno']) for t in prot[:8]), ' …' if len(prot) > 8 else ''))
        if emp:
            motivos.append('%d turno(s) que habría que borrar ya empezaron (ids %s); no se borran.'
                           % (len(emp), ' '.join(str(t['idTurno']) for t in emp[:8])))
    else:
        if cruzan:
            motivos.append('Hay %d vigencia(s) activa(s) que se cruzan con %s → %s.' % (len(cruzan), desde, hasta))
        if legado:
            motivos.append('Hay %d turno(s) generados sin vigencia (legado) en %s → %s.' % (len(legado), desde, hasta))

    g0 = desde if retener_fin is None else max(desde, retener_fin + timedelta(days=1))
    generar = g0 <= hasta
    ancla_ef = ref + timedelta(days=ciclo * ((g0 - ref).days // ciclo)) if generar else ref

    # --- Turnos esperados y cobertura (misma lógica que el generador) ------------------------
    esperados, con_medico, choque = {}, {}, {}
    por_func = {}
    total_gen = total_con = total_choque = 0
    if generar:
        dias = [g0 + timedelta(days=i) for i in range((hasta - g0).days + 1)]
        for f in filas:
            rid = f['idRotativa']
            if rid not in seq:
                continue
            for dia in dias:
                idx = (dia - ancla_ef).days % c['ciclo_de'][rid]
                for (hi, hf, _n) in seq[rid].get(idx, []):
                    ini = dia.toordinal() * 1440 + hi
                    fin = (dia.toordinal() + (1 if hf <= hi else 0)) * 1440 + hf
                    esperados[rid] = esperados.get(rid, 0) + 1
                    total_gen += 1
                    m = f['idFuncionario']
                    if m is None:
                        continue
                    if any(ini < b and a < fin for (a, b) in por_func.get(m, [])):
                        choque[rid] = choque.get(rid, 0) + 1
                        total_choque += 1
                    else:
                        por_func.setdefault(m, []).append((ini, fin))
                        con_medico[rid] = con_medico.get(rid, 0) + 1
                        total_con += 1
    porc_turnos = pct(total_con, total_gen)
    if generar and total_gen and porc_turnos + 1e-9 < meta:
        motivos.append('Con los médicos disponibles quedarían con médico %s %% de los turnos (meta %s %%). '
                       'Agrega médicos MEDICO a %s o baja PORCENTAJE.'
                       % (coma(porc_turnos), coma(meta), c['sn']))

    # --- T III: la secuencia con este ancla tiene que dar el calendario real ------------------
    t3_ok = True
    if env('T3_MES') and (env('T3_DIA') or env('T3_NOCHE')):
        t3_previo = calendario_t3(c, ref, env('T3_MES'))
        if t3_previo is None:
            motivos.append('No encuentro la rotativa «%s» para verificar el calendario.' % env('T3_ROTATIVA'))
            t3_ok = False

    # --- Informe -----------------------------------------------------------------------------
    print('→ Plan (solo lectura hasta aquí)')
    linea('Servicio', '%s (id %d)' % (c['sn'], c['sid']))
    linea('Molde', '«%s» (id %d): %d filas, %d con médico'
          % (c['molde']['nombre'], c['molde']['idPlanificacion'], len(antes), sum(1 for f in antes if f['idFuncionario'] is not None)))
    linea('Rotativas', '; '.join(r['nombre'] for r in c['seis']))
    linea('Hoy (hora de Chile)', '%s; mañana %s' % (hoy, manana))
    linea('Rango pedido', '%s → %s (%d días)' % (desde, hasta, (hasta - desde).days + 1))
    linea('Reglas de horario', ('; '.join('«%s» (id %d)' % (n, i) for n, i in zip(nombres_reglas, ids_reglas))
                                + ' (el cálculo de choques es aproximado)') if ids_reglas
          else 'ninguna (Día 08:00–20:00 y Noche 20:00–08:00 todos los días)')
    print('  Cupos (rotativa × puesto): %d = %d rotativas × %d puestos' % (total, len(ids6), len(c['puestos'])))
    linea('  con médico hoy', '%d (%s %%)' % (llenos_antes, coma(pct(llenos_antes, total))))
    linea('  por llenar', '%d (%d filas vacías del molde + %d sin fila)'
          % (len(por_llenar), len([1 for (r, p) in por_llenar if any(f['idRotativa'] == r and f['idPuesto'] == p for f in antes)]),
             len([1 for (r, p) in por_llenar if not any(f['idRotativa'] == r and f['idPuesto'] == p for f in antes)])))
    linea('  médicos disponibles', '%d (rol MEDICO de %s, activos, sin puesto en el molde)' % (n_pool, c['sn']))
    linea('  quedarían llenos', '%d (%s %%); sin médico %d' % (llenos_despues, coma(pct(llenos_despues, total)), total - llenos_despues))
    if hay_cambio:
        linea('  cambio en el molde', '%d filas vacías reciben médico, %d filas nuevas con médico, %d filas nuevas vacías%s'
              % (rellenadas, nuevas_con, nuevas_sin, ', %d filas inválidas se descartan' % descartadas if descartadas else ''))
    else:
        linea('  cambio en el molde', 'ninguno')
    sin_puesto = sum(1 for f in antes if f['idPuesto'] is None)
    if sin_puesto and hay_cambio:
        print('  ⚠ El molde tiene %d fila(s) sin puesto (o con un puesto ya eliminado). Al guardarlo siguen como filas '
              'sin puesto y generan turnos sin puesto; si no las quieres, quítalas en Planificación antes.' % sin_puesto)
    print('  En el rango ya existe:')
    linea('  vigencias activas', str(len(cruzan)))
    for e in cruzan:
        ts = [t for t in gen if dueno(t) is e]
        fase = ''
        if (fecha(e['fechaInicioRotativa']) - ref).days % ciclo != 0:
            fase = '; otra fase del ciclo (ancla %s)' % e['fechaInicioRotativa']
        print('    #%d  %s → %s  molde «%s»: %d turnos (%d ya empezados, %d con solicitudes u ofertas)%s'
              % (e['idEjecucion'], e['_ini'], e['_fin'], e.get('nombrePlanificacion'), len(ts),
                 sum(1 for t in ts if empezado(t)), sum(1 for t in ts if protegido(t)), fase))
    linea('  turnos sin vigencia', '%d%s' % (len(legado), (' (%s → %s; %d ya empezados, %d con solicitudes u ofertas)' % (
        min(fecha(t['fecha']) for t in legado), max(fecha(t['fecha']) for t in legado),
        sum(1 for t in legado if empezado(t)), sum(1 for t in legado if protegido(t)))) if legado else ''))
    linea('  turnos manuales', '%d (sin rotativa; no se tocan)' % len(manuales))
    if reemplazar:
        print('  Con REEMPLAZAR=1 (corte: %s, desde mañana):' % corte)
        if not acciones:
            print('    no hay nada que borrar')
        for a in acciones:
            p = a.split()
            if p[0] == 'ANULAR':
                print('    anular la vigencia #%s completa' % p[1])
            elif p[0] == 'ACORTAR':
                print('    acortar la vigencia #%s: se borran sus turnos desde %s y termina el día anterior' % (p[1], p[2]))
            else:
                print('    «Eliminar turnos generados» del %s al %s (turnos sin vigencia)' % (p[1], p[2]))
        print('    turnos que se borrarían: %d' % len(a_borrar))
        if retener_fin is not None:
            print('    se conserva lo ya empezado hasta el %s (no se borra nunca)' % retener_fin)
    print('→ Generación')
    if generar:
        linea('Rango a generar', '%s → %s' % (g0, hasta))
        linea('Ancla', '%s (lunes; equivale a %s módulo %d días)' % (ancla_ef, ref, ciclo))
        linea('Turnos esperados', '%d' % total_gen)
        for r in c['seis']:
            rid = r['idRotativa']
            print('    %-24s %5d turnos, %5d con médico' % (r['nombre'], esperados.get(rid, 0), con_medico.get(rid, 0)))
        linea('Con médico', '%d (%s %%); sin médico por cupo vacío %d; por choque de horario %d'
              % (total_con, coma(porc_turnos), total_gen - total_con - total_choque, total_choque))
        linea('Meta', '≥ %s %%: %s' % (coma(meta), 'cumple' if porc_turnos + 1e-9 >= meta else 'NO cumple'))
    else:
        print('  Nada que generar: todo el rango queda cubierto por turnos ya empezados.')
    if env('T3_MES') and (env('T3_DIA') or env('T3_NOCHE')):
        esp, tope = esperado_t3()
        if t3_previo is not None:
            ok = tabla_t3(t3_previo, esp, tope, 'Calendario de %s en %s según su secuencia y el ancla (aún sin generar):'
                          % (env('T3_ROTATIVA'), env('T3_MES')))
            if not ok:
                motivos.append('La secuencia de «%s» con ANCLA=%s no da el calendario real de %s. '
                               'Revisa ANCLA o la secuencia de la rotativa.' % (env('T3_ROTATIVA'), ref, env('T3_MES')))
    detener = bool(motivos)
    if detener:
        print('→ Me detendría:')
        for m in motivos:
            print('  - ' + m)
        if not reemplazar and (cruzan or legado):
            print('  Para rehacer solo el futuro (desde mañana, %s): REEMPLAZAR=1 bash scripts/generar_rotativa_urgencias.sh' % manana)
            print('  Lo ya empezado y los turnos con solicitudes u ofertas no se borran nunca.')
    else:
        print('→ Haría, en orden:')
        n = 0
        if hay_cambio:
            n += 1
            print('  %d. completar el molde: %d filas con médico nuevo, %d filas vacías nuevas (respaldo previo en backups/)'
                  % (n, rellenadas + nuevas_con, nuevas_sin))
        for a in acciones:
            n += 1
            p = a.split()
            if p[0] == 'ANULAR':
                print('  %d. anular la vigencia #%s' % (n, p[1]))
            elif p[0] == 'ACORTAR':
                print('  %d. acortar la vigencia #%s desde %s' % (n, p[1], p[2]))
            else:
                print('  %d. «Eliminar turnos generados» del %s al %s' % (n, p[1], p[2]))
        if generar:
            n += 1
            print('  %d. generar %s → %s con ancla %s (%d turnos)' % (n, g0, hasta, ancla_ef, total_gen))
            print('  %d. verificar contra la API y mostrar el resumen' % (n + 1))
        elif not acciones and not hay_cambio:
            print('  nada')

    # --- Archivos para el resto del script ----------------------------------------------------
    escribir('molde_nuevo.json', json.dumps({'asignaciones': filas}))
    escribir('molde_antes.json', json.dumps({'asignaciones': antes}))
    escribir('acciones.txt', ''.join(a + '\n' for a in acciones))
    escribir('plan.env', ''.join('%s=%s\n' % kv for kv in [
        ('DETENER', '1' if detener else '0'),
        ('G0', g0),
        ('ANCLA_EF', ancla_ef),
        ('GENERAR', '1' if generar else '0'),
        ('HAY_CAMBIO_MOLDE', '1' if hay_cambio else '0'),
        ('IDS_REGLAS', ','.join(str(i) for i in ids_reglas)),
    ]))


def resumen():
    c = contexto()
    g0, hasta = fecha(env('G0')), fecha(env('HASTA'))
    meta = float(env('PORCENTAJE').replace(',', '.'))
    ref = fecha(env('ANCLA'))
    estado = {'META_OK': '1', 'T3_OK': '1'}
    nuevos = [t for t in cargar('turnos_final.json')
              if t.get('nombreRotativa') and g0 <= fecha(t['fecha']) <= hasta]
    print('→ Resumen')
    print('  Turnos creados por rotativa (%s → %s):' % (g0, hasta))
    print('    %-24s %7s %10s %9s %9s' % ('rotativa', 'turnos', 'con médico', 'vacantes', '% lleno'))
    por = {}
    for t in nuevos:
        a = por.setdefault(t['nombreRotativa'], [0, 0])
        a[0] += 1
        a[1] += 1 if t.get('asignado') else 0
    tot = [0, 0]
    for nombre in sorted(por, key=lambda n: [norm(r['nombre']) for r in c['seis']].index(norm(n))
                         if norm(n) in [norm(r['nombre']) for r in c['seis']] else 99):
        a = por[nombre]
        print('    %-24s %7d %10d %9d %8s%%' % (nombre, a[0], a[1], a[0] - a[1], coma(pct(a[1], a[0]))))
        tot[0] += a[0]
        tot[1] += a[1]
    print('    %-24s %7d %10d %9d %8s%%' % ('TOTAL', tot[0], tot[1], tot[0] - tot[1], coma(pct(tot[1], tot[0]))))
    gen_n = env('GENERADOS')
    if gen_n and int(gen_n) != tot[0]:
        print('  ⚠ La generación informó %s turnos y la API lista %d en el rango.' % (gen_n, tot[0]))
    antes, _ = filas_de(c['molde'])
    total, llenos = cupos_molde(antes, c['ids6'], c['puestos'])
    print('  Cupos llenos: %s %% de los turnos (%d de %d); cupos del molde con médico: %d de %d (%s %%)'
          % (coma(pct(tot[1], tot[0])), tot[1], tot[0], llenos, total, coma(pct(llenos, total))))
    st = cargar('stats_final.json')
    if isinstance(st, dict) and st.get('totalTurnos') is not None:
        print('  La aplicación (GET /turnos/servicio/%d/stats) cuenta %s turnos, %s asignados: cobertura %s %%%s'
              % (c['sid'], st.get('totalTurnos'), st.get('turnosAsignados'),
                 coma(float(st.get('porcentajeCobertura') or 0)),
                 '' if st.get('totalTurnos') == tot[0] else
                 ' (cuenta también turnos de antes que terminan dentro del rango, o sin rotativa)'))
    if env('VACANTES_CHOQUE'):
        print('  Vacantes por choque de horario al generar: %s' % env('VACANTES_CHOQUE'))
    if tot[0] and pct(tot[1], tot[0]) + 1e-9 < meta:
        print('  ✗ No llega a la meta de %s %%.' % coma(meta))
        estado['META_OK'] = '0'
    if env('T3_MES') and (env('T3_DIA') or env('T3_NOCHE')):
        esp, tope = esperado_t3()
        mes = env('T3_MES')
        y, m = [int(x) for x in mes.split('-')]
        r = c['por_nombre'].get(norm(env('T3_ROTATIVA')))
        obt = {'Día': set(), 'Noche': set()}
        det = {'Día': {}, 'Noche': {}}
        for t in cargar('turnos_t3.json'):
            if not t.get('nombreRotativa') or norm(t['nombreRotativa']) != norm(env('T3_ROTATIVA')):
                continue
            fe = fecha(t['fecha'])
            if fe.year != y or fe.month != m:
                continue
            k = clase_turno(minutos(t.get('horaInicio') or '0:0'), t.get('tipoTurno') or '')
            if k not in obt:
                continue
            obt[k].add(fe.day)
            d = det[k].setdefault(fe.day, [0, 0])
            d[0] += 1
            d[1] += 1 if t.get('asignado') else 0
        ok = tabla_t3(obt, esp, tope, 'Verificación de %s en %s (GET /turnos/servicio/%d/todos-detalle):'
                      % (env('T3_ROTATIVA'), mes, c['sid']), det)
        if not ok:
            estado['T3_OK'] = '0'
    escribir('resumen.env', ''.join('%s=%s\n' % kv for kv in estado.items()))


def buscar_ejecucion():
    """Imprime el id de la vigencia ACTIVA con ese rango efectivo (para cuando la respuesta se perdió)."""
    ini, fin = env('G0'), env('HASTA')
    for e in cargar('ejecuciones.json'):
        if e.get('estado') == 'ACTIVA' and e['fechaInicioEfectiva'][:10] == ini and e['fechaFinEfectiva'][:10] == fin \
                and e['idPlanificacion'] == int(env('ID_MOLDE')):
            print(e['idEjecucion'])
            return


def servicio_id():
    for s in cargar('servicios.json'):
        if norm(s.get('nombre')) == norm(env('SERVICIO_NOMBRE')):
            print(s['id'])
            return
    terminar('No encuentro el servicio «%s». Servicios: %s'
             % (env('SERVICIO_NOMBRE'), ', '.join(s.get('nombre', '') for s in cargar('servicios.json'))))


def cuerpo_login():
    sys.stdout.write(json.dumps({'rut': env('RUT'), 'password': env('CLAVE')}))


def cuerpo_servicio():
    sys.stdout.write(json.dumps({'preAuthToken': env('PRE'), 'servicioId': int(env('ID_SERVICIO'))}))


def cuerpo_generar():
    ids = [int(x) for x in env('IDS_REGLAS').split(',') if x.strip()]
    sys.stdout.write(json.dumps({'fechaInicioRotativa': env('ANCLA_EF'), 'fechaInicioEfectiva': env('G0'),
                                 'fechaFinEfectiva': env('HASTA'), 'idsReglas': ids}))


def cuerpo_acortar():
    sys.stdout.write(json.dumps({'fechaDesde': env('FECHA')}))


def validar_respaldo():
    d = json.load(open(env('ARCHIVO'), encoding='utf-8'))
    if not isinstance(d, dict) or not isinstance(d.get('asignaciones'), list):
        terminar('El archivo no es un respaldo de molde (falta «asignaciones»).')
    print(len(d['asignaciones']))


ORDENES = {'plan': plan, 'resumen': resumen, 'buscar_ejecucion': buscar_ejecucion, 'servicio_id': servicio_id,
           'cuerpo_login': cuerpo_login, 'cuerpo_servicio': cuerpo_servicio, 'cuerpo_generar': cuerpo_generar,
           'cuerpo_acortar': cuerpo_acortar, 'validar_respaldo': validar_respaldo}

if __name__ == '__main__':
    ORDENES[sys.argv[1]]()
PY
printf '%s\n' "$MOTOR" > "$TMP/motor.py"
motor() { python3 -I "$TMP/motor.py" "$@"; }

# --- 0. Comprobaciones --------------------------------------------------------------------------
for cmd in curl python3 date; do
  command -v "$cmd" >/dev/null 2>&1 || fallo "Falta '$cmd' en este equipo."
done
fecha_ok() { [[ "$1" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] && [[ "$(date -d "$1" +%F 2>/dev/null)" == "$1" ]]; }
for v in DESDE HASTA ANCLA; do
  fecha_ok "${!v}" || fallo "$v='${!v}' no es una fecha AAAA-MM-DD válida."
done
antes() { (( $(date -d "$1" +%s) < $(date -d "$2" +%s) )); }   # ¿la fecha $1 es anterior a $2?
if antes "$HASTA" "$DESDE"; then fallo "DESDE ($DESDE) es posterior a HASTA ($HASTA)."; fi
[[ "$(date -d "$ANCLA" +%u)" == 1 ]] || fallo "ANCLA ($ANCLA) tiene que ser lunes: es el día 0 del ciclo."
[[ "$PORCENTAJE" =~ ^[0-9]+([.,][0-9]+)?$ ]] || fallo "PORCENTAJE='$PORCENTAJE' no es un número."
[[ "$ESPERA" =~ ^[0-9]+$ ]] || fallo "ESPERA='$ESPERA' no es un número de segundos."
[[ "$SIMULAR" =~ ^[01]$ && "$REEMPLAZAR" =~ ^[01]$ ]] || fallo "SIMULAR y REEMPLAZAR valen 0 o 1."
if [[ -n "$T3_MES" ]]; then
  [[ "$T3_MES" =~ ^[0-9]{4}-[0-9]{2}$ ]] || fallo "T3_MES='$T3_MES' no es AAAA-MM."
  [[ "$T3_HASTA" =~ ^[0-9]+$ ]] || fallo "T3_HASTA='$T3_HASTA' no es un número de día."
  if antes "$(date -d "$T3_MES-01 +1 month -1 day" +%F)" "$DESDE" || antes "$HASTA" "$T3_MES-01"; then
    aviso "El mes $T3_MES queda fuera de $DESDE → $HASTA: no se verifica el calendario de T III."
    T3_MES=""
  fi
fi
HOY=$(TZ=America/Santiago date +%F)                    # hora de Chile, como la aplicación
AHORA=$(TZ=America/Santiago date '+%F %H:%M')
export TMP HOY AHORA DESDE HASTA ANCLA PORCENTAJE REEMPLAZAR EXCLUIR SERVICIO_NOMBRE MOLDE_NOMBRE ROTATIVAS REGLAS \
       T3_ROTATIVA T3_MES T3_DIA T3_NOCHE T3_HASTA
if [[ -n "$RESTAURAR_MOLDE" ]]; then
  [[ -r "$RESTAURAR_MOLDE" ]] || fallo "No puedo leer RESTAURAR_MOLDE=$RESTAURAR_MOLDE"
  ARCHIVO="$RESTAURAR_MOLDE" motor validar_respaldo >/dev/null
fi

# --- 1. Sesión ----------------------------------------------------------------------------------
paso "API $API"
api GET /servicios
if ! api_ok; then
  if [[ "$HTTP" == "000" ]]; then
    fallo "No alcanzo la API ($API): $(api_msg)
  Dentro de la VM debe ser el puerto que publica sgt-frontend (PUBLIC_PORT, por defecto 8090); API=… lo cambia."
  fi
  fallo "La API respondió HTTP $HTTP a GET /servicios: $(api_msg)"
fi
mv "$TMP/resp.json" "$TMP/servicios.json"
ID_SERVICIO=$(motor servicio_id); export ID_SERVICIO

if [[ -z "$RUT" ]]; then read -r -p "RUT del administrador: " RUT || true; fi
if [[ -z "$CLAVE" ]]; then read -r -s -p "Clave de ${RUT:-?}: " CLAVE || true; echo; fi
[[ -n "$RUT" && -n "$CLAVE" ]] || fallo "Faltan RUT y CLAVE (variables o, en una terminal, se piden)."
paso "Sesión de $RUT en $SERVICIO_NOMBRE (un solo intento: un error de clave cuenta para el bloqueo de la cuenta)"
( umask 077; RUT="$RUT" CLAVE="$CLAVE" motor cuerpo_login > "$TMP/login.json" )
api POST /funcionarios/login "$TMP/login.json"
rm -f "$TMP/login.json"
api_ok || fallo "El login falló (HTTP $HTTP): $(api_msg)"
PRE=$(jv "$TMP/resp.json" preAuthToken)
[[ -n "$PRE" ]] || fallo "El login no entregó token: $(jv "$TMP/resp.json" message)"
( umask 077; PRE="$PRE" motor cuerpo_servicio > "$TMP/seleccion.json" )
api POST /funcionarios/login/select-service "$TMP/seleccion.json"
rm -f "$TMP/seleccion.json"
api_ok || fallo "No pude entrar al servicio $SERVICIO_NOMBRE (HTTP $HTTP): $(api_msg)"
TOKEN=$(jv "$TMP/resp.json" token)
ROL_SISTEMA=$(jv "$TMP/resp.json" perfil idRolSistema)
[[ -n "$TOKEN" ]] || fallo "La API no entregó token de sesión."
( umask 077; printf 'Authorization: Bearer %s\n' "$TOKEN" > "$TMP/auth" )
unset CLAVE PRE TOKEN
if [[ "$ROL_SISTEMA" != "1" ]]; then
  if [[ "$SIMULAR" == 1 ]]; then
    aviso "El usuario no es ADMINISTRADOR: la simulación sigue, pero para generar hace falta serlo (los moldes y las vigencias solo los escribe el administrador)."
  else
    fallo "El usuario no es ADMINISTRADOR: los moldes y las vigencias solo los escribe el administrador."
  fi
fi

# --- 2. Lectura (sin cambiar nada) ---------------------------------------------------------------
paso "Leyendo el molde"
leer "los moldes del servicio"   "/planificaciones/servicio/$ID_SERVICIO"   planes.json
ID_MOLDE=$(python3 -I - "$TMP/planes.json" "$MOLDE_NOMBRE" <<'PY'
import json, sys, unicodedata
def norm(s):
    s = unicodedata.normalize('NFKD', s or '')
    return ' '.join(''.join(c for c in s if not unicodedata.combining(c)).lower().split())
ids = [p['idPlanificacion'] for p in json.load(open(sys.argv[1], encoding='utf-8')) if norm(p['nombre']) == norm(sys.argv[2])]
print(ids[0] if len(ids) == 1 else '')
PY
)
[[ -n "$ID_MOLDE" ]] || fallo "No encuentro (o hay más de una) planificación «$MOLDE_NOMBRE» en $SERVICIO_NOMBRE."

if [[ -n "$RESTAURAR_MOLDE" ]]; then
  N=$(ARCHIVO="$RESTAURAR_MOLDE" motor validar_respaldo)
  if [[ "$SIMULAR" == 1 ]]; then
    paso "SIMULAR=1: restauraría las $N filas de $RESTAURAR_MOLDE en el molde «$MOLDE_NOMBRE» (id $ID_MOLDE). No cambié nada."
    exit 0
  fi
  paso "Restaurando $N filas en el molde «$MOLDE_NOMBRE» (id $ID_MOLDE) desde $RESTAURAR_MOLDE"
  api PUT "/planificaciones/$ID_MOLDE" "$RESTAURAR_MOLDE" 120
  api_ok || fallo "No pude restaurar el molde (HTTP $HTTP): $(api_msg)"
  echo "✓ Molde restaurado."
  exit 0
fi

paso "Leyendo rotativas, puestos, médicos, vigencias y turnos"
leer "las rotativas"            "/rotativas/servicio/$ID_SERVICIO"          rotativas.json
leer "los puestos"              "/puestos/servicio/$ID_SERVICIO"            puestos.json
leer "los médicos del servicio" "/funcionarios/summary?servicioId=$ID_SERVICIO" funcionarios.json
leer "las vigencias"            "/planificaciones/servicio/$ID_SERVICIO/ejecuciones" ejecuciones.json
leer "los turnos del rango"     "/turnos/servicio/$ID_SERVICIO/todos-detalle?fechaInicio=$DESDE&fechaFin=$HASTA" turnos.json 300
leer "las solicitudes"          "/solicitudes"                              solicitudes.json
leer "las ofertas"              "/ofertas-generales/servicio/$ID_SERVICIO"  ofertas.json
if [[ -n "$REGLAS" ]]; then
  leer "las reglas de horario"  "/reglas-servicio/servicio/$ID_SERVICIO"    reglas.json
else
  echo '[]' > "$TMP/reglas.json"
fi

# --- 3. Plan ------------------------------------------------------------------------------------
motor plan
DETENER=0 G0="" ANCLA_EF="" GENERAR=0 HAY_CAMBIO_MOLDE=0 IDS_REGLAS=""
while IFS='=' read -r k v; do
  case "$k" in DETENER|G0|ANCLA_EF|GENERAR|HAY_CAMBIO_MOLDE|IDS_REGLAS) printf -v "$k" '%s' "$v" ;; esac
done < "$TMP/plan.env"

if [[ "$SIMULAR" == 1 ]]; then
  echo
  paso "SIMULAR=1: no cambié nada."
  exit 0
fi
if [[ "$DETENER" == 1 ]]; then
  echo
  echo "✗ Me detengo sin cambiar nada (código 2)." >&2
  exit 2
fi

# --- 4. Cambios (cada uno ya comprobado arriba) --------------------------------------------------
if [[ "$HAY_CAMBIO_MOLDE" == 1 ]]; then
  mkdir -p backups
  RESPALDO="backups/molde-urgencias-$(date +%Y%m%d-%H%M%S).json"
  ( umask 077; cp "$TMP/molde_antes.json" "$RESPALDO" )
  paso "Completando el molde «$MOLDE_NOMBRE» (estado anterior en $RESPALDO)"
  api PUT "/planificaciones/$ID_MOLDE" "$TMP/molde_nuevo.json" 120
  api_ok || fallo "No pude actualizar el molde (HTTP $HTTP): $(api_msg). No se cambió nada más."
else
  paso "El molde «$MOLDE_NOMBRE» ya está completo; no se toca"
fi

while read -r accion a b c; do
  [[ -n "$accion" ]] || continue
  case "$accion" in
    ACORTAR)
      paso "Acortando la vigencia #$a: se borran sus turnos desde $b"
      ( umask 077; FECHA="$b" motor cuerpo_acortar > "$TMP/acortar.json" )
      api PUT "/planificaciones/ejecuciones/$a/acortar" "$TMP/acortar.json" 120
      api_ok || fallo "No pude acortar la vigencia #$a (HTTP $HTTP): $(api_msg). Lo anterior ya se hizo; vuelve a correr con SIMULAR=1 para ver cómo quedó."
      echo "  turnos desactivados: $(jv "$TMP/resp.json" turnosDesactivados)" ;;
    ANULAR)
      paso "Anulando la vigencia #$a"
      api DELETE "/planificaciones/ejecuciones/$a" "" 120
      api_ok || fallo "No pude anular la vigencia #$a (HTTP $HTTP): $(api_msg). Vuelve a correr con SIMULAR=1 para ver cómo quedó."
      echo "  turnos eliminados: $(jv "$TMP/resp.json" eliminados)" ;;
    LEGADO)
      paso "«Eliminar turnos generados» (sin vigencia) del $a al $b"
      api DELETE "/planificaciones/$ID_MOLDE/turnos?fechaInicio=$a&fechaFin=$b" "" 120
      api_ok || fallo "No pude eliminar los turnos sin vigencia (HTTP $HTTP): $(api_msg). Vuelve a correr con SIMULAR=1 para ver cómo quedó."
      echo "  turnos eliminados: $(jv "$TMP/resp.json" eliminados)" ;;
  esac
done < "$TMP/acciones.txt"

if [[ "$GENERAR" != 1 ]]; then
  echo "✓ No hay nada que generar: el rango ya está cubierto por turnos empezados."
  if [[ -n "${RESPALDO:-}" ]]; then
    echo "Deshacer el molde:   RESTAURAR_MOLDE=$RESPALDO bash scripts/generar_rotativa_urgencias.sh"
  fi
  exit 0
fi

( umask 077; G0="$G0" ANCLA_EF="$ANCLA_EF" IDS_REGLAS="$IDS_REGLAS" motor cuerpo_generar > "$TMP/generar.json" )
paso "Choques con turnos que esos médicos ya tienen (pre-chequeo de la aplicación)"
api POST "/planificaciones/$ID_MOLDE/conflictos" "$TMP/generar.json" 120
if api_ok; then
  echo "  $(python3 -I -c 'import json,sys; print(len(json.load(open(sys.argv[1], encoding="utf-8"))))' "$TMP/resp.json") turno(s) quedarían vacantes por choque con turnos existentes"
else
  aviso "El pre-chequeo de choques falló (HTTP $HTTP): $(api_msg). Sigo: la generación vuelve a validar."
fi

paso "Generando $G0 → $HASTA con ancla $ANCLA_EF (unos turnos tardan: son miles)"
INICIO=$SECONDS
api POST "/planificaciones/$ID_MOLDE/generar" "$TMP/generar.json" "$ESPERA"
ID_EJEC=""; GENERADOS=""; VACANTES_CHOQUE=""
if api_ok; then
  ID_EJEC=$(jv "$TMP/resp.json" idEjecucion)
  GENERADOS=$(jv "$TMP/resp.json" generados)
  VACANTES_CHOQUE=$(jv "$TMP/resp.json" vacantesPorConflicto)
elif [[ "$HTTP" =~ ^(000|502|503|504)$ ]]; then
  # El proxy o el cliente cortaron la espera, pero el backend puede haber terminado: se mira, no se repite.
  aviso "Sin respuesta a tiempo (HTTP $HTTP). Compruebo si la vigencia se creó (hasta 5 min), sin reintentar."
  for _ in $(seq 1 30); do
    sleep 10
    api GET "/planificaciones/servicio/$ID_SERVICIO/ejecuciones" "" 60
    if api_ok; then
      mv "$TMP/resp.json" "$TMP/ejecuciones.json"
      ID_EJEC=$(ID_MOLDE="$ID_MOLDE" G0="$G0" motor buscar_ejecucion)
      [[ -z "$ID_EJEC" ]] || break
    fi
  done
  [[ -n "$ID_EJEC" ]] || fallo "No veo la vigencia nueva. Revisa en la aplicación (Planificación) antes de volver a correr."
else
  fallo "La generación falló (HTTP $HTTP): $(api_msg). Revisa con SIMULAR=1 cómo quedó antes de volver a correr."
fi
echo "  vigencia #$ID_EJEC creada en $((SECONDS - INICIO)) s${GENERADOS:+; la aplicación informa $GENERADOS turnos}"

# --- 5. Verificación y resumen --------------------------------------------------------------------
leer "los turnos generados" "/turnos/servicio/$ID_SERVICIO/todos-detalle?fechaInicio=$G0&fechaFin=$HASTA" turnos_final.json 300
leer "las estadísticas"     "/turnos/servicio/$ID_SERVICIO/stats?fechaInicio=$G0&fechaFin=$HASTA" stats_final.json
leer "el molde"             "/planificaciones/servicio/$ID_SERVICIO" planes.json
if [[ -n "$T3_MES" && ( -n "$T3_DIA" || -n "$T3_NOCHE" ) ]]; then
  PRIMERO="$T3_MES-01"
  ULTIMO=$(date -d "$PRIMERO +1 month -1 day" +%F)
  leer "los turnos de T III de $T3_MES" "/turnos/servicio/$ID_SERVICIO/todos-detalle?fechaInicio=$PRIMERO&fechaFin=$ULTIMO" turnos_t3.json 300
else
  echo '[]' > "$TMP/turnos_t3.json"
fi
echo
G0="$G0" GENERADOS="$GENERADOS" VACANTES_CHOQUE="$VACANTES_CHOQUE" motor resumen
META_OK=1 T3_OK=1
while IFS='=' read -r k v; do
  case "$k" in META_OK|T3_OK) printf -v "$k" '%s' "$v" ;; esac
done < "$TMP/resumen.env"

echo
echo "Vigencia creada: #$ID_EJEC ($G0 → $HASTA, ancla $ANCLA_EF)."
echo "Deshacer los turnos: Planificación → vigencia #$ID_EJEC → «Anular» (DELETE /api/v2/planificaciones/ejecuciones/$ID_EJEC)."
if [[ -n "${RESPALDO:-}" ]]; then
  echo "Deshacer el molde:   RESTAURAR_MOLDE=$RESPALDO bash scripts/generar_rotativa_urgencias.sh"
fi
if [[ "$META_OK" != 1 || "$T3_OK" != 1 ]]; then
  echo "⚠ Terminó, pero hay diferencias (meta de cupos o calendario de T III): ver arriba." >&2
  exit 3
fi
