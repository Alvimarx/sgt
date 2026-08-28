# R16 · Modo desktop: Centro de operaciones (Propuesta C)

**Estado: pendiente de visto bueno** · Fecha: 2026-08-27 · Alcance: frontend

## Qué se pidió

> "Voy a crear el modo desktop, para eso utilizaré Claude Design…"
> (brief en `docs/BRIEF-MODO-DESKTOP.md`), y luego, con el mockup elegido:
> "esta es la propuesta, la final, la que debería ser (ojo que el verdecito
> tb es dinámico), así debe quedar, que está hermoso"

La referencia visual es el export de Claude Design **"Propuesta C — Centro de
operaciones"**. Dos aclaraciones explícitas del usuario sobre lo "dinámico":

- El **fondito verde-azul** (`#E8EEF4`) de la columna/tarjeta de HOY no es un
  día fijo de la semana: sigue la fecha real.
- El **verdecito** de cobertura tampoco es decorativo: punto y texto en verde
  `#2E7D57` cuando el turno está completo, coral `#E57F84`/`#B85A60` cuando
  faltan cupos — calculado del estado real de cada turno.

## Qué se hizo

**Componente nuevo `src/components/Desktop/CentroOperacionesDesktop.jsx`**,
un port fiel del mockup conectado a los servicios reales:

- **Sidebar 218px** con el gradiente del mockup
  (`#17416C → oklch(0.32 0.062 220) → oklch(0.36 0.075 200)`), logo SGT·HUAP +
  nombre del servicio activo, navegación (Inicio, Centro de turnos —activo,
  con acento coral inset—, Solicitudes con badge, Personal, Planificación,
  Estadísticas, Bitácora) y tarjeta de usuario (iniciales, nombre, RUT, chip
  de rol, "Cambiar servicio", "Cerrar sesión"). Los ítems de gestión
  (Personal/Estadísticas/Bitácora) solo aparecen para jefatura, subrogante o
  admin del sistema.
- **Header**: `Centro de turnos · Semana {ini}–{fin} {mes}` + KPIs reales
  (`{asignados}/{total} asignados`, `{libres} cupos libres`) + navegación de
  semana `← · Hoy · →`.
- **Fila de semana**: 6 tarjetas compactas (~86px) + **el día seleccionado
  expandido inline** (borde `#17416C`, min-width 540px). Compactas: fecha,
  filas mini DÍA/NOCHE con punto de cobertura dinámico y conteo `n/m`.
  Expandido: paneles DÍA y NOCHE con chip de rotativa (color de equipo por
  `idRotativa`, misma paleta oklch del móvil), barra de progreso, grilla de
  personas 2 columnas (avatar por puesto, apellido + PUESTO), cupos libres
  punteados en coral con **asignación inline** (jefatura: lista de candidatos
  del servicio → `asignarTurnoLibre`; médico: "Solicitar", que abre el flujo
  de solicitud ya existente con preset).
- **Dinámica pedida**: la tarjeta HOY se resalta con `#E8EEF4` solo cuando su
  fecha ISO coincide con la fecha local real (nunca `toISOString`, disciplina
  de fecha local por el huso de Chile); el día expandido parte en HOY y al
  cambiar de semana se re-selecciona HOY si es visible o el lunes si no; los
  colores de cobertura salen de `asignados === cupos` turno por turno.
- **Fila inferior**: panel **Solicitudes** (flex 1.25, grilla 2 columnas) con
  la agrupación R10 (varias postulaciones al mismo turno+puesto → "Elegir"
  entre la lista), badges Pendiente / Receptor aceptó / Esperando receptor /
  Requiere tu respuesta / Pend. otra jefatura, y acciones según rol
  (Aprobar/Rechazar para quien decide, Aceptar para el receptor); panel
  **Ofertas** (flex 0.85) con Abrir al servicio y Seleccionar postulante con
  confirmación; **toast** de feedback.

**Integración en `Prop4.jsx`**: en pantallas ≥1200px (media query reactiva),
la vista "agenda" se reemplaza por el Centro de operaciones a pantalla
completa; el resto de las vistas sigue en el PhoneShell (390×800) hasta tener
versión desktop propia. `irDesdeDesktop` mapea los destinos del sidebar a la
máquina de estados existente: personal → funcionarios del servicio (por rol),
planificación → PlanificacionView (admin) o calendario de asignación,
estadísticas → AdminStats con retorno a agenda, bitácora → BitacoraView con
retorno a agenda.

**`AuthContext.jsx`**: el mapeo del usuario ahora conserva `rut` y
`rutCompleto` (el authService ya los guardaba; el contexto los descartaba),
para la tarjeta de usuario del sidebar.

## Decisiones

- La **Propuesta B** ("Semana del servicio") quedó descartada y su componente
  eliminado; C la reemplaza por completo.
- Umbral desktop: **1200px** (matchMedia con listener; al angostar la ventana
  vuelve el PhoneShell sin recargar).
- Sin drawer lateral: el día se expande inline en la fila de semana, como en
  el mockup C.
- Los datos se leen con los mismos servicios del móvil (`getTurnosServicio`,
  `solicitudesService`, `ofertasGeneralesService`, `usuariosService`), sin
  endpoints nuevos.

## Cómo probar

1. Entrar en una ventana ≥1200px de ancho: el home pasa a pantalla completa.
2. Jefatura (Flavio Ayala, 30000006-6): ver semana, HOY resaltado, expandir
   otros días, asignar un cupo libre inline, aprobar/elegir en Solicitudes,
   abrir/seleccionar en Ofertas.
3. Médico (Pablo Garrido, 30000070-0): mismos paneles sin acciones de
   jefatura; "Solicitar" en un cupo libre abre el flujo de solicitud.
4. Angostar la ventana < 1200px: vuelve la vista móvil; el resto de la
   navegación (sidebar → Solicitudes, Bitácora, etc.) abre las vistas
   existentes en PhoneShell.

## Archivos tocados

- `sgt-huap_frontend/src/components/Desktop/CentroOperacionesDesktop.jsx` (nuevo)
- `sgt-huap_frontend/src/components/Desktop/SemanaServicioDesktop.jsx` (eliminado, Propuesta B)
- `sgt-huap_frontend/src/components/Admin2/Prop4.jsx`
- `sgt-huap_frontend/src/context/AuthContext.jsx`
- `docs/BRIEF-MODO-DESKTOP.md` (brief para Claude Design, paso previo)
