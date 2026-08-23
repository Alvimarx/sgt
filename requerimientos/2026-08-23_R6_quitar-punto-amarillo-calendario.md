# R6 · Quitar el punto amarillo del calendario

**Estado: pendiente de visto bueno** · Fecha: 2026-08-23 · Alcance: solo frontend

## Qué se pidió

> "Que desaparezcan los puntos amarillos, ya que hay turnos del servicio todos
> los días, solo ensucia"

## Qué se hizo

El calendario marcaba cada día con hasta tres puntos: **mi turno** (azul/color
del tipo), **cupo libre** (coral) y **turno del servicio** (amarillo `--warn`,
condición "hay turnos de otros ese día"). Como el servicio tiene turnos todos
los días, el amarillo aparecía siempre y no aportaba. Se eliminó ese punto y su
entrada en la leyenda. Los otros dos puntos quedan igual.

## Por qué así

Eliminación quirúrgica del indicador, sin tocar los datos: los días con solo
turnos ajenos **siguen siendo clicables** (la condición de tap es
`shifts.length > 0`, independiente de los puntos) y el sheet del día sigue
mostrando la cobertura completa del servicio.

## Cómo se hizo

Archivo único: `sgt-huap_frontend/src/components/Comun/calendarView.jsx`.

1. Eliminar la línea `const hasAjeno = shifts.some(s => !s.turnoLibre && s.idFuncionario && !s.miTurno);`
2. Eliminar la línea `{hasAjeno && <Dot color={isToday ? 'rgba(255,255,255,0.5)' : PA.warn} />}`
3. Eliminar la entrada de la leyenda `<LegendDot color={PA.warn} label="Turno del servicio" />`
4. (Cosmético) El texto guía "Toca un día con punto para ver sus turnos" pasó a
   "Toca un día para ver sus turnos", porque ahora hay días clicables sin punto.

**No tocar**: `tappable`/`shifts.length > 0`, el fetch con `esJefatura: true`
(alimenta la cobertura del sheet), los componentes `Dot`/`LegendDot`
(compartidos por los puntos restantes) ni el color `--warn`/`PA.warn` (se
reutiliza para el estilo de vacantes en varias vistas).

## Cómo probarlo

1. Abrir el calendario: solo deben verse puntos en días con turno propio o cupo
   libre; la leyenda debe tener 2 entradas.
2. Tocar un día sin puntos (solo turnos ajenos): debe seguir abriendo el sheet
   con la cobertura del día.
