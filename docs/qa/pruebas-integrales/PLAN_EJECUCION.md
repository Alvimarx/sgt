# Plan de ejecución de las pruebas integrales del SGT-HUAP

Versión 1.0 · 20 de octubre de 2026 · guion para el agente que maneja Chrome

## 0. Qué es y cómo se usa

Este guion ordena los casos de `HISTORIAS_PRUEBAS_INTEGRALES.md` en escenarios que se ejecutan en el sistema desplegado. Cada paso cita los casos que cubre; la precondición completa, el resultado esperado y la evidencia exacta están en el caso. Aquí va lo operativo: en qué orden, con quién, en qué fechas, qué mirar y cómo dejar todo como estaba.

- Los resultados se anotan en `RESULTADOS_EJECUCION.md` (plantilla en la sección 8).
- La evidencia va a `evidencia/<escenario>/EV_<caso>_<n>.<ext>` dentro de esta misma carpeta.
- Todo cambio que se haga en el sistema se anota en la bitácora de cambios (sección 9) en el momento, con su reversión.
- Los supuestos que condicionan resultados están en `SUPUESTOS_Y_PREGUNTAS.md` (S-nn).

## 1. Reglas duras

1. **Funcionario con id interno 4: nunca.** No se elige, no se edita, no se asigna, no se abre su ficha y no se copian sus datos. Antes de elegir a una persona, comprobar su id interno en la lista o en la respuesta de red y descartar el 4. Si la cuenta de administración o de jefatura que entregan fuera la del id 4, detenerse y preguntar (S-37).
2. **Claves.** Un error de clave suma al bloqueo de la cuenta. Copiar RUT y clave exactos. Nunca probar una clave errónea. Si un ingreso falla una vez, no reintentar a ciegas: revisar el dato y, si vuelve a fallar, detenerse y avisar.
3. **Octubre no se toca.** Urgencias se prueba en diciembre de 2026; Medicina, entre el 21 dic 2026 y el 31 ene 2027 (y, en pasos opcionales, del 1 al 14 feb 2027). Única excepción: el escenario EF, que necesita la hora real y está acotado a intentos que deben fallar (sección 7, S-32).
4. **Solo la interfaz crea datos.** Sin scripts ni SQL contra el sistema y sin entrar al servidor. La consola del navegador se usa solo para la técnica F (intentos que deben fallar) y para leer respuestas de red.
5. **Sin datos personales en lo que se escribe.** En el informe y la bitácora de cambios van alias de rol e id interno; nunca nombres, RUT ni direcciones de red. Las capturas pueden mostrar datos ficticios del sistema, pero no se transcriben; si una tabla con RUT no hace falta, no se captura.
6. **Notificaciones fuera.** No se abre ni se evalúa la bandeja.
7. **Ante un resultado distinto del esperado:** se marca FALLA con su evidencia, se revierte lo que haya quedado mal y se sigue con el próximo caso. Si la falla impide los casos que dependen de él, esos se marcan BLOQUEADO con la razón.
8. **Detenerse y avisar si:** algo queda en un estado que no se puede revertir por la interfaz; aparece un dato que parece real y no ficticio; un paso obligaría a tocar octubre fuera de EF; o un supuesto marcado como bloqueante resulta falso (S-03, S-29).
9. **Cada escenario cierra sin solicitudes ni ofertas pendientes** creadas por la prueba.

## 2. Preparación

- **Navegador.** Ventana de escritorio de 1366 px o más (el modo escritorio parte en 1200 px). E2-04 se repite con la ventana bajo 1200 px.
- **Una sesión por actor.** La sesión vive en el navegador: dos usuarios en pestañas del mismo perfil se pisan. Usar un perfil o una ventana privada distinta por actor, o cerrar sesión antes de cambiar de actor.
- **Hora.** Tener a la vista la hora de Chile (America/Santiago). Anotar la hora de cada acción que se vaya a buscar después en la bitácora.
- **Carpetas.** `evidencia/E0`, `evidencia/EA` … `evidencia/EZ`.
- **Credenciales.** Las entrega el dueño. No se escriben en ningún archivo.

## 3. Técnicas

- **F, forzar.** Prueba que una regla vive en el servidor. 1) Con un actor que sí tiene permiso, hacer esa misma acción por la interfaz (casi siempre ya ocurre en un caso positivo) y anotar de las peticiones de red el método, la ruta y el cuerpo. 2) Con la sesión del actor sin permiso, repetir esa petición desde la consola del navegador, cambiando solo los identificadores necesarios. 3) Anotar código y mensaje (RED). Esperado: 403, o un rechazo con el mensaje de la regla, y ningún dato cambiado. Si la interfaz ofrece la acción y el servidor la niega, además debe verse un aviso en pantalla y la sesión debe seguir.
- **R, volver a entrar.** Cerrar sesión y entrar de nuevo. Se usa para comprobar que un cambio de rol rige desde el siguiente inicio de sesión.
- **V, vista guardada.** La aplicación guarda la vista actual en el almacenamiento de la pestaña para restaurarla al recargar. Para E2-02, cambiar ese estado guardado para que apunte a una vista de administración y recargar.
- **X, CSV en local.** Exportar el CSV y analizarlo en la máquina para elegir personas y fechas o para contar turnos. El archivo se guarda en `evidencia/` y su contenido con RUT no se transcribe.
- **Restaurar.** Toda vacante creada para una prueba se devuelve a su titular con una reasignación o asignación de la jefatura, y se comprueba en el calendario. Por eso cada titular que se vacía tiene que poder recibir su turno de vuelta según las reglas: el titular de un Día D no tiene Noche D−1, y el de una Noche D no tiene Día D+1. Si no, la restauración se rechazaría, y con razón. Si al restaurar el turno pierde la marca de su rotativa, se anota como observación: no es parte de la regla.

## 4. Actores y cómo elegirlos

| Alias | Rol | Cómo se elige | Escenarios |
|---|---|---|---|
| ADM | Administrador | La cuenta de administración que entrega el dueño (id distinto de 4) | E0, EA, ED, EE |
| JU | Jefatura de Urgencias | La cuenta de jefatura que entrega el dueño (id distinto de 4) | todos |
| MU1…MU6 | Médicos de Urgencias | Solo de Urgencias, sin rol de gestión, con la situación que pide la ficha de cada escenario. Pueden repetirse entre escenarios si cumplen | EA, EB, EC, EE |
| TB1…TB5, TC1…TC4 | Titulares | Médicos de Urgencias dueños de los turnos que se vacían por un rato | EB, EC, EE |
| MU5 → SU | Subrogante temporal | MU5, designado en EE y devuelto a médico al final | EE |
| MX | Médico | De Urgencias, sin turnos en la semana de EA (mejor si no tiene turnos futuros) | EA, EE |
| JM, JM2, SM | Jefaturas y subrogante de Medicina | Funcionarios sin servicio; si no hay, médicos de Urgencias que no estén en ningún otro alias | ED, EE |
| MM-1.1…MM-6.7 | Médicos de Medicina | 42 funcionarios sin servicio; si no alcanzan, médicos de Urgencias que no estén en ningún otro alias (S-07) | ED, EE |
| MD | Médico de dos servicios | Médico de Urgencias con turnos entre el 21 y el 31 dic que cumplan la ficha de EE; no entra al molde de Medicina | ED, EE |

MM-1.1 tiene que pertenecer solo a Medicina, porque lo usan los casos de separación entre servicios (A1-11, A3-07, B1-11, C7-10, C8-14, E4-04). Si en el ambiente no hay ningún funcionario sin servicio, esos casos quedan N/A con esa razón.

## 5. Orden y dependencias

| Orden | Escenario | Depende de | Fechas de los turnos | Casos |
|---|---|---|---|---|
| 0 | E0 · Reconocimiento (solo lectura) | — | diciembre 2026 | E2-05 |
| 1 | EA · Asignación manual | E0 | 2 al 6 dic | HU-A1 a HU-A4 |
| 2 | EB · Cobertura | E0 | 9 al 13 dic | HU-B1 a HU-B5 |
| 3 | EC · Intercambio, botar, permiso y ofertas | E0 | 14 al 20 dic | HU-C1 a HU-C8 |
| 4 | ED · Alta de Medicina | E0 | 21 dic 2026 al 31 ene 2027 (opcional, 1 al 14 feb) | HU-D1 a HU-D9, E5-06, E5-07 |
| 5 | EE · Permisos, separación y trazabilidad | EA a ED | 14 al 31 dic | HU-E1 a HU-E6 y los casos diferidos de A, B y C |
| 6 | EF · Casos que dependen de la hora | E0 | fecha real de la ejecución | los de turnos empezados y la hora de Chile |
| 7 | EZ · Cierre | todos | — | — |

**Casos diferidos.** Necesitan Medicina o un subrogante y se ejecutan en EE: A1-11, A1-14, A3-07, A4-09, B1-11, B2-02, C1-10, C7-10, C8-14, D5-09.

**Fechas que conviene evitar** en las pruebas de descanso y choque: 8 y 25 dic y 1 ene (feriados), por si Urgencias tiene reglas de horario de feriado que muevan las horas. E0 lo confirma.

## 6. Escenarios

Formato de cada paso: **actor** · acción · *casos* → esperado · evidencia.

### E0 · Reconocimiento (solo lectura)

**Objetivo.** Confirmar accesos, elegir personas y fechas y fotografiar el estado inicial. No se cambia nada.

1. **ADM** entra. *E2-05* → entra con rol de administrador; id distinto de 4 · registro de ingreso.
2. **JU** entra. *E2-05* → jefatura de Urgencias; id distinto de 4 · registro de ingreso.
3. **ADM** revisa la lista de servicios → no existe «Medicina». Si existe, detenerse y preguntar · CAP.
4. **ADM** revisa el personal del sistema → cuenta los funcionarios sin servicio (hacen falta 45 para MM, JM, JM2 y SM) y los inactivos; anota los id, nunca el 4 · conteo en el informe.
5. **JU** exporta el CSV de Urgencias de diciembre, «todo el servicio» (técnica X) → con él se eligen personas y fechas de las fichas de EA, EB, EC y EE, incluida la condición de los titulares de la técnica «Restaurar» · CSV.
6. **JU** revisa solicitudes y ofertas pendientes de diciembre → se anotan; ninguna persona ni turno elegido puede tener pendientes · CAP.
7. **JU** revisa las reglas de horario de Urgencias → anota si alguna mueve horas en feriados o fines de semana; si mueve horas en una fecha elegida, se cambia la fecha · CAP.
8. Llenar la **ficha de datos** (plantilla al final de E0) y guardar una captura del calendario de cada fecha elegida: es la foto contra la que se restaura.

**Plantilla de ficha de datos.**

| Escenario | Alias | id interno | Situación que debe cumplir | Turno o fecha concreta | Verificado |
|---|---|---|---|---|---|
| EA | MU4 | | titular del Día D | | |
| … | … | | … | | |

### EA · Asignación manual (2 al 6 dic)

**Fecha D:** 3, 4 o 5 dic. Se usan D−1 y D+1.

**Ficha EA.**

| Alias | Situación |
|---|---|
| MU4 | Titular del Día D, sin solicitudes y sin Noche D−1 |
| MU5 | Titular de la Noche D, sin Día D+1 |
| MU1 | Noche D−1; nada el día D (ni Día ni Noche); sin Día D+1 |
| MU2 | Día D, en otro puesto que MU4; sin Noche D−1, sin Noche D y sin Día D+1 |
| MU3 | Sin turnos el día D y sin Noche D−1 |
| MX | Sin turnos en D−1, D y D+1 |

**Pasos.**

1. **JU** quita a MU4 del Día D: nace V1. *A2-01* → cupo libre del mismo puesto · CAP, BIT.
2. **MU3** mira «Disponibles» y pide V1. *A2-05* → figura y nace pendiente · CAP.
3. **JU** intenta asignar V1 a mano a MU3. *A1-08 (paso 1)* → rechazo por solicitud pendiente · TXT, RED.
4. **MU3** cancela su solicitud. *A1-08 (paso 2)* → cancelada · CAP.
5. **JU** intenta asignar a MU1 a V1. *A1-05* → rechazo por descanso · TXT, RED.
6. **JU** intenta asignar a MU2 a V1. *A1-07* → rechazo por choque · TXT, RED.
7. **ADM** inactiva a MX; **JU** busca a MX para V1 y fuerza (F) la asignación; **ADM** reactiva a MX. *A1-12* → no aparece; forzado, rechazo · CAP, RED.
8. **MU2** abre V1 y fuerza (F) la asignación de MU3. *A1-13* → solo puede pedirlo; forzado, 403 · CAP, RED.
9. **JU** asigna a MU3 a V1, sin observación. *A1-01, A1-08 (paso 3)* → asignado · CAP, BIT.
10. **MU3** abre el historial de V1. *A4-03* → ve los eventos · HIS.
11. **MU1** intenta abrir el historial de V1 y luego la bitácora (F en los dos). *A4-04, A4-05* → sin acceso; 403 · CAP, RED.
12. **JU** intenta cambiar en V1 a MU3 por MU1, luego por MU2 y luego por MU3 mismo. *A3-02, A3-03, A3-04* → rechazo, rechazo, sin cambio · TXT, RED.
13. **JU** cambia en V1 a MU3 por MU4. *A3-01* → V1 vuelve a MU4 · CAP, BIT.
14. **MU4** abre el historial de V1. *A4-06* → sin la cobertura cancelada de MU3 · HIS.
15. **JU** quita a MU5 de la Noche D: nace V2. *A2-01* → cupo libre · CAP.
16. **JU** asigna a MU1 a V2. *A1-04* → noches seguidas, permitido · CAP.
17. **JU** cambia en V2 a MU1 por MU2. *A3-06* → 24 corridas, permitido · CAP, BIT.
18. **JU** quita a MU2 solo de la Noche D. *A2-04* → el Día D sigue con MU2 · CAP.
19. **JU** asigna a MU2 a V2 con la observación «Prueba A1-02». *A1-03, A1-02* → permitido; observación registrada · CAP, BIT.
20. **JU** cambia en V2 a MU2 por MU5 → V2 restaurado · CAP.
21. **JU** quita a MU1 de la Noche D−1: nace V3 → cupo libre · CAP.
22. **JU** intenta asignar a MU2 a V3. *A1-06* → rechazo por descanso · TXT, RED.
23. **JU** asigna a MU1 a V3 → V3 restaurado · CAP.
24. **MU4** pide botar V1; **JU** intenta quitar a MU4 de V1 y luego cambiarlo por MU3; **MU4** cancela el botar. *A2-02, A3-05* → los dos intentos se rechazan; botar cancelado · TXT, RED.
25. **MU2** fuerza (F) el retiro de MU4 de V1. *A2-06* → 403 · RED.
26. **JU** revisa la bitácora del período y prueba los filtros. *A4-01, A4-02* → eventos completos, con encargado y hora de Chile · BIT.
27. **JU** abre la auditoría de diciembre y exporta el CSV de diciembre. *A4-07, A4-08* → titulares y origen correctos · CAP, CSV.
28. *(P3, opcional)* **JU** quita a MU4 de V1; **JU** y **ADM** asignan V1 a la vez a MU3 y a otro médico que pueda tomarlo; **JU** confirma dos veces otra asignación; al terminar, V1 vuelve a MU4. *A1-15, A1-16* → un solo ganador y un solo evento · CAP, BIT.

**Limpieza EA.** V1 con MU4, V2 con MU5, V3 con MU1, MX activo, ninguna solicitud pendiente. Comparar con la foto de E0.

### EB · Cobertura (9 al 13 dic)

**Fecha D:** 10, 11 o 12 dic.

**Ficha EB.**

| Alias | Situación |
|---|---|
| TB1 | Titular del Día D, sin Noche D−1 (nace V4) |
| TB2 | Titular de la Noche D, sin Día D+1 (nace V5) |
| TB3 | Titular del Día D+1, sin Noche D (nace V6) |
| TB4 | Titular de otro puesto del Día D, sin Noche D−1 (nace V4b; opcional) |
| MU1 | Noche D−1; sin Día D y sin Día D+1 |
| MU2 | Sin turnos el día D ni el Día D+1; sin Noche D−1 |
| MU3 | Igual que MU2 |
| JU | Para B2-07: puede tomar V4b (sin turnos el día D ni Noche D−1). Si JU no hace turnos, B2-07 es N/A |

**Pasos.**

1. **JU** quita a TB1 del Día D: nace V4 · CAP.
2. **MU2** pide V4 tocando el cupo. *B1-01* → pendiente; «Solicitudes» la cuenta; el cupo dice que ya lo pidió · CAP.
3. **MU2** pide V4 otra vez con una solicitud nueva. *B1-02* → «Ud. ya solicitó este turno» · TXT.
4. **MU1** mira «Disponibles» y pide V4; **MU2** fuerza (F) una cobertura sobre un turno que tiene dueño (por ejemplo, el Día D de otro puesto). *B1-03, B1-10* → V4 no figura para MU1 y su pedido se rechaza por descanso; la cobertura forzada se rechaza porque solo se cubren cupos libres · CAP, TXT, RED.
5. **MU3** pide V4 → segunda postulación · CAP.
6. **JU** quita a TB2 de la Noche D (nace V5); **MU3** pide V5 → pendiente · CAP.
7. **JU** intenta asignar V4 a mano. *B5-03* → rechazo por pendientes · TXT.
8. **MU3** fuerza (F) la aprobación y la cancelación de la solicitud de MU2. *B2-03, B4-03* → 403 y rechazo · RED.
9. **JU** busca cancelar la solicitud de MU2 y la fuerza (F). *B4-04* → no la tiene; rechazo · CAP, RED.
10. **JU** ve las dos postulaciones a V4 juntas y elige a MU2. *B5-01, B5-04* → V4 con MU2; la de MU3 sobre V4, rechazada sola; la de MU3 sobre V5 sigue pendiente · CAP, BIT.
11. **JU** intenta aprobar la de MU3 sobre V4; **MU2** intenta cancelar la suya, ya aprobada. *B5-02, B4-05* → no se puede · CAP.
12. **JU** quita a TB3 del Día D+1 (nace V6) y asigna a MU3 a V6 → permitido (la Noche D de MU3 aún está pendiente) · CAP.
13. **JU** aprueba la cobertura de MU3 sobre V5. *B2-04* → falla por descanso; V5 sigue libre y la solicitud, pendiente · TXT, RED.
14. **JU** rechaza esa solicitud y cambia en V6 a MU3 por TB3 → V6 restaurado · CAP.
15. **MU2** mira «Disponibles» y pide V5. *B1-04* → figura; pendiente (24 corridas) · CAP.
16. **JU** la rechaza; **MU2** la pide otra vez. *B3-01, B3-02* → rechazada; nace otra · CAP, BIT.
17. **MU2** cancela; la pide otra vez. *B4-01, B4-02* → cancelada; nace otra · CAP, BIT.
18. **JU** aprueba. *B2-01* → V5 con MU2 · CAP, BIT.
19. **JU** intenta aprobar la rechazada del paso 16 y rechazar la aprobada del paso 18. *B3-03* → no se puede · CAP.
20. **JU** quita a MU2 de V5; **MU1** pide V5 y la cancela; **JU** asigna V5 a TB2. *B1-05* → la de MU1 nace pendiente (noches seguidas); V5 restaurado · CAP.
21. *(P2)* **JU** quita a TB4 de su puesto del Día D (nace V4b); **MU2** mira «Disponibles» y fuerza (F) el pedido. *B1-06* → no figura; rechazo por choque · CAP, RED.
22. *(P2)* **JU** pide V4b como médico, intenta aprobarla y la cancela; luego asigna V4b a TB4. *B2-07* → no puede aprobar su propia solicitud; sí cancelarla · TXT, CAP.
23. **JU** filtra la bitácora por estado rechazado. *B4-07* → canceladas, rechazadas y automáticas, cada una con su motivo · BIT.
24. *(P3, opcional)* Carreras: con una cobertura pendiente sobre un cupo libre, **JU** y **ADM** aprueban a la vez; con otra, **MU2** cancela mientras **JU** aprueba; restaurar después. *B2-06, B4-06* → un solo resultado coherente · CAP, BIT.

**Limpieza EB.** V4 cambia de MU2 a TB1; V5 con TB2; V6 con TB3; V4b con TB4; ninguna pendiente.

### EC · Intercambio, botar, permiso y ofertas (14 al 20 dic)

**Fechas.** D1 (X) y D2 (Y) con al menos dos días entre ellas; D3 (W); D4 para C1-08; W3 y W4 de MU3; el rango P1–P2 del permiso contiene W4.

**Ficha EC.**

| Alias | Situación |
|---|---|
| MU1 | Dueño de X (Día D1); nada el día D2 ni Noche D2−1; tiene otro turno futuro X2 |
| MU2 | Dueño de Y (Día D2); nada el día D1 ni Noche D1−1 |
| MU3 | Dueño de Z (cualquier turno futuro), de W3 y de W4; libre el día D1 y sin Noche D1−1 |
| MU4 | Dueño de W (Día D3) tal que W por Y sea válido para los dos |
| TC1 | Titular de la Noche D2−1, sin Día D2 (nace V7) |
| TC2 | Titular de la Noche D1−1, sin Día D1 (nace V8) |
| TC3 | Titular de otro puesto del Día D2, sin Noche D2−1 (nace V9) |
| TC4 | Titular de otro puesto del Día D1, sin Noche D1−1 (nace V10) |
| MU-A, MU-B | Día D4 y Noche D4; MU-A sin Día D4+1; MU-B sin Noche D4−1 |

**Parte 1 · Intercambio de principio a fin.**

1. **MU1** propone X por Y a MU2. *C1-01* → pendiente, esperando receptor · CAP.
2. **MU1** arma X2 por Y con MU2. *C1-04* → Y no figura; forzado, rechazo · CAP, RED.
3. **JU** intenta aprobar. *C3-03* → no se puede · CAP.
4. **MU3**, **MU1** y **JU** fuerzan (F) responder como receptor; **MU2** y **MU3** fuerzan (F) cancelarla. *C2-04, C2-05, C2-06, C4-04* → rechazo en todos · RED.
5. **MU4** propone W por Y a MU2 → pendiente · CAP.
6. **MU2** acepta la de MU1 y luego intenta rechazarla. *C2-01, C2-03* → «receptor aceptó»; la segunda respuesta se rechaza · CAP, TXT.
7. **MU3** fuerza (F) la aprobación. *C3-07* → 403 · RED.
8. **JU** aprueba. *C3-01, C3-06* → X con MU2 e Y con MU1; la de MU4, rechazada sola · CAP, BIT.
9. **MU1** intenta cancelar la aprobada. *C4-03 (parte)* → no se puede · CAP.

**Parte 2 · De vuelta, pasando por cada desenlace.** Ahora MU2 tiene X y MU1 tiene Y; el emisor es MU2.

10. **MU2** propone X por Y a MU1; **MU1** rechaza; **MU2** crea otra con X. *C2-02* → rechazada, nada se mueve; la nueva se permite · CAP.
11. **MU2** cancela esa; **MU1** intenta responderla. *C4-01, C2-08* → cancelada; no se puede responder · CAP.
12. **MU2** propone otra vez. *C4-05* → se permite · CAP.
13. **MU1** acepta; **MU2** cancela; **JU** intenta aprobar. *C4-02* → cancelada; no se puede aprobar · CAP.
14. **MU2** propone otra vez; **MU1** acepta; **JU** rechaza; **MU2** intenta cancelar la rechazada. *C3-02, C4-03 (parte)* → nada se mueve; no se puede cancelar · CAP.
15. **MU2** propone otra vez; **MU1** acepta; **JU** quita a TC2 de V8 y asigna a MU1 a V8; **JU** aprueba. *C3-04* → falla por descanso de MU1; nada se mueve · TXT, RED.
16. **JU** rechaza esa solicitud y devuelve V8 a TC2 · CAP.
17. **MU2** propone otra vez; **MU1** acepta; **JU** aprueba → X vuelve a MU1 e Y a MU2 · CAP, BIT.

**Parte 3 · Validaciones al crear.**

18. **MU1** arma un intercambio con MU2 pidiendo Z (de MU3). *C1-02* → Z no figura; forzado, rechazo · CAP, RED.
19. **MU1** pide botar X y luego propone X por Y; después cancela el botar. *C1-03* → rechazo con el aviso de cancelar · TXT.
20. **JU** quita a TC1 de V7 y asigna a MU1; **MU1** arma X por Y; **JU** devuelve V7 a TC1. *C1-05* → rechazo por descanso del emisor · CAP, TXT.
21. **JU** quita a TC2 de V8 y asigna a MU2; **MU1** propone X por Y; **JU** devuelve V8 a TC2. *C1-06* → rechazo por descanso del receptor · TXT.
22. **JU** quita a TC3 de V9 y asigna a MU1; **MU1** arma X por Y; **JU** devuelve V9 a TC3. *C1-07* → rechazo por choque · TXT.
23. **MU1** propone X por Y; **JU** quita a TC2 de V8 y asigna a MU2; **MU2** intenta aceptar; **MU1** cancela; **JU** devuelve V8 a TC2. *C2-07* → aceptación rechazada por descanso · TXT.
24. **MU-A** propone a MU-B su Día D4 por la Noche D4, y luego cancela. *C1-08* → permitido · CAP.
25. Forzar (F) un intercambio de MU1 consigo mismo. *C1-11* → rechazo · RED.

**Parte 4 · El dueño cambia antes de aprobar.**

26. **MU2** pide botar Y; **MU1** propone X por Y. *C1-12* → se permite crearla (S-21) · CAP.
27. **JU** aprueba el botar de MU2 y revisa el intercambio de MU1. *C3-05* → rechazado solo, o aprobarlo falla; Y no pasa a MU1 · CAP, BIT.
28. **JU** asigna Y a MU2 → Y restaurado · CAP.

**Parte 5 · Botar.**

29. **MU3** pide botar W3; intenta proponer un intercambio con W3 y publicar una oferta general de W3. *C5-01, C5-05* → pendiente; los dos intentos se rechazan · CAP, TXT.
30. **JU** rechaza. *C5-03* → W3 sigue con MU3 · CAP.
31. **MU3** pide botar otra vez y cancela. *C5-04* → cancelada · CAP.
32. **MU3** pide botar otra vez; **JU** aprueba. *C5-02* → W3 libre · CAP, BIT.
33. **MU2** pide W3 (si puede tomarlo; si no, otro médico que pueda); **JU** aprueba; **JU** devuelve W3 a MU3. *C5-08* → W3 pasa al que lo pidió; luego se restaura · CAP.
34. **MU3** fuerza (F) botar un turno de MU1. *C5-07* → rechazo · RED.

**Parte 6 · Permiso.**

35. **MU3** pide permiso del P1 al P2 sin motivo; **JU** lo rechaza. *C6-01, C6-04* → pendiente; rechazado · CAP.
36. **MU3** pide otro y lo cancela. *C6-05* → cancelado · CAP.
37. **MU3** pide uno con el fin antes del inicio. *C6-06* → rechazo · TXT.
38. **MU3** pide permiso del P1 al P2 con el motivo «Prueba C6-08»; **JU** aprueba. *C6-08, C6-02* → aprobado; W4 sigue con MU3 · CAP, BIT.
39. **JU** quita a MU3 de W4 y luego se lo vuelve a asignar. *C6-03* → se permite; W4 restaurado · CAP, BIT.

**Parte 7 · Oferta particular.**

40. **MU1** ofrece X a MU2. *C7-01* → pendiente · CAP.
41. **JU** intenta aprobar antes de la respuesta; **MU3** fuerza (F) la respuesta. *C7-07, C7-06* → no se puede; 403 · CAP, RED.
42. **JU** intenta reasignar X; **MU1** intenta botar X. *C7-08* → los dos se rechazan · TXT.
43. **MU2** rechaza la oferta. *C7-03* → nada se mueve · CAP.
44. **MU1** ofrece otra vez y cancela. *C7-09* → cancelada · CAP.
45. **JU** quita a TC2 de V8 y asigna a MU2; **MU1** ofrece X a MU2; **JU** devuelve V8 a TC2. *C7-04* → rechazo por descanso del receptor · TXT.
46. **JU** quita a TC4 de V10 y asigna a MU2; **MU1** ofrece X a MU2; **JU** devuelve V10 a TC4. *C7-05* → rechazo por choque · TXT.
47. **MU1** ofrece X a MU2; **MU2** acepta e intenta rechazar después; **JU** aprueba. *C7-11, C7-02* → segunda respuesta rechazada; X con MU2 · CAP, BIT.
48. **MU2** ofrece X a MU1; **MU1** acepta; **JU** aprueba → X restaurado · CAP.

**Parte 8 · Oferta general.**

49. **MU1** publica una oferta general de X; **MU2** revisa las ofertas; **MU1** la retira. *C8-01, C8-06* → por abrir e invisible para MU2; retirada · CAP.
50. **MU1** publica otra vez; **JU** rechaza la apertura; **MU2** revisa. *C8-13* → no se publica · CAP.
51. **MU1** publica; **JU** la abre; **MU2** la ve; **MU1** la retira sin postulantes. *C8-02, C8-07* → visible; retiro permitido (S-11) · CAP.
52. **MU1** publica; **JU** la abre; **MU1** intenta botar X y proponer un intercambio con X. *C8-15* → rechazo en los dos · TXT.
53. **MU2** postula y vuelve a postular; **MU1** intenta postular; **MU3** postula. *C8-03, C8-12, C8-11* → dos postulaciones; la repetida avisa; la del ofertor se rechaza · CAP, TXT.
54. **MU1** intenta retirar la oferta. *C8-08* → no se permite: ya tiene postulantes (S-11) · TXT.
55. **JU** quita a TC2 de V8 y asigna a MU3; **JU** intenta elegir a MU3; **JU** devuelve V8 a TC2. *C8-05* → rechazo por descanso · TXT.
56. **JU** elige a MU2. *C8-04* → X con MU2; la de MU3, cerrada · CAP, BIT.
57. **MU1** intenta retirar la oferta. *C8-09* → no se puede · CAP.
58. **JU** cambia X de MU2 a MU1 → X restaurado · CAP.

**Limpieza EC.** X con MU1; Y con MU2; W con MU4; W3 y W4 con MU3; V7 a V10 con sus titulares; ninguna solicitud ni oferta pendiente. El permiso aprobado de MU3 queda como registro (anotarlo).

### ED · Alta de Medicina (21 dic 2026 al 31 ene 2027)

**Antes de empezar.** Tener los ids de los 42 MM, de JM, JM2 y SM (E0, paso 4) y elegir a MD (ficha de EE). Patrón esperado: secciones 3.4 y 3.6 de las historias.

**Bloqueantes.** Si ADM no puede operar sobre Medicina sin asignarse a sí mismo (S-29), o si el editor no admite Día y Noche el mismo día (S-03), detenerse en ese punto, anotar BLOQUEADO y preguntar. Plan alternativo para S-03, solo con el visto bueno del dueño: rotativas con el tipo único «24 h» para verificar el calendario, sabiendo que las pruebas de descanso de E5 cambian de sentido.

1. **ADM** crea «Medicina» e intenta crear otro servicio «Urgencias»; **JU** fuerza (F) la creación de un servicio. *D1-01, D1-02, D1-03* → creado; repetido rechazado; 403 · CAP, TXT, RED.
2. **ADM** elige Medicina como servicio sobre el que trabaja (S-29) · CAP.
3. **ADM** crea «Día» (08:00–20:00) y «Noche» (20:00–08:00); compara con los tipos de Urgencias que ve JU; intenta crear otro «Día». *D2-01, D2-02, D2-03, D2-04* → 12 h cada uno, la Noche cruza la medianoche; listas separadas; repetido rechazado · CAP, TXT.
4. **ADM** crea los puestos «Medicina 1» a «Medicina 7» e intenta repetir «Medicina 1». *D3-01, D3-02* → 7 puestos; repetido rechazado · CAP, TXT.
5. **ADM** crea el tipo «Prueba» (09:00–13:00) y la «Rotativa prueba» (1 semana: Día de lunes a viernes y «Prueba» el sábado). *D4-04* → aviso de más de 44 h y se guarda · CAP.
6. **ADM** elimina «Prueba», que está en la rotativa; después crea «Prueba» (09:00–13:00) otra vez. *D2-06, D2-05* → aviso que nombra «Rotativa prueba»; reactivación sin duplicado · TXT, CAP.
7. **ADM** elimina «Rotativa prueba» y después «Prueba» → limpieza · CAP.
8. **ADM** crea «24 h prueba» (08:00–08:00). *D2-07* → 24 h que cruzan la medianoche, o rechazo claro. Si se va a hacer el paso opcional 29, se conserva; si no, se elimina · CAP.
9. **ADM** crea «Equipo 1» a «Equipo 6», de 6 semanas, pintando Día y Noche según la tabla 3.4; guarda y vuelve a abrir cada una. *D4-01, D4-02, D4-03, D4-05* → secuencias idénticas a la tabla; aviso de 44 h en la semana de 48 h; se guarda · CAP de cada rotativa.
10. **ADM** asocia a Medicina a los 42 MM y a JM, JM2 y SM; intenta asociarse a sí mismo. *D5-01, D5-02* → todos como médicos; autoasignación rechazada · CAP, TXT.
11. **JM** entra a Medicina (como médico); **ADM** designa a JM jefatura; **JM** revisa sin salir y luego vuelve a entrar (R). *D5-04* → sigue médico hasta volver a entrar; después, jefatura · CAP.
12. **ADM** asocia otra vez a JM a Medicina; **JM** vuelve a entrar. *D5-03* → aviso; sigue jefatura · TXT, CAP.
13. **JM** designa a SM subrogante; **SM** vuelve a entrar (R); **JM** intenta designar a JM2 jefatura. *D5-05, D5-06* → SM subrogante; designar jefatura, rechazado · CAP, TXT.
14. **ADM** designa a JM2 como segunda jefatura de Medicina (para E3-04) · CAP.
15. **JM** suma a MD a Medicina; **SM** intenta sumar a alguien; **MD** entra (elige servicio) y un médico con un solo servicio entra (directo). *D5-07, D5-08, D5-10* → MD médico en los dos; SM rechazado; selección y entrada directa · CAP, RED.
16. **SM** crea «Puesto prueba SM», lo renombra y lo inhabilita; **MM-1.1** fuerza (F) la creación de un puesto. *D3-03, D3-05* → permitido; 403 · CAP, RED.
17. **JU** y **JM** fuerzan (F) la creación de un tipo, de una rotativa y de un molde. *D2-08, D4-06, D6-03* → 403 (S-01) · RED.
18. **ADM** arma el molde «Medicina 2026-27» de 42 filas. *D6-01* → guardado · CAP.
19. **ADM** pone a MM-3.1 también en la fila Equipo 3, Medicina 2; abre la vista previa; corrige. *D6-02* → conflicto marcado y luego resuelto · CAP.
20. **ADM**, antes de generar, pone a MD por un momento en una fila del equipo que trabaja F4 y luego en una del que trabaja F5 (ficha de EE); mira la vista previa; devuelve las filas. *E5-06, E5-07* → conflicto en F4; en F5, sin conflicto (limitación) · CAP.
21. **ADM** prepara la generación: ancla lunes 21 dic 2026, vigencia del 21 dic 2026 al 31 ene 2027, sin reglas; abre la vista previa; fuerza (F) un ancla martes; intenta un fin anterior al inicio. *D7-01, D7-02, D7-06* → 588 turnos y equipos de la tabla 3.6; rechazos · CAP, RED, TXT.
22. **ADM** abre una vista previa del 30 sep al 27 oct 2026 **sin confirmar**. *D7-05* → equipos del dato, o N/A si no se permiten fechas pasadas · CAP.
23. **ADM** genera. *D7-03, D7-07* → igual a la vista previa; conflictos vacantes; feriados normales · CAP, BIT.
24. **ADM** intenta generar del 25 ene al 7 feb 2027. *D7-04* → rechazo por superposición · TXT.
25. Verificar contra la referencia, preferentemente con el CSV de Medicina de diciembre y de enero (técnica X) y con el calendario. *D8-01 a D8-08* → todo coincide con las tablas 3.6 · CSV, CAP, tabla en el informe.
26. **JM** recorre su servicio, quita y devuelve un turno, recibe y resuelve una cobertura y fuerza una regla de horario. *D9-01, D9-02, D9-03, D9-04* → todo en Medicina; 403 en la regla · CAP, RED.
27. *(P2, opcional)* **ADM** extiende hasta el 14 feb, intenta acortar con fin anterior a hoy y acorta hasta el 31 ene. *D7-08, D7-09, D7-10* → fase continua (1 feb, equipo 6); rechazo; febrero vacío otra vez · CAP, TXT.
28. *(P3, opcional)* **ADM** edita desde el 11 ene la fila Equipo 3, Medicina 7, y luego revierte. *D7-11* → 6 ene intacto, 13 ene con la persona nueva y del equipo 3 · CAP.
29. *(P3, opcional, después del paso 27 o sin él)* Mini-molde de 24 h: **ADM** crea «Puesto prueba», «Rotativa prueba 24 h» (1 semana, lunes con «24 h prueba») y el molde «Prueba 24 h» de una fila; genera del 1 al 7 feb 2027 con ancla lunes 1 feb; **ADM** inhabilita «Puesto prueba». *D3-04* → un turno de 24 h el 1 feb; el puesto sale de la gestión y el turno se sigue viendo · CAP. El turno se usa en E5-08.

**Limpieza ED.** Medicina queda creado con sus tipos, puestos, rotativas, personal, jerarquía, molde y los 588 turnos (S-33). Lo temporal ya se eliminó o revirtió: «Prueba», «Rotativa prueba», «Puesto prueba SM», febrero y la edición desde el 11 ene. El mini-molde se limpia en EZ, después de E5-08.

### EE · Permisos, separación y trazabilidad

**Ficha EE.**

| Alias | Situación |
|---|---|
| MU5 → SU | Médico de Urgencias con sesión abierta al ser designado |
| MD | Entre el 21 y el 31 dic, en Urgencias: un Día F1, sin Día F1+1; una Noche F2−1 y nada el Día F2; ninguna Noche F3; un Día F4; una Noche F5−1. Evitar 24, 25 y 31 dic |
| TB5 | Titular de un turno de Urgencias del 14 al 20 dic que pueda recibir de vuelta (nace V11) |

1. **JU** designa a MU5 subrogante con MU5 en sesión; **SU** intenta aprobar sin salir, vuelve a entrar (R) e intenta otra vez. *E3-01* → primero no puede; después, sí · CAP.
2. **JU** quita a TB5 de su turno (nace V11); **SU** asigna V11 a TB5. *A1-14* → permitido, con SU como encargado · CAP, BIT.
3. **JU** quita otra vez a TB5 (V11); **MU2** pide V11 (si puede tomarlo); **SU** aprueba; **JU** devuelve V11 a TB5. *B2-02* → aprobado por SU · CAP, BIT.
4. **MU1** publica una oferta general de X; **SU** la abre; **MU2** postula; **SU** elige a MU2; **JU** devuelve X a MU1. *E1-06* → SU decide ofertas · CAP, BIT.
5. **SU** intenta designar subrogante, quitar una subrogancia, sumar personal, editar nombre y estado de MU3, escribir una regla de horario y crear tipo, rotativa y molde. *E1-07, E1-08, E1-10, E1-11* → rechazo en todos · TXT, RED.
6. **JU** intenta designar jefatura a MU3, escribir una regla de horario, crear tipo, rotativa y molde, y entrar a la administración; inactiva y reactiva a MX. *E1-09, E1-10, E1-11, E1-12, E1-14* → rechazos; estado de MX según S-27 · TXT, RED, CAP.
7. **ADM** compara sus accesos de administración en Mi Perfil y en el menú lateral. *E1-13* → los mismos · CAP.
8. **MU2** fuerza (F) aprobar, abrir oferta, elegir postulante, asignar, quitar, reasignar, ver bitácora, estadística, auditoría y personal del sistema; exporta su CSV y fuerza «todo el servicio». *E1-01, E1-02, E1-03, E1-04, E1-05* → 403 en todo; CSV solo con sus turnos · RED, CSV.
9. **MU2** fuerza una aprobación y sin salir pide un cupo libre y lo cancela; luego cambia la vista guardada a una de administración (V) y recarga. *E2-01, E2-02* → aviso, sesión viva; cae al inicio · CAP.
10. **JU** recarga en el calendario y en Mi Perfil; **MD** recarga y usa «Cambiar servicio». *E2-03* → misma vista y sesión · CAP.
11. **JU** suma a SU a Urgencias otra vez; **JM** suma a SU a Medicina; **SU** vuelve a entrar en los dos servicios. *E3-03, D5-09* → aviso; sigue subrogante en Urgencias y es médico en Medicina · TXT, CAP.
12. **JM** intenta cambiar el rol de JM2 y el propio; **JU** fuerza (F) «Quitar subrogancia» sobre SM. *E3-04, E3-05, E3-06* → rechazo en los tres · TXT, RED.
13. **JM** y **JU** recorren el otro servicio y fuerzan (F) consultas, aprobaciones y asignaciones cruzadas; **MD** revisa cada servicio; **MM-1.1** busca y fuerza cupos de Urgencias; **MD** fuerza un intercambio cruzado. *E4-01 a E4-07* → separación total · CAP, CSV, RED.
14. Casos diferidos de separación: **JU** busca y fuerza a un MM para un cupo de Urgencias y como reemplazo; **JM** busca V1 en su bitácora; **MU2** busca y fuerza un cupo de Medicina; **MU1** busca a MD como receptor y fuerza el canje y una oferta particular a un MM; **MU1** publica una oferta, **JU** la abre, **MM-1.1** revisa y **MU1** la retira. *A1-11, A3-07, A4-09, B1-11, C1-10, C7-10, C8-14* → nada cruza servicios · CAP, RED.
15. **JM** libera cupos de Medicina en F1 (Día y Noche) y en F2 (Día) quitando a sus titulares, e intenta asignarlos a MD; **MD** pide el del Día F2 y lo cancela si llegara a crearse; **JM** libera una Noche F3 de Medicina y se la asigna a MD; **JU** libera una Noche F3 de Urgencias quitando a su titular e intenta asignársela a MD; al final **JM** y **JU** devuelven cada cupo a su titular. *E5-01, E5-02, E5-03, E5-04, E5-05* → choque y descanso entre servicios rechazados; 24 corridas permitido · TXT, RED, CAP.
16. *(P3, si se hizo el paso 29 de ED)* **JM** libera la Noche del 31 ene (titular del equipo 1) y la asigna a MD; libera el turno de 24 h del 1 feb y lo asigna a MD. *E5-08* → la regla literal lo permite: hallazgo para S-31 · CAP.
17. **JU** y **JM** revisan la bitácora contra la bitácora de cambios; prueban filtros; abren historiales; **MU2** revisa su historial de solicitudes; **JU** abre la auditoría; los tres exportan CSV. *E6-01, E6-02, E6-03, E6-04, E6-05, E6-06* → todo cuadra · BIT, HIS, CAP, CSV.
18. Con la ventana bajo 1200 px, repetir A1-05, B1-02, C2-03 y E2-01, armando y deshaciendo lo mínimo para cada uno. *E2-04* → mismos resultados · CAP.
19. **JU** usa «Quitar subrogancia» sobre SU; **SU** revisa sin salir y vuelve a entrar (R). *E3-02* → conserva funciones hasta volver a entrar (S-20); después, médico · CAP.

**Limpieza EE.** V11 con TB5, X con MU1, MX activo, cupos de Medicina restaurados, SU de vuelta a médico en Urgencias (queda también como médico en Medicina, anotarlo), ninguna pendiente.

### EF · Casos que dependen de la hora

Solo intentos que deben fallar, salvo el paso 4. No se quita a nadie de un turno real en curso ni pasado para preparar un caso. Si un intento que debía fallar se acepta, es FALLA y se revierte en el acto.

1. *(Cualquier hora)* **JU** busca un cupo libre de un turno ya terminado e intenta asignarlo; intenta quitar a un médico de un turno terminado ayer. **MU2** abre una solicitud nueva de cobertura, revisa que la lista no ofrezca turnos pasados y fuerza (F) la cobertura de ese cupo pasado. *A1-10, A2-03, B1-09* → rechazo en todo; si no hay cupo libre pasado, A1-10 y la parte forzada de B1-09 son N/A · TXT, RED, CAP.
2. *(Cualquier hora)* **MU3** intenta un permiso para fechas pasadas. *C6-07* → rechazo; si se acepta, cancelarlo · TXT.
3. *(Durante un turno en curso)* Con un médico que esté de turno ahora: intenta botarlo, proponer un intercambio con él y ofertarlo; si existe un cupo libre en curso, **JU** intenta asignarlo y un médico intenta pedirlo; se revisan las ofertas disponibles. *A1-09, B1-07, C1-09, C5-06, C8-10* → todo rechazado; ninguna oferta de turnos pasados · TXT, RED, CAP.
4. *(Entre 1 y 3 h antes de un inicio, 05:00–07:00 o 17:00–19:00; solo con la autorización de S-32)* Un médico pide un cupo libre que empieza pronto o pide botar un turno propio que empieza pronto, y lo cancela de inmediato. *B1-08* → se permite · TXT, RED.
5. *(Si la ejecución cruza el inicio de un turno con una cobertura pendiente)* **JU** intenta aprobarla después del inicio. *B2-05* → rechazo; si no se da la condición, N/A · TXT.
6. *(Entre las 21:00 y las 24:00)* Un médico pide un cupo libre de diciembre y lo cancela; **JU** busca los dos eventos en la bitácora. *E6-07* → fecha y hora de Chile · BIT.

### EZ · Cierre

1. Filtrar solicitudes y ofertas por las personas de prueba: ninguna pendiente.
2. Comparar el calendario de cada fecha usada con la foto de E0: todo restaurado.
3. Mini-molde de 24 h (si se hizo): **JM** devuelve la Noche del 31 ene a su titular; **ADM** elimina los turnos del 1 al 7 feb de Medicina, el molde «Prueba 24 h», la «Rotativa prueba 24 h» y el tipo «24 h prueba».
4. Confirmar que MX está activo y que SU volvió a médico.
5. Escribir el resumen en `RESULTADOS_EJECUCION.md`: totales OK, FALLA, BLOQUEADO y N/A por flujo; lista de FALLAS con evidencia; observaciones de limitaciones conocidas (S-30, S-31) y de supuestos que el resultado contradijo.
6. Cerrar la bitácora de cambios con el estado final.

## 7. Casos que dependen de la hora y octubre

EF es la única parte que puede tocar fechas reales, incluida la de la ejecución si cae en octubre. Lo que hace es intentar acciones que deben fallar, sin escribir nada. El paso 4 deja una solicitud cancelada en la fecha real y solo se ejecuta con la autorización del dueño (S-32). Si el dueño no autoriza, B1-08 queda N/A.

## 8. Registro de resultados

`RESULTADOS_EJECUCION.md`, una fila por caso:

| Caso | Resultado | Evidencia | Observación |
|---|---|---|---|
| A1-01 | OK | evidencia/EA/EV_A1-01_1.png, EV_A1-01_2.txt | — |
| A1-05 | FALLA | evidencia/EA/EV_A1-05_1.png | El aviso no nombra la Noche D−1 |

Al final: totales por flujo y por resultado, y la lista de supuestos que la ejecución confirmó o contradijo.

## 9. Bitácora de cambios en el sistema

Se llena durante la ejecución. Las filas siguientes son lo esperado; la columna «Hecho» y la nota las completa el agente.

| # | Escenario | Cambio | Estado final esperado | ¿Se revierte? | Hecho | Nota |
|---|---|---|---|---|---|---|
| 1 | EA | V1 (Día D): se quita a MU4, se asigna a MU3 y vuelve a MU4 | V1 con MU4 | Sí | | |
| 2 | EA | V2 (Noche D): se quita a MU5, pasa por MU1 y MU2 y vuelve a MU5 | V2 con MU5 | Sí | | |
| 3 | EA | V3 (Noche D−1): se quita a MU1 y vuelve | V3 con MU1 | Sí | | |
| 4 | EA | MX inactivo por un rato | MX activo | Sí | | |
| 5 | EA | Cobertura de MU3 y «botar» de MU4, cancelados | Quedan en el historial como canceladas | No (registro) | | |
| 6 | EB | V4, V5, V6 y V4b: se vacían y se restauran | Cada uno con su titular | Sí | | |
| 7 | EB | Coberturas aprobadas, rechazadas, canceladas y rechazadas solas | Quedan en el historial | No (registro) | | |
| 8 | EC | X e Y se intercambian y vuelven; W3 se bota y vuelve; W4 se quita y vuelve; V7 a V10 se vacían y se restauran | Cada turno con su dueño original | Sí | | |
| 9 | EC | Intercambios, ofertas particulares y generales en todos sus estados | Quedan en el historial | No (registro) | | |
| 10 | EC | Permiso de MU3 del P1 al P2, aprobado | Queda como registro aprobado | No | | |
| 11 | ED | Servicio Medicina | Activo | No (S-33) | | |
| 12 | ED | Tipos «Día» y «Noche»; tipos «Prueba» y «24 h prueba» | Día y Noche activos; los de prueba eliminados | Parcial | | |
| 13 | ED | Puestos «Medicina 1» a «Medicina 7»; «Puesto prueba SM» y «Puesto prueba» | 7 activos; los de prueba inhabilitados | Parcial | | |
| 14 | ED | Rotativas «Equipo 1» a «Equipo 6»; «Rotativa prueba» y «Rotativa prueba 24 h» | 6 activas; las de prueba eliminadas | Parcial | | |
| 15 | ED | 45 personas asociadas a Medicina, más MD y SU | Asociadas | No (S-33) | | |
| 16 | ED | JM y JM2 jefaturas de Medicina; SM subrogante | Así quedan (S-28) | No | | |
| 17 | ED | Molde «Medicina 2026-27» y 588 turnos del 21 dic al 31 ene | Generados | No (S-33) | | |
| 18 | ED | Extensión a febrero y edición desde el 11 ene (opcionales) | Sin rastro en los turnos | Sí | | |
| 19 | ED/EZ | Mini-molde de 24 h y sus turnos del 1 al 7 feb (opcional) | Eliminados | Sí | | |
| 20 | EE | MU5 subrogante y luego médico | Médico en Urgencias | Sí | | |
| 21 | EE | V11, X y cupos de Medicina de F1, F2 y F3: se vacían y se restauran | Con sus titulares | Sí | | |
| 22 | EF | Solicitud de B1-08, cancelada (solo con autorización) | Cancelada en la fecha real | No (registro) | | |
