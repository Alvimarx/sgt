# R14 · El picker de intercambio ofrece solo canjes posibles

**Estado: pendiente de visto bueno** · Fecha: 2026-08-26 · Alcance: backend + frontend

## Qué se pidió

> "Cuando solicito cambio de turno salen todos los turnos de esa persona,
> incluidos los turnos del pasado, turnos en los que yo estoy, cuando deberían
> aparecerme solo los turnos con los que es posible hacer el cambio (incluidos
> los que pongan a alguno de los dos en la situación de '24hrs invertido')"

## Qué se hizo

Nuevo endpoint `GET /api/v2/turnos/intercambiables?idTurnoPropio&idFuncionarioReceptor`
(`TurnoService.getTurnosIntercambiables`): devuelve solo los turnos del receptor
con los que el usuario autenticado puede canjear el turno propio elegido. El
criterio es **exactamente el mismo validador** que corre al crear y al aprobar
la solicitud (`ValidadorAsignacionTurnoService`), para que el picker y la
validación real no puedan divergir. Descarta:

1. turnos que ya empezaron (de ambos lados: si TU turno a entregar ya empezó,
   la lista sale vacía);
2. canjes que dejen a cualquiera de los dos con solape o **"24 invertido"**
   (simulando el intercambio: cada calendario sin el turno que entrega);
3. turnos de **otro servicio** (la aprobación exige que ambos turnos sean del
   servicio del resolutor: un canje cruzado sería inaprobable por diseño);
4. turnos ya **comprometidos** en otra solicitud pendiente del emisor
   (incluido el turno propio: si ya lo ofreciste en otra solicitud, lista
   vacía con explicación).

En el frontend (`SolicitudesView`), el picker "Turno del receptor" usa este
endpoint cuando ya elegiste tu turno (y cae a "turnos futuros" si aún no);
cambiar el turno propio o el receptor purga la preselección; una preselección
que llegue por preset y ya no sea intercambiable también se purga; y un aviso
explica los casos de lista vacía.

Además, los pickers de turnos PROPIOS (botar, ofrecer, entregar) pasaron de
"todo mi historial" a **turnos futuros de verdad**: el endpoint `/futuros`
ahora excluye turnos ya iniciados (antes incluía el de hoy ya empezado y el
nocturno de anoche) y amplía el horizonte de 3 a 12 meses (el tope corto hacía
desaparecer turnos legítimos de planificaciones largas).

## Hallazgos de la revisión adversarial incorporados

- Filtro por servicio y bloqueo del turno propio comprometido/pasado (puntos
  3-4 de arriba): sin ellos el picker ofrecía canjes que el backend rechazaría
  siempre.
- Carrera de UI: al cambiar receptor o turno propio la lista anterior se
  limpiaba tarde y podía elegirse un turno de la lista obsoleta; ahora se
  vacía y muestra "cargando" antes de pedir la nueva.

## Archivos

- `huap_backend/.../Service/TurnoService.java` (getTurnosIntercambiables,
  puedeAsignarse, getTurnosFuturosFuncionario)
- `huap_backend/.../Controller/TurnoController.java` (GET /turnos/intercambiables)
- `sgt-huap_frontend/src/services/adminService.js` (getIntercambiables)
- `sgt-huap_frontend/src/components/Admin2/SolicitudesView.jsx` (efecto del
  picker, purgas, aviso)

## Cómo probarlo

1. Intercambio con una persona: el picker ya no muestra turnos pasados ni
   turnos que chocan con los tuyos; si tu noche termina el día X, el DÍA del X
   de esa persona no aparece (24 invertido), pero su NOCHE del X sí.
2. Elegir como turno propio uno que ya ofreciste en otra solicitud: lista
   vacía con la explicación.
3. El picker "tu turno a entregar" ya no lista turnos de ayer ni el que está
   en curso, y sí muestra turnos a más de 3 meses.
