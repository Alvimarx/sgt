# Simulador del padrón del HUAP

**Solo para la demostración del SGT-HUAP. No se despliega en producción.**

El SGT no crea personas: inicia sesión y da de alta contra el padrón del hospital, la base
`innhosp` (vista `viewPersonal`, que el SGT lee en solo lectura). En la demostración
`innhosp` es una copia ficticia y no hay cómo agregar ni sacar gente. Este servicio
es una aplicación aparte, con su propio contenedor, que escribe en esa copia para mostrar que
«al hospital entran y salen personas» y que el SGT lo refleja. No está dentro del SGT: el
backend del SGT sigue leyendo `innhosp` en solo lectura. En el hospital real el padrón lo
mantiene quien administra `innhosp`.

## Qué hace

Una página (HTML servido por el mismo servidor, sin paso de build) con:

- la lista del padrón, con búsqueda por RUT o nombre, filtro por estado y el estado de cada persona;
- **Agregar persona**: RUT (valida el dígito verificador), nombres, apellidos, profesión o cargo
  y la clave inicial que escribe el operador;
- **Sacar del padrón**: la persona queda sin poder iniciar sesión;
- **Volver a agregar**: la reactiva, con la clave que tenía o una nueva.

## Diseño

| Tema | Decisión |
|---|---|
| Qué escribe | Solo `innhosp.personalAux`, la tabla que alimenta `viewPersonal`. Lee además `conf_estados` |
| Alta | `INSERT` con `rol='USUARIO'`, `rrhh=1`, `estado=1` (Activo), profesión y estamento del catálogo del seed (31 Médico, 32 Enfermera(o), 53, 54, 55, 60) y la clave. El RUT va sin puntos ni dígito en `rut` y el dígito en `dv` |
| Baja | **No borra**: `estado` pasa de 1 a 6 («Termino Anticipado / Desvinculado», configurable a 5 o 7). El login del SGT exige `estado = 1`, así que la persona ya no entra. Su ficha (`Funcionario`) y sus turnos en el SGT no se tocan |
| Reactivar | `estado` vuelve a 1; la clave se conserva o se cambia |
| Clave | **SHA-512 sin sal, en hexadecimal (128 caracteres)**, el mismo formato del seed (`SHA2('...', 512)`). **No BCrypt**: `FuncionarioService.normalizeEncodedPassword` solo acepta 128 bytes (hex) o 64 (binario) y rechaza todo lo demás, así que un hash BCrypt, con o sin el prefijo `{bcrypt}`, hace fallar el login (probado el 23 oct: 401, y el backend registra «Longitud de hash inesperada (68 bytes)») |
| Usuario MySQL | `padron_demo` (o `PADRON_DB_USER`): `SELECT` e `INSERT` en `personalAux`, `UPDATE` solo de las columnas `estado` y `clave`, `SELECT` en `conf_estados`. Sin `DELETE` y sin acceso a `gestionturnos`. Lo crea `scripts/crear_usuario_padron_demo.sh` |
| Acceso | Autenticación básica con `PADRON_ADMIN_USER` y `PADRON_ADMIN_PASSWORD`. Si falta cualquier variable `PADRON_*` obligatoria, o la clave de acceso tiene menos de 12 caracteres, el servicio **no arranca**. No hay claves por defecto. Los intentos fallidos esperan 1 s. Las escrituras exigen `application/json` y un `Origin` igual al `Host` (anti-CSRF) |
| Red | Escucha en `127.0.0.1`. En el contenedor escucha en `0.0.0.0` y el compose publica el puerto solo en `127.0.0.1` de la máquina anfitriona |
| Recursos | Node 22 Alpine; `mem_limit: 96m` (usa unos 20 MB), sistema de archivos de solo lectura, sin capacidades |

## Variables

| Variable | Obligatoria | Qué es |
|---|---|---|
| `PADRON_ADMIN_USER`, `PADRON_ADMIN_PASSWORD` | sí | Acceso a la página (clave de 12 o más caracteres) |
| `PADRON_DB_USER` | no (`padron_demo`) | Usuario MySQL del simulador |
| `PADRON_DB_PASSWORD` | sí | Su clave (16 o más caracteres de `A-Za-z0-9._@%^*-`) |
| `PADRON_DB_HOST` | sí | Lo fija el compose (`db` en local, `mysql` en la VM) |
| `PADRON_BIND` | no (`127.0.0.1`) | Dirección en que el compose publica el puerto |
| `PADRON_PUBLIC_PORT` | no (`8091`) | Puerto publicado en la anfitriona |

Van en `.env.local` o en `.env.hetzner` (ignorados por Git; las plantillas `.example` traen las
variables vacías). Nunca se escriben en el repositorio.

## Levantarlo en local

Requisitos: la pila local arriba (`huap-db-local`, `huap-backend-local`).

```bash
cd ~/Projects/SGT
# 1. claves nuevas, solo en .env.local (ignorado por Git)
{ echo "PADRON_DB_PASSWORD=$(openssl rand -hex 16)"
  echo "PADRON_ADMIN_USER=operador"
  echo "PADRON_ADMIN_PASSWORD=$(openssl rand -hex 12)"; } >> .env.local
# 2. usuario MySQL (toma PADRON_DB_PASSWORD de .env.local)
bash scripts/crear_usuario_padron_demo.sh local
# 3. levantar el servicio (perfil demo: no arranca con el resto)
docker compose -f docker-compose.local.yml --env-file .env.local --profile demo up -d --build padron
# 4. abrir http://localhost:8091  (usuario y clave: PADRON_ADMIN_* de .env.local)
```

El backend local recibe todo `.env.local` por `env_file`, también estas variables; son inocuas.
Apagar: `docker compose -f docker-compose.local.yml --env-file .env.local --profile demo rm -sf padron`.

## Levantarlo en la VM

En la VM, desde `/opt/sgt` y con el checkout al día (`docker-compose.hetzner.yml` y
`simulador-padron/` tienen que estar en el commit desplegado):

```bash
cd /opt/sgt
# 1. variables en .env.hetzner (ignorado por Git)
{ echo "PADRON_DB_PASSWORD=$(openssl rand -hex 16)"
  echo "PADRON_ADMIN_USER=operador"
  echo "PADRON_ADMIN_PASSWORD=$(openssl rand -hex 12)"; } >> .env.hetzner
# 2. usuario MySQL (usa scripts/mysql.sh; la clave entra por stdin)
bash scripts/crear_usuario_padron_demo.sh vm
# 3. levantar (construye una imagen chica; node:22-alpine, dos dependencias)
docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner --profile demo up -d --build padron
```

Desde el computador de la demostración, un túnel ssh (el puerto de la VM solo escucha en su
`127.0.0.1`):

```bash
ssh -L 8091:127.0.0.1:8091 efeso        # y dejar la sesión abierta
# abrir http://localhost:8091 ; la clave: en la VM, grep '^PADRON_ADMIN_' /opt/sgt/.env.hetzner
```

Apagar y dejar la VM como estaba:

```bash
docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner --profile demo rm -sf padron
bash scripts/mysql.sh -e "DROP USER IF EXISTS 'padron_demo'@'%'"   # opcional
```

**Publicarlo en la red** (normalmente no hace falta; el túnel basta): `PADRON_BIND=0.0.0.0` en
`.env.hetzner` y abrir el puerto en el firewall. No conviene: la autenticación básica viaja en
claro por HTTP y la página puede cambiar quién entra al SGT. Si algún día hiciera falta,
ponerlo detrás de un reverse proxy con TLS y, de preferencia, restringido por IP.

## Guion de la demostración

Tener dos pestañas: el SGT (jefatura o administrador, servicio Urgencias) y el simulador.
Usar RUT de prueba con dígito verificador válido, por ejemplo `40.000.002-6` o `40.000.003-4`.

1. **Entra alguien nuevo.** En el simulador, «Agregar persona»: RUT, nombres, apellidos, cargo
   y una clave que se escribe ahí mismo. Aparece en la lista como «En el padrón».
2. **El SGT la ve.** En el SGT, «Asignación» → sumar a Urgencias por ese RUT. El SGT la
   registra con los datos del padrón y queda como médico del servicio. Asignarle turnos.
3. **Inicia sesión.** En una ventana privada, entrar al SGT con ese RUT y la clave. Ve sus turnos.
4. **Sale alguien.** En el simulador, «Sacar del padrón» sobre esa persona. En la ventana
   privada, cerrar sesión e intentar entrar de nuevo: «Credenciales inválidas». En el SGT su
   ficha y sus turnos siguen ahí; la jefatura decide qué hacer con ellos.
5. **Vuelve.** «Volver a agregar» y puede iniciar sesión otra vez.
6. **Dejarlo limpio.** Sacar del padrón a las personas de prueba antes de terminar.

Tener presente: el SGT bloquea un RUT por varios intentos de login fallidos
(`LOGIN_LOCK_DURATION_MS`, 15 minutos por defecto), y el intento tras la baja cuenta como uno.

## Probarlo

```bash
cd simulador-padron && npm ci && npm test      # 31 pruebas, sin base de datos
```

No hay claves en las pruebas: se generan al momento.
