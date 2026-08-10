# Línea base de QA funcional — SGT HUAP

**Fecha de revisión:** 2026-07-30
**Rama:** `security/internet-hardening` (rama de trabajo previa de esta misma sesión; se reutiliza porque contiene las correcciones de seguridad ya aplicadas y validadas)
**Commit base:** `e764b5b` + cambios sin commitear de sesiones previas (rediseño visual, funcionalidad de planificación, hardening de seguridad — ver `git status`)

## Stack detectado

Idéntico al documentado en `docs/security/SECURITY_BASELINE.md`: backend Spring Boot 4.0.0-SNAPSHOT / Java 21, frontend React 19 + Vite, MySQL 8.0 (`gestionturnos` propia + `innhosp` del hospital), Apache como proxy/balanceador en producción.

## Forma de levantar el sistema (verificado en esta sesión)

`docker compose -f docker-compose.dev.yml up --build` — ya estaba levantado al iniciar esta auditoría:

| Contenedor | Estado |
|---|---|
| `huap-dev-db` (MySQL 8.0, puerto 13307) | Up, healthy |
| `huap-backend` (Spring Boot, puerto 8080) | Up, healthy (reiniciado durante esta auditoría para la prueba de persistencia — volvió a `healthy` en ~21s) |
| `huap-frontend` (Apache + build React, puerto 5173) | Up |

## Conectividad verificada

- **Backend ↔ BD propia (`gestionturnos`):** operativa — confirmado con múltiples operaciones CRUD reales durante esta auditoría (creación/eliminación de servicios de prueba, consultas).
- **Backend ↔ BD hospital (`innhosp.viewPersonal`):** operativa — el login real contra credenciales de `viewPersonal` funcionó correctamente (ver `API_FUNCTIONAL_TEST_RESULTS.md`).
- **Frontend ↔ Backend:** verificado indirectamente (el frontend consume los mismos endpoints probados vía API); no se hizo una prueba de clic-a-clic en navegador real por no disponer de una herramienta de automatización de navegador en este entorno — **ver limitación explícita más abajo**.

## Pruebas automatizadas existentes

Igual que lo registrado en `docs/security/SECURITY_BASELINE.md` (no cambió desde la auditoría de seguridad de esta misma sesión):

```
Tests run: 209, Failures: 0, Errors: 26 (26 por limitación de entorno — Testcontainers sin Docker-en-Docker), Skipped: 0
```

- 183 pruebas unitarias/servicio pasan.
- 26 pruebas de integración/concurrencia no ejecutables en este sandbox (mismo motivo documentado antes).
- Frontend: sin script `"test"` en `package.json` — no hay pruebas automatizadas de frontend.

## Datos de prueba disponibles (dev, ficticios)

Confirmado en `BaseDatosMySQL/desarrollo/innhosp/02_datos.sql`: todos los funcionarios de prueba comparten la contraseña **`huap2025`** (hash SHA-512, consistente con el hallazgo SEC-007 de la auditoría de seguridad). Se usaron en esta auditoría, entre otros:

| RUT | Nombre | Rol de sistema | Rol de servicio | Servicio |
|---|---|---|---|---|
| 11111111-1 | Admin Bootstrap | ADMINISTRADOR | JEFATURA (en los 5 servicios) | Medicina Interna (y ve todos) |
| 22222223-3 | Fernando Roman | USUARIO | MEDICO | Medicina Interna |

Estas credenciales se usaron exclusivamente contra la base de datos de **desarrollo** (`huap-dev-db`), con datos ficticios generados para pruebas — no se tocaron datos reales de producción ni del hospital en ningún momento.

## Limitaciones de este ambiente de análisis

1. **No se dispone de una herramienta de automatización de navegador** (Playwright/Selenium/captura de pantalla) en este entorno — la verificación de la interfaz se hizo mediante: (a) lectura del código fuente de cada componente React, (b) pruebas directas contra la API REST con `curl` usando tokens JWT reales obtenidos vía login real, y (c) consultas directas a la base de datos. **No se puede afirmar con evidencia visual cómo se ve cada pantalla renderizada**; se marca como `No verificable visualmente en este entorno` cuando corresponda, y se prioriza la evidencia funcional (API + código) sobre la puramente visual.
2. Las 26 pruebas de Testcontainers no se pudieron ejecutar (mismo motivo que en la auditoría de seguridad).
3. No se probó el flujo completo de notificaciones en tiempo real (websockets/polling) de punta a punta en un navegador.
4. Los tokens JWT usados para las pruebas de rol se obtuvieron por login real (no se inventaron ni se hardcodearon roles); las respuestas HTTP documentadas en este informe son 100% reproducibles con los comandos `curl` indicados en `API_FUNCTIONAL_TEST_RESULTS.md`.

## Ningún dato productivo fue afectado

Todas las operaciones de escritura de esta auditoría (crear/eliminar un servicio de prueba, tal como `QA_PersistTest_20260730`) se realizaron contra la base de datos de **desarrollo** (`huap-dev-db`), con nombres claramente marcados como de prueba, y fueron **revertidas** (soft-delete) al finalizar cada prueba. No se modificó ningún registro real de funcionarios, turnos o planificaciones existentes salvo la creación/eliminación controlada de estos registros de prueba.
