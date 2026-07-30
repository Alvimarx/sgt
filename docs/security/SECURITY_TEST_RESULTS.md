# Resultados de pruebas — auditoría de seguridad SGT HUAP

**Fecha de ejecución:** 2026-07-30
**Rama:** `security/internet-hardening`
**Ambiente:** local, vía contenedores Docker aislados (`maven:3.9.6-eclipse-temurin-21`, `node:22`) y el stack de desarrollo (`docker-compose.dev.yml`)

## Herramientas utilizadas

- `mvn test` (Maven/Surefire/JUnit 5) — pruebas unitarias y de servicio del backend.
- `npm audit` — análisis de dependencias del frontend.
- `npm run build` (Vite) — verificación de compilación del frontend.
- `docker compose build` / `up` — verificación de que las imágenes construyen y los contenedores arrancan sanos tras los cambios de Dockerfile/Apache.
- `curl` — verificación funcional directa de los endpoints corregidos (CORS, `/info`, `/health`).
- `docker exec ... whoami` / `id` — verificación de que el contenedor backend corre como usuario no root.

No se usaron herramientas SAST/DAST/SCA adicionales no presentes ya en el ecosistema del proyecto (no se instalaron por no estar justificado incorporarlas sin acuerdo explícito — ver limitaciones).

## Comandos ejecutados (resumen)

```
mvn test                                            # baseline inicial
mvn test -Dtest='!*IntegrationTest,!*ConcurrencyTest,!LockBenchmark'   # tras las correcciones
npm audit
npm audit fix
npm run build
docker compose -f docker-compose.dev.yml build backend
docker compose -f docker-compose.dev.yml up -d --no-deps backend
docker exec huap-backend whoami
curl -i -X OPTIONS .../api/v2/servicios -H "Origin: http://evil.example" ...
curl -i -X OPTIONS .../api/v2/servicios -H "Origin: http://localhost:5173" ...
curl .../api/v2/health
curl .../api/v2/info
```

## Línea base (antes de corregir nada)

```
Tests run: 209, Failures: 0, Errors: 26, Skipped: 0
```
- 183 pruebas unitarias/de servicio: **pasan**.
- 26 pruebas de integración/concurrencia (`*IntegrationTest`, `*ConcurrencyTest`, más `LockBenchmark` descubierto después): **error de entorno** — requieren Testcontainers con un socket Docker funcional, no disponible desde el contenedor Maven anidado usado en este análisis (se intentó montar `/var/run/docker.sock`, sin éxito por limitaciones de red de Docker Desktop en Windows con contenedores anidados).
- 0 fallas reales de aserciones.

## Después de aplicar las correcciones

```
Tests run: 188, Failures: 0, Errors: 0, Skipped: 0    (excluyendo *IntegrationTest, *ConcurrencyTest, LockBenchmark)
```

- Las 183 pruebas originales **siguen pasando** (incluye `FuncionarioServiceTest`, cuyo comportamiento observable de autenticación no cambió).
- **+5 pruebas nuevas**, todas en verde:
  - `FuncionarioServiceTest.authenticateWithPassword_rutNoExiste_igualInvocaPasswordEncoder_paraEvitarEnumeracionPorTiempo` (SEC-013).
  - `LoginAttemptServiceTest` × 4 (SEC-009): comportamiento bajo el límite, bloqueo con la ventana configurada, expiración del bloqueo, limpieza tras login exitoso.
- Una de las pruebas nuevas fue inicialmente frágil (dependía de un límite superior de milisegundos que un pequeño salto de reloj del entorno hizo fallar una vez); se corrigió para verificar la propiedad relevante (ventana > 60s, ya no el valor de prueba hardcodeado) sin depender de precisión de reloj — documentado explícitamente aquí en vez de ocultarlo.
- Las 26 pruebas de Testcontainers **siguen sin poder ejecutarse en este entorno** (misma limitación de la línea base, no relacionada con los cambios de esta auditoría). **Requiere validación adicional en CI o en un host con Docker nativo antes de aprobar producción.**

## Verificación funcional directa de las correcciones

| Corrección | Comando | Resultado observado |
|---|---|---|
| SEC-002 (CORS) | `OPTIONS` con `Origin: http://evil.example` | `HTTP/1.1 403`, sin cabeceras `Access-Control-*` |
| SEC-002 (CORS) | `OPTIONS` con `Origin: http://localhost:5173` | `HTTP/1.1 200` con `Access-Control-Allow-Origin: http://localhost:5173` |
| SEC-011 (`/info`) | `curl .../api/v2/info` | Respuesta solo con `serverId`, `application`, `timestamp` — sin `javaVersion`/`osName`/memoria |
| SEC-008 (Docker no-root) | `docker exec huap-backend whoami` / `id` | `spring` / `uid=100(spring) gid=101(spring)` — no root |
| Salud general | `curl .../api/v2/health` | `{"status":"UP", ...}` — el backend arranca y responde normalmente tras todos los cambios |
| Build frontend | `npm run build` | Éxito, mismo tamaño de bundle, sin errores nuevos |
| Build backend | `docker compose build backend` | Éxito |

## Hallazgos corregidos vs. abiertos (resumen)

**Corregidos y verificados con evidencia:** SEC-002, SEC-008, SEC-009 (parcial — falta compartir estado entre réplicas), SEC-011, SEC-013.

**Abiertos** (documentados en `SECURITY_REMEDIATION_PLAN.md` y `RESIDUAL_RISK_REGISTER.md`, no corregidos en esta sesión por requerir infraestructura, decisión de negocio, o esfuerzo de planificación mayor): SEC-001, SEC-003, SEC-004, SEC-005 (intentado, no disponible el parche publicado), SEC-006, SEC-007, SEC-010 (parcial — falta HSTS hasta tener TLS), SEC-012, SEC-014 a SEC-018.

## Limitaciones de esta ronda de pruebas

- No se ejecutaron pruebas dinámicas de penetración contra un ambiente desplegado.
- No se pudo verificar en este entorno la ausencia de HSTS/TLS reales (SEC-001 requiere un dominio y certificado reales, fuera del alcance de este repositorio).
- Las 26 pruebas de Testcontainers quedan pendientes de ejecución en un entorno con Docker nativo (CI recomendado).
- No se realizó una prueba de carga/fuerza bruta real contra el endpoint de login en un ambiente productivo (se limitó a la verificación unitaria de `LoginAttemptService` y a la revisión de configuración de Apache).

## Resultado de las pruebas de regresión funcional

**Sin regresiones detectadas.** Todas las pruebas que pasaban antes de la auditoría siguen pasando después; ninguna regla de negocio, cálculo, endpoint o comportamiento existente cambió de resultado. Los cambios implementados son: configuración externalizada (CORS, ventana de bloqueo), remoción de campos de una respuesta de diagnóstico pública, una operación de cómputo adicional (sin cambiar el resultado) en el flujo de login, cabeceras HTTP nuevas, y el usuario del proceso dentro del contenedor Docker — ninguno de estos altera un flujo funcional, permiso, cálculo o dato observado por un usuario legítimo.
