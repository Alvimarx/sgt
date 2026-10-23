# Historias de usuario del SGT-HUAP

**Fecha:** 16 de octubre de 2026 (estados al día al 22 de octubre de 2026)
**Código revisado:** rama `desktop-todas-las-pantallas`. Las historias y los criterios se escribieron sobre el commit `ef3c79d` (16 oct); los estados de §3 y §4 están al día al 22 oct (commit `dedb478`), después de las correcciones del cierre (17 al 19 oct) y de las tres que salieron de las pruebas integrales (22 oct).
**Para qué:** probar todas las historias del sistema, en móvil y en desktop, antes de entregarlo a TIC HUAP el 3 de noviembre de 2026 (congelamiento del código: 30 de octubre).

**Estado al 22 de octubre de 2026:**

- El cierre implementó las decisiones de §5 entre el 17 y el 19 oct. Los estados de §3 y §4 describen el código al 22 oct. Los «Código hoy» de §5 y la lista de §5.1 conservan lo que decía el código al 17 oct, antes de esas correcciones; el estado de cada decisión está en `docs/TRASPASO.md` §9.
- Notificaciones (HU-NOT-01 a HU-NOT-03): la bandeja está oculta en la entrega (C-09). Se enciende con `NOTIFICACIONES_HABILITADAS` en `sgt-huap_frontend/src/config/funciones.js`.
- Se agregó HU-JER-03 «Quitar la subrogancia» (C-19) y se retiró HU-CAL-04 (C-05): 77 HU en total, una de ellas retirada.
- Las fases 5 y 6 de las pruebas E2E (§6.2) no se automatizaron.
- Pruebas integrales basadas en reglas, con sus resultados: `docs/qa/pruebas-integrales/`.

---

## 1. Introducción

### 1.1 Para qué sirve

Este catálogo junta en un solo lugar las historias de usuario (HU) del Sistema de Gestión de Turnos del HUAP. Cada HU trae criterios de aceptación que se pueden comprobar en la pantalla. Sirve para dos cosas:

1. Armar y correr las pruebas de punta a punta (E2E) de todas las historias, en móvil y en desktop.
2. Decidir qué se corrige antes del congelamiento y qué se entrega como limitación conocida.

No reemplaza a los catálogos anteriores (FUN-SGT, MF, IF, TC, R, BUG): cada HU dice cuáles la respaldan.

### 1.2 Cómo se lee

Cada HU tiene estos campos:

- **ID** estable `HU-<MÓDULO>-NN`. Los módulos son AUT, CAL, DET, SOL, OFE, NOT, PAN, ASG, PER, JER, PUE, EST, BIT, AUD, REG, ADM, PRF, DSH y PEN (ver §3).
- **Rol** e **Historia** («Como … quiero … para …»).
- **Pantallas:** el valor de `currentView` en `Prop4.jsx` (la app no tiene rutas: navega con esa máquina de estados) y el ítem del menú lateral desktop de `navegacion.js`, con su etiqueta visible.
- **Endpoints** principales, relativos a `/api/v2`.
- **Criterios de aceptación** en forma Dado/Cuando/Entonces, observables en la interfaz. Incluyen los negativos de permiso y las reglas de negocio. Los textos entre «» son los que muestra hoy la aplicación, copiados del código; en §5 son citas de los documentos. En unos y otros se omiten los íconos y símbolos (por ejemplo, marcas de verificación) que acompañan a algunos textos.
- **Trazabilidad:** FUN-SGT (`Archivo de funcionalidades.md`, §20), MF (manuales), R (requerimientos), TC (casos de prueba), BUG (registro de defectos) y RN-SGT (reglas de negocio del Archivo) cuando aporta.
- **Estado** según lo que hace el código hoy, con la evidencia (archivo y función):
  - **Implementada:** el código cumple todos los criterios, en móvil y en desktop.
  - **Parcial:** funciona el camino principal, pero algún criterio falla o falta.
  - **No implementada:** no hay pantalla, o el backend no lo hace.
  - **Contradicción:** los documentos y el código dicen cosas distintas, y la HU no se puede dar por buena sin una decisión (ver §5).
  - **No disponible en la entrega:** la función se dejó apagada por una decisión; hoy son las tres de notificaciones (C-09). Se enciende con un interruptor, sin cambiar el código de las pantallas.
  - **Retirada:** la HU se retiró por una decisión y su código se quitó (hoy, HU-CAL-04, C-05).
- **Prueba E2E:** el usuario de prueba, los datos que necesita, si **muta** la base (crea, aprueba o borra; entonces hay que restaurarla antes de la corrida siguiente) y si aplica en móvil, en desktop o en ambos. También indica si ya hay una prueba en `sgt-huap_frontend/e2e/visual/`. Esas pruebas solo sacan fotos de estados que se abren y se cancelan: no escriben en la base ni comprueban resultados.

«No verificado» significa que leyendo el código no se pudo confirmar, y que hay que ejecutarlo.

### 1.3 Fuentes

| Fuente | Fecha | Qué aporta |
|---|---|---|
| `Archivo de funcionalidades.md` (raíz) | 3 ago 2026 | FUN-SGT-001 a 053, RN-SGT-001 a 041, flujos 19.x |
| `docs/qa/MANUAL_FUNCTIONAL_INVENTORY.md` | manuales PINGESO, 1.er semestre 2026 | MF-001 a MF-033 |
| `docs/qa/IMPLEMENTED_FUNCTIONAL_INVENTORY.md`, `FUNCTIONAL_TRACEABILITY_MATRIX.md`, `ROLE_PERMISSION_TEST_MATRIX.md`, `MANUAL_SYSTEM_GAP_ANALYSIS.md`, `QA_BASELINE.md` | 30 jul 2026 | IF, matriz de permisos, brechas |
| `docs/qa/FUNCTIONAL_TEST_CASES.md` | 30 jul 2026 | TC-001 a TC-045 |
| `docs/qa/DEFECT_REGISTER.md` | 30 jul 2026 | BUG-001 a BUG-008 |
| `requerimientos/` R1 a R18, `README.md`, `TRASPASO.md` | 23 ago a 16 oct 2026 | Mandan sobre el manual cuando lo contradicen. R18 trae «Hallazgos del lote» |
| Código del frontend | rama actual | `Prop4.jsx`, `navegacion.js`, `DesktopShell.jsx`, vistas de `Admin2`, `Jefatura`, `Subrogante`, `Comun`, `ComunAdministracion`, `Desktop`, `Login`, servicios de `src/services/`. No existe la carpeta `components/Admin`: el panel de administración vive en `Admin2` |
| Código del backend | rama actual | Controllers, services, `SecurityConfig.java`, `SeguridadServicio.java`, `GlobalExceptionHandler.java` |
| Datos | rama actual | `BaseDatosMySQL/desarrollo/` (seed ficticio, clave `huap2025`), `03_fechas_relativas.sql`, `scripts/generar_turnos_demo.sh` |
| Pruebas existentes | rama actual | `e2e/visual/pantallas.spec.js`, `interacciones-*.spec.js`, `e2e/helpers/sesion.js` |
| Pruebas integrales | 20 al 22 oct 2026 | 32 historias y 249 casos diseñados con las reglas, no con el sistema, y sus resultados en la VM de demostración: `docs/qa/pruebas-integrales/` |

### 1.4 Convenciones

- **Móvil** es una ventana de menos de 1200 px, con la barra inferior: bajo 600 px la app ocupa toda la pantalla y entre 600 y 1199 px se ve dentro de un marco de teléfono. **Desktop** es una ventana de 1200 px o más: menú lateral (`DesktopShell`). El umbral está en `src/layout/layout.js`. Los proyectos de `playwright.config.js` son `movil` (390 × 844), `desktop` (1366 × 768) y `desktop-fhd` (1920 × 1080).
- En desktop, todo panel `Sheet` se abre como panel lateral desde la derecha y se cierra con Escape.
- Permisos del backend: `SecurityConfig` niega por rol en el filtro de seguridad (rutas de administración global y de servicio, y `PUT /solicitudes/*/estado`). Desde el 17 oct (C-20) esas negaciones responden 403 con «No tienes permiso para realizar esta acción» (`JwtAccessDeniedHandler`) y no cierran la sesión; el 401 queda para la sesión inválida. Algunos controllers niegan además con `@PreAuthorize` o con `SeguridadServicio` (403). Las excepciones que responden 400 son la respuesta de alguien que no es el receptor de una solicitud (HU-SOL-08) y la cancelación de una solicitud propia ya resuelta (HU-SOL-11). `POST /turnos/alterar` responde 403 a la negación por servicio y 409 a los conflictos de asignación (HU-ASG-02, HU-SOL-14).

### 1.5 Funciones del backend que no tienen pantalla

| Función | Endpoint | HU |
|---|---|---|
| Cambiar el horario de un turno | `POST /turnos/alterar` (acción `CAMBIAR_HORAS`) | HU-ASG-04 |
| Duplicar una rotativa | `POST /rotativas/{id}/duplicar` | HU-ADM-08 |
| Extender una vigencia | `POST /planificaciones/{id}/extender` | HU-ADM-12 |
| Historial de una solicitud | `GET /bitacoras/solicitud/{id}` | sin HU |
| Validar una rotativa | `GET /rotativas/{id}/validar` | sin HU (FUN-SGT-016) |
| Disponibilidad del personal | `GET /funcionarios/disponibilidad/{id}` | sin HU (FUN-SGT-007) |
| Registrar a mano un evento de bitácora | `POST /bitacoras` (solo administrador) | sin HU (FUN-SGT-036) |
| Crear a mano una notificación | `POST /notificaciones` | sin HU |
| Consultar feriados | `GET /feriados` (solo lectura; la usa la vista previa de Generar) | sin HU (FUN-SGT-018) |

---

## 2. Roles y cómo se entra con cada uno

Todos los usuarios son ficticios del seed de desarrollo y tienen la clave `huap2025`. Estas pruebas nunca deben correr contra una base con datos reales.

### 2.1 Usuarios de prueba

| Rol | RUT | En el SGT (id) | Servicio y rol que obtiene | Cómo entra |
|---|---|---|---|---|
| Médico | 30000070-0 | 369 | Urgencias, MEDICO. Tiene turnos generados en la rotativa «Volante (T VOL)», puesto Médico General 7 | Directo al inicio (R8) |
| Jefatura | 30000006-6 | 305, rol de sistema USUARIO | Urgencias, JEFATURA | Directo al inicio |
| Subrogante | 12345678-9 | 101 | Enfermería, SUBROGANTE. Enfermería solo tiene los turnos del seed, sin turnos generados | Directo al inicio |
| Administrador | 11111111-1 | 1 («Admin Bootstrap»), rol de sistema ADMINISTRADOR | Elige Urgencias. Como no es miembro, entra con rol efectivo JEFATURA; en Medicina Interna es JEFATURA por asignación | Elección de servicio, con los 4 servicios |
| Multiservicio | 11111113-3 | 202 | Cirugía y Medicina Interna, MEDICO en ambos | Elección de servicio, con 2 servicios |
| No registrado | 12345687-2 | Está en el padrón `innhosp`, no en el SGT | — | Pantalla «Cuenta no registrada aún» |

Usuarios de apoyo sugeridos, también del seed:

- **30000069-9** (368): segundo médico de Urgencias, para recibir intercambios y para la segunda postulación.
- **30000042-2** (341): tercer médico de Urgencias. Es el ofertor de la oferta general 1 del seed.
- **30000013-3** (312): médica de Urgencias con una notificación sin leer en el seed (la 16), con el estado bien escrito. Sirve para HU-NOT.
- **30000072-2** (371): médico de Urgencias que ninguna otra prueba usa. Sirve para el bloqueo por intentos fallidos (HU-AUT-01).
- **12345677-0**: está en el padrón `innhosp` y no en el SGT. Sirve para probar el alta de un funcionario sin gastar al usuario «no registrado».

El catálogo nombra a las personas por su id del seed y no por su nombre: las pruebas no necesitan los nombres, y en el seed hay nombres que podrían ser de personas reales (ver §7).

### 2.2 Menús

**Móvil (todos los roles).** Barra inferior «Inicio», «Calendario», «Solicitudes» y «Perfil». Se ve en el inicio, en Mi Perfil, en Solicitudes y en el calendario abierto desde la barra. El encabezado del inicio tiene la flecha «Volver a selección de servicio» y «Salir»; la bandeja de notificaciones con contador solo aparece con el interruptor `NOTIFICACIONES_HABILITADAS` encendido (C-09; en la entrega está apagado). Mi Perfil muestra «Mi Dashboard» y los paneles que correspondan:

| Rol | Paneles en Mi Perfil | Módulos del panel |
|---|---|---|
| Médico y multiservicio | ninguno | — |
| Jefatura | «Panel de Jefatura» (título «Centro de Gestión del Servicio») | 9: Asignación de turnos, Asignación de Funcionarios, Personal del Servicio, Jerarquía de Funcionarios, Evaluar Solicitudes, Gestionar Puestos, Estadísticas del Servicio, Bitácora de Cambios, Auditoría de Asistencia |
| Subrogante | «Panel de Subrogante» (título «Administración») | 6: Asignación de turnos, Evaluar Solicitudes, Gestionar Puestos, Estadísticas del Servicio, Bitácora de Cambios, Auditoría de Asistencia |
| Administrador | «Panel de Administración» y, con rol JEFATURA en el servicio, también «Panel de Jefatura» | 14 (ver HU-ADM-01) |

**Desktop.** Menú lateral con grupos según el rol. Abajo, la tarjeta de usuario con nombre, RUT, rol, «Cambiar servicio» y «Cerrar sesión».

| Grupo | Ítems | Quién los ve |
|---|---|---|
| Turnos | «Centro de turnos», «Calendario», «Solicitudes» (contador), «Notificaciones» (contador; solo con el interruptor de C-09 encendido) | todos |
| Gestión del servicio | «Asignación de turnos», «Puestos», «Estadísticas», «Bitácora», «Auditoría de asistencia» | jefatura, subrogante y administrador |
| Gestión del servicio | «Personal del servicio», «Asignación de funcionarios», «Jerarquía del servicio» | solo rol JEFATURA (incluye al administrador en Urgencias, por su rol efectivo) |
| Administración | «Servicios», «Personal del sistema», «Asignación a servicios», «Jerarquía de funcionarios», «Tipos de turno», «Rotativas», «Planificación», «Reglas de horario» | solo administrador |
| Mi cuenta | «Mi dashboard», «Perfil» | todos |

Total de ítems con la bandeja oculta (la entrega): médico 5, subrogante 10, jefatura 13, administrador 21. Con el interruptor de C-09 encendido, uno más cada uno. Los paneles de jefatura, subrogante y administración no están en el menú: se abren desde Mi Perfil.

### 2.3 Datos del ambiente de pruebas que hay que tener presentes

- `03_fechas_relativas.sql` mueve el seed en semanas completas: la primera semana del seed pasa a ser la semana pasada. Las solicitudes, la oferta y los cupos de Urgencias del seed (turnos 70 a 111) quedan sobre turnos de la semana pasada.
- `generar_turnos_demo.sh` crea una vigencia **activa** del molde «Rotativa 2026» de Urgencias desde el lunes actual por 7 semanas (1.470 turnos el 16 de octubre). Generar otra vigencia que se cruce con esa es rechazado (RN-SGT-032). La generación deja cupos libres: el molde tiene huecos y personas repetidas.
- Urgencias tiene seis jefaturas en el seed (ids 300 a 305). Cinco de ellas (300 a 304) son además administradores del sistema.
- Las notificaciones 5 a 12 del seed (Medicina Interna; el administrador ve tres) usan los estados `NO_LEIDA` y `LEIDA`, que el código no reconoce (ver HU-NOT-01). La bandeja está oculta en la entrega (C-09).
- El backend corre con la hora de Chile desde el 17 oct (P-01): la imagen de Docker fija `TZ=America/Santiago`. Fuera de Docker, la JVM usa la zona del equipo, que debe ser la de Chile.
- No usar al funcionario 4 ni los datos ligados a él (ver §7).

---

## 3. Historias de usuario por módulo

### 3.1 Autenticación y servicio (HU-AUT)

#### HU-AUT-01 · Iniciar sesión con RUT y clave

- **Rol:** todos.
- **Historia:** Como funcionario del HUAP quiero entrar con mi RUT y mi clave del hospital para usar el SGT sin una cuenta aparte.
- **Pantallas:** `login` (`LoginView`). En desktop, pantalla completa con panel de marca (`MarcoEntradaDesktop`), sin menú.
- **Endpoints:** `POST /funcionarios/login`.
- **Criterios de aceptación:**
  1. Dado el login vacío, cuando escribo un RUT, entonces se formatea como «12.345.678-9».
  2. Dado un RUT de menos de 2 caracteres, cuando presiono «Iniciar Sesión», entonces veo «Ingresa un RUT válido» y no se llama al backend. Con menos de 7 dígitos veo «RUT incompleto»; sin clave, «Ingresa tu contraseña».
  3. Dado un RUT registrado y la clave correcta, cuando envío, entonces veo «¡Bienvenido!» y paso a la elección de servicio (HU-AUT-02) o directo al inicio (HU-AUT-03).
  4. Dada una clave incorrecta, o un RUT que no existe, entonces veo el mismo mensaje, «Credenciales inválidas.», y sigo en el login.
  5. Dados 5 intentos fallidos seguidos con el mismo RUT, entonces el quinto responde «Has superado el número de intentos permitidos. Acceso bloqueado por N segundos.» y los siguientes, «Cuenta bloqueada por demasiados intentos fallidos. Intenta nuevamente en N segundos.», durante 15 minutos.
  6. Dado un funcionario registrado sin servicios asignados, entonces veo «El usuario no tiene servicios asignados».
- **Trazabilidad:** FUN-SGT-001, FUN-SGT-004; MF-001; TC-001 a TC-005; RN-SGT-001 a 004.
- **Estado:** **Implementada.** Evidencia: `LoginView.jsx` (`handleSubmit`, `formatRutDisplay`); `FuncionarioController.login`; `LoginAttemptService`.
- **Prueba E2E:** usuario `medico`. El criterio 5 conviene correrlo con un RUT dedicado (30000072-2, ver §2.1): no muta la base, pero deja ese RUT bloqueado 15 minutos en la memoria del backend. El criterio 6 necesita un funcionario sin filas en `Servicios_Funcionario`, que el seed no tiene: hay que crearlo (muta). Hoy queda uno así como efecto lateral de HU-PER-02 (la jefatura registra a 12345677-0 y la asignación falla; ver C-23). Ambos. Ya existe: `interacciones-gestion.spec.js` («login: errores de validación», solo foto).

#### HU-AUT-02 · Elegir el servicio cuando tengo varios

- **Rol:** multiservicio, administrador.
- **Historia:** Como funcionario de varios servicios quiero elegir con cuál trabajo para ver los turnos y permisos de ese servicio.
- **Pantallas:** `select_service` (`SelectServiceView`); en desktop, tarjetas en grilla.
- **Endpoints:** `POST /funcionarios/login/select-service`.
- **Criterios de aceptación:**
  1. Dado un usuario con dos o más servicios, después del login veo «Selecciona un servicio», con cada servicio y mi rol en él.
  2. Cuando elijo uno, entonces veo «¡Listo!», entro al inicio y el nombre del servicio queda en Mi Perfil (móvil; el encabezado del inicio móvil no lo muestra, `AgendaView.jsx:348-349`) o en el menú lateral (desktop).
  3. Cuando presiono «Salir», vuelvo al login.
  4. Dado el administrador, veo todos los servicios vigentes; en los que no es miembro, su rol es JEFATURA.
  5. Dado que pasaron más de 5 minutos desde el login, cuando elijo un servicio, entonces veo «Token de pre-autorización inválido o expirado» en la misma pantalla.
  6. Negativo (API): `select-service` con un servicio que no es del usuario responde 403 «Acceso denegado al servicio indicado».
- **Trazabilidad:** FUN-SGT-002; MF-002; TC-007, TC-008; RN-SGT-002, RN-SGT-005.
- **Estado:** **Implementada.** Evidencia: `SelectServiceView.handleSelect`; `FuncionarioController.selectService`; `FuncionarioService.getServiciosDisponibles` y `resolverAccesoServicio`.
- **Prueba E2E:** `multiservicio` y `admin`; no muta; ambos. El criterio 5 exige esperar más de 5 minutos reales (el vencimiento lo controla el backend, no el reloj del navegador). Ya existe: `pantallas.spec.js` («entrada-elegir-servicio») e `interacciones-gestion.spec.js` («elegir servicio: volver al login con Salir»).

#### HU-AUT-03 · Entrar directo cuando tengo un solo servicio (R8)

- **Rol:** médico, jefatura y subrogante con un solo servicio.
- **Historia:** Como funcionario de un solo servicio quiero llegar directo al inicio para no elegir algo que no tiene alternativa.
- **Pantallas:** `login` → «Entrando…» → `agenda`.
- **Endpoints:** `POST /funcionarios/login` y, automático, `POST /funcionarios/login/select-service`.
- **Criterios de aceptación:**
  1. Dado 30000070-0, cuando inicio sesión, entonces no veo la elección de servicio: veo «Entrando…» y llego al inicio de Urgencias.
  2. Dado que el canje automático falla (por ejemplo, la red se corta), entonces caigo en «Selecciona un servicio» con mi único servicio, sin mensaje, y puedo reintentar eligiéndolo; si vuelve a fallar, veo el error en esa pantalla.
- **Trazabilidad:** R8; FUN-SGT-002; MF-002.
- **Estado:** **Implementada.** Evidencia: `Prop4.handleLoginSuccess` (rama `servicios.length === 1`).
- **Prueba E2E:** `medico`, `jefatura` y `subrogante`; no muta; ambos. Criterio 2 con `page.route` que aborta `select-service`.

#### HU-AUT-04 · Refrescar la página sin perder la pantalla (R5)

- **Rol:** todos.
- **Historia:** Como usuario quiero que al refrescar (F5) quede en la misma pantalla para no volver a navegar.
- **Pantallas:** todas (el estado se guarda en `sessionStorage`, clave `sgt_nav_state`).
- **Endpoints:** ninguno.
- **Criterios de aceptación:**
  1. Dado que estoy en el calendario, cuando refresco, entonces sigo en el calendario. Lo mismo en Mi Perfil.
  2. Dado que cerré sesión, cuando refresco, entonces veo el login. En una pestaña nueva con la sesión abierta, veo el inicio.
  3. Dado un médico, cuando fuerzo `sessionStorage.setItem('sgt_nav_state','{"view":"admin"}')` y refresco, entonces caigo en el inicio y no en Administración.
  4. Las pantallas de login, elección de servicio y registro pendiente nunca se restauran.
- **Trazabilidad:** R5.
- **Estado:** **Implementada.** Evidencia: `Prop4.leerNavGuardada` y `vistaPermitida`; `AuthContext`. La lista blanca solo protege la restauración, no la navegación. Desde el 17 oct, `reglas` solo se restaura para el administrador (C-10) y la bitácora general solo para la gestión (C-06); con la bandeja oculta (C-09), restaurar `notifications` lleva al inicio.
- **Prueba E2E:** `medico` (y `jefatura` para C-10); no muta; ambos. El helper `irAVista` de `e2e/helpers/sesion.js` ya usa este mecanismo.

#### HU-AUT-05 · Cambiar de servicio sin volver a escribir la clave

- **Rol:** todos; tiene sentido con multiservicio y administrador.
- **Historia:** Como funcionario de varios servicios quiero cambiar de servicio desde dentro para trabajar en otro sin cerrar sesión.
- **Pantallas:** en móvil, la flecha «Volver a selección de servicio» del encabezado del inicio lleva a `select_service`; en desktop, «Cambiar servicio» en la tarjeta de usuario del menú y en Mi Perfil.
- **Endpoints:** `POST /funcionarios/switch-service`.
- **Criterios de aceptación:**
  1. Dado multiservicio en Cirugía, cuando cambio a Medicina Interna, entonces el inicio muestra los turnos de Medicina Interna y cambia el nombre del servicio (en móvil se ve en Mi Perfil; en desktop, en el menú lateral).
  2. Dado el administrador en Urgencias, cuando cambio a Medicina Interna, entonces su rol sigue siendo JEFATURA y conserva el Panel de Administración.
  3. Dado que refresqué la página, el botón sigue funcionando (la lista de servicios sale de `user_data`).
  4. Dado un usuario con un solo servicio, el botón se ve y muestra solo ese servicio.
- **Trazabilidad:** FUN-SGT-003; R5, R8.
- **Estado:** **Implementada.** Evidencia: `Prop4.handleBackToServiceSelection`; `SelectServiceView` (`switchService`); `FuncionarioController.switchService`. Desde el 17 oct, después de refrescar, la lista de servicios sale con el rol: `Prop4` lee `rol` o `rolServicioNombre` (P-01, §5.1).
- **Prueba E2E:** `multiservicio` y `admin`; no muta; ambos.

#### HU-AUT-06 · Cerrar sesión

- **Rol:** todos.
- **Historia:** Como usuario quiero cerrar sesión para que otra persona no use mi cuenta en un equipo compartido.
- **Pantallas:** en móvil, «Salir» en el encabezado del inicio (Mi Perfil no tiene botón para salir); en desktop, «Cerrar sesión» en el menú lateral.
- **Endpoints:** ninguno. El JWT se borra en el navegador; el backend no tiene logout.
- **Criterios de aceptación:**
  1. Cuando cierro sesión, vuelvo al login y se borran `jwt_token`, `user_data` y el nombre del servicio activo; `sgt_nav_state` se borra y el login lo vuelve a escribir enseguida con la vista «login», así que la pantalla anterior no se restaura.
  2. Cuando refresco después, sigo en el login.
- **Trazabilidad:** Archivo §6.1 («Cierre de sesión»).
- **Estado:** **Implementada.** Evidencia: `Prop4.handleLogout`; `authService.logout`.
- **Prueba E2E:** cualquier rol; no muta; ambos.

#### HU-AUT-07 · Sesión vencida y acciones sin permiso

- **Rol:** todos.
- **Historia:** Como usuario quiero que al vencer mi sesión el sistema me pida entrar de nuevo, y que una acción sin permiso me avise sin echarme, para entender qué pasó.
- **Pantallas:** todas.
- **Endpoints:** cualquiera protegido.
- **Criterios de aceptación:**
  1. Dado un JWT vencido (dura 24 horas), cuando la app hace la petición siguiente, entonces se borra la sesión y vuelvo al login.
  2. Dada una respuesta 401 fuera del login, entonces se cierra la sesión.
  3. Dada una respuesta 403 (por ejemplo, una lectura que el backend niega al médico), entonces sigo dentro, veo unos segundos el aviso «No tienes permiso para realizar esta acción.» y la vista muestra su propio error.
  4. Dada una acción que el filtro de seguridad niega por rol (por ejemplo, el médico que llama a `POST /servicios`), entonces responde 403 con «No tienes permiso para realizar esta acción» y no cierra la sesión.
  5. Dado el backend caído, las vistas muestran mensajes como «No se pudieron cargar los turnos del servicio. Intenta de nuevo.», sin pantalla en blanco.
- **Trazabilidad:** TC-006, TC-011, TC-044; BUG-001.
- **Estado:** **Implementada.** El criterio 4 fallaba en el QA del 30 de julio (respondía 401 y el frontend cerraba la sesión) y se corrigió el 17 oct (C-20): `SecurityConfig` registra `JwtAccessDeniedHandler`, que responde 403, y `/error` es público; el 401 queda para la sesión inválida. Los errores internos de `login`, de `status/{rut}` y de `select-service` y `switch-service` ya no salen como 401 ni 403. En la interfaz, `axiosConfig` emite un evento con el 403 y `AvisoSinPermiso` muestra el aviso unos segundos sin sacar al usuario de la vista. Evidencia: `axiosConfig.js` (interceptores, `EVENTO_SIN_PERMISO`), `AvisoSinPermiso.jsx`, `SecurityConfig.filterChain`, `JwtAccessDeniedHandler`, `GlobalExceptionHandler.handleAccessDenied`.
- **Prueba E2E:** `medico`; no muta; ambos. Criterio 1: escribir en `localStorage` un JWT con `exp` vencido. Criterio 4: por API, con el token del médico.

### 3.2 Calendario y turnos propios (HU-CAL)

#### HU-CAL-01 · Ver mi agenda en el inicio (móvil)

- **Rol:** todos.
- **Historia:** Como funcionario quiero ver mis próximos turnos día a día para saber cuándo y con quién trabajo.
- **Pantallas:** `agenda` (`AgendaView`), barra «Inicio». Solo móvil: en desktop, el inicio es el Centro de operaciones (HU-CAL-05).
- **Endpoints:** `GET /turnos/servicio/{servicioId}`; `GET /notificaciones/sin-leer/{id}` (contador).
- **Criterios de aceptación:**
  1. Dado que entro, el filtro activo es «Mis turnos» y veo los chips «Todos», «Mis turnos», «Solicitudes» y «Disponibles», con contador cuando es mayor que cero (R1, R9).
  2. Solo aparecen días de hoy en adelante, salvo un turno de noche de ayer que termina hoy (FUN-SGT-053). Un separador («Octubre 2026») marca cada cambio de mes y hoy lleva la marca «HOY».
  3. Dado un día con turno propio, la tarjeta muestra el horario, las horas y «Tienes turno {tipo}: {rotativa}», o solo «Tienes turno {tipo}» si el turno no tiene rotativa (R2).
  4. Dado un día sin turno propio, veo «Sin turno asignado» y, si hay, «N cupos libres».
  5. Cuando expando un día, veo una tarjeta por bloque con el título «{tipo}: {rotativa}», tenga o no turno ese día (R7), la marca «Tu turno» si es mío y la cobertura «a/t · n libre» o «Completo a/t». Con el filtro «Todos», hoy aparece expandido.
  6. El aviso superior muestra las novedades: «Cambio de turno pendiente» por cada turno propio comprometido y «N turnos libres en agenda» (solo con rol JEFATURA o SUBROGANTE), que cuenta solo los cupos de los días que muestra la agenda (de hoy en adelante, más la noche de ayer que termina hoy). No muestra «N notificaciones sin leer»: la bandeja no se ofrece en la entrega (C-09).
  7. Dado un filtro sin resultados, veo «Sin turnos en esta categoría.»; si la carga falla, un mensaje sin detalles técnicos.
- **Trazabilidad:** FUN-SGT-025, FUN-SGT-053; MF-005, MF-006; R1, R2, R7, R9; TC-021.
- **Estado:** **Implementada.** Evidencia: `AgendaView.jsx` (`FILTERS`, `visibleDays`, `DayRow`, `pendientes`); `funcionarioService.buildAgendaData`. El 17 oct «N turnos libres en agenda» dejó de contar los cupos que ya pasaron (P-01), y el 19 oct la fila de hoy se vuelve a montar al cambiar de filtro, así que con «Todos» aparece expandida (criterio 5).
- **Prueba E2E:** `medico` y `jefatura` (aviso de turnos libres); no muta; móvil. Ya existe: foto de `agenda` en `pantallas.spec.js`.

#### HU-CAL-02 · Ver solo los cupos que puedo tomar («Disponibles», R9)

- **Rol:** todos; también aplica a la jefatura.
- **Historia:** Como médico quiero que «Disponibles» liste solo los cupos que realmente puedo tomar para no pedir turnos imposibles.
- **Pantallas:** `agenda`, chip «Disponibles» (solo móvil).
- **Endpoints:** los de HU-CAL-01.
- **Criterios de aceptación:**
  1. Dado un día en que ya tengo turno en un bloque (misma fecha y mismo tipo), los cupos libres de ese bloque no cuentan ni aparecen en «Disponibles».
  2. Dado que hago la noche del día X, el cupo de día del X+1 no aparece; el de noche del X+1, sí. Tampoco aparece la noche que termina la mañana de un turno de día propio (R13 en los dos sentidos), ni los cupos que se solapan con mis turnos ni los que ya empezaron.
  3. El contador del chip coincide con lo listado.
  4. El aviso de la jefatura cuenta todos los cupos, así que puede mostrar más que el chip (diferencia intencional).
- **Trazabilidad:** R9; MF-005; R13 (coherencia con el backend).
- **Estado:** **Implementada.** Evidencia: `AgendaView.jsx` (`esDisponibleParaMi`); la regla es `puedeTomarCupo` (`utils/reglasTurno.js`), escrita como `ValidadorAsignacionTurnoService.esDescansoPostNocturnoViolado` y compartida con el selector de Cobertura (HU-SOL-05). Desde el 17 oct «Disponibles» ya no ofrece la noche que termina la mañana de un turno de día propio, que el backend rechaza por R13 (P-01, §5.1).
- **Prueba E2E:** `medico`. El criterio 1 sale con los datos generados: los huecos del molde en «Volante (T VOL)», Médico General 8 y Médico General 10, caen en los mismos bloques que los turnos del médico 369. Para el criterio 2 hay que buscar en la corrida una noche del médico seguida de un cupo de día, o crearlo con la jefatura liberando un turno de día del día siguiente (muta). Móvil.

#### HU-CAL-03 · Ver en el inicio los turnos que ya pedí («Solicitudes», R11)

- **Rol:** todos.
- **Historia:** Como médico quiero ver en el inicio los turnos sobre los que tengo una solicitud pendiente para no pedir dos veces lo mismo.
- **Pantallas:** `agenda` (chip «Solicitudes», marca «Pendiente» y aviso «Cambio de turno pendiente»).
- **Endpoints:** `GET /turnos/servicio/{id}`, que marca `solicitudPendiente` para el usuario autenticado.
- **Criterios de aceptación:**
  1. Dado que pedí cubrir un cupo, cuando vuelvo al inicio, el chip «Solicitudes» cuenta al menos 1 y, al elegirlo, lista ese día.
  2. Dado que ofrecí entregar mi turno en un intercambio, ese turno también cuenta como comprometido (R15) y mi tarjeta muestra «Pendiente».
  3. El aviso superior muestra «Cambio de turno pendiente» con la fecha y «Esperando respuesta».
- **Trazabilidad:** R9, R11, R15; MF-005.
- **Estado:** **Implementada.** Evidencia: `TurnoService.marcarSolicitudesPendientesDelUsuario`; `AgendaView.jsx` (`countSolicitudes`, `misCambiosPendientes`). El aviso siempre dice «Cambio de turno pendiente» y nunca «Cambio pendiente con {nombre}», porque el backend no envía `solicitudCon`.
- **Prueba E2E:** `medico`; datos: crear una cobertura y un intercambio (muta); móvil.

#### HU-CAL-04 · Ver el aviso de un cambio aprobado (retirada)

- **Rol:** todos.
- **Historia:** Como médico quiero ver en el inicio que aprobaron mi cambio para saber que el turno ya cambió.
- **Pantallas:** ninguna: el aviso y la marca «Aprobado» se retiraron (C-05).
- **Endpoints:** `GET /turnos/servicio/{id}`, campo `cambioAprobado`.
- **Criterios de aceptación:**
  1. Retirado el 17 oct (C-05): el aviso «Cambio aprobado» y la marca «Aprobado» ya no existen. Antes: dado que la jefatura aprobó mi solicitud, el turno mostraba la marca «Aprobado» y el aviso «Cambio aprobado».
- **Trazabilidad:** R1 (se conservó la marca), R11 («`cambioAprobado` sigue sin emitirse»).
- **Estado:** **Retirada** (C-05, 17 oct). El backend nunca envió `cambioAprobado` (`TurnoService.convertirTurnoAMap`), así que el aviso no aparecía. Se quitó el código: el ítem «Cambio aprobado» del aviso superior, la marca «Aprobado» del día, el estado «Cambio aprobado» del detalle y los campos `cambioAprobado`, `cambioAprobadoCon` y `hayCambioAprobado` del mapeo de la agenda. No cambia nada en pantalla.
- **Prueba E2E:** no aplica: la HU se retiró.

#### HU-CAL-05 · Centro de operaciones (inicio en desktop)

- **Rol:** todos; las acciones dependen del rol.
- **Historia:** Como jefatura quiero ver la semana del servicio con la cobertura de cada día, las solicitudes y las ofertas en una sola pantalla para gestionar sin cambiar de vista.
- **Pantallas:** `agenda` en desktop (`CentroOperacionesDesktop`); menú «Centro de turnos» (`inicio`).
- **Endpoints:** `GET /turnos/servicio/{id}`; `GET /ofertas-generales/servicio/{id}`; para gestión `GET /solicitudes`, para el resto `GET /solicitudes/funcionario/{id}` y `GET /solicitudes/receptor/{id}`. Acciones: `PUT /solicitudes/{id}/estado`, `/intercambio` y `/oferta-particular`; `PUT /ofertas-generales/{id}/aprobar`, `/rechazar` y `/seleccionar/{idPostulacion}`; `POST /turnos/alterar`.
- **Criterios de aceptación:**
  1. El encabezado dice «Centro de turnos · Semana d–d mes», con «{asignados}/{total} asignados» y «{n} cupos libres», y navegación ← · Hoy · →.
  2. La tarjeta de hoy se resalta según la fecha de Chile. Al cambiar de semana se expande hoy si está en esa semana; si no, el lunes.
  3. El día expandido muestra los paneles DÍA y NOCHE con la rotativa, la barra de cobertura (verde si está completa, coral si faltan personas), las personas y los cupos libres.
  4. Médico: en un cupo libre veo «Solicitar», que abre la nueva solicitud de Cobertura precargada; si ya lo pedí, veo «Solicitado», deshabilitado. En el panel de solicitudes puedo aceptar o rechazar las propuestas que recibí.
  5. Jefatura, subrogante o administrador: un clic en una persona abre «Editar asignación de turno» y uno en un cupo, «Asignar turno libre», en panel lateral (HU-ASG-02 y HU-ASG-03).
  6. Panel de solicitudes: agrupa las coberturas que compiten por el mismo turno (R10) con «Elegir»; una cobertura sobre un turno que ya tiene dueño aparece como «Turno ya cubierto», sin acciones; si participo en una solicitud, no puedo decidirla.
  7. Panel de ofertas: oculta las de turnos ya pasados (R17) y las rechazadas. La jefatura puede «Aprobar apertura» y seleccionar postulante con confirmación. El médico no postula desde aquí (lo hace en Solicitudes).
  8. No hay scroll horizontal entre 1200 y 1920 px.
- **Trazabilidad:** R16, R17, R18; MF-022, MF-027.
- **Estado:** **Implementada.** Evidencia: `CentroOperacionesDesktop.jsx` (`ofertaVigente`, `turnosOcupados`, `solsVM`, `ofertasVM`, `mutar`).
- **Prueba E2E:** `medico` y `jefatura`. Navegar no muta; las acciones sí, y se prueban en la HU de cada acción. Desktop. Ya existe: foto de `agenda` en desktop en `pantallas.spec.js`.

#### HU-CAL-06 · Ver el calendario mensual del servicio

- **Rol:** todos.
- **Historia:** Como funcionario quiero ver el mes del servicio con mis turnos y los cupos libres para planificar.
- **Pantallas:** `calendar_view` con retorno `agenda`; barra «Calendario»; menú «Calendario» (`calendario`).
- **Endpoints:** `GET /turnos/servicio/{id}/calendario/{año}/{mes}`.
- **Criterios de aceptación:**
  1. Cuando navego con ← y →, cambia el mes del título («Octubre 2026»).
  2. Móvil: cada día muestra a lo más dos puntos, «Mi turno» y «Cupo libre» (R6), y la leyenda tiene solo esas dos entradas. Tocar un día con turnos, aunque no tenga punto, abre el resumen «Cobertura del día» (Asignados, Total, Vacantes) con grupos «{tipo}: {rotativa}» (R7). Los días sin turnos no responden.
  3. Desktop: cada día muestra la cobertura Día/Noche (verde si está completa, coral si faltan) y «TÚ» en mis turnos. El panel del día elegido está siempre visible, las flechas del teclado mueven el día y «Hoy» vuelve al día actual.
  4. Dentro del día, cada persona y cada cupo abren el detalle del turno (HU-DET-01).
- **Trazabilidad:** FUN-SGT-025; MF-016; R6, R7, R18.
- **Estado:** **Implementada.** Evidencia: `calendarView.jsx` (`buildDayGroups`, `getCoverageStats`, rama `esDesktop`); `CalendarioDesktop.jsx`.
- **Prueba E2E:** `medico`; no muta; ambos. Ya existe: `interacciones-turnos.spec.js` («calendario · médico…», fotos).

#### HU-CAL-07 · Exportar mis turnos del mes (CSV)

- **Rol:** médico (alcance «solo mis turnos»).
- **Historia:** Como médico quiero descargar mis turnos del mes en CSV para llevarlos a mi planilla.
- **Pantallas:** `calendar_view` → «Exportar turnos CSV» (móvil, botón bajo la leyenda) o «Exportar CSV» (desktop, encabezado) → panel «Exportar turnos CSV».
- **Endpoints:** `GET /exportaciones/turnos/csv?anio&mes&idServicio&idFuncionario`.
- **Criterios de aceptación:**
  1. Dado el médico, veo «Se exportarán solo tus turnos del servicio actual.» y puedo cambiar el mes.
  2. Cuando presiono «Descargar CSV», se descarga `turnos_{año}_{mes}_servicio_{id}_funcionario_{id}.csv` (UTF-8 con BOM, separador «;») con mis turnos del mes y veo «¡Descargado!».
- **Trazabilidad:** FUN-SGT-038; MF-013; TC-042, TC-043.
- **Estado:** **Implementada** (C-08, 17 oct). `GET /exportaciones/turnos/csv` acepta también al médico: para quien no es gestión ni administrador, el backend ignora el `idFuncionario` pedido y exporta solo los turnos de la sesión, en el servicio de la sesión (403 si pide otro). El nombre del archivo usa ese alcance. La gestión sigue exportando el servicio completo o los turnos de una persona. Evidencia: `ExportacionController.exportarTurnosCsv`; `ExportacionControllerTest`.
- **Prueba E2E:** `medico`; no muta; ambos (esperar el evento `download`). Ya existe: foto del panel en `interacciones-turnos.spec.js`, sin descargar.

#### HU-CAL-08 · Exportar los turnos de todo el servicio (CSV)

- **Rol:** jefatura, subrogante, administrador.
- **Historia:** Como jefatura quiero exportar los turnos del mes de todo el servicio para reportar y auditar.
- **Pantallas:** las de HU-CAL-07, con la elección «Solo mis turnos» o «Todo el servicio».
- **Endpoints:** `GET /exportaciones/turnos/csv?anio&mes&idServicio`.
- **Criterios de aceptación:**
  1. Con «Todo el servicio», el archivo trae todos los turnos del servicio en el mes, con las columnas «Origen Turno» y «Detalle Origen» («Rotativa habitual», «Asignación manual», «Solicitud», «Cambio / intercambio», «Oferta particular», «Oferta general» o «Sin información»).
  2. Con «Solo mis turnos», trae solo los míos.
  3. Un mes sin turnos genera un archivo con solo los encabezados, sin error.
  4. Negativo (API): con un `idServicio` distinto al de la sesión responde 403, salvo al administrador.
- **Trazabilidad:** FUN-SGT-038; MF-033; TC-042, TC-043.
- **Estado:** **Implementada.** Evidencia: `calendarView.handleExportCsv`; `exportacionService.exportarTurnosCsv`; `ExportacionController.exportarTurnosCsv` (`exigirMismoServicio`); `ExportacionService`.
- **Prueba E2E:** `jefatura`; no muta; ambos.

#### HU-CAL-09 · Exportar la nómina del servicio (CSV)

- **Rol:** jefatura, subrogante, administrador.
- **Historia:** Como jefatura quiero descargar la nómina vigente de mi servicio para tener la lista del personal.
- **Pantallas:** «Personal del servicio» → «Exportar nómina CSV» (móvil: botón bajo el servicio, como «Exportar turnos CSV» del calendario; desktop: en el encabezado).
- **Endpoints:** `GET /exportaciones/servicios/{id}/funcionarios/csv`.
- **Criterios de aceptación:**
  1. Desde «Personal del servicio» puedo descargar la nómina en CSV: mientras exporta veo «Exportando…» y, si falla, «No se pudo exportar la nómina. Intenta de nuevo.».
- **Trazabilidad:** FUN-SGT-037; MF-033; §5, C-21.
- **Estado:** **Implementada** (C-21, 17 oct). Evidencia: `FuncionariosServicioJetaturaView.jsx` y `PersonalServicioDesktop.jsx`; `exportacionService.descargarCsv`. El backend exige rol de gestión y el mismo servicio de la sesión.
- **Prueba E2E:** `jefatura`; no muta (esperar el evento `download`); móvil y desktop. Sin automatizar.

### 3.3 Detalle de turno (HU-DET)

#### HU-DET-01 · Ver el detalle de un turno

- **Rol:** todos.
- **Historia:** Como funcionario quiero abrir un turno y ver su horario, su estado y su equipo por puesto para saber quién está y qué falta.
- **Pantallas:** «Detalle del turno» (sheet en móvil, panel lateral en desktop), dentro de `agenda` (tarjeta de bloque del día) o de `calendar_view` (persona o cupo del día).
- **Endpoints:** ninguno nuevo; usa los datos ya cargados.
- **Criterios de aceptación:**
  1. El encabezado dice «{TIPO}: {ROTATIVA}» (en desktop, «{tipo} · {rotativa}»), con el horario, la fecha y la cobertura «Equipo completo · a/t» o «a/t asignados · faltan n» (en desktop, «a/t · faltan n», `DetalleTurnoDesktop.jsx:96`) (R7).
  2. «Información del turno» muestra el Estado («Tu turno», «Asignado», «Cupo libre» o «Solicitud pendiente»), el Funcionario, el Puesto y la Duración.
  3. «Integrantes del equipo por puesto» lista a cada persona, con «(tú)» si soy yo, y las vacantes con «Falta cubrir» (y «×n» cuando faltan varias en el mismo puesto).
  4. «Ver historial» (HU-DET-04) aparece en el turno propio del médico y, para la gestión, en todos los turnos de su servicio, también en los cupos; el médico no lo ve en turnos ajenos ni en cupos.
- **Trazabilidad:** MF-006, MF-015; R3 (reemplazado por R7), R7, R18.
- **Estado:** **Implementada.** Evidencia: `ShiftDetail.jsx` (`estadoDelTurno`, `equipoPorPuesto`, `accionesDelTurno`); `DetalleTurnoDesktop.jsx`. Desde el 17 oct (P-01), abierto desde el calendario también muestra la Duración y «Solicitud pendiente»: `mapTurnoCalendario` copia `horas` y `solicitudPendiente` como el mapeo de la agenda, y la duración la calcula una sola función (`horasDeTurno`, `utils/reglasTurno.js`). Un detalle sin acciones (por ejemplo, el cupo que el médico ya pidió) no muestra la sección «Acciones» vacía.
- **Prueba E2E:** `medico`; no muta; ambos. Ya existe: fotos en `interacciones-turnos.spec.js`. Automatizada: `e2e/hu/calendario-detalle.spec.js`.

#### HU-DET-02 · Pedir un cupo libre tocándolo (R4)

- **Rol:** médico. La jefatura también ve «Solicitar turno», como acción secundaria.
- **Historia:** Como médico quiero tocar un cupo libre y pedirlo de inmediato para no repetir los datos en otra pantalla.
- **Pantallas:** «Detalle del turno» → tarjeta «Cupo libre — tocar para solicitar» o botón «Solicitar turno» → `solicitudes`, con la nueva solicitud abierta.
- **Endpoints:** `POST /solicitudes` (tipo 3).
- **Criterios de aceptación:**
  1. Dado un cupo libre con turno real, cuando lo toco, se abre «Nueva solicitud» en el paso 2, tipo Cobertura, con el turno precargado. Al enviar, queda PENDIENTE.
  2. Dado que ya pedí ese cupo, su tarjeta en el equipo (agenda o calendario) dice «Ya solicitaste este turno» y no se puede tocar. Si abro el detalle del propio cupo, desaparece «Solicitar turno» y no queda ninguna acción, tampoco «Ver historial» (R11, R12). Eso se hace desde el calendario: la agenda abre el turno que representa al bloque (`AgendaView.jsx:562-565` y `:709`), que con los datos de hoy es un turno asignado.
  3. Retirado el 17 oct (P-01): el estado «Cupo libre — falta cubrir» (un cupo del que solo se conoce el conteo) nunca se producía, porque la agenda y el calendario cuentan las vacantes con los mismos turnos que listan; se quitó la rama del detalle móvil y desktop.
  4. Dada la jefatura, la misma tarjeta dice «Asignar funcionario a este cupo» y abre la asignación directa (HU-ASG-02).
- **Trazabilidad:** R4, R11, R12; MF-009, MF-015.
- **Estado:** **Implementada.** Evidencia: `ShiftDetail.jsx` (`alTocarVacante`, `handleRequestVacancy`); acción `solicitar-turno` en `AgendaView` y `calendarView`. Desde el 17 oct (P-01), desde el calendario el cupo ya pedido dice «Ya solicitaste este turno» y no ofrece acciones, y el calendario desktop marca «Solicitado»: `mapTurnoCalendario` copia `solicitudPendiente` (HU-DET-01). Automatizada: `e2e/hu-muta/cupos-inicio.spec.js`.
- **Prueba E2E:** `medico` (y `jefatura` para el criterio 4); muta: crea la solicitud, y cancelarla al final no borra la fila; ambos.

#### HU-DET-03 · Elegir receptor y su turno para pedir un intercambio

- **Rol:** médico. La jefatura también, desde su propio turno.
- **Historia:** Como médico quiero marcar a un colega en su turno y pedir el cambio desde el mío para armar el intercambio sin buscarlo de nuevo.
- **Pantallas:** «Detalle del turno» en `agenda` o `calendar_view` → `solicitudes` (Intercambio precargado).
- **Endpoints:** `GET /turnos/intercambiables`; al enviar, `POST /solicitudes` (tipo 4).
- **Criterios de aceptación:**
  1. En el turno de otra persona, cuando la toco, veo el aviso «Receptor: {nombre}» y la marca «Receptor: {nombre} · {turno}».
  2. Si ya tengo turno ese día en el mismo bloque, veo «Ya tienes un turno asignado en ese horario.» y no se marca.
  3. En un turno ajeno sin receptor elegido, el botón dice «Selecciona receptor y su turno» y está deshabilitado.
  4. En mi turno, «Solicitar cambio» abre el Intercambio con mi turno precargado y, si marqué receptor, también con su turno. Si ese turno no es intercambiable, se descarta (R14).
- **Trazabilidad:** MF-010, MF-015; R14; Archivo §6.10.
- **Estado:** **Implementada.** Evidencia: `handleSelectTargetFuncionario` y `handleOpenExchangeRequest` en `AgendaView` y `calendarView`; `ShiftDetail` (`canRequestExchange`).
- **Prueba E2E:** `medico`; no muta si no se envía; ambos. Ya existe: fotos en `interacciones-turnos.spec.js`.

#### HU-DET-04 · Ver el historial desde el detalle

- **Rol:** todos.
- **Historia:** Como funcionario quiero ver el historial del turno para saber quién lo cambió y cuándo.
- **Pantallas:** «Detalle del turno» → «Ver historial» → «Historial del turno» (`HistorialTurnoSheet`, en `BitacoraView.jsx`; en desktop, un panel lateral sobre el detalle).
- **Endpoints:** `GET /bitacoras/turno/{id}`.
- **Criterios de aceptación:**
  1. Dada la jefatura (o el subrogante), «Ver historial» abre el historial de ese turno, del más reciente al más antiguo: sus eventos y los de las solicitudes y las ofertas generales sobre él. Lo ve en todos los turnos de su servicio, también en los cupos.
  2. Dado el médico, ve el historial del turno que tiene hoy. En un turno ajeno o en un cupo no se le ofrece «Ver historial», y por API `GET /bitacoras/turno/{id}` responde 403 «Solo puedes ver el historial de tus turnos».
  3. Negativo (API): un turno de otro servicio responde 403 «No tienes acceso a datos de otro servicio» (salvo al administrador); un turno que no existe, 404 «El turno no existe».
- **Trazabilidad:** MF-015, MF-031; R18; §5, C-06.
- **Estado:** **Implementada** (C-06, 17 oct). `GET /bitacoras/turno/{id}` trae los eventos del turno, los de las solicitudes cuyo turno o turno del receptor es ese y los de sus ofertas generales, en el formato de `/bitacoras/dto`. La bitácora general quedó solo para la gestión (`Prop4`): el médico ya no llega a ella. Evidencia: `HistorialTurnoSheet`; `BitacoraController`; `BitacoraService`.
- **Prueba E2E:** `medico` (ve el historial de su turno) y `jefatura`; no muta; ambos. El permiso del médico por API: `e2e/hu/permisos.spec.js`.

### 3.4 Solicitudes (HU-SOL)

#### HU-SOL-01 · Ver mis solicitudes, las recibidas y las ofertas (médico)

- **Rol:** médico, multiservicio.
- **Historia:** Como médico quiero ver mis solicitudes y las propuestas que me hicieron, con su estado, para saber qué está pendiente.
- **Pantallas:** `solicitudes`; barra «Solicitudes»; menú «Solicitudes», con el contador de pendientes propias y recibidas.
- **Endpoints:** `GET /solicitudes/funcionario/{id}`, `GET /solicitudes/receptor/{id}`, `GET /ofertas-generales/servicio/{id}`, `GET /servicios/{id}`.
- **Criterios de aceptación:**
  1. Veo las pestañas «Mis solicitudes», «Recibidas» (con contador de pendientes) y «Ofertas generales».
  2. Cada solicitud muestra el tipo, la fecha, el estado (PENDIENTE, APROBADA, RECHAZADA o CANCELADA), el Solicitante, el Receptor, el turno principal («Turno a liberar», «Turno a cubrir», «Turno a recibir» o «Turno ofrecido», según el tipo), «Turno a entregar» en los intercambios, el Período y el Motivo.
  3. En intercambios y ofertas particulares veo, según el caso, «Requiere tu respuesta», «Aceptada · Pend. jefatura», «Pend. jefatura», «Esperando respuesta del receptor» o «Receptor rechazó el intercambio».
  4. Puedo ordenar por «Más reciente», «Más antigua» o «Por tipo» (MF-017). En desktop además busco por nombre o motivo y filtro por tipo, con la lista a la izquierda y el detalle a la derecha.
  5. Sin datos veo «Sin solicitudes» y «No hay solicitudes aquí por el momento.».
- **Trazabilidad:** FUN-SGT-030; MF-017; R15, R18; BUG-002.
- **Estado:** **Implementada.** Evidencia: `SolicitudesView.jsx` (`load`, `TABS`, `evaluarSolicitud`, `filasSolicitud`, `applySort`); `SolicitudesDesktop.jsx`; `useSolicitudesPendientes.js`.
- **Prueba E2E:** `medico`. El médico 369 no tiene solicitudes en el seed: hay que crearlas antes (muta) o simular los GET, como hace `interacciones-turnos.spec.js`. Ambos.

#### HU-SOL-02 · Bandeja de solicitudes del servicio (gestión)

- **Rol:** jefatura, subrogante y administrador con rol JEFATURA en el servicio.
- **Historia:** Como jefatura quiero ver las solicitudes pendientes y resueltas de mi servicio para decidirlas a tiempo.
- **Pantallas:** `solicitudes`, desde «Evaluar Solicitudes» del panel, la barra «Solicitudes» o el menú «Solicitudes» (contador de pendientes del servicio).
- **Endpoints:** `GET /solicitudes` (todas; el filtro por servicio lo hace el navegador); `GET /ofertas-generales/servicio/{id}`.
- **Criterios de aceptación:**
  1. Veo «Pendientes» (con contador), «Historial» y «Ofertas generales» (con el contador de ofertas por abrir).
  2. Solo aparecen solicitudes de mi servicio: el backend entrega a la jefatura y al subrogante las del servicio de la sesión (por el servicio de sus turnos o, en un permiso sin turno, por el del emisor); al administrador, todas (C-17).
  3. Una solicitud sin turno (un permiso creado desde la interfaz) de otro servicio no aparece.
  4. Mis propias solicitudes aparecen junto a las del servicio: puedo cancelarlas (HU-SOL-11), pero no decidirlas (HU-SOL-09).
- **Trazabilidad:** MF-027; FUN-SGT-030; TC-026; BUG-002.
- **Estado:** **Parcial.** El criterio 3 falla solo con el administrador. El 17 oct el backend acotó las lecturas (C-17): la jefatura y el subrogante reciben las solicitudes de su servicio, y el médico, solo aquellas en que es emisor o receptor. Pero el administrador recibe todas (`SolicitudService.findAllSolicitudes`, `acotarLectura`), y el filtro de la vista, `!s.turno || turno.servicio = servicio activo` (en `SolicitudesView.load`, y el mismo en `useSolicitudesPendientes` y en el Centro), deja pasar los permisos sin turno de otros servicios, porque la respuesta no trae los servicios del solicitante. Aprobar uno de esos permisos sí falla (403). Arreglo: acotar al servicio activo también para el administrador en `findAllSolicitudes` y después quitar el `!s.turno ||` de la vista. La prueba E2E conserva su marca `fallaConocida` (`solicitudes-ofertas.spec.js`).
- **Prueba E2E:** `jefatura`; datos: `multiservicio` crea un permiso en Cirugía (muta); ambos. Ya existe: fotos en `interacciones-turnos.spec.js`.

#### HU-SOL-03 · Pedir un permiso

- **Rol:** todos (la interfaz lo ofrece a todos).
- **Historia:** Como funcionario quiero pedir un permiso entre dos fechas para ausentarme con autorización de la jefatura.
- **Pantallas:** `solicitudes` → «+» (móvil) o «Nueva solicitud» (desktop) → «Permiso».
- **Endpoints:** `POST /solicitudes` (tipo 1, sin turno).
- **Criterios de aceptación:**
  1. El paso 1 ofrece seis tipos: Permiso, Botar turno, Cobertura, Intercambio, Oferta particular y Oferta general.
  2. Las fechas van desde hoy hasta el 31 de diciembre del año siguiente, y el término no puede ser anterior al inicio. En móvil se eligen año, mes y día; en desktop, con campos de fecha.
  3. Si falta una fecha, «Enviar solicitud» muestra «Rellena todos los campos requeridos.».
  4. Al enviar, la solicitud aparece PENDIENTE en «Mis solicitudes» y en la bandeja de la jefatura.
  5. Al aprobarla no cambia ningún turno: el permiso queda como registro y la jefatura libera a mano los turnos que correspondan (§5, C-15, decidido el 17 oct).
- **Trazabilidad:** FUN-SGT-026; MF-007; TC-025, TC-027; RN-SGT-017.
- **Estado:** **Implementada.** Evidencia: `CrearSolicitudSheet` (`buildDTO`, `handleSubmit`); `SolicitudService.crearSolicitud`. El backend no valida el orden de las fechas (TC-027); solo lo hace la interfaz.
- **Prueba E2E:** `medico`; muta; ambos. Ya existe: foto del asistente en `interacciones-turnos.spec.js`. Automatizada: `e2e/hu-muta/crear-solicitudes.spec.js` y, el criterio 5, `aprobaciones.spec.js`.

#### HU-SOL-04 · Botar (liberar) un turno propio

- **Rol:** todos los que tienen turnos futuros.
- **Historia:** Como médico quiero liberar uno de mis turnos para que quede como cupo libre si la jefatura lo aprueba.
- **Pantallas:** «Nueva solicitud» → «Botar turno» → «Turno a liberar».
- **Endpoints:** `GET /turnos/funcionario/{id}/futuros`; `POST /solicitudes` (tipo 2).
- **Criterios de aceptación:**
  1. El selector lista solo mis turnos que no han empezado, hasta 12 meses hacia adelante (R14).
  2. Al enviar queda PENDIENTE. Al aprobarse, el turno queda sin funcionario y aparece como cupo libre.
  3. Si ese turno ya está en otra solicitud mía pendiente, no se crea nada. Si la otra solicitud lo pide (por ejemplo, otro «Botar turno»), veo «Ud. ya solicitó este turno. Cancele la solicitud pendiente desde Solicitudes si desea cambiarla.» (R12). Si es el turno que entrego en un intercambio pendiente, veo «Ese turno ya está comprometido en otra solicitud pendiente suya. Cancélela desde Solicitudes para pedir otra cosa sobre él.» (R15). El backend revisa en ese orden (`SolicitudService.java:124-133`).
- **Trazabilidad:** MF-008; FUN-SGT-026; R14, R15; RN-SGT-017.
- **Estado:** **Implementada.** Evidencia: `TurnoService.getTurnosFuturosFuncionario`; `SolicitudService.crearSolicitud` y `cambiarEstado`. Desde el 17 oct el backend exige que el turno sea del solicitante (403, S-01) y que no haya empezado (409 «Ese turno ya empezó»).
- **Prueba E2E:** `medico`, y `jefatura` para aprobar; muta; ambos. Automatizada: `e2e/hu-muta/crear-solicitudes.spec.js` y, «al aprobarse», `aprobaciones.spec.js`.

#### HU-SOL-05 · Ofrecerme para cubrir un cupo (Cobertura)

- **Rol:** todos.
- **Historia:** Como médico quiero postular a un cupo libre para sumar un turno con aprobación de la jefatura.
- **Pantallas:** «Nueva solicitud» → «Cobertura» → «Turno a cubrir»; o directo desde un cupo (HU-DET-02) o desde el Centro (HU-CAL-05).
- **Endpoints:** `GET /turnos/servicio/{id}/sin-asignar`; `POST /solicitudes` (tipo 3).
- **Criterios de aceptación:**
  1. El selector lista los cupos libres del servicio que todavía se pueden tomar: quedan fuera los que ya empezaron, los de un bloque (día o noche) donde ya trabajo, los que se solapan con mis turnos y la noche seguida de día en los dos sentidos (R13), la misma regla de «Disponibles» (HU-CAL-02).
  2. Al enviar queda PENDIENTE. Al aprobarse, el turno queda a mi nombre.
  3. Al crear se aplican R12 y R13 (HU-SOL-13 y HU-SOL-14).
- **Trazabilidad:** MF-009; FUN-SGT-026; R4, R12, R13.
- **Estado:** **Implementada.** Evidencia: `TurnoRepository.findUnassignedTurnosByServicio`; `puedeTomarCupo` (`utils/reglasTurno.js`). El selector aplica la regla de «Disponibles» contra todos los turnos de la persona (`GET /turnos/funcionario/{id}`). Desde el 17 oct (§5.1), `GET /turnos/servicio/{id}/sin-asignar` solo entrega los cupos que no han empezado y el backend rechaza pedir un turno que ya empezó (409 «Ese turno ya empezó»). Un cupo ya pedido sigue en el selector: al enviarlo, el backend responde el mensaje de R12.
- **Prueba E2E:** `medico`; datos: los cupos de la semana pasada del seed (turnos 97, 99, 102 y 106) y los cupos futuros generados; muta; ambos. Automatizada: `e2e/hu-muta/crear-solicitudes.spec.js` y, «al aprobarse», `aprobaciones.spec.js`.

#### HU-SOL-06 · Proponer un intercambio (R14)

- **Rol:** todos.
- **Historia:** Como médico quiero cambiar mi turno por uno de un colega, viendo solo los canjes posibles, para no proponer algo que se va a rechazar.
- **Pantallas:** «Nueva solicitud» → «Intercambio» → «Tu turno a entregar», «Con quién intercambiar» y «Turno del receptor que quieres».
- **Endpoints:** `GET /turnos/funcionario/{id}/futuros`; `GET /funcionarios/summary?servicioId=`; `GET /turnos/intercambiables?idTurnoPropio&idFuncionarioReceptor`; `POST /solicitudes` (tipo 4).
- **Criterios de aceptación:**
  1. El tercer selector aparece solo después de elegir receptor. Con mi turno ya elegido, lista solo los turnos del receptor que no han empezado, del mismo servicio, sin solape ni «24 invertido» para ninguno de los dos y no comprometidos en otra solicitud mía.
  2. Si la lista queda vacía, veo «No hay turnos intercambiables con el que elegiste: …».
  3. Si cambio mi turno o el receptor, se borra el turno del receptor que ya había elegido.
  4. Al enviar queda PENDIENTE con «Esperando respuesta del receptor». El receptor la ve en «Recibidas» con «Requiere tu respuesta».
  5. Si mi turno ya está comprometido, veo «El turno que ofreces entregar ya está comprometido en otra solicitud pendiente suya. Cancélela desde Solicitudes para crear esta.».
  6. Al aprobarse, los turnos se cruzan entre los dos.
- **Trazabilidad:** MF-010; FUN-SGT-026; R13, R14, R15; RN-SGT-019, RN-SGT-041.
- **Estado:** **Implementada.** Evidencia: `TurnoService.getTurnosIntercambiables`; `CrearSolicitudSheet` (efecto del selector del receptor y purgas); `SolicitudService.crearSolicitud` y `validarConflictoSegunTipo`. Desde el 17 oct, con el turno propio comprometido el asistente lo dice (criterio 5): lo reconoce con las solicitudes propias que la vista ya cargó (`turnosComprometidos`, `utils/reglasSolicitud.js`) y, al enviar, muestra el mensaje de R15 en vez de «Rellena todos los campos requeridos.». `GET /turnos/intercambiables` sigue devolviendo una lista vacía sin decir por qué. Al crear, el turno pedido tiene que ser hoy del receptor (409 «El turno que pides no es de la persona con quien quieres intercambiar»).
- **Prueba E2E:** `medico` y el receptor 30000069-9; muta; ambos. Automatizada: `e2e/hu-muta/propuestas.spec.js`; el criterio 5, `reglas-solicitud.spec.js`.

#### HU-SOL-07 · Ceder un turno a una persona (Oferta particular)

- **Rol:** todos.
- **Historia:** Como médico quiero ofrecerle mi turno a un colega determinado para que lo tome si acepta y la jefatura lo aprueba.
- **Pantallas:** «Nueva solicitud» → «Oferta particular» → «Tu turno a ofrecer» y «Ofrecer a».
- **Endpoints:** `GET /turnos/funcionario/{id}/futuros`; `GET /funcionarios/summary?servicioId=`; `POST /solicitudes` (tipo 5).
- **Criterios de aceptación:**
  1. Al enviar queda PENDIENTE, esperando al receptor.
  2. Cuando el receptor acepta queda «Pend. jefatura»; cuando la jefatura aprueba, el turno pasa al receptor.
  3. Si el receptor quedaría con un solape o con una noche seguida de día, aceptar o aprobar muestra el mensaje de la regla.
- **Trazabilidad:** MF-011; FUN-SGT-026, FUN-SGT-027; RN-SGT-017, RN-SGT-019, RN-SGT-039.
- **Estado:** **Implementada.** Evidencia: `CrearSolicitudSheet`; `SolicitudService.crearSolicitud`, `responderOfertaParticular` y `cambiarEstado`. Desde el 17 oct el backend exige que el turno ofrecido sea del solicitante (403, S-01).
- **Prueba E2E:** `medico`, el receptor 30000069-9 y `jefatura`; muta; ambos. Automatizada: `e2e/hu-muta/propuestas.spec.js`.

#### HU-SOL-08 · Responder una propuesta recibida

- **Rol:** el receptor de un intercambio o de una oferta particular (cualquier rol).
- **Historia:** Como médico quiero aceptar o rechazar un intercambio o una oferta que me hicieron para decidir antes que la jefatura.
- **Pantallas:** `solicitudes` → «Recibidas» (médico) o «Pendientes» (gestión) → «Aceptar» o «Rechazar».
- **Endpoints:** `PUT /solicitudes/{id}/intercambio?respuesta=`, `PUT /solicitudes/{id}/oferta-particular?respuesta=`.
- **Criterios de aceptación:**
  1. Solo el receptor ve «Aceptar» y «Rechazar», y solo mientras la solicitud esté PENDIENTE y sin respuesta.
  2. Aceptar la deja PENDIENTE con «Aceptada · Pend. jefatura». Rechazar la deja RECHAZADA con «Receptor rechazó el intercambio».
  3. Aceptar revalida el solape y R13; si falla, veo el mensaje del backend.
  4. Negativo (API): si responde otro usuario, recibe 400 «No eres el receptor de esta solicitud».
- **Trazabilidad:** FUN-SGT-027; MF-010, MF-011; RN-SGT-019.
- **Estado:** **Implementada.** Evidencia: `evaluarSolicitud` (`canRespond`); `SolicitudService.responderOfertaIntercambio` y `responderOfertaParticular`. Desde el 17 oct (S-01 c y HU-SOL-08) la condición del criterio 1 también la exige el backend: el receptor responde una sola vez y solo una solicitud PENDIENTE (409 «Ya respondiste esta solicitud» o «Esta solicitud ya fue resuelta: no se puede responder»); quien no es el receptor sigue recibiendo 400.
- **Prueba E2E:** 30000069-9 como receptor de una propuesta creada por `medico`. No usar la solicitud 12 del seed, aunque el administrador sea su receptor: es de Medicina Interna y su emisor está en el bloque de RUT por revisar (§7). Muta; ambos. Automatizada: `e2e/hu-muta/propuestas.spec.js`; el criterio 4, `e2e/hu/permisos.spec.js`.

#### HU-SOL-09 · Aprobar o rechazar solicitudes

- **Rol:** jefatura, subrogante, administrador.
- **Historia:** Como jefatura quiero aprobar o rechazar las solicitudes de mi servicio para que los turnos cambien solo con mi autorización.
- **Pantallas:** `solicitudes` → «Pendientes» → «Aprobar» o «Rechazar»; también el panel de solicitudes del Centro (desktop).
- **Endpoints:** `PUT /solicitudes/{id}/estado?nuevoEstado=APROBADA|RECHAZADA`.
- **Criterios de aceptación:**
  1. Los botones aparecen solo en solicitudes PENDIENTES y, en intercambios y ofertas particulares, solo después de que el receptor aceptó.
  2. Al aprobar, «Botar turno» libera el turno, Cobertura lo asigna al solicitante, Intercambio cruza los turnos, Oferta particular lo asigna al receptor y Permiso no toca turnos.
  3. Al aprobar, las demás solicitudes pendientes que piden u ofrecen el mismo turno quedan RECHAZADAS con «Rechazo automático: Otra solicitud para este turno fue aprobada.» (R10, R15).
  4. La aprobación revalida el solape y R13. Si falla, veo el mensaje y la solicitud sigue PENDIENTE.
  5. Si la jefatura asigna, reasigna o libera a mano un turno con solicitudes pendientes, estas quedan RECHAZADAS con «Rechazo automático: El turno fue asignado manualmente.» (o «reasignado», o «liberado»), de modo que «Turno ya cubierto», «Este turno ya fue asignado a otra persona» y «… el intercambio quedó obsoleto» ya no se alcanzan por la interfaz; quedan como protección ante una carrera.
  6. Si participo en la solicitud (como solicitante o receptor), no veo los botones y leo «Participas en esta solicitud: por segregación de funciones, la decisión corresponde a otra jefatura.», igual en móvil y en desktop. El backend lo respalda: «No puedes aprobar ni rechazar una solicitud en la que participas directamente». La regla (`participaEnSolicitud`) cuenta también a los dueños de los turnos, pero ese caso no se produce: el cambio de dueño rechaza antes las solicitudes pendientes (criterio 5).
  7. Si dos jefaturas aprueban a la vez, la segunda ve «Esta solicitud ya no está pendiente (probablemente otra jefatura ya la resolvió)».
  8. Negativos: el médico no ve los botones, y por API `PUT /estado` con su token lo niega el filtro de seguridad con 403 «No tienes permiso para realizar esta acción», sin cerrar la sesión (BUG-005 y BUG-001, corregidos). Una solicitud de otro servicio responde 403 «No tienes acceso a solicitudes de otro servicio»; si es un intercambio con un turno de otro servicio, 403 «El intercambio involucra un turno de otro servicio» (`SolicitudService`).
- **Trazabilidad:** FUN-SGT-028; MF-027; R10, R12, R13, R15; RN-SGT-017, 018, 019 y 040; TC-028, TC-029; BUG-005.
- **Estado:** **Implementada.** Evidencia: `SolicitudesView` (`handleAprobar`, `handleRechazar`, `evaluarSolicitud`); `utils/reglasSolicitud.js` (`participaEnSolicitud`); `SolicitudService.cambiarEstado` (`participantesDirectos`, `lockTurnosInvolucrados`, `rechazarSolicitudesCompetitivas`); `SecurityConfig` (comentario «SEC (H-07)»). El cierre del 17 oct corrigió lo que la dejaba parcial: la segregación de funciones es una sola regla en móvil y desktop (P-01); el backend revisa que el receptor haya aceptado antes de aprobar un intercambio o una oferta particular (C-11, 409); revisa que el turno siga siendo de quien lo comprometió al aprobar un permiso con turno, un «Botar turno» o una «Oferta particular» (S-01 a, 409); y no deja pasar a RECHAZADA ni devolver a PENDIENTE una solicitud ya resuelta (S-01 c, 409).
- **Prueba E2E:** `jefatura`, con solicitudes creadas por `medico`; muta; ambos. Ya existe: fotos en `interacciones-turnos.spec.js`. Automatizada: `e2e/hu-muta/aprobaciones.spec.js`; el criterio 8, `e2e/hu/permisos.spec.js`.

#### HU-SOL-10 · Elegir entre varios postulantes al mismo turno (R10)

- **Rol:** jefatura, subrogante.
- **Historia:** Como jefatura quiero ver juntas las coberturas que compiten por el mismo turno y elegir a una persona para no aprobarlas una por una.
- **Pantallas:** `solicitudes` → «Pendientes» → tarjeta «Postulaciones al mismo turno»; en el Centro (desktop), «Elegir».
- **Endpoints:** `PUT /solicitudes/{id}/estado`.
- **Criterios de aceptación:**
  1. Dadas dos o más coberturas PENDIENTES del mismo turno, veo una sola tarjeta «Postulaciones al mismo turno · N postulantes», con el turno, la posición y los postulantes por orden de llegada, cada uno con su motivo.
  2. Cuando elijo a una persona, su solicitud queda APROBADA, el turno pasa a su nombre y las demás quedan RECHAZADAS con el motivo automático.
  3. Puedo rechazar a un postulante sin elegir a otro.
  4. En desktop la decisión se toma en el detalle, persona por persona.
- **Trazabilidad:** R10, R16, R18; MF-027.
- **Estado:** **Implementada.** Evidencia: `SolicitudesView` (`gruposPostulacion`, `PostulacionesGrupoCard`, `datosGrupoPostulacion`); `CentroOperacionesDesktop` (`solsVM`); `SolicitudService.rechazarSolicitudesCompetitivas`.
- **Prueba E2E:** `jefatura`, con coberturas de `medico` y de 30000069-9 sobre el mismo cupo futuro; muta; ambos. Ya existe: foto con datos simulados en `interacciones-turnos.spec.js`. Automatizada: `e2e/hu-muta/aprobaciones.spec.js`.

#### HU-SOL-11 · Cancelar mi solicitud pendiente (R15)

- **Rol:** quien emitió la solicitud, con cualquier rol (también la jefatura).
- **Historia:** Como médico quiero cancelar una solicitud que ya no necesito para liberar el turno comprometido y pedir otra cosa.
- **Pantallas:** `solicitudes` → «Cancelar solicitud» → confirmación.
- **Endpoints:** `PUT /solicitudes/{id}/cancelar`.
- **Criterios de aceptación:**
  1. El botón aparece solo en mis solicitudes PENDIENTES.
  2. La confirmación dice «Se cancelará tu solicitud de {tipo}.» y, si la solicitud tiene turno (todas menos el permiso), agrega «El turno involucrado queda libre para que pidas otra cosa sobre él.» (`SolicitudesView.jsx:1477` y `:1663`). Tiene «Volver» y «Cancelar solicitud».
  3. Al confirmar, la solicitud queda con la marca CANCELADA (neutra), con el motivo «Cancelada por el solicitante · motivo original: …», y el turno se puede volver a pedir.
  4. La bitácora registra el evento «Cancelada por el solicitante»; la solicitud se ve como CANCELADA (tono neutro, igual que en Solicitudes) y el filtro por estado suma «Cancelada»: «Rechazada» ya no la incluye.
  5. Una jefatura puede cancelar una solicitud propia aunque no pueda decidirla.
  6. Negativos (API): cancelar una solicitud ajena responde 403 «Solo puedes cancelar tus propias solicitudes»; una propia ya resuelta, 400 «Esta solicitud ya fue resuelta: no se puede cancelar». El backend revisa primero quién la emitió (`SolicitudService.java:241-248`): una ajena ya resuelta responde 403.
- **Trazabilidad:** R15.
- **Estado:** **Implementada.** Evidencia: `SolicitudesView` (`handleCancelar`, `confirmarCancelacion`; `canCancelar` y `esCancelada` en `evaluarSolicitud`); `SolicitudService.cancelarSolicitud`; `BitacoraView` (evento `SOLICITUD_CANCELADA`). Desde el 17 oct la cancelación se ve como CANCELADA, no como RECHAZADA (P-01).
- **Prueba E2E:** `medico` y `jefatura`; muta; ambos. Ya existe: foto con datos simulados en `interacciones-turnos.spec.js`. Automatizada: `e2e/hu-muta/cancelar-modificar.spec.js` y, el criterio 5 en móvil, `aprobaciones.spec.js`; el criterio 6 con una solicitud ajena, `e2e/hu/permisos.spec.js`.

#### HU-SOL-12 · Modificar el motivo de mi solicitud

- **Rol:** médico.
- **Historia:** Como médico quiero corregir el motivo de mi solicitud mientras está pendiente para explicarla mejor a la jefatura.
- **Pantallas:** `solicitudes` → «Modificar motivo» → «Guardar cambios».
- **Endpoints:** `PATCH /solicitudes/{id}/motivo?motivo=`.
- **Criterios de aceptación:**
  1. El botón aparece solo en mis solicitudes PENDIENTES, no en las recibidas.
  2. «Guardar cambios» está deshabilitado si el texto está vacío. Al guardar, el motivo nuevo se ve en la tarjeta.
  3. Si falla, veo el mensaje del backend o, si no hay, «No se pudo guardar. Intenta de nuevo.».
  4. Negativos (API): el motivo de una solicitud ajena responde 403 «Solo quien emitió la solicitud puede modificar su motivo» (el administrador queda exento); el de una que ya no está pendiente, 400 «Solo se puede modificar el motivo si la solicitud está en estado PENDIENTE».
- **Trazabilidad:** FUN-SGT-029; RN-SGT-020.
- **Estado:** **Implementada.** Evidencia: `EditMotivoSheet`; `SolicitudService.modificarMotivo`. Observación: la jefatura y el subrogante no tienen el botón para sus propias solicitudes. Desde el 17 oct el error muestra el mensaje del backend (`mensajeDeError`) y los textos están en español neutro (P-01).
- **Prueba E2E:** `medico`; muta; ambos. Automatizada: `e2e/hu-muta/cancelar-modificar.spec.js`; el criterio 4, `e2e/hu/permisos.spec.js`.

#### HU-SOL-13 · No pedir dos veces el mismo turno ni comprometerlo en dos solicitudes (R12, R15)

- **Rol:** todos.
- **Historia:** Como jefatura quiero que nadie tenga dos solicitudes pendientes sobre el mismo turno para no recibir pedidos contradictorios.
- **Pantallas:** «Nueva solicitud», detalle del turno, Centro.
- **Endpoints:** `POST /solicitudes`.
- **Criterios de aceptación:**
  1. Dado que pedí cubrir un cupo, cuando lo pido de nuevo por otra vía (Nueva solicitud → Cobertura), veo «Ud. ya solicitó este turno. Cancele la solicitud pendiente desde Solicitudes si desea cambiarla.» y no se crea nada.
  2. Dado que ofrecí mi turno X en un intercambio, cuando intento botar, ofrecer o intercambiar X, veo el mensaje de turno comprometido, que menciona cancelar. En el asistente de intercambio, el aviso aparece bajo «Turno del receptor que quieres»: dice que el turno propio está comprometido en otra solicitud pendiente y que hay que cancelarla desde Solicitudes (R15); al enviar se muestra el mensaje de R15, no «Rellena todos los campos requeridos.».
  3. Otro postulante al mismo cupo no me bloquea. Si rechazaron o cancelé mi solicitud, puedo volver a pedir.
  4. Con dos pestañas abiertas, la segunda solicitud igual se rechaza: la garantía está en el backend.
- **Trazabilidad:** R12, R15.
- **Estado:** **Implementada.** Evidencia: `SolicitudService.crearSolicitud` (`existsByFuncionario_IdFuncionarioAndTurno_IdTurnoAndEstado`, `contarPendientesQueInvolucranTurno`). Desde el 17 oct el asistente de intercambio dice que el turno propio está comprometido (HU-SOL-06, criterio 5). Observación: las ofertas generales no participan de este bloqueo: un turno en oferta general se puede además botar o intercambiar, y `crearOferta` no revisa si el turno está comprometido en otra solicitud.
- **Prueba E2E:** `medico`; muta (la primera solicitud); ambos. Automatizada: `e2e/hu-muta/reglas-solicitud.spec.js` y, el criterio 3, `aprobaciones.spec.js`.

#### HU-SOL-14 · Respetar el descanso post nocturno (R13)

- **Rol:** todos al crear y aceptar; jefatura al aprobar, seleccionar y asignar.
- **Historia:** Como jefatura quiero que el sistema impida que alguien salga de una noche y entre al día siguiente, para cuidar el descanso.
- **Pantallas:** «Nueva solicitud», detalle del turno, «Recibidas», «Pendientes», selección de postulante en ofertas y «Asignar turno libre».
- **Endpoints:** `POST /solicitudes`; `PUT /solicitudes/{id}/intercambio`, `/oferta-particular` y `/estado`; `PUT /ofertas-generales/{id}/seleccionar/{idPostulacion}`; `POST /turnos/alterar`.
- **Criterios de aceptación:**
  1. Dado un médico con noche el día X, cuando pide el cupo de día del X+1 (cobertura, intercambio u oferta), se rechaza con «No es posible asignar el turno a {nombre} porque sale de su turno de noche (…) la mañana de ese mismo día. Se permite un día seguido de su noche (24 horas corridas), pero no una noche seguida de día.». Las fechas del mensaje salen legibles, por ejemplo «lun 8 jun, 20:00 a mar 9 jun, 08:00», no en ISO (P-01).
  2. Lo mismo en el sentido inverso: pedir una noche que termina el mismo día de un turno de día que ya tengo. El mensaje dice entonces «… porque saldría de ese turno de noche la misma mañana en que empieza su turno de día (…). Se permite un día seguido de su noche (24 horas corridas), pero no una noche seguida de día.».
  3. El día X más la noche del X (24 horas corridas) se permite; dos noches seguidas también.
  4. La regla se revalida al aceptar como receptor, al aprobar y al seleccionar al postulante de una oferta.
  5. La jefatura tampoco puede asignar ni reasignar a mano a esa persona en ese día: `POST /turnos/alterar` responde 409 con el mismo mensaje (C-04). La generación de la planificación no aplica R13 (limitación conocida).
- **Trazabilidad:** R13, que reemplaza la regla de 12 horas de RN-SGT-039 y FUN-SGT-052; R9 (el filtro «Disponibles» es coherente).
- **Estado:** **Implementada.** `ValidadorAsignacionTurnoService` (`esDescansoPostNocturnoViolado`, `validarDescansoPostNocturno`) lo usan `SolicitudService`, `OfertaGeneralService`, `TurnoService.getTurnosIntercambiables` y, desde el 17 oct (C-04), `GestionTurnoService` en la asignación y la reasignación manual (409, sin excepción de emergencia). Los mensajes muestran las fechas legibles (P-01). Limitación conocida: la generación de la planificación no aplica R13. Observación: el aviso de R13 no nombra el tipo ni el servicio del turno que choca; el de cruce de horario sí, desde el 22 oct (A1-07).
- **Prueba E2E:** `medico` y `jefatura`. Datos: la jefatura libera (HU-ASG-03) un turno de día del día siguiente a una noche del médico 369, y después el médico lo pide. Muta; ambos. Automatizada: `e2e/hu-muta/reglas-solicitud.spec.js` (criterios 1 a 3), `propuestas.spec.js` (4) y `asignacion.spec.js` (5).

### 3.5 Ofertas y postulaciones (HU-OFE)

#### HU-OFE-01 · Publicar una oferta general de mi turno

- **Rol:** todos.
- **Historia:** Como médico quiero ofrecer mi turno a todo el servicio para que lo tome quien pueda, con aprobación de la jefatura.
- **Pantallas:** «Nueva solicitud» → «Oferta general» → «Tu turno a ofrecer»; pestaña «Ofertas generales».
- **Endpoints:** `GET /turnos/funcionario/{id}/futuros`; `POST /ofertas-generales`; `PUT /ofertas-generales/{id}/retirar`.
- **Criterios de aceptación:**
  1. Al enviar, la oferta aparece en «Ofertas generales» con la marca «Pend. apertura».
  2. Como ofertor no veo «Postular» en mi oferta. Cuando la abren, veo «Tu oferta está abierta · N postulantes».
  3. Hasta que alguien postule, el ofertor ve «Retirar oferta» (en el detalle en desktop, bajo la tarjeta en móvil y en la tarjeta del Centro): con la oferta «Pend. apertura» o «Abierta» y sin ninguna postulación (C-16, ajustada el 20 oct; antes, solo mientras nadie la hubiera abierto). Pide confirmación («Se retirará tu oferta general: ya no esperará apertura, nadie podrá postular y el turno sigue siendo tuyo.»; si está abierta, «…dejará de estar abierta, nadie podrá postular…»); la oferta queda RETIRADA y el turno sigue siendo suyo.
  4. Con al menos una postulación, el ofertor no ve «Retirar oferta» y el backend responde 409 «La oferta ya tiene postulaciones: no se puede retirar»; si quien postuló se retira y la oferta queda sin postulaciones, vuelve a poder retirarse. Una oferta cerrada (el turno ya se asignó), rechazada o ya retirada nunca se retira: 409 «La oferta ya está cerrada y su turno quedó asignado: no se puede retirar» (o «…ya está rechazada…», «…ya está retirada…»). Solo el ofertor puede retirarla: a otra persona, también a la gestión, el backend le responde 403 «Solo quien publicó la oferta puede retirarla».
- **Trazabilidad:** FUN-SGT-031; MF-012; TC-030; C-16 (decisiones del 17 y del 20 oct).
- **Estado:** **Implementada.** Evidencia: `CrearSolicitudSheet` (tipo 6); `OfertaGeneralService.crearOferta` y `retirarOferta` (estado RETIRADA, migración V3; `EstadoOferta.admiteRetiro`); en la interfaz, `puedeRetirarOferta` (`utils/reglasSolicitud.js`), la misma regla en Solicitudes y en el Centro. Desde el 17 oct el backend exige que el turno sea del ofertor (403, S-01 b), los errores salen con el mensaje del backend y el ofertor puede retirar su oferta (C-16); desde el 20 oct, hasta que alguien postule, también abierta. `postular` lee la oferta con lock, como `retirarOferta`, para que un retiro y una postulación simultáneos no dejen una oferta retirada con postulación. Observación: `crearOferta` no comprueba que el turno esté libre de otras solicitudes.
- **Prueba E2E:** `medico`; muta; ambos. Automatizada: `e2e/hu-muta/crear-solicitudes.spec.js` (criterio 1 y, con ofertas simuladas, 3) y, la apertura real y los criterios 3 y 4, `ofertas-generales.spec.js`.

#### HU-OFE-02 · Abrir o rechazar una oferta (gestión)

- **Rol:** jefatura, subrogante, administrador.
- **Historia:** Como jefatura quiero revisar cada oferta antes de abrirla para decidir qué turnos se pueden ceder.
- **Pantallas:** `solicitudes` → «Ofertas generales» → «Aprobar» o «Rechazar»; en el Centro, «Aprobar apertura».
- **Endpoints:** `PUT /ofertas-generales/{id}/aprobar`, `PUT /ofertas-generales/{id}/rechazar`.
- **Criterios de aceptación:**
  1. Solo en ofertas «Pend. apertura»: «Aprobar» la deja «Abierta» (en el Centro, «Oferta abierta al servicio.») y «Rechazar» la deja «Rechazada».
  2. Una oferta en otro estado responde «La oferta no está en estado PENDIENTE_APROBACION».
  3. Negativos: el médico no ve los botones y por API recibe 403; una oferta de otro servicio también responde 403, salvo al administrador (`SeguridadServicio.exigirMismoServicio`).
- **Trazabilidad:** FUN-SGT-031; MF-012.
- **Estado:** **Implementada.** Evidencia: `OfertaGeneralCard` y `evaluarOferta` (`puedeDecidirApertura`); `OfertaGeneralController` (`@PreAuthorize`); `OfertaGeneralService.aprobarOferta`, `rechazarOferta` y `exigirMismoServicioQueOferta`. Desde el 17 oct las ofertas tienen la segregación de funciones de las solicitudes (S-01 d, P-01): el ofertor, el dueño del turno y quien postuló no abren ni rechazan la oferta ni eligen al postulante (403 en el backend), y la interfaz les muestra «Participas en esta oferta: por segregación de funciones, la decisión corresponde a otra jefatura.» (`participaEnOferta`).
- **Prueba E2E:** `jefatura`, con una oferta creada por `medico`; muta; ambos. Automatizada: `e2e/hu-muta/ofertas-generales.spec.js`; los criterios 2 y 3, `e2e/hu/permisos.spec.js`.

#### HU-OFE-03 · Postular y retirar mi postulación

- **Rol:** médico.
- **Historia:** Como médico quiero postular a un turno ofrecido y poder retirarme mientras siga abierto.
- **Pantallas:** `solicitudes` → «Ofertas generales» → «Postular» o «Retirar».
- **Endpoints:** `POST /ofertas-generales/{id}/postular`; `DELETE /ofertas-generales/{id}/postular/{idPostulacion}`.
- **Criterios de aceptación:**
  1. En una oferta «Abierta» de otra persona veo «Postular». Al postular veo «Postulado» y «Retirar».
  2. Al retirarme, vuelve «Postular».
  3. No puedo postular a mi propia oferta ni dos veces a la misma.
- **Trazabilidad:** FUN-SGT-032; MF-012; RN-SGT-021; TC-031.
- **Estado:** **Implementada.** Evidencia: `evaluarOferta` (`puedePostularORetirar`); `OfertaGeneralService.postular` y `retirarPostulacion`. Observaciones: la jefatura no puede postular desde la interfaz y no se puede postular desde el Centro. Desde el 17 oct los errores salen con el mensaje del backend (`mensajeDeError`).
- **Prueba E2E:** `medico`. La oferta 1 del seed está abierta, pero su turno es de la semana pasada (ver HU-OFE-05): mejor crear una oferta futura con 30000042-2. Muta; ambos. Automatizada: `e2e/hu-muta/ofertas-generales.spec.js`.

#### HU-OFE-04 · Seleccionar al postulante

- **Rol:** jefatura, subrogante.
- **Historia:** Como jefatura quiero elegir a quién se le asigna el turno ofrecido para cerrar la oferta.
- **Pantallas:** `solicitudes` → «Ofertas generales» → «Postulantes (N)» → «Seleccionar» → «Confirmar selección»; también el Centro.
- **Endpoints:** `PUT /ofertas-generales/{id}/seleccionar/{idPostulacion}`.
- **Criterios de aceptación:**
  1. La confirmación dice «Se asignará el turno de {ofertor} a {postulante}.», con el turno.
  2. Al confirmar, la oferta queda «Cerrada», el turno pasa al postulante y la tarjeta muestra «Asignado a {nombre}».
  3. Si el postulante quedaría con un solape o con una noche seguida de día, veo el mensaje de la regla y la oferta sigue abierta.
  4. Una oferta abierta sin postulantes muestra «Sin postulantes aún.».
- **Trazabilidad:** FUN-SGT-033; MF-012; RN-SGT-022; TC-032.
- **Estado:** **Implementada.** Evidencia: `OfertaGeneralCard` (confirmación); `OfertaGeneralService.seleccionarPostulante`. Desde el 17 oct, si el backend rechaza la selección por la regla, la pantalla muestra su mensaje (criterio 3); el backend revisa que el turno siga siendo del ofertor (409 si cambió de dueño) y que quien elige no participe en la oferta (403) (S-01 a y d).
- **Prueba E2E:** `jefatura`; datos: una oferta futura con postulante; muta; ambos. Ya existe: foto de la confirmación en `interacciones-turnos.spec.js`. Automatizada: `e2e/hu-muta/ofertas-generales.spec.js`.

#### HU-OFE-05 · Ver solo las ofertas vigentes

- **Rol:** todos.
- **Historia:** Como médico quiero ver solo ofertas de turnos que todavía no han pasado para no postular a algo que ya ocurrió.
- **Pantallas:** Centro (desktop) y `solicitudes` → «Ofertas generales».
- **Endpoints:** `GET /ofertas-generales/servicio/{id}`.
- **Criterios de aceptación:**
  1. Las ofertas de turnos ya terminados no aparecen, ni en el Centro ni en «Ofertas generales».
  2. Las ofertas rechazadas o retiradas no aparecen como disponibles.
  3. Al médico, el backend no le entrega las ofertas rechazadas ni retiradas de otras personas (las propias, sí); la gestión y el administrador ven todas. El médico ve en «Ofertas generales» solo las abiertas, más las que él publicó.
- **Trazabilidad:** R16, R17.
- **Estado:** **Implementada** (C-16, 17 oct). El Centro y la pestaña «Ofertas generales» de Solicitudes usan el mismo filtro, `ofertaVisible` (`utils/reglasSolicitud.js`): fuera las ofertas de turnos terminados, las rechazadas y las retiradas; la gestión ve las abiertas, las que esperan apertura y las cerradas con un elegido; el médico, solo las abiertas y las suyas. Sin ofertas visibles, el aviso dice «No hay ofertas vigentes en este servicio.». Además `GET /ofertas-generales/servicio/{id}` no entrega al médico las rechazadas ni las retiradas de otros (`EstadoOferta.soloLaVeSuOfertor`).
- **Prueba E2E:** `medico`. La oferta 1 del seed, abierta y de la semana pasada, aparece hoy en «Ofertas generales». No muta; ambos.

### 3.6 Notificaciones (HU-NOT)

#### HU-NOT-01 · Ver mi bandeja de notificaciones

- **Rol:** todos.
- **Historia:** Como funcionario quiero ver mis notificaciones nuevas y leídas para enterarme de lo que pasó con mis solicitudes.
- **Pantallas:** `notifications`; en móvil, el ícono de bandeja del encabezado del inicio (con contador); en desktop, el menú «Notificaciones» (con contador).
- **Endpoints:** `GET /notificaciones/usuario/{id}` y `GET /notificaciones/sin-leer/{id}`, cada 15 segundos mientras la pestaña está visible.
- **Criterios de aceptación:**
  Con el interruptor `NOTIFICACIONES_HABILITADAS` apagado (la entrega, C-09), la bandeja no se ofrece: sin ícono, ítem de menú ni contador, y sin el aviso «N notificaciones sin leer»; si se pide la vista `notifications` (ícono, ítem o vista guardada), cae al inicio, y no hay polling. Los criterios 1 a 4 describen la bandeja encendida; el 5 (403 por API) sigue vigente.
  1. Cada notificación muestra el texto, la fecha y «Nueva» o «Leída».
  2. Móvil: título «Bandeja» con «N sin leer» o «Todo al día», y las marcas «N sin leer» y «N recibidas». Desktop: segmentos «Todas», «Sin leer» y «Leídas» con sus conteos.
  3. El contador del menú, el del encabezado y las marcas «Nueva» coinciden.
  4. Sin notificaciones veo «No tienes notificaciones en este momento.».
  5. Negativo (API): pedir la bandeja o el contador de otro funcionario responde 403 «No puedes consultar la bandeja de otro funcionario», salvo al administrador (`NotificacionController.java:24-28`).
- **Trazabilidad:** FUN-SGT-034; MF-014; TC-034, TC-035; BUG-006.
- **Estado:** **No disponible en la entrega** (bandeja oculta, C-09). Evidencia: `NotificationContext` (polling); `NotificationView`; `NotificacionController.getBandeja` y `contarSinLeer` (`exigirPropiaONadaBandeja`); `src/config/funciones.js`. Sobre los datos: las notificaciones 5 a 12 del seed (Medicina Interna; el administrador ve tres) usan los estados `NO_LEIDA` y `LEIDA`, que el código no reconoce; con la bandeja encendida, el criterio 3 falla con esos datos. Prueba E2E: `e2e/hu/notificaciones.spec.js` guarda que la bandeja no se ofrece, y los criterios 1 a 4 quedan en pausa; el criterio 5 sigue en `e2e/hu/permisos.spec.js`.
- **Prueba E2E:** el funcionario 312 (§2.1), que tiene una notificación sin leer (la 16); no muta; ambos. Con la bandeja oculta, `e2e/hu/notificaciones.spec.js` solo comprueba que no se ofrece y deja en pausa los criterios 1 a 4; las fotos de `notifications` de la prueba visual se retiraron.

#### HU-NOT-02 · Marcar como leída y eliminar

- **Rol:** todos.
- **Historia:** Como funcionario quiero marcar como leídas o eliminar mis notificaciones para mantener ordenada la bandeja.
- **Pantallas:** `notifications` → «Marcar leída» o «Eliminar».
- **Endpoints:** `PUT /notificaciones/{id}/leer`, `DELETE /notificaciones/{id}`.
- **Criterios de aceptación:**
  Mientras la bandeja siga oculta (C-09), estos criterios están en pausa: no hay desde dónde marcar ni eliminar.
  1. «Marcar leída» la pasa a «Leída» y baja el contador.
  2. «Eliminar» la quita de la lista. Queda con estado ELIMINADO y no vuelve al refrescar.
- **Trazabilidad:** FUN-SGT-034; MF-014; BUG-006.
- **Estado:** **No disponible en la entrega** (bandeja oculta, C-09). Evidencia: `NotificationContext.markAsRead` y `deleteNotification`; `NotificacionService.marcarLeido` y `marcarComoEliminado`. Desde el 17 oct (C-17), el backend solo deja leer, marcar y eliminar al emisor o al receptor de la solicitud ligada (o al administrador). Las pruebas (`e2e/hu-muta/notificaciones.spec.js`) están omitidas con `test.skip` y su cuerpo intacto.
- **Prueba E2E:** el funcionario 312 (§2.1), con una notificación creada en la prueba (`POST /notificaciones`) y no con la 16 del seed, que usan las fases 1 y 2a; muta; ambos. Automatizada, pero omitida (`test.skip`) mientras la bandeja siga oculta: `e2e/hu-muta/notificaciones.spec.js`.

#### HU-NOT-03 · Recibir avisos de mis solicitudes y de mis turnos

- **Rol:** todos.
- **Historia:** Como médico quiero recibir una notificación cuando crean, responden, aprueban o rechazan mis solicitudes, o cuando la jefatura cambia mis turnos, para enterarme sin revisar cada pantalla.
- **Pantallas:** `notifications` y los contadores.
- **Endpoints:** hoy ninguno lo hace.
- **Criterios de aceptación:**
  No disponible en la entrega (C-09): el backend todavía no genera avisos y la bandeja está oculta.
  1. Cuando se crea una solicitud, cuando la responde el receptor y cuando la jefatura la aprueba o la rechaza, el solicitante (y el receptor, si lo hay) recibe una notificación.
  2. Cuando la jefatura asigna, reasigna o quita un turno a mano, la persona afectada recibe una notificación.
- **Trazabilidad:** MF-014; FUN-SGT-034; Archivo §13 («Eventos que las generan…») y §21.
- **Estado:** **No disponible en la entrega** (C-09). Decisión del 19 oct: las notificaciones no se implementan para la entrega. Ningún service de solicitudes ni de ofertas crea notificaciones. `GestionTurnoService` llama a `NotificacionService.crearNotificacionSistema`, que guarda el mensaje sin destinatario ni solicitud (el parámetro del receptor no se usa), y la bandeja solo muestra notificaciones ligadas a una solicitud (`NotificacionRepository.findByFuncionarioId`). Para implementarlas: agregar el destinatario a `Notificacion` y crearlas en `SolicitudService`, `OfertaGeneralService` y `GestionTurnoService` (§6.3).
- **Prueba E2E:** no se puede automatizar hasta implementarla.

### 3.7 Paneles de jefatura y subrogante (HU-PAN)

#### HU-PAN-01 · Centro de Gestión del Servicio (jefatura)

- **Rol:** jefatura, y administrador con rol JEFATURA.
- **Historia:** Como jefatura quiero un panel con los módulos de mi servicio para entrar rápido a cada tarea.
- **Pantallas:** `perfil` → «Panel de Jefatura» → `jefatura` (título «Centro de Gestión del Servicio»). En desktop también se abre desde Mi Perfil, y sus módulos están además en el grupo «Gestión del servicio» del menú.
- **Endpoints:** ninguno.
- **Criterios de aceptación:**
  1. Veo 9 módulos: «Asignación de turnos», «Asignación de Funcionarios», «Personal del Servicio», «Jerarquía de Funcionarios», «Evaluar Solicitudes», «Gestionar Puestos», «Estadísticas del Servicio», «Bitácora de Cambios» y «Auditoría de Asistencia».
  2. No veo «Crear tipo de Turno», «Crear Rotativa», «Crear Planificación Mensual» ni «Reglas de Horario del Servicio».
  3. Cada módulo abre su vista y el volver regresa al panel. El volver del panel regresa a Mi Perfil. Aplica a móvil: en desktop las vistas de gestión no tienen volver; se navega por el menú lateral (`docs/desktop/GUIA-DESKTOP.md`, §Volver).
- **Trazabilidad:** Archivo §6.16; MF-018 (equivalente); BUG-003.
- **Estado:** **Implementada.** Evidencia: `JefaturaDashboardView.jsx` (cada tarjeta depende de su handler). Desde el 17 oct (C-01) se quitaron del código las tarjetas de tipos de turno, rotativas, planificación y reglas, que estaban ocultas porque `Prop4` nunca les pasaba el handler.
- **Prueba E2E:** `jefatura`; no muta; ambos. Ya existe: foto de `jefatura` en `pantallas.spec.js`.

#### HU-PAN-02 · Panel de subrogante

- **Rol:** subrogante.
- **Historia:** Como subrogante quiero un panel con lo que puedo gestionar mientras reemplazo a la jefatura.
- **Pantallas:** `perfil` → «Panel de Subrogante» → `subrogante` (título «Administración»).
- **Endpoints:** ninguno.
- **Criterios de aceptación:**
  1. Veo 6 módulos: «Asignación de turnos», «Evaluar Solicitudes», «Gestionar Puestos», «Estadísticas del Servicio», «Bitácora de Cambios» y «Auditoría de Asistencia».
  2. No veo «Asignación de Funcionarios», «Personal del Servicio» ni «Jerarquía de Funcionarios»; el menú desktop tampoco los tiene.
- **Trazabilidad:** Archivo §4 (perfil Subrogante); MF-023.
- **Estado:** **Implementada.** Evidencia: `SubroganteDashboardView.jsx`; `navegacion.js` (permiso `jefatura` en esos tres ítems). Desde el 17 oct (C-01) se quitaron también sus tarjetas ocultas de tipos de turno, rotativas y planificación.
- **Prueba E2E:** `subrogante`; no muta; ambos.

#### HU-PAN-03 · El médico no ve paneles de gestión

- **Rol:** médico.
- **Historia:** Como responsable del sistema quiero que el médico vea solo sus herramientas para que no entre a funciones de gestión.
- **Pantallas:** `perfil`; menú desktop.
- **Endpoints:** ninguno.
- **Criterios de aceptación:**
  1. Mi Perfil muestra solo «Mi Dashboard».
  2. El menú desktop muestra solo los grupos Turnos y Mi cuenta (5 ítems: «Centro de turnos», «Calendario», «Solicitudes», «Mi dashboard» y «Perfil»; sin «Notificaciones», C-09).
  3. Forzar `jefatura`, `admin` o `puestos` por la restauración de navegación lleva al inicio (HU-AUT-04).
- **Trazabilidad:** ROLE_PERMISSION_TEST_MATRIX; R5, R18.
- **Estado:** **Implementada.** Evidencia: `Perfil.jsx` (`isAdmin`, `isJefatura`, `isSubrogante`); `navegacion.itemsParaUsuario`; `Prop4.vistaPermitida`.
- **Prueba E2E:** `medico`; no muta; ambos.

### 3.8 Asignación de turnos (HU-ASG)

#### HU-ASG-01 · Abrir la asignación de turnos

- **Rol:** jefatura, subrogante, administrador.
- **Historia:** Como jefatura quiero un calendario del mes enfocado en asignar para cubrir los cupos del servicio.
- **Pantallas:** `calendar_view` con retorno `jefatura`, `subrogante` o `admin` (módulo «Asignación de turnos»; menú «Asignación de turnos», `asignacion_turnos`).
- **Endpoints:** `GET /turnos/servicio/{id}/calendario/{año}/{mes}`.
- **Criterios de aceptación:**
  1. El título dice «Asignación de turnos · {Mes} {Año}» y, en desktop, la ayuda dice «Elige un día para ver su equipo, asignar cupos libres o editar asignaciones».
  2. En desktop, el resumen del mes muestra asignados, total y vacantes, sin «mis turnos». El móvil no tiene resumen del mes (`calendarView.jsx:451`).
  3. En móvil, el volver regresa al panel del rol. En desktop no hay volver, se entre desde el menú o desde el panel (`docs/desktop/GUIA-DESKTOP.md`, §Volver).
- **Trazabilidad:** MF-022; FUN-SGT-024.
- **Estado:** **Implementada.** Evidencia: `Prop4` (`modoAsignacionAdmin`, `navegarDesktop('asignacion_turnos')`); `calendarView`. La jefatura también puede asignar desde el calendario normal, porque los permisos salen de su rol.
- **Prueba E2E:** `jefatura`, `subrogante` y `admin`; no muta; ambos. Ya existe: fotos en `interacciones-turnos.spec.js`.

#### HU-ASG-02 · Asignar un funcionario a un cupo libre

- **Rol:** jefatura, subrogante, administrador.
- **Historia:** Como jefatura quiero asignar directamente a alguien del servicio a un cupo libre para cubrirlo sin esperar una solicitud.
- **Pantallas:** «Detalle del turno» → «Asignar funcionario a este cupo» o «Asignar funcionario»; en el Centro, clic en el cupo; en el calendario desktop, el panel del día. Se abre el panel «Asignar turno libre».
- **Endpoints:** `GET /funcionarios/summary?servicioId=`; `POST /turnos/alterar` (acción `ASIGNAR`).
- **Criterios de aceptación:**
  1. La lista trae a todo el personal del servicio, ordenado, con buscador por nombre o RUT («Nombre o RUT...»).
  2. Cuando elijo a alguien y presiono «Asignar turno», veo «Confirmar asignación»: «¿Deseas asignar a {nombre} al turno {tipo · fecha hh:mm–hh:mm}?».
  3. Al confirmar, el cupo queda asignado y la vista se recarga. La bitácora registra la asignación manual con la observación opcional.
  4. Si la persona ya tiene un turno que se cruza, veo «No es posible asignar el turno a {nombre} porque ya tiene otro turno asignado que se superpone ({tipo}, {fecha y horas}).», que nombra el turno que choca: su tipo («Día»), su servicio si es otro («Día de {servicio}») y su fecha y horas legibles, como en R13 (RG-27, A1-07). Es el mismo mensaje de las solicitudes y las ofertas, y responde 409 (no 500). Si no es del servicio, «El funcionario seleccionado no pertenece al servicio del turno.».
  5. Negativo (API): un turno de otro servicio se rechaza con 403 «No tienes acceso a datos de otro servicio», salvo al administrador.
- **Trazabilidad:** FUN-SGT-024; MF-022; R4, R17, R18; RN-SGT-009, RN-SGT-010; TC-024.
- **Estado:** **Implementada.** Evidencia: `AsignarTurnoLibreSheet.jsx` (`handleSubmitAsignacion`, `textosConfirmacion`); `GestionTurnoService.alterarTurno`, `accionAsignar` y `validarConflictoFuncionario`; `TurnoController.alterarTurno`. El cierre del 17 oct (C-04, C-20, §5.1) hizo que la asignación y la reasignación manual apliquen R13 y respondan 409 al cruce de horario y a R13, que la negación por servicio responda 403, y que asignar, reasignar o liberar a mano rechace las solicitudes pendientes sobre ese turno («Rechazo automático: El turno fue asignado manualmente.»). El 22 oct el aviso de cruce pasó a nombrar el turno que choca (A1-07). Observación: el aviso a la persona asignada no llega (HU-NOT-03: notificaciones, C-09).
- **Prueba E2E:** `jefatura`, con los cupos futuros generados de Urgencias, y `subrogante`, con los cupos del seed de Enfermería (turnos 26 y 66, que con las fechas relativas caen la semana siguiente y tres semanas después); muta; ambos. Ya existe: fotos hasta la confirmación en `interacciones-turnos.spec.js`. Automatizada: `e2e/hu-muta/asignacion.spec.js`; el criterio 5, `e2e/hu/permisos.spec.js`.

#### HU-ASG-03 · Reasignar o liberar un turno asignado

- **Rol:** jefatura, subrogante, administrador.
- **Historia:** Como jefatura quiero cambiar a la persona de un turno, o dejarlo vacante, para resolver ausencias.
- **Pantallas:** «Detalle del turno» → persona con «Editar» (en el Centro, clic en la persona) → «Editar asignación de turno».
- **Endpoints:** `POST /turnos/alterar` (acciones `REASIGNAR` y `DESASIGNAR`).
- **Criterios de aceptación:**
  1. El panel muestra a la persona actual, y la lista no la incluye.
  2. «Reasignar turno» pide «Confirmar reasignación»: «¿Deseas reemplazar a {actual} por {nuevo} en el turno {…}?».
  3. «Quitar funcionario y dejar vacante» pide «Confirmar liberación»: «… El turno quedará como cupo libre.», con el botón «Quitar funcionario».
  4. Tras confirmar, la vista se recarga y la bitácora registra la reasignación o la liberación.
- **Trazabilidad:** FUN-SGT-024; MF-022; R17.
- **Estado:** **Implementada.** Evidencia: `AsignarTurnoLibreSheet` (`handleSubmitDesasignar`, `abrirConfirmacionDesasignar`); `GestionTurnoService.accionReasignar` y `accionDesasignar`.
- **Prueba E2E:** `jefatura`; muta; ambos. Automatizada: `e2e/hu-muta/asignacion.spec.js`.

#### HU-ASG-04 · Cambiar el horario de un turno

- **Rol:** jefatura, subrogante, administrador.
- **Historia:** Como jefatura quiero cambiar la hora de inicio o de término de un turno puntual para reflejar un ajuste del día.
- **Pantallas:** ninguna.
- **Endpoints:** `POST /turnos/alterar` (acción `CAMBIAR_HORAS`).
- **Criterios de aceptación:**
  1. Desde el detalle del turno puedo cambiar las horas y ver el turno actualizado.
- **Trazabilidad:** FUN-SGT-024; Archivo §6.10.
- **Estado:** **No implementada** en la interfaz. El backend existe (`GestionTurnoService.accionCambiarHoras`).
- **Prueba E2E:** solo por API, con `jefatura`; muta.

#### HU-ASG-05 · El médico no asigna turnos

- **Rol:** médico.
- **Historia:** Como responsable del servicio quiero que solo la gestión asigne turnos para que los cambios pasen por una autorización.
- **Pantallas:** detalle del turno, Centro, calendario.
- **Endpoints:** `POST /turnos/alterar`, `POST /turnos`, `PUT /turnos/{id}`, `DELETE /turnos/{id}`.
- **Criterios de aceptación:**
  1. El médico ve «Cupo libre — tocar para solicitar» y nunca «Asignar funcionario» ni «Editar».
  2. Negativo (API): esas cuatro rutas con su token responden 403 «No tienes permiso para realizar esta acción» y no cierran la sesión.
- **Trazabilidad:** TC-023; ROLE_PERMISSION_TEST_MATRIX; BUG-001.
- **Estado:** **Implementada.** Evidencia: `ShiftDetail` (`canManageAssignments`); `SecurityConfig` (`SERVICE_ADMIN_PATHS`); `TurnoController.alterarTurno` (`@PreAuthorize`). La negación ocurre en el filtro de seguridad y, desde el 17 oct (C-20), responde 403 sin cerrar la sesión (HU-AUT-07).
- **Prueba E2E:** `medico`; no muta; ambos.

### 3.9 Personal del servicio (HU-PER)

#### HU-PER-01 · Ver el personal de mi servicio

- **Rol:** jefatura, y administrador con rol JEFATURA.
- **Historia:** Como jefatura quiero ver quién pertenece a mi servicio y con qué rol para gestionar al equipo.
- **Pantallas:** `funcionarios_servicio_jefatura` (módulo «Personal del Servicio»; menú «Personal del servicio», `personal_servicio`).
- **Endpoints:** `GET /funcionarios/summary?servicioId=`.
- **Criterios de aceptación:**
  1. Veo a cada persona con su nombre, RUT, profesión y rol en el servicio (tabla en desktop, tarjetas en móvil).
  2. Busco por nombre o RUT; en desktop también filtro por rol.
  3. La vista es solo de lectura.
  4. Negativo (API): pedir otro servicio responde 403, salvo al administrador.
- **Trazabilidad:** FUN-SGT-006; MF-021 (equivalente de servicio); R16 (arreglo del RUT numérico), R18.
- **Estado:** **Implementada.** Evidencia: `FuncionariosServicioJetaturaView.jsx`; `PersonalServicioDesktop.jsx`; `FuncionarioController.getAllSummary`. Desde el 17 oct (P-01) el color del rol reconoce `JEFATURA` (`utils/rolesServicio.js`), y la pantalla suma «Exportar nómina CSV» (C-21, HU-CAL-09).
- **Prueba E2E:** `jefatura`; no muta; ambos. Ya existe: `interacciones-gestion.spec.js`.

#### HU-PER-02 · Sumar un funcionario del hospital a mi servicio (jefatura)

- **Rol:** jefatura.
- **Historia:** Como jefatura quiero sumar a mi servicio a una persona del padrón del hospital para que pueda entrar al SGT y recibir turnos.
- **Pantallas:** `asignacionJefatura` (módulo «Asignación de Funcionarios»; menú «Asignación de funcionarios», `asignacion_funcionarios`).
- **Endpoints:** `GET /Personal/summary`; `GET /funcionarios/status/{rut}`; `POST /funcionarios/register/{rut}` (si no está en el SGT); `PUT /funcionarios/{id}` con `{servicioId, rol: 3}`.
- **Criterios de aceptación:**
  1. El buscador muestra resultados desde 2 caracteres, por nombre o RUT, con el RUT enmascarado, y nunca me incluye a mí.
  2. Al elegir y guardar veo «¿Deseas asignar a {nombre} al servicio {servicio}?» y, al confirmar, «Asignación guardada con éxito.».
  3. La persona queda como MEDICO, aparece en Personal del servicio y ya puede entrar con su clave del hospital.
  4. Si la persona ya pertenece al servicio con otro rol, no se le cambia el rol sin aviso.
  5. Si falla, veo «No se pudo completar la asignación. Intenta de nuevo.».
- **Trazabilidad:** FUN-SGT-005, FUN-SGT-009; MF-020; Archivo §6.3; R18; TC-041; RN-SGT-008.
- **Estado:** **Implementada** (C-23 y C-19, 17 oct). La jefatura suma a su servicio, como Médico, a quien no está en él: `PUT /funcionarios/{id}` con `{servicioId, rol: 3}` (sin otros campos) la acepta para el servicio de su sesión y no toca las demás relaciones de la persona. Si la persona ya pertenece al servicio, responde 409 «La persona ya pertenece a este servicio; no se cambió su rol», también para el administrador, y la pantalla muestra ese mensaje (criterio 4). Evidencia: `FuncionarioController.update` (`esSumarAlServicioComoMedico`); `funcionarioService.asignarServicio`; `AsignacionJefaturaView`. Para devolver a Médico a un subrogante hay una acción aparte: HU-JER-03.
- **Prueba E2E:** `jefatura` (305, que no es administradora); datos: 12345677-0 (en el padrón, sin registro); muta (crea el funcionario; con el arreglo, también la relación); ambos. Ya existe: `interacciones-gestion.spec.js` (hasta la confirmación cancelada).

### 3.10 Jerarquía (HU-JER)

#### HU-JER-01 · Designar un subrogante en mi servicio

- **Rol:** jefatura.
- **Historia:** Como jefatura quiero designar a un subrogante de mi servicio para que me reemplace cuando no estoy.
- **Pantallas:** `jerarquiaJefatura` (módulo «Jerarquía de Funcionarios»; menú «Jerarquía del servicio», `jerarquia_servicio`).
- **Endpoints:** `GET /funcionarios/summary?servicioId=`; `PUT /funcionarios/{id}` con `{servicioId, rol}`.
- **Criterios de aceptación:**
  1. Busco a una persona de mi servicio (2 caracteres o más) y elijo el nivel «Subrogante».
  2. «Confirmar jerarquía» dice «¿Deseas designar a {nombre} como Subrogante de {servicio}?»; al confirmar veo «Jerarquía designada con éxito.».
  3. La sección «Jerarquía actual del servicio» muestra a la jefatura y a los subrogantes, y se actualiza después de designar.
  4. La jefatura no puede designar a otra jefatura.
- **Trazabilidad:** FUN-SGT-008; MF-023; R18; TC-040; RN-SGT-008.
- **Estado:** **Implementada.** Desde el 17 oct (C-07, P-01) el nivel parte en «Subrogante» y la jefatura designa solo subrogantes (el backend responde 403 «Solo un administrador puede designar una jefatura»); la jerarquía actual reconoce `JEFATURA` y vuelve a pedir el personal después de designar, así que muestra lo designado. Evidencia: `JerarquiaJefaturaView.jsx`; `utils/rolesServicio.js`; `FuncionarioController.update`.
- **Prueba E2E:** `jefatura`; muta (cambia el rol de una persona de Urgencias); ambos. Ya existe: `interacciones-gestion.spec.js` (hasta la confirmación cancelada).

#### HU-JER-02 · El subrogante no designa jerarquía

- **Rol:** subrogante.
- **Historia:** Como jefatura quiero que el subrogante no pueda nombrar jefaturas ni subrogantes para que la jerarquía la defina quien corresponde.
- **Pantallas:** panel de subrogante y menú desktop, sin jerarquía; `jerarquiaJefatura` forzada.
- **Endpoints:** `PUT /funcionarios/{id}` con `{servicioId, rol}`.
- **Criterios de aceptación:**
  1. El subrogante no ve el módulo ni el ítem de jerarquía, y forzar `jerarquiaJefatura` por la restauración lo lleva al inicio.
  2. Negativo (API): con el token del subrogante, `PUT /funcionarios/{id}` con `{servicioId: 2, rol: 2}` sobre una persona de Enfermería responde 403 «El subrogante no puede designar jerarquía ni sumar funcionarios al servicio»; no cambia nada.
- **Trazabilidad:** MF-023 («un subrogante no puede designar nuevos subrogantes»); IF-013; TC-039; RN-SGT-008.
- **Estado:** **Implementada.** El 17 oct (C-03, C-07) el backend dejó de equiparar al subrogante con la jefatura en `FuncionarioController.update`: el subrogante no cambia el rol ni la relación con un servicio de nadie, tampoco la propia, ni el nombre, los apellidos o el estado de otra persona (403 «El subrogante no puede designar jerarquía ni sumar funcionarios al servicio» o «El subrogante no puede cambiar los datos ni el estado de otro funcionario»); sus propios datos sí. Sigue decidiendo solicitudes y ofertas, asignando turnos y gestionando puestos.
- **Prueba E2E:** `subrogante`. El criterio 1 en ambos; el 2 por API (`e2e/hu/permisos.spec.js`), y ya no muta: el backend lo niega antes de cambiar nada.

#### HU-JER-03 · Quitar la subrogancia

- **Rol:** jefatura (de su servicio) y administrador (de cualquier servicio).
- **Historia:** Como jefatura quiero devolver a médico a un subrogante de mi servicio para que deje de reemplazarme cuando ya no corresponde.
- **Pantallas:** `jerarquiaJefatura` (módulo «Jerarquía de Funcionarios»; menú «Jerarquía del servicio», `jerarquia_servicio`) para la jefatura; `jerarquia` (menú «Jerarquía de funcionarios», `jerarquia_sistema`) para el administrador, sobre el servicio que elige. Las dos usan `ComunAdministracion/JerarquiaActual.jsx`.
- **Endpoints:** `GET /funcionarios/summary?servicioId=`; `PUT /funcionarios/{id}/quitar-subrogancia?servicioId=`.
- **Criterios de aceptación:**
  1. Dado un servicio con subrogantes, la «Jerarquía actual del servicio» muestra uno por fila, cada uno con el botón «Quitar subrogancia», en móvil y desktop. La jefatura lo ve en su servicio; el administrador, en el servicio que elige.
  2. Al presionarlo veo «¿Quitar la subrogancia?»: «{nombre} vuelve a ser médico del servicio {servicio}.», con los botones «Quitar subrogancia» y «Volver».
  3. Al confirmar veo «{nombre} ya no es subrogante: vuelve a ser médico del servicio.»; la persona queda con rol MEDICO en ese servicio, sus relaciones con otros servicios no cambian y la jerarquía se actualiza sin refrescar. La bitácora del servicio registra el evento `SUBROGANCIA_QUITADA` («{nombre} deja de ser subrogante de {servicio} y queda como Médico»).
  4. Si falla (por ejemplo, la persona ya no es subrogante), veo el mensaje del backend, y la lista se vuelve a pedir igual.
  5. Negativo: el subrogante y el médico no ven el botón (el subrogante no tiene Jerarquía), y por API `PUT /funcionarios/{id}/quitar-subrogancia?servicioId=` les responde 403. Una jefatura que lo pide para otro servicio recibe 403 «No tienes acceso a datos de otro servicio».
  6. Negativo (API): si la persona no es subrogante de ese servicio, 409 «Esa persona no es subrogante de este servicio»; si no existe, 404 «El funcionario no existe»; sin `servicioId`, 400 «Indica el servicio (servicioId)».
- **Trazabilidad:** §5, C-19 y C-23 (decisión del 17 oct, después de la página: sumar al servicio ya no cambia el rol, así que devolver a médico a un subrogante es una acción aparte); MF-023; R18.
- **Estado:** **Implementada** (17 oct). Evidencia: `JerarquiaActual.jsx` (`JerarquiaActual`, `ConfirmarQuitarSubrogancia`); `JerarquiaJefaturaView.jsx` y `JerarquiaView.jsx` (`confirmarQuitarSubrogancia`); `funcionarioService.quitarSubrogancia`; `FuncionarioController.quitarSubrogancia` (`@PreAuthorize("hasAnyRole('JEFATURA','ADMINISTRADOR')")`) y `FuncionarioService.quitarSubrogancia`. No usa `PUT /funcionarios/{id}` con rol 3, que responde 409 a quien ya pertenece al servicio (C-19).
- **Prueba E2E:** `jefatura` y `admin`; muta (cambia el rol de una persona: restaurar); ambos. Sin automatizar (fase 5, §6.2). El backend lo cubren pruebas JUnit (`FuncionarioControllerTest`, `FuncionarioServiceTest`, `BitacoraAlcanceServicioTest`).

### 3.11 Puestos (HU-PUE)

#### HU-PUE-01 · Gestionar los puestos del servicio

- **Rol:** jefatura, subrogante, administrador.
- **Historia:** Como jefatura quiero crear, renombrar y dar de baja los puestos de mi servicio para que los turnos y la planificación usen las posiciones reales.
- **Pantallas:** `puestos` (módulo «Gestionar Puestos»; menú «Puestos»).
- **Endpoints:** `GET /puestos/servicio/{id}`; `POST /puestos`; `PUT /puestos/{id}?nombre=`; `GET /puestos/{id}/turnos-asociados`; `DELETE /puestos/{id}`.
- **Criterios de aceptación:**
  1. Veo los puestos vigentes del servicio activo, paginados.
  2. Crear pide «¿Agregar nuevo puesto?». Un nombre vacío no se guarda («El nombre del puesto no puede estar vacío»).
  3. El nombre se edita en línea (en desktop, Enter guarda y Escape cancela).
  4. Eliminar pide «¿Eliminar puesto?» e informa cuántos turnos lo usan. El puesto deja de aparecer, los turnos pasados lo conservan y sale de los moldes de planificación.
  5. Negativo: el médico no tiene acceso, y por API sus escrituras responden 403.
- **Trazabilidad:** FUN-SGT-012; MF-028; RN-SGT-023.
- **Estado:** **Implementada.** Evidencia: `PuestosView.jsx`; `PuestoService` (`crearPuesto`, `actualizarPuesto`, `eliminarPuesto`). Desde el 17 oct (C-17) el backend exige el servicio de la sesión también en las escrituras de puestos.
- **Prueba E2E:** `jefatura` y `subrogante`; muta; ambos. Ya existe: `interacciones-gestion.spec.js` (cancelados).

### 3.12 Estadísticas (HU-EST)

#### HU-EST-01 · Ver estadísticas de cobertura del servicio

- **Rol:** jefatura, subrogante, administrador.
- **Historia:** Como jefatura quiero ver la cobertura del mes o de una semana, y qué puestos y días quedan vacantes, para decidir dónde reforzar.
- **Pantallas:** `admin_stats` (módulo «Estadísticas del Servicio»; menú «Estadísticas»).
- **Endpoints:** `GET /turnos/servicio/{id}/stats`, `/sin-asignar/periodo`, `/funcionarios-stats`, `/funcionarios-detalle` y `/todos-detalle`.
- **Criterios de aceptación:**
  1. Puedo moverme entre meses y elegir una semana (S1 a S5) o el mes completo.
  2. Veo el porcentaje de cobertura, los turnos asignados y vacantes, y los funcionarios con turno sobre el total del servicio. En desktop, además, el puesto con más vacantes.
  3. El detalle de cobertura se filtra por tipo de turno, puesto, fecha y rotativa. El detalle de funcionarios muestra cuántos turnos tiene cada uno.
  4. Los números coinciden con lo que muestra el calendario en el mismo período.
- **Trazabilidad:** FUN-SGT-025; MF-030; BUG-004.
- **Estado:** **Implementada.** Evidencia: `AdminStats.jsx`; `EstadisticasDesktop.jsx`; `TurnoService.getTurnosStatsByServicio` y `getCoberturaRealByServicio`. Desde el 17 oct (C-17) estos GET exigen el servicio de la sesión (BUG-004). La vista «por puesto», que nunca se dibujaba, se retiró.
- **Prueba E2E:** `jefatura`; no muta; ambos. Ya existe: `interacciones-gestion.spec.js`.

### 3.13 Bitácora (HU-BIT)

#### HU-BIT-01 · Consultar la bitácora de cambios

- **Rol:** jefatura, subrogante, administrador.
- **Historia:** Como jefatura quiero revisar quién cambió qué y cuándo para auditar las decisiones del servicio.
- **Pantallas:** `bitacora` (módulo «Bitácora de Cambios»; menú «Bitácora»; también «Ver historial» del detalle del turno).
- **Endpoints:** `GET /bitacoras/dto`.
- **Criterios de aceptación:**
  1. Puedo elegir mes y semana, y los eventos se ordenan del más reciente al más antiguo.
  2. Filtro por categoría (Solicitudes o Turnos), tipo de solicitud, estado y encargado. En desktop la tabla pagina de a 50 y el detalle se abre en un panel lateral.
  3. La jefatura y el subrogante ven solo los eventos de su servicio: el backend filtra la bitácora por el servicio de la sesión (C-17).
  4. Las cancelaciones se listan como «{tipo de solicitud} · CANCELADA» y, al abrir el evento, el motivo dice «Cancelada por el solicitante». El filtro por estado suma «Cancelada», y «Rechazada» ya no las incluye.
- **Trazabilidad:** FUN-SGT-035; MF-031; R15, R18; TC-036, TC-037; BUG-007.
- **Estado:** **Implementada.** El cierre del 17 oct corrigió lo que la dejaba parcial: la vista ordena por fecha, del más reciente al más antiguo (criterio 1); el backend filtra la bitácora por el servicio de la sesión (criterio 3, C-17, BUG-007); y una cancelación se rotula CANCELADA, con su propio filtro (criterio 4). Los eventos de creación de un turno muestran quién lo tenía al crearse («Asignado al crearse»: el nombre, «Libre» si nació vacante o «Sin registro» si el evento no lo guardó), no quién lo ocupa hoy (O-1, 22 oct). Evidencia: `BitacoraView.jsx`; `BitacoraController`; `BitacoraService.convertToDTO`. Observación: el backend no pagina.
- **Prueba E2E:** `jefatura`; no muta; ambos. Ya existe: `interacciones-gestion.spec.js`.

### 3.14 Auditoría (HU-AUD)

#### HU-AUD-01 · Revisar la auditoría de asistencia

- **Rol:** jefatura, subrogante, administrador.
- **Historia:** Como jefatura quiero ver qué turnos pasados quedaron cubiertos o vacantes para controlar la asistencia del servicio.
- **Pantallas:** `auditoria` (módulo «Auditoría de Asistencia»; menú «Auditoría de asistencia»).
- **Endpoints:** `GET /turnos/servicio/{id}`.
- **Criterios de aceptación:**
  1. Puedo elegir el mes actual o uno de los dos anteriores.
  2. Solo aparecen los turnos del mes que ya terminaron (por su fecha y hora de término, en hora de Chile), del más reciente al más antiguo, con el funcionario o «Vacante». Un turno en curso, o que todavía no empieza, no aparece: la Noche de hoy no cuenta hasta que termina.
  3. Veo los totales de asignados, vacantes y total; en desktop, filtro por estado.
  4. Retirado (C-14, decidida el 17 oct): la auditoría no muestra al encargado de cada asignación y se corrige el manual (MF-032), no la pantalla. Quién hizo la asignación está en la bitácora.
- **Trazabilidad:** MF-032; Archivo §6.14; BUG-004.
- **Estado:** **Implementada.** El criterio 2 se corrigió el 22 oct (O-2): `turnosDelMes` comparaba solo la fecha de inicio con el momento actual y contaba los turnos de hoy aunque todavía no empezaran; ahora usa `yaTermino` (`utils/reglasTurno.js`), con fecha y hora de Chile. La regla escrita no distinguía entre «ya empezó» y «ya terminó» (el catálogo decía «ya empezaron»); se tomó «ya terminó», que es el sentido de «pasado» en R17. El criterio 4 se retiró por C-14: la pantalla no muestra al encargado y el manual se corrige (fe de erratas en `docs/TRASPASO.md`); la prueba E2E de ese criterio conserva su marca `fallaConocida` (`gestion.spec.js`).
- **Prueba E2E:** `jefatura`; no muta; ambos. Ya existe: `interacciones-gestion.spec.js`.

### 3.15 Reglas del servicio (HU-REG)

#### HU-REG-01 · Configurar reglas de horario (administrador)

- **Rol:** administrador.
- **Historia:** Como administrador quiero definir ajustes automáticos de horario para fines de semana y feriados para que la planificación genere los horarios correctos.
- **Pantallas:** `reglas` (Panel de Administración → «Reglas de Horario del Servicio»; menú «Reglas de horario», `reglas`).
- **Endpoints:** `GET /reglas-servicio/servicio/{id}`; `POST /reglas-servicio`; `PUT /reglas-servicio/{id}`; `DELETE /reglas-servicio/{id}`.
- **Criterios de aceptación:**
  1. Cada regla muestra su condición, el ajuste y el horario antes y después.
  2. El formulario exige nombre, al menos una condición (fin de semana o feriado), al menos un tipo de turno (de inicio o de término) y un ajuste entero entre −5 y 5 horas («El ajuste debe ser un número entero de horas, entre -5 y 5.»), y muestra la vista previa.
  3. Eliminar pide confirmación («Eliminar regla»).
  4. Las reglas elegidas se aplican al generar turnos (HU-ADM-10).
- **Trazabilidad:** FUN-SGT-017; MF-029; RN-SGT-016.
- **Estado:** **Implementada.** Evidencia: `ReglasServicioView.jsx` (`puedeGuardar`, `guardar`, `eliminar`); `ReglaServicioService`. Observación: la condición y el rango de ±5 horas solo se validan en la interfaz.
- **Prueba E2E:** `admin`; muta; ambos. Ya existe: `interacciones-admin-mantenedores.spec.js` (cancelados).

#### HU-REG-02 · Reglas de horario solo del administrador

- **Rol:** jefatura, subrogante (negativo).
- **Historia:** Como responsable del sistema quiero que las reglas de horario las configure solo el administrador para que la jefatura y el subrogante no las cambien.
- **Pantallas:** `reglas`, solo en el Panel de Administración y en el menú del administrador (HU-REG-01); si la jefatura o el subrogante fuerzan la vista con la restauración de navegación, cae al inicio.
- **Endpoints:** los de HU-REG-01. `POST`, `PUT` y `DELETE /reglas-servicio/**` exigen ADMINISTRADOR (la lectura queda acotada al servicio de la sesión).
- **Criterios de aceptación:**
  1. La jefatura y el subrogante no tienen «Reglas de Horario del Servicio» (ni en su panel ni en el menú); forzar la vista `reglas` los lleva al inicio, y por API crear, editar y eliminar reglas responde 403 (C-10).
- **Trazabilidad:** MF-029 («Admin/Jefatura/Subrogante», que el sistema ya no sigue); Archivo §6.7; R18; §5, C-10.
- **Estado:** **Implementada** (C-10, 17 oct). `/api/v2/reglas-servicio/**` pasó de `SERVICE_ADMIN_PATHS` a `GLOBAL_ADMIN_PATHS`, y `Prop4` dejó `reglas` entre las vistas del administrador. Ningún panel ni menú de jefatura o subrogante llevaba a las reglas. Fe de erratas del manual: `docs/TRASPASO.md`.
- **Prueba E2E:** `jefatura` y `subrogante`; no muta; ambos. Automatizada: `e2e/hu/gestion.spec.js` (la vista) y `e2e/hu/permisos.spec.js` (las escrituras por API).

### 3.16 Administración (HU-ADM)

#### HU-ADM-01 · Abrir el Panel de Administración

- **Rol:** administrador.
- **Historia:** Como administrador quiero un panel con todos los módulos de configuración para ordenar mi trabajo.
- **Pantallas:** `perfil` → «Panel de Administración» → `admin`. En desktop, sus módulos también están en el grupo «Administración» del menú.
- **Endpoints:** ninguno.
- **Criterios de aceptación:**
  1. Veo 14 módulos en cuatro grupos. Gestión Organizacional: Crear Servicio, Asignación de Funcionarios, Personal del Sistema, Jerarquía de Funcionarios y Gestionar Puestos. Gestión de Turnos: Asignación de turnos, Crear tipo de Turno, Crear Rotativa, Crear Planificación Mensual y Reglas de Horario del Servicio. Gestión Operacional: Evaluar Solicitudes y Estadísticas del Servicio. Control y Auditoría: Bitácora de Cambios y Auditoría de Asistencia.
  2. El panel solo aparece con rol de sistema ADMINISTRADOR.
- **Trazabilidad:** MF-018; Archivo §6.16; R18.
- **Estado:** **Implementada.** Evidencia: `AdminDashboard.jsx`; `Perfil.jsx` (`isAdmin = rolSistema === 'ADMINISTRADOR'`). Desde el 17 oct (C-18) el administrador se reconoce solo por `ADMINISTRADOR` en toda la interfaz (`esAdministrador`, `utils/roles.js`), como en el backend.
- **Prueba E2E:** `admin`; no muta; ambos.

#### HU-ADM-02 · Crear, editar y desactivar servicios

- **Rol:** administrador.
- **Historia:** Como administrador quiero mantener el catálogo de servicios del hospital para que cada unidad tenga sus turnos.
- **Pantallas:** `servicios` (módulo «Crear Servicio»; menú «Servicios»).
- **Endpoints:** `GET /servicios`, `GET /servicios/inactivos`; `POST /servicios`; `PUT /servicios/{id}`; `GET /servicios/{id}/dependencias`; `DELETE /servicios/{id}`.
- **Criterios de aceptación:**
  1. Veo los servicios activos y los inactivos (en desktop, con el filtro Todos, Activos e Inactivos cuando hay inactivos).
  2. Crear pide «¿Agregar nuevo servicio?». El nombre se edita en línea.
  3. Desactivar pide «¿Desactivar servicio?», con el número de registros asociados, y aclara que el historial se conserva. El servicio pasa a inactivos y deja de aparecer en la elección de servicio.
  4. Negativo: con otro rol, `POST /servicios` responde 403 (TC-011).
- **Trazabilidad:** FUN-SGT-010, FUN-SGT-011; MF-019; TC-009 a TC-012; RN-SGT-006, RN-SGT-023.
- **Estado:** **Implementada.** Evidencia: `ServiciosView.jsx` (`ejecutarCrear`, `guardarEdicion`, `abrirConfirmEliminar`, `handleEliminar`); `ServicioService`. Observaciones: no se puede reactivar un servicio ni se valida un nombre repetido (TC-010).
- **Prueba E2E:** `admin`; muta (crear y desactivar un servicio de prueba); ambos. Ya existe: `interacciones-admin-mantenedores.spec.js` (cancelados).

#### HU-ADM-03 · Ver el personal del sistema

- **Rol:** administrador.
- **Historia:** Como administrador quiero ver a todo el personal registrado, con sus servicios y roles, para revisar quién tiene acceso.
- **Pantallas:** `funcionarios_sistema` (módulo «Personal del Sistema»; menú «Personal del sistema»).
- **Endpoints:** `GET /funcionarios/summary` (sin filtro trae a todos; solo el administrador puede omitirlo); `GET /servicios`.
- **Criterios de aceptación:**
  1. Filtro por servicio y busco por nombre o RUT.
  2. La lista pagina de a 10 en móvil y de a 50 en desktop.
  3. Cada persona muestra sus servicios y su rol en cada uno. La vista es solo de lectura.
- **Trazabilidad:** FUN-SGT-006; MF-021.
- **Estado:** **Implementada.** Evidencia: `FuncionariosSistemaView.jsx`; `FuncionarioController.getAllSummary`.
- **Prueba E2E:** `admin`; no muta; ambos. Ya existe: `interacciones-admin-mantenedores.spec.js`.

#### HU-ADM-04 · Asignar un funcionario a cualquier servicio

- **Rol:** administrador.
- **Historia:** Como administrador quiero asociar a una persona del padrón del hospital a cualquier servicio para habilitar su ingreso.
- **Pantallas:** `asignacion` (módulo «Asignación de Funcionarios»; menú «Asignación a servicios»).
- **Endpoints:** `GET /servicios`; `GET /Personal/summary`; `GET /funcionarios/status/{rut}`; `POST /funcionarios/register/{rut}`; `PUT /funcionarios/{id}`.
- **Criterios de aceptación:** los de HU-PER-02, eligiendo además el servicio de destino. El mensaje de éxito es «{nombre} fue asignado correctamente.» y el administrador no se encuentra a sí mismo en el buscador (MF-020).
- **Trazabilidad:** FUN-SGT-009; MF-020; R18; TC-041.
- **Estado:** **Implementada.** Desde el 17 oct (C-19 y C-23), sumar como Médico a quien ya pertenecía al servicio responde 409 «La persona ya pertenece a este servicio; no se cambió su rol», y la pantalla lo muestra; ya no baja el rol a MEDICO sin aviso. Evidencia: `AsignacionView.jsx`; `funcionarioService.asignarServicio`; `FuncionarioController.update`.
- **Prueba E2E:** `admin`; datos: 12345677-0; muta; ambos. Ya existe: `interacciones-admin-mantenedores.spec.js` (cancelado).

#### HU-ADM-05 · Designar jefatura o subrogante en cualquier servicio

- **Rol:** administrador.
- **Historia:** Como administrador quiero nombrar la jefatura y los subrogantes de cada servicio para definir quién gestiona.
- **Pantallas:** `jerarquia` (módulo «Jerarquía de Funcionarios»; menú «Jerarquía de funcionarios»).
- **Endpoints:** `GET /servicios`; `GET /funcionarios/summary`; `PUT /funcionarios/{id}` con `{servicioId, rol}`.
- **Criterios de aceptación:**
  1. Elijo el servicio, la persona (buscador desde 2 caracteres, con RUT enmascarado) y el nivel, «Jefatura» o «Subrogante».
  2. «Confirmar jerarquía» dice «¿Deseas designar a {nombre} como {nivel} del servicio {servicio}?»; al confirmar veo «Jerarquía designada con éxito.».
  3. En desktop, la «Jerarquía actual» del servicio elegido muestra el cambio.
- **Trazabilidad:** FUN-SGT-008; MF-023; R18.
- **Estado:** **Implementada.** Desde el 17 oct (P-01) la vista vuelve a pedir el personal después de designar, así que la jerarquía actual muestra lo designado (criterio 3). Observación: puede quedar más de una jefatura por servicio sin aviso; cuántas admite un servicio lo decide TIC (C-07). Evidencia: `JerarquiaView.jsx` (`handleConfirmar`; en la rama desktop, `jefaturas` y `subrogantes`); `utils/rolesServicio.js`.
- **Prueba E2E:** `admin`; muta; ambos. Ya existe: `interacciones-admin-mantenedores.spec.js` (una prueba cancelada y una simulada después de designar).

#### HU-ADM-06 · Gestionar tipos de turno

- **Rol:** administrador.
- **Historia:** Como administrador quiero definir los tipos de turno de cada servicio, con nombre y horario, para usarlos en rotativas y reglas.
- **Pantallas:** `tipos_turno` (módulo «Crear tipo de Turno»; menú «Tipos de turno»).
- **Endpoints:** `GET /tipos-turno/servicio/{id}`; `POST /tipos-turno`; `PUT /tipos-turno/{id}`; `GET /tipos-turno/{id}/rotativas-afectadas`; `DELETE /tipos-turno/{id}`.
- **Criterios de aceptación:**
  1. La tabla muestra el nombre, el horario, la duración y si cruza la medianoche.
  2. «Nuevo» y «Editar» abren el mismo formulario. Si el inicio es igual al término veo «La hora de inicio y término no pueden ser iguales»; si el nombre se repite en el servicio, «Ya existe un tipo de turno con el nombre '{nombre}' en este servicio». El error se ve dentro del panel y la pantalla sigue usable.
  3. Eliminar pide confirmación y lista las rotativas que lo usan; sus días en esas rotativas quedan libres.
  4. Negativo: la jefatura y el subrogante no tienen el módulo, y el backend les niega las escrituras con 403 (BUG-003, C-01).
  5. Crear un tipo con el nombre de uno eliminado del mismo servicio reactiva ese registro con el nombre y el horario pedidos (responde 200 con el mismo id); renombrar otro tipo a ese nombre responde 409 «El nombre '…' es de un tipo de turno eliminado de este servicio. Para recuperarlo, crea un tipo de turno con ese nombre; si no, elige otro nombre.».
- **Trazabilidad:** FUN-SGT-013; MF-024; RN-SGT-015; TC-015; BUG-003.
- **Estado:** **Implementada.** Evidencia: `TiposTurnoView.jsx`; `TipoTurnoService`. El cierre del 17 oct corrigió lo que la dejaba parcial: un error del backend se muestra con su mensaje dentro del panel (`mensajeDeError`, `utils/errores.js`), en móvil y desktop, y crear un tipo con el nombre de uno eliminado lo reactiva en vez de responder 500 (§5.1; la clave única de la base incluye los eliminados porque el borrado es lógico).
- **Prueba E2E:** `admin`; muta; ambos. Los casos de error no se pueden probar hasta arreglar el manejo del mensaje. Ya existe: `interacciones-admin-mantenedores.spec.js` (cancelados, y un guardado sin conexión simulado).

#### HU-ADM-07 · Gestionar rotativas

- **Rol:** administrador.
- **Historia:** Como administrador quiero diseñar rotativas de N semanas con el turno de cada día para reutilizarlas en la planificación.
- **Pantallas:** `plantillas` (módulo «Crear Rotativa»; menú «Rotativas»); editor de rotativa (sub-pantalla).
- **Endpoints:** `GET /rotativas/servicio/{id}`; `POST /rotativas`; `PUT /rotativas/{id}`; `PUT /rotativas/{id}/secuencia`; `GET /rotativas/{id}/secuencia`; `DELETE /rotativas/{id}`.
- **Criterios de aceptación:**
  1. La lista muestra las horas por semana y por ciclo, con un aviso si superan las 44 horas semanales (no bloquea).
  2. El editor pide nombre y semanas («El nombre es obligatorio.», «Las semanas deben ser ≥ 1.»). El pincel rápido pinta días, y un día puede tener varios tipos de turno si no se solapan («Ajusta los horarios para que no se solapen.»).
  3. Guardar crea o actualiza la rotativa y su secuencia. Un nombre repetido muestra el mensaje del backend sin romper la pantalla.
  4. Cambiar el número de semanas no borra la secuencia ya pintada.
  5. Eliminar pide confirmación.
- **Trazabilidad:** FUN-SGT-014; MF-025; RN-SGT-014; TC-014, TC-019; BUG-003.
- **Estado:** **Implementada.** El cierre del 17 oct corrigió los dos criterios que fallaban (P-01): un error del backend se muestra con su mensaje dentro del panel (`mensajeDeError`), y borrar el campo «Semanas» para escribir otro número ya no recorta la secuencia: la matriz conserva los días pintados y se recorta a semanas × 7 solo al guardar. C-13: el aviso de más de 44 horas semanales avisa y no bloquea. Evidencia: `PlantillasView.jsx`; `RotativaService`.
- **Prueba E2E:** `admin`; muta; ambos. Ya existe: `interacciones-planificacion.spec.js` (cancelados).

#### HU-ADM-08 · Duplicar una rotativa

- **Rol:** administrador.
- **Historia:** Como administrador quiero duplicar una rotativa para crear una variante sin pintarla de nuevo.
- **Pantallas:** ninguna.
- **Endpoints:** `POST /rotativas/{id}/duplicar`.
- **Criterios de aceptación:**
  1. Desde la lista de rotativas, «Duplicar» crea una copia con otro nombre.
- **Trazabilidad:** FUN-SGT-015; IF-017.
- **Estado:** **No implementada** en la interfaz; el endpoint existe.
- **Prueba E2E:** solo por API; muta.

#### HU-ADM-09 · Armar y guardar el molde de planificación

- **Rol:** administrador.
- **Historia:** Como administrador quiero armar un molde con rotativas, puestos y funcionarios para generar los turnos del servicio.
- **Pantallas:** `planificacion` (módulo «Crear Planificación Mensual»; menú «Planificación»).
- **Endpoints:** `GET /rotativas/servicio/{id}`, `GET /tipos-turno/servicio/{id}`, `GET /puestos/servicio/{id}` y `GET /funcionarios/summary?servicioId=`; `GET /planificaciones/servicio/{id}`, `GET /planificaciones/{id}`, `POST /planificaciones`, `PUT /planificaciones/{id}` y `DELETE /planificaciones/{id}`.
- **Criterios de aceptación:**
  1. «Agregar rotativa» suma al molde una instancia con su rotativa y su puesto.
  2. Asigno un funcionario a cada instancia, y la vista avisa si la misma persona queda en dos instancias que se solapan. «Vaciar» y «Quitar del molde» deshacen la asignación o la instancia.
  3. Veo los KPIs y la cobertura del ciclo (en desktop, los segmentos «Asignaciones», con la tabla puesto × rotativa, y «Ciclo», con semanas × 7). El detalle de un día lista quién cubre.
  4. «Moldes» permite guardar con un nombre único por servicio, cargar uno guardado y eliminarlo con confirmación.
  5. Con el molde vacío veo los tres pasos para empezar.
- **Trazabilidad:** FUN-SGT-019; MF-026; R18; RN-SGT-031 y siguientes.
- **Estado:** **Implementada.** Desde el 17 oct (R18-6e), eliminar un molde en el móvil pide confirmación, con el mismo texto que desktop, y «Molde nuevo» pregunta «¿Empezar un molde nuevo?» si el molde en pantalla tiene cambios sin guardar. «Quitar del molde» y «Vaciar» siguen como estaban, sin confirmación. Evidencia: `Planificacion.jsx` (en `PlanGuardarBase`: `onSave`, `onLoad`, `onDeleteMolde`, `nuevoMolde`; `MoldesSheet`; `AsignarFuncionarioSheet`; `findDobleAsignacion`).
- **Prueba E2E:** `admin`; datos: el molde «Rotativa 2026» de Urgencias; muta al guardar o al eliminar; ambos. Ya existe: `interacciones-planificacion.spec.js`.

#### HU-ADM-10 · Generar turnos desde el molde

- **Rol:** administrador.
- **Historia:** Como administrador quiero generar los turnos reales de un rango de fechas desde el molde para publicar la planificación del servicio.
- **Pantallas:** `planificacion` → «Generar» (sub-pantalla «Generar planificación»).
- **Endpoints:** `GET /feriados`; `POST /planificaciones/{id}/conflictos`; `POST /planificaciones/{id}/generar`.
- **Criterios de aceptación:**
  1. Sin el molde guardado veo «Guarda el molde antes de generar.».
  2. Solo puedo elegir un lunes como ancla. La vigencia efectiva parte en el ancla o después, y su término es igual o posterior al inicio; por defecto dura un ciclo.
  3. La vista previa muestra las fechas reales, los feriados, las reglas aplicadas y los conflictos con turnos existentes (con el mismo cálculo que la generación).
  4. Al confirmar veo «{N} turnos generados · {M} vacantes por conflicto», los turnos aparecen en el calendario y la bitácora registra la generación.
  5. Si el rango se cruza con otra vigencia activa del servicio, veo «Ya existe una planificación vigente en este servicio entre …» y no se genera nada.
- **Trazabilidad:** FUN-SGT-020, FUN-SGT-021, FUN-SGT-046, FUN-SGT-047; MF-026; TC-016, TC-017, TC-018; RN-SGT-011, 012 y 031 a 034.
- **Estado:** **Implementada.** Evidencia: `Planificacion.jsx` (`GenerarView`, `onGenerar`); `PlanificacionService` (`generarTurnos`, `detectarConflictos`, `validarSinSuperposicion`).
- **Prueba E2E:** `admin`. El ambiente ya tiene una vigencia activa de 7 semanas desde el lunes actual (`generar_turnos_demo.sh`): elegir un rango posterior o anularla antes (HU-ADM-11). Muta mucho (restauración completa). Desktop recomendado; también móvil. Ya existe: `interacciones-planificacion.spec.js` (vista previa y confirmación cancelada).

#### HU-ADM-11 · Administrar vigencias: acortar, anular y editar desde una fecha

- **Rol:** administrador.
- **Historia:** Como administrador quiero acortar, anular o cambiar una planificación desde una fecha, sin tocar el historial, para corregir sin rehacer todo.
- **Pantallas:** `planificacion` → ícono de reloj → «Vigencias del servicio».
- **Endpoints:** `GET /planificaciones/servicio/{id}/ejecuciones`; `PUT /planificaciones/ejecuciones/{id}/acortar`; `DELETE /planificaciones/ejecuciones/{id}`; `POST /planificaciones/{id}/editar-desde`.
- **Criterios de aceptación:**
  1. Veo todas las vigencias del servicio, activas y anuladas, de cualquier molde.
  2. Eliminar desde una fecha (acortar) exige una fecha de hoy en adelante, posterior al inicio de la vigencia y no posterior a su fin. Borra solo los turnos de esa vigencia desde esa fecha.
  3. «Anular» pide «¿Anular esta vigencia?» y borra solo los turnos de esa vigencia.
  4. «Editar "{molde}" desde una fecha» exige las dos fechas («Indica ambas fechas.»), desde hoy («La fecha desde no puede ser anterior a hoy.») y con término igual o posterior («La fecha de término debe ser igual o posterior a la fecha desde.»). Genera una vigencia nueva con el mismo ancla y las asignaciones actuales del molde.
- **Trazabilidad:** FUN-SGT-049, FUN-SGT-050, FUN-SGT-051; MF-026; RN-SGT-035 a 038.
- **Estado:** **Implementada.** Evidencia: `VigenciasSheet`, `onAcortarEjecucion`, `onAnularEjecucion`, `onEditarDesdeFecha`; `PlanificacionService.acortarPlanificacion`, `anularEjecucion` y `editarPlanificacionDesde`.
- **Prueba E2E:** `admin`; datos: la vigencia demo; muta (restauración completa); ambos. Ya existe: `interacciones-planificacion.spec.js` (cancelados).

#### HU-ADM-12 · Extender una vigencia

- **Rol:** administrador.
- **Historia:** Como administrador quiero extender la vigencia activa hasta una fecha nueva para seguir generando sin cambiar las asignaciones.
- **Pantallas:** ninguna. El Archivo (§21) lo deja pendiente; hoy se logra con «Editar "{molde}" desde una fecha» (HU-ADM-11).
- **Endpoints:** `POST /planificaciones/{id}/extender`.
- **Criterios de aceptación:**
  1. Desde Vigencias, «Extender» pide solo la nueva fecha de término.
- **Trazabilidad:** FUN-SGT-048.
- **Estado:** **No implementada** en la interfaz. Existen `planificacionService.extender` y el endpoint.
- **Prueba E2E:** solo por API; muta.

#### HU-ADM-13 · Eliminar turnos generados (método legado)

- **Rol:** administrador.
- **Historia:** Como administrador quiero borrar los turnos que generó un molde en un rango de fechas para deshacer una generación antigua.
- **Pantallas:** `planificacion` → ícono de papelero → «Eliminar turnos generados».
- **Endpoints:** `DELETE /planificaciones/{id}/turnos?fechaInicio&fechaFin`.
- **Criterios de aceptación:**
  1. Exige las dos fechas, con el fin igual o posterior al inicio, y pide «¿Eliminar estos turnos?».
  2. Muestra «{N} turnos eliminados».
  3. La pantalla dice lo que el backend hace: borra por las rotativas del molde dentro del rango, también los turnos de otros moldes que usen esas rotativas y los asignados a mano o del seed con ellas, y no anula ninguna vigencia; recomienda usar «Vigencias» (C-22).
- **Trazabilidad:** FUN-SGT-022; IF-022; RN-SGT-013; TC-017.
- **Estado:** **Implementada.** Desde el 17 oct (C-22) el texto, la confirmación y el título del botón dicen lo que pasa, en móvil y desktop; el móvil suma la recomendación de usar «Vigencias». El comportamiento no cambió: `PlanificacionService.eliminarTurnosGenerados` borra por las rotativas del molde dentro del rango (`softDeleteByRotativasAndRango`). Limitar el borrado a los turnos sin vigencia (los legados) queda para TIC.
- **Prueba E2E:** `admin`; datos: un rango fuera de la vigencia demo; muta (restauración completa); ambos. Ya existe: `interacciones-planificacion.spec.js` (cancelado).

### 3.17 Perfil (HU-PRF)

#### HU-PRF-01 · Ver mi perfil y mis herramientas

- **Rol:** todos.
- **Historia:** Como funcionario quiero ver mis datos de sesión y mis herramientas para saber con qué servicio y qué rol estoy trabajando.
- **Pantallas:** `perfil` (barra «Perfil»; menú «Perfil»).
- **Endpoints:** ninguno; usa los datos de la sesión.
- **Criterios de aceptación:**
  1. Veo mi nombre, el servicio activo y mi rol. En desktop además veo mi RUT, mis servicios (si tengo más de uno) y «Cambiar servicio».
  2. Herramientas: «Mi Dashboard» para todos; «Panel de Administración» con rol de sistema ADMINISTRADOR; «Panel de Jefatura» con rol JEFATURA; «Panel de Subrogante» con rol SUBROGANTE. El administrador en Urgencias ve Administración y Jefatura.
- **Trazabilidad:** MF-003, MF-018; R18.
- **Estado:** **Implementada.** Evidencia: `Perfil.jsx` (`ProfileView`). Desde el 17 oct (P-01), en móvil el avatar muestra las iniciales, calculadas del nombre.
- **Prueba E2E:** los cuatro roles; no muta; ambos. Ya existe: foto de `perfil` en `pantallas.spec.js`.

### 3.18 Dashboard personal (HU-DSH)

#### HU-DSH-01 · Ver mi dashboard de horas

- **Rol:** todos.
- **Historia:** Como funcionario quiero ver mis turnos y mis horas del mes o de una semana para controlar mi carga.
- **Pantallas:** `personal_dashboard` (Mi Perfil → «Mi Dashboard»; menú «Mi dashboard»).
- **Endpoints:** `GET /turnos/funcionario/{id}?year&month`; `GET /turnos/funcionario/{id}/futuros`.
- **Criterios de aceptación:**
  1. Puedo moverme entre meses y elegir una semana (S1 a S5).
  2. Veo la cantidad de turnos, las horas programadas, los días con turno y los días sin turno del período.
  3. La carga horaria se compara con 160 horas (mes) o 40 horas (semana) y avisa «Superaste el límite de N h». En desktop además veo la tabla «Turnos del período».
  4. «Próximos turnos» lista hasta cinco turnos que aún no empiezan.
- **Trazabilidad:** MF-003, MF-004; Archivo §6.16.
- **Estado:** **Implementada.** Evidencia: `PersonalDashboard.jsx`. Desde el 17 oct (P-01) el indicador se llama «Horas programadas», porque suma todos los turnos del período, también los que aún no ocurren y los de otros servicios de la persona. Los límites están fijos en el código.
- **Prueba E2E:** `medico`; no muta; ambos. Ya existe: `interacciones-gestion.spec.js`.

### 3.19 Registro pendiente (HU-PEN)

#### HU-PEN-01 · Aviso de cuenta no registrada

- **Rol:** persona del padrón del hospital que no está registrada en el SGT.
- **Historia:** Como funcionario del hospital que aún no está en el SGT quiero un aviso claro al entrar para saber a quién pedirle el registro.
- **Pantallas:** `pending_registration` (pantalla completa, sin menú).
- **Endpoints:** `POST /funcionarios/login`, que responde `registeredInSystem=false`.
- **Criterios de aceptación:**
  1. Dado 12345687-2 con la clave correcta, veo «Cuenta no registrada aún», el mensaje «Tu cuenta aún no ha sido registrada en el sistema» y la nota «Si crees que esto es un error, contacta a jefatura o al equipo de soporte para que te creen el registro correspondiente.».
  2. «Volver al inicio» me lleva al login. No queda sesión guardada y, al refrescar, sigo en el login.
  3. Con una clave incorrecta veo «Credenciales inválidas.» y no este aviso.
- **Trazabilidad:** MF-001; Archivo §6.1; RN-SGT-001.
- **Estado:** **Implementada.** Evidencia: `Prop4.handleLoginSuccess`; `PendingRegistrationView.jsx`; `FuncionarioController.login`.
- **Prueba E2E:** `noRegistrado`; no muta; ambos. Ya existe: foto en `pantallas.spec.js`.

---

## 4. Matriz resumen

Roles: **M** médico, **J** jefatura, **S** subrogante, **A** administrador. «Sí» = el rol la usa; «Neg.» = se prueba que el rol no puede; «—» = no aplica. Plataforma: **M** móvil, **D** desktop, **M+D** ambos.

| HU | Título | M | J | S | A | Estado | Automatizable | Muta | Plataforma |
|---|---|---|---|---|---|---|---|---|---|
| AUT-01 | Iniciar sesión | Sí | Sí | Sí | Sí | Implementada | Sí | No (el bloqueo queda en memoria) | M+D |
| AUT-02 | Elegir servicio | — | — | — | Sí (y multiservicio) | Implementada | Sí | No | M+D |
| AUT-03 | Entrar directo (R8) | Sí | Sí | Sí | — | Implementada | Sí | No | M+D |
| AUT-04 | Refrescar sin perder la pantalla (R5) | Sí | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| AUT-05 | Cambiar de servicio | Sí | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| AUT-06 | Cerrar sesión | Sí | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| AUT-07 | Sesión vencida y sin permiso | Sí | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| CAL-01 | Agenda del inicio | Sí | Sí | Sí | Sí | Implementada | Sí | No | M |
| CAL-02 | «Disponibles» (R9) | Sí | Sí | Sí | Sí | Implementada | Sí | No (Sí si se fabrica el dato) | M |
| CAL-03 | «Solicitudes» del inicio (R11) | Sí | Sí | Sí | Sí | Implementada | Sí | Sí | M |
| CAL-04 | Aviso de cambio aprobado (retirada) | Sí | Sí | Sí | Sí | Retirada (C-05) | No | — | M |
| CAL-05 | Centro de operaciones | Sí | Sí | Sí | Sí | Implementada | Sí | No | D |
| CAL-06 | Calendario mensual | Sí | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| CAL-07 | Exportar mis turnos | Sí | — | — | — | Implementada | Sí | No | M+D |
| CAL-08 | Exportar todo el servicio | — | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| CAL-09 | Exportar nómina | — | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| DET-01 | Ver detalle de turno | Sí | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| DET-02 | Pedir un cupo tocándolo (R4) | Sí | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| DET-03 | Elegir receptor desde el detalle | Sí | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| DET-04 | «Ver historial» | Sí | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| SOL-01 | Mis solicitudes y recibidas | Sí | — | — | — | Implementada | Sí | No (Sí si se crean datos) | M+D |
| SOL-02 | Bandeja del servicio | — | Sí | Sí | Sí | Parcial | Sí | Sí | M+D |
| SOL-03 | Permiso | Sí | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| SOL-04 | Botar turno | Sí | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| SOL-05 | Cobertura | Sí | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| SOL-06 | Intercambio (R14) | Sí | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| SOL-07 | Oferta particular | Sí | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| SOL-08 | Responder como receptor | Sí | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| SOL-09 | Aprobar o rechazar | Neg. | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| SOL-10 | Postulaciones agrupadas (R10) | — | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| SOL-11 | Cancelar solicitud (R15) | Sí | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| SOL-12 | Modificar motivo | Sí | — | — | — | Implementada | Sí | Sí | M+D |
| SOL-13 | Anti doble solicitud (R12, R15) | Sí | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| SOL-14 | Descanso post nocturno (R13) | Sí | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| OFE-01 | Publicar oferta general | Sí | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| OFE-02 | Abrir o rechazar oferta | Neg. | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| OFE-03 | Postular y retirar | Sí | — | — | — | Implementada | Sí | Sí | M+D |
| OFE-04 | Seleccionar postulante | — | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| OFE-05 | Solo ofertas vigentes | Sí | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| NOT-01 | Ver bandeja | Sí | Sí | Sí | Sí | No disponible en la entrega (C-09) | Pruebas omitidas (C-09) | No | M+D |
| NOT-02 | Marcar leída y eliminar | Sí | Sí | Sí | Sí | No disponible en la entrega (C-09) | Pruebas omitidas (C-09) | Sí | M+D |
| NOT-03 | Recibir avisos por eventos | Sí | Sí | Sí | Sí | No disponible en la entrega (C-09) | Pruebas omitidas (C-09) | — | M+D |
| PAN-01 | Panel de jefatura | — | Sí | — | Sí | Implementada | Sí | No | M+D |
| PAN-02 | Panel de subrogante | — | — | Sí | — | Implementada | Sí | No | M+D |
| PAN-03 | Médico sin paneles | Neg. | — | — | — | Implementada | Sí | No | M+D |
| ASG-01 | Abrir asignación de turnos | — | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| ASG-02 | Asignar cupo libre | — | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| ASG-03 | Reasignar o liberar | — | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| ASG-04 | Cambiar horario | — | Sí | Sí | Sí | No implementada | Solo API | Sí | — |
| ASG-05 | El médico no asigna | Neg. | — | — | — | Implementada | Sí | No | M+D |
| PER-01 | Personal del servicio | — | Sí | — | Sí | Implementada | Sí | No | M+D |
| PER-02 | Sumar funcionario al servicio | — | Sí | Neg. | — | Implementada | Sí | Sí | M+D |
| JER-01 | Designar subrogante | — | Sí | — | — | Implementada | Sí | Sí | M+D |
| JER-02 | El subrogante no designa | — | — | Neg. | — | Implementada | Sí | No (el backend lo niega) | M+D y API |
| JER-03 | Quitar la subrogancia | Neg. | Sí | Neg. | Sí | Implementada | Sí | Sí | M+D |
| PUE-01 | Gestionar puestos | Neg. | Sí | Sí | Sí | Implementada | Sí | Sí | M+D |
| EST-01 | Estadísticas | — | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| BIT-01 | Bitácora | Neg. | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| AUD-01 | Auditoría de asistencia | — | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| REG-01 | Reglas (administrador) | — | — | — | Sí | Implementada | Sí | Sí | M+D |
| REG-02 | Reglas de horario solo del administrador | — | Neg. | Neg. | — | Implementada | Sí | No | M+D |
| ADM-01 | Panel de Administración | — | — | — | Sí | Implementada | Sí | No | M+D |
| ADM-02 | Servicios | Neg. | — | — | Sí | Implementada | Sí | Sí | M+D |
| ADM-03 | Personal del sistema | — | — | — | Sí | Implementada | Sí | No | M+D |
| ADM-04 | Asignar a cualquier servicio | — | — | — | Sí | Implementada | Sí | Sí | M+D |
| ADM-05 | Jerarquía del sistema | — | — | — | Sí | Implementada | Sí | Sí | M+D |
| ADM-06 | Tipos de turno | — | Neg. | Neg. | Sí | Implementada | Sí | Sí | M+D |
| ADM-07 | Rotativas | — | Neg. | Neg. | Sí | Implementada | Sí | Sí | M+D |
| ADM-08 | Duplicar rotativa | — | — | — | Sí | No implementada | Solo API | Sí | — |
| ADM-09 | Molde de planificación | — | — | — | Sí | Implementada | Sí | Sí | M+D |
| ADM-10 | Generar turnos | — | Neg. | — | Sí | Implementada | Sí | Sí | M+D |
| ADM-11 | Vigencias | — | — | — | Sí | Implementada | Sí | Sí | M+D |
| ADM-12 | Extender vigencia | — | — | — | Sí | No implementada | Solo API | Sí | — |
| ADM-13 | Eliminar turnos generados | — | — | — | Sí | Implementada | Sí | Sí | M+D |
| PRF-01 | Mi perfil | Sí | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| DSH-01 | Mi dashboard | Sí | Sí | Sí | Sí | Implementada | Sí | No | M+D |
| PEN-01 | Registro pendiente | — | — | — | — | Implementada (usuario no registrado) | Sí | No | M+D |

### 4.1 Conteo por módulo y estado

Calculado con un script a partir de la matriz de arriba (22 oct 2026).

| Módulo | HU | Implementada | Parcial | No implementada | No disponible en la entrega | Retirada | Contradicción |
|---|---|---|---|---|---|---|---|
| AUT Autenticación y servicio | 7 | 7 | 0 | 0 | 0 | 0 | 0 |
| CAL Calendario y turnos propios | 9 | 8 | 0 | 0 | 0 | 1 | 0 |
| DET Detalle de turno | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| SOL Solicitudes | 14 | 13 | 1 | 0 | 0 | 0 | 0 |
| OFE Ofertas y postulaciones | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| NOT Notificaciones | 3 | 0 | 0 | 0 | 3 | 0 | 0 |
| PAN Paneles de jefatura y subrogante | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| ASG Asignación de turnos | 5 | 4 | 0 | 1 | 0 | 0 | 0 |
| PER Personal del servicio | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| JER Jerarquía | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| PUE Puestos | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| EST Estadísticas | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| BIT Bitácora | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| AUD Auditoría | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| REG Reglas del servicio | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| ADM Administración | 13 | 11 | 0 | 2 | 0 | 0 | 0 |
| PRF Perfil | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| DSH Dashboard personal | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| PEN Registro pendiente | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| **Total** | **77** | **69** | **1** | **3** | **3** | **1** | **0** |

---

## 5. Contradicciones y preguntas para Álvaro

Cada punto trae lo que dicen los documentos (con cita), lo que hacía el código al 17 oct, una pregunta con recomendación y, al final, la decisión de Álvaro (17 oct 2026). El cierre implementó las decisiones entre el 17 y el 19 oct: el «Código hoy» de cada punto conserva lo que decía el código antes de esas correcciones, y el estado vigente de cada HU está en §3 y §4. El estado de cada decisión al 22 oct está en `docs/TRASPASO.md` §9.

### C-01 · Quién crea tipos de turno, rotativas y planificaciones

- **Manual:** MF-024 «Agregar / Editar / Inhabilitar tipo de turno (nombre + hora inicio/fin) | Admin/Jefatura/Subrogancia»; MF-025 «Definir secuencia de turnos por semana(s) mediante "pincel" por día | Admin/Jefatura/Subrogante»; MF-026 «Armar molde (rotativa + puesto + funcionario), guardarlo, elegir lunes de inicio y generar los turnos reales | Admin/Jefatura».
- **Archivo y QA:** §6.5 «Exclusivo de `ADMINISTRADOR` (`GLOBAL_ADMIN_PATHS`) — discrepancia documentada respecto al manual de administración, que asigna esta función también a Jefatura/Subrogancia (ver BUG-003)»; RN-SGT-030; BUG-003 «requiere **decisión de negocio** (no solo técnica)».
- **Código hoy:** `SecurityConfig.GLOBAL_ADMIN_PATHS` (`/tipos-turno/**`, `/rotativas/**`, `/planificaciones/**`) exige ADMINISTRADOR para POST, PUT y DELETE. `Prop4` solo pasa `onGoTiposTurno`, `onGoPlantillas` y `onGoPlanificacion` al panel de administración. Los paneles de jefatura y subrogante tienen esas tarjetas en el código, ocultas porque nunca reciben el handler.
- **Pregunta:** ¿Para la entrega, solo el administrador crea tipos de turno, rotativas y planificaciones?
- **Recomendación:** sí. Dejarlo en el administrador, que es coherente en la interfaz y en el backend y reduce el riesgo entre servicios; corregir el manual y retirar las tarjetas ocultas de los paneles. Si se quiere dárselo a la jefatura, hacerlo con control por servicio (riesgo de IDOR señalado en `QA_REMEDIATION_PLAN.md`).
- **Decisión (17 oct):** como se recomienda: solo el administrador. Corregir el manual y retirar las tarjetas ocultas de los paneles.

### C-02 · ¿Un médico aprueba solicitudes?

- **Manual:** MF-027 «Aprobar/Rechazar solicitudes pendientes | Admin/Jefatura/Subrogante».
- **Archivo:** §6.11 «Aprobar/rechazar como Jefatura/Subrogante/Médico (`PUT /solicitudes/{id}/estado`).»; RN-SGT-029 «El rol `MEDICO` está habilitado, además de `JEFATURA`/`SUBROGANTE`, para aprobar/rechazar solicitudes de terceros»; FUN-SGT-028 «Jefatura, Subrogante, Médico»; flujo 19.6 «Pendiente de aprobación de Jefatura/Subrogante/Médico».
- **Inventario y QA:** IF-032 «`hasAnyRole('JEFATURA','SUBROGANTE','MEDICO')` — **incluye MEDICO**»; BUG-005.
- **Código hoy:** `SecurityConfig` dice «SEC (H-07): aprobar/rechazar es una función de gestión — antes incluía MEDICO, lo que permitía auto-aprobación (cerrado además en el service con la verificación de que el aprobador no sea el propio emisor).», y `PUT /api/v2/solicitudes/*/estado` exige ADMINISTRADOR, JEFATURA o SUBROGANTE. `SolicitudService.cambiarEstado` impide además decidir a quien participa en la solicitud. Pero la descripción OpenAPI de `SolicitudController.cambiarEstado` todavía dice «Requiere rol JEFATURA, SUBROGANTE o MEDICO.».
- **Pregunta:** ¿Se confirma que ningún médico aprueba, tampoco un «jefe de turno» sin rol de jefatura?
- **Recomendación:** confirmar; cerrar BUG-005 como corregido y actualizar el Archivo (§6.11, RN-SGT-019, RN-SGT-029, FUN-SGT-028, flujo 19.6) y la descripción OpenAPI.
- **Decisión (17 oct):** confirmado: ningún médico aprueba. Cerrar BUG-005 y actualizar el Archivo y la descripción OpenAPI.

### C-03 · Qué puede hacer el subrogante

- **Manual:** MF-023 «Administrador (cualquier servicio) / Jefatura (solo subrogantes de su propio servicio) … **un subrogante no puede designar nuevos subrogantes**»; MF-024 y MF-025 lo incluyen para tipos de turno y rotativas; MF-020 (asignar funcionarios) solo menciona al «Administrador».
- **Archivo:** §4 «Igual que Jefatura, salvo que **no** puede designar jerarquía ni asignar funcionarios a servicios (el frontend no le entrega esos handlers)»; RN-SGT-007 «`ADMINISTRADOR`, `JEFATURA` y `SUBROGANTE` pueden gestionar Puestos, Turnos, Reglas de Servicio y registrar personal nuevo.».
- **Código hoy:** el panel de subrogante tiene 6 módulos, sin jerarquía, personal ni asignación de funcionarios (`SubroganteDashboardView`, `navegacion.js`). En cambio, `FuncionarioController.update` dice «SEC (item 5): SUBROGANTE se equipara a JEFATURA para esta operación»: por API puede cambiar el rol de cualquier persona de su servicio, es decir, designar jerarquía. `registerPersonal` exige JEFATURA o ADMINISTRADOR, así que no registra personal nuevo, al revés de RN-SGT-007. Puestos, turnos y reglas sí los puede tocar (`SERVICE_ADMIN_PATHS`), aunque reglas no tiene menú (C-10).
- **Pregunta:** Mientras subroga, ¿el subrogante tiene todas las facultades de la jefatura o un subconjunto? ¿Cuál?
- **Recomendación:** para la entrega, un subconjunto explícito: decide solicitudes y ofertas, asigna turnos y gestiona puestos; no designa jerarquía ni suma personal. Alinear el backend para que `PUT /funcionarios/{id}` no le deje cambiar el `rol`.
- **Decisión (17 oct):** el subconjunto recomendado: decide solicitudes y ofertas, asigna turnos y gestiona puestos; no designa jerarquía ni suma personal, y el backend se lo niega.

### C-04 · Regla de 12 horas frente a R13

- **Archivo:** RN-SGT-039 «… o con dos turnos de exactamente 12 horas consecutivos sin descanso (uno termina exactamente cuando empieza el otro)»; FUN-SGT-052 «Validación de secuencia incompatible de 12 horas»; §10 «**no** se revalida al aprobar una Solicitud» (desactualizado).
- **R13:** «Se reemplazó esa regla por **"descanso post-nocturno"**, asimétrica y sin exigencia de duraciones»; «Un turno **nocturno** (cruza la medianoche) que termina la mañana del día D es incompatible con un turno **diurno** (empieza y termina dentro del mismo día) de ese mismo día D»; «El validador es compartido: la regla nueva aplica automáticamente a **solicitudes** (crear y aprobar — la aprobación revalida siempre), **asignación manual** de jefatura y **ofertas generales**.».
- **Código hoy:** `ValidadorAsignacionTurnoService.esDescansoPostNocturnoViolado` lo usan `SolicitudService`, `OfertaGeneralService.seleccionarPostulante` y `TurnoService.getTurnosIntercambiables`. `GestionTurnoService.validarConflictoFuncionario` (asignar y reasignar a mano) solo revisa el solape con `solapan`. La generación de la planificación tampoco aplica R13.
- **Pregunta:** ¿La jefatura puede asignar a mano un turno de día a quien sale de una noche (por ejemplo, en una emergencia)? ¿Y la planificación?
- **Recomendación:** aplicar el validador también en `accionAsignar` y `accionReasignar` (cambio acotado, alcanzable antes del congelamiento). Si se quiere permitir la excepción, que pida confirmación explícita y quede en la bitácora. Reemplazar la regla de 12 horas en el Archivo.
- **Decisión (17 oct):** aplicar R13 también al asignar y reasignar a mano. La planificación queda como limitación conocida. La excepción de emergencia no se implementa.

### C-05 · Chips del inicio y aviso de cambio aprobado

- **Manual:** MF-005 «Filtros "Todos / Mis turnos / Pendientes / Libres"».
- **Archivo:** §11 «por estado del turno (Todos/Mis turnos/Pendientes/Libres/Aprobados)»; §21 «Contador de "Pendientes" en Agenda | Comentario `// TO DO…`».
- **Requerimientos:** R1 quita «Aprobados», pero su «Cómo probarlo» todavía dice «deben quedar 4 chips (Todos, Mis turnos, Pendientes, Libres)»; R9 «Cambia 'Pendientes' por 'Solicitudes' y 'Libres' por 'Disponibles'»; R11 «`cambioAprobado` sigue sin emitirse (el badge "Aprobado" queda para un requerimiento futuro)»; TRASPASO «Home con 4 chips: **Todos · Mis turnos · Solicitudes · Disponibles** (R1, R9).».
- **Código hoy:** `AgendaView.FILTERS` tiene Todos, Mis turnos, Solicitudes y Disponibles. El filtro inicial es «Mis turnos» (`useState("miTurno")`), algo que ningún documento menciona. El backend no envía `cambioAprobado` ni `solicitudCon`, así que la marca y el aviso de aprobado nunca aparecen.
- **Preguntas:** (a) ¿El inicio debe abrir en «Mis turnos» o en «Todos»? (b) ¿Se implementa el aviso de cambio aprobado o se retira ese código?
- **Recomendación:** (a) dejar «Mis turnos» y documentarlo; (b) retirar el código del aviso para la entrega (implementarlo exige que el backend lo calcule desde la bitácora) y actualizar MF-005 en el manual.
- **Decisión (17 oct):** dejar «Mis turnos», documentarlo y retirar el código del aviso.

### C-06 · Bitácora del médico («Ver historial»)

- **Manual:** MF-031 «Bitácora de cambios … | Admin/Jefatura/Subrogante»; MF-015 «Ver info del turno + solicitar cambios/turno si aplica».
- **Archivo:** §11 «acciones dinámicas según el estado del turno y el rol del usuario (asignar, solicitar cambio, ver historial)»; §6.14 «Todos (consulta, según rol)».
- **R18 (decisión pendiente):** «La bitácora del médico: el backend se la niega, pero el home y el calendario le ofrecen "Ver historial".».
- **Código hoy:** `ShiftDetail.accionesDelTurno` agrega «Ver historial» para todos y abre `bitacora`, general, sin filtrar por el turno. `BitacoraController` exige rol de gestión, así que el médico ve «No se pudo cargar la bitácora.». `Prop4` tiene `bitacora` en `VISTAS_COMUNES`.
- **Pregunta:** ¿El médico debe ver el historial de sus turnos?
- **Recomendación:** si la respuesta es sí, que «Ver historial» use `GET /bitacoras/turno/{id}` y que el backend lo permita solo para turnos propios. Si es no, ocultar «Ver historial» al médico y sacar `bitacora` de las vistas comunes. En ambos casos, que la gestión vea el historial del turno y no toda la bitácora.
- **Decisión (17 oct):** sí, el de sus turnos: «Ver historial» usa `GET /bitacoras/turno/{id}`, el médico ve solo el de sus turnos y la gestión ve el historial del turno, no toda la bitácora.

### C-07 · ¿Puede haber varias jefaturas por servicio?

- **Manual:** MF-023 «Designar Jefatura o Subrogante de un servicio».
- **Archivo:** §4, Jefatura «Responsable de un servicio específico»; §9 «existe la figura de Jefatura y Subrogante (uno o más)».
- **R18 (decisión pendiente):** «Jerarquía del servicio parte con el rol de jefatura marcado: si no se cambia, se designa otra jefatura. Hoy puede haber varias por servicio.».
- **Código hoy:** `FuncionarioService.updateUser` cambia el rol sin mirar si ya hay una jefatura. El seed tiene seis jefaturas en Urgencias (ids 300 a 305; cinco son además administradores). `JerarquiaJefaturaView` parte con `selectedRole = 'jefe'` y solo ofrece el botón «Subrogante». El panel de jefatura promete «Designa nuevos subrogantes al sistema.».
- **Pregunta:** ¿Una sola jefatura por servicio, o varias (por ejemplo, coordinadores por turno)? ¿La jefatura puede nombrar a otra jefatura?
- **Recomendación:** para la entrega, que la jefatura solo designe subrogantes: selección inicial «Subrogante» y rechazo en el backend del rol JEFATURA cuando quien designa no es administrador. Que la cantidad de jefaturas la decida TIC con el servicio y, si es una, que la valide el backend.
- **Decisión (17 oct):** la jefatura solo designa subrogantes: selección inicial «Subrogante», y el backend rechaza JEFATURA salvo que lo pida un administrador. Cuántas jefaturas tiene un servicio lo decide TIC con el servicio.

### C-08 · El médico que exporta sus turnos

- **Manual:** MF-013 «Descargar turnos del mes en CSV … | Cualquiera».
- **QA:** `ROLE_PERMISSION_TEST_MATRIX.md` marca «Exportar CSV (propios turnos)» como permitido para los cuatro roles, con la nota «`ExportacionController` sin restricción de rol adicional, correcto — es autoservicio».
- **Archivo:** §6.15 «Todos (alcance de "todo el servicio" reservado a roles de gestión…)».
- **Código hoy:** `ExportacionController.exportarTurnosCsv` tiene `@PreAuthorize("hasAnyRole('ADMINISTRADOR','JEFATURA','SUBROGANTE')")` y el comentario «SEC (H-01, High): antes cualquier autenticado (incl. MEDICO) podía exportar…». `calendarView` le muestra el botón al médico, con «Se exportarán solo tus turnos del servicio actual.», y termina en «No se pudo exportar. Intenta de nuevo.».
- **Pregunta:** ¿El médico exporta sus propios turnos?
- **Recomendación:** sí, con el alcance forzado en el backend: si el rol es MEDICO, `idFuncionario` es el de la sesión, ignorando el parámetro. Si no, quitarle el botón al médico antes de la entrega.
- **Decisión (17 oct):** sí, sus turnos: el backend fuerza que salgan solo los del médico.

### C-09 · Notificaciones de solicitudes y de turnos

- **Manual:** MF-014 «Ver bandeja de notificaciones, separadas por leídas/recibidas».
- **Archivo:** §13 «**Eventos que las generan**: creación de solicitud, cambio de estado de solicitud, aceptación/rechazo por receptor, asignación/reasignación/desasignación manual de turno, cambio de horas de un turno.»; §21, las de alteración manual «no llegan a la bandeja del destinatario».
- **Código hoy:** ningún service de solicitudes ni de ofertas crea notificaciones; solo existen el `POST /notificaciones` manual y las llamadas de `GestionTurnoService`. `NotificacionService.crearNotificacionSistema` recibe al destinatario pero no lo guarda (la entidad no tiene ese campo) y deja la solicitud nula. La bandeja solo muestra notificaciones ligadas a una solicitud donde el usuario es emisor o receptor. Lo único que hoy hay en las bandejas son los datos del seed.
- **Pregunta:** ¿La bandeja tiene que funcionar para la entrega? ¿Con qué eventos?
- **Recomendación:** agregar el destinatario a `Notificacion` (migración chica) y crear la notificación en `SolicitudService` (crear, responder, cambiar estado, cancelar), en `OfertaGeneralService` y en `GestionTurnoService`. Si no alcanza antes del 30 de octubre, decirlo en el manual y ocultar la bandeja.
- **Decisión (17 oct):** implementarlas: destinatario en `Notificacion` y avisos al crear, responder, aprobar, rechazar y cancelar solicitudes, en las ofertas y en las asignaciones. Si no alcanzan al 28 oct, se oculta la bandeja y se dice en el manual.

### C-10 · Reglas de horario para jefatura y subrogante

- **Manual:** MF-029 «Ajuste automático de horas de entrada/salida en fin de semana y/o feriado, por tipo de turno | Admin/Jefatura/Subrogante».
- **Archivo:** §6.7 «Panel Admin/Jefatura/Subrogante → "Reglas de Horario"»; RN-SGT-007.
- **R18 (decisión pendiente):** «Reglas de horario para jefatura y subrogante: el sistema se las permite, pero ningún menú los lleva ahí.».
- **Código hoy:** `SecurityConfig.SERVICE_ADMIN_PATHS` incluye `/reglas-servicio/**`; `Prop4.VISTAS_GESTION` incluye `reglas`; `navegacion.js` pone «Reglas de horario» con permiso `admin`; los paneles de jefatura y subrogante no tienen la tarjeta.
- **Pregunta:** ¿La jefatura y el subrogante configuran las reglas de su servicio?
- **Recomendación:** si es sí, agregar el módulo y el ítem del menú (cambio solo de frontend). Si es no, sacar `/reglas-servicio/**` de las escrituras de `SERVICE_ADMIN_PATHS` y `reglas` de `VISTAS_GESTION`.
- **Decisión (17 oct):** solo el administrador: cerrar en el backend las escrituras de `/reglas-servicio/**`.

### C-11 · El receptor debe aceptar antes de que la jefatura apruebe

- **Manual:** MF-027 «en intercambios, el receptor debe aceptar antes».
- **Archivo:** RN-SGT-019 «requieren que el receptor las acepte antes de que Jefatura/Subrogante/Médico puedan aprobarlas».
- **Código hoy:** la interfaz lo cumple (en `evaluarSolicitud`, `canDecideThis` exige que no se esté esperando al receptor). El backend no: `SolicitudService.cambiarEstado` no mira `aceptadoReceptor`, así que por API se puede aprobar un intercambio que el receptor nunca aceptó.
- **Pregunta:** ninguna de negocio; la regla está clara.
- **Recomendación:** agregar la verificación en `cambiarEstado` para los tipos 4 y 5.
- **Decisión (17 oct):** revisarlo en el backend al aprobar intercambios y ofertas particulares.

### C-12 · Eliminar un tipo de turno que usan rotativas

- **Manual:** MF-024 «inhabilitar exige que no esté asignado a ninguna rotativa».
- **Archivo:** §6.5 «Antes de eliminar, se advierte cuántas rotativas usan ese tipo de turno y que sus días pasarán a quedar libres si se elimina.».
- **Código hoy:** `TipoTurnoService.eliminarTipoDeTurno` lo elimina y deja libres esos días en las rotativas (`liberarReferenciasAlTipoTurno`); la interfaz lista las rotativas afectadas.
- **Pregunta:** ¿Se bloquea o se permite con aviso?
- **Recomendación:** mantener el código (permitir con aviso) y corregir el manual.
- **Decisión (17 oct):** permitir con aviso, como hoy, y corregir el manual.

### C-13 · Tope de horas de una rotativa

- **Manual:** MF-025 «**máximo 24 h asignables por semana**»; TC-019 no encontró la validación.
- **Archivo:** §6.6 «El frontend calcula y advierte si el promedio de horas semanales del patrón supera 44 horas (referencia legal chilena de jornada laboral).».
- **Código hoy:** `PlantillasView` (`HORAS_SEMANALES_REF = 44`) solo avisa; el backend no tiene tope (`RotativaService`).
- **Pregunta:** ¿Cuál es el tope (24 horas, 44 u otro) y debe bloquear?
- **Recomendación:** confirmarlo con la jefatura de Urgencias; si se mantiene el aviso de 44 horas, corregir el manual.
- **Decisión (17 oct):** que no bloquee y solo avise sobre las 44 horas («puede alguien sin problema hacer 60hrs en una semana»). Corregir el manual.

### C-14 · Auditoría con el encargado de cada asignación

- **Manual:** MF-032 «Turnos totales/asignados/vacantes por mes, con el encargado de cada asignación».
- **Código hoy:** `AuditoriaView` muestra el funcionario o «Vacante» y los totales, pero no quién hizo la asignación.
- **Pregunta:** ¿Es necesario mostrar al encargado?
- **Recomendación:** si se necesita, cruzar con la bitácora; si no, corregir el manual.
- **Decisión (17 oct):** corregir el manual.

### C-15 · ¿Aprobar un permiso libera los turnos del período?

- **Archivo:** RN-SGT-017 «al aprobarse: Permiso/Botar turno liberan el turno».
- **Manual:** MF-007 «Crear solicitud de permiso (fecha inicio/fin, motivo opcional) | Cualquiera | — | Solicitud creada, pendiente».
- **Código hoy:** el asistente de Permiso envía solo las fechas, sin turno. `cambiarEstado` libera el turno solo si la solicitud trae uno, así que aprobar un permiso creado desde la interfaz no cambia ningún turno (los permisos del seed sí traen turno).
- **Pregunta:** al aprobar un permiso, ¿deben quedar libres los turnos del funcionario en esas fechas?
- **Recomendación:** decidirlo con las jefaturas. Para la entrega, documentar que el permiso es un registro y que la jefatura libera a mano los turnos si corresponde.
- **Decisión (17 oct):** el permiso queda como registro: la jefatura libera a mano los turnos que correspondan, y se documenta así.

### C-16 · Ofertas pasadas y pendientes de apertura a la vista del médico

- **Requerimientos:** R16, deuda anotada: «ofertas PENDIENTE_APROBACION visibles para médicos (decisión de negocio pendiente)»; R17 «El panel "Disponibles · Ofertas generales" oculta las ofertas cuyo turno ya pasó».
- **Código hoy:** el Centro filtra por vigencia y oculta las rechazadas. La pestaña «Ofertas generales» de Solicitudes muestra todas a todos; la oferta 1 del seed, abierta y de la semana pasada, sigue recibiendo postulaciones. Quien publica una oferta no puede retirarla: `OfertaGeneralController` no tiene una ruta para eso (E2E de la fase 3).
- **Pregunta:** ¿El médico ve las ofertas pendientes de apertura? ¿Se ocultan las pasadas en todas partes? ¿Puede el ofertor retirar su oferta?
- **Recomendación:** usar en Solicitudes el mismo filtro de vigencia y mostrarle al médico solo las abiertas. Dejar que el ofertor retire su oferta mientras nadie la haya abierto.
- **Decisión (17 oct):** como se recomienda: el mismo filtro de vigencia en Solicitudes y en Cobertura, al médico solo las ofertas abiertas, y el ofertor puede retirar su oferta mientras nadie la haya abierto.
- **Decisión (20 oct):** el ofertor retira su oferta hasta que alguien postule, no solo mientras nadie la haya abierto: pendiente de apertura o abierta, y siempre que no tenga ninguna postulación (con una, 409); cerrada (el turno ya se asignó), rechazada o retirada, nunca. Reemplaza esa parte de la decisión del 17 oct; el resto de C-16 sigue igual. Coincide con la respuesta a S-11 de las pruebas integrales (`docs/qa/pruebas-integrales/SUPUESTOS_Y_PREGUNTAS.md`). Sin migración: `RETIRADA` ya existe (V3).

### C-17 · Lecturas sin control por servicio o por dueño

- **QA:** BUG-002, BUG-004, BUG-006 y BUG-007, con propuestas como «filtrar `findAllSolicitudes()` por servicio del solicitante» y «validar en el controlador que `idFuncionario` del path coincide con el `Authentication.getPrincipal()`».
- **Código (regla escrita):** `SeguridadServicio`: «Todo endpoint que reciba un {@code servicioId} (o un recurso del que se pueda derivar uno) desde el cliente debe llamar a {@link #exigirMismoServicio(Long)} antes de usarlo.»; `REVISION_POST_CORRECCIONES_SGT.md` §4: «**GETs restantes sin scoping por servicio**: no auditados exhaustivamente esta etapa — la corrección se limitó a los endpoints de escritura mencionados en las 12 secciones.».
- **Código hoy, sin control:** `GET /solicitudes` y sus variantes (la bandeja de gestión depende de él), los `GET /turnos/servicio/{id}/**`, `GET /turnos/funcionario/{id}`, `GET /ofertas-generales/servicio/{id}`, `GET /funcionarios/{id}/summary`, `GET /Personal/summary` (todo el padrón del hospital, con RUT), `PUT /notificaciones/{id}/leer`, `DELETE /notificaciones/{id}` y `GET /notificaciones/{id}`. La bitácora exige rol de gestión, pero no filtra por servicio. Las escrituras de puestos y reglas no comprueban el servicio de la sesión. **Ya corregido:** bandeja y contador de notificaciones, nómina de funcionarios (`/funcionarios/summary`), exportaciones, alteración y CRUD de turnos, y decisión de solicitudes y ofertas.
- **También sin control (E2E de la fase 2a, 17 oct, confirmado en el código):**
  - `GET /turnos` (`TurnoController.java:79-82`) entrega a cualquier sesión, médico incluido, todos los turnos del hospital, con el nombre y el RUT de quien está asignado. El filtro de seguridad restringe solo las escrituras de `/turnos/**`.
  - `GET /turnos/{id}` (`:94-98`) y `GET /turnos/puesto/{id}` (`:387-390`).
  - `GET /ofertas-generales/ofertor/{id}` (`OfertaGeneralController.java:92-95`).
  - `GET /planificaciones/servicio/{id}` (`PlanificacionController.java:49-55`) entrega el molde de otro servicio con los nombres de su personal. `GLOBAL_ADMIN_PATHS` protege solo las escrituras.
  - `GET /notificaciones/solicitud/{id}` (`NotificacionController.java:72-75`).
  - Sin datos personales: las lecturas de configuración por servicio (puestos, rotativas, tipos de turno, reglas, `GET /planificaciones/{id}` y sus `/ejecuciones`).
  - `GET /funcionarios/status/{rut}`, que a cualquier sesión le dice si un RUT está registrado y con qué id.
- **Pregunta:** ¿Se corrige antes de entregar a TIC o se entrega como riesgo conocido?
- **Recomendación:** con datos reales de personal, corregir antes: `GET /solicitudes` filtrado por rol y servicio, `exigirMismoServicio` en los GET por servicio y por id de recurso, y control de dueño en las notificaciones. `GET /turnos` (todos los turnos) se restringe al administrador, o se quita si la interfaz no lo usa. Es el mayor riesgo de seguridad que queda.
- **Decisión (17 oct):** corregir antes de entregar, como se recomienda.

### C-18 · Cómo se reconoce al administrador

- **R18 (decisión pendiente):** «El administrador se reconoce distinto en Mi Perfil (solo `ADMINISTRADOR`) y en el menú desktop (`ADMIN` o `ADMINISTRADOR`).».
- **Código hoy:** `Perfil.jsx` usa `rolSistema === 'ADMINISTRADOR'`; `navegacion.esAdminSistema`, `Prop4.vistaPermitida` y `calendarView` aceptan también `ADMIN`; el backend solo envía `ADMINISTRADOR` o `USUARIO`.
- **Recomendación:** unificar en `ADMINISTRADOR`. Con los datos actuales no cambia nada.
- **Decisión (17 oct):** unificar en `ADMINISTRADOR`.

### C-19 · Sumar al servicio a alguien que ya pertenece

- **Archivo:** §6.3 «si el funcionario ya pertenece al servicio, la asignación actualiza su rol en vez de duplicar el vínculo».
- **R18 (falla):** «Asignar un funcionario a un servicio donde ya tiene relación lo deja como Médico … una jefatura o subrogante asignada a su propio servicio pierde el rol sin aviso.».
- **Código hoy:** `funcionarioService.asignarServicio` envía `rol: 3`, y `FuncionarioService.updateUser` reemplaza el rol de la relación existente.
- **Pregunta:** ¿Qué debe pasar en ese caso?
- **Recomendación:** si la persona ya pertenece al servicio, no tocar el rol y avisar que ya pertenece.
- **Decisión (17 oct):** se resuelve con C-23: si la persona ya pertenece al servicio, se avisa y no se cambia su rol.
- **Decisión (17 oct, después de la página):** como sumar al servicio ya no cambia el rol, se agrega una acción aparte, «Quitar subrogancia», para que la jefatura del servicio o el administrador devuelvan a médico a un subrogante (`PUT /funcionarios/{id}/quitar-subrogancia?servicioId=`). Antes no había forma de hacerlo desde la interfaz.

### C-20 · 401 o 403 cuando falta permiso

- **QA:** BUG-001 «el sistema responde HTTP 401 ("No autorizado") en lugar de HTTP 403 ("Prohibido")» y el frontend «fuerza un logout automático».
- **Código hoy:** `SecurityConfig` sigue sin `accessDeniedHandler`. `GlobalExceptionHandler.handleAccessDenied` responde 403 solo en las negaciones dentro de los controllers (`@PreAuthorize`, `SeguridadServicio`). `axiosConfig` cierra la sesión ante cualquier 401 y ante un 403 solo escribe en la consola. No verificado en ejecución en esta revisión.
- **Pregunta:** ninguna de negocio.
- **Recomendación:** registrar un `AccessDeniedHandler` que responda 403 y permitir `/error`; en el frontend, mostrar un aviso ante un 403. Es requisito para que las pruebas negativas de permisos no cierren la sesión.
- **Decisión (17 oct):** responder 403 y mostrar un aviso, sin cerrar la sesión.

### C-21 · Exportar la nómina del servicio

- **Archivo:** §6.15 «Botón de exportación en el calendario (`calendarView.jsx`) y en la vista de funcionarios de un servicio.».
- **Código hoy:** ninguna vista llama a `/exportaciones/servicios/{id}/funcionarios/csv`.
- **Recomendación:** agregar el botón en Personal del servicio o corregir el Archivo.
- **Decisión (17 oct):** agregar el botón en Personal del servicio.

### C-22 · Eliminar turnos generados: lo que promete la pantalla y lo que hace el backend

- **Pantalla** (`EliminarTurnosSheet`): «No afecta otros moldes ni turnos fuera del rango.».
- **Archivo:** RN-SGT-013 «Eliminar los turnos generados de una planificación en un rango de fechas puede afectar turnos de otra planificación que comparta la misma rotativa en ese rango (riesgo reconocido en el propio código)».
- **Código hoy:** `PlanificacionService.eliminarTurnosGenerados` borra por las rotativas del molde dentro del rango (`softDeleteByRotativasAndRango`): incluye turnos de otros moldes y turnos manuales o del seed con esas rotativas, y no anula la vigencia activa.
- **Recomendación:** corregir el texto de la pantalla, o limitar el borrado a los turnos sin ejecución (los legados), como sugiere el propio Archivo.
- **Decisión (17 oct):** corregir el texto de la pantalla y anotarlo como limitación. Limitar el borrado queda para TIC.

### C-23 · ¿La jefatura suma funcionarios a su servicio?

- **Manual:** MF-020 «Asociar un funcionario (buscado por nombre/RUT) a un servicio | Administrador».
- **Archivo:** §6.3 «Administrador (cualquier servicio); Jefatura (solo su propio servicio, y solo puede designar Subrogante, no Jefatura).» y «Panel Jefatura → equivalentes restringidos (`AsignacionJefaturaView.jsx`, `JerarquiaJefaturaView.jsx`).».
- **Código hoy:** el panel de jefatura y el menú desktop ofrecen «Asignación de Funcionarios» (`AsignacionJefaturaView`), y `POST /funcionarios/register/{rut}` acepta a la JEFATURA. Pero `FuncionarioController.update` dice «SEC: JEFATURA/SUBROGANTE editando a OTRO funcionario (no a sí mismos) deben verificar que ese funcionario pertenezca a su propio servicio — en BD, no por lo que diga el cliente.», y a quien todavía no es del servicio le responde 403 «No tienes permiso para modificar a un funcionario de otro servicio». La pantalla muestra «No se pudo completar la asignación. Intenta de nuevo.» y la persona, si no estaba en el SGT, queda registrada sin servicio. Solo lo logran las jefaturas que además son administradoras. No verificado en ejecución.
- **Pregunta:** ¿La jefatura puede sumar a su servicio a alguien que todavía no está en él, o eso queda solo para el administrador?
- **Recomendación:** si la jefatura debe poder, permitir en el backend que cree la relación con el servicio de su sesión y rol MEDICO cuando la persona no tiene relación con él, sin tocar otras relaciones ni roles (y resolver C-19 en el mismo cambio). Si no, quitarle el módulo y el ítem del menú y corregir el Archivo. En los dos casos, no registrar a la persona si la asignación no se va a completar.
- **Decisión (17 oct):** sí: la jefatura suma a su servicio, como Médico, a quien no está en él, sin tocar otros roles. Si ya pertenece, se avisa y no se cambia su rol (C-19).

### 5.1 Otras brechas del código que ningún documento contradice

Decisión P-01 (Álvaro, 17 oct): todas se corrigen antes del congelamiento, en móvil y desktop.

Estado al 22 oct: todas se corrigieron en el cierre (17 al 19 oct), salvo dos. Queda el seed de notificaciones con estados que el código no reconoce (la bandeja está oculta, C-09). Y `crearOferta` no comprueba que el turno esté libre de otras solicitudes (ver HU-SOL-13). Más pendientes para TIC: `docs/TRASPASO.md` §11. La lista que sigue es la de las brechas encontradas hasta el 17 oct.

- `SolicitudService.crearSolicitud` no comprueba que el turno a botar, ofrecer o entregar sea del solicitante, ni que el turno no haya pasado (tipos 2 a 5).
- `OfertaGeneralService.crearOferta` no comprueba que el turno sea del ofertor ni que esté libre de otras solicitudes.
- Aprobar un «Botar turno» o una «Oferta particular», o seleccionar al postulante de una oferta general, no revisa que el turno siga siendo de quien lo comprometió: si cambió de dueño entre medio (por una asignación manual u otra aprobación), se libera o se entrega el turno de un tercero. Cobertura e Intercambio sí lo revisan (`SolicitudService.cambiarEstado`, `OfertaGeneralService.seleccionarPostulante`). La asignación manual tampoco cierra las solicitudes pendientes sobre ese turno (`GestionTurnoService`).
- Las ofertas generales no tienen la segregación de funciones de las solicitudes (H-07): una jefatura puede abrir su propia oferta y elegir al postulante (`OfertaGeneralService.aprobarOferta` y `seleccionarPostulante`; en la interfaz, `evaluarOferta`).
- `SolicitudService.cambiarEstado` con RECHAZADA no exige que la solicitud siga PENDIENTE. `responderOfertaIntercambio` y `responderOfertaParticular` tampoco: el receptor puede rechazar por API una solicitud ya aprobada, o cambiar su respuesta (HU-SOL-08).
- El selector de Cobertura lista cupos ya pasados (HU-SOL-05).
- `TurnoController.alterarTurno` responde 500 al cruce de horario (`GestionTurnoService.validarConflictoFuncionario` lanza `Exception`) y 400 a la negación por servicio (captura toda `RuntimeException`, también la `AccessDeniedException`).
- Crear un tipo de turno con el nombre de uno eliminado del mismo servicio choca con la clave única de la base, que incluye los eliminados (HU-ADM-06; no verificado en ejecución).
- El aviso «N turnos libres en agenda» cuenta también los cupos que ya pasaron (HU-CAL-01).
- Los errores de ofertas y del motivo se muestran genéricos, sin el mensaje del backend (`SolicitudesView`: `handlePostular`, `handleOfertaAprobar`, `handleSeleccionar`, `EditMotivoSheet`).
- Hay textos con errores: voseo («¿Qué tipo de solicitud necesitás?», «Describí el motivo...», «No se pudo guardar. Intentá de nuevo.») y «1 notificacion sin leer», sin tilde en singular (`AgendaView`, aviso superior).
- Mi dashboard llama «horas» a la suma de todos los turnos del período, incluidos los futuros y los de otros servicios.
- El seed de notificaciones de Medicina Interna usa estados que el código no reconoce (HU-NOT-01).

Encontradas por la E2E de la fase 1 (17 oct 2026), confirmadas en el código:

- `mapTurnoCalendario` (`turnosService.js:135`) no copia `horas` ni `solicitudPendiente`. Abierto desde el calendario, el detalle del turno no muestra la Duración y un turno con solicitud pendiente dice «Tu turno» (HU-DET-01, criterio 2). Por la misma causa, probablemente fallan «Ya solicitaste este turno» desde el calendario (HU-DET-02, criterio 2) y la marca «Solicitado» del calendario desktop. Arreglo: copiar ambos campos como lo hace el mapeo de la agenda (`funcionarioService.js:130` y `:144`).
- Después de refrescar, «Cambiar servicio» lista los servicios sin el rol: `Prop4.jsx:272` lee `s.rol` y `user_data.servicios` trae `rolServicioNombre` (HU-AUT-05, criterio 3).
- La bandeja móvil de notificaciones dice «1 recibidas» (`NotificationView.jsx:199`).
- La bitácora lista una cancelación como «{tipo} · RECHAZADA»; solo el motivo dice que la canceló el solicitante (HU-BIT-01, criterio 4).

Encontradas por la E2E de la fase 3 (17 oct 2026), confirmadas en el código:

- Con mi turno comprometido, el asistente de intercambio nunca muestra el mensaje de R15, que pide cancelar (HU-SOL-06, criterio 5; HU-SOL-13, criterio 2). `/turnos/intercambiables` devuelve una lista vacía sin decir por qué (`TurnoService.java:474-477`), y la nota del asistente enumera cuatro causas posibles. Arreglo: que el endpoint responda el motivo (el mensaje de `SolicitudService.java:134-138`) y que el asistente lo muestre.
- «Disponibles» (R9) y el selector de Cobertura ofrecen la noche que termina la mañana de un turno de día propio, y el backend la rechaza por R13 (HU-CAL-02, HU-SOL-05). Arreglo: sumar ese caso a `esDisponibleParaMi` (`AgendaView.jsx:313-316`) y filtrar igual el selector.
- El ofertor no puede retirar una oferta general: `OfertaGeneralController` no tiene una ruta para eso. La oferta queda pendiente hasta que la gestión la abra o la rechace (HU-OFE-01).
- El mensaje de R13 muestra las fechas en formato ISO, como «2026-10-20T20:00»: `ValidadorAsignacionTurnoService.java:82-84` concatena los `LocalDateTime`.
- En móvil, el paso 2 de «Oferta general» muestra el botón de volver sin el nombre del tipo: `TIPO_LABEL` (`SolicitudesView.jsx:15`) no tiene el tipo 6 (`:798`).
- «Cupo libre — falta cubrir» es una rama que nunca se usa (HU-DET-02, criterio 3).

Encontradas por la E2E de la fase 4 (17 oct 2026), confirmadas en el código:

- En desktop, a la jefatura dueña de uno de los turnos de una solicitud, sin ser solicitante ni receptora, la vista le ofrece «Aprobar» y «Rechazar» y no le muestra «Participas en esta solicitud…» (HU-SOL-09, criterio 6). `participa` (`SolicitudesView.jsx:1257`) mira solo al solicitante y al receptor; el backend cuenta además a los dueños de los turnos (`SolicitudService.participantesDirectos`, `:509-520`) y responde 403 al aprobar.
- Cuando el backend rechaza la selección de un postulante por la regla (solape o R13), la pantalla muestra «Error al seleccionar postulante.» y no el mensaje (`handleSeleccionar`, `SolicitudesView.jsx:1170-1173`; HU-OFE-04, criterio 3).
- Las confirmaciones de la asignación de turnos muestran la fecha en ISO, como «Día · 2026-10-19 08:00–20:00» (`formatShiftLabel`).

---

## 6. Orden sugerido para automatizar las pruebas

### 6.1 Antes de la primera corrida

1. **Ambiente:** `docker compose -f docker-compose.local.yml --env-file .env.local up -d db backend`, después `bash scripts/generar_turnos_demo.sh` y el frontend en `http://localhost:5173`, con `localhost` y no `127.0.0.1`: es el origen que admite el CORS del backend local, como advierte `playwright.config.js`. Son los pasos 1 y 2 de R18, «Cómo probarlo».
2. **Foto de la base:** recién generados los turnos, sacar un respaldo de `gestionturnos` e `innhosp` para restaurar entre grupos sin regenerar: `docker exec huap-db-local sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --databases gestionturnos innhosp --skip-dump-date 2>/dev/null' > base-pristina.sql`. Para restaurar: `docker exec -i huap-db-local sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" 2>/dev/null' < base-pristina.sql` y después `docker restart huap-backend-local`, porque el backend guarda datos en una caché en memoria. El respaldo de `scripts/backup_mysql.sh` apunta al compose de Hetzner. La alternativa completa es `down -v`, levantar de nuevo y volver a generar; `03_fechas_relativas.sql` recalcula las fechas al crear el volumen.
3. **Hora:** el backend de `docker-compose.local.yml` ya corre con la hora de Chile (la imagen fija `TZ=America/Santiago`, 17 oct). En el navegador, fijar el reloj con `page.clock`, como hace `pantallas.spec.js`.
4. **Usuarios:** los de §2. No usar al funcionario 4 ni los datos ligados a él (§7).
5. **Pruebas de una en una:** `workers: 1`, como ya está en `playwright.config.js`.

### 6.2 Fases

| Fase | Qué | HU | Muta |
|---|---|---|---|
| 1 | Solo lectura por la interfaz, móvil y desktop | AUT-01 (sin el bloqueo), AUT-02 a AUT-06, PEN-01, PRF-01, PAN-01 a PAN-03, CAL-01, CAL-02 (criterio 1), CAL-05 (navegación), CAL-06, CAL-08, DET-01, DET-03 (sin enviar), SOL-01 (con GET simulados), SOL-02 (lectura), OFE-05, NOT-01, ASG-01, PER-01, EST-01, BIT-01, AUD-01, ADM-01, ADM-03, DSH-01, REG-02 (abrir y cancelar) | No |
| 2a | Negativos de permiso que niega el controller: responden 403 (o 400, en los casos que la HU indica) sin cerrar la sesión. Sirven las solicitudes 14 (APROBADA) y 15 (PENDIENTE) del seed de Urgencias, que no son del médico 369 | AUT-02 (criterio 6), AUT-07 (criterio 3), CAL-08 (criterio 4), NOT-01 (criterio 5), PER-01 (criterio 4), SOL-08 (criterio 4), SOL-11 (criterio 6, solicitud ajena), SOL-12 (criterio 4), OFE-02 (criterio 3), ASG-02 (criterio 5), lecturas de C-17 (corregidas el 17 oct: la prueba verifica que se niegan) | No (JER-02, criterio 2, ya no muta) |
| 2b | Negativos que niega el filtro de seguridad: responden 403 y no cierran la sesión (C-20, 17 oct) | AUT-07 (criterio 4), ASG-05 (criterio 2), SOL-09 (criterio 8, el médico), PUE-01 (criterio 5), ADM-02 (criterio 4), ADM-06 (criterio 4) | No |
| 3 | Mutaciones de un solo usuario que se deshacen en la misma prueba (crear y cancelar) | SOL-03, SOL-04, SOL-05, SOL-11, SOL-12, SOL-13, SOL-14 (criterios 1 a 3), DET-02, CAL-03, OFE-01 | Sí: deja solicitudes RECHAZADAS y, según la prueba, ofertas generales pendientes de apertura (el ofertor ya puede retirarlas, C-16). Restaurar al final de la fase |
| 4 | Flujos de dos o tres usuarios con aprobación (mueven turnos) | SOL-06 a SOL-10, OFE-01 (criterios 3 y 4, 20 oct), OFE-02 a OFE-04, SOL-14 (criterios 4 y 5), ASG-02, ASG-03, NOT-02 | Sí: restaurar antes de la fase 5 |
| 5 | Mantenedores del servicio (no automatizada) | PUE-01, REG-01, PER-02, JER-01, JER-02, JER-03 | Sí: restaurar |
| 6 | Administración global, al final (no automatizada) | ADM-02, ADM-04 a ADM-07, ADM-09 a ADM-11, ADM-13 | Sí: restauración completa (`down -v`, levantar y generar) |
| — | Solo por API hasta que tengan pantalla | ASG-04, ADM-08, ADM-12 | Según el caso |
| — | Retiradas o apagadas por decisión | CAL-04 (retirada, C-05), NOT-01 a NOT-03 (bandeja oculta, C-09) | — |

**Avance (17 oct 2026):** la fase 1 está automatizada en `sgt-huap_frontend/e2e/hu/` (7 specs; base común en `e2e/helpers/hu.js` y `e2e/helpers/datos.js`). Son 155 pruebas por proyecto, en `movil` y `desktop`, todas en verde. Las fallas conocidas se marcan con `fallaConocida('C-xx: …')` y las nuevas con `fallaNueva(…)`: la suite queda verde y avisa cuando una se corrige, porque la prueba pasa a «unexpected pass». Con `SGT_VER_FALLAS=1` corren como pruebas normales. Una guarda corta en el navegador toda escritura a la API. Se corre de día. Si `/tmp` es un tmpfs chico, `TMPDIR` debe apuntar a disco, porque Chromium guarda ahí su memoria compartida:

```bash
TMPDIR=~/.cache/sgt-pw-tmp npx playwright test e2e/hu/ --project=movil --project=desktop --reporter=line
```

La barra final importa: Playwright toma el filtro como expresión regular, y `e2e/hu` abarca también `e2e/hu-muta/` (fase 3). Quedaron sin automatizar AUT-01 (criterio 6: el seed no tiene un funcionario sin servicios) y AUT-02 (criterio 5: exige esperar 5 minutos reales). Los estados que el seed no tiene se prueban con respuestas GET simuladas en el navegador.

**Fase 2a (17 oct 2026):** `e2e/hu/permisos.spec.js` cubre los criterios de la fila 2a y `e2e/hu/lecturas-c17.spec.js` las lecturas de C-17. Son 53 pruebas por proyecto. Las que solo usan la API corren una vez, en `desktop`. Cada prueba de C-17 hace antes una lectura legítima de control, para que un cambio de ruta no quede escondido en la falla esperada. Antes de cada escritura que debe ser negada, la prueba confirma los datos que la hacen inválida. Con la fase 1, la suite completa queda en verde (323 pasan, de ellas 62 fallas esperadas: 24 de la fase 1 y 38 de la 2a; 93 omitidas) y la base, igual a la pristina. Sin automatizar: JER-02 (criterio 2), porque hoy muta (C-03); SOL-11 (criterio 6, «ya resuelta»), porque ese mensaje solo le llega al emisor y crear una resuelta muta (fase 3); y las excepciones del administrador que escriben (SOL-12, criterio 4; ASG-02, criterio 5). Ninguno de la fila resultó ser de la 2b: todos se niegan dentro del controller o del service. Caben también en la 2a, sin mutar, la mitad «otro servicio» de SOL-09 (criterio 8) y OFE-02 (criterio 2).

**Fase 3 (17 oct 2026):** está en `sgt-huap_frontend/e2e/hu-muta/` (4 specs), con `testMuta`, una variante de la base común que deja escribir y anota cada escritura en la prueba. Cada prueba deshace lo suyo. Si algo queda pendiente, una red de seguridad lo cancela y hace fallar la prueba. Las solicitudes canceladas quedan RECHAZADAS, y las ofertas generales, pendientes de apertura (su ofertor no puede retirarlas, §5.1). Sin `SGT_MUTA=1` estas pruebas se omiten, y no corren contra un servidor que no sea el local: `npx playwright test` no escribe en la base. Son 49 pruebas por proyecto. En `movil` pasan 39 y se omiten 10; en `desktop` pasan 40 y se omiten 9. Entre las que pasan hay 4 fallas esperadas por proyecto: dos de HU-SOL-05, la de HU-DET-02 desde el calendario y la de HU-SOL-13 por la interfaz. Dos corridas seguidas, sin restaurar entre ellas, quedan en verde. Cada corrida deja 2 ofertas generales sobre turnos futuros del médico 369, y esos turnos alcanzan para unas 7 corridas. Antes de correr `e2e/hu/` hay que restaurar la base (§6.1, paso 2) y reiniciar el backend, que guarda datos en caché:

```bash
SGT_MUTA=1 TMPDIR=~/.cache/sgt-pw-tmp npx playwright test e2e/hu-muta/ --project=movil --project=desktop --reporter=line
```

Quedaron para la fase 4, que los automatizó:

- SOL-03 (criterio 5).
- La mitad «al aprobarse» de SOL-04 y SOL-05 (criterio 2).
- SOL-11 (criterio 5 en móvil).
- SOL-13 (criterio 3, «si rechazaron»).
- SOL-14 (criterios 4 y 5).
- La apertura real de OFE-01 (criterio 2), que aquí se prueba con una respuesta GET simulada.

No se automatizan DET-02 (criterio 3), porque el estado no se produce, ni la regla de 12 horas, que R13 reemplazó (C-04).

**Fase 4 (17 oct 2026):** cinco specs más en `e2e/hu-muta/`, con flujos de dos o tres usuarios: `aprobaciones.spec.js` (SOL-09, SOL-10 y lo que dejó la fase 3), `propuestas.spec.js` (SOL-06 a SOL-08 y SOL-14, criterio 4), `ofertas-generales.spec.js` (la apertura real de OFE-01, y OFE-02 a OFE-04), `asignacion.spec.js` (ASG-02, ASG-03 y SOL-14, criterio 5) y `notificaciones.spec.js` (NOT-02). Sin mutar, `e2e/hu/permisos.spec.js` suma la mitad «otro servicio» de SOL-09 (criterio 8) y OFE-02 (criterio 2). Los turnos que una prueba mueve vuelven a su dueño con la asignación directa de la jefatura. La red de seguridad rechaza las ofertas propias que queden pendientes, devuelve los turnos y elimina las notificaciones creadas, y si tiene que actuar, la prueba falla. Lo que no se deshace queda como filas nuevas: ninguna fila previa cambia y `Turnos` queda igual. Dos corridas seguidas dejaron 266 solicitudes (234 RECHAZADAS y 32 APROBADAS, ninguna pendiente), 48 ofertas (40 cerradas, 4 rechazadas y las 4 pendientes de la fase 3), 44 postulaciones, 276 notificaciones (268 del sistema, por las asignaciones directas, y 8 eliminadas) y 1.018 eventos de bitácora.

Con la fase 3, `e2e/hu-muta/` tiene 104 pruebas por proyecto. En `movil` pasan 88 y se omiten 16; en `desktop` pasan 94 y se omiten 10. Entre las que pasan hay fallas esperadas: las 4 de la fase 3 por proyecto; SOL-14 (criterio 5, C-04) y OFE-04 (criterio 3, en pantalla) en los dos proyectos, y SOL-09 (criterio 6) en desktop. Las omitidas son entradas que solo remiten a otras pruebas, lo que corre solo por API (una vez, en `desktop`) y lo propio de un solo layout. Dos corridas seguidas, sin restaurar entre ellas, quedan en verde: 182 pasan y 26 se omiten, en unos 22 minutos cada una. Si el equipo se suspende a mitad de una corrida, Vite recarga la página y la prueba en curso falla: es del ambiente, no de la app. Sin automatizar:

- SOL-09 (criterio 8, la negativa del médico por API): es de la fase 2b.
- SOL-06 (criterio 2) con una lista vacía real: se simula, porque el caso real ya lo cubre la fase 3.
- ASG-02 (criterio 4, «no pertenece al servicio») por la interfaz, porque el panel lista solo al personal del servicio: se prueba por API.

**Estado al 22 de octubre de 2026:**

- Las fases 1, 2a, 2b, 3 y 4 están automatizadas: `e2e/hu/` (9 specs) y `e2e/hu-muta/` (9 specs). La 2b se cumplió con C-20: sus negativos responden 403 y no cierran la sesión. Los párrafos de avance de arriba son del 17 oct y describen las fallas que había entonces.
- **Las fases 5 y 6 no se automatizaron:** mantenedores del servicio (PUE-01, REG-01, PER-02, JER-01, JER-02, JER-03) y administración global (ADM-02, ADM-04 a ADM-07, ADM-09 a ADM-11, ADM-13). De ellas, `e2e/hu/` cubre solo las lecturas y los negativos de permiso por API (por ejemplo PUE-01 criterio 5, ADM-02 criterio 4, ADM-06 criterio 4 y JER-02 criterio 2). Las mutaciones se prueban a mano o con las pruebas integrales (`docs/qa/pruebas-integrales/`).
- La corrida completa más reciente de `e2e/hu/` es del 19 oct: en verde, con 191 pruebas pasando en desktop y 129 en móvil, y las fallas esperadas marcadas. De `e2e/hu-muta/` no hubo una corrida completa en verde con el código final: la completa del 19 oct tuvo 5 fallas por proyecto, previstas porque esas pruebas aún no recogían los cambios del cierre; se reescribieron y pasan al repetirlas por separado, pero después cambió un helper (`fotoDelDia`) y la suite completa no se volvió a correr. En `e2e/visual/` las fotos de referencia del autor están al día (no se versionan), sin una corrida final válida (la del 19 oct se cortó por una caída de la red).
- Marcas `fallaConocida` que quedan: HU-SOL-02 criterio 3 (filtro del administrador, C-17) y HU-AUD-01 criterio 4 (retirado por C-14).
- Después de la decisión del 20 oct sobre C-16 (el ofertor retira su oferta hasta que alguien postule), HU-OFE-01 suma los criterios 3 y 4 con pruebas nuevas en `e2e/hu-muta/ofertas-generales.spec.js` (con el backend real) y `crear-solicitudes.spec.js` (con ofertas simuladas), y la red de seguridad de `testMuta` retira también las ofertas abiertas sin postulaciones. Están escritas y no se han corrido.

### 6.3 HU que no se pueden probar de punta a punta sin arreglar algo antes

Estado al 22 oct: todas estas filas se resolvieron en el cierre (17 al 19 oct), salvo NOT-01 a NOT-03 (bandeja oculta, C-09), el seed de notificaciones y SOL-02 criterio 3 (filtro del administrador). ADM-10 y ADM-11 no eran un arreglo. La tabla conserva lo que impedía cada prueba el 17 oct.

| HU | Qué lo impide | Qué arreglar |
|---|---|---|
| NOT-03 | El backend no crea notificaciones, y las de asignación manual quedan sin destinatario | Agregar el destinatario a `Notificacion` y crear las notificaciones en `SolicitudService`, `OfertaGeneralService` y `GestionTurnoService` |
| NOT-01 (criterio 3), NOT-02 con los datos del administrador | Seed con estados `NO_LEIDA`/`LEIDA`: contador en 0 y la lista dice «Nueva» | Corregir `02_datos.sql` (`NO_LEIDO`/`LEIDO`) o probar con 30000013-3 |
| CAL-04 | El backend no envía `cambioAprobado` | Retirar el código del aviso (C-05, decidido) |
| CAL-07 | El backend niega la exportación al médico | Permitirla con el alcance forzado a sus turnos en `ExportacionController` (C-08, decidido) |
| DET-04 | «Ver historial» no filtra por turno y el backend se lo niega al médico | Usar `GET /bitacoras/turno/{id}`, solo con turnos propios para el médico (C-06, decidido) |
| ADM-06 y ADM-07 (casos de error) | La pantalla queda en blanco cuando el backend rechaza | Mostrar `e?.response?.data?.error` (un `mensajeDeError` común) en `TiposTurnoView` y `PlantillasView`; en rotativas, además, no recortar la secuencia al editar las semanas |
| JER-01 | Parte en «Jefatura», la jerarquía actual no reconoce `JEFATURA` y no recarga | Selección inicial «Subrogante», comparar con `JEFATURA` y recargar después de designar |
| ADM-05 | No recarga después de designar | Recargar los funcionarios después de designar |
| PER-02 (jefatura que no es administradora, como 305) | El backend niega la relación a quien todavía no es del servicio, y la persona queda registrada sin servicio | Permitirle crear la relación con su servicio, como Médico, sin tocar otros roles (C-23, decidido) |
| PER-02 y ADM-04 (criterio de quien ya pertenece) | Se sobrescribe el rol con MEDICO | No tocar el rol si ya pertenece (C-19) |
| ASG-02 (criterio 5) | `POST /turnos/alterar` responde 400, no 403, a la negación por servicio | Dejar pasar la `AccessDeniedException` al `GlobalExceptionHandler` y lanzar `RuntimeException` en el cruce de horario |
| ADM-06 (nombre de un tipo eliminado) | La clave única de la base incluye los eliminados (no verificado en ejecución) | Validar contra todos los tipos del servicio, o reactivar el eliminado |
| SOL-14 (criterio 5) | La asignación manual no aplica R13 | Usar `ValidadorAsignacionTurnoService` en `GestionTurnoService` (C-04) |
| JER-02 | El backend deja al subrogante cambiar roles | Negarlo en `FuncionarioController.update` (C-03) |
| REG-02 | No hay menú ni módulo | No se implementa: las reglas quedan para el administrador y se cierra el backend (C-10, decidido) |
| SOL-02 (criterio 3), BIT-01 (criterio 3) | Sin filtro por servicio | Filtrar por servicio en el backend (C-17) |
| DET-01 (criterio 2) y DET-02 (criterio 2) desde el calendario | `mapTurnoCalendario` no copia `horas` ni `solicitudPendiente` | Copiarlos como en `funcionarioService.js` (§5.1) |
| SOL-06 (criterio 5) y SOL-13 (criterio 2) por la interfaz | `/turnos/intercambiables` devuelve una lista vacía sin el motivo | Devolver el mensaje de R15 y mostrarlo en el asistente (§5.1) |
| SOL-09 (criterio 6) en desktop | `participa` no mira a los dueños de los turnos | Usar la misma regla que `participantesDirectos` (§5.1) |
| OFE-04 (criterio 3) en pantalla | `handleSeleccionar` muestra un error genérico | Mostrar el mensaje del backend (§5.1) |
| DET-02 (criterio 3) | El estado no se produce | Quitar la rama y el criterio, o definir cuándo un cupo se conoce solo por su conteo |
| OFE-05, SOL-05 | Ofertas y cupos pasados visibles | Filtrar por vigencia en Solicitudes y en el selector de Cobertura |
| AUD-01 (criterio 4) | No muestra al encargado | Corregir el manual (C-14, decidido) |
| ADM-09 (eliminar molde en móvil) | Borra sin confirmación | Agregar la confirmación que ya tiene desktop |
| ADM-13 (criterio 3) | El texto promete algo que el backend no cumple | Corregir el texto de la pantalla (C-22, decidido) |
| AUT-07 y todos los negativos por API que pasan por el filtro | BUG-001: 401 y cierre de sesión | `AccessDeniedHandler` 403 y `/error` permitido (C-20) |
| Todas las que dependen de «hoy» (futuros, R14, vigencias desde hoy, Generar) | Backend en UTC: de 21:00 a 24:00 se corre un día | `TZ=America/Santiago` en el backend |
| ADM-10 y ADM-11 | La vigencia demo ocupa 7 semanas | No es un arreglo: elegir un rango posterior o anularla antes, y restaurar después |

---

## 7. Pendiente de limpieza

- **El funcionario 4 del seed** (`gestionturnos` id 4; en `innhosp/02_datos.sql`, id_personal 14) tiene un RUT que podría ser real (el que termina en `***637-4`). No se usó en ninguna HU ni prueba de este catálogo. Hay que reemplazarlo por un RUT ficticio en `BaseDatosMySQL/desarrollo/gestionturnos/02_datos.sql` y en `BaseDatosMySQL/desarrollo/innhosp/02_datos.sql`, y revisar si quedó en el historial de git. Mientras tanto, las pruebas no deben usar a ese funcionario ni sus datos: las solicitudes 3 y 8, los turnos 3, 54 y 58, las notificaciones 3 y 8 ni los eventos de bitácora 3 y 8. Es miembro de Medicina Interna y de Cirugía, así que aparece en las listas de esos servicios (por ejemplo, al entrar con 11111113-3 o con el administrador): no elegirlo en ningún buscador.
- Los demás RUT del mismo bloque de Medicina Interna (`gestionturnos` ids 5 a 20; `innhosp` id_personal 15 a 30) tienen el mismo patrón: no son secuencias de prueba evidentes, como las de Urgencias. No se verificó si corresponden a personas reales; conviene revisarlos en la misma limpieza. Por eso las pruebas de este catálogo usan datos de Urgencias o datos creados en la prueba.
- Los RUT de Urgencias siguen una regla de prueba (3000xxxx, con el dígito verificador igual al último dígito), pero en 9 de los 80 esa regla coincide por azar con un RUT válido: 30000008-8, 30000017-7, 30000026-6, 30000035-5, 30000044-4, 30000053-3, 30000062-2, 30000071-1 y 30000080-0. Ninguno se usa para entrar en este catálogo. Conviene cambiarles el dígito en la misma limpieza. Todos los RUT de entrada de §2.1 tienen un dígito verificador inválido, salvo 11111111-1, el RUT de prueba de uso común.
- Los nombres del bloque de Urgencias (ids 300 a 379) parecen nombres de personas reales, no nombres de prueba. No se verificó si son personal del HUAP. Los RUT de ese bloque sí son ficticios. Si los nombres son reales, reemplazarlos antes de entregar el repositorio. Por eso este catálogo nombra a las personas solo por su id.

**Estado al 22 oct:** D-01 a D-03 se dejan como están (decisión del 17 oct). El seed de notificaciones sigue con `NO_LEIDA` y `LEIDA`. Lo demás de esta sección sigue abierto y pasa a TIC (`docs/TRASPASO.md` §11).

