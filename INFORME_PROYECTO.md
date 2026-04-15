# 📋 INFORME TÉCNICO DEL PROYECTO HUAP
## Sistema de Gestión de Turnos Hospitalarios

**Fecha de generación:** 5 de diciembre de 2025  
**Versión:** 1.0.0  
**Autor:** Equipo de Desarrollo HUAP


## 1. Resumen Ejecutivo

**HUAP** (Hospital Universitario de Atención Primaria) es un sistema web completo para la gestión de turnos médicos en entornos hospitalarios. El sistema permite:

- ✅ Gestión de turnos médicos
- ✅ Administración de personal médico
- ✅ Solicitudes de intercambio de turnos
- ✅ Notificaciones en tiempo real
- ✅ Gestión de pisos y servicios
- ✅ Plantillas de turnos configurables
- ✅ Autenticación y autorización basada en roles

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET / RED LOCAL                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────┐
                    │         NGINX LOAD BALANCER         │
                    │         (Puerto 80 / 443)           │
                    │                                     │
                    │  • Round Robin / Least Connections  │
                    │  • Health Checks automáticos        │
                    │  • SSL Termination (opcional)       │
                    └─────────────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
          ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
          │   FRONTEND 1    │ │   FRONTEND 2    │ │   FRONTEND 3    │
          │                 │ │                 │ │                 │
          │  React 19       │ │  React 19       │ │  React 19       │
          │  Vite 7         │ │  Vite 7         │ │  Vite 7         │
          │  Nginx Alpine   │ │  Nginx Alpine   │ │  Nginx Alpine   │
          └─────────────────┘ └─────────────────┘ └─────────────────┘
                    │                  │                  │
                    └──────────────────┼──────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────┐
                    │         API GATEWAY (NGINX)         │
                    │         /api/* → Backend Pool       │
                    └─────────────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
          ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
          │   BACKEND 1     │ │   BACKEND 2     │ │   BACKEND 3     │
          │                 │ │                 │ │                 │
          │  Spring Boot    │ │  Spring Boot    │ │  Spring Boot    │
          │  Java 21        │ │  Java 21        │ │  Java 21        │
          │  Puerto 8080    │ │  Puerto 8080    │ │  Puerto 8080    │
          └─────────────────┘ └─────────────────┘ └─────────────────┘
                    │                  │                  │
                    └──────────────────┼──────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────┐
                    │            MySQL 8.0                │
                    │         192.168.1.150:3306          │
                    │                                     │
                    │  Base de datos: innhosp             │
                    └─────────────────────────────────────┘
```

### 2.2 Diagrama de Despliegue UML

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    <<deployment>>                                        │
│                                   Servidor Principal                                     │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              <<Docker Compose>>                                     │ │
│  │                                huap-network                                         │ │
│  │                                                                                     │ │
│  │   ┌──────────────────────────────────────────────────────────────────────────┐    │ │
│  │   │                        <<container>>                                      │    │ │
│  │   │                        huap-nginx-lb                                      │    │ │
│  │   │                                                                           │    │ │
│  │   │   ┌─────────────────┐                                                    │    │ │
│  │   │   │ <<artifact>>    │  Ports: 80:80, 443:443                             │    │ │
│  │   │   │ nginx.conf      │  Image: nginx:alpine                               │    │ │
│  │   │   └─────────────────┘                                                    │    │ │
│  │   └──────────────────────────────────────────────────────────────────────────┘    │ │
│  │                                       │                                            │ │
│  │              ┌────────────────────────┼────────────────────────┐                  │ │
│  │              ▼                        ▼                        ▼                  │ │
│  │   ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐          │ │
│  │   │ <<container>>   │      │ <<container>>   │      │ <<container>>   │          │ │
│  │   │ huap-frontend-1 │      │ huap-frontend-2 │      │ huap-frontend-3 │          │ │
│  │   │                 │      │                 │      │                 │          │ │
│  │   │ Image: custom   │      │ Image: custom   │      │ Image: custom   │          │ │
│  │   │ Port: 80        │      │ Port: 80        │      │ Port: 80        │          │ │
│  │   └─────────────────┘      └─────────────────┘      └─────────────────┘          │ │
│  │              │                        │                        │                  │ │
│  │              └────────────────────────┼────────────────────────┘                  │ │
│  │                                       ▼                                            │ │
│  │   ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐          │ │
│  │   │ <<container>>   │      │ <<container>>   │      │ <<container>>   │          │ │
│  │   │ huap-backend-1  │      │ huap-backend-2  │      │ huap-backend-3  │          │ │
│  │   │                 │      │                 │      │                 │          │ │
│  │   │ Image: custom   │      │ Image: custom   │      │ Image: custom   │          │ │
│  │   │ Port: 8080      │      │ Port: 8080      │      │ Port: 8080      │          │ │
│  │   │ Java 21         │      │ Java 21         │      │ Java 21         │          │ │
│  │   └─────────────────┘      └─────────────────┘      └─────────────────┘          │ │
│  │                                       │                                            │ │
│  └───────────────────────────────────────┼────────────────────────────────────────────┘ │
│                                          │                                              │
└──────────────────────────────────────────┼──────────────────────────────────────────────┘
                                           │
                                           ▼
                          ┌─────────────────────────────────┐
                          │        <<device>>               │
                          │    Servidor de Base de Datos    │
                          │       192.168.1.150             │
                          │                                 │
                          │   ┌─────────────────────────┐  │
                          │   │     <<database>>        │  │
                          │   │     MySQL 8.0           │  │
                          │   │     Puerto: 3306        │  │
                          │   │     DB: innhosp         │  │
                          │   └─────────────────────────┘  │
                          └─────────────────────────────────┘
```

---

## 3. Stack Tecnológico

### 3.1 Backend

| Componente | Tecnología | Versión |
|------------|------------|---------|
| **Lenguaje** | Java | 21 (LTS) |
| **Framework** | Spring Boot | 3.x |
| **Build Tool** | Maven | 3.9.6 |
| **Base de Datos** | MySQL | 8.0 |
| **ORM** | Hibernate/JPA | - |
| **Seguridad** | Spring Security + JWT | - |
| **Contenedor** | Docker (Eclipse Temurin) | 21-jdk-alpine |

### 3.2 Frontend

| Componente | Tecnología | Versión |
|------------|------------|---------|
| **Lenguaje** | JavaScript (ES6+) | - |
| **Framework** | React | 19.1.1 |
| **Build Tool** | Vite | 7.1.2 |
| **Estilos** | TailwindCSS | 3.4.8 |
| **Iconos** | Lucide React | 0.542.0 |
| **HTTP Client** | Axios | 1.11.0 |
| **Router** | React Router DOM | 7.8.2 |
| **Fechas** | Day.js | 1.11.18 |
| **Servidor Web** | Nginx | Alpine |

### 3.3 Infraestructura

| Componente | Tecnología | Versión |
|------------|------------|---------|
| **Contenedores** | Docker | 29.0.0 |
| **Orquestación** | Docker Compose | 2.39.2 |
| **Load Balancer** | Nginx | Alpine |
| **Sistema Operativo** | Ubuntu | 24.04.3 LTS |
| **Kernel** | Linux | 6.14.0-36-generic |

---

## 4. Backend - Análisis Detallado

### 4.1 Estructura de Paquetes

```
com.pingeso.HUAP/
├── Config/
│   ├── CorsConfig.java          # Configuración CORS
│   └── SecurityConfig.java       # Configuración Spring Security
├── Controller/
│   ├── CategoriaTipoTurnoController.java
│   ├── EventsController.java
│   ├── HealthController.java     # Health checks para LB
│   ├── NotificacionController.java
│   ├── PersonalController.java
│   ├── PisoController.java
│   ├── PlantillaPisoController.java
│   ├── PlantillaPisoLineaController.java
│   ├── ServicioController.java
│   ├── SolicitudController.java
│   ├── TipoTurnoController.java
│   ├── TurnoBaseController.java
│   └── TurnoController.java
├── DTO/                          # Data Transfer Objects
├── Entity/                       # Entidades JPA
├── Repository/                   # Repositorios Spring Data
├── Security/
│   ├── JwtAuthenticationEntryPoint.java
│   ├── JwtAuthenticationFilter.java
│   └── JwtTokenProvider.java
├── Service/                      # Lógica de negocio
├── Utils/                        # Utilidades
├── middleware/                   # Middlewares
└── HuapApplication.java          # Clase principal
```
---

## 5. Frontend - Análisis Detallado

### 5.1 Estructura de Componentes

```
src/
├── components/
│   ├── Administracion/           # Panel de administración
│   │   ├── jsx/
│   │   │   ├── AdminPage.jsx
│   │   │   ├── DoctorForm.jsx
│   │   │   ├── DoctorsTable.jsx
│   │   │   ├── AsignadorTurnos.jsx
│   │   │   ├── CreadorPlantillaTurno.jsx
│   │   │   └── ...
│   │   └── css/
│   ├── Calendario/               # Vistas de calendario
│   ├── Login/                    # Autenticación
│   ├── Menu/                     # Navegación
│   ├── Notificaciones/           # Sistema de alertas
│   ├── Solicitudes/              # Gestión de solicitudes
│   ├── Turnos/                   # Visualización de turnos
│   └── Shared/                   # Componentes reutilizables
├── context/
│   ├── AuthContext.jsx           # Estado de autenticación
│   └── NotificationContext.jsx   # Estado de notificaciones
├── services/
│   ├── adminService.js           # API de administración
│   ├── authService.js            # API de autenticación
│   └── turnosService.js          # API de turnos
├── utils/
│   ├── axiosConfig.js            # Configuración Axios + JWT
│   ├── tokenManager.js           # Gestión de tokens
│   ├── dateUtils.js              # Utilidades de fechas
│   └── PlantillaEngine.js        # Motor de plantillas
├── constants/
│   └── roles.js                  # Definición de roles
├── App.jsx                       # Componente raíz
├── App.css                       # Estilos globales
├── main.jsx                      # Punto de entrada
└── index.css                     # Estilos base
```
---

## 6. Base de Datos

### 6.1 Información de Conexión

| Parámetro | Valor |
|-----------|-------|
| **Host** | 192.168.1.150 |
| **Puerto** | 3306 |
| **Base de Datos** | innhosp |
| **Motor** | MySQL 8.0 |
| **Usuario** | root |

---

## 7. Arquitectura de Balanceo de Carga

### 7.1 Diagrama de Flujo de Tráfico

```
                                    CLIENTE
                                       │
                                       │ HTTP Request
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           NGINX LOAD BALANCER                                 │
│                              Puerto 80/443                                    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         ROUTING RULES                                    │ │
│  │                                                                          │ │
│  │   /api/*  ──────────────────────► upstream backend_servers               │ │
│  │                                   (least_conn algorithm)                 │ │
│  │                                                                          │ │
│  │   /*      ──────────────────────► upstream frontend_servers              │ │
│  │                                   (ip_hash algorithm)                    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                    │                                    │
                    ▼                                    ▼
    ┌───────────────────────────────┐    ┌───────────────────────────────┐
    │      BACKEND POOL             │    │      FRONTEND POOL            │
    │                               │    │                               │
    │  ┌─────────┐ ┌─────────┐     │    │  ┌─────────┐ ┌─────────┐     │
    │  │backend-1│ │backend-2│     │    │  │frontend1│ │frontend2│     │
    │  │ :8080   │ │ :8080   │     │    │  │  :80    │ │  :80    │     │
    │  └─────────┘ └─────────┘     │    │  └─────────┘ └─────────┘     │
    │       ┌─────────┐            │    │       ┌─────────┐            │
    │       │backend-3│            │    │       │frontend3│            │
    │       │ :8080   │            │    │       │  :80    │            │
    │       └─────────┘            │    │       └─────────┘            │
    └───────────────────────────────┘    └───────────────────────────────┘
```

### 7.2 Algoritmos de Balanceo

| Pool | Algoritmo | Justificación |
|------|-----------|---------------|
| **Backend** | `least_conn` | Distribuye carga según conexiones activas, ideal para APIs con tiempos de respuesta variables |
| **Frontend** | `ip_hash` | Asegura que un usuario siempre llegue al mismo servidor, mejora cache del navegador |

### 7.3 Configuración de Upstream

```nginx
# Backend Pool
upstream backend_servers {
    least_conn;
    server backend-1:8080 weight=1 max_fails=3 fail_timeout=30s;
    server backend-2:8080 weight=1 max_fails=3 fail_timeout=30s;
    server backend-3:8080 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Frontend Pool
upstream frontend_servers {
    ip_hash;
    server frontend-1:80 weight=1 max_fails=3 fail_timeout=30s;
    server frontend-2:80 weight=1 max_fails=3 fail_timeout=30s;
    server frontend-3:80 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 16;
}
```

---

## 8. Configuración de Despliegue

### 8.1 Servicios Docker Compose

| Servicio | Imagen | Puertos | Réplicas |
|----------|--------|---------|----------|
| `nginx-lb` | nginx:alpine | 80, 443 | 1 |
| `frontend-1` | huap-frontend-1:latest | 80 (interno) | 1 |
| `frontend-2` | huap-frontend-2:latest | 80 (interno) | 1 |
| `frontend-3` | huap-frontend-3:latest | 80 (interno) | 1 |
| `backend-1` | huap-backend-1:latest | 8080 (interno) | 1 |
| `backend-2` | huap-backend-2:latest | 8080 (interno) | 1 |
| `backend-3` | huap-backend-3:latest | 8080 (interno) | 1 |

### 8.2 Variables de Entorno

```bash
# Base de Datos
DB_HOST=192.168.1.150
DB_USERNAME=root
DB_PASSWORD=secret
DDL_AUTO=none

# Seguridad
JWT_SECRET=HUAPSecretKeyForJWTTokenGeneration...

# Frontend
VITE_API_BASE_URL=http://localhost/api/v1
```

### 8.3 Red Docker

| Parámetro | Valor |
|-----------|-------|
| **Nombre** | huap-network |
| **Driver** | bridge |
| **Subnet** | 172.20.0.0/16 |

---

## 9. Seguridad

### 9.1 Autenticación JWT

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Cliente   │         │   Backend   │         │   MySQL     │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  POST /login          │                       │
       │  {user, password}     │                       │
       │──────────────────────►│                       │
       │                       │  Validar credenciales │
       │                       │──────────────────────►│
       │                       │◄──────────────────────│
       │                       │                       │
       │                       │  Generar JWT          │
       │  {token, expiration}  │                       │
       │◄──────────────────────│                       │
       │                       │                       │
       │  GET /api/v1/turnos   │                       │
       │  Authorization: Bearer│                       │
       │──────────────────────►│                       │
       │                       │  Validar JWT          │
       │                       │  Extraer claims       │
       │  {data}               │                       │
       │◄──────────────────────│                       │
       │                       │                       │
```

### 9.2 Roles del Sistema

| Rol | Permisos |
|-----|----------|
| `JEFATURA` | Acceso completo, gestión de usuarios, aprobación de solicitudes |
| `SUBROGANTE` | Permisos similares a JEFATURA |
| `MEDICO` | Visualización de turnos, solicitudes de cambio |

### 9.3 Endpoints Públicos

```java
.requestMatchers("/api/v1/usuarios/login").permitAll()
.requestMatchers("/api/v1/usuarios/register").permitAll()
.requestMatchers("/api/v1/health").permitAll()
.requestMatchers("/api/v1/info").permitAll()
```

### 9.4 CORS Configurado

```java
configuration.setAllowedOrigins(Arrays.asList(
    "http://localhost",
    "http://localhost:80",
    "http://localhost:5173",
    "http://200.30.242.110",
    "http://192.168.1.150"
));
```

---

## 10. Guía de Despliegue

### 10.1 Requisitos Previos

- Docker 20.10+
- Docker Compose 2.x
- 4GB RAM mínimo
- Conexión a MySQL en 192.168.1.150:3306

### 10.2 Comandos de Despliegue

```bash
# 1. Clonar repositorio
git clone https://github.com/FelipeBaeza/HUAP.git
cd HUAP

# Editar .env con valores correctos

# 2. Construir y levantar servicios
sudo docker compose up -d --build

# 3. Verificar estado
sudo docker compose ps

# 4. Ver logs
sudo docker compose logs -f

# 5. Detener servicios
sudo docker compose down
```

### 10.3 Verificación de Despliegue

```bash
# Health check del load balancer
curl http://localhost/nginx-health

# Health check del backend
curl http://localhost/api/v1/health

# Info del servidor (muestra qué backend respondió)
curl http://localhost/api/v1/info

# Verificar balanceo de carga
for i in {1..10}; do curl -s http://localhost/api/v1/info | grep serverId; done
```

---

## 11. Monitoreo y Health Checks

### 11.1 Endpoints de Monitoreo

| Endpoint | Descripción | Autenticación |
|----------|-------------|---------------|
| `/nginx-health` | Estado del load balancer | No |
| `/nginx-status` | Estadísticas de nginx | Solo IPs internas |
| `/api/v1/health` | Estado del backend | No |
| `/api/v1/info` | Información del servidor | No |

### 11.2 Health Checks de Docker

```yaml
# Backend health check
healthcheck:
  test: ["CMD", "wget", "-q", "--spider", "http://localhost:8080/api/v1/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s

# Frontend health check
healthcheck:
  test: ["CMD", "wget", "-q", "--spider", "http://localhost/"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

### 11.3 Logs

```bash
# Ver logs de todos los servicios
sudo docker compose logs -f

# Ver logs de un servicio específico
sudo docker compose logs -f nginx-lb
sudo docker compose logs -f backend-1

# Ver últimas 100 líneas
sudo docker compose logs --tail=100 backend-1
```

---

## 12. Estructura de Archivos

```
HUAP/
├── docker-compose.yml              # Orquestación de servicios
├── .env.example                    # Plantilla de variables
├── README.md                       # Documentación principal
├── INFORME_PROYECTO.md             # Este informe
│
├── nginx/
│   └── nginx.conf                  # Configuración del load balancer
│
├── huap_backend/
│   ├── Dockerfile                  # Build del backend
│   ├── pom.xml                     # Dependencias Maven
│   ├── mvnw                        # Maven wrapper
│   └── src/
│       ├── main/
│       │   ├── java/
│       │   │   └── com/pingeso/HUAP/
│       │   │       ├── Config/
│       │   │       ├── Controller/
│       │   │       ├── DTO/
│       │   │       ├── Entity/
│       │   │       ├── Repository/
│       │   │       ├── Security/
│       │   │       ├── Service/
│       │   │       └── Utils/
│       │   └── resources/
│       │       └── application.properties
│       └── test/
│
├── sgt-huap_frontend/
│   ├── Dockerfile                  # Build del frontend
│   ├── package.json                # Dependencias npm
│   ├── vite.config.js              # Configuración Vite
│   ├── tailwind.config.cjs         # Configuración Tailwind
│   ├── index.html                  # HTML principal
│   └── src/
│       ├── components/
│       ├── context/
│       ├── services/
│       ├── utils/
│       ├── constants/
│       ├── App.jsx
│       └── main.jsx
│
└── archivos_marcelo/               # Scripts SQL de configuración
    ├── conf_estados.sql
    ├── conf_profesion.sql
    ├── conf_tipocargo.sql
    ├── conf_tipocontrato.sql
    ├── conf_tipofuncionario.sql
    ├── personal.sql
    └── servicio.sql
```

---

## 📞 Información de Contacto

| Rol | Nombre | Contacto |
|-----|--------|----------|
| **Repositorio** | GitHub | https://github.com/FelipeBaeza/HUAP |
| **Branch Principal** | main | - |


