# SGT-HUAP · Brief para Claude Design — Modo Desktop

> **Para quien lee esto (Claude Design):** este documento viaja junto al
> repositorio y contiene todo el contexto necesario para diseñar el **modo
> desktop** de esta aplicación. La app existe, funciona y está desplegada en
> versión móvil; tu tarea NO es inventar el producto, es diseñar cómo se ve y
> se organiza en pantallas grandes. El idioma de toda la interfaz es español
> (Chile).

---

## 1. Qué es la aplicación

**SGT-HUAP** es el **Sistema de Gestión de Turnos** del Hospital de Urgencia
Asistencia Pública (Chile). Gestiona los turnos del personal clínico de un
hospital: quién trabaja qué día, en qué horario y en qué posición, y todo el
ciclo de cambios entre personas (coberturas, intercambios, permisos) con
aprobación de jefatura.

La idea central: cada **servicio** del hospital (ej. Urgencias) tiene turnos de
**Día** (~09:00–20:00) y de **Noche** (~20:00–09:00, cruza la medianoche).
Los turnos se generan por **rotativas** — patrones cíclicos de semanas que en
el hospital se llaman "Turno I", "Turno II", "Turno III"… — y cada turno
corresponde a una **posición/puesto** concreta (ej. "Coordinador",
"Urgenciólogo 1"). Un turno puede estar asignado a una persona o **libre**
(cupo por cubrir).

**Regla de negocio sagrada (no negociable en ningún diseño):** se permite
trabajar día + noche seguidos (24 horas corridas), pero **nunca** noche seguida
del día siguiente ("24 invertido"): quien sale de amanecida descansa ese día.

## 2. Usuarios y roles

El login es con **RUT chileno + contraseña**, en dos pasos: credenciales →
elección de servicio (si la persona pertenece a varios; con uno solo entra
directo). El rol depende del servicio elegido.

| Rol | Quién es | Qué hace principalmente |
|---|---|---|
| **MEDICO** | personal clínico | Ve su agenda, postula a cupos libres, pide cambios/permisos, cancela sus solicitudes |
| **JEFATURA** | jefe del servicio | Todo lo anterior + aprueba/rechaza solicitudes, asigna cupos directamente, gestiona el personal del servicio, genera turnos desde planificaciones |
| **SUBROGANTE** | reemplaza a jefatura | Igual que jefatura en la práctica |
| **ADMINISTRADOR** (rol de sistema, transversal) | administra la plataforma | Servicios, funcionarios del sistema, puestos, tipos de turno, rotativas/plantillas, planificaciones, reglas, bitácora, auditoría |

Regla de integridad: quien participa en una solicitud **no puede** aprobarla ni
rechazarla (segregación de funciones), aunque sea jefatura; sí puede cancelarla
si la emitió.

## 3. Pantallas actuales (versión móvil, todas existentes en el repo)

Navegación por 4 tabs inferiores: **Inicio · Calendario · Solicitudes · Perfil**.

1. **Login** (2 pasos) y **Selección de servicio**.
2. **Agenda (home)** — lista de días con chips de filtro: *Todos · Mis turnos ·
   Solicitudes · Disponibles*. Cada día colapsado muestra "Tienes turno
   {Día/Noche}: {rotativa}"; expandido separa las secciones "Día: Turno X" /
   "Noche: Turno Y" con el equipo (avatares) y la cobertura (15/15, "2 libres").
   "Disponibles" lista solo cupos que el usuario realmente puede tomar (excluye
   sus propios bloques y el día post-noche).
3. **Detalle del turno** (sheet deslizante) — horario, fecha, cobertura,
   integrantes agrupados por puesto, tarjetas de cupo libre ("tocar para
   solicitar" para médicos / "asignar" para jefatura), acciones: solicitar
   turno, proponer cambio, historial.
4. **Calendario mensual** — celdas con puntos (mi turno / cupo libre), sheet
   del día con las secciones Día/Noche y su cobertura, exportación CSV.
5. **Solicitudes** — para médicos: *Mis solicitudes · Recibidas · Ofertas
   generales*, crear solicitud (wizard de 3 pasos: tipo → formulario →
   pickers), cancelar las propias. Para jefatura: *Pendientes · Historial ·
   Ofertas*, con las **postulaciones al mismo turno agrupadas** en una tarjeta
   (lista de postulantes + botón "Elegir"). 5 tipos de solicitud: Permiso,
   Botar turno, Cobertura, Intercambio, Oferta particular; más las Ofertas
   generales (abiertas al servicio).
6. **Perfil** — datos, cambiar servicio, accesos a los paneles según rol.
7. **Paneles de gestión** (jefatura/subrogante/admin): dashboard con tarjetas
   de acceso a: Planificación (generar turnos desde rotativas con vigencias),
   Funcionarios (del servicio / del sistema), Puestos, Tipos de turno,
   Plantillas de rotativa, Reglas del servicio, Asignación de turnos (vía
   calendario en modo gestión), Estadísticas, Bitácora (auditoría de eventos),
   Solicitudes.

## 4. Sistema de diseño existente (mantener la identidad)

- **Tipografía:** Raleway (Google Fonts), pesos 400/600/700/800.
- **Paleta** (CSS variables en `sgt-huap_frontend/src/components/Style/style.css`):
  - `--primary: #17416C` (azul institucional) / `--primary-soft: #E8EEF4`
  - `--accent: #E57F84` (coral: cupos libres, alertas suaves) / `--accent-soft: #FBEEEF`
  - `--warn: #C88700` / `--warn-soft: #FDF5E2` (pendientes, vacantes)
  - `--success: #2E7D57` / `--success-soft: #E4F1EB` (aprobado, completo)
  - Tintas `--ink #0F1B2D`, `--ink2 #3B4A5F`, `--ink3 #7486A0`; líneas `--line
    #E5EAF1`, `--line2 #EFF2F7`; fondos `--surface #FFFFFF`, `--surface2 #F7F9FC`.
- **Lenguaje visual:** tarjetas blancas con bordes suaves y radios generosos
  (12–14px), chips/badges de estado, iconografía sol/luna para día/noche,
  colores por tipo de turno (día = verde suave, noche = rosado suave en las
  secciones), sheets deslizantes desde abajo para todo detalle/acción.
- **Componentes reutilizables** en `src/components/Style/UIPrimitives.jsx`
  (TopHeader, Sheet, SGTIcon, SGTBadge, SGTAvatar, TabBar…).

## 5. La tarea: MODO DESKTOP

Hoy TODO se renderiza dentro de un "teléfono" (`PhoneShell`: 390×800px
centrado en la pantalla — `style.css`, clase `.phone-shell`). En un monitor
real se ve como un celular flotando en un fondo vacío. El modo desktop debe
aprovechar el ancho real.

**Prioridades de diseño (quién usa desktop):**
- **Jefatura/Subrogante/Admin son los usuarios desktop por excelencia** —
  trabajan desde el computador del servicio. Sus flujos son los que más ganan:
  - Calendario mensual amplio (ver el mes completo del servicio con cobertura
    por día, no celdas con puntitos).
  - Solicitudes en tabla/columnas con las postulaciones agrupadas visibles sin
    tocar tarjeta por tarjeta.
  - Planificación y asignación con más contexto en pantalla (rotativas,
    vigencias, conflictos).
  - Paneles con navegación lateral persistente en vez de tabs inferiores.
- **Médicos**: seguirán usando mayormente el teléfono; su vista desktop puede
  ser una adaptación más directa (agenda en dos columnas, detalle en panel
  lateral en vez de sheet).

**Sugerencias de patrón (proponer, no imponer):** sidebar de navegación a la
izquierda (reemplaza la TabBar), contenido principal + panel de detalle a la
derecha (reemplaza los Sheets), tablas densas donde hoy hay listas de
tarjetas, y el calendario como vista protagonista para gestión.

**Restricciones duras:**
1. **No se rediseñan reglas de negocio ni flujos de datos** — mismos endpoints
   REST (`/api/v2/...`), mismos estados, mismos textos de error del backend.
2. **La versión móvil se conserva tal cual**; desktop es una presentación
   adicional (breakpoint ≥ ~1024px), no un reemplazo.
3. Mantener paleta, tipografía y lenguaje de estados (badges/chips) para que
   ambas versiones se sientan el mismo producto.
4. Español de Chile en toda la UI; RUT como identificador visible del personal.
5. Los nombres reales del dominio en pantalla: "Turno I/II/III" (rotativas),
   puestos, Día/Noche.

## 6. Mapa técnico del repo (para ubicarse)

- Frontend: `sgt-huap_frontend/` — React 19 + Vite. La navegación NO usa
  rutas: es una máquina de vistas en `src/components/Admin2/Prop4.jsx`
  (estado `currentView`). Estilos: CSS plano + estilos inline con la paleta
  (`SGT_DATA.PALETTE` en `src/components/Admin2/data.js`).
- Vistas clave: `src/components/Comun/` (AgendaView, calendarView,
  ShiftDetail, Perfil, SelectServiceView), `src/components/Admin2/`
  (SolicitudesView, Planificacion, dashboards), `src/components/Jefatura/`,
  `src/components/Login/`.
- Backend: `huap_backend/` — Java 21 / Spring Boot, API REST `/api/v2`,
  JWT con rol por servicio. No requiere cambios para el modo desktop.
- Historia de decisiones y requerimientos ya aprobados: carpeta
  `requerimientos/` (R1–R15) — leerla evita re-litigar decisiones tomadas
  (filtros del home, rotativa en los títulos, reglas de solicitudes).

## 7. Entregable esperado de Claude Design

Mockups desktop (artboards ~1440px de ancho) de, como mínimo:
1. Agenda/home del médico.
2. Calendario mensual del servicio en modo jefatura (con cobertura).
3. Solicitudes de jefatura (pendientes con postulaciones agrupadas + historial).
4. Detalle de turno como panel (no sheet).
5. Un panel de gestión (Planificación o el dashboard de jefatura) con la
   navegación lateral propuesta.
6. Login + selección de servicio (rápidos, son la puerta de entrada).

Con eso el equipo implementa el modo desktop sobre los componentes existentes.
