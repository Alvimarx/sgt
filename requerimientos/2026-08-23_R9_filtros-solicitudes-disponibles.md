# R9 · Filtros del home: "Solicitudes" y "Disponibles" (con reglas de elegibilidad)

**Estado: aprobado ✅** (visto bueno del usuario, 2026-08-23) · Fecha: 2026-08-23 · Alcance: solo frontend

## Qué se pidió

> "Cambia 'Pendientes' por 'Solicitudes' y 'Libres' por 'Disponibles', pero OJO,
> hay que cambiar lo que se filtra: no deben aparecer los turnos que tienen
> libre y que yo ya soy parte; además, no puede aparecerme el día si la noche
> anterior hice turno"

## Qué se hizo

1. **Renombres**: el chip "Pendientes" pasa a **"Solicitudes"** (misma lógica:
   turnos propios con solicitud pendiente no aprobada) y "Libres" pasa a
   **"Disponibles"**.
2. **"Disponibles" ya no lista cualquier cupo libre**, sino solo los que el
   usuario *realmente podría tomar*. Se excluyen:
   - **(a) Cupos de un equipo del que ya es parte.** Si el usuario ya tiene
     turno en ese bloque día/noche (misma fecha y tipo de turno), los cupos
     libres de ese mismo bloque no le sirven — ya está trabajando ahí.
   - **(b) Turnos de día tras su noche.** Si el usuario hizo el turno de noche
     que empieza el día anterior (y termina la mañana del día X), el turno de
     DÍA del día X no puede aparecerle como disponible: viene saliendo.
3. El **contador** del chip usa la misma definición (antes contaba todos los
   cupos; ahora solo los elegibles).

**Hallazgos de la revisión adversarial incorporados:**
- El texto del día colapsado pasó de "N cupo(s) libre disponible" a
  "N cupo(s) libre(s)": cuenta TODOS los cupos del día (cobertura), y con el
  chip nuevo la palabra "disponible" habría mentido cuando alguno no es
  elegible para el usuario.
- Guard defensivo en la regla (b): `t.fechaFin !== t.fecha`, para que un turno
  con fecha de término ausente (el mapper la rellena con la de inicio) no
  bloquee indebidamente los cupos de día de su propia fecha.

**Limitación preexistente que hay que saber (documentada en el código):** el
endpoint de turnos del backend NO emite `solicitudPendiente`/`cambioAprobado`,
así que el chip "Solicitudes" cuenta 0 con datos reales — igual que le pasaba
al viejo "Pendientes". Hacerlo funcionar de verdad requiere exponer ese estado
desde el backend (requerimiento aparte).

**Qué NO cambió, a propósito:**
- El aviso de jefatura "N turnos libres en agenda" y los badges "N cupo(s)
  libre" de cada día siguen contando TODOS los cupos del servicio: son
  información de cobertura (gestión), no de elegibilidad personal. Por eso el
  chip puede decir una cifra menor que los badges.
- El caso simétrico (bloquear la NOCHE del día X si se trabajó el DÍA del X)
  **no** se implementó: no fue pedido, y encadenar día→noche o hacer noches
  seguidas son patrones que en urgencias sí ocurren. Si se quiere esa regla,
  es un requerimiento nuevo.
- El filtro aplica igual para todos los roles, incluida jefatura. Ojo con la
  consecuencia: el banner de jefatura ("N turnos libres en agenda") cuenta
  todos los cupos, y el chip "Disponibles" puede mostrar menos (excluye los no
  elegibles para el propio jefe). Para asignar cupos a otros, jefatura usa
  "Todos" o el calendario. Si se prefiere que jefatura vea todos los cupos bajo
  "Disponibles", es un ajuste de una línea (condicionar por canAssignFreeTurns).

## Cómo se hizo

Archivo único: `sgt-huap_frontend/src/components/Comun/AgendaView.jsx`, en el
bloque "CONTADORES DE FILTROS":

1. Renombrar `countPendientes` → `countSolicitudes` y su entrada en `FILTERS`
   a `{ id: "solicitudes", label: "Solicitudes", ... }`; la rama de
   `visibleDays` pasa a `if (filter === "solicitudes") ...` (misma condición).
2. Reemplazar `countLibres` y la rama `filter === "libres"` por:
   ```jsx
   const misTeamKeys = useMemo(
     () => new Set((agendaData.turnos || []).filter((t) => t.miTurno && t.teamKey).map((t) => t.teamKey)),
     [agendaData.turnos]
   );
   const misMananasPostNoche = useMemo(
     () => new Set(
       (agendaData.turnos || [])
         .filter((t) => t.miTurno && t.tipo === "noche" && t.fechaFin)
         .map((t) => t.fechaFin)
     ),
     [agendaData.turnos]
   );
   const esDisponibleParaMi = (s) =>
     s.turnoLibre &&
     !(s.teamKey && misTeamKeys.has(s.teamKey)) &&
     !(s.tipo === "dia" && misMananasPostNoche.has(s.fecha));
   ```
   y usar `esDisponibleParaMi` tanto en `countDisponibles` como en la rama
   `filter === "disponibles"` de `visibleDays`.

### Por qué funciona con los datos que ya llegan

`mapTurnoForAgenda` (en `src/services/funcionarioService.js`) ya expone todo lo
necesario, sin llamadas nuevas:
- `teamKey = "{fechaInicio}-tipo-{idTipoTurno}"` identifica el bloque día/noche;
  mi turno y el cupo libre del mismo bloque comparten esa clave.
- `tipo` se deriva de las fechas: `'noche'` si el turno cruza medianoche.
- `fechaFin` de una noche es la mañana en que termina — exactamente el día cuyo
  turno diurno hay que bloquear (regla b).

## Cómo probarlo

1. Con un médico que tenga turnos y cupos en su equipo (seed: cualquier día con
   su turno + vacante en el mismo bloque): ese día NO debe listarse bajo
   "Disponibles" por ese cupo (sí puede listarse por un cupo de otro bloque).
2. Si el usuario tiene turno de noche el día X: el cupo de DÍA del día X+1 no
   debe aparecer bajo "Disponibles"; el de NOCHE del X+1 sí.
3. El contador del chip debe coincidir con los días/cupos que el filtro lista.
4. Los nombres visibles deben ser: Todos · Mis turnos · Solicitudes · Disponibles.
