# Nota técnica de incidente — Datos de personal y credenciales en historial Git público

**Fecha de detección:** 2026-08-10
**Detectado por:** revisión técnica de preparación de repositorio (auditoría de historial Git)
**Estado:** confirmado, remediación parcial ejecutada
**Clasificación preliminar:** incidente de seguridad de datos personales (a evaluar formalmente por Legal/DPO)

Este documento es un resumen técnico neutral, sin datos personales ni credenciales reales, para que el equipo legal/DPO de la institución pueda evaluar si corresponde reporte bajo la Ley 19.628 y/o la Ley 21.719.

---

## 1. Qué se encontró

Durante una auditoría del historial completo de Git (no solo del estado actual del código) se identificaron **3 archivos con datos reales de personal y credenciales**, que fueron borrados del repositorio en un commit posterior pero **siguieron siendo recuperables desde el historial de Git** por cualquiera que clonara el repositorio, hasta la remediación descrita en la sección 5.

| Archivo | Naturaleza del dato | Cantidad aproximada |
|---|---|---|
| `update_claves_BCRYPT.sql` | Pares `RUT ↔ hash de contraseña (bcrypt)` de personal real | 85 registros |
| `archivos_marcelo/personal.sql` | Export (Navicat) de tabla de personal, con cabecera que indica explícitamente origen "Producción" | 1 archivo, tabla `personalAux` |
| `volcado_completo.sql` | Dump completo de la base de datos `innhosp` (personal del hospital), incluyendo la vista `viewPersonal` usada actualmente por el sistema | 832 líneas |

Adicionalmente, 6 archivos del mismo lote (`archivos_marcelo/conf_*.sql`, `servicio.sql`) contienen tablas de catálogo/referencia (no identifican personas directamente) pero confirman que el lote completo proviene de un export de la base de datos de producción.

También se encontró, en el `HEAD` actual (no solo en historial antiguo), un JWT_SECRET real y una contraseña de base de datos en texto plano en `huap_backend/src/main/resources/application.properties`, introducidos en un commit de mayo y reemplazados por variables de entorno en un commit de julio — pero el valor literal seguía recuperable en las versiones antiguas del archivo.

## 2. Naturaleza de los datos personales involucrados

- **Identificación:** RUT (identificador nacional chileno).
- **Credenciales:** hash de contraseña (bcrypt, costo 12) — no es la contraseña en texto plano, pero es reversible mediante ataques de fuerza bruta/diccionario si la contraseña original es débil o reutilizada.
- No se detectaron en estos 3 archivos otros campos como nombre completo, contacto o datos clínicos (se limitó la revisión a los nombres de tabla y estructura para no exponer más datos de los estrictamente necesarios para caracterizar el hallazgo).

## 3. Alcance y duración de la exposición

- **Fecha de introducción:** los 3 archivos estaban presentes desde el commit inicial de importación del repositorio (14 de abril de 2026).
- **Fecha de borrado del código actual:** 29 de julio de 2026 (el archivo dejó de estar en la última versión, pero permaneció en el historial).
- **Duración de exposición pública:** ~4 meses (14 abr – 10 ago, fecha de esta detección y remediación parcial).
- **Repositorios afectados (los 3 confirmados públicos por el cliente en una auditoría previa):**
  - GitHub: `Diego9028/Sistema-de-gestion-de-turnos-v2` — ramas `Sprint1`, `Sprint2`, `Sprint3`, `main`.
  - GitLab (`lmoyag-max/sgt-2.0`) — ramas `main`, `devops/dev-environment`, `fix/planificacion-solicitudes-sgt`, `security/internet-hardening`.
  - GitLab hospital (`git.desarrollo.huap/innovahuap360-git`) — ramas `main`, `dev`, `cert`.
- Cualquier persona con acceso de lectura a cualquiera de estos repositorios pudo, durante esos ~4 meses, ejecutar `git log`/`git show` sobre el historial y recuperar los 3 archivos completos, sin necesidad de credenciales adicionales ni de explotar ninguna vulnerabilidad del sistema en producción.

## 4. Impacto potencial

- Identificación de 85 personas reales (personal del hospital) mediante su RUT.
- Riesgo de exposición de contraseña si el hash es débil frente a ataques offline (no evaluado en esta revisión — no se intentó crackear ningún hash).
- Riesgo de reutilización de credenciales: si alguna de esas 85 personas usa la misma contraseña en otros sistemas (personales o de terceros), esos otros sistemas también quedan en riesgo.
- No hay evidencia (ni forma de determinar, dado que ambas plataformas son de terceros) de que estos datos hayan sido efectivamente descargados/explotados por alguien. La ausencia de evidencia de explotación no equivale a ausencia de exposición.

## 5. Remediación — estado

| Acción | Estado |
|---|---|
| Identificación completa del alcance (archivos, commits, ramas, remotos) | ✅ Completado |
| Rotación de las 85 contraseñas reales afectadas | ⏳ **Pendiente — requiere acceso al sistema de autenticación del hospital, fuera del alcance de esta revisión técnica** |
| Purga del historial Git (`git filter-repo`) en los 9 archivos + secreto JWT literal, en la copia local | ✅ **Completado** (2026-08-10) — 0 referencias residuales verificadas en cualquier commit/rama local |
| Force-push del historial purgado a `gitlab` (`lmoyag-max/sgt-2.0`) | ✅ **Completado** (2026-08-10) — 4 ramas actualizadas (`main`, `devops/dev-environment`, `fix/planificacion-solicitudes-sgt`, `security/internet-hardening`) |
| Force-push del historial purgado a `origin` (GitHub `Diego9028/Sistema-de-gestion-de-turnos-v2`) | ❌ **Pendiente — bloqueado por permisos (403).** Las credenciales usadas no tienen acceso de escritura a ese repositorio. Requiere que el dueño de la cuenta `Diego9028` ejecute el push o conceda acceso. Comando listo: `git push origin Sprint1:Sprint1 Sprint2:Sprint2 Sprint3:Sprint3 main:main --force` |
| Force-push del historial purgado a `huap-dev` (GitLab `git.desarrollo.huap/innovahuap360-git`) | ❌ **Pendiente — bloqueado por protección de ramas.** GitLab rechaza el force-push a `main`/`dev`/`cert` por política de rama protegida del proyecto (`pre-receive hook declined`). Requiere que un Maintainer/Owner del proyecto desproteja temporalmente esas ramas (Settings → Repository → Protected Branches → habilitar "Allowed to force push") o ejecute el push con permisos de administrador. Comando listo: `git push huap-dev refs/remotes/huap-dev/main:main refs/remotes/huap-dev/cert:cert refs/remotes/huap-dev/dev:dev --force` |
| Notificación a colaboradores con clones locales para que re-clonen | ⏳ Pendiente — **crítico para `gitlab`**, ya que su historial cambió (hashes de commit distintos); cualquier clon local existente quedará desincronizado |
| Evaluación formal de reporte de incidente (Ley 19.628/21.719) | ⏳ **Pendiente — decisión de Legal/DPO de la institución** |

**Nota importante:** mientras `origin` y `huap-dev` no se actualicen, **los 9 archivos y el secreto JWT literal siguen recuperables desde el historial de esos 2 repositorios** (ambos confirmados públicos). La purga en `gitlab` por sí sola no cierra la exposición completa.

## 6. Recomendación técnica

1. Rotar las 85 contraseñas afectadas cuanto antes, independientemente de si se purga o no el historial en los remotos restantes (la purga no revierte una exposición que ya ocurrió).
2. Completar la purga en `origin` y `huap-dev` en cuanto se resuelvan los bloqueos de permisos/protección de rama descritos arriba.
3. Evaluar con Legal/DPO si corresponde notificación formal a la Agencia de Protección de Datos Personales y/o a las personas afectadas, conforme a la Ley 21.719.
4. Revisar si existen otros repositorios, backups o entornos donde estos mismos archivos (`update_claves_BCRYPT.sql`, `personal.sql`, `volcado_completo.sql`) puedan haber sido copiados fuera de Git.
5. Notificar a todo colaborador con un clon local de `gitlab` que debe re-clonar (no `git pull`), ya que los hashes de commit de esa rama cambiaron por completo.
