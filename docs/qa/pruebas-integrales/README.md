# Pruebas integrales del SGT-HUAP basadas en reglas

32 historias de usuario y 249 casos de prueba, diseñados el 20 de octubre de 2026 a partir de las reglas que debe cumplir el sistema: el inventario de los manuales, los requerimientos R1–R18, el plan de corrección de planificación y solicitudes, y las decisiones del 17 de octubre. **No se diseñaron según lo que el sistema hace hoy**: si el sistema hace algo distinto del resultado esperado, el caso es FALLA aunque «siempre haya funcionado así». Para diseñarlos no se leyó el código.

Cinco flujos: A, asignación manual de la jefatura de Urgencias · B, cobertura pedida por un médico · C, intercambio, botar turno, permiso y ofertas · D, alta del servicio Medicina desde la propia interfaz · E, permisos por rol, separación entre servicios y trazabilidad. Quedan fuera las notificaciones (la bandeja está oculta en la entrega, C-09), el diseño visual, el rendimiento y las migraciones.

## Qué hay en esta carpeta

| Archivo | Qué es |
|---|---|
| `HISTORIAS_PRUEBAS_INTEGRALES.md` | Las reglas de referencia (RG-nn), los actores, el patrón de Medicina y los 249 casos por flujo, cada uno con precondición, pasos, resultado esperado y evidencia. Termina con la matriz regla → casos y el resumen de cobertura |
| `PLAN_EJECUCION.md` | El guion para correrlos en el sistema desplegado: reglas duras, preparación, técnicas, cómo elegir a cada actor, el orden de los escenarios (E0, EA a EF y EZ), cómo registrar resultados y cómo dejar todo como estaba |
| `SUPUESTOS_Y_PREGUNTAS.md` | Los supuestos (S-nn) que se tomaron donde las reglas no alcanzaban, con su pregunta, y al final las respuestas del dueño del sistema del 20 oct |
| `RESULTADOS.md` | Los casos ejecutados con su resultado, los cambios al plan, las paradas de la ejecución y qué falta |

## Cómo usarlo

1. Leer el §0 de las historias (convenciones y criterio común de rechazo) y el §1 (reglas).
2. Preparar un ambiente con el seed ficticio: la VM de demostración o el ambiente local de `docs/TRASPASO.md` §3. Las fechas del plan (Urgencias en diciembre de 2026; Medicina del 21 dic 2026 al 31 ene 2027) suponen la VM tal como quedó el 20 oct. En otro ambiente hay que elegir fechas con los mismos candidatos: la «Ficha de datos» de `RESULTADOS.md` dice cómo se eligieron.
3. Entrar con cada actor con su RUT y su clave (un perfil o una ventana por actor: la sesión vive en el navegador). Los usuarios del seed y su clave común están en el catálogo (`docs/qa/HISTORIAS_DE_USUARIO.md` §2.1); el RUT de un alias por id interno se lee en «Personal del sistema» del administrador.
4. Seguir `PLAN_EJECUCION.md` escenario por escenario. Anotar en `RESULTADOS.md` PASA, FALLA, BLOQUEADO o N/A, con el aviso exacto y, en las pruebas que lo piden, el método, la ruta y el código de la petición.
5. Anotar cada cambio que se haga en el sistema y revertirlo al cerrar el escenario. Cada escenario cierra sin solicitudes ni ofertas pendientes creadas por la prueba.
6. Reglas duras del plan: nunca elegir ni tocar al funcionario con id interno 4; no tocar octubre salvo el escenario EF; en lo que se escribe van alias de rol e id interno, nunca nombres, RUT ni direcciones de red.

La ejecución del 20 al 22 oct fue solo por interfaz (sin consola ni repetir peticiones): los casos negativos comprueban que la pantalla no ofrece la acción y anotan «servidor no comprobado (solo interfaz)». Algunos de esos permisos del lado del servidor los cubren las pruebas E2E de `sgt-huap_frontend/e2e/hu/permisos.spec.js` y las pruebas unitarias del backend.

## Estado al 22 de octubre de 2026

| Flujo | Casos | PASA | FALLA | N/A | BLOQUEADO |
|---|---|---|---|---|---|
| A · asignación manual | 38 | 18 | 1 | 2 | 17 |
| B · cobertura | 32 | 0 | 0 | 3 | 29 |
| C · intercambio, botar, permiso, ofertas | 74 | 0 | 0 | 8 | 66 |
| D · Medicina desde cero | 58 | 0 | 0 | 5 | 53 |
| E · permisos, separación, trazabilidad | 47 | 0 | 0 | 7 | 40 |
| **Total** | **249** | **18** | **1** | **25** | **205** |

- **Ejecutados: 20**, todos del flujo A y en la VM de demostración el 20 oct: 18 pasan, 1 falla (A1-07) y 1 no aplica (A4-07, porque la auditoría solo ofrece meses pasados). Los otros 24 N/A se clasificaron por lectura del caso y no tienen fila en `RESULTADOS.md`.
- **No ejecutados: 205 (BLOQUEADO).** Para entrar con cada actor hay que escribir su RUT y su clave, y los agentes de navegador con que se intentó no pueden hacerlo: la ejecución se detuvo después del flujo A y no pudo retomarse el 22 oct, ni en la VM ni en una copia local. Por eso estas pruebas las corre TIC con el plan, con una persona que inicie sesión por actor.
- **Hallazgos de la ejecución, ya corregidos y desplegados el 22 oct:** A1-07 (el aviso de choque de horario no nombraba el turno que choca), O-1 (el historial de creación de un turno mostraba a quien lo ocupa ahora y no a quien lo tenía al crearse) y O-2 (la auditoría contaba como pasado el turno de hoy que aún no empezaba). A1-07 no se repitió después de la corrección. A1-08 se reclasificó como PASA porque el dueño del sistema aclaró el 20 oct que la regla estaba mal redactada (la asignación manual de un cupo con solicitudes pendientes se acepta y las pendientes se rechazan solas).
- **Estado del servidor:** los turnos que la ejecución movió en la VM volvieron a sus titulares, y no queda nada pendiente ni a medio hacer. Quedan como registro los eventos de la bitácora de esos cambios y una solicitud rechazada automáticamente.

## Notas

- Las citas «Dec. l.NNNN» de las historias son números de línea del catálogo al 19 oct. En el catálogo vigente, buscar la decisión por su ID (C-xx) en el §5.
- `PLAN_EJECUCION.md` nombra `RESULTADOS_EJECUCION.md` al archivo de resultados; en la ejecución se llamó `RESULTADOS.md` y usa PASA en vez de OK.
- `RESULTADOS.md` remite a `CAMBIOS_EN_SERVIDOR.md` (la bitácora de lo que la ejecución cambió en la VM y revirtió) y a la carpeta `evidencia/`. Ninguno de los dos se incluye en el repositorio, como tampoco el PDF de las historias ni el script `rut_de.sh` que cita `RESULTADOS.md`.
- Las secciones finales de `RESULTADOS.md` («Primera parada», «Segunda parada», «Tercera parada» y «Ejecución en copia local») registran por qué se detuvo la ejecución y qué permitiría seguir.
