# R15 · Un turno comprometido a la vez + cancelar solicitudes

**Estado: pendiente de visto bueno** · Fecha: 2026-08-26 · Alcance: backend + frontend

## Qué se pidió

> "Si ya solicité cambio, debería decirme que el cambio ya está solicitado y
> bloquear cualquier solicitud sobre ese turno, a menos que cancele la
> solicitud (deberían poder cancelarse desde solicitudes)"

## Qué se hizo

**1. Bloqueo "un turno comprometido a la vez" (backend).** Al crear cualquier
solicitud, si el turno pedido —o el ofrecido en un intercambio— ya está
involucrado en otra solicitud PENDIENTE del mismo funcionario (como pedido o
como entregado), se rechaza con un mensaje que nombra la salida: *"…Cancélela
desde Solicitudes para pedir otra cosa sobre él."* Consulta nueva
`contarPendientesQueInvolucranTurno` (cuenta por ambos lados). La marca de
"turno comprometido" del home/calendario (R11) también cubre ahora el lado
"entregado".

**2. Cancelación (backend + frontend).** `PUT /solicitudes/{id}/cancelar`:
solo el **emisor** (identidad del JWT, nunca del path) y solo mientras siga
PENDIENTE. Se marca RECHAZADA con motivo "Cancelada por el solicitante · motivo
original: …" y evento de bitácora `SOLICITUD_CANCELADA` (no se agregó un estado
CANCELADA al enum de la base para no exigir migración; el evento y el motivo
distinguen el caso). En la UI, las solicitudes propias pendientes tienen botón
**"Cancelar solicitud"** con confirmación; la tarjeta de una cancelada muestra
badge **CANCELADA** (neutro), distinguible del rechazo de jefatura; y la
bitácora muestra y filtra el evento de cancelación.

## Endurecimientos que dejó la revisión adversarial (todos aplicados)

- **Cancelar bajo lock**: sin lock, cancelar en paralelo con una aprobación
  podía "ganar" después del commit ajeno (turnos movidos + solicitud
  "cancelada"). Ahora usa el mismo `findByIdForUpdate` que la aprobación.
- **Cancelar por identidad, no por rol**: una jefatura que emitió una solicitud
  no puede resolverla (segregación de funciones) pero SÍ cancelarla; con el
  gate por rol quedaba con su turno bloqueado indefinidamente.
- **La aprobación ya no pisa dueños**: aprobar una cobertura de un cupo que se
  llenó por otra vía, o un intercambio donde alguno de los turnos cambió de
  dueño, ahora falla con mensaje claro en vez de reasignar en silencio.
- **El barrido automático cubre ambos lados**: al aprobar, se rechazan también
  las solicitudes pendientes que pedían u ofrecían el turno ENTREGADO del
  intercambio (antes solo las del turno pedido).
- Mensajes coherentes entre las tres variantes del bloqueo (todos mencionan
  cancelar; sin "cambio" fantasma cuando la pendiente es un permiso u oferta).

## Pendiente anotado (no bloqueante)

- Estado CANCELADA de primera clase en el enum de la BD (requiere migración
  coordinada; hoy el badge se deriva del motivo).
- Tests de integración (Testcontainers) para las consultas JPQL nuevas:
  requieren daemon Docker — correr `./mvnw test` en la otra máquina.

## Archivos

- `huap_backend/.../Repository/SolicitudRepository.java`
- `huap_backend/.../Service/SolicitudService.java` (bloqueo, cancelar,
  propiedad en tipo 3/4, barrido doble)
- `huap_backend/.../Controller/SolicitudController.java`
- `sgt-huap_frontend/.../SolicitudesView.jsx`, `BitacoraView.jsx`,
  `services/adminService.js`

## Cómo probarlo

1. Solicita un cambio entregando tu turno X; intenta cualquier otra solicitud
   que involucre X → bloqueada con el mensaje que menciona cancelar.
2. Solicitudes → tu solicitud pendiente → "Cancelar solicitud" → confirmar. La
   tarjeta pasa a CANCELADA y el turno X vuelve a estar disponible para pedir.
3. Como jefatura, cancela una solicitud emitida por ti misma (no puedes
   aprobarla ni rechazarla, pero cancelar sí).
4. La bitácora muestra "Cancelada por el solicitante" y el filtro por estado
   RECHAZADA la incluye.
