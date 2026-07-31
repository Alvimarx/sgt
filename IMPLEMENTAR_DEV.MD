# Implementar DEV — guía rápida

Guía técnica mínima para levantar SGT-HUAP en DEV. Detalle completo: [`docs/AMBIENTE_DEV.md`](docs/AMBIENTE_DEV.md).

## Requisitos

- Docker + Docker Compose.
- Red con alcance a las 2 BD externas (`10.6.15.193:3309` gestionturnos, `10.6.15.193:3307` hospital).
- Archivo `.env.dev` con credenciales reales (no versionado).

## Pasos

```bash
# 1. Crear .env.dev (si no existe) a partir de la plantilla
cp .env.example .env.dev
# completar: DB_URL/USERNAME/PASSWORD, HOSPITAL_DB_URL/USERNAME/PASSWORD, JWT_SECRET

# 2. Validar config (sintaxis + variables resueltas)
docker compose -f docker-compose.dev.yml --env-file .env.dev config

# 3. Construir
docker compose -f docker-compose.dev.yml --env-file .env.dev build

# 4. Levantar
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d

# 5. Verificar
curl http://localhost:8080/api/v2/health
curl -I http://localhost:5173
```

## Comandos frecuentes

| Acción | Comando |
|---|---|
| Logs (todo) | `docker compose -f docker-compose.dev.yml logs -f` |
| Logs (solo backend) | `docker compose -f docker-compose.dev.yml logs -f backend` |
| Estado | `docker compose -f docker-compose.dev.yml ps` |
| Detener | `docker compose -f docker-compose.dev.yml down` |
| Reconstruir | `docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build --force-recreate` |

## Notas técnicas

- No se levanta ninguna BD local: `backend` se conecta directo a las 2 BD externas vía `.env.dev`.
- `DDL_AUTO=validate` — Hibernate solo valida el esquema, nunca lo altera (ambas BD son externas/compartidas).
- Servicios: `backend` (`:8080`), `frontend` (`:5173`). Sin servicio `db`.
- Si el backend no arranca, revisar conectividad de red antes que la app:
  `Test-NetConnection -ComputerName 10.6.15.193 -Port 3309` (y `-Port 3307`).
