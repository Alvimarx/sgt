# R18 — Modo desktop en todas las pantallas

**Estado:** en curso (base común lista; adaptación por pantalla en marcha)
**Fecha:** 2026-10-16
**Toca:** solo frontend (`sgt-huap_frontend/`), más datos y pruebas de desarrollo

## Qué se pidió

> «Quiero que la versión desktop sea de todas las ventanas, no solo la ventana
> de inicio.» — Álvaro, 16 oct 2026

Hasta R17 solo el home tenía versión desktop (el Centro de operaciones, R16,
"Propuesta C"). Todas las demás pantallas se dibujaban dentro de un "teléfono"
de 390 px flotando en el monitor.

## Decisiones (16 oct 2026)

| Tema | Decisión |
|---|---|
| Diseño | Sin maquetas previas: se extiende el lenguaje de la Propuesta C a todas las pantallas y Álvaro revisa el resultado |
| Breakpoint | 1200 px, igual que R16. Cubre 1280, 1366 y 1920; bajo eso se mantiene el layout móvil |
| Móvil | No cambia. Se comprueba con regresión visual automática (fotos de cada pantalla antes y después) |
| Datos de prueba | Fechas relativas a hoy en el seed de desarrollo y turnos de Urgencias generados con la propia Planificación |
| Orden | Primero la funcionalidad desktop; las pruebas de historias de usuario después, sobre el desktop terminado |

## Qué se hizo

### 1. Base común

- **Modo** (`src/layout/layout.js`, `LayoutProvider.jsx`): `useLayout()` da
  `esDesktop` a cualquier componente. Reemplaza el `matchMedia` que vivía
  dentro de `Prop4`.
- **Marco** (`components/Desktop/DesktopShell.jsx`): el menú lateral azul del
  Centro de operaciones se extrajo y pasó a ser el menú de toda la app, con
  secciones por rol (`navegacion.js`): Turnos · Gestión del servicio ·
  Administración · Mi cuenta. Los permisos replican lo que hoy cablean los
  paneles móviles; el menú no habilita nada nuevo.
- **Navegación** (`Prop4.jsx`): las vistas se arman una sola vez (`vistas`) y se
  montan en el `PhoneShell` (móvil, igual que antes) o en el `DesktopShell`.
  `navegarDesktop(destino)` lleva a cada vista y fija su "volver" como lo haría
  el panel móvil del rol. Login, elección de servicio y registro pendiente se
  muestran a pantalla completa (`.sgt-entrada`).
- **Panel lateral** (`Sheet` y `PanelLateral` en `UIPrimitives.jsx`): en
  desktop todo `Sheet` se abre como panel desde la derecha (Escape y clic
  afuera cierran). Con un solo cambio, los ~20 sheets de la app dejan de
  depender del marco del teléfono. En móvil el `Sheet` es el mismo de antes.
- **Kit desktop** (`components/Desktop/ui.jsx` + `desktop.css`): página,
  encabezado, panel, tabla densa, botones, chips, buscador, campos, segmentos,
  KPIs. Todo el CSS está bajo clases que el móvil no usa.
- **Centro de operaciones**: sin su menú propio (ahora es el del marco); la
  fila semanal se adapta de 1200 a 1920 px sin scroll horizontal; la gestión de
  asignación se abre en el panel lateral.
- **Badge de solicitudes** del menú: `hooks/useSolicitudesPendientes.js`, con
  el mismo criterio que el Centro. En móvil no hace ninguna llamada.

### 2. Adaptación por pantalla

Pendiente de documentar al cerrar el lote (ver `docs/desktop/GUIA-DESKTOP.md`
para el patrón).

### 3. Datos y pruebas de desarrollo

- `BaseDatosMySQL/desarrollo/gestionturnos/03_fechas_relativas.sql`: corre
  después del seed y mueve turnos, solicitudes, ofertas, notificaciones y
  bitácora en semanas completas para que la primera semana del seed quede como
  la semana pasada. Los feriados no se mueven. En `docker-compose.local.yml`
  va montado como `40_*.sql`.
- `scripts/generar_turnos_demo.sh`: genera el molde "Rotativa 2026" de
  Urgencias desde el lunes actual por 7 semanas, por la API y como el
  administrador de desarrollo, igual que desde la pantalla Planificación
  (1.470 turnos el 16 oct).
- Playwright (`@playwright/test` 1.63.0, solo desarrollo):
  `sgt-huap_frontend/playwright.config.js`, `e2e/helpers/sesion.js` y
  `e2e/visual/pantallas.spec.js`. Recorre todas las pantallas de los cuatro
  roles en móvil (390×844), desktop (1366×768) y desktop-fhd (1920×1080).

## Cómo probarlo

1. Ambiente local: `docker compose -f docker-compose.local.yml --env-file .env.local up -d db backend`,
   luego `bash scripts/generar_turnos_demo.sh` y `npm run dev` en `sgt-huap_frontend/`.
2. Abrir `http://localhost:5173` en una ventana de 1366 px o más y entrar con el
   jefe de Urgencias del seed (`30000006-6`): debe aparecer el menú lateral con
   Turnos, Gestión del servicio y Mi cuenta.
3. Recorrer cada ítem del menú: todas las pantallas se abren dentro del marco,
   sin el teléfono.
4. Abrir un detalle (por ejemplo, un día del calendario): se abre como panel
   desde la derecha; Escape lo cierra.
5. Angostar la ventana bajo 1200 px: vuelve el layout móvil, igual que antes.
6. Regresión del móvil:
   `PW_CHROMIUM_PATH=/usr/bin/chromium npx playwright test e2e/visual --project=movil`
   (con las fotos de referencia tomadas antes del cambio).
