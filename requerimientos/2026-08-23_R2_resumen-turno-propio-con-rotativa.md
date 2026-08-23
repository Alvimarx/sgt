# R2 · Resumen del turno propio: "Tienes turno {tipo}: {rotativa}"

**Estado: aprobado ✅** (visto bueno del usuario, 2026-08-23; v2 tras corregir puesto -> rotativa) · Fecha: 2026-08-23 · Alcance: solo frontend

> Historial: la v1 mostraba el **puesto** ("Tienes turno Dia: Médico General 7").
> El usuario corrigió la interpretación: lo que debe aparecer es la **rotativa**
> que le toca (en el repo real se llaman "Turno I", "Turno II", "Turno III"…).

## Qué se pidió

> "En el Filtro Todos, cuando tengo turno dice 'Equipo noche' cuando debería
> decir 'Tienes turno Noche: Turno III' o 'Tienes turno Día: Turno X'"
> — donde "Turno III" es **la rotativa** con la que se generó el turno.

## Qué se hizo

En la tarjeta colapsada de cada día del home, cuando el usuario tiene turno,
la línea dice `Tienes turno {tipo de turno}: {rotativa del turno}`. Si el turno
no tiene rotativa (asignaciones manuales: se crean con `id_rotativa` NULL), se
omite el sufijo y queda solo "Tienes turno {tipo}".

## Por qué así

El backend ya enviaba el dato: `convertirTurnoAMap` (TurnoService.java) emite
`nombreRotativa` con el nombre de la rotativa del turno, o el centinela
`"Sin Rotativa"` cuando no tiene. Solo faltaba mapearlo y mostrarlo. Cero
cambios de backend.

## Cómo se hizo

1. `sgt-huap_frontend/src/services/funcionarioService.js` y
   `src/services/turnosService.js` — el helper de centinelas quedó genérico y
   ambos mappers (`mapTurnoForAgenda`, `mapTurnoCalendario`) exponen el campo:
   ```js
   const limpiarCentinela = (nombre, regexCentinela) => {
       if (!nombre) return null;
       return regexCentinela.test(String(nombre).trim()) ? null : nombre;
   };
   const limpiarNombrePuesto = (nombre) => limpiarCentinela(nombre, /^sin puesto$/i);
   const limpiarNombreRotativa = (nombre) => limpiarCentinela(nombre, /^sin rotativa$/i);
   // ... en el objeto mapeado:
   nombreRotativa: limpiarNombreRotativa(turno?.nombreRotativa),
   ```
2. `sgt-huap_frontend/src/components/Comun/AgendaView.jsx` — en `DayRow`
   (ancla: `Tienes turno {miShift.nombreTipoTurno}`):
   ```jsx
   Tienes turno {miShift.nombreTipoTurno}{miShift.nombreRotativa ? `: ${miShift.nombreRotativa}` : ""}
   ```
   (el guard exterior `{miShift.nombreTipoTurno && ...}` se conserva).

## Cómo probarlo

1. Como un médico con turnos generados por planificación (seed: Pablo Garrido,
   30000070-0), el home debe decir p. ej. "Tienes turno Dia: Lunes Turno (T III)"
   (en el repo real: "Tienes turno Día: Turno III").
2. Un turno asignado a mano (sin rotativa) debe decir solo "Tienes turno Dia",
   sin ": Sin Rotativa".
