# R2 · Resumen del turno propio: "Tienes turno {tipo}: {puesto}"

**Estado: pendiente de visto bueno** · Fecha: 2026-08-23 · Alcance: solo frontend

## Qué se pidió

> "En el Filtro Todos, cuando tengo turno dice 'Equipo noche' cuando debería
> decir 'Tienes turno Noche: Turno III' o 'Tienes turno Día: Turno X'"

## Qué se hizo

En la tarjeta colapsada de cada día del home, cuando el usuario tiene turno,
la línea que decía `Equipo {tipo de turno}` ahora dice
`Tienes turno {tipo de turno}: {puesto del usuario}` (en el repo real los
puestos se llaman "Turno I", "Turno II", …; en el de prueba, "Urgenciólogo 1",
"Coordinador", etc.). Si el turno no tiene puesto, se omite el sufijo `: …`.

## Por qué así

"Equipo noche" no dice nada accionable; el médico quiere saber de una mirada
**qué turno tiene y en qué puesto**. El dato ya venía en el payload del backend
(`nombrePuesto`), solo no se mostraba.

## Cómo se hizo

1. `sgt-huap_frontend/src/components/Comun/AgendaView.jsx` — en `DayRow`,
   buscar el bloque con ancla `Equipo {miShift.nombreTipoTurno}` y reemplazar
   su contenido por:
   ```jsx
   Tienes turno {miShift.nombreTipoTurno}{miShift.nombrePuesto ? `: ${miShift.nombrePuesto}` : ""}
   ```
   (el guard exterior `{miShift.nombreTipoTurno && ...}` se conserva).

2. **Normalización del centinela "Sin Puesto"** (necesaria para que el punto
   anterior omita el sufijo cuando corresponde): el backend
   (`TurnoService.convertirTurnoAMap`) nunca envía `nombrePuesto` null — para
   turnos sin puesto envía el string literal `"Sin Puesto"`. Se agregó en
   `src/services/funcionarioService.js` y `src/services/turnosService.js` un
   helper y se usó en ambos mappers (`mapTurnoForAgenda` y
   `mapTurnoCalendario`):
   ```js
   const limpiarNombrePuesto = (nombre) => {
       if (!nombre) return null;
       return /^sin puesto$/i.test(String(nombre).trim()) ? null : nombre;
   };
   // ...
   nombrePuesto: limpiarNombrePuesto(turno?.nombrePuesto),
   ```
   Sin esto, un turno sin puesto mostraría "Tienes turno Dia: Sin Puesto".

## Cómo probarlo

1. Entrar como un médico con turnos (ej. seed: Pablo Garrido, 30000070-0) y
   mirar el home en "Todos" o "Mis turnos": los días con turno propio deben
   decir "Tienes turno Dia: Médico General 7" (o el puesto que corresponda).
2. Si existe un turno propio sin puesto, la línea debe decir solo
   "Tienes turno Dia" (sin ": Sin Puesto").
