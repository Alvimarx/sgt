# R10 · Postulaciones agrupadas: jefatura elige entre los postulantes

**Estado: pendiente de visto bueno** · Fecha: 2026-08-25 · Alcance: solo frontend

## Qué se pidió

> "Si dos o más personas están solicitando el mismo turno y posición, que se
> agrupen para la jefatura que lo está viendo, y que ella vea ese turno y
> posición y elija entre esas una lista de personas que postularon"

## Qué se hizo

En el tab **Pendientes** de la vista de solicitudes (jefatura/subrogante), las
solicitudes de **Cobertura** (tipo 3) pendientes que apuntan al **mismo turno**
—cuando hay 2 o más— ya no aparecen como tarjetas sueltas dispersas por fecha:
se agrupan en una sola tarjeta **"Postulaciones al mismo turno"** que muestra:

- el turno en disputa (fecha, horario, tipo de turno) y su **posición** (puesto),
- la lista de postulantes (ordenada por orden de llegada), cada uno con su
  motivo y dos acciones: **Elegir** (aprueba su solicitud y le asigna el turno)
  o rechazar individualmente,
- la advertencia de que al elegir a una persona las demás postulaciones se
  rechazan automáticamente.

Las coberturas con un solo postulante, y todos los demás tipos, siguen con su
tarjeta individual de siempre. Los grupos salen al inicio de la lista,
ordenados por fecha del turno.

## Por qué así (dato clave del backend)

**El backend ya resolvía la parte difícil**: al aprobar una solicitud,
`SolicitudService.cambiarEstado` ejecuta `rechazarSolicitudesCompetitivas`, que
rechaza automáticamente las demás solicitudes PENDIENTES del mismo turno con
motivo "Rechazo automático: Otra solicitud para este turno fue aprobada" (y
bitácora `RECHAZO_AUTOMATICO`), bajo lock pesimista del turno. Por eso este
requerimiento es **solo de presentación**: "Elegir" reutiliza el mismo
`PUT /solicitudes/{id}/estado` de siempre y el backend hace la limpieza.

La agrupación es por `turno.idTurno`. Un turno ES una posición concreta (cada
turno tiene su puesto), así que "mismo turno y posición" == "mismo idTurno".

## Cómo se hizo

Archivo único: `sgt-huap_frontend/src/components/Admin2/SolicitudesView.jsx`.

1. Nuevo componente `PostulacionesGrupoCard` (antes de `SolicitudCard`), con el
   estilo de tarjeta de la casa; recibe `grupo` (array de solicitudes del mismo
   turno) y los handlers existentes `onAprobar`/`onRechazar`.
2. Partición de la lista (ancla: `const pendienteCount =`): si `canDecide` y
   `tab === 'pendientes'`, las solicitudes con
   `tipoSolicitud?.tipo === 3 && estado === 'PENDIENTE' && turno?.idTurno != null`
   se agrupan por `String(sol.turno.idTurno)`; los grupos con `length >= 2` se
   extraen (`gruposPostulacion`) y el resto queda en `listaSinAgrupar`.
3. Render (ancla: `currentList.map(s => (`): primero
   `gruposPostulacion.map(...)` con la tarjeta nueva, luego `listaSinAgrupar`
   con `SolicitudCard`; el empty-state considera ambos.

**Ojo con el campo**: el id del turno de una solicitud es
`solicitud.turno.idTurno` (entidad serializada), NO `.id` como en los turnos de
la agenda.

## Cómo probarlo

1. Con dos médicos (seed: dos cuentas 3000xxxx), solicitar Cobertura del MISMO
   cupo libre.
2. Como jefatura (Flavio Ayala 30000006-6), en Solicitudes → Pendientes debe
   aparecer UNA tarjeta "Postulaciones al mismo turno · 2 postulantes" con la
   posición y ambos nombres.
3. "Elegir" a uno: el turno queda asignado a esa persona y en Historial la otra
   solicitud aparece RECHAZADA con el motivo automático.
