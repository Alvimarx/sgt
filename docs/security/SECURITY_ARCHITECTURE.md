# Arquitectura de seguridad — SGT HUAP

## 1. Arquitectura general

Aplicación de gestión de turnos hospitalarios (SGT), de tres capas, contenedorizada:

```
Internet
   │  HTTP :5173 (→80) / HTTPS :443 (sin TLS configurado — SEC-001)
   ▼
┌─────────────────────────┐
│  apache-lb (Apache 2.4) │  único punto de entrada público
│  - reverse proxy        │
│  - load balancing       │
│  - headers de seguridad │  parciales (ver SEC-010)
└───────────┬─────────────┘
            │ red interna "huap-network" (bridge, 10.55.0.0/16)
   ┌────────┼─────────────────────┐
   ▼        ▼                     ▼
frontend-1/2/3            backend-1/2/3 (Spring Boot, JWT stateless)
(React est. + Apache)     │
                          ├─► MySQL "gestionturnos" (propia, lectura/escritura)
                          └─► MySQL "innhosp"."viewPersonal" (hospital, SOLO LECTURA)
```

## 2. Componentes

| Componente | Responsabilidad |
|---|---|
| `apache-lb` | TLS (pendiente), balanceo por `mod_proxy_balancer`, headers de seguridad, health checks |
| `backend-1/2/3` | API REST `/api/v2/**`, autenticación JWT, reglas de negocio, acceso a BD |
| `frontend-1/2/3` | SPA React servida como estático, consume `/api/v2` vía Axios |
| MySQL `gestionturnos` | Modelo de datos propio: turnos, planificaciones, rotativas, solicitudes, ofertas, bitácora, funcionarios (registro local), roles |
| MySQL `innhosp.viewPersonal` | Fuente de verdad del **personal del hospital** (RUT, nombre, cargo, estado, hash de clave) — de solo lectura para SGT |

## 3. Flujo de datos — autenticación (dos pasos)

1. `POST /api/v2/funcionarios/login` (público) — RUT + contraseña.
   - Se valida contra `viewPersonal` (hospital) primero; si no existe, contra `Funcionario` local (fallback legacy).
   - Contraseña verificada con `PasswordEncoder.matches()` (BCrypt para cuentas nuevas del propio sistema; SHA-512 sin prefijo para el hash heredado del hospital, vía `DelegatingPasswordEncoder` con `setDefaultPasswordEncoderForMatches`).
   - Control de fuerza bruta por RUT (`LoginAttemptService`, en memoria, 5 intentos).
   - Si es válido: se emite un JWT de **pre-autorización** (5 min, claim `tipo=PRE_AUTH`, sin rol) con la lista de servicios disponibles.
2. `POST /api/v2/funcionarios/login/select-service` (público) — el cliente envía el pre-auth token + el servicio elegido.
   - Se emite el JWT **final** (24 h por defecto, claim `tipo=FINAL`) con `rol` (rol de servicio: MEDICO/JEFATURA/SUBROGANTE) y `rolSistema` (ADMINISTRADOR/USUARIO), firmado HMAC (`app.jwt.secret`).
3. El frontend guarda el JWT en **`localStorage`** (`tokenManager.js`) y lo adjunta como `Authorization: Bearer <token>` en cada request (interceptor Axios). No se usan cookies de sesión en ningún punto del backend.
4. `JwtAuthenticationFilter` valida firma/expiración en cada request y puebla el `SecurityContext` con autoridades `ROLE_<rol>` y `ROLE_<rolSistema>`.

## 4. Límites de confianza

| Límite | De | A | Controles |
|---|---|---|---|
| Internet → apache-lb | Usuario/atacante anónimo | Proxy | Ninguno de red (sin WAF); headers básicos; **sin TLS** |
| apache-lb → backend | Proxy (confiado) | Spring Boot | Red Docker interna; sin mTLS (aceptable, red privada) |
| backend → BD propia | Aplicación | MySQL `gestionturnos` | Credenciales por variable de entorno; sin TLS de conexión confirmado (`Requiere validación adicional`) |
| backend → BD hospital | Aplicación | MySQL `innhosp` (externa) | Usuario de **solo lectura**; fuera del control del equipo SGT |
| Cliente (browser) → API | Usuario autenticado | Backend | JWT Bearer; sin cookies; CORS (ver SEC-002) |
| Usuario autenticado → funciones administrativas | Rol MEDICO/JEFATURA | Rol ADMINISTRADOR | `@PreAuthorize` / `SecurityConfig` por ruta (parcial — ver SEC-004 para huecos) |

## 5. Activos críticos

- **Credenciales de personal de salud** (RUT + hash de contraseña) — en `innhosp.viewPersonal` (hospital) y `Funcionario` (local).
- **Datos de turnos y asignaciones** — quién trabaja dónde y cuándo (operacionalmente sensible, no público).
- **JWT_SECRET** — compromete la integridad de toda la autenticación si se filtra.
- **Credenciales de BD** (`DB_PASSWORD`, `HOSPITAL_DB_PASSWORD`) — acceso directo a datos de personal.
- **Bitácora de eventos** (`Bitacora_eventos`) — trazabilidad/auditoría de cambios de turnos, asignaciones y solicitudes; su integridad es relevante para resolver disputas laborales.

## 6. Puntos de entrada (superficie de ataque expuesta a Internet)

- `POST /api/v2/funcionarios/login` — público, sin rate limiting de borde.
- `POST /api/v2/funcionarios/login/select-service` — público.
- `GET /api/v2/health`, `GET /api/v2/info` — público (el segundo filtra info del entorno, ver SEC-011).
- `GET /api/v2/servicios` — público (listado de servicios para pantalla de login).
- Todo el resto de `/api/v2/**` — requiere JWT válido; algunos requieren además rol específico (`GLOBAL_ADMIN_PATHS`, `SERVICE_ADMIN_PATHS` en `SecurityConfig`), pero varios controllers (`FuncionarioController` en su mayoría) **no tienen restricción de rol más allá de "autenticado"**, ver SEC-004.
- Frontend estático (`/`, assets) — sin autenticación (esperado, es una SPA pública que luego pide login).
- WebSocket `/api/ws/*` — con reglas de proxy para upgrade; **no se encontró implementación real de endpoints WebSocket en el backend** (`Requiere validación adicional` si se planea usar).

## 7. Dependencias externas

- Base de datos del hospital (`innhosp`) — integración de solo lectura, fuera del ciclo de despliegue de SGT.
- Fuentes de Google Fonts (`@import url(fonts.googleapis.com...)` en `style.css`) — llamada a un tercero desde el navegador del usuario final; expone la IP del usuario a Google en cada carga (bajo impacto, pero es una dependencia de terceros no auto-alojada).
- No se encontraron integraciones de correo (`spring-boot-starter-mail` está en el `pom.xml` pero no se confirmó un flujo activo que lo use — `Requiere validación adicional`), pasarelas de pago, ni proveedores OAuth externos.

## 8. Sistema de autorización (RBAC)

Roles de **sistema**: `ADMINISTRADOR`, `USUARIO` (implícito). Roles de **servicio**: `MEDICO`, `JEFATURA`, `SUBROGANTE`.

`SecurityConfig` define dos franjas por ruta:
- `GLOBAL_ADMIN_PATHS` (servicios, tipos-turno, rotativas, planificaciones) → solo `ADMINISTRADOR` para POST/PUT/DELETE.
- `SERVICE_ADMIN_PATHS` (puestos, turnos, reglas-servicio, Personal) → `ADMINISTRADOR`/`JEFATURA`/`SUBROGANTE` para POST/PUT/DELETE.
- Todo lo demás: `anyRequest().authenticated()` — **sin distinción de rol a nivel de framework**; la autorización fina (dueño del recurso, rol para cambiar campos sensibles) se implementa **dentro de cada controller** de forma ad-hoc (ejemplo correcto: `FuncionarioController.update` valida ownership y bloquea cambio de rol/estado a quien no es JEFATURA/ADMINISTRADOR). Varios endpoints de lectura del mismo controller **no replican ese patrón** (ver SEC-004).

## 9. Servicios que quedarán expuestos a Internet

Solo `apache-lb` (puertos 5173/443). Backend, frontend individuales y ambas bases de datos permanecen en la red Docker interna — **arquitectura de red correcta por diseño**; el trabajo pendiente es completar TLS, cabeceras y rate limiting en ese único punto de entrada.
