# R12 · (bug) No se puede solicitar dos veces el mismo turno

**Estado: pendiente de visto bueno** · Fecha: 2026-08-25 · Alcance: backend + frontend

## Qué se pidió

> "La persona puede solicitar más de una vez el turno; debería no poderse y que
> lo impida diciendo 'ud ya solicitó este turno'"

## Qué se hizo

**1. La garantía, en el backend** (única defensa real: dos pestañas o dos
dispositivos evaden cualquier chequeo del cliente).
`SolicitudService.crearSolicitud` ahora rechaza la creación si el emisor ya
tiene una solicitud **PENDIENTE** sobre el mismo turno:

```java
if (turno != null && solicitudRepository.existsByFuncionario_IdFuncionarioAndTurno_IdTurnoAndEstado(
        idFuncionarioEmisor, turno.getIdTurno(), SolicitudEntity.EstadoSolicitud.PENDIENTE)) {
    throw new RuntimeException("Ud. ya solicitó este turno");
}
```
con el método `existsBy...` nuevo en `SolicitudRepository`. El
`GlobalExceptionHandler` existente convierte esto en `400 {"error": "Ud. ya
solicitó este turno"}`. La regla es por (funcionario, turno): otro postulante
NO te bloquea (eso es justamente R10), y una solicitud RECHAZADA o APROBADA
tampoco — puedes volver a postular si la tuya fue rechazada.

Tests: `SolicitudServiceTest` suma `crear_coberturaDuplicadaMismoTurno_lanzaYNoGuarda`
y `crear_conSolicitudPendienteDeOtroFuncionario_noBloquea` (61/61 verdes).

**2. El mensaje, visible.** Los `catch {` vacíos de `SolicitudesView` tragaban
el mensaje del servidor y mostraban un genérico. Ahora `CrearSolicitudSheet` y
los handlers de aprobar/rechazar/responder muestran `e?.message` (el
interceptor de axios ya extraía `data.error` — solo nadie lo leía). Al intentar
duplicar, el usuario ve exactamente **"Ud. ya solicitó este turno"**.

**3. Prevención en la UI** (con la marca de R11): en el detalle del turno, la
tarjeta de una vacante que ya solicitaste pasa a **"Ya solicitaste este
turno"** (gris, con check, deshabilitada) en vez de invitarte a solicitar. El
botón inferior "Solicitar turno" ya se ocultaba solo gracias al gate existente
que R11 encendió.

## Archivos

- `huap_backend/.../Repository/SolicitudRepository.java` (método exists + query de R11)
- `huap_backend/.../Service/SolicitudService.java` (validación anti-duplicado)
- `huap_backend/.../test/.../SolicitudServiceTest.java` (2 tests nuevos)
- `sgt-huap_frontend/src/components/Admin2/SolicitudesView.jsx` (catch con mensaje real)
- `sgt-huap_frontend/src/components/Comun/ShiftDetail.jsx` (tarjeta "Ya solicitaste este turno")

## Cómo probarlo

1. Solicitar un cupo libre; volver a abrir el mismo turno: la tarjeta debe
   decir "Ya solicitaste este turno" y no ser tocable.
2. Forzar el duplicado por la otra vía (Solicitudes → Nueva → Cobertura,
   eligiendo el mismo turno del picker): al enviar debe aparecer
   "Ud. ya solicitó este turno" y no crearse nada.
3. Si jefatura rechaza tu solicitud, debes poder volver a solicitar ese turno.
