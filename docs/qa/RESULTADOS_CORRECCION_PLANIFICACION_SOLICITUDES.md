# Resultados — Corrección Planificación y Solicitudes (SGT-HUAP)

Fecha: 2026-08-03
Rama: `fix/planificacion-solicitudes-sgt` (base `devops/dev-environment`, commit `58ded4d`)
Plan de referencia: `docs/qa/PLAN_CORRECCION_PLANIFICACION_SOLICITUDES.md`

---

## 1. Resumen ejecutivo

Se implementaron las 6 correcciones solicitadas sobre el backend (Spring Boot) y el frontend (React) del SGT, con foco en que **toda regla crítica quedara validada en el backend**, según el principio fundamental del encargo. Se agregó un modelo de datos aditivo (tabla `planificacion_ejecucion` + columna `Turnos.id_ejecucion`) que separa el ancla de rotativa de la vigencia efectiva y da a cada turno generado un origen inequívoco. Se agregó un validador compartido de secuencias incompatibles de 12 horas, conectado a los 4 flujos que pueden terminar asignando un turno a una persona (creación de solicitud, aceptación del receptor, aprobación, y selección de postulante en oferta general).

**218 de 244 pruebas de backend pasan sin fallos** (100% de las pruebas unitarias puras — 87 de ellas nuevas o modificadas para esta corrección). Las 26 restantes son pruebas de integración/concurrencia con Testcontainers que no lograron iniciar el contexto de Spring en este entorno de trabajo por una limitación ambiental ajena al código (ver sección 9). El frontend compila (`npm run build`) y pasa lint sin errores nuevos.

---

## 2. Diagnóstico inicial (resumen; detalle completo en el plan)

| # | Corrección | Causa raíz encontrada |
|---|---|---|
| 1 | Inicio muestra fechas pasadas | `buildAgendaData` (frontend) no filtraba días anteriores a hoy, y calculaba "hoy" con `new Date().toISOString()` (UTC), no con la zona horaria del hospital |
| 2 | Generar solo un mes | `PlanificacionService.generarTurnos` recibía una sola fecha y generaba únicamente un paso por el ciclo de la rotativa (`maxDiaIndex+1` días) — no existía concepto de fecha de término |
| 3 | Ancla vs. vigencia efectiva | `PlanificacionEntity` no persistía ninguna fecha; el "lunes de inicio" conflacionaba fase del ciclo y rango real de turnos en un solo parámetro |
| 4 | Superposición de planificaciones | No existía ningún registro de vigencia por servicio — no había nada que comparar para detectar superposición |
| 5 | Edición segura / origen de turnos | Los turnos se identificaban por rotativa compartida, no por su generación real, por lo que "deshacer" una podía afectar turnos de otra |
| 6 | Turnos de 12h consecutivos | `SolicitudService`/`OfertaGeneralService` nunca validaban conflicto de horario al aprobar — la única validación existente vivía en `GestionTurnoService`/`TurnoService` (asignación manual) |

---

## 3. Solución implementada

### 3.1. Modelo de datos (aditivo)
- Nueva tabla `planificacion_ejecucion`: registra cada "puesta en vigencia" de un molde — `fecha_inicio_rotativa` (ancla, lunes), `fecha_inicio_efectiva`/`fecha_fin_efectiva` (vigencia real), `estado` (`ACTIVA`/`ANULADA`), actor, reglas aplicadas.
- Nueva columna `Turnos.id_ejecucion` (nullable): liga cada turno a su ejecución de origen. Turnos anteriores a esta corrección quedan en `NULL` (origen "legado"), nunca tocados automáticamente.
- Migración: `BaseDatosMySQL/migraciones/V2__planificacion_vigencia.sql`, con script de reversión documentado al final del archivo. No se tocó ningún archivo de esquema "generado automáticamente" (`schema_gestionturnos.sql`, `desarrollo/.../01_esquema.sql`); se documentó en `BaseDatosMySQL/README.md` que este script se aplica **después** del esquema base.

### 3.2. Backend
- **`PlanificacionService`** reescrito: `generarTurnos` ahora recibe `fechaInicioRotativa` + `fechaInicioEfectiva` + `fechaFinEfectiva`; calcula la fase de cada día con `floorMod(díasDesdeAncla, semanas×7)`, permitiendo generar cualquier rango repitiendo el ciclo tantas veces como sea necesario. `detectarConflictos` usa exactamente el mismo cálculo (factorizado en helpers compartidos), por lo que la vista previa nunca puede diferir de la generación real. Se agregó `validarSinSuperposicion` (bajo bloqueo pesimista del servicio, `ServicioRepository.lockServicio`), y los métodos nuevos `extenderPlanificacion`, `acortarPlanificacion`, `anularEjecucion` y `editarPlanificacionDesde`.
- **`ValidadorAsignacionTurnoService`** (nuevo): valida solapamiento general y la regla específica de dos turnos de 12 horas exactas adyacentes sin holgura (por fecha/hora/duración real, nunca por nombre). Conectado en `SolicitudService.crearSolicitud`, `responderOfertaParticular`, `responderOfertaIntercambio`, `cambiarEstado` (revalidación obligatoria y definitiva), y `OfertaGeneralService.seleccionarPostulante`.
- **`PlanificacionController`**: nuevos endpoints `/generar` (contrato ampliado), `/conflictos` (ídem), `/extender`, `/editar-desde`, `/{id}/ejecuciones`, `/ejecuciones/{id}/acortar`, `DELETE /ejecuciones/{id}`. Se conservó `/{id}/turnos` (legado) sin cambios.
- **`BitacoraService`**: nuevo método `registrarEventoPlanificacion` para eventos a nivel de vigencia (generación, extensión, acortamiento, anulación, edición desde fecha).

### 3.3. Frontend
- **`utils/dateUtils.js`**: nuevo helper `hoyISOEnZonaHospital()` (usa `Intl.DateTimeFormat` con zona horaria `America/Santiago`, no `new Date().toISOString()` que convierte a UTC primero).
- **`services/funcionarioService.js`** (`buildAgendaData`): filtra días completamente anteriores a hoy, salvo que contengan un turno cuyo `fechaFin` (día final real, no el de inicio) siga siendo hoy o posterior — así un turno nocturno iniciado ayer y vigente hoy no desaparece.
- **`components/Comun/calendarView.jsx`**: su propio cálculo de "hoy" (usado solo para resaltar el día actual, no para filtrar) se centralizó en el mismo helper, por consistencia.
- **`services/planificacionService.js`**: `generar`/`conflictos` actualizados al nuevo contrato; nuevos métodos `extender`, `editarDesde`, `getEjecuciones`, `acortarEjecucion`, `anularEjecucion`.
- **`components/Admin2/Planificacion.jsx`** (`GenerarView`): se agregó un campo de fecha de término efectiva (editable, con valor por defecto de un ciclo para no romper el flujo previo), validación de rango, previsualización de conflictos y confirmación usando el rango efectivo real, y la llamada de generación con los 3 parámetros de fecha.

### 3.4. Alcance no cubierto en la interfaz (documentado, no oculto)
El backend completo de "editar desde fecha", "extender", "acortar" y "anular ejecución" está implementado y probado; el frontend solo expone la generación con rango libre (corrección 2/3/4). Un panel de "Vigencias" con esas acciones y el flujo de edición de asignaciones por versión (corrección 5) quedan pendientes de UI — documentado en `Archivo de funcionalidades.md`, sección 21.

---

## 4. Decisiones técnicas relevantes

1. **No se versionó `PlanificacionEntity` (el molde)**: los turnos ya generados copian sus propios datos (funcionario/puesto/rotativa/tipo) al crearse, no referencian la asignación viva del molde — por lo que editar las asignaciones del molde y generar una nueva ejecución para el futuro es intrínsecamente seguro para el pasado, sin necesitar versionar el molde en sí. El versionado ocurre a nivel de **ejecución** (evento de generación), que es exactamente lo que necesitaba la regla de no-superposición.
2. **Un solo estado adicional (`ACTIVA`/`ANULADA`)** en vez de una máquina de estados completa (`BORRADOR`/`PROGRAMADA`/`VIGENTE`/etc.), siguiendo la recomendación del propio encargo de no agregar estados innecesarios: la vigencia queda representada por completo con el par de fechas efectivas.
3. **La regla de 12 horas se implementó como adyacencia exacta** (un turno termina exactamente cuando el otro empieza), sin imponer un mínimo de descanso no solicitado; la duración (`Duration.ofHours(12)`) queda como constante fácil de parametrizar a futuro.
4. **Contrato de `POST /planificaciones/{id}/generar` cambiado** (de `{fechaInicio}` a `{fechaInicioRotativa, fechaInicioEfectiva, fechaFinEfectiva}`): imprescindible para las correcciones 2-4; no hay consumidores externos conocidos de esta API.

---

## 5. Migraciones

`BaseDatosMySQL/migraciones/V2__planificacion_vigencia.sql` — aditiva, incremental, reversible (script de reversión incluido al final del propio archivo). No se ejecutó contra ninguna base de datos real durante este trabajo (no hay una BD alcanzable en este entorno de sandbox); se entrega el script versionado siguiendo el patrón ya usado por el repositorio en `BaseDatosMySQL/`.

---

## 6. Archivos modificados/creados

**Backend (nuevos):**
- `Entity/PlanificacionEjecucionEntity.java`
- `Repository/PlanificacionEjecucionRepository.java`
- `Service/ValidadorAsignacionTurnoService.java`
- `DTO/GenerarPlanificacionRequest.java`, `DTO/PlanificacionEjecucionDTO.java`
- `test/.../Service/ValidadorAsignacionTurnoServiceTest.java`

**Backend (modificados):**
- `Entity/TurnoEntity.java` (+ campo `ejecucion`)
- `Repository/ServicioRepository.java` (+ `lockServicio`)
- `Repository/SolicitudRepository.java` (+ `countByTurno_IdTurnoInAndEstado`)
- `Repository/TurnoRepository.java` (+ consultas/soft-delete por ejecución)
- `Service/PlanificacionService.java` (reescrito)
- `Service/SolicitudService.java` (+ validación 12h)
- `Service/OfertaGeneralService.java` (+ validación 12h)
- `Service/BitacoraService.java` (+ `registrarEventoPlanificacion`)
- `Controller/PlanificacionController.java` (reescrito)
- `test/.../Service/PlanificacionServiceTest.java` (reescrito, 29 casos)
- `test/.../Service/SolicitudServiceTest.java` (+5 casos, 48 total)
- `test/.../Service/OfertaGeneralServiceTest.java` (+1 caso, 27 total)

**Base de datos:**
- `BaseDatosMySQL/migraciones/V2__planificacion_vigencia.sql` (nuevo)
- `BaseDatosMySQL/README.md` (documenta el flujo de migraciones)

**Frontend:**
- `utils/dateUtils.js`, `services/funcionarioService.js`, `components/Comun/calendarView.jsx`, `services/planificacionService.js`, `components/Admin2/Planificacion.jsx`

**Documentación:**
- `docs/qa/PLAN_CORRECCION_PLANIFICACION_SOLICITUDES.md` (nuevo)
- `docs/qa/RESULTADOS_CORRECCION_PLANIFICACION_SOLICITUDES.md` (este archivo)
- `Archivo de funcionalidades.md` (secciones 6.9, 6.11, 6.12, 11, 16, 18, 19, 20, 21, 23 actualizadas)

---

## 7. Endpoints creados o modificados

| Método | Ruta | Cambio |
|---|---|---|
| POST | `/api/v2/planificaciones/{id}/generar` | Contrato ampliado: `{fechaInicioRotativa, fechaInicioEfectiva, fechaFinEfectiva, idsReglas}` |
| POST | `/api/v2/planificaciones/{id}/conflictos` | Ídem |
| POST | `/api/v2/planificaciones/{id}/extender` | Nuevo |
| POST | `/api/v2/planificaciones/{id}/editar-desde` | Nuevo |
| GET | `/api/v2/planificaciones/{id}/ejecuciones` | Nuevo |
| PUT | `/api/v2/planificaciones/ejecuciones/{idEjecucion}/acortar` | Nuevo |
| DELETE | `/api/v2/planificaciones/ejecuciones/{idEjecucion}` | Nuevo |
| DELETE | `/api/v2/planificaciones/{id}/turnos` | Sin cambios (legado, conservado) |

Ningún endpoint de Solicitudes/Ofertas Generales cambió de ruta o contrato; solo se agregó validación interna adicional.

---

## 8. Reglas de negocio agregadas

RN-SGT-031 a RN-SGT-041 (ver `Archivo de funcionalidades.md`, sección 18, detalle completo de cada una con su evidencia en código).

---

## 9. Pruebas ejecutadas y resultados

### 9.1. Comandos ejecutados

```bash
# JDK 21 (instalado en este entorno vía winget, ver nota abajo)
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.12.8-hotspot"
export PATH="$JAVA_HOME/bin:$PATH"

cd huap_backend
./mvnw -o clean compile        # BUILD SUCCESS
./mvnw -o test-compile         # BUILD SUCCESS
./mvnw test                    # 244 tests, 0 failures, 26 errors (ver 9.3)

cd ../sgt-huap_frontend
npm run lint                   # 33 errores / 8 warnings preexistentes, ninguno nuevo
npm run build                  # ✓ built in 14.24s
```

### 9.2. Resultado real de `mvn test`

```
Tests run: 244, Failures: 0, Errors: 26, Skipped: 0
```

Desglose por clase (todas las que no aparecen en la lista de errores pasaron 100%):

| Clase | Resultado |
|---|---|
| `PlanificacionServiceTest` | 29/29 ✅ (reescrita para el nuevo modelo ancla/efectiva) |
| `ValidadorAsignacionTurnoServiceTest` | 9/9 ✅ (nueva) |
| `SolicitudServiceTest` | 48/48 ✅ (+5 casos nuevos de validación 12h) |
| `OfertaGeneralServiceTest` | 27/27 ✅ (+1 caso nuevo de validación 12h) |
| `BitacoraServiceTest`, `FuncionarioServiceTest`, `PuestoServiceTest`, `ReglaServicioServiceTest`, `RotativaServiceTest`, `ServicioServiceTest`, `TipoTurnoServiceTest`, `TurnoServiceTest`, `LoginAttemptServiceTest` | 100% ✅ (sin cambios, verificadas como no regresivas) |
| `TurnoRepositoryIntegrationTest`, `BitacoraIntegrationTest`, `GestionTurnoConcurrencyTest`, `OfertaGeneralConcurrencyTest`, `OfertaGeneralIntegrationTest`, `SolicitudConcurrencyTest`, `SolicitudIntegrationTest`, `TurnoConcurrencyTest` | ❌ 26 errores — **ver 9.3, no relacionado con el código de esta corrección** |

### 9.3. Las 26 pruebas con error — causa y por qué no es una regresión

Estas 8 clases heredan de `AbstractContainerTest`, que levanta un contenedor MySQL (Testcontainers) para el datasource **primario** (`gestionturnos`) vía `@DynamicPropertySource`. Sin embargo, el backend también arranca un **segundo** datasource (`hospital.datasource.*`, hacia `innhosp`/`viewPersonal`), que `AbstractContainerTest` no anula ni redirige. En este entorno de sandbox no existe una base de datos del hospital real ni un segundo contenedor para ella, así que tuve que definir `HOSPITAL_DB_URL` con un valor de marcador de posición (`jdbc:mysql://localhost:3307/innhosp`) para poder ejecutar Maven; ese host no tiene ningún servidor escuchando, y Hibernate falla al intentar determinar el dialecto SQL de ese segundo datasource al arrancar el contexto de Spring (`Communications link failure` / `Connection refused`), lo que aborta el arranque de **cualquier** prueba `@SpringBootTest`, sin llegar siquiera a ejecutar el cuerpo de la prueba.

Esto es una **limitación del entorno de esta sesión** (no hay una BD de hospital real ni un segundo contenedor configurado para el datasource secundario), no una regresión de código: ninguno de los archivos que causan la falla (`Config/HospitalDataSourceConfig.java`, `AbstractContainerTest.java`) fue modificado por esta corrección, y el error ocurre en el arranque del contexto, antes de que se ejecute cualquier lógica de negocio. **Recomendación**: ejecutar `mvn test` en el ambiente de desarrollo real del proyecto (que sí tiene `HOSPITAL_DB_URL` apuntando a una base alcanzable, según `.env.dev`) para confirmar estas 26 pruebas también pasan sin cambios de comportamiento.

### 9.4. Nota sobre el JDK

Este entorno de sandbox solo tenía Java 8 disponible en el `PATH`; el proyecto requiere Java 21 (Spring Boot 4.0.0-SNAPSHOT). Se instaló Eclipse Temurin JDK 21 vía `winget` para poder compilar y ejecutar las pruebas — una instalación de herramienta de desarrollo estándar, reversible, sin relación con el código del proyecto.

### 9.5. Frontend

No existe script `"test"` en `sgt-huap_frontend/package.json` (confirmado también en `docs/qa/QA_BASELINE.md` de una auditoría anterior) — no hay framework de pruebas automatizadas de frontend instalado en este repositorio. Se verificó la corrección mediante:
- `npm run lint`: sin errores nuevos (los 33 errores/8 warnings existentes son de archivos no tocados por esta corrección).
- `npm run build`: compilación de producción exitosa.
- Revisión manual de la lógica de `buildAgendaData` y `GenerarView` contra los casos descritos en el plan (no se pudo ejecutar un navegador real en este entorno — **se requiere validación manual en un navegador** para confirmar visualmente el comportamiento de la Agenda y del selector de rango de Planificación).

---

## 10. Problemas encontrados durante la implementación

- Java 8 como único JDK disponible (resuelto instalando JDK 21).
- Maven en modo offline no tenía cacheado el plugin `maven-surefire-plugin:3.5.4` ni `maven-clean-plugin:3.5.0`; se ejecutó en modo online (hay acceso a red en este entorno) para resolverlos.
- El datasource secundario de hospital impide que las pruebas `@SpringBootTest` levanten contexto en este entorno sin una BD de hospital alcanzable (ver 9.3) — limitación ambiental, no de código.

---

## 11. Riesgos pendientes

1. Las 26 pruebas de integración/concurrencia deben confirmarse en un ambiente con acceso real a ambas bases de datos antes de dar por completamente verificado el comportamiento bajo concurrencia con persistencia real (aunque la lógica de concurrencia en sí — bloqueos pesimistas — no fue modificada por esta corrección, solo se le agregó una validación adicional antes de mutar).
2. **Resuelto 2026-08-03**: se construyó el panel "Vigencias" (`VigenciasSheet` en `Planificacion.jsx`) con historial de ejecuciones, "Acortar", "Anular" y "Editar planificación desde una fecha". Pendiente menor: falta un botón directo de "Extender" (hoy se logra el mismo resultado con "Editar desde fecha").
3. No se validó visualmente en navegador el comportamiento de la Agenda ni del nuevo selector de rango de Planificación (sin entorno de navegador disponible en este sandbox) — se recomienda una pasada manual de QA visual antes de desplegar.
4. Las brechas de autorización de lectura ya documentadas en el sistema (BUG-002, BUG-004, BUG-006, BUG-007) siguen vigentes — no formaban parte del alcance de esta corrección y no fueron tocadas.

---

## 12. Recomendaciones

1. Ejecutar `mvn test` en el ambiente de desarrollo real (con `HOSPITAL_DB_URL` alcanzable) para confirmar las 26 pruebas de integración/concurrencia.
2. Completar la UI de "Vigencias" (listar ejecuciones, extender, acortar, anular, editar desde fecha) en `Planificacion.jsx`.
3. Hacer una pasada de QA manual en navegador: Agenda cerca de la medianoche (America/Santiago), generación de un rango de varios meses, e intento de generar una vigencia superpuesta (debe rechazarse con mensaje claro).
4. Aplicar la migración `V2__planificacion_vigencia.sql` en el ambiente de desarrollo/QA antes de desplegar esta rama, siguiendo el orden documentado en `BaseDatosMySQL/README.md`.
