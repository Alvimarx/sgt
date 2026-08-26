# BITÁCORA — SGT-HUAP

## 2026-08-18 · Sesión remota claude.ai/code
- Usuario clonó el repo desde GitLab y lo subió a github.com/Alvimarx/sgt (`main` con la
  historia completa, force-push sobre el squash "Clon"). Rama de trabajo:
  `claude/gitlab-repo-clone-mmcq8a`, alineada a ese main.
- **Fase 1 (comprensión) completada** → ver `BRIEF.md`.
- Pedido del usuario: desplegar el sistema. La BD debe vivir en (A) la VM Hetzner que ya
  corre otro sistema en Docker, o (B) un servicio con capa gratuita. Quiere pros/cons,
  análisis completo y plan.
- Hallazgo clave: las BDs "reales" de dev están en IP privada 10.6.15.193 → desde la nube
  hay que hostear `gestionturnos` + stand-in `innhosp` propios.
- Este contenedor remoto NO tiene Docker daemon (solo cliente) → validación local limitada
  a compilación/unit tests; el stack completo se prueba en la VM.
- Nota de proceso: `.pilot/` se VERSIONA en esta rama (el contenedor es efímero; git es la
  única persistencia), desviación consciente del default del skill.
- Deuda anotada: `node_modules/`+`.idea/` versionados; README de BaseDatosMySQL nombra
  `datos_gestionturnos.sql` inexistente (real: `poblado_urgencias_gestionturnos.sql`).

## Checkpoint F0 — PENDIENTE decisión del usuario
1. Opción A (todo en VM Hetzner) vs B (DBaaS free tier). Recomendación: A.
2. Specs de la VM (modelo/RAM/CPU/disco libre) y qué corre el otro sistema
   (¿nginx/traefik/caddy en 80/443?).
3. ¿Datos demo o datos reales de personal? (impacta dónde pueden vivir y el seed).
4. ¿Dominio/subdominio disponible para HTTPS?

## 2026-08-20 · F1 completada (opción A: todo en la VM Hetzner)
- Usuario eligió Hetzner (`167.233.77.149`) y preguntó por las implicancias de reducir
  la topología 3+3+LB. Verificado en código que reducir es seguro: sin `@Scheduled`,
  sin `@Cacheable`, sin websockets, JWT stateless, `stickysession` del LB es config muerta.
  Además el lock de fuerza bruta (`LoginAttemptService`) es un ConcurrentHashMap por
  instancia → con 3 backends era evadible; con 1 queda consistente.
- Creados: `docker-compose.hetzner.yml` (mysql interno + 1 backend + 1 frontend,
  mem_limits, sin puertos de BD), `.env.hetzner.example`, `scripts/init_db.sh`
  (idempotente, guardas para V2 y para no pisar innhosp), `scripts/backup_mysql.sh`
  (verifica el .gz antes de rotar), `.pilot/DEPLOY.md` (runbook completo).
- Validado en esta sesión: backend compila (`HUAP-0.0.1-SNAPSHOT.jar`, exit 0) y
  `docker compose config` renderiza bien. NO validado acá: arranque real del stack
  (este contenedor no tiene demonio Docker) → se prueba en la VM.
- Falso positivo descartado: `setup_innhosp.sql` siembra claves con SHA2(...,512) y el
  backend usa BCrypt; el `DelegatingPasswordEncoder` tiene SHA-512 como fallback para
  hashes sin prefijo `{id}`, así que el login demo funciona.
- Datos pendientes del usuario (no bloquean el Paso 0 del runbook): specs de la VM,
  qué proxy corre el otro sistema, demo vs datos reales, dominio para TLS.

## 2026-08-21 · F3 en curso — primer despliegue en la VM
- VM verificada: 3.7 GB RAM / 2 vCPU / 27 GB libres, sin contenedores corriendo y con
  80/443 libres (el "otro sistema" —hostname `Efeso`— no estaba levantado). Swap de 2 GB
  creada. Stack expuesto en 8090.
- **Bug propio detectado y corregido en `scripts/init_db.sh`**: `V2__planificacion_vigencia.sql`
  es el único script SQL sin `USE gestionturnos;`, y el script lo ejecutaba sin base por
  defecto → MySQL falló con "No database selected" y no creó `planificacion_ejecucion`.
  El fallo quedó OCULTO porque el helper `my()` terminaba en `|| true`. Síntoma final:
  el backend en bucle de reinicio con `Schema-validation: missing table
  [planificacion_ejecucion]`.
  Corrección: (1) `my()` ahora propaga el código de salida; (2) la migración se invoca con
  `my gestionturnos < ...`; (3) el guard verifica tabla Y columna, y se valida que la tabla
  haya quedado creada.

## 2026-08-21 (tarde) · Encoding + coherencia con el Excel de agosto
- **Mojibake en la UI ("Ãlvaro LÃ³pez")**: causado por comandos mysql ad-hoc SIN
  `--default-character-set=utf8mb4` (el cliente en el contenedor negocia latin1 con locale
  POSIX). Afectó: las 80 personas cargadas en personalAux + las filas del usuario real.
  Fix: `scripts/mysql.sh` (wrapper que fija utf8mb4), `personal_urgencias_innhosp.sql`
  regenerado para reparar nombres al re-ejecutarse, advertencia en DEPLOY.md.
- **CSV nuevo "no está en UTF-8"**: auditoría (workflow 3 agentes) concluyó que es el
  export viejo RE-GUARDADO por Excel/Sheets (coma, sin comillas, h:mm, enteros, BOM
  perdido, mojibake fijado). El export del backend es UTF-8 impecable (BOM + charset
  explícito, ExportacionService/Controller). Datos: idénticos 945/945 al CSV viejo.
- **Por qué el poblado nunca cargó** — CAUSA REAL: RUT duplicado DENTRO del propio
  poblado. `Funcionario` tiene `UNIQUE KEY uk_funcionario_rut_dv (Rut, DV)`, y el
  archivo insertaba dos veces '11111111','1' (id 1 Admin Bootstrap e id 200 Ricardo
  Morales) en la MISMA sentencia. La sentencia abortaba, el cliente mysql corta el
  archivo al primer error y todo lo posterior (servicios, puestos, rotativas,
  tipo_turno, planificación, turnos) quedaba sin cargar. Fix: id 200 → 20000200-6
  (consistente con el fix de innhosp). El 'Urgencias' que el usuario ve lo creó a mano.
  Nota: en la VM además nunca se invocó `SEED_DEMO=1`, así que el paso 5 se saltó.
- **CORRECCIÓN de un diagnóstico previo mío**: registré aquí que había "colisiones
  bootstrap↔poblado" que abortaban el archivo en su primera sentencia. Es FALSO: el
  poblado empieza con `SET FOREIGN_KEY_CHECKS=0` y TRUNCATE de las 20 tablas, así que
  cuando llega a los INSERT no queda nada del bootstrap con qué chocar. Verificado
  leyendo el archivo (las TRUNCATE son originales, no mías). Los parches que había
  puesto por esa teoría —`UPDATE servicios ... id_servicio=99` y los `INSERT IGNORE`—
  eran no-ops, y el IGNORE sobre `Funcionario` era además NOCIVO: habría enmascarado
  el siguiente RUT duplicado en vez de hacerlo fallar. Revertidos ambos archivos
  (despliegue/ y desarrollo/); del parche solo sobrevive el cambio de RUT, que es el
  que de verdad arregla el problema.
- **Verificación estática del import de agosto** (sin daemon Docker en esta sesión, así
  que se cruzaron los archivos con Python): los 81 RUT que referencia resuelven contra
  el poblado salvo 17599096 (el usuario, que se da de alta en el paso previo); 15/15
  puestos existen; tipo_turno 'Dia'/'Noche' de servicio 4 existen; 'Rotativa 2026'
  existe con id_servicio=4. De los 87 pares (puesto,RUT), 2 no tienen fila en
  `planificacion_asignacion` y por eso quedan con id_rotativa NULL: son exactamente los
  turnos 7332 y 7500, las dos asignaciones manuales — o sea, correcto.
- **Coherencia con el Excel**: los turnos de agosto 2026 (ids 6966-8221) NO están en el
  seed (que llega hasta mayo, ids 1-111): son la ejecución de 'Rotativa 2026' del
  ambiente antiguo. Nuevo `turnos_agosto2026_urgencias.sql`: crea la
  planificacion_ejecucion (vigencia 31/07-31/08), importa los 945 turnos con IDs
  originales (INSERT IGNORE, resolución por subconsulta de funcionario/puesto/rotativa,
  41 vacantes) y escribe la bitácora GENERACION_TURNO ('Planificación: Rotativa 2026')
  + ASIGNACION_MANUAL para 7332 y 7500, para que el export rotule igual que el Excel.
- Pendiente del usuario en la VM: git pull → backup → recrear gestionturnos → re-seed →
  reparar innhosp (nombres) → re-alta de su usuario → importar agosto → restart backend.

## 2026-08-23 · Requerimientos R1-R6 (primeras mejoras funcionales)
- Usuario confirmó: recarga de la BD en la VM funcionó y los usuarios de prueba
  (Flavio Ayala 30000006-6 JEFATURA, Pablo Garrido 30000070-0 MEDICO) entran.
- Nueva carpeta `requerimientos/` (README + 1 doc por requerimiento) pensada para
  replicar cada cambio "por palabra" en el repo gemelo con datos reales. Los docs
  quedan "pendiente de visto bueno" hasta que el usuario pruebe.
- R1 quitar filtro Aprobados (AgendaView), R2 "Tienes turno {tipo}: {puesto}" en
  el resumen del día, R3 puesto propio en título de card expandida y de
  ShiftDetail, R4 tocar la vacante "Cupo libre" dispara el flujo de solicitud de
  Cobertura existente (solo médicos; jefatura conserva asignación directa), R5
  refresh conserva sesión y vista (sgt_nav_state en sessionStorage + whitelist
  por rol + fix de "Cambiar servicio" post-refresh exponiendo servicios en
  AuthContext), R6 sin punto amarillo del calendario.
- Hallazgo de la revisión adversarial (6 verificadores): el backend envía el
  centinela "Sin Puesto" (string) en vez de null — se normaliza a null en los
  mappers del frontend (limpiarNombrePuesto en funcionarioService/turnosService).
- Validación: npm run build OK; eslint sin errores nuevos (los 5 de ShiftDetail/
  AuthContext/funcionarioService son deuda preexistente, idéntica en HEAD).
- Sin daemon Docker en esta sesión: la prueba visual queda en manos del usuario
  (rebuild del frontend en la VM).

## 2026-08-23 (2) · Visto bueno R1/R3/R4/R5/R6; R2 corregido a rotativa
- Usuario probó en la VM: aprobó 5 de 6. R2 estaba mal interpretado: el sufijo
  no es el puesto sino la ROTATIVA del turno ("Turno III" en el repo real).
- El backend ya enviaba nombreRotativa (centinela "Sin Rotativa"): solo se mapeó
  en el frontend (helper genérico limpiarCentinela en ambos services) y se cambió
  la línea de AgendaView a nombreRotativa. R3 (puesto en el título del detalle)
  quedó aprobado tal como estaba.
- Docs: 5 requerimientos pasan a "aprobado ✅"; R2 reescrito como v2 (renombrado
  a ..._R2_resumen-turno-propio-con-rotativa.md), pendiente de visto bueno.

## 2026-08-23 (3) · Lote R1-R6 cerrado
- Usuario probó R2 v2 en la VM y dio el visto bueno ("quedó perfecto").
- Los seis requerimientos quedan "aprobado ✅" en requerimientos/ y el README
  cierra con el estado del lote: listo para replicar en el repo con datos reales.
- DEPLOY.md: se agregó a "Operación diaria" la fila de actualización solo-frontend
  (es la operación recurrente ahora que el trabajo es de UI).
- Pendiente operativo (no bloqueante, requiere la VM): dejar el cron de respaldos
  activo y verificar la restauración — Paso 8 de DEPLOY.md.
- Corrección en DEPLOY.md (Paso 7): la tabla de usuarios de prueba estaba obsoleta
  tras limpiar el seed. Decía "12345678-9 Álvaro López — JEFATURA" (hoy ese RUT es
  Ana María González, SUBROGANTE de Enfermería) y "12345677-0 Fernando Rojas", que
  ni siquiera existe en gestionturnos (solo en innhosp: entraría sin servicio).
  Reemplazados por los tres verificados en la VM: Admin Bootstrap, Flavio Ayala
  (JEFATURA Urgencias) y Pablo Garrido (MEDICO Urgencias).

## 2026-08-23 (4) · Lote 2: R7 y R8
- R7 (captura del usuario): el encabezado de grupo del home decía solo "Dia".
  Debe decir "Día: Turno X" = la ROTATIVA del equipo, y SIEMPRE (en la captura
  no tenía turno ese día). Corrige el criterio de R3, que anexaba el puesto y
  solo para el turno propio; R3 queda marcado como supersedido en parte.
  Verificación previa sobre los 945 turnos: 63 grupos de 15; 53 con una sola
  rotativa y 10 con reparto 14+1, todos explicados por un único dato del seed
  (Pedro Marín duplicado en "Médico General 9" con dos rotativas). Por eso el
  criterio implementado es "rotativa mayoritaria del grupo, ignorando turnos sin
  rotativa" en vez de asumir unanimidad.
  Tocado: buildAgendaData y buildTurnoTeams exponen group.nombreRotativa;
  AgendaView (card expandida), ShiftDetail (header) y calendarView (sheet del día).
- Ajuste de datos: el tipo de turno se llamaba 'Dia' sin tilde en el seed →
  'Día'. El import de agosto acepta ambas grafías para no romperse contra una BD
  ya cargada. UPDATE documentado en el doc de R7 para la base desplegada.
- R8: con un solo servicio se canjea el preAuthToken automáticamente y se entra
  al home; la pantalla de selección solo aparece con 2+ servicios. Si el canje
  falla se cae al flujo normal con el error visible (no se traga).
- Validación: vite build OK; eslint 15 problemas antes y 15 después (misma deuda
  preexistente, sin regresiones).

## 2026-08-23 (5) · R9: filtros "Solicitudes" y "Disponibles"
- Renombres de chips + cambio de fondo en "Disponibles": esDisponibleParaMi
  excluye (a) cupos de un equipo del que el usuario ya es parte (teamKey) y
  (b) turnos de DÍA cuya fecha es la fechaFin de una noche propia (viene
  saliendo). El contador del chip usa el mismo predicado que el filtro.
- Verificación adversarial (2 agentes): reglas correctas contra el mapper
  (teamKey/tipo/fechaFin), rename sin referencias huérfanas. Incorporado de sus
  hallazgos: guard fechaFin!==fecha, texto del día "N cupos libres" (sin
  "disponible"), TODO restaurado sobre solicitudPendiente.
- Hallazgo importante confirmado con grep al backend: convertirTurnoAMap NUNCA
  emite solicitudPendiente/cambioAprobado → el chip Solicitudes (y el viejo
  Pendientes) cuenta 0 con datos reales. Preexistente; requiere backend para
  funcionar de verdad. Documentado en código y en el doc R9.
- Decisión de alcance registrada en el doc: el filtro aplica a todos los roles
  (spec del usuario, que es jefatura y también hace turnos); el caso simétrico
  día→noche NO se implementó por no ser pedido.

## 2026-08-23 (6) · Visto bueno R7-R9 y paquete de traspaso
- Usuario aprobó el lote 2 ("Perfecto"). Los 9 requerimientos quedan aprobados.
- Nuevo paquete de traspaso al repo con datos reales:
  · requerimientos/TRASPASO.md — guía maestra: qué llevar (7 archivos frontend,
    cero backend), qué NO (compose/seeds/scripts de este ambiente), Método A
    (parche git) con fallback Método B (docs por palabra, en orden, saltando R3
    que fue reemplazado por R7), paso opcional de datos de R7, verificación
    final y prompt sugerido para un asistente en la otra máquina.
  · requerimientos/traspaso/frontend_R1-R9.patch — diff consolidado 691dca3..HEAD
    de sgt-huap_frontend/src (7 archivos, +323/-63). Verificado con
    `git apply --check` sobre un worktree del commit base: aplica limpio.
  · requerimientos/traspaso/r7_tipo_turno_dia.sql — inspección + UPDATE
    condicional del nombre del tipo de turno.

## 2026-08-25 · Lote 3: R10-R12 (solicitudes) — primer lote con backend
- Mapeo previo con 2 agentes (backend y frontend del módulo solicitudes).
  Hallazgos clave que definieron el diseño: (1) rechazarSolicitudesCompetitivas
  YA existe — al aprobar, el backend rechaza las demás pendientes del mismo
  turno con lock pesimista → R10 es solo presentación; (2) TurnoService tenía
  inyectados SeguridadServicio y SolicitudRepository SIN USO — la tubería para
  R11 estaba lista; (3) el gate anti-duplicado de ShiftDetail existía apagado
  por falta del dato; (4) nueve `catch {` vacíos tragaban los mensajes del
  backend; (5) el id de turno en solicitudes es turno.idTurno, no .id.
- R10: PostulacionesGrupoCard en SolicitudesView — coberturas pendientes del
  mismo turno (2+) agrupadas con lista de postulantes y botón Elegir.
- R11 (bug chip Solicitudes): SolicitudRepository.findTurnoIdsByFuncionarioAndEstado
  (proyección, 1 consulta) + TurnoService.marcarSolicitudesPendientesDelUsuario
  aplicado a getTurnosByServicioConDetalles y getTurnosCalendario. El frontend
  se encendió solo (chip, badge, banner, gate del detalle).
- R12 (bug doble solicitud): exists en repositorio + validación en
  crearSolicitud → 400 "Ud. ya solicitó este turno" (por funcionario+turno
  PENDIENTE; rechazada/aprobada no bloquea). Catch con mensaje real en
  SolicitudesView; tarjeta de vacante "Ya solicitaste este turno" en ShiftDetail.
- Validación: mvn compile OK; SolicitudServiceTest 61/61 (2 tests nuevos);
  vite build OK; eslint sin errores nuevos.
- Hallazgos de seguridad ANOTADOS SIN CORREGIR (fuera de alcance, decisión
  consciente): GET /solicitudes sin scoping por servicio (cualquier autenticado
  ve todas), respuestas con entidad cruda sobre-expuesta (rut del funcionario,
  etc.), GETs sin chequeo IDOR. Candidatos a requerimiento de seguridad.

## 2026-08-25 (2) · R13: bug grave en la regla de 12 horas
- Regla del negocio aclarada por el usuario: día→noche (24 corridas) LEGAL;
  noche→día siguiente ("24 invertido") PROHIBIDO.
- La implementación era doblemente incorrecta: (1) simétrica a propósito
  (bloqueaba también el 24 corrido legal) y (2) exigía 12h EXACTAS adyacentes —
  los turnos reales duran 13h/11h, así que jamás se activaba y el invertido
  pasaba limpio.
- Reemplazada en ValidadorAsignacionTurnoService por "descanso post-nocturno":
  nocturno que termina la mañana del día D incompatible con diurno del día D,
  en ambas direcciones de candidatura, sin exigir duraciones ni adyacencia
  exacta. Permitidos explícitos: 24 corridas y noches consecutivas. Rige
  automáticamente en solicitudes, asignación manual y ofertas (validador
  compartido). Coherente con el filtro Disponibles de R9.
- Tests del validador reescritos a la semántica correcta (12) incluyendo el
  caso 13h/11h que la regla vieja dejaba pasar. Suite: 264/264 unitarios OK;
  los 26 que fallan en esta sesión son Testcontainers sin daemon Docker
  (fallan igual sin el cambio; correr en la VM u otra máquina si se quiere).

## 2026-08-26 · R14 y R15 (picker de intercambio + bloqueo/cancelación)
- R14: GET /turnos/intercambiables — el picker del canje usa el MISMO validador
  que la creación/aprobación (futuros, sin solape ni 24 invertido simulando el
  intercambio para ambos, mismo servicio, sin turnos comprometidos). /futuros
  ahora excluye turnos ya iniciados y amplía horizonte 3→12 meses.
- R15: bloqueo "un turno comprometido a la vez" (pedido U ofrecido) con mensajes
  que nombran la cancelación; PUT /solicitudes/{id}/cancelar (solo emisor por
  identidad JWT, solo PENDIENTE, bajo findByIdForUpdate); badge CANCELADA
  derivado del motivo; bitácora con SOLICITUD_CANCELADA visible y filtrable.
- Revisión adversarial (3 agentes, uno EJECUTÓ el SQL de Hibernate contra un
  SessionFactory real): refutó mi propio "fix" del LEFT JOIN — la navegación
  implícita al @Id NO genera join (queda como columna FK); el LEFT JOIN
  explícito se conserva igual por robustez (si alguien navega a un campo no-id,
  el implícito se rompe en silencio). Endurecimientos aplicados: lock en
  cancelar (carrera con aprobación), gate por identidad y no por rol (jefatura
  emisora quedaba sin salida), aprobación ya no pisa dueños (tipo 3 y 4),
  barrido competitivo por ambos lados del intercambio, purga de preselecciones
  obsoletas y loading propio del picker, filtro servicio.
- Validación: 93 tests de los módulos tocados verdes (66 Solicitud + 12
  Validador + 15 Turno); vite build OK; eslint sin errores nuevos.
- Deuda anotada: estado CANCELADA real en el enum (migración), tests de
  integración de las JPQL nuevas (Testcontainers, correr en la otra máquina),
  y el picker de turno propio aún no oculta los comprometidos (el backend los
  rechaza con mensaje claro).
