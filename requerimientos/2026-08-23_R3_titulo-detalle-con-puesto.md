# R3 · Título del detalle de turno con el puesto propio

**Estado: aprobado ✅** (visto bueno del usuario, 2026-08-23) · Fecha: 2026-08-23 · Alcance: solo frontend

> ⚠️ **SUPERSEDIDO EN PARTE POR R7.** Lo que aquí se implementó (anexar el
> **puesto**, y solo cuando el turno es tuyo) fue reemplazado: el sufijo pasó a
> ser la **rotativa** del equipo y se muestra siempre. Al replicar, aplicar
> directamente R7 en vez de este documento; se conserva como historia de la
> decisión.

## Qué se pidió

> "Cuando abro un turno desde el home (cuando se divide en Día y Noche), dice
> 'Día' o 'Noche' cuando debería decir 'Día: Turno III' / 'Noche: Turno X'"

## Qué se hizo

El puesto del usuario ahora acompaña al tipo de turno en los DOS títulos
involucrados al abrir un turno desde el home:

- la **card expandida** del día (la que separa Día y Noche), y
- el **encabezado del sheet** de detalle que se abre al tocarla.

La regla en ambos: el sufijo `: {puesto}` solo aparece cuando el turno mostrado
**es del usuario** (en la card, cuando el grupo contiene su turno; en el sheet,
cuando `shift.miTurno`). Para grupos ajenos el título queda como estaba — un
grupo contiene varios puestos y anexar uno arbitrario sería engañoso.

## Por qué así

Cuando el grupo incluye el turno del usuario, el turno "representante" de la
card ES el suyo (el agrupador `dayTeams` hace `if (s.miTurno) entry.rep = s`),
así que `rep.nombrePuesto` es exactamente su puesto — el dato correcto sin
ninguna llamada nueva.

## Cómo se hizo

1. `sgt-huap_frontend/src/components/Comun/AgendaView.jsx` — en `DayRow`,
   dentro del `dayTeams.map(...)`, se computa un título único (se usa también
   en el `aria-label` para que el lector de pantalla diga lo mismo que se ve):
   ```jsx
   const tituloCard =
     (rep.nombreTipoTurno || (rep.tipo === "dia" ? "Turno día" : "Turno noche")) +
     (hayMiTurno && rep.nombrePuesto ? `: ${rep.nombrePuesto}` : "");
   ```
   y se usa en el `<span>` del título y en `aria-label={`Ver detalle: ${tituloCard}`}`.

2. `sgt-huap_frontend/src/components/Comun/ShiftDetail.jsx` — en el header del
   sheet, ancla `{shift.nombreTipoTurno ||` (el título en mayúsculas):
   ```jsx
   {(shift.nombreTipoTurno ||
       shift.nombreTipo ||
       shift.nombre ||
       (shift.tipo === "dia" ? "Turno día" : "Turno noche")) +
       (shift.miTurno && shift.nombrePuesto ? `: ${shift.nombrePuesto}` : "")}
   ```

Ambos orígenes del sheet (home y calendario) mapean `miTurno` y `nombrePuesto`,
así que no hay estados que rompan el título.

## Cómo probarlo

1. Home → expandir un día donde tengas turno → la card de tu grupo debe decir
   "Dia: {tu puesto}" y la del otro grupo solo "Noche" (o viceversa).
2. Tocar tu card → el encabezado del sheet debe decir "DIA: {TU PUESTO}".
3. Abrir un grupo donde NO tengas turno → título sin sufijo de puesto.
