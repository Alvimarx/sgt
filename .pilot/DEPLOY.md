# Runbook de despliegue — SGT-HUAP en la VM Hetzner (167.233.77.149)

Topología reducida: **MySQL (interno) + 1 backend (interno) + 1 frontend (única entrada)**.
Archivos: `docker-compose.hetzner.yml`, `.env.hetzner.example`, `scripts/init_db.sh`,
`scripts/backup_mysql.sh`. Rama: `claude/gitlab-repo-clone-mmcq8a`.

> Todo se ejecuta **en la VM** (`ssh root@167.233.77.149`). La sesión de Claude no tiene
> acceso SSH ni demonio Docker: el backend sí fue compilado y el compose validado ahí.

---

## Estado verificado de la VM (2026-08-21)

| Dato | Valor | Consecuencia |
|---|---|---|
| RAM | 3.7 GB (3.0 GB disponibles) | Alcanza; el stack tope ~1.8 GB. **Falta swap: crearla.** |
| Swap | 0 B | Crear 2 GB antes de construir el frontend (Paso 1b) |
| Disco | 38 GB, 27 GB libres | De sobra (~4 GB entre imágenes y datos) |
| CPU | 2 vCPU | Suficiente; el build inicial tardará unos minutos |
| Contenedores corriendo | **ninguno** | El "otro sistema" NO está levantado — verificar con `docker ps -a` |
| Puertos 80/443 | libres | Se puede exponer directo; igual usamos 8090 para no chocar cuando vuelva el otro sistema |

## Paso 0 — Reconocimiento (antes de tocar nada)

```bash
ssh root@167.233.77.149
free -h; df -h /; nproc                       # RAM / disco / CPUs
docker --version && docker compose version    # ¿Docker instalado?
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'   # el otro sistema
ss -tlnp | grep -E ':(80|443|8090|3306) '     # ¿quién ocupa 80/443?
```

Qué mirar:

| Resultado | Qué implica |
|---|---|
| RAM disponible < 1.5 GB | Falta margen: crear swap (Paso 1b) antes de construir el frontend |
| Algo escuchando en 80/443 | Hay reverse proxy: usar `PUBLIC_BIND=127.0.0.1` y colgarse de él (Paso 6b) |
| Nada en 80/443 | Se puede exponer directo con `PUBLIC_BIND=0.0.0.0` |
| Ya hay un MySQL en 3306 | Sin conflicto: el nuestro no publica puertos |

## Paso 1 — Requisitos

```bash
# Docker (solo si el Paso 0 mostró que falta)
curl -fsSL https://get.docker.com | sh

# 1b. Swap — OBLIGATORIO en esta VM (3.7 GB RAM, 0 B de swap). El build del
#     frontend (Vite) pide hasta 2.5 GB y sin swap puede matar por OOM al
#     otro sistema de la VM.
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## Paso 2 — Clonar el repositorio

```bash
mkdir -p /opt && cd /opt
git clone -b claude/gitlab-repo-clone-mmcq8a https://github.com/Alvimarx/sgt.git sgt
cd /opt/sgt
```

Si el repo es privado, GitHub pedirá usuario y **token** (PAT con scope `repo`) como
contraseña. Alternativa: clonar desde el origen de GitLab con las credenciales que ya usaste.

## Paso 3 — Variables de entorno y secretos

```bash
cd /opt/sgt
cp .env.hetzner.example .env.hetzner

# Genera los 4 secretos y pégalos en el archivo
for n in MYSQL_ROOT_PASSWORD DB_PASSWORD HOSPITAL_DB_PASSWORD; do
  echo "$n=$(openssl rand -base64 24 | tr -d '/+=')"
done
echo "JWT_SECRET=$(openssl rand -base64 48)"

nano .env.hetzner    # pegar los valores; revisar CORS_ALLOWED_ORIGINS y PUBLIC_BIND/PORT
chmod 600 .env.hetzner
```

Alternativa sin editor — genera el archivo completo de una vez (valores ya ajustados a
esta VM). Las contraseñas salen alfanuméricas a propósito, para no romper el parseo del
archivo `.env`:

```bash
cd /opt/sgt
gen() { openssl rand -base64 24 | tr -d '/+='; }
cat > .env.hetzner <<EOF
MYSQL_ROOT_PASSWORD=$(gen)
DB_USERNAME=sgt_app
DB_PASSWORD=$(gen)
HOSPITAL_DB_USERNAME=sgt_hospital_ro
HOSPITAL_DB_PASSWORD=$(gen)
JWT_SECRET=$(openssl rand -base64 48)
CORS_ALLOWED_ORIGINS=http://167.233.77.149:8090
PUBLIC_BIND=0.0.0.0
PUBLIC_PORT=8090
LOGIN_LOCK_DURATION_MS=900000
BACKUP_DIR=./backups
RETENTION_DAYS=7
EOF
chmod 600 .env.hetzner
```

`CORS_ALLOWED_ORIGINS` debe ser **exactamente** la URL que verás en el navegador
(`http://167.233.77.149:8090` al principio; cámbialo si luego pones dominio + HTTPS).

## Paso 4 — Base de datos primero (el orden importa)

El backend arranca con `DDL_AUTO=validate`: si el esquema no existe, no levanta.

```bash
cd /opt/sgt
docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner up -d mysql

# Esquema + migración V2 + bootstrap + innhosp (+ demo).
# Quita SEED_DEMO=1 si NO quieres los turnos de ejemplo.
SEED_DEMO=1 bash scripts/init_db.sh
```

El script es re-ejecutable e informa qué omite. Al final imprime cuántas tablas,
funcionarios y personas quedaron cargadas.

## Paso 5 — Construir y levantar la aplicación

```bash
docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner up -d --build backend frontend
docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner ps
docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner logs -f backend
```

El primer build tarda varios minutos (Maven + npm). El backend queda `healthy` en
~1–2 min; hasta entonces el healthcheck aparece `starting`.

## Paso 6 — Exponer

### 6a. Directo por IP:puerto (rápido, sin HTTPS)
```bash
ufw allow 8090/tcp    # si usas ufw
```
Y en la **consola de Hetzner Cloud**, si el proyecto tiene Firewall, abrir el TCP 8090.
Luego: `http://167.233.77.149:8090`

### 6b. Detrás del reverse proxy existente (recomendado si ya hay uno)
Poner `PUBLIC_BIND=127.0.0.1` en `.env.hetzner`, recrear el frontend, y agregar al proxy
un vhost que apunte a `127.0.0.1:8090`. Ejemplo con Caddy (TLS automático):

```
sgt.tudominio.cl {
    reverse_proxy 127.0.0.1:8090
}
```
Con nginx: `location / { proxy_pass http://127.0.0.1:8090; proxy_set_header Host $host; }`

Al usar dominio, actualizar `CORS_ALLOWED_ORIGINS=https://sgt.tudominio.cl` y recrear
el backend.

## Paso 7 — Verificación (smoke test)

```bash
curl -s http://127.0.0.1:8090/api/v2/health    # backend a través del proxy del frontend
curl -sI http://127.0.0.1:8090/ | head -1      # frontend sirve la SPA
```

En el navegador, con `SEED_DEMO=1`, usuarios de prueba (clave **`huap2025`**):

| RUT | Perfil |
|---|---|
| `11111111-1` | Admin Bootstrap (ADMINISTRADOR) |
| `12345678-9` | Álvaro López — JEFATURA |
| `12345677-0` | Fernando Rojas — MÉDICO |

Probar: login → ver el servicio "Administración" → crear un servicio → registrar un
funcionario (debe aparecer el listado que viene de `viewPersonal`) → generar turnos.

## Paso 8 — Respaldos

```bash
bash scripts/backup_mysql.sh                                     # probar a mano
crontab -e
# 15 3 * * * cd /opt/sgt && bash scripts/backup_mysql.sh >> /var/log/sgt-backup.log 2>&1
```

Verificar que el respaldo **restaura** (no basta con que exista):
```bash
zcat backups/sgt-*.sql.gz | head -20
```
Y copiar los `.gz` fuera de la VM periódicamente — un respaldo en el mismo disco no
protege contra la pérdida de la VM.

---

## Operación diaria

| Acción | Comando (desde `/opt/sgt`) |
|---|---|
| Estado | `docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner ps` |
| Logs backend | `... logs -f backend` |
| Reiniciar backend | `... restart backend` |
| Actualizar código | `git pull && ... up -d --build backend frontend` |
| Consola MySQL | `... exec mysql mysql -uroot -p gestionturnos` |
| Apagar todo | `... down` (los datos sobreviven en el volumen `mysql_data`) |

## Decisiones y trampas conocidas

- **MySQL no publica puertos**: solo es alcanzable dentro de la red Docker. Para entrar,
  `docker compose exec`. No abrir 3306 a internet.
- **`setup_innhosp.sql` hace TRUNCATE de `personalAux`**: `init_db.sh` solo lo ejecuta si
  `innhosp` aún no existe, para no pisar datos reales si algún día los cargas.
- **La migración V2 no es idempotente** (`ADD COLUMN` sin `IF NOT EXISTS`): el script la
  aplica solo si falta la columna `Turnos.id_ejecucion`.
- **Usuarios de BD con privilegio mínimo**: la app usa `sgt_app` (R/W en gestionturnos) y
  `sgt_hospital_ro` (SELECT solo en `innhosp.viewPersonal`), nunca root.
- **Contraseñas del personal**: el backend usa `DelegatingPasswordEncoder` con BCrypt por
  defecto y **SHA-512 como fallback** para hashes sin prefijo — por eso los datos de demo
  (sembrados con `SHA2(...,512)`) sí permiten iniciar sesión.
- **Un solo backend**: el bloqueo antifuerza bruta del login vive en memoria del proceso;
  con una sola instancia es consistente (con 3 era evadible repartiendo intentos).
- **Corte al actualizar**: con un backend, cada `up -d --build backend` corta la API
  ~30–60 s. Hacerlo en horario de baja demanda.
