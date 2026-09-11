# R17 · Desktop: ancho fluido, gestión de asignación completa y ofertas vigentes

**Estado: pendiente de visto bueno** · Fecha: 2026-08-28 · Alcance: frontend

## Qué se pidió

> "No se adapta al ancho de la pantalla cuando debería; debería tener las
> mismas funcionalidades que hay cuando uno desde el modo móvil aprieta el
> 'Detalle del turno' (puedo editar cada persona, cubrir con cualquier
> funcionario, no una lista corta que me ofreces, sino que la lista de
> aquellos que podrían tomar el turno); luego en las ofertas generadas me
> salen ofertas del pasado que no deberían estar."

## Qué se hizo

**1. Ancho fluido.** El contenedor raíz del Centro de operaciones quedaba con
ancho "shrink-to-fit" (~1398px) centrado dentro de `.app-container`, por lo
que en pantallas anchas sobraban márgenes muertos a ambos lados. Con
`width: 100%` el layout llena cualquier ancho ≥1200px: el día expandido y los
paneles inferiores crecen con la pantalla (verificado a 1280 y 1920 sin
scroll horizontal).

**2. Gestión de asignación con paridad móvil.** Se reutiliza el MISMO
componente del "Detalle del turno" móvil (`AsignarTurnoLibreSheet`),
presentado como modal centrado sobre la vista desktop:

- Clic en **una persona asignada** (jefatura/subrogante/admin) → "Editar
  asignación de turno": funcionario actual, **lista completa y buscable** del
  personal del servicio (el mismo endpoint `funcionarios/summary` del móvil,
  no la lista corta de 6), reasignar con confirmación, observación opcional,
  y **"Quitar funcionario y dejar vacante"**.
- Clic en **un cupo libre** → "Asignar turno libre" con la misma lista
  completa y confirmación.
- Para médicos nada cambia: el cupo libre sigue abriendo el flujo de
  solicitud de cobertura.
- Se eliminó el panel inline de 6 candidatos (era un subconjunto arbitrario).

**3. Ofertas vigentes.** El panel "Disponibles · Ofertas generales" oculta
las ofertas cuyo turno ya pasó (se usa la fecha de término del turno, así un
nocturno que cruza medianoche sigue vigente su segundo día). El contador del
panel usa el mismo criterio.

## Cómo probar

1. Jefatura en pantalla ancha (≥1400px): la vista llena todo el ancho.
2. Expandir un día → clic sobre una persona: se abre "Editar asignación de
   turno" con la lista completa del personal (buscador incluido), reasignar
   y "Quitar funcionario". Clic sobre un cupo libre: "Asignar turno libre".
3. Crear (o tener) una oferta general de un turno pasado: no debe aparecer
   en el panel del desktop.

## Archivos tocados

- `sgt-huap_frontend/src/components/Desktop/CentroOperacionesDesktop.jsx`
