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
- **Colisiones bootstrap↔poblado descubiertas** (hacían abortar TODO el poblado en la
  primera sentencia, silenciado por el viejo `|| true`):
  1. servicios: bootstrap crea 'Administración' id auto=1; poblado inserta ids fijos 1-4.
     Fix: preámbulo que reubica 'Administración' a id 99.
  2. Catálogos Rol_Sistema/Rol_Servicio/Tipo_Solicitud/feriados duplicados → INSERT IGNORE.
  3. Funcionario: RUT 11111111 duplicado (admin bootstrap + Ricardo Morales id 200, que
     además chocaba consigo mismo dentro del poblado) → INSERT IGNORE + RUT 20000200-6
     (consistente con el fix de innhosp).
  Consecuencia en la BD desplegada: el poblado NUNCA cargó (el 'Urgencias' visible lo
  creó el usuario a mano). Decisión: recargar gestionturnos desde cero con seeds
  corregidos (determinista) en vez de reparación quirúrgica.
- **Coherencia con el Excel**: los turnos de agosto 2026 (ids 6966-8221) NO están en el
  seed (que llega hasta mayo, ids 1-111): son la ejecución de 'Rotativa 2026' del
  ambiente antiguo. Nuevo `turnos_agosto2026_urgencias.sql`: crea la
  planificacion_ejecucion (vigencia 31/07-31/08), importa los 945 turnos con IDs
  originales (INSERT IGNORE, resolución por subconsulta de funcionario/puesto/rotativa,
  41 vacantes) y escribe la bitácora GENERACION_TURNO ('Planificación: Rotativa 2026')
  + ASIGNACION_MANUAL para 7332 y 7500, para que el export rotule igual que el Excel.
- Pendiente del usuario en la VM: git pull → backup → recrear gestionturnos → re-seed →
  reparar innhosp (nombres) → re-alta de su usuario → importar agosto → restart backend.
