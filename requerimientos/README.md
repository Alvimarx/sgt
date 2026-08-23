# Requerimientos

Registro de mejoras funcionales del SGT-HUAP, una por archivo, pensado para ser
**portable**: el mismo sistema corre en otro repositorio conectado a la base de
datos real de innhosp (con los médicos verdaderos), y estos documentos deben
bastar para entender y replicar cada cambio allá **por palabra**: qué se hizo,
por qué se hizo y cómo se hizo.

## Flujo de trabajo

1. Se recibe el requerimiento y se acuerda su interpretación.
2. Se implementa en este repo (ambiente con datos ficticios).
3. Se prueba en el despliegue de prueba.
4. Con el **visto bueno** del usuario, el documento pasa de
   `Estado: pendiente de visto bueno` a `Estado: aprobado ✅` y queda listo
   para llevar al repositorio con datos reales.

## Convenciones de los documentos

- Nombre: `AAAA-MM-DD_Rn_descripcion-corta.md` (fecha en que se implementó).
- Los cambios se describen con **anclas de código** (fragmentos literales a
  buscar), no con números de línea: los dos repos pueden divergir.
- Cada documento cierra con "Cómo probarlo": pasos manuales concretos.
- Ningún documento incluye datos personales reales (RUT, nombres de
  funcionarios verdaderos): los ejemplos usan el personal ficticio del seed.

## Índice

| Req | Fecha | Título | Estado |
|-----|-------|--------|--------|
| R1 | 2026-08-23 | Quitar el filtro "Aprobados" del home | aprobado ✅ |
| R2 | 2026-08-23 | Resumen del turno propio con tipo y rotativa | aprobado ✅ |
| R3 | 2026-08-23 | Título del detalle de turno con el puesto propio | aprobado ✅ |
| R4 | 2026-08-23 | Solicitar un cupo libre tocándolo directamente | aprobado ✅ |
| R5 | 2026-08-23 | Refrescar la página no expulsa al login | aprobado ✅ |
| R6 | 2026-08-23 | Quitar el punto amarillo del calendario | aprobado ✅ |

## Estado del lote

Los seis requerimientos de este lote (R1-R6) están **probados y aprobados** por
el usuario sobre el despliegue de prueba, y quedan listos para replicarse en el
repositorio que corre con los datos reales de HUAP.
