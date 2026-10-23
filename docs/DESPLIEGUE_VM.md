# Despliegue de demostración en una VM

Cómo se instala y se actualiza el SGT en la VM de demostración (Hetzner). Reemplaza el
runbook de agosto (`.pilot/DEPLOY.md`), que construía las imágenes en la VM. Para un
despliegue en la infraestructura del HUAP, ver además
`docs/security/INTERNET_DEPLOYMENT_SECURITY_CHECKLIST.md`.

## Topología

`docker-compose.hetzner.yml`, proyecto compose `sgt-huap`:

| Contenedor | Qué es |
|---|---|
| `sgt-mysql` | MySQL 8.0 con las dos bases (`gestionturnos` e `innhosp` de demostración). Sin puertos publicados |
| `sgt-backend` | 1 backend, solo en la red interna de Docker |
| `sgt-frontend` | Apache con la SPA, única entrada; hace de proxy de `/api/v2` hacia el backend (`apache/dev/httpd.conf`) |

Cada contenedor tiene límite de memoria, porque la VM (2 vCPU, unos 4 GB) la comparte
otro sistema.

## Regla principal: no construir en la VM

Las imágenes se construyen en el equipo de desarrollo y se suben ya hechas. El build de
Vite pide hasta 2,5 GB y el de Maven algo parecido: hacerlo en la VM puede dejar sin
memoria al otro sistema.

| Qué | Comando, en el equipo de desarrollo |
|---|---|
| Frontend | `bash scripts/desplegar_frontend_hetzner.sh` |
| Backend | `bash scripts/desplegar_backend_hetzner.sh` |
| Frontend y turnos de demostración vigentes | `DATOS_DEMO=1 bash scripts/desplegar_frontend_hetzner.sh` |

Conviene correrlos desde un clon que sea solo copia de GitHub, sin commits propios: el
script lo pone al día solo antes de construir. Desde un clon con trabajo local también
funcionan, siempre que lo que se despliega ya esté subido.

Los dos scripts usan la sesión SSH `efeso` (variable `SSH_HOST`) y la carpeta `/opt/sgt`
de la VM (`DIR_REMOTO`). Cada uno:

1. Exige que lo que despliega esté subido a GitHub e igual a la rama que sigue la rama
   local. Si no, se detiene y pide hacer `git push`.
2. Construye la imagen desde el último commit, no desde el árbol de trabajo.
3. Pone al día el checkout de la VM con esa rama de GitHub (compose, configuración de
   Apache, scripts y SQL). Si el checkout tiene cambios locales en archivos versionados,
   no lo toca y se detiene.
4. Recrea solo su contenedor. Deja la imagen anterior etiquetada como `previo-<fecha>` e
   imprime el comando para volver atrás.
5. Comprueba la salud de la API y, al final, muestra los contenedores `sgt-*`.

El backend corta la API mientras arranca (1 a 2 minutos). Si desde el último backend
desplegado hay migraciones nuevas en `BaseDatosMySQL/migraciones/`, el script se detiene
antes de recrearlo: hay que aplicarlas en la VM con `scripts/mysql.sh` y volver a correrlo
con `MIGRACIONES_APLICADAS=1`.

## Instalación desde cero

En la VM, salvo que se diga otra cosa:

1. **Requisitos:** Docker con Compose. Swap de 2 GB si la VM no tiene, para que un pico de
   memoria no afecte al otro sistema:
   ```bash
   fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```
2. **Clonar** la rama acordada en `/opt/sgt`:
   ```bash
   git clone -b <rama> <URL del repositorio> /opt/sgt
   ```
3. **Variables:** `cp .env.hetzner.example .env.hetzner`, completar y `chmod 600 .env.hetzner`.
   Secretos nuevos para este ambiente, alfanuméricos para no romper el archivo `.env`:
   ```bash
   gen() { openssl rand -base64 24 | tr -d '/+='; }   # MYSQL_ROOT_PASSWORD, DB_PASSWORD, HOSPITAL_DB_PASSWORD
   openssl rand -base64 48                              # JWT_SECRET
   ```
   `CORS_ALLOWED_ORIGINS` tiene que ser exactamente la URL que se abre en el navegador.
   `.env.hetzner` nunca se versiona.
4. **Base de datos primero.** El backend arranca con `DDL_AUTO=validate`: sin esquema no
   levanta.
   ```bash
   cd /opt/sgt
   docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner up -d mysql
   SEED_DEMO=1 bash scripts/init_db.sh     # esquema, V2, bootstrap, innhosp y datos de demostración
   ```
   `init_db.sh` se puede volver a correr e informa lo que omite. Sin `SEED_DEMO=1` no carga
   los datos de demostración.
5. **Imágenes**, desde el equipo de desarrollo: `bash scripts/desplegar_backend_hetzner.sh`
   y después `DATOS_DEMO=1 bash scripts/desplegar_frontend_hetzner.sh`.
6. **Exponer:**
   - Directo por puerto, sin HTTPS: `PUBLIC_BIND=0.0.0.0` y `PUBLIC_PORT` en `.env.hetzner`,
     y abrir ese puerto en el firewall de la VM y en el del proveedor.
   - Recomendado: `PUBLIC_BIND=127.0.0.1` y un reverse proxy con TLS delante (por ejemplo,
     Caddy con `reverse_proxy 127.0.0.1:<PUBLIC_PORT>`). Con dominio, actualizar
     `CORS_ALLOWED_ORIGINS` y recrear el backend.
7. **Respaldos:** `bash scripts/backup_mysql.sh` (respalda las dos bases, comprimido y con
   rotación) y un cron diario, como el que sugiere su encabezado. Probar que el respaldo
   restaura y copiarlo fuera de la VM: un respaldo en el mismo disco no protege si se
   pierde la VM.

## Operación

| Acción | Comando |
|---|---|
| Desplegar | los scripts de arriba, desde el equipo de desarrollo |
| Estado | en la VM, desde `/opt/sgt`: `docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner ps` |
| Logs del backend | en la VM: `docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner logs -f backend` |
| Consola MySQL | en la VM: `bash scripts/mysql.sh` (fija utf8mb4; no llamar a `mysql` a mano) |
| Diagnóstico de un login | en la VM: `bash scripts/diagnostico_login.sh <rut>` |
| Apagar | en la VM: `docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner down`. Los datos quedan en el volumen `mysql_data` |

## Simulador del padrón (solo demostración)

`simulador-padron/` es una página aparte que agrega y saca personas de `innhosp.personalAux`
para mostrar que «al hospital entran y salen personas» (el SGT sigue leyendo `innhosp` en solo
lectura). Va en el perfil `demo` de `docker-compose.hetzner.yml` (servicio `padron`, límite
de 96 MB) y no arranca solo. Escucha únicamente en el `127.0.0.1` de la VM: se entra con un
túnel ssh. Detalle y guion: `simulador-padron/README.md`.

```bash
cd /opt/sgt
{ echo "PADRON_DB_PASSWORD=$(openssl rand -hex 16)"; echo "PADRON_ADMIN_USER=operador"; echo "PADRON_ADMIN_PASSWORD=$(openssl rand -hex 12)"; } >> .env.hetzner
bash scripts/crear_usuario_padron_demo.sh vm      # usuario MySQL con permisos solo sobre personalAux
docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner --profile demo up -d --build padron
# desde el computador de la demostración:
ssh -L 8091:127.0.0.1:8091 efeso                  # y abrir http://localhost:8091
```

Sin `PADRON_ADMIN_USER`, `PADRON_ADMIN_PASSWORD` o `PADRON_DB_PASSWORD` el servicio no arranca.
Publicarlo con `PADRON_BIND=0.0.0.0` no conviene: es HTTP con autenticación básica. Apagarlo:
`docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner --profile demo rm -sf padron`.

## Trampas conocidas

- **Charset en comandos manuales.** Dentro del contenedor, el cliente `mysql` sin flags
  negocia latin1 y los acentos quedan doblemente codificados. Para consolas y cargas de
  SQL, siempre `bash scripts/mysql.sh`.
- **El cliente `mysql` corta el archivo al primer error.** Un INSERT que viola una clave
  única deja sin cargar todo lo que viene después, y dentro de un `|| true` no se nota.
  Después de cargar un seed, verificar contando filas.
- **El poblado de demostración es destructivo:** empieza con `FOREIGN_KEY_CHECKS=0` y
  vacía 20 tablas. Por eso `init_db.sh` lo deja detrás de `SEED_DEMO=1`. Nunca correrlo
  contra una base con datos que importen.
- **`setup_innhosp.sql` vacía `personalAux`:** `init_db.sh` solo lo ejecuta si `innhosp`
  aún no existe.
- **La migración V2 no es idempotente** (`ADD COLUMN` sin `IF NOT EXISTS`): `init_db.sh`
  la aplica solo si falta la columna `Turnos.id_ejecucion`.
- **MySQL no publica puertos.** Se entra con `docker compose exec` o `scripts/mysql.sh`.
  No abrir el 3306 a internet.
- **Usuarios de base con privilegio mínimo:** la app usa uno con lectura y escritura solo
  en `gestionturnos` y otro con `SELECT` solo sobre `innhosp.viewPersonal`; nunca root.
- **Claves del personal:** el backend solo acepta SHA-512 sin sal (hex de 128 caracteres o
  binario de 64 bytes); un hash BCrypt se rechaza (comprobado el 23 oct). Por eso los datos de demostración, sembrados con `SHA2(..., 512)`, permiten
  iniciar sesión.
- **Un solo backend:** el bloqueo de login por intentos fallidos vive en la memoria del
  proceso. Con varias instancias no se comparte.
- **Usuarios de demostración:** el seed de despliegue trae un administrador de arranque y
  personal ficticio con una clave común. Si la VM queda expuesta a internet, cambiar esas
  claves o desactivar esos usuarios cuando ya no se usen para demostrar.
