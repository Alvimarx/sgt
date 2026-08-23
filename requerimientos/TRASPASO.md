# Traspaso del lote R1-R9 al repositorio con datos reales

Guía para replicar en la **otra máquina** (el repositorio donde este mismo
sistema corre conectado a la base real de innhosp del HUAP) los nueve
requerimientos aprobados en el ambiente de prueba. Sirve tanto para aplicarlo
a mano como para dárselo a un asistente (Claude u otro) en esa máquina.

## Qué se traspasa y qué NO

**SÍ** — solo cambios de frontend, en 7 archivos de `sgt-huap_frontend/src/`:

| Archivo | Requerimientos |
|---|---|
| `components/Comun/AgendaView.jsx` | R1, R2, R3→R7, R9 |
| `components/Comun/ShiftDetail.jsx` | R3→R7, R4 |
| `components/Comun/calendarView.jsx` | R6, R7 |
| `components/Admin2/Prop4.jsx` | R5, R8 |
| `context/AuthContext.jsx` | R5 |
| `services/funcionarioService.js` | R2, R7, R9 |
| `services/turnosService.js` | R2, R7 |

**NO** — nada más de este repo aplica allá. En particular NO copiar:
`docker-compose.hetzner.yml`, `.env.hetzner*`, `scripts/`, ni NADA de
`BaseDatosMySQL/` (son seeds y utilidades del ambiente de prueba; la otra
máquina tiene sus datos reales y su propia infraestructura). La única
excepción de datos es el paso opcional de R7 (ver más abajo).

**Backend: cero cambios.** Todos los requerimientos se resolvieron con datos
que el backend ya envía.

## Método A — parche git (rápido; probar primero)

`traspaso/frontend_R1-R9.patch` es el diff consolidado y verificado de los 7
archivos. En la otra máquina, desde la raíz del repo:

```bash
git apply --check traspaso/frontend_R1-R9.patch   # ensayo: no toca nada
git apply --3way  traspaso/frontend_R1-R9.patch   # aplica (con merge si hay drift)
```

- Si `--check` pasa limpio: aplicar, recompilar el frontend como se haga en esa
  máquina, y correr la verificación de abajo.
- Si falla o `--3way` deja conflictos: los dos árboles divergieron más de la
  cuenta → usar el Método B (es el motivo de que exista).

## Método B — por palabra (a prueba de divergencias)

Aplicar los documentos de esta carpeta **en este orden** (cada uno dice qué se
hizo, por qué, y cómo, con anclas de código en vez de números de línea):

1. `2026-08-23_R1_quitar-filtro-aprobados.md`
2. `2026-08-23_R2_resumen-turno-propio-con-rotativa.md` (la v2: rotativa, no puesto)
3. `2026-08-23_R7_encabezado-grupo-con-rotativa.md` — **saltarse R3**: R7 lo
   reemplaza (R3 queda solo como historia de la decisión)
4. `2026-08-23_R4_solicitar-cupo-libre-directo.md`
5. `2026-08-23_R5_persistencia-sesion-refresh.md`
6. `2026-08-23_R6_quitar-punto-amarillo-calendario.md`
7. `2026-08-23_R8_entrada-directa-servicio-unico.md`
8. `2026-08-23_R9_filtros-solicitudes-disponibles.md`

El orden importa: R2 introduce el helper de centinelas que R7 generaliza, y R9
reescribe el bloque de filtros que R1 poda.

## Paso opcional de datos (R7)

Si en la base de esa máquina el tipo de turno diurno está guardado como `Dia`
(sin tilde), el encabezado mostrará "Dia: Turno X". Ver
`traspaso/r7_tipo_turno_dia.sql`: primero el SELECT de inspección, y solo si
corresponde, el UPDATE. Con nombres ya correctos, no hay nada que hacer.

## Verificación después de aplicar (cualquiera de los dos métodos)

1. `npm run build` en `sgt-huap_frontend/` debe compilar sin errores nuevos.
2. Smoke test por requerimiento, como médico con turnos:
   - Home con 4 chips: **Todos · Mis turnos · Solicitudes · Disponibles** (R1, R9).
   - Con turno propio: "**Tienes turno {tipo}: {rotativa}**" en el resumen (R2).
   - Día expandido: encabezados "**Día: Turno X**" / "**Noche: Turno Y**"
     siempre, tengas turno o no (R7); igual en el sheet del calendario.
   - Tocar una vacante "Cupo libre — tocar para solicitar" abre la solicitud de
     Cobertura precargada (R4); como jefatura, la misma tarjeta sigue asignando.
   - F5 en el calendario: sigue en el calendario, no en el login (R5).
   - Usuario de UN servicio: entra directo al home sin pantalla de selección (R8).
   - "Disponibles" no lista cupos de un bloque donde ya tienes turno, ni el
     turno de día siguiente a tu noche (R9).
3. Avisos conocidos (no son fallas del traspaso):
   - El chip "Solicitudes" cuenta 0 mientras el backend no emita
     `solicitudPendiente` (limitación histórica, documentada en R9).
   - El banner de jefatura cuenta TODOS los cupos; el chip "Disponibles",
     solo los elegibles para el usuario — pueden diferir a propósito.

## Si lo aplica un asistente en la otra máquina

Prompt sugerido: *"Lee `requerimientos/TRASPASO.md` y aplica el lote R1-R9:
intenta primero el Método A (parche) y, si no aplica limpio, sigue el Método B
documento por documento. No toques backend ni datos salvo el paso opcional de
R7, y termina con la verificación del final del documento."*
