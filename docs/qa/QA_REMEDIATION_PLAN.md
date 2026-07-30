# Plan de remediación funcional — SGT HUAP

**Estado: propuesta únicamente.** Ninguna de las correcciones descritas aquí fue implementada durante esta auditoría, conforme a la instrucción explícita del alcance ("solo implementar correcciones si se autoriza explícitamente o si la instrucción posterior lo solicita"). Este documento es el insumo para decidir qué autorizar y en qué orden.

---

## Priorización propuesta

| Orden | Defecto | Severidad | Justificación de prioridad |
|---|---|---|---|
| 1 | BUG-002 (IDOR solicitudes) | Crítica | Mayor volumen de datos personales/motivos expuestos sin ninguna restricción |
| 2 | BUG-007 (IDOR + sin paginación bitácora) | Alta | Expone histórico completo (6.5 MB) del sistema; además riesgo de rendimiento |
| 3 | BUG-004 (IDOR turnos) | Alta | Expone RUT/nombre/cobertura de servicios ajenos |
| 4 | BUG-006 (IDOR notificaciones) | Alta | Expone contenido personal y permite eliminar notificaciones ajenas |
| 5 | BUG-001 (401 vs 403) | Alta | Causa logout involuntario; afecta la experiencia de todos los roles no-admin |
| 6 | BUG-003 (permisos Jefatura/Subrogante para tipos-turno/rotativas/planificaciones) | Alta | Requiere decisión de negocio antes de tocar código — no es un "arreglo" técnico simple |
| 7 | BUG-005 (MEDICO puede evaluar solicitudes) | Media | Requiere confirmación de intención de negocio |
| 8 | BUG-008 (500 en vez de 404) | Baja | Cosmético/observabilidad, sin impacto de seguridad ni de negocio |

---

## BUG-002 — Filtrar `SolicitudController` por identidad/rol/servicio

**Propuesta:** en `SolicitudService.findAllSolicitudes()`, añadir un parámetro de contexto (`idFuncionario`, `rol`, `servicioActivo` extraídos del `Authentication`) y:
- Si el rol es ADMINISTRADOR: sin filtro (ya es el super-admin).
- Si el rol es JEFATURA/SUBROGANTE: filtrar por el/los servicio(s) donde ejerce ese rol.
- Si el rol es MEDICO/USUARIO: filtrar a únicamente `idFuncionario = self` (como solicitante o receptor).

**Pruebas a escribir:** prueba unitaria de `SolicitudService` para cada rol confirmando el subconjunto correcto; prueba de integración con `MockMvc` simulando los 3 perfiles contra `GET /solicitudes`.
**Riesgo de la corrección:** bajo si se implementa como filtro adicional (no cambia el modelo de datos); **medio** si el frontend actual asume recibir el listado completo en alguna vista de administración — requiere revisar qué componente consume este endpoint hoy antes de aplicar el filtro, para no romper una pantalla que hoy depende (sin saberlo) de recibir todo el dataset.

## BUG-007 — Restringir y paginar `BitacoraController`

**Propuesta:** agregar `Pageable` a `GET /bitacoras` (tamaño de página por defecto razonable, ej. 50), y aplicar el mismo filtro por servicio/rol que BUG-002.
**Pruebas a escribir:** prueba de que la respuesta no supere el tamaño de página configurado; prueba de que un MEDICO solo ve bitácora de su(s) servicio(s).
**Riesgo:** medio — el frontend que consume `/bitacoras` (`BitacoraController`) probablemente no maneja paginación hoy; requiere coordinar el cambio de contrato con el componente `AdminDashboard`/vista de bitácora correspondiente.

## BUG-004 — Filtrar `TurnoController` GET por servicio del solicitante

**Propuesta:** para los endpoints `GET /turnos/servicio/{servicioId}/**`, validar que `servicioId` coincida con alguno de los servicios activos del `Authentication`, salvo rol ADMINISTRADOR.
**Pruebas a escribir:** prueba de `TurnoController`/`TurnoService` verificando 403 (una vez corregido BUG-001) al consultar un servicio ajeno.
**Riesgo:** bajo-medio — hay que confirmar que ningún flujo legítimo hoy dependa de consultar turnos de otro servicio (ej. para ofertas generales cross-servicio, si existieran).

## BUG-006 — Validar ownership en `NotificacionController`

**Propuesta:** comparar `idFuncionario` del path con `Authentication.getPrincipal()`; si no coincide y el rol no es ADMINISTRADOR, devolver 403.
**Pruebas a escribir:** prueba de que un usuario no puede leer/marcar/eliminar notificaciones de otro id.
**Riesgo:** bajo — es una funcionalidad inherentemente personal, sin caso de uso legítimo conocido para acceso cruzado.

## BUG-001 — Registrar `AccessDeniedHandler`

**Propuesta:** implementar un `AccessDeniedHandler` que devuelva HTTP 403 con un cuerpo JSON análogo al de `JwtAuthenticationEntryPoint`, y registrarlo en `SecurityConfig.exceptionHandling()`. En el frontend, ajustar `axiosConfig.js` para que el interceptor de auto-logout dispare **solo** en 401, no en 403 (mostrando en su lugar un mensaje de "no tienes permiso" sin cerrar la sesión).
**Pruebas a escribir:** prueba de `SecurityConfig` confirmando 403 (no 401) ante un rol insuficiente; prueba de frontend (si existiera suite) confirmando que un 403 no dispara `logout()`.
**Riesgo:** bajo en backend; **medio en frontend** porque cambia un comportamiento que hoy, aunque incorrecto, es el que el frontend "espera" — requiere probar el flujo de UI completo antes de desplegar.

## BUG-003 — Decisión de negocio pendiente sobre permisos de Jefatura/Subrogante

**Propuesta:** no es una corrección de código de bajo riesgo — requiere que el Product Owner confirme una de dos opciones:
1. **El manual es correcto:** ampliar `SecurityConfig.java` moviendo `/api/v2/tipos-turno/**`, `/api/v2/rotativas/**`, `/api/v2/planificaciones/**` de `GLOBAL_ADMIN_PATHS` a una nueva categoría "administración de servicio ampliada" (Jefatura/Subrogante + validación de que el recurso pertenece a su propio servicio), y agregar las tarjetas correspondientes de vuelta a `JefaturaDashboardView.jsx`/`SubroganteDashboardView.jsx`.
2. **El sistema es correcto:** actualizar el manual para reflejar que estas 3 funciones son exclusivas de ADMINISTRADOR.
**Pruebas a escribir:** dependen de la opción elegida.
**Riesgo:** alto si se opta por la opción 1 sin validar exhaustivamente que Jefatura/Subrogante no puedan crear recursos en servicios ajenos al suyo (nuevo vector de IDOR si se hace mal).

## BUG-005 — Confirmar alcance de MEDICO en aprobación de solicitudes

**Propuesta:** confirmar con negocio; si no es intencional, quitar `MEDICO` de `hasAnyRole('JEFATURA','SUBROGANTE','MEDICO')` en `PUT /solicitudes/{id}/estado` e `/intercambio`.
**Riesgo:** medio — si algún flujo real ya depende de que un MEDICO apruebe cambios entre pares (cobertura informal), removerlo podría romper un caso de uso vigente; **no remover sin confirmación explícita**.

## BUG-008 — Manejar `NoResourceFoundException` como 404

**Propuesta:** agregar `@ExceptionHandler(NoResourceFoundException.class)` en `GlobalExceptionHandler` devolviendo HTTP 404.
**Riesgo:** ninguno detectado — cambio aislado y de bajo impacto.

---

## Recomendación general de secuenciación

1. Aplicar BUG-008 primero (riesgo nulo, gana confianza en el proceso de cambios).
2. Aplicar BUG-006 y BUG-004 (bajo riesgo, alto impacto en exposición de datos).
2bis. Aplicar BUG-001 en backend y frontend juntos, probando el flujo de sesión completo antes de desplegar.
3. Aplicar BUG-002 y BUG-007 (requieren revisar qué pantallas dependen del dataset completo antes de filtrar).
4. Resolver BUG-003 y BUG-005 mediante decisión de negocio explícita antes de tocar código.

Ningún paso de este plan debe ejecutarse sin autorización explícita adicional del usuario, conforme al alcance de esta auditoría.
