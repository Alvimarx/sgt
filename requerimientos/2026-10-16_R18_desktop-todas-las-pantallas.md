# R18 — Modo desktop en todas las pantallas

**Estado:** implementado el 16 oct 2026; falta la revisión de Álvaro en el ambiente de prueba
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

Patrón común (detalle en `docs/desktop/GUIA-DESKTOP.md`): cada vista suma
`const { esDesktop } = useLayout()` junto a sus hooks y una rama
`if (esDesktop) { return … }` antes del `return` móvil. Las ramas desktop solo
dibujan: mismo estado, mismos handlers, mismos servicios, mismos textos y
mismos errores del backend. Cuando una regla vivía escrita dentro del JSX
móvil (qué acciones tiene un turno, qué puede hacer cada quien con una
solicitud), se sacó a una función que usan las dos ramas, para que móvil y
desktop no puedan decidir distinto; la regresión visual comprueba que el móvil
quedó igual. Las vistas a las que se llega desde el menú no tienen volver; las
sub-pantallas (paneles de Jefatura, Subrogante y Administración, que se abren
desde Mi Perfil; editores y asistentes) lo conservan.

#### 2.1 Turnos y solicitudes (5 vistas)

Piezas en `src/components/Desktop/turnos/` (clases `sgt-dt-*` en `turnos.css`).

| Vista (componente) | Desktop |
|---|---|
| Calendario (`calendarView.jsx` → `CalendarioDesktop`) | Grilla mensual a lo ancho: en cada día la cobertura Día/Noche (asignados/total, verde si está completo y coral si faltan personas), los cupos libres y la marca "TÚ" en los turnos propios; a 1920 px, además, el horario propio y los puestos libres. Al lado, el detalle del día elegido siempre visible (equipo por turno con su rotativa). Flechas del teclado para moverse entre días. El detalle de un turno y la gestión de asignación se abren en panel lateral. Los colores por rotativa son los del Centro de operaciones |
| Detalle del turno (`ShiftDetail.jsx` → `DetalleTurnoDesktop`) | Dentro del panel lateral: cabecera Día/Noche con cobertura, información del turno, equipo por puesto con "Editar" o "Asignar funcionario a este cupo" y las acciones al pie. Las reglas salen de `estadoDelTurno`, `equipoPorPuesto`, `alTocarIntegrante`, `alTocarVacante` y `accionesDelTurno`, que ahora usa también la rama móvil |
| Gestión de asignación (`AsignarTurnoLibreSheet.jsx` → `AsignacionTurnoDesktop`, `ConfirmacionDesktop`) | Panel lateral con el buscador de personal y la confirmación centrada en la ventana. Escape cierra solo el panel de arriba (o la confirmación). Sigue funcionando desde el calendario, el detalle del turno y el Centro de operaciones. Textos de confirmación compartidos (`textosConfirmacion`) |
| Solicitudes (`SolicitudesView.jsx` → `SolicitudesDesktop`, `NuevaSolicitudDesktop`) | Bandeja de trabajo: segmentos en el encabezado, barra con buscador, tipo y orden, lista densa a la izquierda y el detalle con todas sus acciones a la derecha. Las postulaciones al mismo turno (R10) se deciden en el detalle, persona por persona. La nueva solicitud es el mismo asistente de 3 pasos en panel lateral. Reglas compartidas con las tarjetas móviles: `evaluarSolicitud`, `filasSolicitud`, `datosGrupoPostulacion` y `evaluarOferta` |
| Notificaciones (`NotificationView.jsx` → `NotificacionesDesktop`) | Página de ancho medio con segmentos Todas / Sin leer / Leídas y lista densa con marcar leída y eliminar en cada fila |

La exportación CSV del calendario (`ExportarTurnosDesktop`) usa el mismo
estado y la misma `handleExportCsv`; sus botones de mes pasaron a
`moverMesExportacion`.

#### 2.2 Gestión del servicio, Mi cuenta y Entrada (14 vistas)

Piezas en `src/components/Desktop/gestion/` (clases `sgt-dg-*` en `gestion.css`):
`EntradaDesktop` (`MarcoEntradaDesktop`), `ModulosDesktop`
(`GrillaModulosDesktop`), `PeriodoDesktop`, `BusquedaFuncionarioDesktop`,
`PersonalServicioDesktop`, `AuditoriaDesktop`, `BitacoraDesktop`,
`EstadisticasDesktop` y `PaginacionDesktop`.

| Vista (componente) | Desktop |
|---|---|
| Login (`LoginView`) | `MarcoEntradaDesktop`: panel de marca a la izquierda y el mismo formulario (`handleSubmit`, validaciones, textos y animaciones) en una tarjeta de 400 px |
| Elegir servicio (`SelectServiceView`) | Servicios como tarjetas en grilla con su rol; mismo `handleSelect` y "Salir" |
| Registro pendiente (`PendingRegistrationView`) | Mismo aviso y "Volver al inicio" en la tarjeta del marco |
| Mi Perfil (`ProfileView` en `Perfil.jsx`) | Página angosta en dos columnas: Mis datos (iniciales, RUT, servicio, rol, servicios) y Herramientas especiales (los mismos accesos por rol y "Cambiar servicio") |
| Mi Dashboard (`PersonalDashboard`) | `PeriodoDesktop` en el encabezado, 4 KPIs, carga horaria, tabla "Turnos del período" (los mismos `turnosFiltrados` que cuentan los KPIs) y "Próximos turnos" |
| Paneles de gestión (`JefaturaDashboard`, `SubroganteDashboard`) | `GrillaModulosDesktop` con las mismas condiciones y acciones; volver a Mi Perfil |
| Personal del servicio (`FuncionariosServicioJefaturaView`) | Tabla densa (funcionario, RUT, profesión, rol en el servicio) con el mismo buscador y un filtro por rol |
| Asignación de funcionarios (`AsignacionJefaturaView.jsx`) | Formulario en página angosta con `BusquedaFuncionarioDesktop` (flechas, Enter, Escape) y el mismo `ConfirmDialog`. No se dibuja la capa fija transparente del móvil, que taparía el menú: la lista la cierra el mismo listener de clic afuera |
| Jerarquía del servicio (`JerarquiaJefaturaView`) | Formulario a la izquierda y "Jerarquía actual del servicio" a la derecha; mismo `ConfirmDialog` |
| Estadísticas (`AdminStats`) | KPIs (incluido el puesto con más vacantes, que la vista ya calculaba en `puestoMasCritico`), paneles con `CoverageBar` y tabla de vacantes. Los dos overlays hechos a mano pasan a `PanelLateral` (`CoberturaLateralDesktop`, `FuncionariosLateralDesktop`) |
| Puestos (`PuestosView`) | Tabla con edición en línea (Enter guarda, Escape cancela), alta en un panel al lado y los mismos `ConfirmDialog` |
| Auditoría (`AuditoriaView`) | Meses como segmentos, 3 KPIs y tabla de turnos pasados con filtro por estado |
| Bitácora (`BitacoraView`) | `PeriodoDesktop`, los 4 filtros a la vista, tabla paginada de a 50 y el mismo detalle (`bloqueParaTipo`) en panel lateral |

Extras solo de presentación (sin lógica nueva; cada uno se puede quitar sin
tocar nada más): filtro por rol en Personal, filtro por estado en Auditoría,
paginación en Bitácora, el KPI del puesto con más vacantes, la tabla de turnos
del período en Mi Dashboard y "Cambiar servicio" en Mi Perfil.

#### 2.3 Administración

##### Planificación y Rotativas

Piezas en `src/components/Desktop/planificacion/` (clases `sgt-dp-*` en
`planificacion.css`): `MoldeDesktop` (`MatrizMolde`, `CicloMolde`,
`MoldeCargandoDesktop`), `RotativasDesktop`, `piezas.jsx` (`BloqueTipo`,
`GrillaSemanas`, `FormularioPanel`, `ConfirmacionPlan`, `AvisoCerrable`,
`AvisoFlotante`) y `formato.js`.

| Vista (componente) | Desktop |
|---|---|
| Planificación (`Planificacion.jsx`, `PlanGuardarBase`) | Página ancha. En el encabezado: molde nuevo, moldes, vigencias, eliminar turnos, agregar rotativa y generar. 5 KPIs (ocultos con el molde vacío). El molde a lo ancho con dos segmentos: "Asignaciones" (tabla puesto × rotativa; cada celda abre Asignar) y "Ciclo" (semanas × 7 con la cobertura Día/Noche; cada día abre su detalle). Estado vacío con los 3 pasos y esqueleto de carga. Los sheets propios (`InyectarSheet`, `AsignarFuncionarioSheet`, `MoldesSheet`, `EliminarTurnosSheet`, `VigenciasSheet`, `DetalleDiaSheet`) se abren como panel lateral con sus acciones al pie |
| Generar (`GenerarView`, sub-pantalla con volver) | A la izquierda: lunes de inicio (calendario donde solo se eligen lunes), vigencia efectiva y reglas de horario a la vista. A la derecha: vista previa con fechas reales (feriado, regla, conflicto, fuera de vigencia) y la tabla de conflictos. Confirmación centrada |
| Rotativas (`PlantillasView.jsx`) | Maestro-detalle: lista de rotativas (flechas, Inicio, Fin) y, a la derecha, horas por semana y por ciclo, aviso sobre 44 h y la secuencia semanas × 7. Eliminar con confirmación centrada |
| Editor de rotativa (`PlantillaEditor`, sub-pantalla con volver) | Datos, horas y pincel rápido a la izquierda; la secuencia a lo ancho a la derecha. Un día sin pincel abre un panel lateral con "Día libre" y los tipos de turno. Guardar y Cancelar en el encabezado |

Diferencia deliberada con móvil, solo de presentación: en desktop, eliminar un
molde pide confirmación (en móvil hoy borra directo; ver hallazgos).

##### Mantenedores

Piezas en `src/components/Desktop/admin/PiezasMantenedoresDesktop.jsx`
(`AvisoMantenedorDesktop`, `OpcionesTarjetaDesktop`, `RolesServicioDesktop`,
`PersonasNivelDesktop`, `CambioHorarioDesktop`), clases `sgt-da-mant-*` en
`mantenedores.css`. Reusa `GrillaModulosDesktop`, `BusquedaFuncionarioDesktop`
y `PaginacionDesktop` del grupo de gestión.

| Vista (componente) | Desktop |
|---|---|
| Panel de Administración (`AdminDashboard`) | Sub-pantalla desde Mi Perfil (con volver): módulos agrupados por área en `GrillaModulosDesktop`, mismos textos, íconos y acciones |
| Servicios (`ServiciosView`) | Tabla en panel a todo el alto con edición en línea (`guardarEdicion`: Enter guarda, Escape cancela), alta en un panel al lado y los mismos `ConfirmDialog`. Filtro Todos/Activos/Inactivos cuando hay inactivos |
| Personal del sistema (`FuncionariosSistemaView`) | Tabla densa de a 50 (`POR_PAGINA_DESKTOP`; en móvil sigue de a 10) con buscador y el mismo filtro por servicio en la cabecera; columna de servicios y rol |
| Asignación a servicios (`AsignacionView`) | `BusquedaFuncionarioDesktop` (misma regla de 2 caracteres, RUT enmascarado), servicio, resumen y el mismo `ConfirmDialog` |
| Jerarquía de funcionarios (`JerarquiaView`) | Tres pasos con el nivel en tarjetas de opción y la "Jerarquía actual" del servicio elegido, armada con los datos ya cargados; nota de lo que se va a designar y aviso después de designar (la vista no recarga; ver hallazgos) |
| Tipos de turno (`TiposTurnoView`) | Tabla con horario, duración calculada y "Cruza medianoche". Nuevo y Editar con el mismo `TurnoForm` en panel lateral, que repite adentro el error del último intento; eliminar con `ConfirmDialog` y las rotativas afectadas |
| Reglas de horario (`ReglasServicioView`) | Reglas en tarjetas (condición, ajuste, antes → después) y, a la derecha, el mismo formulario con vista previa o los horarios base del servicio |

#### 2.3 bis Menú

`DesktopShell` acerca el ítem activo a la vista cuando el menú scrollea
(administrador a 768 px de alto), sin moverlo si ya se ve.

#### 2.4 Ajustes al kit durante el lote

- `PaginaDesktop` y `PanelDesktop` aceptan `llena`: la página ocupa el alto
  disponible y el panel crece con su tabla hasta ese alto; desde ahí la tabla
  scrollea por dentro con el encabezado fijo (listas largas).
- Con ancho máximo (`amplio`, `medio`, `angosto`), el contenido queda alineado
  a la izquierda, bajo el título, en vez de centrado.
- `ui.jsx` importa `desktop.css`: el CSS del kit carga antes que el de cada
  grupo. Para pisar una regla del kit se usa igual selector compuesto.
- Foco visible en los segmentos (`.sgt-d-segmento:focus-visible`).
- Pruebas: `iniciarSesion` espera a que la app quede en el home antes de
  seguir, y la foto de la elección de servicio espera a que aparezcan los
  servicios; su referencia móvil se volvió a tomar sobre el código original.

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

## Hallazgos del lote (no se corrigieron en R18)

R18 cambia solo la presentación. Al adaptar cada pantalla aparecieron fallas de
lógica que existen también en móvil; quedan para el cierre técnico, con su
decisión cuando corresponde.

Fallas claras:

- **El backend corre en UTC**: el contenedor no fija la zona horaria y el
  código usa `LocalDateTime.now()`/`LocalDate.now()`. La bitácora marca 3 horas
  más, y entre las 21:00 y las 24:00 de Chile el backend ya cree que es el día
  siguiente (validaciones de "hoy", turnos pasados, descanso post nocturno).
  Pasa también en Hetzner. Arreglo: `TZ=America/Santiago` en el backend y
  revisar los datos ya guardados.
- **Tipos de turno y Rotativas pueden dejar la pantalla en blanco** cuando el
  backend rechaza un guardado: la vista guarda el objeto `{error}` de la
  respuesta y lo dibuja tal cual ("Objects are not valid as a React child"), y
  no hay `ErrorBoundary`. Conviene un `mensajeDeError(e, porDefecto)` común.
- **Eliminar un molde de Planificación en móvil no pide confirmación** y borra
  en el backend. En desktop ya la pide.
- **Asignar un funcionario a un servicio donde ya tiene relación lo deja como
  Médico** (`FuncionarioService.updateUser`, caso actualizar): una jefatura o
  subrogante asignada a su propio servicio pierde el rol sin aviso.
- Jerarquía (administración y jefatura) no recarga después de designar.
- Jerarquía y Personal del servicio buscan `'jefe'` en el nombre del rol, que
  es `JEFATURA`: la vista previa dice "Sin jefatura designada" aunque la hay.
- Bitácora no ordena por fecha y recalcula su filtro en cada render.
- Rotativas: borrar el campo de semanas para escribir otro número recorta la
  secuencia en memoria.
- Móvil: la lupa de los buscadores de jefatura queda encima del texto; en
  Asignación de funcionarios el segundo toque cierra la lista; el avatar de Mi
  Perfil sale vacío.
- Estadísticas tiene código muerto (una vista "por puesto" que nunca se dibuja).

Decisiones pendientes:

- Jerarquía del servicio parte con el rol de jefatura marcado: si no se cambia,
  se designa otra jefatura. Hoy puede haber varias por servicio.
- La bitácora del médico: el backend se la niega, pero el home y el calendario
  le ofrecen "Ver historial".
- Reglas de horario para jefatura y subrogante: el sistema se las permite, pero
  ningún menú los lleva ahí.
- El administrador se reconoce distinto en Mi Perfil (solo `ADMINISTRADOR`) y en
  el menú desktop (`ADMIN` o `ADMINISTRADOR`).
- "Molde nuevo", "Quitar del molde" y "Vaciar" no piden confirmación.
- Propuesta: mostrar en el calendario qué cupos libres no puede tomar el médico
  y por qué (R9, R13), en móvil y desktop a la vez, en vez de que el backend
  rechace la solicitud.

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
