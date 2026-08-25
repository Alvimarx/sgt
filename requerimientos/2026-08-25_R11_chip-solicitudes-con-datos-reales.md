# R11 · (bug) El filtro "Solicitudes" del home ahora muestra lo solicitado

**Estado: pendiente de visto bueno** · Fecha: 2026-08-25 · Alcance: backend + frontend mínimo

## Qué se pidió

> "Hay un bug: en el filtro 'Solicitudes' no se ven los turnos solicitados
> [...] y que aparezca en el filtro de 'solicitados'"

## Diagnóstico

No era un bug del filtro: el frontend siempre estuvo listo (el chip, el badge
"Pendiente", el banner y el gate del detalle consumen `turno.solicitudPendiente`
desde el primer día), pero **el backend jamás emitió ese campo** —
`TurnoService.convertirTurnoAMap` solo saca datos de la tabla de turnos. Estaba
documentado como limitación en R9. Todos los turnos llegaban con
`solicitudPendiente = undefined` → `false` → chip en 0.

## Qué se hizo (backend)

`TurnoService` ahora marca `solicitudPendiente: true` en los turnos sobre los
que **el usuario autenticado** tiene una solicitud PENDIENTE, en los dos
listados que alimentan la agenda y el calendario:

- `getTurnosByServicioConDetalles` (agenda del home), y
- `getTurnosCalendario` (calendario y sheet del día).

Implementación (archivos):

1. `Repository/SolicitudRepository.java` — proyección en una consulta:
   ```java
   @Query("SELECT s.turno.idTurno FROM SolicitudEntity s " +
          "WHERE s.funcionario.idFuncionario = :idFuncionario AND s.estado = :estado AND s.turno IS NOT NULL")
   List<Long> findTurnoIdsByFuncionarioAndEstado(...);
   ```
2. `Service/TurnoService.java` — helper privado
   `marcarSolicitudesPendientesDelUsuario(List<Map<String,Object>> turnos)`:
   obtiene el id del usuario del JWT (`seguridadServicio.idUsuarioActual()`,
   patrón de la casa), trae el set de ids en UNA consulta (nada por turno) y
   pone `solicitudPendiente=true` donde corresponde. Si no hay usuario en el
   contexto, deja la lista sin marcar en vez de fallar. Los dos métodos listados
   arriba envuelven su return con este helper. (`TurnoService` ya tenía
   inyectados `SeguridadServicio` y `SolicitudRepository` sin uso.)

## Qué se encendió solo en el frontend (sin tocar código)

Con el dato llegando, todo lo que ya estaba escrito empezó a funcionar:
- el chip **"Solicitudes"** del home cuenta y lista los días con turnos que
  solicitaste;
- el badge "Pendiente" sobre el turno y el aviso del banner;
- el gate del detalle (`ShiftDetail`) que oculta "Solicitar turno" cuando ya
  hay una solicitud pendiente sobre ese turno.

Único cambio de código frontend: el comentario de `AgendaView` que documentaba
la limitación (ancla `countSolicitudes`) se actualizó. `cambioAprobado` sigue
sin emitirse (el badge "✓ Aprobado" queda para un requerimiento futuro).

## Cómo probarlo

1. Como médico, solicitar la cobertura de un cupo libre.
2. Volver al home: el chip "Solicitudes" debe contar ≥1 y al seleccionarlo debe
   listar el día del turno solicitado.
3. Abrir ese turno: la tarjeta de la vacante debe decir "Ya solicitaste este
   turno" y el botón "Solicitar turno" no debe aparecer.
