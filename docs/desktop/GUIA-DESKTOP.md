# Guía del modo desktop (R18)

Cómo se construye la versión desktop de **cada** pantalla del SGT-HUAP sin
tocar la versión móvil. Es la referencia para quien adapte o agregue una
vista. El requerimiento y sus decisiones están en
`requerimientos/2026-10-16_R18_desktop-todas-las-pantallas.md`.

## 1. Reglas duras

1. **El móvil no cambia ni un píxel.** Bajo 1200 px la app se ve y se comporta
   exactamente como antes. Se verifica con la regresión visual (§8).
2. **Mismas reglas de negocio y mismos datos.** Mismos endpoints `/api/v2`,
   mismos estados, mismos textos de error del backend, mismas validaciones.
   El modo desktop cambia la **presentación**, nunca la lógica.
3. **Una sola lógica por pantalla.** La vista carga datos y decide una vez; las
   dos ramas (móvil y desktop) dibujan lo mismo de dos formas. Prohibido copiar
   la lógica a un componente desktop aparte. Esa duplicación es la que hoy hace
   que el Centro de operaciones y Solicitudes se comporten distinto.
4. **Mismo producto.** Paleta, tipografía (Raleway), badges y textos del móvil.
   Español de Chile. RUT visible como identificador del personal.
5. **Sin dependencias nuevas.** React, CSS y los componentes de este kit.

## 2. Piezas

| Pieza | Archivo | Qué hace |
|---|---|---|
| Modo | `src/layout/layout.js` (`useLayout`) + `LayoutProvider.jsx` | `const { esDesktop } = useLayout()`. Umbral 1200 px |
| Marco | `src/components/Desktop/DesktopShell.jsx` | Menú lateral (218 px) + área principal. Reemplaza al PhoneShell y a la TabBar |
| Menú | `src/components/Desktop/navegacion.js` | Ítems por rol, grupos, ítem activo según la vista |
| Navegación | `src/components/Admin2/Prop4.jsx` (`navegarDesktop`) | Destino del menú → `currentView`, con el "volver" que corresponde |
| Panel lateral | `Sheet` / `PanelLateral` en `src/components/Style/UIPrimitives.jsx` | En desktop todo `Sheet` se abre como panel desde la derecha (`anchoDesktop`: `md` 480, `lg` 640, `xl` 860 o px) |
| Kit | `src/components/Desktop/ui.jsx` | Página, encabezado, panel, tabla, botón, chip, buscador, campo, segmentos, KPI, persona, aviso, estado vacío |
| Estilos | `src/components/Desktop/desktop.css` | Todo bajo `.sgt-desktop`, `.sgt-entrada`, `.sgt-panel-lateral` o clases `sgt-d-*` |
| Home | `src/components/Desktop/CentroOperacionesDesktop.jsx` | Centro de operaciones (R16/R17), ahora dentro del marco |

Ajustes automáticos dentro del marco (no hay que hacer nada):

- `TopHeader` se dibuja como encabezado de página: título a la izquierda,
  acciones a la derecha, sin borde.
- `ConfirmDialog` (y cualquier `.confirm-overlay`) se centra en la ventana.
- `.agenda-toast` sube a 26 px del borde inferior (no hay TabBar).

## 3. Cómo adaptar una vista

```jsx
import { useLayout } from '../../layout/layout';
import { PaginaDesktop, PanelDesktop, TablaDesktop } from '../Desktop/ui';

const MiVista = ({ onBack }) => {
  const { esDesktop } = useLayout();
  // 1) TODOS los hooks y la lógica, compartidos (antes de cualquier return).
  const [items, setItems] = useState([]);
  // ...carga, filtros, acciones, mensajes...

  // 2) Rama desktop: solo presentación, con el kit.
  if (esDesktop) {
    return (
      <>
        <TopHeader title="…" subtitle="…" rightSlot={…} />   {/* sin leftSlot: el menú navega */}
        <PaginaDesktop ancho="amplio">
          <PanelDesktop titulo="…" sinPadding>
            <TablaDesktop columnas={…} filas={items} onFila={abrirDetalle} />
          </PanelDesktop>
        </PaginaDesktop>
        <Sheet open={…} anchoDesktop="lg" …>{/* mismo contenido que en móvil */}</Sheet>
      </>
    );
  }

  // 3) Rama móvil: EL MISMO JSX DE ANTES, sin tocar.
  return ( … );
};
```

- La rama móvil se deja **intacta**. Si para compartir un trozo con desktop
  conviene extraerlo a un componente, el DOM móvil resultante debe quedar
  idéntico (la regresión visual lo comprueba).
- Para lo que ya es un `Sheet` (detalle, formulario, asistente), en desktop
  basta con pasar `anchoDesktop` adecuado: el contenido de 390 px se lee bien
  en 480–640 px. No hace falta rehacerlo.
- Overlays hechos a mano con `position: absolute` contra el teléfono: en
  desktop se reemplazan por `Sheet`/`PanelLateral` o `ConfirmDialog`.
- Toasts o barras fijas con `bottom: 82` (pensado para la TabBar): en desktop,
  `bottom: 26`.

### Volver

En desktop el menú lateral es la navegación. **Vista raíz** (a la que se llega
desde el menú): sin botón volver (no pasar `leftSlot` a `TopHeader` cuando
`esDesktop`). **Sub-pantalla interna** (editor, asistente, "generar",
formulario de página completa): se mantiene su volver, porque vuelve a la lista
de la misma vista.

## 4. Lenguaje visual ("Propuesta C")

| Elemento | Valor |
|---|---|
| Fondo de página | `#F2F5F9` (`--d-fondo`) |
| Paneles | blanco, borde `1px #E5EAF1`, radio 14, cabecera 12.5px/800 con ícono en chip de 25 px |
| Título de página | 20px/800, subtítulo 11.5px/600 `#7486A0` |
| Texto | cuerpo 12–12.5px/600; etiquetas 9.5–10.5px/800 MAYÚSCULAS `#7486A0` |
| Primario | `#17416C`; suave `#E8EEF4` |
| Coral (libres, alertas suaves) | `#E57F84`; tinta `#B85A60`; suave `#FBEEEF` |
| Éxito | `#2E7D57` / `#E4F1EB` |
| Aviso / pendiente | `#C88700` / `#FDF5E2` |
| Día / noche | día verde suave (`#F0F7F2`, tinta `#2E7D57`), noche rosado (`#FBF1F2`, tinta `#B85A60`), íconos sol/luna |
| Botones | 32 px, radio 9, 11.5px/800: primario azul, éxito verde, peligro borde coral, secundario borde gris |
| Separación | página `16px 22px`; entre paneles 12 px |

Densidad: en desktop la jefatura trabaja con mucha información a la vista.
Preferir tablas densas y paneles lado a lado antes que tarjetas grandes
apiladas. Nada de texto de 16 px ni botones de ancho completo en desktop.

## 5. Patrones por tipo de pantalla

| Tipo | Patrón desktop |
|---|---|
| Lista de entidades (personal, servicios, puestos, tipos de turno, bitácora, auditoría) | Encabezado + barra (buscador, filtros, acción principal) + `TablaDesktop` en un `PanelDesktop`. Crear/editar en `Sheet` (`anchoDesktop="lg"`); eliminar con `ConfirmDialog` |
| Bandeja con decisiones (solicitudes, notificaciones) | Segmentos (pestañas) + lista o tabla densa + detalle al lado (`sgt-d-split`) o en panel lateral. Acciones visibles sin abrir cada tarjeta |
| Calendario | Grilla mensual grande con información por día (cobertura, mis turnos); el día abre su detalle en panel lateral |
| Editor (rotativas, planificación) | Dos o tres columnas: lista o catálogo a la izquierda, área de trabajo al centro, propiedades o resumen a la derecha |
| Paneles de gestión y dashboards | Grilla de tarjetas o KPIs (`sgt-d-grid`, `sgt-d-kpis`) + paneles con datos |
| Formularios y perfil | Página angosta (`PaginaDesktop ancho="angosto"`) con `sgt-d-formulario` en 2 columnas |
| Entrada (login, servicio) | Pantalla completa: marca a la izquierda, formulario en tarjeta a la derecha |

## 6. Accesibilidad

Botones `<button>` reales (no `div` con `onClick`), `aria-label` en botones de
solo ícono, foco visible, el estado nunca solo por color (badge con texto),
`Escape` cierra paneles (ya lo hace `PanelLateral`).

## 7. Anchos que deben funcionar

1200, 1280, **1366×768** (típico en hospitales) y 1920×1080. Sin scroll
horizontal de página. A 768 px de alto lo principal debe verse sin scrollear.

## 8. Verificación

Con el ambiente local arriba (`docker-compose.local.yml` + `npm run dev`):

```bash
cd sgt-huap_frontend
# Regresión del MÓVIL (debe pasar sin --update-snapshots):
PW_CHROMIUM_PATH=/usr/bin/chromium SGT_VISTAS=solicitudes,calendar_view \
  npx playwright test e2e/visual --project=movil
# Fotos desktop para revisar el diseño (se guardan en e2e/__pantallas__/desktop/):
PW_CHROMIUM_PATH=/usr/bin/chromium SGT_VISTAS=solicitudes \
  npx playwright test e2e/visual --project=desktop --project=desktop-fhd --update-snapshots
npx eslint <archivos tocados>      # sin errores nuevos
npx vite build --outDir /tmp/sgt-dist-check   # compila
```

Las fotos dependen de los datos: correr contra la base de desarrollo recién
creada (fechas relativas, `scripts/generar_turnos_demo.sh`) y sin crear,
aprobar ni borrar nada durante la revisión visual.
