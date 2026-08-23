# R7 · Encabezado de grupo: "Día: Turno X" (rotativa del equipo)

**Estado: aprobado ✅** (visto bueno del usuario, 2026-08-23) · Fecha: 2026-08-23 · Alcance: solo frontend (+ un ajuste de datos)

## Qué se pidió

> "Ahí donde dice Dia me gustaría que diga: 'Día: turno X'"

Referido al encabezado de las secciones Día / Noche dentro de la tarjeta de un
día en el home (y, por coherencia, en el detalle del día del calendario).

## Diferencia con R3 (importante para quien replique esto)

R3 ya agregaba un sufijo a ese título, pero con dos reglas que este
requerimiento corrige:

| | R3 (antes) | R7 (ahora) |
|---|---|---|
| Qué se anexa | el **puesto** del usuario | la **rotativa** del equipo |
| Cuándo se muestra | solo si el turno era **tuyo** | **siempre** |

El motivo del cambio: "Turno I / Turno II / Turno III" es el nombre de la
**rotativa** (el equipo que cubre ese día), no del puesto — la misma corrección
que ya se había hecho en R2. Y debe verse tengas turno o no: sirve justamente
para saber qué equipo está de turno un día en que tú no trabajas. El puesto no
se pierde: sigue visible en la fila "Puesto" del detalle del turno.

## Cómo se determina la rotativa de un grupo

Un grupo día/noche lo cubre normalmente **una** rotativa. Puede haber
excepciones (un cupo cubierto por alguien de otro equipo, o turnos sin rotativa
como las vacantes y las asignaciones manuales), así que se toma la **rotativa
mayoritaria** del grupo y se ignoran los turnos sin rotativa. Si ningún turno
del grupo tiene rotativa, no se anexa nada.

> Verificación sobre los 945 turnos de agosto 2026: 63 grupos de 15 turnos;
> 53 con una sola rotativa y 10 con un reparto 14+1. Los 10 casos vienen de un
> único dato del seed (Pedro Marín aparece dos veces en "Médico General 9" con
> rotativas distintas), no de un patrón real del servicio.

## Cómo se hizo

1. **Los constructores de grupos exponen la rotativa del equipo.** En
   `src/services/funcionarioService.js` (`buildAgendaData`) y
   `src/services/turnosService.js` (`buildTurnoTeams`), junto al cálculo de
   `group.totalTurnos`:
   ```js
   group.nombreRotativa = rotativaDominante(turnos);   // grupoTurnos en turnosService
   ```
   con el helper `rotativaDominante(turnos)` definido en cada archivo (cuenta
   `t.nombreRotativa` no nulos y devuelve el más frecuente, o `null`).
2. **Home** — `src/components/Comun/AgendaView.jsx`, en el `dayTeams.map`:
   ```js
   const rotativaGrupo = group?.nombreRotativa || rep.nombreRotativa || null;
   const tituloCard =
     (rep.nombreTipoTurno || (rep.tipo === "dia" ? "Turno día" : "Turno noche")) +
     (rotativaGrupo ? `: ${rotativaGrupo}` : "");
   ```
   (`tituloCard` alimenta el texto visible y el `aria-label`).
3. **Detalle del turno** — `src/components/Comun/ShiftDetail.jsx`, en el header:
   el sufijo pasa a ser `shift.nombreRotativa || groupData?.nombreRotativa`
   (el turno concreto manda; si es una vacante sin rotativa, cae al grupo).
4. **Calendario** — `src/components/Comun/calendarView.jsx`: `buildDayGroups`
   agrega `nombreRotativa: rotativaDominanteCal(group.turnos)` (mismo criterio,
   helper local) y el header del grupo renderiza
   `{group.nombre}{group.nombreRotativa ? `: ${group.nombreRotativa}` : ''}`.

### Ajuste de datos: "Dia" → "Día"

El tipo de turno se llamaba `Dia` sin tilde en el seed, y eso es lo que se
mostraba. Corregido en `poblado_urgencias_gestionturnos.sql` y
`desarrollo/gestionturnos/02_datos.sql`. La búsqueda del import de agosto quedó
tolerante a ambas grafías (`nombre IN ('Día', 'Dia')`) para que siga
funcionando sobre una base ya cargada con el nombre antiguo.

En una base **ya desplegada**, renombrar sin recargar nada:
```sql
UPDATE tipo_turno SET nombre = 'Día' WHERE id_servicio = 4 AND nombre = 'Dia';
```
(en el repo con datos reales, revisar antes cómo están nombrados los tipos de
turno de cada servicio — puede que no aplique).

## Cómo probarlo

1. Home → expandir un día **sin turno propio**: los encabezados deben decir
   "Día: {rotativa}" y "Noche: {rotativa}" (antes decían solo "Dia"/"Noche").
2. Expandir un día **con turno propio**: igual, más el badge "Tu turno".
3. Abrir el detalle: el título debe mostrar la misma rotativa; el puesto sigue
   en la fila "Puesto".
4. Calendario → tocar un día: las secciones Día/Noche del sheet deben mostrar
   también la rotativa.
