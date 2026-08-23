# R1 · Quitar el filtro "Aprobados" del home

**Estado: pendiente de visto bueno** · Fecha: 2026-08-23 · Alcance: solo frontend

## Qué se pidió

> "El filtro de turnos aprobados no debería existir"

En la barra de filtros del home (Agenda) había cinco chips: Todos, Mis turnos,
Pendientes, Libres y **Aprobados**. El último sobraba.

## Qué se hizo

Se eliminó el chip "Aprobados" y todo el código que solo existía para él. Se
**mantuvo** todo lo demás relacionado con cambios aprobados, porque no era parte
del filtro: el badge "✓ Aprobado" sobre el turno y el aviso de "Cambio aprobado"
en el banner superior siguen funcionando igual.

## Por qué así

El filtro era redundante (un cambio aprobado ya se ve como badge en el propio
turno) y el requerimiento pidió explícitamente su eliminación, no la del
concepto "aprobado".

## Cómo se hizo

Archivo: `sgt-huap_frontend/src/components/Comun/AgendaView.jsx`. Tres puntos
(buscar por ancla, los números de línea pueden variar entre repos):

1. **Contador**: eliminar el bloque `const countAprobados = useMemo(...)` que
   contaba `s.cambioAprobado` por día.
2. **Chip**: en el arreglo `const FILTERS = [...]`, eliminar la entrada
   `{ id: "aprobados", label: "Aprobados", count: countAprobados }`.
3. **Rama del filtro**: en el `useMemo` de `visibleDays`, eliminar la línea
   `if (filter === "aprobados") return shifts.some((s) => s.cambioAprobado);`.

También se actualizó el comentario sobre los contadores que aún mencionaba al
filtro eliminado.

**No tocar**: el badge `{miShift.cambioAprobado && <SGTBadge ...>✓ Aprobado...}`
ni el memo `misCambiosAprobados` (alimenta el banner de avisos).

## Cómo probarlo

1. Entrar como cualquier funcionario y mirar la barra de filtros del home:
   deben quedar 4 chips (Todos, Mis turnos, Pendientes, Libres).
2. Un turno con cambio aprobado debe seguir mostrando su badge "✓ Aprobado".
