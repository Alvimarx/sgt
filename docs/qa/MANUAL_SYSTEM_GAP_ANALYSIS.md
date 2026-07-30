# Análisis de brechas Manual ↔ Sistema y métricas de cobertura — SGT HUAP

## 1. Clasificación de brechas encontradas

Sobre las 33 funcionalidades documentadas (`MANUAL_FUNCTIONAL_INVENTORY.md`), clasificadas según `FUNCTIONAL_TRACEABILITY_MATRIX.md`:

| Categoría de brecha | Cantidad de MF-XXX | % del total documentado | ¿Qué debe corregirse? |
|---|---:|---:|---|
| Conforme (manual y sistema coinciden) | 14 | 42.4% | Nada |
| Diferencia de permisos (rol documentado ≠ rol implementado) | 10 | 30.3% | Depende del caso: **6** son "el sistema es más permisivo de lo documentado" (falta de filtrado por servicio/ownership — MF-005/006, MF-014, MF-027, MF-030, MF-031, MF-032) → **corregir el sistema**; **3** son "el sistema es más restrictivo de lo documentado" (MF-024, MF-025, MF-026 — Jefatura/Subrogante no pueden crear tipos de turno/rotativas/planificaciones aunque el manual lo permite) → **decisión de negocio pendiente, luego corregir sistema o manual**; **1** mixta (MF-031 también tiene un error funcional de paginación) |
| No verificable en este entorno | 9 | 27.3% | No es una brecha confirmada — requiere una ronda de pruebas con navegador real y/o cuentas de prueba adicionales (Subrogante puro) antes de concluir |
| No implementada | 0 | 0% | — |
| Documentada pero no implementada | 0 | 0% | — |
| Diferencia visual confirmada | 0 | 0% | No se puede confirmar ni descartar sin evidencia visual (ver limitación de entorno) |
| Diferencia de datos | 0 | 0% | — |

Adicionalmente, se encontraron **4 funcionalidades implementadas que no están documentadas en ningún manual** (no cuentan dentro del 33 porque son adicionales al inventario documentado):

1. `DELETE /planificaciones/{id}/turnos` — "Borrar todos los turnos asignados" (funcionalidad agregada en una fase previa de esta misma sesión de trabajo, posterior a la fecha de los manuales).
2. `POST /rotativas/{id}/duplicar` y `GET /rotativas/{id}/validar`.
3. `PATCH /solicitudes/{id}/motivo`.
4. `GET /feriados` (`FeriadoController`) — origen de los datos de feriados no descrito en ningún manual.

Y **2 errores funcionales transversales** que no corresponden a una función específica del manual sino a comportamiento incorrecto de la plataforma en general:
1. HTTP 401 en vez de 403 ante denegación por rol (BUG-001).
2. HTTP 500 en vez de 404 ante ruta inexistente (BUG-008).

## 2. ¿Qué debe corregirse: el sistema, el manual, o ambos?

- **El sistema debe corregirse** en los 6 casos donde es más permisivo de lo documentado (exposición de datos: BUG-002, BUG-004, BUG-006, BUG-007, y las diferencias de permisos de MF-030/MF-032) — estos representan riesgo real de confidencialidad, no solo inconsistencia documental.
- **Se requiere una decisión de negocio antes de tocar nada** en los 3 casos donde el sistema es más restrictivo (MF-024/025/026, BUG-003): si la intención original era que Jefatura/Subrogante pudieran crear estos recursos, hay que ampliar permisos; si la intención cambió durante el desarrollo (plausible, dado que centralizar la creación de tipos de turno/rotativas/planificaciones en un solo rol reduce el riesgo de inconsistencias entre servicios), **el manual debe actualizarse** para reflejarlo.
- **El manual debe actualizarse** para incluir las 4 funcionalidades implementadas y no documentadas (punto 1 en particular, ya que es una funcionalidad de seguridad/integridad de datos importante que los administradores deberían conocer).
- **Ninguna brecha encontrada implica que falte construir una funcionalidad completa** — no se encontró ningún caso de "documentada pero no implementada" en el 100% de los módulos revisados.

## 3. Métricas de cobertura

### Cobertura funcional (funcionalidades documentadas)

```
% Cobertura funcional total = (MF con algún nivel de verificación / Total MF documentadas) × 100
                             = (33 − 9 no verificables) / 33 × 100
                             = 24 / 33 × 100
                             = 72.7%

% Conformidad plena        = MF conformes / Total MF documentadas × 100
                             = 14 / 33 × 100
                             = 42.4%

% Con brecha de permisos    = MF con diferencia de permisos / Total MF documentadas × 100
                             = 10 / 33 × 100
                             = 30.3%

% No verificable en este ciclo = 9 / 33 × 100 = 27.3%
```

### Cobertura de casos de prueba (`FUNCTIONAL_TEST_CASES.md`)

```
Casos diseñados                = 45
Casos ejecutados con evidencia = 22
Casos bloqueados por entorno   = 4   (Testcontainers sin Docker-in-Docker / sin navegador real)
Casos pendientes (no ejecutados, no bloqueados) = 19

% Ejecución       = 22 / 45 × 100 = 48.9%
% Aprobados       = 14 / 22 × 100 = 63.6%  (sobre los ejecutados)
% Con defecto     = 8  / 22 × 100 = 36.4%  (sobre los ejecutados)
% Bloqueo de entorno = 4 / 45 × 100 = 8.9%
```

### Defectos por severidad (de `DEFECT_REGISTER.md`)

```
Crítica: 1   (12.5% de los 8 defectos)
Alta:    5   (62.5%)
Media:   1   (12.5%)
Baja:    1   (12.5%)
```

## 4. Interpretación

La arquitectura funcional del sistema está **completa respecto al manual** (ninguna función documentada falta por construir), pero tiene una **brecha sistemática de autorización a nivel de lectura** (`GET`): el patrón repetido en 6 de los 8 defectos es que `SecurityConfig.java` protege bien las operaciones de escritura (POST/PUT/DELETE) pero deja los `GET` de varios módulos (Solicitudes, Turnos, Notificaciones, Bitácora, Ofertas generales) cubiertos solo por "estar autenticado", sin distinguir servicio propio ni ownership del recurso. Esto sugiere que el control de acceso se diseñó pensando primero en quién puede *modificar* datos, y no se revisó con el mismo rigor quién puede *leerlos* — un patrón de diseño que vale la pena señalar explícitamente al equipo para futuras funcionalidades, más allá de los 8 defectos puntuales ya registrados.

La segunda brecha relevante (MF-024/025/026) no es un defecto de seguridad sino una posible **desalineación entre lo que el manual promete a Jefatura/Subrogante y lo que el sistema realmente permite** — y es la única brecha de este informe que requiere una decisión de producto antes de poder cerrarla, en cualquier dirección.

Ningún hallazgo de esta fase implicó pérdida de datos, corrupción del modelo de datos, ni afectación a la disponibilidad del sistema — todos son de naturaleza de autorización/documentación.
