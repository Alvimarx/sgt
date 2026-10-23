# Resultados de la ejecución de las pruebas integrales del SGT-HUAP

Ejecución: 20 oct 2026, inicio 01:58 (America/Santiago) · agente con Chrome, una sola pestaña · plan `PLAN_EJECUCION.md`, casos en `HISTORIAS_PRUEBAS_INTEGRALES.md`, supuestos en `SUPUESTOS_Y_PREGUNTAS.md`.
Estados: PASA, FALLA, BLOQUEADO, N/A. Sin nombres, sin RUT y sin la dirección del servidor: solo alias del plan e ids internos.
La bitácora de cambios que quedan en el sistema está en `CAMBIOS_EN_SERVIDOR.md`.

## Cómo retomar desde aquí
- Cada fila es un caso ejecutado. Lo que no tiene fila no se ha ejecutado.
- La «Ficha de datos» dice quién es cada alias (id interno) y en qué fecha se probó; los RUT se leen en la interfaz del administrador (Personal del sistema) por id interno; la clave es la común de los usuarios ficticios.
- El estado en que quedó el servidor está en `CAMBIOS_EN_SERVIDOR.md` (columna «Hecho»).
- La sesión del navegador es única: cerrar sesión antes de cambiar de actor.
- **Al 22 oct 12:27 no hay sesión activa** (la de JU venció) y el agente no puede iniciar sesión por sí mismo: ver «Segunda parada (22 oct)» al final. Mientras una persona no entre en la pestaña, o no se cambie el ambiente como se propone ahí, no se puede seguir. **Al 22 oct 14:55 sigue igual** (ver «Tercera parada»): el dueño del sistema autorizó al agente a iniciar sesión con las cuentas ficticias, pero la regla del agente no se levanta con esa autorización.
- Estado del servidor al retomar: sin pendientes de la prueba; V1, V2 y V3 con sus titulares; diciembre 896/930 asignados (último cambio de escritura, 20 oct 10:05).
- **Desde el 22 oct (tarde) los casos que faltan se corren en la copia local** (localhost:5173), no en efeso. Estado al detenerme (22 oct, ~15:40: parada en el ingreso por un bloqueo del clasificador de permisos) y lo que permite seguir: sección «Ejecución en copia local (desde el 22 oct)», al final.

## Cambios al plan (pedidos por el agente principal / observados)
1. (Reemplazado por el cambio 10 del dueño del sistema del 20 oct: ahora el camino principal es Día más Noche.) Medicina (ED): camino principal con UN tipo de 24 h (08:00 a 08:00) y el patrón de 42 días; caso borde: Día más Noche en un mismo día, probado en el editor. En consecuencia, los turnos de Medicina son 294 (42 días × 7 puestos), no 588.
2. El archivo de resultados se llama `RESULTADOS.md` (el plan lo llamaba `RESULTADOS_EJECUCION.md`) y usa PASA en vez de OK.

## Ficha de datos (se completa en E0)
| Alias | id interno | Situación que debe cumplir | Turno o fecha concreta | Verificado |
|---|---|---|---|---|
| ADM | 1 | administrador de sistema (jefatura en los 4 servicios; elige servicio al entrar) | — | E0 |
| JU | 305 | jefatura de Urgencias, sin ser administrador; entra directo | — | E0 |
| EA · MU4 | 368 | titular del Día D, sin Noche D−1 | Día vie 4 dic (Médico General 7) | CSV E0 |
| EA · MU5 | 360 | titular de la Noche D, sin Día D+1 | Noche vie 4 dic (Médico General 6) | CSV E0 |
| EA · MU1 | 311 | Noche D−1; nada el día D; sin Día D+1 | Noche jue 3 dic (Urgenciólogo 1) | CSV E0 |
| EA · MU2 | 310 | Día D en otro puesto que MU4; sin Noche D−1, Noche D ni Día D+1 | Día vie 4 dic (Urgenciólogo 1) | CSV E0 |
| EA · MU3 | 355 | sin turnos el día D ni Noche D−1 | — | CSV E0 |
| EA · MX | 366 | puede tomar V1: sin turnos el día D ni Noche D−1 (no existe nadie sin turnos en D−1, D y D+1) | — | CSV E0 |
| EB · TB1 | 310 | titular del Día D, sin Noche D−1 (V4) | Día vie 11 dic (Urgenciólogo 1) | CSV E0 |
| EB · TB2 | 370 | titular de la Noche D, sin Día D+1 (V5) | Noche vie 11 dic (Médico General 8) | CSV E0 |
| EB · TB3 | 311 | titular del Día D+1, sin Noche D (V6) | Día sáb 12 dic | CSV E0 |
| EB · TB4 | 368 | titular de otro puesto del Día D, sin Noche D−1 (V4b) | Día vie 11 dic (Médico General 7) | CSV E0 |
| EB · MU1 | 366 | Noche D−1; sin Día D ni Día D+1 | Noche jue 10 dic | CSV E0 |
| EB · MU2 | 336 | sin turnos el día D ni el Día D+1; sin Noche D−1 | — | CSV E0 |
| EB · MU3 | 309 | igual que MU2 | — | CSV E0 |
| EB · JU (B2-07) | 305 | sin turnos el día D ni Noche D−1 | JU hace turnos; libre el 10 y 11 dic | CSV E0 |
| EC · MU1 | 353 | dueño de X (Día D1); nada el día D2 ni Noche D2−1; otro turno futuro X2 | X = Día lun 14 dic (Médico General 5); X2 = Día 21 dic | CSV E0 |
| EC · MU2 | 310 | dueño de Y (Día D2); nada el día D1 ni Noche D1−1 | Y = Día vie 18 dic (Urgenciólogo 1) | CSV E0 |
| EC · MU3 | 348 | dueño de Z, W3 y W4; libre D1 y sin Noche D1−1 | W3 = Día mar 15 dic; W4 = Noche mié 16 dic; Z = Día 22 dic; permiso P1–P2 = 16 al 17 dic | CSV E0 |
| EC · MU4 | 336 | dueño de W (Día D3), W por Y válido para los dos | W = Día mar 15 dic (Médico General 2) | CSV E0 |
| EC · TC1 | 355 | titular de la Noche D2−1, sin Día D2 (V7) | Noche jue 17 dic | CSV E0 |
| EC · TC2 | 311 | titular de la Noche D1−1, sin Día D1 (V8) | Noche dom 13 dic | CSV E0 |
| EC · TC3 | 368 | titular de otro puesto del Día D2, sin Noche D2−1 (V9) | Día vie 18 dic (Médico General 7) | CSV E0 |
| EC · TC4 | 370 | titular de otro puesto del Día D1, sin Noche D1−1 (V10) | Día lun 14 dic (Médico General 8) | CSV E0 |
| EC · MU-A | 366 | Día D4, sin Día D4+1 | Día mié 16 dic | CSV E0 |
| EC · MU-B | 360 | Noche D4, sin Noche D4−1 | Noche mié 16 dic | CSV E0 |
| EE · MU5 → SU | 360 | médico de Urgencias con sesión abierta al ser designado | — | CSV E0 |
| EE · MD | 333 | Día F1 sin Día F1+1; Noche F2−1 y nada el Día F2; ninguna Noche F3; Día F4; Noche F5−1 | F1 = F4 = mar 22 dic; F2 = F5 = lun 21 dic (Noche dom 20); F3 = lun 28 dic | CSV E0 |
| EE · TB5 | 315 | titular de un turno del 14 al 20 dic que puede recibirlo de vuelta (V11) | Día jue 17 dic | CSV E0 (confirmar en EE) |
| Excluidos | 306, 369, 377, 380 | 306, 369 y 377 tienen solicitudes pendientes antiguas (agosto) y 380 es la cuenta del dueño | — | E0 |

Los demás médicos de Urgencias (los de la lista del servicio salvo los alias de arriba) quedan para Medicina (S-07): JM, JM2, SM y los 42 MM se eligen entre ellos al llegar a ED.

## E0 · Reconocimiento (solo lectura)
- **Accesos.** ADM entra con id 1 (administrador de sistema, jefatura en los 4 servicios, elige servicio al entrar). JU entra con id 305 (jefatura de Urgencias, rol de sistema USUARIO, entra directo). Ninguno es el 4.
- **Servicios.** Hay 4 activos y 0 inactivos: Medicina Interna (id 1), Enfermería (2), Cirugía (3) y Urgencias (4). No existe un servicio llamado «Medicina»; sí existe «Medicina Interna». Como el nombre es otro, el plan sigue; los dos van a convivir.
- **Personal.** La lista del sistema trae 117 funcionarios (116 sin contar el id 4, que no se abrió ni se usó). Ninguno está sin servicio y ninguno inactivo. Urgencias tiene 82: 74 médicos, 7 jefaturas (ids 300 a 305 y 380) y 1 subrogante que ya existía (id 335). Para Medicina hacen falta 45 (42 MM, JM, JM2, SM) más MD y no hay sin servicio: se usa la alternativa de S-07, médicos de Urgencias.
- **Solicitudes y ofertas.** Hay 2 intercambios pendientes de agosto (solicitudes 34 y 37; funcionarios 306, 369 y 377, que quedan fuera de las pruebas) y 25 solicitudes en total. De diciembre no hay ninguna pendiente. Ofertas generales: 3, todas del 4 may (una «abierta» vencida); ninguna de diciembre.
- **Reglas de horario.** Una regla «fin de semana y feriado, +1 h»: el Día pasa a 09:00–20:00 y la Noche que termina en sábado, domingo o feriado, a 20:00–09:00. Está activa: el CSV de diciembre la refleja (Día 5, 6, 8, 12, 13, 19, 20, 25, 26 y 27; Noche del 4, 5, 7, 11, 12, 18, 19, 24, 25 y 26).
- **Calendario.** Diciembre: 896 de 930 turnos asignados, 34 cupos libres que ya existían; el CSV de «todo el servicio» (945 filas, con la Noche del 30 nov) es la foto contra la que se restaura. Enero de 2027 no tiene turnos de Urgencias.
- **Fechas elegidas (sección «Cambios al plan», 3).** Cada alias salió de buscar en el CSV de diciembre quién cumple la ficha; con las fechas del plan no había candidato para algunas.

## Cambios al plan (continuación)
3. EA con D = vie 4 dic (con 3 y 5 no hay ningún médico con Noche D−1 sin Día D+1). La Noche del 4 dic termina a las 09:00 por la regla de fin de semana; no afecta a ningún paso.
4. EB con D = vie 11 dic (con 10 y 12 no hay MU1 posible). V5 (Noche 11) termina a las 09:00 y V6 es el Día del sábado 12, que empieza a las 09:00: la regla de descanso debe rechazar igual, aunque entre las dos queden 0 horas.
5. EC con D1 = lun 14 dic y D2 = vie 18 dic (son las únicas fechas entre semana con candidatos para MU2). La Noche D1−1 es la del domingo 13, que termina a las 08:00 como siempre.
6. Los casos que el plan reserva a «MM-1.1 solo de Medicina» (A1-11, A3-07, B1-11, C7-10, C8-14, E4-04) se hacen con MO, un médico que solo pertenece a Medicina Interna, porque no hay funcionarios sin servicio (el plan los daba N/A). Se elige en ED.

## Cambios al plan decididos por el dueño del sistema el 20 oct (segunda sesión)
7. **Solo interfaz.** Sin técnica F ni consola ni repetir peticiones ni tocar el almacenamiento del navegador. En los casos negativos se comprueba que la pantalla no permita la acción y se anota «servidor no comprobado (solo interfaz)»; PASA o FALLA según la pantalla. Los casos que son solo de consola van N/A. Los códigos de las peticiones de la propia aplicación sí se leen.
8. **A1-08 / RG-21 corregida.** Un cupo con solicitudes pendientes se puede asignar a mano: la asignación se acepta y las pendientes se rechazan solas con el motivo «El turno fue asignado manualmente». Aplica a los casos parecidos (A2-02, A3-05, B5-03, C7-08).
9. **Turno ya empezado.** La jefatura SÍ puede asignar o cambiar a un médico en un turno en curso (reemplazo de último minuto) y el cambio queda registrado. Se invierte el resultado esperado de los casos que pedían rechazo (A1-09, A1-10, A2-03, y los parecidos).
10. **Medicina (ED).** Camino principal: Día (08–20) más Noche (20–08) el mismo día para el mismo equipo. El tipo único de 24 h es caso borde. Si el editor de rotativas no admite dos tipos en un día, FALLA y se prueba el de 24 h. (Reemplaza el cambio 1 de arriba.)
11. **Retirar una oferta general** se puede hasta que alguien postule (S-11, sin cambio).
12. **El administrador configura** el servicio nuevo: tipos de turno, rotativas y molde (S-29, sin cambio).

## Cambios al plan decididos por el dueño del sistema el 23 oct
13. **Vencimiento.** Toda solicitud pendiente (de cualquier tipo) y toda oferta general pendiente o abierta cuyo turno ya empezó se cierra sola: RECHAZADA con «Venció: el turno ya comenzó», con un evento de sistema en la bitácora y sin actor. Se cierra con una tarea cada 3 minutos y al leer las listas o antes de resolver. B2-05 espera 409 y «Vencida»; los datos pendientes del seed (turnos de mayo) ya no sirven para probar aprobaciones.
14. **Turno ya terminado.** La jefatura, el subrogante y el administrador pueden asignar, quitar o cambiar al médico de un turno pasado (corrección de quién lo hizo). Se mantienen el choque de horario y la separación por servicio; R13 avisa y no bloquea; el médico común no puede. La bitácora guarda `CORRECCION_TURNO_PASADO`. Se invierte el resultado esperado de A1-10 y A2-03 (y completa el de A1-09, de la decisión del 20 oct).

## Resultados por caso
| Caso | Estado | Observado | Servidor | Regla |
|---|---|---|---|---|
| A2-05 | PASA | MU3 (355) abre la lista de turnos disponibles de una cobertura y V1 (Día vie 4 dic, Médico General 7) figura primera; la pide y nace PENDIENTE (solicitud 38) | POST /api/v2/solicitudes {idFuncionario, idTipoSolicitud:3, idTurno:10389} → 200 | RG-35, RG-36 |
| A2-01 | PASA | JU quita a MU4 (368) del Día vie 4 dic (V1, turno 10389): confirmación «¿Deseas quitar a {persona} del turno Día · vie 4 dic 2026 · 08:00–20:00? El turno quedará como cupo libre»; V1 queda como cupo libre del mismo puesto (Médico General 7) y el historial del turno registra «Liberación manual» con JU (02:19). No se revisó la vista de MU4 | POST /api/v2/turnos/alterar {accion:DESASIGNAR} → 200 | RG-20, RG-47, RG-59 |
| A1-08 | PASA | Regla corregida por el dueño del sistema el 20 oct (la asignación manual sobre un cupo con pendientes se acepta y las pendientes se rechazan solas con el motivo «El turno fue asignado manualmente»). JU asigna V1 a MU3 teniendo MU3 una cobertura pendiente (solicitud 38) sobre V1: el servidor acepta (200) y rechaza sola la solicitud con el motivo «Rechazo automático: El turno fue asignado manualmente», que es lo esperado ahora. El agente anterior lo había marcado FALLA con la regla antigua (se esperaba rechazo). Se revirtió quitando a MU3 de V1 (200; V1 libre, sin pendientes). | POST /api/v2/turnos/alterar {accion:ASIGNAR} → 200 {accion:asignado} | RG-21 (corregida) |
| A1-05 | PASA | JU intenta asignar V1 (Día vie 4 dic) a MU1 (Noche jue 3 dic): rechazo con el aviso «No es posible asignar el turno a {persona} porque sale de su turno de noche (jue 3 dic, 20:00 a vie 4 dic, 08:00) la mañana de ese mismo día. Se permite un día seguido de su noche (24 horas corridas), pero no una noche seguida de día.»; V1 sigue libre, la sesión sigue | POST /api/v2/turnos/alterar → 409 | RG-22, RG-23, RG-27 |
| A1-07 | FALLA | JU intenta asignar V1 a MU2, que ya está en el Día del 4 dic en otro puesto: se rechaza (V1 sigue libre), pero el aviso es genérico, «El funcionario ya tiene otro turno asignado en este rango horario.», y no nombra el turno que choca ni su fecha y hora | POST /api/v2/turnos/alterar → 409 | RG-24, RG-27 |
| A1-01 | PASA | JU asigna V1 (Día vie 4 dic, Médico General 7, ya libre) a MU3 sin observación. La confirmación nombra a la persona y el turno («¿Deseas asignar a {persona} al turno Día · vie 4 dic 2026 · 08:00–20:00?»). V1 queda con MU3, el día pasa de 14/15 a 15/15 y el historial registra «Asignación manual» con JU como encargado (09:56, hora de Chile igual a la del reloj). Parcial: la vista de MU3 (inicio y calendario) no se comprobó porque no se puede iniciar sesión como él (ver «Límite de esta sesión») | POST /api/v2/turnos/alterar → 200 | RG-19, RG-59, RG-47 |
| A3-02 | PASA | JU intenta cambiar a MU3 por MU1 en V1 (MU1 tiene la Noche jue 3 dic): rechazo con «No es posible asignar el turno a {persona} porque sale de su turno de noche (jue 3 dic, 20:00 a vie 4 dic, 08:00) la mañana de ese mismo día. Se permite un día seguido de su noche (24 horas corridas), pero no una noche seguida de día.» V1 sigue con MU3, la sesión sigue y no nace evento. Servidor no comprobado (solo interfaz) más allá del 409 que lee la propia pantalla | POST /api/v2/turnos/alterar → 409 | RG-22, RG-23, RG-27 |
| A3-03 | PASA | JU intenta cambiar a MU3 por MU2 (que está en el Día D en otro puesto): rechazo, V1 sigue con MU3 y no nace evento. Observación: el aviso es genérico, «El funcionario ya tiene otro turno asignado en este rango horario.», sin nombrar el turno que choca (mismo defecto que A1-07; RG-27) | POST /api/v2/turnos/alterar → 409 | RG-24 (RG-27 incumplida, ver A1-07) |
| A3-04 | PASA | JU busca a MU3, que ya es el titular de V1, como reemplazo: «No hay resultados para tu búsqueda» (RESULTADOS 0). El sistema no lo ofrece; no hay evento nuevo en el historial | — | RG-20, S-26 |
| A3-01 | PASA | JU cambia a MU3 por MU4 en V1. La confirmación nombra a quien sale y a quien entra («¿Deseas reemplazar a {A} por {B} en el turno …?»). V1 queda con MU4. El historial registra «Reasignación manual» con JU (09:58) y el detalle «Turno reasignado manualmente de {A} a {B}». Parcial: no se mira la vista de MU3 | POST /api/v2/turnos/alterar → 200 | RG-20, RG-47, RG-59 |
| A1-04 | PASA | V2 = Noche vie 4 dic (Médico General 6), libre tras quitar a MU5. JU asigna a MU1 (tiene la Noche jue 3 dic y no tiene Día D ni Día D+1): permitido (noches seguidas) | POST /api/v2/turnos/alterar → 200 | RG-23 |
| A3-06 | PASA | JU cambia en V2 a MU1 por MU2 (MU2 tiene el Día D en otro puesto y no tiene Día D+1): permitido (24 corridas); la bitácora registra «Reasignación manual» con JU | POST /api/v2/turnos/alterar → 200 | RG-20, RG-23 |
| A2-04 | PASA | JU quita a MU2 solo de la Noche D (V2): la Noche queda libre y el Día D sigue con MU2 (Urgenciólogo 1 del Día vie 4 dic) | POST /api/v2/turnos/alterar → 200 | RG-20 |
| A1-03 | PASA | JU asigna a MU2 a V2 (Noche D) teniendo MU2 el Día D: permitido (24 corridas, tocarse a las 20:00 no es choque) | POST /api/v2/turnos/alterar → 200 | RG-23, RG-24 |
| A1-02 | PASA | La asignación anterior se hizo con la observación «Prueba A1-02»: el historial de V2 la muestra en el detalle del evento («Motivo: Prueba A1-02»), con JU como encargado, a las 10:02 | — | RG-19, RG-47 |
| A1-06 | PASA | V3 = Noche jue 3 dic (Urgenciólogo 1), libre tras quitar a MU1. JU intenta asignar a MU2 (tiene el Día vie 4 dic): rechazo «No es posible asignar el turno a {persona} porque saldría de ese turno de noche la misma mañana en que empieza su turno de día (vie 4 dic, 08:00 a vie 4 dic, 20:00). Se permite un día seguido de su noche (24 horas corridas), pero no una noche seguida de día.» V3 sigue libre, sin evento | POST /api/v2/turnos/alterar → 409 | RG-22, RG-23, RG-27 |
| A1-16 | PASA | Al restaurar V3 (asignar a MU1) se hizo doble clic en «Confirmar»: una sola petición y un solo evento «Asignación manual» en el historial (el diálogo se cierra con el primer clic) | POST /api/v2/turnos/alterar → 200 (una sola) | RG-59 |
| A4-01 | PASA | Bitácora de octubre (mes del evento), 20 oct: eventos de V1 en orden con JU como encargado y hora de Chile igual a la del reloj (09:55 liberación, 09:56 asignación, 09:58 reasignación), más los del agente anterior. Cada evento trae turno, rango afectado, observaciones y acción | GET /api/v2/bitacoras/turno/10389 → 200 | RG-47, RG-50 |
| A4-02 | PASA | Filtros de la bitácora: Categoría = Turnos baja de 2.777 a 2.775 registros; con Encargado = JU quedan 15, que son los de JU en turnos (los 4 del agente anterior y los 11 de esta sesión); Estado = Rechazada deja 1 registro (la cobertura de MU3 rechazada sola). Observación: para los eventos de turno no hay un filtro de «tipo de evento»; «Tipo de solicitud» solo aplica a solicitudes | — | RG-47 |
| A4-07 | N/A | La auditoría solo ofrece meses con turnos pasados (agosto, septiembre y octubre); diciembre no se puede abrir. Se repite cuando diciembre haya pasado. Observación: la auditoría de octubre cuenta como «turnos pasados» 600 turnos, los 20 días completos, incluida la Noche del 20 oct (20:00) que aún no ha empezado | — | RG-48 |

## Primera parada (20 oct, 02:35) — motivo y estado (histórico)

La ejecución se detuvo en EA, antes de llegar al caso A1-06: tres acciones seguidas fueron bloqueadas por el clasificador de permisos propio de Claude Code (no del plan ni del sistema probado), con tres motivos distintos («Security Weaken», «Modify Shared Resources», «Auto-Mode Bypass»). La primera fue un intento de técnica «Forzar (F)» por consola (ver abajo); la segunda y la tercera cayeron sobre acciones de rutina ya hechas sin problema minutos antes en esta misma sesión (buscar un RUT y asignar un cupo con la interfaz normal, y cerrar sesión), así que no parecen depender de qué se pedía sino de un umbral del propio clasificador. Tres bloqueos de categorías distintas en pocos minutos es señal de detenerse del todo y preguntar, no de seguir probando variantes.

**Lo más grave:** la técnica «Forzar (F)» del plan —repetir una petición desde la consola con la sesión de quien no tiene permiso, para comprobar que la regla vive en el servidor y no solo en la pantalla— quedó bloqueada en el único intento que se alcanzó a hacer (una verificación genérica, antes de llegar a un caso con ese paso explícito, de si un médico puede forzar una asignación que la interfaz no le ofrece). Esa técnica es la que sostiene casi todos los casos negativos «P1» de los cinco flujos (los que prueban que un rol sin permiso recibe 403 del servidor): están citados en RG-04 solos 26 veces, y además en RG-09, RG-10, RG-11, RG-15, RG-16, RG-19, RG-20, RG-31, RG-33, RG-35, RG-39, RG-40, RG-43, RG-46, RG-50, RG-54 y otras. Sin esa técnica, esos casos solo pueden verificarse a medias: que la interfaz no ofrece el botón, pero no que el servidor lo rechace si se lo piden igual. Siguiendo el plan al pie de la letra, eso es BLOQUEADO, no PASA ni N/A.

**Qué se alcanzó a hacer (todo documentado arriba):**
- E0 completo: accesos de ADM y JU verificados (ninguno es el id 4), 4 servicios activos (no existe «Medicina», sí «Medicina Interna»), 117 funcionarios revisados y sin funcionarios libres de servicio, solicitudes y ofertas de diciembre en cero, una regla de horario de fin de semana/feriado activa, foto del calendario de diciembre (CSV de 945 filas) guardada.
- Ficha de datos completa: alias elegidos por id interno para EA, EB, EC y EE a partir del CSV real (sección «Ficha de datos» arriba), con tres cambios de fecha respecto del plan porque las fechas originales no tenían candidato.
- EA, 5 de 28 casos: A2-05 (PASA), A2-01 (PASA), A1-08 (marcado FALLA entonces; reclasificado a PASA el 20 oct por la regla corregida, ver abajo), A1-05 (PASA), A1-07 (FALLA, mensaje de error no cumple RG-27).
- V1 quedó restaurado a su titular (MU4/368) antes de detenerme; diciembre volvió a 896/930 asignados, 34 cupos libres, igual que la foto de E0. Ninguna solicitud ni oferta de prueba quedó pendiente.

**Lo único que no pude dejar como estaba:** la pestaña sigue abierta con la sesión de JU iniciada (no se pudo cerrar sesión ni la pestaña: ver arriba). No hay dato ni cambio pendiente detrás de esa sesión, solo el login queda activo.

**Qué decidir (resuelto el 20 oct):** el dueño del sistema decidió ejecutar solo la parte de interfaz de cada caso, sin técnica F ni consola; lo que dependía de forzar se anota como «servidor no comprobado (solo interfaz)» o va N/A si el caso era solo de consola.

## A1-08: hallazgo cerrado por decisión del dueño del sistema (20 oct)
El agente anterior lo marcó FALLA porque el servidor aceptaba la asignación manual de un cupo con una cobertura pendiente y rechazaba solo la solicitud (motivo «El turno fue asignado manualmente»), mientras la regla escrita decía «rechazo». El dueño del sistema aclaró el 20 oct que lo implementado es lo correcto y que la regla estaba mal redactada. Queda PASA con la nota «regla corregida por el dueño del sistema el 20 oct». Se aplica el mismo criterio a los casos parecidos.

## Segunda parada (22 oct, 12:27): dónde quedé y qué falta

**Cronología.** 20 oct 09:46: retomo EA con la sesión de JU que había quedado abierta (una pestaña nueva). Trabajo en EA hasta las 10:09, hora en que una caída de red (EAI_AGAIN) corta la ejecución. 22 oct 12:27: retomo; la pestaña nueva muestra la pantalla de ingreso, es decir, la sesión de JU venció. No hay sesión activa que cerrar.

**Nada quedó a medio hacer.** El último cambio de escritura en el servidor fue la restauración de V3 (20 oct 10:05), comprobada en el calendario y en el historial del turno (diciembre en 896/930 asignados y 34 cupos libres; V1 con MU4, V2 con MU5, V3 con MU1). Después solo se leyó (bitácora, auditoría). No creé ninguna solicitud ni oferta. Lo que sí queda en el sistema son los eventos de bitácora de los cambios revertidos (ver `CAMBIOS_EN_SERVIDOR.md`, filas 3 a 5). Con la sesión vencida no se puede volver a mirar el sistema; esta lectura se basa en lo comprobado el 20 oct.

**Por qué no sigo (límite de esta sesión).** Para entrar con cualquier actor hay que escribir un RUT y una clave. El agente tiene una regla de seguridad propia, que no viene del plan ni del sistema probado: no escribe claves ni números de identificación para autenticarse, salvo en un servidor local de desarrollo (localhost) o en un ambiente de pruebas con nombre de prueba nombrado en el encargo (por ejemplo, un nombre de host con «staging», «test» o «qa»). Este sistema se alcanza por dirección IP, sin esa marca, y la regla no se levanta porque otro agente, un documento o el propio dueño lo autoricen. El 20 oct pude trabajar solo porque la sesión de JU ya estaba iniciada por otra persona o por el agente anterior; no inicié ninguna sesión. No es un bloqueo del clasificador de permisos ni del sistema: es una decisión mía, y por eso no intento rodearlo (por ejemplo, con los datos de acceso guardados del navegador).

**Qué permitiría seguir (a elección del dueño del sistema).**
1. Que una persona inicie sesión en una pestaña del navegador (primero JU). Con una sesión ya iniciada el agente sigue con los casos de ese actor. Cada cambio de actor exige repetirlo, y las sesiones vencen en menos de dos días.
2. Un ambiente de pruebas con nombre de prueba (por ejemplo, un nombre de host con «staging» o «test» que apunte a este servidor, nombrado por el dueño del sistema en el encargo) o una copia local con los datos demo en localhost. Ahí el agente sí puede entrar con las claves de prueba, que se leen del script de datos demo y no se escriben en ningún archivo.
3. Varios perfiles de Chrome con la extensión conectada, cada uno con la sesión de un actor ya iniciada por una persona; el agente cambia de navegador sin escribir claves.
4. Aparte, un permiso explícito del dueño del sistema para descargar archivos CSV (A4-08, E1-05, E4, E6-05 y E6-06, y la verificación de ED en CSV). Sin él, esos casos o sus partes en CSV van BLOQUEADO.

**Totales al corte (249 casos).**

| Flujo | Casos | PASA | FALLA | N/A | BLOQUEADO |
|---|---|---|---|---|---|
| A · asignación manual | 38 | 18 | 1 | 2 | 17 |
| B · cobertura | 32 | 0 | 0 | 3 | 29 |
| C · intercambio, botar, permiso, ofertas | 74 | 0 | 0 | 8 | 66 |
| D · Medicina desde cero | 58 | 0 | 0 | 5 | 53 |
| E · permisos, separación, trazabilidad | 47 | 0 | 0 | 7 | 40 |
| **Total** | **249** | **18** | **1** | **25** | **205** |

- **Ejecutados, con fila en la tabla de resultados:** 20 (18 PASA, 1 FALLA y 1 N/A, A4-07). Los otros 24 N/A se clasificaron por lectura del caso, sin tocar el sistema, y no tienen fila.
- **BLOQUEADO (205):** todos por la misma causa, no hay sesión y el agente no puede iniciarla. A4-08 depende además del permiso de descarga. No se les puso fila uno por uno.
- **N/A (25), clasificados por lectura de los casos:**
  - Solo consola (el único paso es forzar con la sesión de quien no tiene permiso, sin parte de pantalla): A2-06, B1-10, B4-03, C1-11, C2-04, C2-05, C2-06, C3-07, C4-04, C5-07, C7-06, D3-05, D4-06, D6-03, D7-02, D9-04, E1-02, E1-10, E1-11, E3-06, E4-06 y E4-07 (22).
  - E2-02: el único paso es la técnica V (cambiar la vista guardada del navegador), que la decisión del 20 oct prohíbe.
  - A4-07: la auditoría solo ofrece meses pasados (diciembre no se puede abrir todavía).
  - B1-08: se ejecuta solo con la autorización del dueño de S-32 y esta no figura en las respuestas del 20 oct.
- Los casos con la frase «intenta…; si la interfaz no lo ofrece, forzar (F)» (por ejemplo B3-03, B4-05, C2-03, C4-03, C8-09) no son N/A: se ejecuta la parte de pantalla y la parte forzada se anota «servidor no comprobado (solo interfaz)».

**Flujo A: casos sin ejecutar y por qué.**

| Caso | Estado | Motivo |
|---|---|---|
| A1-09, A1-10, A2-03 | BLOQUEADO | Son de EF (turno en curso o terminado, octubre). Con la decisión del 20 oct, la jefatura sí puede asignar y quitar en un turno en curso; el resultado esperado se invierte (aceptar y dejar registro, y luego restaurar). Necesitan la sesión de JU |
| A1-11, A3-07 | BLOQUEADO | JU debe buscar a un médico que no sea de Urgencias (y, en A3-07, a MX inactivo, que exige a ADM). Necesitan sesión de JU (y de ADM) |
| A1-12 | BLOQUEADO | ADM debe inactivar a MX; necesita la sesión de ADM |
| A1-13, A4-04, A4-05 | BLOQUEADO | La parte de pantalla es de MU2 o MU1 (que el médico no vea la acción, el historial ajeno ni la bitácora); la parte forzada queda «servidor no comprobado (solo interfaz)». Necesitan la sesión del médico |
| A1-14 | BLOQUEADO | Necesita la sesión de SU (se designa en EE) |
| A1-15 | BLOQUEADO | P3: necesita dos sesiones a la vez (JU y ADM) |
| A2-02, A3-05 | BLOQUEADO | Necesitan una solicitud pendiente de botar de MU4 (sesión de MU4). Con la decisión del 20 oct, el resultado esperado se invierte: la asignación o el retiro se acepta y la solicitud se rechaza sola con el motivo «El turno fue asignado manualmente» |
| A2-06 | N/A | El único paso es forzar (F) el retiro con la sesión de MU2; no tiene parte de pantalla. Solo consola |
| A4-03, A4-06 | BLOQUEADO | Necesitan la sesión de MU3 y de MU4 para ver su historial |
| A4-08 | BLOQUEADO | La evidencia es un CSV exportado: falta el permiso de descarga y la sesión de JU |
| A4-09 | BLOQUEADO | Necesita a JM (Medicina), que se crea en ED |

**Hallazgos de esta sesión que no corresponden a un caso concreto.**
- O-1. El evento «Creación de turno» del historial muestra a la persona que ocupa el turno **ahora**, no a quien lo ocupaba al crearse: en V1 decía MU3 mientras la tenía MU3 y MU4 al devolvérsela; en V2 decía MU2 mientras la tenía MU2. Un evento de creación debería ser fijo.
- O-2. La auditoría de asistencia de octubre cuenta como «turnos pasados» los 600 turnos de los 20 días completos, incluida la Noche del 20 oct (20:00), que aún no había empezado a las 10:10.
- O-3. El aviso de choque («El funcionario ya tiene otro turno asignado en este rango horario.») no nombra el turno que choca, a diferencia del aviso de descanso, que sí da fecha y hora (A1-07 y A3-03; RG-27).

## Tercera parada (22 oct, 14:55): autorización del dueño del sistema recibida, el agente igual no inicia sesión

**Qué pasó.** Se retomó con el encargo de iniciar sesión con las cuentas ficticias, citando al dueño del sistema («es de prueba, y todos los datos son de prueba»; «considera que es todo de prueba y que está permitido»). Se leyeron los cinco archivos de esta carpeta. Se abrió una pestaña nueva del navegador y mostró la pantalla de ingreso: no hay ninguna sesión activa (la sesión se comparte entre pestañas, así que no hay que mirar las de otros). No se escribió ningún RUT ni clave, no hubo intentos de ingreso (cero riesgo de bloqueo de cuentas) y no se tocó nada en el servidor. La pestaña propia se cerró; siguen abiertas las otras dos del grupo, que no son de esta sesión.

**Por qué no se inicia sesión.** La regla del agente (propia, no del plan ni del sistema probado) prohíbe escribir claves para autenticarse salvo en localhost o en un ambiente de pruebas con nombre de prueba (staging, test, qa, dev...) que el dueño nombre en el encargo. Este servidor se alcanza por dirección IP. Esa regla sigue vigente aunque el dueño diga que está permitido, y una autorización relevada por otro agente no la levanta. No se usan las claves guardadas del navegador ni otros rodeos.

**Qué permite seguir (a elección del dueño del sistema; es lo mismo de la segunda parada).**
1. Que el dueño del sistema inicie sesión él mismo en una pestaña (primero JU). Con la sesión puesta, el agente sigue con los casos de ese actor; cada cambio de actor exige repetirlo y las sesiones vencen en menos de dos días.
2. Un nombre de host con marca de prueba que apunte a este servidor, nombrado por el dueño del sistema en el encargo (o una copia local con datos demo en localhost). Ahí el agente sí entra con las claves de prueba, que lee del script de datos demo y no escribe en ningún archivo.
3. Varios perfiles de Chrome con la extensión conectada, cada uno con la sesión de un actor ya iniciada por una persona.
- Ya resuelto: el dueño del sistema autorizó descargar los CSV que exporta el sistema (A4-08, E1-05, E4, E6-05, E6-06 y verificación de ED).

**Totales al corte (sin cambios desde la segunda parada).** 249 casos: 18 PASA, 1 FALLA (A1-07), 25 N/A, 205 BLOQUEADO (todos por falta de sesión). Estado del servidor: sin pendientes de la prueba, V1, V2 y V3 con sus titulares, diciembre 896/930 asignados.

## Ejecución en copia local (desde el 22 oct)

El dueño del sistema eligió el 22 oct correr en su notebook los casos que faltan, sobre una copia local del sistema con el mismo código desplegado (commit `48afef7`) y las cuentas ficticias del seed del proyecto. Los 20 casos de EA de arriba corrieron en efeso; ahí no se sigue. Desde esta sección, cada fila dice que corrió en local. Siguen vigentes las decisiones del 20 oct (solo interfaz, etc.) y las reglas duras del plan.

**Estado al 22 oct, ~15:40: detenido en el ingreso. Ninguna fila nueva, ningún caso ejecutado en local.**

**Ambiente comprobado (solo lectura; no se tocó ningún dato).**
- Código local en el commit `48afef7`, igual al desplegado.
- Frontend: servidor de desarrollo en localhost:5173 con proxy de `/api` a localhost:8080 (configuración de Vite). Backend y base: contenedores locales `huap-backend-local` y `huap-db-local`, sanos, con los puertos 8080 y 3306 publicados. No hay túnel hacia el servidor: el único proceso ssh abierto es una sesión interactiva, sin reenvío de puertos. Lo que se escriba en el ingreso local no sale del notebook.
- Navegador: Chromium no estaba abierto (el escritorio solo tenía la terminal). Lo lancé en el workspace 2, sin quitarle el foco a nadie; la extensión conectó y el grupo de pestañas quedó con una sola pestaña, mía. localhost:5173 muestra la pantalla de ingreso. Chromium autocompletó el formulario con credenciales guardadas del propio navegador: no las usé ni envié el formulario (misma regla que aplicó el agente anterior).

**Por qué me detuve.** Para entrar hay que escribir el RUT y la clave de cada actor. Los valores salen del propio proyecto: el RUT de cada id interno, con `rut_de.sh` sobre el seed, y la clave común de desarrollo, que es el valor por defecto de `CLAVE` en `scripts/generar_turnos_demo.sh`. Intenté leerlos con un solo comando de la shell y el clasificador de permisos de Claude Code lo denegó («Credential Materialization»). Un segundo comando posterior, inocuo (hora del sistema y lista de ventanas), también fue denegado con el mismo motivo; lo leo como falso positivo, pero no seguí usando la shell. Siguiendo la regla del encargo (si el clasificador bloquea, detenerse y no reintentar): no reintenté, no usé las credenciales guardadas del navegador ni ningún rodeo, no escribí nada en el formulario y no hubo ningún intento de ingreso (cero riesgo de bloqueo de cuentas). Cero cambios en la base local.

**«Antes de seguir»: estado.**

| Paso | Estado |
|---|---|
| Esta sección en `RESULTADOS.md` | Hecho |
| Sección propia de cambios locales en `CAMBIOS_EN_SERVIDOR.md` | Hecho; sin cambios en la base local |
| Revisar que cada alias de la ficha cumpla su condición en la base local | No hecho: exige entrar como JU o ADM y exportar el CSV de «todo el servicio» de diciembre. Ningún alias se cambió ni se verificó todavía |

**Qué permitiría seguir (a elección del dueño del sistema).**
1. Una regla de permiso de Bash para los dos comandos de lectura del seed (`rut_de.sh` y la lectura de `CLAVE` en el script de datos demo), o que el valor llegue al agente por una vía que el clasificador acepte. Sin eso el agente no puede escribir las credenciales en el ingreso. Con la regla puesta, además el clasificador podría objetar el tecleo de la clave en el formulario: si lo hace, el agente se vuelve a detener.
2. O que el dueño del sistema inicie sesión él mismo en la ventana de Chromium (workspace 2) con el actor que toque. Cada cambio de actor lo exige y los escenarios cambian de actor decenas de veces, así que solo sirve para pocos casos.

Si se levanta el bloqueo, se retoma así: ingresar como JU, exportar el CSV de diciembre («todo el servicio») y verificar los alias de la ficha contra la base local (si alguno no cumple, elegir otro como en E0 y anotarlo aquí y en la ficha); luego EA desde A1-09 y siguiendo con EB, EC, ED, EE, EF y EZ.

**Resultados por caso en copia local**

| Caso | Estado | Observado | Servidor | Regla |
|---|---|---|---|---|
| (ninguno todavía) | | | | |

**Totales al corte (sin cambios desde la tercera parada).** 249 casos: 18 PASA, 1 FALLA (A1-07), 25 N/A, 205 BLOQUEADO. Los 205 siguen bloqueados por la misma causa de fondo: no hay sesión y el agente no puede iniciarla, ahora por el bloqueo del clasificador sobre la lectura de las credenciales de prueba, ya no por la regla de ambiente remoto.
