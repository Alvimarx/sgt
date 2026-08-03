# Plan de corrección — Planificación y Solicitudes (SGT-HUAP)

Fecha: 2026-08-03
Rama: `fix/planificacion-solicitudes-sgt` (base: `devops/dev-environment`, commit `58ded4d`)
Fuente funcional: `Archivo de funcionalidades.md` (raíz del proyecto), contrastado contra el código vigente en `huap_backend/` y `sgt-huap_frontend/`.

Este documento cubre las 6 correcciones solicitadas. Cada una incluye diagnóstico, causa raíz, archivos afectados, riesgos y estrategia. Después de este plan se procede automáticamente a la implementación.

---

## 1. Pantalla de Inicio muestra fechas pasadas

### Diagnóstico
`AgendaView.jsx` consulta los turnos del mes actual completo (`funcionarioService.getTurnos`/`getTurnosServicio`, que llaman a `GET /turnos/funcionario/{id}?year&month` o `GET /turnos/servicio/{id}`) y `buildAgendaData` (en `services/funcionarioService.js`) construye una fila (`weekDays`) por **cada fecha presente en la respuesta**, sin excluir los días anteriores a hoy. Solo se marca `hoy: key === todayKey` para resaltar el día actual, pero no se filtra nada anterior.

### Causa raíz
1. Falta un filtro explícito "descartar días completamente anteriores a hoy" en `buildAgendaData` (`funcionarioService.js:275-288`).
2. `todayKey` se calcula con `new Date().toISOString().slice(0, 10)` (`funcionarioService.js:273`), que convierte la hora local a **UTC** antes de extraer la fecha. Cerca de la medianoche en `America/Santiago` (UTC-3/UTC-4) esto puede calcular un "hoy" desfasado un día respecto al real.
3. El turno se agrupa únicamente por `diaInicioTurno` (`mapTurnoForAgenda`, campo `fecha`); un turno nocturno iniciado ayer y vigente hoy queda bajo la clave de **ayer**, por lo que un filtro ingenuo ("descarta día < hoy") lo eliminaría aunque siga vigente.

### Reglas actuales involucradas
Ninguna regla de backend limita el rango; el backend ya soporta consultar por rango de fechas (`TurnoRepository.findByFuncionarioIdAndDateRange`, `findByServicioIdAndDateRange`). El problema es enteramente de presentación en el frontend.

### Archivos que se modificarán
- `sgt-huap_frontend/src/services/funcionarioService.js` (cálculo de "hoy" con zona horaria explícita, nuevo campo `fechaFin` por turno, filtro de días).
- `sgt-huap_frontend/src/utils/dateUtils.js` (se agrega un helper centralizado `hoyISO()`/`inicioDeHoy()` en `America/Santiago`, reemplazando los cálculos ad-hoc dispersos).
- `sgt-huap_frontend/src/components/Comun/AgendaView.jsx` (usa el nuevo helper si necesita "hoy" en algún cálculo local; no cambia su lógica de filtros por estado, que sigue operando sobre `agendaDays` ya filtrado).

### Cambios de base de datos
Ninguno.

### Riesgos
- Un cálculo de "hoy" mal implementado podría ocultar el día actual en vez de días pasados. Mitigado con pruebas específicas (21.1).
- Cambiar el criterio de agrupación de "por día calendario" a "por vigencia" podría afectar el cálculo de resumen por día (`buildDaySummary`) si un turno nocturno pasa a considerarse parte de dos días. Se mantiene el agrupamiento por `diaInicioTurno` para el resumen visual (no se cambia), y se agrega un criterio adicional independiente para decidir qué días completos se muestran.

### Estrategia de compatibilidad
No se toca el backend ni el contrato de la API. Los reportes, calendario histórico, bitácora y exportaciones siguen consultando y mostrando todo el histórico sin cambios (no usan `buildAgendaData`).

### Pruebas
Ver sección 21.1 del prompt original — implementadas como pruebas manuales de la función pura `buildAgendaData`/nuevo helper (no hay framework de test de frontend instalado en este repo — `sgt-huap_frontend/package.json` no define script `test`; se deja documentado como limitación conocida, igual que ya lo registra `docs/qa/QA_BASELINE.md`).

---

## 2, 3 y 4. Rango de generación, separación ancla/vigencia efectiva, no superposición

Se tratan juntas porque comparten el mismo rediseño del modelo de datos.

### Diagnóstico
`PlanificacionEntity` es un "molde" sin fecha (`huap_backend/.../Entity/PlanificacionEntity.java`): no persiste ninguna noción de vigencia. `PlanificacionService.generarTurnos(idPlanificacion, fechaInicio, actorId, idsReglas)` (`PlanificacionService.java:198-319`) recibe **una sola fecha** (que debe ser lunes) y genera turnos únicamente para `maxDiaIndex + 1` días — es decir, **un único paso por el ciclo de la rotativa más larga del molde** (p. ej. 4 semanas = 28 días). No existe forma de indicar una fecha de término ni de generar un rango mayor al ciclo en una sola operación. El frontend (`Planificacion.jsx`, componente `GenerarView`) solo ofrece un selector de "lunes de inicio", confirmando que no hay concepto de fecha final en absoluto hoy.

### Causa raíz
El diseño actual conflacionaba dos conceptos en un solo parámetro (`fechaInicio`): (a) el **ancla** que determina la fase de la rotativa (debe ser lunes) y (b) el **rango real de turnos a crear** (limitado, sin querer, al largo de un ciclo).

### Reglas actuales involucradas
`validarLunes` (exige lunes); expansión de secuencia limitada a `maxDiaIndex + 1` días; sin ninguna verificación de superposición entre planificaciones del mismo servicio (no existe tal concepto hoy, porque no hay fechas persistidas).

### Solución de modelo de datos
Se agrega una entidad nueva, **`PlanificacionEjecucionEntity`** (tabla `planificacion_ejecucion`), que representa cada "puesta en vigencia" (generación) de un molde:

```
id_ejecucion            BIGINT PK
id_planificacion        BIGINT FK -> planificacion
id_servicio              BIGINT FK -> servicios   (denormalizado, para la validación de superposición)
fecha_inicio_rotativa    DATE NOT NULL   -- ancla (lunes), fase del ciclo
fecha_inicio_efectiva    DATE NOT NULL   -- primer día con turnos reales
fecha_fin_efectiva       DATE NOT NULL   -- último día con turnos reales (inclusive)
fecha_generacion         DATETIME NOT NULL
id_funcionario_actor     BIGINT NULL FK -> Funcionario
estado                   VARCHAR(20) NOT NULL DEFAULT 'ACTIVA'   -- ACTIVA | ANULADA
ids_reglas_aplicadas     VARCHAR(255) NULL   -- lista de ids de reglas separadas por coma
```

Y se agrega una columna nullable **`id_ejecucion`** a `Turnos`, FK a `planificacion_ejecucion`. Los turnos existentes (generados antes de este cambio) quedan con `id_ejecucion = NULL` — se tratan como **origen legado**, nunca se tocan automáticamente (ver punto 5).

No se agregan más estados (`BORRADOR`/`PROGRAMADA`/etc.): la vigencia se representa completamente con el par de fechas efectivas más el estado binario `ACTIVA`/`ANULADA`, seguiendo la recomendación de la sección 11.4 del encargo de evitar estados innecesarios.

### Regla de generación (nuevo algoritmo)
Para cada asignación del molde (rotativa `R`, con ciclo `cicloDias = R.semanas × 7`):

```
para cada día D en [fechaInicioEfectiva, fechaFinEfectiva]:
    diasDesdeAncla = D - fechaInicioRotativa                 // puede ser 0 o positivo
    idx = floorMod(diasDesdeAncla, cicloDias)
    turnos_del_dia = secuencia[R][idx]                       // 0, 1 o más filas (día+noche)
    por cada tipoTurno en turnos_del_dia: crear TurnoEntity en D con ese tipo
```

Esto permite:
- Generar cualquier rango (2.1), acotado solo por fechas reales, sin tope de "un mes" ni de 30 días fijos (2.2).
- Mantener el ancla de rotativa (lunes) totalmente separada de la fecha efectiva (10.1–10.3), usando `floorMod` para fases correctas incluso si `fechaInicioEfectiva` es muchas semanas después del ancla (10.4).
- Que la vista previa de conflictos (`detectarConflictos`) use **exactamente el mismo bucle** (se factoriza en un método privado compartido `expandirSecuencia(...)` usado por ambos), garantizando que no pueda haber diferencia entre previsualización y generación final (9.3).

### Regla de no superposición (11)
Antes de crear una `PlanificacionEjecucionEntity` (en `generarTurnos`, `extenderPlanificacion` y `editarPlanificacionDesde`), se valida:

```java
existeSolapada = ejecucionesActivasDelServicio.any(e ->
    nuevoInicio <= e.fechaFinEfectiva && nuevoFin >= e.fechaInicioEfectiva)
```//
```

con extremos inclusivos, exactamente como especifica el encargo (11.2). La validación corre dentro de la misma transacción que la generación, y se protege de condiciones de carrera con un **bloqueo pesimista sobre la fila del servicio** (nuevo método `ServicioRepository.lockServicio`, mismo patrón que `FuncionarioRepository.lockFuncionario`): dos peticiones concurrentes de generación para el mismo servicio se serializan, y la segunda ve ya la ejecución de la primera al re-consultar tras obtener el lock.

### Archivos que se modificarán/crearán
- **Nuevo** `Entity/PlanificacionEjecucionEntity.java`
- **Nuevo** `Repository/PlanificacionEjecucionRepository.java`
- `Entity/TurnoEntity.java` (+ campo `ejecucion`)
- `Service/PlanificacionService.java` (reescritura de `generarTurnos`/`detectarConflictos`; nuevos métodos `extenderPlanificacion`, `acortarPlanificacion`, `editarPlanificacionDesde`)
- `Repository/ServicioRepository.java` (+ `lockServicio`)
- `Repository/TurnoRepository.java` (+ consultas por `idEjecucion`, soft-delete por ejecución)
- `Controller/PlanificacionController.java` (nuevos endpoints/parámetros)
- `DTO/` (nuevo `GenerarPlanificacionRequest`, opcionalmente `PlanificacionEjecucionDTO`)
- `sgt-huap_frontend/src/components/Admin2/Planificacion.jsx` y `services/planificacionService.js`

### Cambios de base de datos
Script SQL incremental (ver sección "Migración" más abajo), aditivo únicamente: una tabla nueva y una columna nullable nueva. No se modifica ni se elimina ninguna columna existente.

### Riesgos
- Rango de generación muy extenso (ej. varios años) podría ser lento por el bucle día-a-día; aceptable para horizontes de planificación hospitalaria (meses), documentado como límite práctico, no un tope artificial impuesto al usuario (9.2).
- Cambiar la forma en que `TurnoRepository.softDeleteByRotativasAndRango` identifica turnos (por rotativa) a identificarlos por `idEjecucion` cambia el comportamiento de "deshacer generación": se mantiene el método antiguo (para turnos legado sin ejecución) y se agrega uno nuevo específico por ejecución, sin eliminar el existente (compatibilidad).

### Estrategia de migración
Aditiva, reversible: `DROP TABLE planificacion_ejecucion` y `ALTER TABLE Turnos DROP COLUMN id_ejecucion` revierten el cambio sin pérdida de datos originales (los turnos ya existentes no cambian, solo ganan una columna nueva en `NULL`).

---

## 5. Edición segura de planificaciones (versionado) y origen de turnos

### Diagnóstico
Hoy, "editar" una planificación (`actualizarPlanificacion`) reemplaza por completo el conjunto de `PlanificacionAsignacionEntity` del molde. Como los `TurnoEntity` ya generados **no referencian la asignación**, sino que copian sus propios `funcionario`/`puesto`/`rotativa`/`tipoTurno` al momento de generarse, el historial de turnos pasados **no se ve afectado** por editar el molde — el riesgo real está en (a) que "deshacer generación" identifica turnos solo por rotativa compartida, pudiendo borrar turnos de otra planificación con la misma rotativa, y (b) que no existía forma de decir "desde tal fecha en adelante, la planificación cambia" sin volver a generar manualmente y sin protección de superposición.

### Solución
1. **Origen inequívoco**: cada turno generado queda ligado a su `PlanificacionEjecucionEntity` (ver punto 2-4). "Deshacer generación" pasa a operar sobre `idEjecucion`, no sobre rotativa compartida — resolviendo el riesgo documentado en `Archivo de funcionalidades.md` (RN-SGT-013) de raíz.
2. **Editar desde una fecha** (`editarPlanificacionDesde`): dado `idPlanificacion`, `fechaDesde`, nuevas asignaciones (opcional) y nueva `fechaFinEfectiva`:
   - Ubica la ejecución `ACTIVA` del servicio cuyo rango cubre `fechaDesde` (o la más cercana futura).
   - Si `fechaDesde` es posterior al inicio de esa ejecución: la **trunca** (`fechaFinEfectiva = fechaDesde.minusDays(1)`) y hace soft-delete únicamente de los turnos de **esa ejecución** con `diaInicioTurno >= fechaDesde` (nunca toca turnos anteriores a `fechaDesde`, cumpliendo 12.3/14.2).
   - Si `fechaDesde` es igual o anterior al inicio de esa ejecución: la anula por completo (`estado = ANULADA`) y hace soft-delete de todos sus turnos.
   - Actualiza las asignaciones del molde (reutilizando `actualizarPlanificacion`).
   - Genera una **nueva ejecución** desde `fechaDesde` hasta la `fechaFinEfectiva` indicada, con el **mismo `fechaInicioRotativa`** (ancla) de la ejecución truncada, preservando la fase del ciclo (12.4, 12.5).
   - Todo dentro de una transacción; se registra en bitácora (`EDICION_PLANIFICACION_DESDE_FECHA`).
3. **Extender** (`extenderPlanificacion`): genera una ejecución nueva y contigua `[fechaFinActual+1, nuevaFechaFin]`, mismas asignaciones y mismo ancla — no reemplaza nada, solo agrega (14.1).
4. **Acortar** (`acortarPlanificacion`): reduce `fechaFinEfectiva` de la ejecución activa; hace soft-delete de los turnos de esa ejecución con `diaInicioTurno` posterior a la nueva fecha; **rechaza** si la nueva fecha final es anterior a hoy (no se permite acortar retroactivamente sobre turnos ya pasados, 14.2), y devuelve además cuántas solicitudes pendientes/ofertas quedarán asociadas a turnos desactivados, para que el frontend lo muestre como advertencia antes de confirmar (14.3) — sin bloquear la operación, porque el soft-delete no destruye la trazabilidad (la solicitud sigue apuntando por FK a un turno soft-eliminado, consultable).

### Compatibilidad histórica
Los turnos generados antes de este cambio (sin `idEjecucion`) permanecen operativos y visibles; ninguna operación nueva (editar-desde, extender, acortar) los toca, porque todas operan filtrando por `idEjecucion` de una ejecución concreta (13.3).

### Archivos afectados
Los mismos de la sección anterior (mismo servicio, mismas entidades).

### Riesgos
- Determinar "la ejecución activa que cubre `fechaDesde`" asume una sola ejecución activa vigente por servicio en cada punto del tiempo — garantizado por la regla de no-superposición (punto 4), así que no hay ambigüedad.

---

## 6. Validación de secuencias incompatibles de turnos de 12 horas en Solicitudes

### Diagnóstico
`SolicitudService.crearSolicitud` no valida ningún conflicto de horario al crear la solicitud. `SolicitudService.cambiarEstado` (aprobación) mueve turnos (libera/asigna/intercambia) **sin revalidar jamás si el funcionario resultante queda con una secuencia de turnos incompatible** — la única validación de conflicto de horario existente en el sistema hoy vive en `GestionTurnoService`/`TurnoService` (asignación manual y generación), no en el flujo de Solicitudes ni en `OfertaGeneralService.seleccionarPostulante`.

### Causa raíz
El flujo de Solicitudes fue diseñado confiando en que "el turno ya era intercambiable"; nunca se implementó una revalidación de calendario resultante, ni una regla específica de descanso entre turnos de 12 horas.

### Solución: `ValidadorAsignacionTurnoService` (nuevo, compartido)
Nuevo componente de dominio con dos responsabilidades:
1. **Solapamiento general** (mismo criterio que ya usan `GestionTurnoService`/`TurnoService`: intervalos `[inicio, fin)`, tocarse en el borde no es solape).
2. **Regla de 12 horas consecutivas** (nueva): determina la duración real de cada turno por `Duration.between(inicio, fin)` (nunca por nombre); si el turno candidato dura exactamente 12 horas y existe, para el mismo funcionario (en cualquier servicio), otro turno vigente de exactamente 12 horas cuyo fin coincide exactamente con el inicio del candidato, o cuyo inicio coincide exactamente con el fin del candidato → rechaza. No se impone ningún mínimo de descanso adicional no solicitado (15.3); el número "12 horas" y el criterio "adyacencia exacta" quedan como constantes/parametrizables (`Duration` inyectable) para poder ajustarse a futuro sin tocar la lógica de los llamadores.

Se conecta en:
- `SolicitudService.crearSolicitud`: valida el calendario resultante para tipos 3 (Cobertura, sobre el emisor), 4 (Intercambio, sobre ambos, simulando el intercambio) y 5 (Oferta particular, sobre el receptor). Tipos 1/2 no agregan turno, se omiten.
- `SolicitudService.responderOfertaParticular` / `responderOfertaIntercambio` (aceptación del receptor): misma validación, como aviso temprano.
- `SolicitudService.cambiarEstado` (aprobación, **obligatoria y definitiva**): repite la validación con el calendario **actual** (puede haber cambiado desde la creación), y aborta la aprobación si ahora hay conflicto — cumpliendo 15.4 al pie de la letra.
- `OfertaGeneralService.seleccionarPostulante`: valida sobre el postulante elegido antes de asignarle el turno.

La validación por intercambio (tipo 4) sigue el algoritmo de 15.5: excluye temporalmente los dos turnos involucrados de la lista de turnos vigentes de cada funcionario, simula la asignación cruzada, y valida ambos calendarios resultantes antes de aplicar nada.

### Mensajes
Los mensajes de error indican explícitamente qué turno se solicita, qué turno existente choca, su fecha/hora, y el motivo ("turno nocturno de 12 horas inmediatamente anterior sin período de descanso"), sin exponer datos de otros funcionarios más allá de lo ya visible para quien aprueba (jefatura/subrogante ya ve la agenda del servicio).

### Archivos afectados
- **Nuevo** `Service/ValidadorAsignacionTurnoService.java`
- **Nuevo** `Service/ValidadorAsignacionTurnoServiceTest.java`
- `Service/SolicitudService.java`
- `Service/OfertaGeneralService.java`
- Tests: `SolicitudServiceTest.java`, `OfertaGeneralServiceTest.java` (nuevos casos, sin romper los existentes)

### Riesgos
- Este es el cambio de comportamiento más sensible: **antes**, aprobar una solicitud de intercambio/cobertura/oferta nunca fallaba por conflicto de horario; **ahora** puede rechazarse. Es exactamente el comportamiento pedido por el encargo (objetivo 8 y sección 15), documentado aquí explícitamente como cambio de comportamiento intencional, no un efecto colateral.
- Las pruebas existentes de estos servicios (`SolicitudServiceTest`, `OfertaGeneralServiceTest`) construyen turnos sin fechas/horas reales en varios casos (p. ej. `turno(long id)` sin horario) — se revisan y ajustan solo donde la nueva validación se activaría por datos incompletos, sin alterar la intención original de cada prueba.

---

## Estrategia de compatibilidad general

- Todos los cambios de esquema son **aditivos** (tabla nueva, columna nullable nueva). Ninguna columna ni tabla existente se elimina o renombra.
- El contrato de los endpoints existentes que no cambian de comportamiento (Servicios, Puestos, Tipos de Turno, Rotativas, Reglas, Feriados, Turnos manuales, Notificaciones, Bitácora, Exportación) no se toca.
- El endpoint `POST /planificaciones/{id}/generar` cambia su contrato de request (de `fechaInicio` único a `fechaInicioRotativa` + `fechaInicioEfectiva` + `fechaFinEfectiva`) porque es imprescindible para las correcciones 2-4; se documenta como cambio de contrato intencional (no hay consumidores externos de esta API, solo el frontend propio del repositorio, que se actualiza en el mismo cambio).
- Los roles y permisos actuales de `SecurityConfig` no se modifican.
- `viewPersonal`/`innhosp` no se tocan en ningún punto de este trabajo.

## Plan de reversión
`git revert` de los commits de esta rama, más (si ya se hubiese aplicado en una base de datos) ejecutar el script de reversión incluido al final de la migración SQL (`DROP TABLE planificacion_ejecucion; ALTER TABLE Turnos DROP COLUMN id_ejecucion, DROP FOREIGN KEY ...;`). No se ejecuta ninguna migración contra una base de datos real durante este trabajo (solo se entrega el script versionado, siguiendo el patrón ya usado por el repositorio de scripts SQL en `BaseDatosMySQL/`).

## Pruebas que se ejecutarán
`./mvnw test` (Docker disponible en este entorno → incluye pruebas de integración con Testcontainers) y `npm run lint` + `npm run build` en el frontend. Ver detalle de casos nuevos en `docs/qa/RESULTADOS_CORRECCION_PLANIFICACION_SOLICITUDES.md` una vez ejecutados.

## Criterios de aceptación
Los enumerados en la sección 24 del encargo original; se verifican uno a uno en el informe de resultados final.
