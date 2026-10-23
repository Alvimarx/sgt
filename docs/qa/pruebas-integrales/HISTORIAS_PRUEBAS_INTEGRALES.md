# Pruebas integrales del SGT-HUAP basadas en reglas

**Historias de usuario y casos de prueba** · versión 1.0 · 20 de octubre de 2026 · diseño, sin ejecución

## 0. Cómo usar este documento

**Para qué.** Probar el SGT-HUAP desplegado contra las reglas que debe cumplir, no contra lo que hace hoy. Si el sistema hace algo distinto del resultado esperado, el caso es FALLA aunque «siempre haya funcionado así». El guion para ejecutar estos casos en orden está en `PLAN_EJECUCION.md`; los supuestos que tomé y las preguntas para resolverlos, en `SUPUESTOS_Y_PREGUNTAS.md`.

**De dónde salen las reglas (solo de aquí).**

- Inventario de los manuales de usuario y de administración: filas MF-001 a MF-033.
- Requerimientos R1 a R18: solo qué debe pasar y por qué, nunca cómo está hecho.
- Plan de corrección de planificación y solicitudes: solo las reglas que fija. Se cita «PLAN §n».
- Decisiones del dueño del sistema del 17 oct 2026: las líneas «Decisión» de la §5 de las historias de usuario, citadas «Dec. l.NNNN» (número de línea del archivo al 19 oct), y las que trae el encargo de este trabajo, citadas «Dec. encargo».

No se leyó el código, la documentación de la API ni los informes de estado, defectos, resultados o brechas.

**Alcance.** A, asignación manual de la jefatura de Urgencias · B, cobertura pedida por un médico · C, intercambio y, por extensión, botar turno, permiso, oferta particular y oferta general · D, alta del servicio Medicina desde la propia interfaz · E, permisos por rol, separación entre servicios y trazabilidad.

**Fuera de alcance.** Notificaciones: la bandeja no se entrega y está oculta, así que no hay casos sobre ella. Tampoco diseño visual, rendimiento, carga ni migraciones. Cuatro decisiones del 17 oct no dicen a qué regla se refieren y quedaron fuera (S-36).

**Convenciones.**

- Historia «HU-A1»; caso «A1-01». La letra es el flujo.
- Tipo: **Positivo** (lo permitido funciona), **Negativo** (lo prohibido se rechaza), **Borde** (el límite entre ambos, una carrera o una combinación rara).
- Prioridad: **P1** obligatorio · **P2** importante · **P3** si hay tiempo o una condición especial (hora real, concurrencia).
- Las personas van por alias de rol (sección 2). Nunca nombres ni RUT.
- **D** es el día de prueba; **D−1** el anterior y **D+1** el siguiente. **Día** es el turno de 08:00 a 20:00; **Noche D** es la que empieza a las 20:00 del día D y termina a las 08:00 de D+1.
- **Forzar (F):** repetir la acción con la sesión de quien no tiene permiso, aunque la interfaz no la ofrezca. Prueba que la regla vive en el servidor y no solo en la pantalla. La técnica está en el plan de ejecución.
- **Evidencia:** CAP captura de pantalla · TXT texto exacto del aviso · RED petición y respuesta (método, ruta, código y mensaje) · BIT fila de la bitácora · HIS historial del turno · CSV archivo exportado. Ninguna evidencia transcribe un RUT.
- Resultado al ejecutar: **OK**, **FALLA**, **BLOQUEADO** (no se pudo ejecutar) o **N/A** (no aplica, con la razón).
- «S-nn» remite a un supuesto. El resultado esperado vale mientras el dueño no diga otra cosa.

**Criterio común a todo rechazo.** Salvo que el caso diga otra cosa, un rechazo correcto cumple cuatro cosas: (1) los datos no cambian; (2) aparece un aviso que explica el motivo; (3) la sesión sigue abierta y la siguiente acción funciona sin volver a entrar; (4) no queda un evento de cambio en la bitácora.

## 1. Reglas de referencia

Cada caso cita estas reglas (RG). La columna «Fuente» dice de dónde sale cada una.

### 1.1 Acceso, roles y jerarquía

| ID | Regla | Fuente |
|---|---|---|
| RG-01 | Se entra con RUT y clave. Un error de clave suma al bloqueo de la cuenta, así que no se prueban claves erróneas. | MF-001; encargo |
| RG-02 | Con un solo servicio se entra directo al inicio; con dos o más se elige. El rol depende del servicio activo. | MF-002; R8 |
| RG-03 | Refrescar la página no expulsa ni cambia de vista. Una vista no permitida para el rol cae al inicio. | R5 |
| RG-04 | Ante una acción sin permiso, el sistema la niega (403) y avisa, sin cerrar la sesión. | Dec. l.1589; Dec. encargo |
| RG-05 | Los cambios de rol rigen desde el siguiente inicio de sesión. | Dec. encargo |
| RG-06 | El panel de administración y el personal del sistema son solo del administrador, y el administrador se reconoce igual en todas las vistas. | MF-018; MF-021; Dec. l.1571 |
| RG-07 | El administrador asocia funcionarios activos a servicios activos, y no puede asignarse a sí mismo. | MF-020 |
| RG-08 | La jefatura suma a su servicio, como médico, a quien no está en él. Si la persona ya pertenece, se avisa y su rol no cambia. Sumar a alguien a un servicio no toca sus roles en otros. | Dec. l.1756; Dec. l.1580; Dec. encargo |
| RG-09 | El administrador designa jefatura o subrogante en cualquier servicio. La jefatura solo designa subrogantes del suyo; designar jefatura se rechaza salvo al administrador. El sistema no limita cuántas jefaturas tiene un servicio. | MF-023; Dec. l.1466 |
| RG-10 | La subrogancia se quita solo con «Quitar subrogancia», que usan la jefatura del servicio o el administrador; la persona vuelve a médico. | Dec. l.1581; Dec. encargo |
| RG-11 | Una jefatura no cambia el rol de otra jefatura ni el suyo propio. | Dec. encargo |
| RG-12 | El subrogante decide solicitudes y ofertas, asigna turnos y gestiona puestos. No designa jerarquía ni suma personal. | Dec. l.1427; MF-023 |
| RG-13 | El subrogante no edita el nombre ni el estado de otros funcionarios. | Dec. encargo |
| RG-14 | Ningún médico aprueba ni rechaza solicitudes. | Dec. l.1418; MF-027 |
| RG-15 | Las reglas de horario las crea, edita y elimina solo el administrador; el desplazamiento máximo es de ±5 h. | Dec. l.1495; MF-029 |
| RG-16 | Tipos de turno, rotativas y planificación: solo el administrador (lectura de la decisión «solo el administrador», S-01). | Dec. l.1408; MF-024 a MF-026 |

### 1.2 Servicios y validaciones de turno

| ID | Regla | Fuente |
|---|---|---|
| RG-17 | Cada servicio ve solo sus datos: turnos, personal, solicitudes, ofertas, bitácora, estadística, auditoría y CSV. Ninguna solicitud cruza servicios. | Dec. encargo; R14 |
| RG-18 | El choque de horario y el descanso se evalúan con todos los turnos de la persona, en cualquier servicio. | PLAN §6 |
| RG-22 | El descanso post-nocturno rige también al asignar y reasignar a mano, sin excepción de emergencia. La generación no lo aplica (limitación conocida). | Dec. l.1436 |
| RG-23 | Descanso post-nocturno: un turno que cruza la medianoche y termina la mañana del día D es incompatible con un turno diurno de D (empieza y termina el mismo día), en cualquier orden, con cualquier duración y aunque queden horas de hueco. Día más su Noche (24 corridas) sí se permite; noches seguidas también. Se decide por las horas reales, no por el nombre del tipo. | R13 |
| RG-24 | Choque de horario: intervalos [inicio, fin). Tocarse en el borde no es choque. | PLAN §6 |
| RG-25 | No se puede pedir nada sobre un turno ya empezado; la cobertura es solo hacia el futuro. | Dec. encargo; R14 |
| RG-26 | La aprobación revalida con el calendario de ese momento: choque, descanso, dueño de cada turno y cupo libre. Si falla, no mueve nada y explica. | PLAN §6; R15; Dec. l.1504 |
| RG-27 | Un rechazo por choque o descanso dice qué turno choca, su fecha y hora y el motivo, sin mostrar datos que quien actúa no puede ver. | PLAN §6 |
| RG-50 | La hora de referencia es la del hospital (America/Santiago): define «hoy», qué turno ya empezó y la hora de la bitácora. | R16; R18; PLAN §1 |
| RG-59 | Los cambios de asignación piden confirmación, y una confirmación produce un solo cambio. | MF-022; R16; R17 |
| RG-60 | Las reglas valen igual en el teléfono y en el escritorio. | Dec. P-01 (l.1616); R18 |

### 1.3 Asignación manual

| ID | Regla | Fuente |
|---|---|---|
| RG-19 | Jefatura, subrogante o administrador asignan a un funcionario activo del servicio a un cupo libre. La confirmación nombra a la persona y el turno; la observación es opcional. | MF-022 |
| RG-20 | Editar una asignación: cambiar al funcionario por otro del servicio, con confirmación, o quitarlo y dejar el cupo vacante. | R17 |
| RG-21 | No se permite asignar, quitar ni reasignar a mano sobre un turno con solicitudes pendientes. | Dec. encargo |

### 1.4 Solicitudes

| ID | Regla | Fuente |
|---|---|---|
| RG-28 | Hay seis tipos: permiso, botar turno, cobertura, intercambio, oferta particular y oferta general. Todas nacen pendientes. | MF-007 a MF-012 |
| RG-29 | Nadie tiene dos solicitudes pendientes sobre el mismo turno: «Ud. ya solicitó este turno». Otra persona sí puede postular. Tras un rechazo o una cancelación se puede volver a pedir. | R12 |
| RG-30 | Un turno comprometido a la vez: si el turno pedido u ofrecido ya está en otra solicitud pendiente del mismo funcionario, se rechaza con un aviso que indica cancelarla. | R15 |
| RG-31 | Cancelar: solo el emisor y solo mientras está pendiente. Queda como cancelada, distinguible del rechazo, y en la bitácora. Una jefatura que emitió no resuelve su propia solicitud, pero sí la cancela. | R15 |
| RG-32 | Al aprobar, las demás solicitudes pendientes que piden u ofrecen el mismo turno (pedido o entregado) se rechazan solas, con motivo automático y registro. | R10; R15 |
| RG-33 | Aprueban o rechazan la jefatura, el subrogante o el administrador. | MF-027; Dec. l.1427 |
| RG-34 | El médico ve el historial solo de sus turnos, y ese historial no muestra solicitudes de otros. La gestión ve el historial de cualquier turno del servicio. | Dec. l.1456; Dec. encargo |
| RG-35 | Cobertura: solo de cupos libres, futuros y del servicio activo. Se pide desde el cupo o desde una solicitud nueva, con las mismas reglas. | MF-009; R4; Dec. l.1547; Dec. encargo |
| RG-36 | «Disponibles» muestra solo los cupos que el médico podría tomar: ni los del turno donde ya trabaja ni el Día que sigue a su Noche. | R9 |
| RG-37 | Las postulaciones al mismo cupo se agrupan para la jefatura, que elige a una persona. | R10 |
| RG-38 | Aprobar o asignar un cupo que ya tiene dueño falla con mensaje claro; nunca se reasigna en silencio. | R15 |
| RG-39 | Intercambio: el turno ofrecido es del emisor y el pedido es del receptor; los dos son futuros y del mismo servicio. | MF-010; Dec. encargo; R14 |
| RG-40 | El receptor responde una sola vez (acepta o rechaza), y la jefatura resuelve solo después de que acepta. | MF-027; Dec. encargo |
| RG-41 | La validación del intercambio simula el canje: cada uno sin el turno que entrega y con el que recibe. | R14; PLAN §6 |
| RG-42 | Al aprobar intercambios y ofertas particulares, el servidor revisa que cada turno siga siendo de quien lo entrega (S-12). | Dec. l.1504 |
| RG-43 | Botar: liberar un turno propio futuro; aprobado, queda cupo libre. | MF-008 |
| RG-44 | Permiso: fecha de inicio y de fin, motivo opcional. Aprobado, queda como registro y la jefatura libera a mano los turnos que correspondan. | MF-007; Dec. l.1539 |
| RG-45 | Oferta particular: ceder un turno propio a un funcionario determinado; se valida el calendario del receptor. | MF-011; PLAN §6 |
| RG-46 | Oferta general: el servicio la ve solo cuando está abierta y solo si el turno no ha pasado. La jefatura la abre y elige postulante, con validación. Quien la publica puede retirarla mientras nadie la haya tomado (S-11). | MF-012; Dec. l.1547; Dec. encargo; R17; PLAN §6 |
| RG-62 | El filtro «Solicitudes» del inicio muestra los turnos con solicitud pendiente del usuario, pedidos o entregados, y el cupo ya pedido se marca como tal. | R11; R12; R15 |

### 1.5 Trazabilidad

| ID | Regla | Fuente |
|---|---|---|
| RG-47 | Bitácora: historial cronológico de solicitudes y turnos, filtrable por categoría, tipo, estado y encargado, con detalle por evento. La ven el administrador, la jefatura y el subrogante. | MF-031 |
| RG-48 | Auditoría: por mes, turnos totales, asignados y vacantes, con el encargado de cada asignación. | MF-032 |
| RG-49 | CSV: datos vigentes al exportar, con origen o trazabilidad. El médico exporta solo sus turnos (S-14); la gestión elige «solo mis turnos» o «todo el servicio». | MF-013; MF-033; Dec. l.1476 |
| RG-58 | Estadística: cobertura por mes o semana, con detalle filtrable. | MF-030 |
| RG-61 | Cada bloque Día o Noche muestra la rotativa del equipo que lo cubre, y el turno propio dice «Tienes turno {tipo}: {rotativa}». | R2; R7 |

### 1.6 Configuración del servicio

| ID | Regla | Fuente |
|---|---|---|
| RG-51 | Servicios: agregar, editar e inhabilitar; inhabilitar conserva el historial. | MF-019 |
| RG-52 | Tipo de turno: nombre, hora de inicio y hora de fin. Crear uno con el nombre de uno eliminado lo reactiva. Eliminar uno usado en rotativas se permite con aviso (S-13). | MF-024; Dec. encargo; Dec. l.1513 |
| RG-53 | Rotativa: secuencia de semanas con tipos por día (pincel). Sobre 44 h en una semana avisa y no bloquea. | MF-025; Dec. l.1522 |
| RG-54 | Puestos: agregar, editar e inhabilitar. Uno con turnos se oculta de la gestión y conserva el histórico. | MF-028 |
| RG-55 | Planificación: molde (rotativa, puesto y funcionario) y generación con un ancla lunes, que fija la fase, más una vigencia con inicio y fin. La fase se cuenta desde el ancla. La vista previa es idéntica a la generación. Un conflicto de horario deja el turno vacante y no bloquea. Las reglas de fin de semana y feriado son opcionales. | MF-026; PLAN §2–4 |
| RG-56 | No hay dos vigencias activas superpuestas en el mismo servicio (extremos incluidos). | PLAN §2–4 |
| RG-57 | Extender agrega una vigencia contigua con la misma fase. Acortar no deja el fin antes de hoy y avisa de las solicitudes u ofertas afectadas. Editar desde una fecha no toca turnos anteriores y conserva la fase. | PLAN §5 |

## 2. Actores y datos de prueba

Las personas van por alias. El plan de ejecución dice cómo elegir a cada una y en qué fechas; aquí basta el papel que cumplen. Ningún alias puede recaer en el funcionario con id interno 4.

| Alias | Rol | Servicio | Para qué |
|---|---|---|---|
| ADM | Administrador | el suyo | Configurar Medicina, designar jefaturas, sumar personal, inactivar y reactivar, forzar carreras |
| JU | Jefatura | Urgencias | Asignación manual, resolver solicitudes, designar y quitar subrogante |
| SU | Subrogante (temporal) | Urgencias | Un médico de Urgencias al que JU designa en el flujo E y al que se le quita al final |
| MU1…MU6 | Médico | Urgencias | Médicos con turnos de diciembre en situaciones precisas (noche previa, día del mismo día, libres) |
| TB, TC | Médico titular | Urgencias | Titulares de turnos que se vacían por un rato para tener cupos libres y luego se restauran |
| MX | Médico | Urgencias | Se inactiva por un rato para probar que no se le puede asignar |
| JM | Jefatura | Medicina | Designada por ADM en el flujo D |
| JM2 | Jefatura | Medicina | Segunda jefatura, solo para probar que una jefatura no cambia el rol de otra |
| SM | Subrogante | Medicina | Designada por JM |
| MM-k.p | Médico | Medicina | Médico del equipo k (1 a 6) en el puesto p (1 a 7): 42 personas |
| MD | Médico | Urgencias y Medicina | Médico de Urgencias que se suma a Medicina fuera del molde, para probar choques entre servicios |

**Turnos y cupos con nombre.** V1 a V9 son cupos libres que el plan crea quitando por un rato al titular (TB, TC) de un turno de diciembre; X, Y, Z y W son turnos propios de los médicos en los flujos C y E. El plan registra quién era el titular de cada uno para restaurarlo.

## 3. Medicina: el patrón de referencia

### 3.1 Lo que se sabe

Viene de un pantallazo real del calendario de Medicina, sin nombres.

- Los turnos son de 24 horas, pero en la práctica son dos turnos de 12 horas pegados.
- Cada día lo cubre un solo equipo, de 7 médicos. Hay 6 equipos.
- Los equipos 5 y 6 son volantes: trabajan cada 6 días.
- Los equipos 1 a 4 son semifijos de lunes, martes, miércoles y jueves. Cuando un volante cae en su día, compensan en viernes, sábado o domingo. Ejemplo del dueño, para un semifijo: «lunes lunes lunes lunes domingo sábado viernes lunes lunes».
- El pantallazo trae además marcas de cambios reales (médicos intercambiados y reemplazos de un nombre por otro). Sirvieron de inspiración para los casos de C y E, no como datos.

Equipo de cada día (2026):

| Fecha | Equipo | Fecha | Equipo | Fecha | Equipo | Fecha | Equipo |
|---|---|---|---|---|---|---|---|
| mié 30 sep | 3 | jue 1 oct | 4 | vie 2 oct | 2 | sáb 3 oct | 1 |
| dom 4 oct | 6 | lun 5 oct | 5 | mar 6 oct | 2 | mié 7 oct | 3 |
| jue 8 oct | 4 | vie 9 oct | 1 | sáb 10 oct | 6 | dom 11 oct | 5 |
| lun 12 oct | 1 | mar 13 oct | 2 | mié 14 oct | 3 | jue 15 oct | 4 |
| vie 16 oct | 6 | sáb 17 oct | 5 | dom 18 oct | 4 | lun 19 oct | 1 |
| mar 20 oct | 2 | mié 21 oct | 3 | jue 22 oct | 6 | vie 23 oct | 5 |
| sáb 24 oct | 4 | dom 25 oct | 3 | lun 26 oct | 1 | mar 27 oct | 2 |

### 3.2 Cómo se representa el turno de 24 horas (supuesto S-02)

**Elegido: dos tipos de 12 horas, Día (08:00–20:00) y Noche (20:00–08:00), que el mismo equipo hace el mismo día.** Así lo justifican las reglas:

1. **R13 nombra este caso como legal.** «Día seguido de su noche (24 horas corridas)» está explícitamente permitido (RG-23). El turno de Medicina es exactamente eso.
2. **R13 clasifica por horas reales, y un tipo único de 24 horas lo esquiva.** Un tipo de 08:00 a 08:00 cruza la medianoche, así que la regla lo trata como nocturno, no como diurno. Con un tipo único, una Noche de Urgencias que termina a las 08:00 del día D seguida de un turno de 24 horas de Medicina que empieza a las 08:00 de D no viola el descanso (el turno de 24 h no es diurno) ni choca (se tocan en el borde, RG-24): el sistema aceptaría 36 horas seguidas. Con Día más Noche, el Día de D después de esa Noche se rechaza (RG-23, RG-18).
3. **Así se trabaja.** Al ser dos turnos de 12 horas, se puede intercambiar, cubrir o botar solo la Noche o solo el Día, con las mismas reglas de Urgencias, y el choque con otro servicio se detecta en cada mitad.
4. **Mismo horario que Urgencias.** Las validaciones de descanso y de «Disponibles» (R9) funcionan igual en los dos servicios.

**Costos de esta forma.** Son 14 turnos por día en vez de 7. El editor de rotativas tiene que aceptar dos tipos el mismo día (S-03). La semana en que a un equipo le tocan dos días suma 48 horas y dispara el aviso de 44 horas, que no bloquea (RG-53).

**El caso borde de la otra forma** (tipo único de 24 horas) está en D2-07 (cómo clasifica el sistema un tipo de 08:00 a 08:00) y en E5-08 (las 36 horas que la regla literal no bloquea). Pregunta abierta en S-31.

### 3.3 El ciclo de 42 días

Seis semanas: el mínimo común múltiplo de 6 (el ritmo de los volantes) y 7 (la semana). La primera fila empieza en el lunes ancla. Los lunes que abren un ciclo son el 28 sep 2026, el 9 nov 2026, el 21 dic 2026 y el 1 feb 2027. Las celdas entre el miércoles de S1 y el martes de S5 son las 28 fechas del dato; las 14 restantes se deducen con la regla de 3.5.

| Semana | Lunes | Martes | Miércoles | Jueves | Viernes | Sábado | Domingo |
|---|---|---|---|---|---|---|---|
| S1 | E6 | E5 | E3 | E4 | E2 | E1 | E6 |
| S2 | E5 | E2 | E3 | E4 | E1 | E6 | E5 |
| S3 | E1 | E2 | E3 | E4 | E6 | E5 | E4 |
| S4 | E1 | E2 | E3 | E6 | E5 | E4 | E3 |
| S5 | E1 | E2 | E6 | E5 | E4 | E3 | E2 |
| S6 | E1 | E6 | E5 | E4 | E3 | E2 | E1 |

Cada celda dice qué equipo hace ese día el Día y la Noche. Cada equipo aparece 7 veces: el ciclo está equilibrado.

### 3.4 El patrón de cada equipo (lo que se pinta en cada rotativa)

Cada día marcado lleva los dos tipos, Día y Noche. Las demás celdas de la rotativa quedan libres.

| Equipo | Tipo | S1 | S2 | S3 | S4 | S5 | S6 | Horas por semana | Días entre turnos |
|---|---|---|---|---|---|---|---|---|---|
| 1 | semifijo, lunes | Sá | Vi | Lu | Lu | Lu | Lu y Do | 24 · 24 · 24 · 24 · 24 · 48 | 6 · 3 · 7 · 7 · 7 · 6 · 6 |
| 2 | semifijo, martes | Vi | Ma | Ma | Ma | Ma y Do | Sá | 24 · 24 · 24 · 24 · 48 · 24 | 4 · 7 · 7 · 7 · 5 · 6 · 6 |
| 3 | semifijo, miércoles | Mi | Mi | Mi | Mi y Do | Sá | Vi | 24 · 24 · 24 · 48 · 24 · 24 | 7 · 7 · 7 · 4 · 6 · 6 · 5 |
| 4 | semifijo, jueves | Ju | Ju | Ju y Do | Sá | Vi | Ju | 24 · 24 · 48 · 24 · 24 · 24 | 7 · 7 · 3 · 6 · 6 · 6 · 7 |
| 5 | volante | Ma | Lu y Do | Sá | Vi | Ju | Mi | 24 · 48 · 24 · 24 · 24 · 24 | 6 · 6 · 6 · 6 · 6 · 6 · 6 |
| 6 | volante | Lu y Do | Sá | Vi | Ju | Mi | Ma | 48 · 24 · 24 · 24 · 24 · 24 | 6 · 6 · 6 · 6 · 6 · 6 · 6 |

Cada equipo trabaja 7 días por ciclo (168 horas, 28 en promedio por semana). Cada rotativa tiene exactamente una semana de 48 horas, que debe mostrar el aviso de 44 horas sin impedir guardar. Entre dos turnos del mismo equipo pasan de 3 a 7 días: nunca dos días seguidos, así que dentro de Medicina no hay 24 invertidos.

### 3.5 La regla de los fines de semana

El ciclo se lee en **bloques de 6 días que empiezan con el volante 6**. El primer día del bloque trabaja el equipo 6 y el segundo el equipo 5. Los cuatro días restantes son de los semifijos:

1. Cada semifijo trabaja en su día si ese día cae dentro de los cuatro restantes.
2. El semifijo cuyo día lo ocupa un volante, o queda fuera del bloque, compensa en el viernes, sábado o domingo libre del mismo bloque.
3. Si compensan varios en el mismo bloque, el que ya venía compensando mantiene su ritmo de 6 días y el recién desplazado toma el día que queda.

**Resultado.** Cada equipo trabaja exactamente una vez por bloque de 6 días, 7 veces por ciclo, y le toca exactamente **un viernes, un sábado y un domingo por ciclo**. Los semifijos tienen 4 días propios y 3 compensaciones. El ejemplo del dueño sale tal cual para el equipo 1: lunes 12, 19 y 26 oct y 2 nov, domingo 8 nov, sábado 14 nov, viernes 20 nov y de nuevo lunes 23 y 30 nov.

**Por qué esta y no otra.** Las 28 fechas, el ritmo de los volantes, los días propios de los semifijos y el ejemplo del dueño fijan todo el ciclo salvo cinco días de fin de semana: viernes 30 oct, sábado 31 oct, domingo 1 nov, viernes 6 nov y sábado 7 nov. Con 7 turnos por equipo quedan 30 repartos posibles. Solo 14 respetan el descanso de R13 (con Día más Noche, un equipo que trabaja dos días seguidos haría Noche y luego Día, un 24 invertido). De esos, uno solo da a cada equipo un viernes, un sábado y un domingo: este.

**Cómo comprobarlo con el calendario real** (S-04). Si la regla es la del servicio, el calendario real debe decir: miércoles 28 oct, equipo 6 · jueves 29 oct, 5 · viernes 30 oct, 4 · sábado 31 oct, 3 · domingo 1 nov, 2 · lunes 2 nov, 1 · martes 3 nov, 6 · miércoles 4 nov, 5 · jueves 5 nov, 4 · viernes 6 nov, 3 · sábado 7 nov, 2 · domingo 8 nov, 1.

### 3.6 Ventana de generación y tabla de verificación

**Ventana (S-06):** ancla y comienzo el lunes 21 dic 2026; fin el domingo 31 ene 2027. Son 42 días, un ciclo completo, que parte en un lunes que abre ciclo. Como 84 días son 12 semanas justas, **las 28 fechas del dato equivalen, día por día y con el mismo día de la semana, a las del 23 dic 2026 al 19 ene 2027**. La ventana no toca octubre. Los días 21 a 31 de diciembre se cruzan con los turnos ya generados de Urgencias (sirven para probar los choques entre servicios); enero está libre de Urgencias, así que ahí la verificación es limpia.

Totales esperados: 42 días × 14 turnos = **588 turnos** (154 entre el 21 y el 31 dic y 434 en enero); 98 por equipo; 14 por médico (7 Día y 7 Noche, 168 horas).

Equipo esperado en cada día de la ventana:

| Semana | Lunes | Martes | Miércoles | Jueves | Viernes | Sábado | Domingo |
|---|---|---|---|---|---|---|---|
| S1 | 21 dic · E6 | 22 dic · E5 | 23 dic · E3 | 24 dic · E4 | 25 dic · E2 | 26 dic · E1 | 27 dic · E6 |
| S2 | 28 dic · E5 | 29 dic · E2 | 30 dic · E3 | 31 dic · E4 | 1 ene · E1 | 2 ene · E6 | 3 ene · E5 |
| S3 | 4 ene · E1 | 5 ene · E2 | 6 ene · E3 | 7 ene · E4 | 8 ene · E6 | 9 ene · E5 | 10 ene · E4 |
| S4 | 11 ene · E1 | 12 ene · E2 | 13 ene · E3 | 14 ene · E6 | 15 ene · E5 | 16 ene · E4 | 17 ene · E3 |
| S5 | 18 ene · E1 | 19 ene · E2 | 20 ene · E6 | 21 ene · E5 | 22 ene · E4 | 23 ene · E3 | 24 ene · E2 |
| S6 | 25 ene · E1 | 26 ene · E6 | 27 ene · E5 | 28 ene · E4 | 29 ene · E3 | 30 ene · E2 | 31 ene · E1 |

Las 28 fechas del dato y su equivalente en la ventana:

| Dato | Equivalente | Equipo | Dato | Equivalente | Equipo |
|---|---|---|---|---|---|
| mié 30 sep | mié 23 dic | 3 | mié 14 oct | mié 6 ene 2027 | 3 |
| jue 1 oct | jue 24 dic | 4 | jue 15 oct | jue 7 ene 2027 | 4 |
| vie 2 oct | vie 25 dic | 2 | vie 16 oct | vie 8 ene 2027 | 6 |
| sáb 3 oct | sáb 26 dic | 1 | sáb 17 oct | sáb 9 ene 2027 | 5 |
| dom 4 oct | dom 27 dic | 6 | dom 18 oct | dom 10 ene 2027 | 4 |
| lun 5 oct | lun 28 dic | 5 | lun 19 oct | lun 11 ene 2027 | 1 |
| mar 6 oct | mar 29 dic | 2 | mar 20 oct | mar 12 ene 2027 | 2 |
| mié 7 oct | mié 30 dic | 3 | mié 21 oct | mié 13 ene 2027 | 3 |
| jue 8 oct | jue 31 dic | 4 | jue 22 oct | jue 14 ene 2027 | 6 |
| vie 9 oct | vie 1 ene 2027 | 1 | vie 23 oct | vie 15 ene 2027 | 5 |
| sáb 10 oct | sáb 2 ene 2027 | 6 | sáb 24 oct | sáb 16 ene 2027 | 4 |
| dom 11 oct | dom 3 ene 2027 | 5 | dom 25 oct | dom 17 ene 2027 | 3 |
| lun 12 oct | lun 4 ene 2027 | 1 | lun 26 oct | lun 18 ene 2027 | 1 |
| mar 13 oct | mar 5 ene 2027 | 2 | mar 27 oct | mar 19 ene 2027 | 2 |

Fechas de cada equipo dentro de la ventana:

| Equipo | Fechas en la ventana (Día y Noche) | Viernes | Sábado | Domingo |
|---|---|---|---|---|
| 1 | sáb 26 dic, vie 1 ene, lun 4 ene, lun 11 ene, lun 18 ene, lun 25 ene, dom 31 ene | 1 ene | 26 dic | 31 ene |
| 2 | vie 25 dic, mar 29 dic, mar 5 ene, mar 12 ene, mar 19 ene, dom 24 ene, sáb 30 ene | 25 dic | 30 ene | 24 ene |
| 3 | mié 23 dic, mié 30 dic, mié 6 ene, mié 13 ene, dom 17 ene, sáb 23 ene, vie 29 ene | 29 ene | 23 ene | 17 ene |
| 4 | jue 24 dic, jue 31 dic, jue 7 ene, dom 10 ene, sáb 16 ene, vie 22 ene, jue 28 ene | 22 ene | 16 ene | 10 ene |
| 5 | mar 22 dic, lun 28 dic, dom 3 ene, sáb 9 ene, vie 15 ene, jue 21 ene, mié 27 ene | 15 ene | 9 ene | 3 ene |
| 6 | lun 21 dic, dom 27 dic, sáb 2 ene, vie 8 ene, jue 14 ene, mié 20 ene, mar 26 ene | 8 ene | 2 ene | 27 dic |

## 4. Flujo A — Jefatura de Urgencias: asignación manual

### HU-A1 · Asignar un médico a un cupo libre

- **Rol:** jefatura de Urgencias (las mismas reglas valen para el subrogante y el administrador).
- **Historia:** Como jefatura de Urgencias, quiero asignar directamente a un médico de mi servicio a un cupo libre, para cubrir el turno sin esperar una solicitud.
- **Reglas de origen:** MF-022 · R13 · R16 · R17 · Dec. l.1436 · Dec. encargo (solicitudes pendientes, separación de servicios).
- **Criterios de aceptación:**
  1. Solo se puede elegir personal activo del propio servicio.
  2. Antes de aplicar, el sistema pide confirmación y nombra a la persona y el turno. La observación es opcional.
  3. Confirmado, el cupo pasa a la persona, deja de figurar como libre y queda en la bitácora con el encargado.
  4. Se rechaza, con un aviso que explica el motivo, si deja a la persona con choque de horario o con el descanso post-nocturno violado. No hay excepción de emergencia.
  5. Día más su Noche (24 corridas) y noches seguidas se permiten.
  6. No se asigna sobre un cupo con solicitudes pendientes.

#### A1-01 · Positivo · P1 · Asignar a un médico libre a un cupo de Día
- **Pre:** cupo libre V1 = Día D. MU3 no tiene turnos el día D ni Noche D−1.
- **Pasos:** 1) JU elige V1 y a MU3. 2) Confirma sin observación.
- **Esperado:** la confirmación nombra a MU3 y el turno (fecha, Día y puesto). V1 queda con MU3 y el día D muestra un cupo libre menos. MU3 ve el turno como suyo en su inicio y en su calendario. La bitácora registra la asignación con JU como encargado. · RG-19, RG-59, RG-47
- **Evidencia:** CAP de la confirmación; CAP del detalle del turno; CAP del inicio de MU3; BIT.

#### A1-02 · Positivo · P2 · La observación queda registrada
- **Pre:** un cupo libre y un médico que puede tomarlo.
- **Pasos:** 1) JU asigna escribiendo la observación «Prueba A1-02».
- **Esperado:** la observación se ve en el detalle de la asignación o en el evento de la bitácora. Asignar sin observación (A1-01) también funciona. · RG-19, RG-47
- **Evidencia:** BIT con la observación.

#### A1-03 · Positivo · P1 · La Noche del mismo día a quien tiene el Día (24 corridas)
- **Pre:** cupo libre V2 = Noche D. MU2 tiene el Día D y no tiene Día D+1.
- **Pasos:** 1) JU asigna a MU2 a V2 y confirma.
- **Esperado:** se permite: el Día más su Noche es legal y tocarse a las 20:00 no es choque. MU2 queda con el Día y la Noche de D. · RG-23, RG-24
- **Evidencia:** CAP del resultado; CAP del calendario de MU2 en D.

#### A1-04 · Positivo · P1 · Noches seguidas
- **Pre:** V2 libre (Noche D). MU1 tiene la Noche D−1 y no tiene Día D ni Día D+1.
- **Pasos:** 1) JU asigna a MU1 a V2.
- **Esperado:** se permite: entre las dos noches descansa el día. · RG-23
- **Evidencia:** CAP del resultado.

#### A1-05 · Negativo · P1 · Un Día saliendo de su Noche (24 invertido)
- **Pre:** V1 libre (Día D). MU1 tiene la Noche D−1, que termina a las 08:00 de D.
- **Pasos:** 1) JU intenta asignar a MU1 a V1 y confirma.
- **Esperado:** rechazo con un aviso que explica el descanso post-nocturno y nombra la Noche D−1 con fecha y hora. V1 sigue libre y no hay evento de asignación. · RG-22, RG-23, RG-27
- **Evidencia:** TXT del aviso; RED; CAP de V1 libre.

#### A1-06 · Negativo · P1 · Una Noche que desemboca en el Día que ya tiene
- **Pre:** cupo libre V3 = Noche D−1. MU2 tiene el Día D.
- **Pasos:** 1) JU intenta asignar a MU2 a V3.
- **Esperado:** rechazo por descanso post-nocturno: es el mismo 24 invertido visto desde el otro lado. V3 sigue libre. · RG-22, RG-23, RG-27
- **Evidencia:** TXT; RED.

#### A1-07 · Negativo · P1 · El mismo médico dos veces en el mismo turno
- **Pre:** V1 libre (Día D, un puesto). MU2 ya está en el Día D en otro puesto.
- **Pasos:** 1) JU intenta asignar a MU2 a V1.
- **Esperado:** rechazo por choque de horario; el aviso nombra el turno que ya tiene. · RG-24, RG-27
- **Evidencia:** TXT; RED.

#### A1-08 · Negativo · P1 · Cupo con una solicitud pendiente
- **Pre:** V1 libre, con una solicitud de cobertura pendiente de MU3.
- **Pasos:** 1) JU intenta asignar directamente a MU3, o a otro médico, a V1. 2) MU3 cancela su solicitud. 3) JU vuelve a intentarlo.
- **Esperado:** paso 1: rechazo con un aviso de que hay solicitudes pendientes sobre el turno; V1 sigue libre y la solicitud sigue pendiente. Paso 3: se permite (S-25). · RG-21
- **Evidencia:** TXT del paso 1; CAP de la solicitud aún pendiente; CAP del paso 3.

#### A1-09 · Negativo · P2 · Un turno ya empezado
- **Pre:** cupo libre de un turno que empezó y no ha terminado, en hora de Chile. Solo si ya existe: no se vacía un turno real en curso para crearlo.
- **Pasos:** 1) JU intenta asignar a un médico que podría tomarlo.
- **Esperado:** rechazo con aviso (S-09). · RG-25, RG-50
- **Evidencia:** TXT; RED; hora del reloj.

#### A1-10 · Negativo · P2 · Un turno ya terminado
- **Pre:** cupo libre de un turno ya terminado.
- **Pasos:** 1) JU intenta asignar a un médico.
- **Esperado:** rechazo con aviso (S-09). Si el sistema lo acepta, es FALLA: se revierte de inmediato y se anota en la bitácora de cambios del plan. · RG-25
- **Evidencia:** TXT; RED.

#### A1-11 · Negativo · P1 · Un médico de otro servicio
- **Pre:** existe un médico que solo pertenece a Medicina (flujo D).
- **Pasos:** 1) JU lo busca en la lista de personal para V1. 2) Forzar (F) su asignación a V1.
- **Esperado:** no aparece en la lista; el intento forzado se rechaza con aviso y V1 sigue libre. · RG-17, RG-19, RG-04
- **Evidencia:** CAP de la búsqueda sin resultado; RED.

#### A1-12 · Negativo · P2 · Un médico inactivo
- **Pre:** MX inactivo (ADM lo inactiva para este caso).
- **Pasos:** 1) JU busca a MX para V1. 2) Forzar (F) la asignación.
- **Esperado:** no aparece; forzada, se rechaza con aviso (S-17). · RG-19, RG-07
- **Evidencia:** CAP; RED.

#### A1-13 · Negativo · P1 · Un médico intenta asignar
- **Pre:** MU2 con su sesión de médico.
- **Pasos:** 1) MU2 abre V1: solo debe ofrecérsele pedirlo. 2) Forzar (F) la asignación de MU3 a V1.
- **Esperado:** paso 1: no hay acción de asignar. Paso 2: 403 con aviso; la sesión sigue y V1 no cambia. · RG-19, RG-04
- **Evidencia:** CAP; RED.

#### A1-14 · Positivo · P2 · El subrogante asigna
- **Pre:** SU designado (flujo E).
- **Pasos:** 1) SU asigna a un médico que puede tomarlo a un cupo libre.
- **Esperado:** se permite, con las mismas validaciones; la bitácora registra a SU como encargado. · RG-12, RG-19
- **Evidencia:** CAP; BIT.

#### A1-15 · Borde · P3 · Dos gestores asignan el mismo cupo a la vez
- **Pre:** V1 libre, abierto por JU y por ADM (o SU) en dos ventanas.
- **Pasos:** 1) JU elige a MU3 y ADM a otro médico que puede tomarlo. 2) Los dos confirman casi a la vez.
- **Esperado:** queda una sola asignación; el segundo recibe un aviso claro de que el cupo ya no está libre. Nunca se pisa en silencio. · RG-38, RG-59
- **Evidencia:** CAP de ambas ventanas; BIT con un solo evento.

#### A1-16 · Borde · P3 · Doble confirmación
- **Pre:** V1 libre.
- **Pasos:** 1) JU confirma la asignación dos veces seguidas (doble clic o reenvío).
- **Esperado:** una sola asignación y un solo evento. · RG-59
- **Evidencia:** BIT.

### HU-A2 · Sacar a un médico de un turno

- **Rol:** jefatura de Urgencias.
- **Historia:** Como jefatura, quiero quitar a un médico de su turno y dejar el cupo vacante, para reorganizar la cobertura cuando alguien no puede asistir.
- **Reglas de origen:** R17 · MF-031 · Dec. encargo (solicitudes pendientes).
- **Criterios de aceptación:**
  1. Se pide confirmación; el turno queda como cupo libre con su fecha, tipo y puesto.
  2. La persona deja de verlo como propio y el cupo queda disponible para pedirlo.
  3. La bitácora registra al encargado y a la persona retirada.
  4. No se permite si el turno tiene solicitudes pendientes, ni si ya empezó (S-09).
  5. Se actúa turno por turno: quitar la Noche no toca el Día del mismo día.

#### A2-01 · Positivo · P1 · Quitar a un médico de un turno futuro
- **Pre:** MU4 tiene el Día D, sin solicitudes pendientes.
- **Pasos:** 1) JU quita a MU4 del Día D y confirma.
- **Esperado:** el turno queda como cupo libre del mismo puesto; MU4 ya no lo ve como suyo; la bitácora registra el retiro con JU como encargado. · RG-20, RG-47, RG-59
- **Evidencia:** CAP antes y después; CAP del inicio de MU4; BIT.

#### A2-02 · Negativo · P1 · Un turno con solicitud pendiente
- **Pre:** MU4 tiene un turno con una solicitud pendiente (por ejemplo, pidió botarlo).
- **Pasos:** 1) JU intenta quitar a MU4 de ese turno.
- **Esperado:** rechazo con un aviso que menciona la solicitud pendiente; el turno sigue con MU4. · RG-21
- **Evidencia:** TXT; RED.

#### A2-03 · Negativo · P2 · Un turno ya empezado o terminado
- **Pre:** un turno asignado que ya empezó o terminó.
- **Pasos:** 1) JU intenta quitar al médico.
- **Esperado:** rechazo con aviso (S-09). Si el sistema lo permite, es FALLA y se restaura al médico de inmediato. · RG-25, RG-50
- **Evidencia:** TXT; RED.

#### A2-04 · Borde · P2 · Quitar solo la Noche de un 24 corrido
- **Pre:** MU2 tiene el Día D y la Noche D.
- **Pasos:** 1) JU quita a MU2 solo de la Noche D.
- **Esperado:** la Noche D queda libre y el Día D sigue con MU2. · RG-20
- **Evidencia:** CAP del calendario de MU2.

#### A2-05 · Positivo · P2 · El cupo liberado se puede pedir
- **Pre:** cupo recién liberado (A2-01). MU3 puede tomarlo.
- **Pasos:** 1) MU3 mira «Disponibles». 2) MU3 pide el cupo.
- **Esperado:** el cupo figura en sus «Disponibles» y la solicitud nace pendiente. · RG-35, RG-36
- **Evidencia:** CAP de «Disponibles»; CAP de la solicitud.

#### A2-06 · Negativo · P1 · Un médico intenta quitar a otro
- **Pasos:** 1) Forzar (F), con la sesión de MU2, el retiro de MU4 de su turno.
- **Esperado:** 403 con aviso; nada cambia y la sesión sigue. · RG-20, RG-04
- **Evidencia:** RED; CAP.

### HU-A3 · Cambiar un médico por otro

- **Rol:** jefatura de Urgencias.
- **Historia:** Como jefatura, quiero reemplazar al médico de un turno por otro de mi servicio en un solo paso, para no dejar el turno descubierto mientras lo reorganizo.
- **Reglas de origen:** R17 · R13 · Dec. l.1436 · Dec. encargo.
- **Criterios de aceptación:**
  1. La confirmación nombra a quien sale y a quien entra.
  2. El cambio es atómico: si quien entra no cumple, el turno sigue con quien estaba.
  3. Valen las mismas validaciones que al asignar: descanso sin excepción, choque, servicio y estado activo.
  4. La bitácora guarda el antes y el después.

#### A3-01 · Positivo · P1 · Reasignar a un médico válido
- **Pre:** V1 con MU3. MU4 sin turnos el día D y sin Noche D−1.
- **Pasos:** 1) JU cambia a MU3 por MU4 en V1 y confirma.
- **Esperado:** V1 queda con MU4 y MU3 deja de verlo; la bitácora registra MU3 → MU4 con JU como encargado. · RG-20, RG-47, RG-59
- **Evidencia:** CAP de la confirmación; CAP del detalle; BIT.

#### A3-02 · Negativo · P1 · Reasignar a quien sale de su Noche
- **Pre:** V1 con MU3. MU1 tiene la Noche D−1.
- **Pasos:** 1) JU intenta cambiar a MU3 por MU1.
- **Esperado:** rechazo por descanso post-nocturno; V1 sigue con MU3 y no hay evento de reasignación. · RG-22, RG-23, RG-27
- **Evidencia:** TXT; RED; CAP de V1 con MU3.

#### A3-03 · Negativo · P1 · Reasignar a quien ya está en ese turno
- **Pre:** V1 con MU3. MU2 está en el Día D en otro puesto.
- **Pasos:** 1) JU intenta cambiar a MU3 por MU2.
- **Esperado:** rechazo por choque; V1 sigue con MU3. · RG-24
- **Evidencia:** TXT; RED.

#### A3-04 · Borde · P2 · Reasignar a la misma persona
- **Pre:** V1 con MU3.
- **Pasos:** 1) JU elige como reemplazo a MU3.
- **Esperado:** el sistema no lo ofrece o avisa que ya está asignado; no queda evento en la bitácora (S-26). · RG-20
- **Evidencia:** CAP; BIT sin evento nuevo.

#### A3-05 · Negativo · P1 · Reasignar un turno con solicitud pendiente
- **Pre:** MU4 tiene V1 y una solicitud pendiente sobre él (botar).
- **Pasos:** 1) JU intenta cambiar a MU4 por MU3.
- **Esperado:** rechazo con un aviso de la solicitud pendiente. · RG-21
- **Evidencia:** TXT; RED.

#### A3-06 · Positivo · P1 · Pasar una Noche a quien tiene el Día del mismo día
- **Pre:** V2 (Noche D) con MU1. MU2 tiene el Día D y no tiene Día D+1.
- **Pasos:** 1) JU cambia a MU1 por MU2 en V2.
- **Esperado:** se permite (24 corridas); la bitácora registra MU1 → MU2. · RG-20, RG-23
- **Evidencia:** CAP; BIT.

#### A3-07 · Negativo · P2 · Reasignar a un médico de otro servicio o inactivo
- **Pasos:** 1) JU busca como reemplazo a un médico solo de Medicina y a MX inactivo. 2) Forzar (F) cada cambio.
- **Esperado:** no aparecen; forzados, se rechazan y el turno sigue con quien estaba. · RG-17, RG-19
- **Evidencia:** CAP; RED.

### HU-A4 · Qué queda registrado y quién lo ve

- **Rol:** jefatura, subrogante y administrador; el médico afectado.
- **Historia:** Como jefatura, quiero que cada asignación manual quede registrada con quién la hizo y qué cambió, para responder después por la cobertura. Como médico, quiero ver la historia de mis turnos sin ver lo de otros.
- **Reglas de origen:** MF-031 · MF-032 · MF-013 · MF-033 · R16 · R18 · Dec. l.1456 · Dec. encargo.
- **Criterios de aceptación:**
  1. Asignar, quitar y reasignar dejan un evento con tipo, turno (fecha, tipo, puesto), personas, encargado, fecha y hora de Chile, y la observación si la hubo.
  2. La bitácora la ven el administrador, la jefatura y el subrogante del servicio; no un médico ni otro servicio.
  3. El médico ve el historial de sus turnos, no el de los ajenos, y ahí no aparecen solicitudes de otros.
  4. La auditoría y el CSV reflejan al encargado y el origen.

#### A4-01 · Positivo · P1 · La bitácora registra las tres operaciones
- **Pre:** ejecutados A2-01, A1-01 y A3-01 sobre V1.
- **Pasos:** 1) JU abre la bitácora del período y busca los eventos de V1.
- **Esperado:** tres eventos en orden: retiro de MU4, asignación de MU3 y cambio de MU3 a MU4. Cada uno con JU como encargado, con la fecha y la hora de Chile (las del reloj en ese momento, sin 3 horas de diferencia) y con la observación cuando la hubo. · RG-47, RG-50
- **Evidencia:** BIT (captura y texto).

#### A4-02 · Positivo · P2 · Filtros de la bitácora
- **Pasos:** 1) JU filtra por categoría de turnos, por encargado JU y por tipo de evento.
- **Esperado:** cada filtro deja solo los eventos que corresponden, y los de A4-01 aparecen con los filtros pertinentes. · RG-47
- **Evidencia:** CAP por filtro.

#### A4-03 · Positivo · P1 · El médico ve el historial de su turno
- **Pre:** MU3 tiene V1 (entre A1-01 y A3-01).
- **Pasos:** 1) MU3 abre el historial de V1.
- **Esperado:** ve los eventos del turno: el retiro de MU4 y su propia asignación. · RG-34
- **Evidencia:** HIS.

#### A4-04 · Negativo · P1 · El médico no ve el historial de un turno ajeno
- **Pre:** V1 con MU3.
- **Pasos:** 1) MU1 abre V1: no debe ofrecérsele el historial. 2) Forzar (F) la consulta del historial de V1.
- **Esperado:** la interfaz no lo ofrece; forzado, 403 con aviso y la sesión sigue. · RG-34, RG-04
- **Evidencia:** CAP; RED.

#### A4-05 · Negativo · P1 · El médico no abre la bitácora del servicio
- **Pasos:** 1) MU1 busca la bitácora: no debe estar en su menú. 2) Forzar (F) la consulta.
- **Esperado:** sin acceso; forzado, 403 con aviso y la sesión sigue. · RG-47, RG-04
- **Evidencia:** CAP; RED.

#### A4-06 · Negativo · P1 · El historial no muestra solicitudes de otros
- **Pre:** V1 volvió a MU4 (A3-01). Antes, cuando era cupo libre, MU3 pidió cobertura y la canceló (A1-08).
- **Pasos:** 1) MU4 abre el historial de V1.
- **Esperado:** ve los eventos del turno, pero no la solicitud de cobertura de MU3 (S-15). · RG-34
- **Evidencia:** HIS.

#### A4-07 · Positivo · P2 · La auditoría muestra al encargado
- **Pasos:** 1) JU abre la auditoría de diciembre.
- **Esperado:** V1 figura asignado a MU4, con su encargado. Si la auditoría solo cubre turnos pasados, es N/A y se repite cuando diciembre haya pasado. · RG-48
- **Evidencia:** CAP.

#### A4-08 · Positivo · P2 · El CSV refleja lo vigente
- **Pasos:** 1) JU exporta diciembre con «todo el servicio».
- **Esperado:** V1 sale con MU4 y con su origen o trazabilidad (asignación manual distinta de turno generado); V2 y V3, con sus titulares restaurados. · RG-49
- **Evidencia:** CSV (sin transcribir RUT).

#### A4-09 · Negativo · P1 · Otro servicio no ve estos eventos
- **Pre:** existe Medicina con su jefatura JM (flujo D).
- **Pasos:** 1) JM abre la bitácora y la auditoría de su servicio y busca V1.
- **Esperado:** no aparece nada de Urgencias. · RG-17
- **Evidencia:** CAP.

## 5. Flujo B — El médico pide un turno y la jefatura resuelve

### HU-B1 · Pedir un cupo libre (cobertura)

- **Rol:** médico de Urgencias.
- **Historia:** Como médico, quiero pedir un cupo libre de mi servicio, para tomar un turno extra con la aprobación de la jefatura.
- **Reglas de origen:** MF-009 · R4 · R9 · R11 · R12 · R13 · Dec. l.1547 · Dec. encargo (turno empezado, cobertura solo hacia el futuro).
- **Criterios de aceptación:**
  1. Solo se piden cupos libres, futuros y del servicio activo.
  2. Se puede pedir tocando el cupo o con una solicitud nueva; las dos vías aplican las mismas reglas.
  3. Nace pendiente. El médico la ve en «Solicitudes» y el cupo queda marcado como ya pedido; la jefatura la ve en sus pendientes.
  4. No se duplica: «Ud. ya solicitó este turno».
  5. Se rechaza al crearla si deja choque o descanso violado.
  6. «Disponibles» lista solo lo que el médico podría tomar.

#### B1-01 · Positivo · P1 · Pedir un cupo libre válido
- **Pre:** V4 libre (Día D). MU2 sin turnos el día D y sin Noche D−1.
- **Pasos:** 1) MU2 pide V4 tocando el cupo libre.
- **Esperado:** nace una cobertura pendiente. En el inicio de MU2, «Solicitudes» la cuenta y el cupo dice que ya lo pidió. JU la ve en pendientes. · RG-35, RG-62
- **Evidencia:** CAP de la solicitud; CAP del filtro «Solicitudes»; CAP de los pendientes de JU.

#### B1-02 · Negativo · P1 · Pedir dos veces el mismo cupo
- **Pre:** B1-01 hecho.
- **Pasos:** 1) MU2 crea una solicitud nueva de cobertura y elige V4.
- **Esperado:** rechazo con «Ud. ya solicitó este turno»; no se crea una segunda. · RG-29
- **Evidencia:** TXT; CAP de la lista con una sola solicitud.

#### B1-03 · Negativo · P1 · Un Día saliendo de su Noche
- **Pre:** V4 libre. MU1 tiene la Noche D−1.
- **Pasos:** 1) MU1 mira «Disponibles». 2) MU1 pide V4 tocando el cupo.
- **Esperado:** V4 no figura en sus «Disponibles», y el pedido se rechaza con un aviso del descanso post-nocturno. · RG-23, RG-36, RG-27
- **Evidencia:** CAP; TXT; RED.

#### B1-04 · Positivo · P1 · La Noche del mismo día en que tiene el Día
- **Pre:** V5 libre (Noche D). MU2 tiene el Día D y no tiene Día D+1.
- **Pasos:** 1) MU2 mira «Disponibles». 2) MU2 pide V5.
- **Esperado:** V5 figura y la solicitud nace pendiente (24 corridas). · RG-23, RG-36
- **Evidencia:** CAP; CAP.

#### B1-05 · Positivo · P2 · Una Noche después de otra
- **Pre:** Noche D libre. Un médico con la Noche D−1 y sin Día D ni Día D+1.
- **Pasos:** 1) Pide la Noche D.
- **Esperado:** nace pendiente. · RG-23
- **Evidencia:** CAP.

#### B1-06 · Negativo · P2 · Un cupo del mismo turno donde ya trabaja
- **Pre:** un segundo cupo libre del Día D. MU2 ya tiene el Día D.
- **Pasos:** 1) MU2 mira «Disponibles». 2) Forzar (F) el pedido.
- **Esperado:** no figura; forzado, rechazo por choque. · RG-24, RG-36
- **Evidencia:** CAP; RED.

#### B1-07 · Negativo · P1 · Un turno ya empezado
- **Pre:** un cupo libre de un turno en curso, en hora de Chile. Solo si ya existe.
- **Pasos:** 1) Un médico que podría tomarlo lo pide.
- **Esperado:** no se ofrece o se rechaza con aviso. · RG-25, RG-50
- **Evidencia:** TXT; RED.

#### B1-08 · Borde · P2 · Un turno que empieza en menos de 3 horas
- **Pre:** un cupo libre, o en su defecto un turno propio para botar (C5), que empieza dentro de 1 a 3 horas, en hora de Chile.
- **Pasos:** 1) El médico lo pide. 2) Lo cancela de inmediato.
- **Esperado:** se permite, porque el turno aún no empieza en hora de Chile. Un rechazo aquí indica que el sistema calcula la hora en otro huso. Desde el 23 oct, una solicitud así que no se cancela y sigue pendiente cuando el turno empieza vence sola («Vencida»; ver B2-05). · RG-25, RG-50
- **Evidencia:** TXT; RED; hora del reloj.

#### B1-09 · Negativo · P2 · Un turno terminado
- **Pasos:** 1) MU2 abre una solicitud nueva de cobertura y revisa la lista de turnos. 2) Forzar (F) la cobertura de un cupo libre de un turno ya terminado.
- **Esperado:** la lista no ofrece turnos pasados; forzado, rechazo. · RG-25, RG-35
- **Evidencia:** CAP; RED.

#### B1-10 · Negativo · P2 · Cobertura de un turno que tiene dueño
- **Pasos:** 1) Forzar (F) una cobertura sobre un turno asignado a otro médico.
- **Esperado:** rechazo: la cobertura es solo de cupos libres. · RG-35
- **Evidencia:** RED.

#### B1-11 · Negativo · P2 · Un cupo de otro servicio
- **Pre:** Medicina tiene un cupo libre (flujo D).
- **Pasos:** 1) MU2, que solo es de Urgencias, lo busca. 2) Forzar (F) el pedido.
- **Esperado:** no lo ve; forzado, rechazo. · RG-17
- **Evidencia:** CAP; RED.

### HU-B2 · La jefatura aprueba una cobertura

- **Rol:** jefatura de Urgencias (también subrogante y administrador).
- **Historia:** Como jefatura, quiero aprobar una cobertura pedida, para que el cupo quede cubierto por quien lo pidió.
- **Reglas de origen:** MF-027 · R10 · R13 · R15 · Dec. l.1418 · Dec. l.1427 · PLAN §6.
- **Criterios de aceptación:**
  1. Aprueban la jefatura, el subrogante o el administrador; ningún médico.
  2. Al aprobar, el turno pasa al médico, deja de ser cupo libre y las demás pendientes sobre ese turno se rechazan solas.
  3. La aprobación revalida con el calendario de ese momento. Si falla, no mueve nada y explica.
  4. Quien emitió una solicitud no la resuelve.

#### B2-01 · Positivo · P1 · Aprobar
- **Pre:** cobertura pendiente de MU2 sobre un cupo libre, sin otras postulaciones.
- **Pasos:** 1) JU la aprueba.
- **Esperado:** el turno queda con MU2 y la solicitud, aprobada. MU2 lo ve como propio. La bitácora registra la aprobación con JU. · RG-33, RG-47
- **Evidencia:** CAP; BIT.

#### B2-02 · Positivo · P2 · El subrogante aprueba
- **Pre:** SU designado (flujo E) y una cobertura pendiente.
- **Pasos:** 1) SU la aprueba.
- **Esperado:** se permite; la bitácora registra a SU. · RG-12, RG-33
- **Evidencia:** CAP; BIT.

#### B2-03 · Negativo · P1 · Un médico intenta aprobar
- **Pre:** cobertura pendiente de MU2.
- **Pasos:** 1) MU3 abre la solicitud: no tiene aprobar ni rechazar. 2) Forzar (F) la aprobación.
- **Esperado:** 403 con aviso; la solicitud sigue pendiente y la sesión sigue. · RG-14, RG-04
- **Evidencia:** CAP; RED.

#### B2-04 · Negativo · P1 · La aprobación revalida el descanso
- **Pre:** MU3 pidió V5 (Noche D) cuando era válido. Después, JU le asignó a mano el Día D+1 (V6), lo que se permite porque la Noche D todavía no es suya.
- **Pasos:** 1) JU aprueba la cobertura de V5.
- **Esperado:** la aprobación falla con un aviso de descanso post-nocturno (Noche D seguida del Día D+1). V5 sigue libre, la solicitud sigue pendiente (S-34) y JU puede rechazarla. · RG-26, RG-23
- **Evidencia:** TXT; RED; CAP de V5 libre.

#### B2-05 · Negativo · P3 · La aprobación llega con el turno ya empezado
- **Pre:** una cobertura pendiente sobre un turno que empieza durante la ejecución.
- **Pasos:** 1) Pasada la hora de inicio, JU intenta aprobarla. 2) Recargar «Pendientes» y «Historial».
- **Esperado (cambió el 23 oct, S-10):** paso 1: rechazo 409 «Esta solicitud venció: el turno ya comenzó…»; el turno no cambia. Paso 2: la solicitud ya no figura en «Pendientes» y aparece en «Historial» como «Vencida» (RECHAZADA, «Venció: el turno ya comenzó»), sin botones. Si la tarea programada (cada 3 minutos) ya corrió, la vio cerrada antes de intentar. · RG-25, RG-26
- **Evidencia:** TXT; RED.

#### B2-06 · Borde · P3 · Dos gestores aprueban a la vez
- **Pre:** una cobertura pendiente, abierta por JU y por ADM.
- **Pasos:** 1) Los dos aprueban casi a la vez.
- **Esperado:** un solo cambio; el segundo recibe un aviso de que ya no está pendiente. · RG-26, RG-59
- **Evidencia:** CAP; BIT.

#### B2-07 · Negativo · P2 · La jefatura no resuelve su propia solicitud
- **Pre:** JU, como médico del servicio, pidió un cupo libre que puede tomar.
- **Pasos:** 1) JU intenta aprobarla. 2) JU la cancela.
- **Esperado:** paso 1: rechazo por segregación de funciones. Paso 2: se permite. · RG-31
- **Evidencia:** TXT; CAP.

### HU-B3 · La jefatura rechaza una cobertura

- **Rol:** jefatura de Urgencias.
- **Historia:** Como jefatura, quiero rechazar una cobertura, para mantener el cupo libre o cubrirlo de otra forma.
- **Reglas de origen:** MF-027 · R12.
- **Criterios de aceptación:**
  1. La solicitud queda rechazada y el cupo sigue libre.
  2. El médico ve el rechazo.
  3. El médico puede volver a pedir el mismo cupo.
  4. Lo ya resuelto no se vuelve a resolver.

#### B3-01 · Positivo · P1 · Rechazar
- **Pre:** cobertura pendiente de MU2 sobre V5.
- **Pasos:** 1) JU la rechaza.
- **Esperado:** la solicitud queda rechazada; V5 sigue libre; MU2 ve el rechazo; la bitácora lo registra. · RG-33, RG-47
- **Evidencia:** CAP; BIT.

#### B3-02 · Positivo · P1 · Volver a pedir tras el rechazo
- **Pre:** B3-01 hecho.
- **Pasos:** 1) MU2 pide V5 otra vez.
- **Esperado:** nace una solicitud nueva, pendiente. · RG-29
- **Evidencia:** CAP.

#### B3-03 · Negativo · P2 · Resolver una ya resuelta
- **Pre:** una solicitud aprobada y otra rechazada.
- **Pasos:** 1) JU intenta aprobar la rechazada y rechazar la aprobada; si la interfaz no lo ofrece, forzar (F).
- **Esperado:** no se puede; nada cambia. · RG-33
- **Evidencia:** CAP; RED.

### HU-B4 · El médico cancela su solicitud

- **Rol:** médico de Urgencias.
- **Historia:** Como médico, quiero cancelar una solicitud que ya no necesito, para liberar el turno y poder pedir otra cosa.
- **Reglas de origen:** R15 · R11.
- **Criterios de aceptación:**
  1. Cancela solo el emisor, y solo mientras está pendiente.
  2. Queda como cancelada, distinguible del rechazo de la jefatura, y la bitácora la registra como cancelada por el solicitante.
  3. El turno queda libre de compromiso.
  4. El filtro de estado rechazado de la bitácora la incluye.

#### B4-01 · Positivo · P1 · Cancelar
- **Pre:** cobertura pendiente de MU2 sobre V5.
- **Pasos:** 1) MU2 la cancela y confirma.
- **Esperado:** queda cancelada, con una marca distinta del rechazo; V5 sigue libre; «Solicitudes» del inicio ya no la cuenta; la bitácora dice «cancelada por el solicitante». · RG-31, RG-62
- **Evidencia:** CAP; BIT.

#### B4-02 · Positivo · P1 · Volver a pedir tras cancelar
- **Pre:** B4-01 hecho.
- **Pasos:** 1) MU2 pide V5 otra vez.
- **Esperado:** nace pendiente. · RG-29, RG-31
- **Evidencia:** CAP.

#### B4-03 · Negativo · P1 · Otro médico intenta cancelarla
- **Pre:** cobertura pendiente de MU2.
- **Pasos:** 1) Forzar (F) la cancelación con la sesión de MU3.
- **Esperado:** rechazo con aviso; sigue pendiente. · RG-31, RG-04
- **Evidencia:** RED.

#### B4-04 · Negativo · P2 · La jefatura intenta cancelarla
- **Pre:** cobertura pendiente de MU2.
- **Pasos:** 1) JU busca «cancelar» (no debe tenerlo: le corresponde rechazar). 2) Forzar (F) la cancelación.
- **Esperado:** rechazo: cancelar es del emisor. · RG-31
- **Evidencia:** CAP; RED.

#### B4-05 · Negativo · P2 · Cancelar una ya resuelta
- **Pre:** una cobertura de MU2 ya aprobada.
- **Pasos:** 1) MU2 intenta cancelarla; si la interfaz no lo ofrece, forzar (F).
- **Esperado:** no se puede; el turno sigue con MU2. · RG-31
- **Evidencia:** CAP; RED.

#### B4-06 · Borde · P3 · Cancelar y aprobar a la vez
- **Pre:** cobertura pendiente de MU2.
- **Pasos:** 1) MU2 cancela y JU aprueba casi al mismo tiempo.
- **Esperado:** el resultado es coherente: o queda aprobada y el turno es de MU2, o queda cancelada y el cupo libre. Nunca las dos cosas. · RG-31, RG-26
- **Evidencia:** CAP; BIT.

#### B4-07 · Positivo · P2 · La bitácora distingue cancelación, rechazo y rechazo automático
- **Pre:** existen solicitudes canceladas, rechazadas por la jefatura y rechazadas automáticamente (B5-01).
- **Pasos:** 1) JU filtra la bitácora por estado rechazado.
- **Esperado:** aparecen las tres, cada una con su motivo: cancelada por el solicitante, rechazo de la jefatura, rechazo automático porque otra solicitud del mismo turno fue aprobada. · RG-31, RG-32, RG-47
- **Evidencia:** BIT.

### HU-B5 · Varios piden el mismo cupo

- **Rol:** jefatura de Urgencias; médicos postulantes.
- **Historia:** Como jefatura, quiero ver juntas las postulaciones a un mismo cupo y elegir a una persona, para resolver de una vez y que el resto quede cerrado.
- **Reglas de origen:** R10 · R12 · R15 · Dec. encargo (asignación manual con pendientes).
- **Criterios de aceptación:**
  1. Dos o más pendientes sobre el mismo cupo se ven juntas, con el turno, el puesto y los postulantes por orden de llegada.
  2. Al elegir a uno, las demás se rechazan solas con motivo automático.
  3. Mientras haya pendientes, nadie asigna el cupo a mano.
  4. El rechazo automático es por turno: no toca otros turnos.

#### B5-01 · Positivo · P1 · Elegir entre dos postulantes
- **Pre:** MU2 y MU3 pidieron V4, en ese orden.
- **Pasos:** 1) JU abre sus pendientes. 2) Elige a MU2.
- **Esperado:** las dos postulaciones aparecen juntas, con el turno, el puesto y el orden de llegada. Al elegir, V4 queda con MU2 y la de MU3 se rechaza sola, con motivo automático y su evento en la bitácora. · RG-37, RG-32
- **Evidencia:** CAP de la agrupación; CAP del resultado; BIT del rechazo automático.

#### B5-02 · Negativo · P1 · Aprobar al otro después
- **Pre:** B5-01 hecho.
- **Pasos:** 1) JU intenta aprobar la solicitud de MU3; si la interfaz no lo ofrece, forzar (F).
- **Esperado:** no se puede: ya no está pendiente. V4 sigue con MU2. · RG-32, RG-38
- **Evidencia:** CAP; RED.

#### B5-03 · Negativo · P1 · Asignar a mano un cupo con postulaciones
- **Pre:** V4 con postulaciones pendientes.
- **Pasos:** 1) JU intenta asignar V4 a mano a un tercer médico.
- **Esperado:** rechazo con un aviso de que hay solicitudes pendientes. · RG-21
- **Evidencia:** TXT; RED.

#### B5-04 · Borde · P2 · El rechazo automático no toca otros turnos
- **Pre:** MU3 tiene, además, una cobertura pendiente sobre otro cupo.
- **Pasos:** 1) JU elige a MU2 para V4 (B5-01).
- **Esperado:** la otra solicitud de MU3 sigue pendiente. · RG-32
- **Evidencia:** CAP.

## 6. Flujo C — Intercambio, botar turno, permiso y ofertas

**Turnos de este flujo.** X es un Día de MU1 (día D1) e Y un Día de MU2 (día D2), con al menos dos días entre D1 y D2 y sin solicitudes al empezar. MU1 no tiene turnos el día D2 ni Noche D2−1; MU2 no tiene turnos el día D1 ni Noche D1−1. Así el canje de X por Y es válido de partida, y cada caso negativo construye su problema a propósito.

### HU-C1 · Proponer un intercambio

- **Rol:** médico de Urgencias (emisor).
- **Historia:** Como médico, quiero proponer a un colega cambiar un turno mío por uno suyo, para acomodar mi semana sin dejar el servicio descubierto.
- **Reglas de origen:** MF-010 · R13 · R14 · R15 · PLAN §6 · Dec. encargo (el turno pedido es del receptor; nada sobre turnos empezados).
- **Criterios de aceptación:**
  1. El emisor ofrece un turno propio futuro y pide uno futuro del receptor, del mismo servicio.
  2. El turno pedido tiene que ser del receptor.
  3. Se simula el canje: ninguno de los dos puede quedar con choque ni con el descanso violado.
  4. Ni el turno ofrecido ni el pedido pueden estar ya en otra solicitud pendiente del emisor.
  5. Nace pendiente, «esperando receptor», y los dos turnos quedan marcados como comprometidos para el emisor.

#### C1-01 · Positivo · P1 · Un intercambio válido
- **Pre:** X e Y como al inicio del flujo.
- **Pasos:** 1) MU1 propone a MU2 entregar X a cambio de Y.
- **Esperado:** nace pendiente, esperando al receptor. En el inicio de MU1, X e Y figuran en «Solicitudes». MU2 la ve como pendiente de su respuesta. JU la ve, pero sin poder aprobarla todavía. · RG-28, RG-39, RG-41, RG-62
- **Evidencia:** CAP de la solicitud; CAP del inicio de MU1; CAP de la vista de MU2; CAP de la vista de JU.

#### C1-02 · Negativo · P1 · El turno pedido no es del receptor
- **Pre:** Z es un turno futuro de MU3.
- **Pasos:** 1) MU1 arma un intercambio con MU2 y busca Z entre los turnos del receptor. 2) Forzar (F) la creación pidiendo Z con MU2 como receptor.
- **Esperado:** Z no figura en la lista; forzado, rechazo con un aviso de que el turno pedido no es del receptor. · RG-39
- **Evidencia:** CAP de la lista; RED.

#### C1-03 · Negativo · P1 · El turno ofrecido ya está comprometido
- **Pre:** MU1 tiene un «botar» pendiente sobre X.
- **Pasos:** 1) MU1 propone X por Y; si X no figura entre sus turnos, forzar (F).
- **Esperado:** rechazo con un aviso de que X ya está en una solicitud pendiente y de que la cancele para pedir otra cosa. · RG-30
- **Evidencia:** TXT; RED.

#### C1-04 · Negativo · P2 · El turno pedido ya está en otra solicitud del emisor
- **Pre:** MU1 tiene pendiente el intercambio X por Y con MU2, y tiene otro turno propio futuro X2.
- **Pasos:** 1) MU1 arma X2 por Y con MU2. 2) Si Y figura, intentar crearla; si no, forzar (F).
- **Esperado:** Y no figura entre los canjes posibles; forzada, rechazo con el aviso de cancelar. · RG-30
- **Evidencia:** CAP; RED.

#### C1-05 · Negativo · P1 · El canje deja al emisor con el descanso violado
- **Pre:** JU asignó a MU1 la Noche D2−1 (cupo V7).
- **Pasos:** 1) MU1 arma X por Y. 2) Si Y no figura, forzar (F).
- **Esperado:** Y no figura entre los canjes posibles; forzado, rechazo con un aviso de descanso post-nocturno de MU1 (recibiría el Día D2 al salir de su Noche). · RG-23, RG-27, RG-41
- **Evidencia:** CAP; TXT; RED.

#### C1-06 · Negativo · P1 · El canje deja al receptor con el descanso violado
- **Pre:** JU asignó a MU2 la Noche D1−1 (cupo V8).
- **Pasos:** 1) MU1 propone X por Y (forzar si la interfaz no lo deja).
- **Esperado:** rechazo: MU2 recibiría el Día D1 al salir de su Noche D1−1. · RG-23, RG-41
- **Evidencia:** TXT; RED.

#### C1-07 · Negativo · P1 · El canje deja al emisor con choque
- **Pre:** JU asignó a MU1 otro cupo del Día D2 (V9).
- **Pasos:** 1) MU1 arma X por Y (forzar si Y no figura).
- **Esperado:** Y no figura; forzado, rechazo por choque de horario. · RG-24, RG-41
- **Evidencia:** CAP; RED.

#### C1-08 · Borde · P2 · Cambiar el Día por la Noche del mismo día
- **Pre:** MU-A tiene el Día D4 y MU-B la Noche D4. MU-A no tiene Día D4+1; MU-B no tiene Noche D4−1.
- **Pasos:** 1) MU-A propone a MU-B su Día D4 a cambio de la Noche D4. 2) MU-A la cancela.
- **Esperado:** paso 1: se permite, porque la simulación saca a cada uno el turno que entrega y nadie queda con choque ni con el descanso violado. Paso 2: cancelada. · RG-41, RG-23
- **Evidencia:** CAP.

#### C1-09 · Negativo · P2 · Un turno ya empezado o terminado
- **Pre:** MU-A tiene un turno en curso o terminado y MU-B uno futuro, o al revés.
- **Pasos:** 1) Proponer el canje con el turno empezado como ofrecido. 2) Proponerlo con el turno empezado como pedido. Forzar (F) si no figura.
- **Esperado:** rechazo en los dos sentidos. Un intercambio pendiente que ya existía vence cuando cualquiera de sus dos turnos empieza (23 oct). · RG-25, RG-50
- **Evidencia:** CAP; RED.

#### C1-10 · Negativo · P2 · Un turno del receptor en otro servicio
- **Pre:** MD tiene turnos en Medicina (flujo D).
- **Pasos:** 1) MU1, que solo es de Urgencias, busca a MD como receptor y un turno de Medicina. 2) Forzar (F) el canje de X por ese turno.
- **Esperado:** no figura; forzado, rechazo. · RG-17, RG-39
- **Evidencia:** CAP; RED.

#### C1-11 · Negativo · P3 · Intercambio consigo mismo
- **Pasos:** 1) Forzar (F) un intercambio de MU1 con MU1 como receptor, pidiendo otro turno suyo.
- **Esperado:** rechazo (S-38). · RG-39
- **Evidencia:** RED.

#### C1-12 · Borde · P2 · El receptor tiene su propia solicitud sobre el turno pedido
- **Pre:** MU2 tiene pendiente su propio «botar» de Y.
- **Pasos:** 1) MU1 propone X por Y.
- **Esperado:** se permite crearla (S-21): la regla del turno comprometido es por funcionario. Cuando se apruebe una de las dos, la otra se rechaza sola (ver C3-05). · RG-30, RG-32
- **Evidencia:** CAP.

### HU-C2 · El receptor responde

- **Rol:** médico de Urgencias (receptor).
- **Historia:** Como receptor, quiero aceptar o rechazar el intercambio que me proponen, para que nadie disponga de mi turno sin mi acuerdo.
- **Reglas de origen:** MF-027 · R14 · PLAN §6 · Dec. encargo (el receptor responde una vez).
- **Criterios de aceptación:**
  1. Solo el receptor responde, y una sola vez.
  2. Aceptar revalida su calendario; rechazar cierra la solicitud sin mover nada.
  3. Nadie más responde por él: ni el emisor, ni un tercero, ni la jefatura.

#### C2-01 · Positivo · P1 · Aceptar
- **Pre:** C1-01 pendiente.
- **Pasos:** 1) MU2 acepta.
- **Esperado:** queda como «receptor aceptó» y pasa a la jefatura. Todavía no se mueve nada. · RG-40, RG-41
- **Evidencia:** CAP de MU2; CAP de la vista de JU.

#### C2-02 · Positivo · P1 · Rechazar
- **Pre:** un intercambio pendiente sin respuesta.
- **Pasos:** 1) MU2 lo rechaza. 2) MU1 crea otra solicitud con X.
- **Esperado:** queda rechazado por el receptor, nada se mueve y JU no tiene nada que resolver. Paso 2: se permite, porque X quedó libre de compromiso. · RG-40, RG-30
- **Evidencia:** CAP; BIT.

#### C2-03 · Negativo · P1 · Responder dos veces
- **Pre:** MU2 ya aceptó (o rechazó).
- **Pasos:** 1) MU2 intenta responder de nuevo, con lo contrario; si la interfaz no lo ofrece, forzar (F).
- **Esperado:** rechazo con un aviso de que ya respondió; el estado no cambia. · RG-40
- **Evidencia:** TXT; RED.

#### C2-04 · Negativo · P1 · Un tercero intenta responder
- **Pre:** un intercambio de MU1 a MU2, pendiente.
- **Pasos:** 1) Forzar (F) con la sesión de MU3 la aceptación y luego el rechazo.
- **Esperado:** 403 con aviso en los dos; nada cambia. · RG-40, RG-04
- **Evidencia:** RED.

#### C2-05 · Negativo · P2 · El emisor responde su propia solicitud
- **Pasos:** 1) Forzar (F) con la sesión de MU1 la aceptación de su propia propuesta.
- **Esperado:** rechazo. · RG-40
- **Evidencia:** RED.

#### C2-06 · Negativo · P2 · La jefatura responde por el receptor
- **Pasos:** 1) Forzar (F) con la sesión de JU la aceptación como receptor.
- **Esperado:** rechazo: la jefatura aprueba o rechaza, no responde por el receptor. · RG-40
- **Evidencia:** RED.

#### C2-07 · Negativo · P2 · Aceptar cuando su calendario ya no lo permite
- **Pre:** MU1 propuso X por Y. Después, JU asignó a MU2 la Noche D1−1 (V8).
- **Pasos:** 1) MU2 intenta aceptar.
- **Esperado:** la aceptación se rechaza con un aviso de descanso (S-35). La solicitud sigue pendiente y MU2 puede rechazarla. · RG-41, RG-23
- **Evidencia:** TXT; RED.

#### C2-08 · Negativo · P2 · Responder una solicitud cancelada
- **Pre:** MU1 canceló su propuesta.
- **Pasos:** 1) MU2 intenta aceptarla; si no se ofrece, forzar (F).
- **Esperado:** no se puede. · RG-31, RG-40
- **Evidencia:** CAP; RED.

### HU-C3 · La jefatura resuelve el intercambio

- **Rol:** jefatura de Urgencias.
- **Historia:** Como jefatura, quiero aprobar o rechazar un intercambio ya aceptado, para que el cambio quede firme o se descarte con el calendario al día.
- **Reglas de origen:** MF-027 · R15 · PLAN §6 · Dec. l.1418 · Dec. l.1504.
- **Criterios de aceptación:**
  1. Resuelve solo después de que el receptor acepta.
  2. Aprobar cruza los dos turnos de una vez. Antes, revalida choque, descanso y dueño de cada turno; si algo falla, no mueve nada.
  3. Al aprobar, se rechazan solas las otras pendientes que piden u ofrecen alguno de los dos turnos.
  4. Ningún médico aprueba.

#### C3-01 · Positivo · P1 · Aprobar tras la aceptación
- **Pre:** MU2 aceptó X por Y.
- **Pasos:** 1) JU aprueba.
- **Esperado:** X queda con MU2 e Y con MU1, y cada uno ve su nuevo turno. La solicitud queda aprobada. La bitácora registra la aprobación y el movimiento de los dos turnos. · RG-26, RG-33, RG-47
- **Evidencia:** CAP del inicio de MU1 y de MU2; BIT.

#### C3-02 · Positivo · P1 · Rechazar tras la aceptación
- **Pre:** MU2 aceptó.
- **Pasos:** 1) JU rechaza.
- **Esperado:** nada se mueve; queda rechazada por la jefatura y los dos turnos quedan libres de compromiso. · RG-33
- **Evidencia:** CAP; BIT.

#### C3-03 · Negativo · P1 · Aprobar antes de que el receptor acepte
- **Pre:** un intercambio pendiente sin respuesta.
- **Pasos:** 1) JU intenta aprobar; si no se ofrece, forzar (F).
- **Esperado:** no se puede hasta que el receptor acepte. · RG-40
- **Evidencia:** CAP; RED.

#### C3-04 · Negativo · P1 · La aprobación revalida el descanso
- **Pre:** MU2 aceptó X por Y. Después, JU asignó a MU1 la Noche D2−1 (V7).
- **Pasos:** 1) JU aprueba.
- **Esperado:** falla con un aviso de descanso de MU1, que recibiría el Día D2 al salir de su Noche. Nada se mueve y la solicitud sigue pendiente (S-34). · RG-26, RG-23
- **Evidencia:** TXT; RED; CAP de X e Y sin cambios.

#### C3-05 · Negativo · P1 · Uno de los turnos cambió de dueño
- **Pre:** C1-12: MU1 propuso X por Y y MU2 tiene pendiente su «botar» de Y.
- **Pasos:** 1) JU aprueba el «botar» de MU2: Y queda libre. 2) JU revisa el intercambio de MU1 y, si sigue pendiente, intenta aprobarlo.
- **Esperado:** el intercambio quedó rechazado automáticamente al aprobar el «botar», con motivo. Si siguiera pendiente, aprobarlo falla porque Y ya no es de MU2. En ningún caso Y pasa a MU1 ni X a MU2. · RG-26, RG-32, RG-38, RG-42
- **Evidencia:** CAP; BIT; RED si se intentó aprobar.

#### C3-06 · Positivo · P2 · Se rechazan solas las otras solicitudes sobre esos turnos
- **Pre:** MU4 propuso a MU2 otro intercambio que pide Y (W por Y), pendiente. MU2 aceptó el de MU1.
- **Pasos:** 1) JU aprueba el de MU1.
- **Esperado:** el de MU4 queda rechazado automáticamente, con motivo, porque Y fue entregado. · RG-32
- **Evidencia:** CAP; BIT.

#### C3-07 · Negativo · P1 · Un médico intenta aprobar
- **Pasos:** 1) Forzar (F) con la sesión de MU3 la aprobación de un intercambio aceptado.
- **Esperado:** 403 con aviso. · RG-14, RG-04
- **Evidencia:** RED.

### HU-C4 · El emisor cancela en cada etapa

- **Rol:** médico de Urgencias (emisor).
- **Historia:** Como emisor, quiero cancelar mi propuesta mientras no esté resuelta, para recuperar mi turno si cambian mis planes.
- **Reglas de origen:** R15.
- **Criterios de aceptación:**
  1. Se cancela antes de que el receptor responda y también después de que acepte, mientras la jefatura no resuelva.
  2. Cancelada, nadie más puede actuar sobre ella.
  3. Lo resuelto no se cancela.
  4. Solo cancela el emisor.

#### C4-01 · Positivo · P1 · Cancelar antes de la respuesta
- **Pre:** intercambio pendiente sin respuesta.
- **Pasos:** 1) MU1 lo cancela. 2) MU2 intenta responder.
- **Esperado:** queda cancelado, MU2 ya no puede responder y X e Y quedan libres de compromiso. · RG-31
- **Evidencia:** CAP; BIT.

#### C4-02 · Positivo · P1 · Cancelar después de la aceptación
- **Pre:** MU2 aceptó.
- **Pasos:** 1) MU1 cancela. 2) JU intenta aprobar.
- **Esperado:** queda cancelado y JU ya no puede aprobarlo. · RG-31
- **Evidencia:** CAP.

#### C4-03 · Negativo · P1 · Cancelar una ya resuelta
- **Pre:** un intercambio aprobado y otro rechazado.
- **Pasos:** 1) MU1 intenta cancelar cada uno; si no se ofrece, forzar (F).
- **Esperado:** no se puede. · RG-31
- **Evidencia:** CAP; RED.

#### C4-04 · Negativo · P2 · El receptor o un tercero intenta cancelar
- **Pre:** intercambio pendiente.
- **Pasos:** 1) Forzar (F) la cancelación con la sesión de MU2 y con la de MU3.
- **Esperado:** rechazo en los dos: solo el emisor cancela (el receptor puede rechazar). · RG-31
- **Evidencia:** RED.

#### C4-05 · Positivo · P2 · El turno queda libre de compromiso
- **Pre:** C4-01 hecho.
- **Pasos:** 1) MU1 propone otra vez X por Y.
- **Esperado:** se permite. · RG-30, RG-31
- **Evidencia:** CAP.

### HU-C5 · Botar un turno propio

- **Rol:** médico de Urgencias; jefatura.
- **Historia:** Como médico, quiero liberar un turno mío que no podré hacer, para que la jefatura lo deje disponible y otro pueda tomarlo.
- **Reglas de origen:** MF-008 · R15 · Dec. encargo.
- **Criterios de aceptación:**
  1. Se bota solo un turno propio y futuro.
  2. Mientras está pendiente, el turno sigue siendo del médico y no puede usarse en otra solicitud.
  3. Aprobado, queda cupo libre del mismo puesto; rechazado o cancelado, sigue siendo del médico.

#### C5-01 · Positivo · P1 · Pedir botar
- **Pre:** MU3 tiene un turno futuro W3, sin solicitudes.
- **Pasos:** 1) MU3 pide botar W3.
- **Esperado:** nace pendiente; W3 sigue siendo de MU3 hasta que se apruebe y figura en sus «Solicitudes». · RG-28, RG-43, RG-62
- **Evidencia:** CAP.

#### C5-02 · Positivo · P1 · Aprobado: queda cupo libre
- **Pre:** C5-01 pendiente.
- **Pasos:** 1) JU aprueba.
- **Esperado:** W3 queda como cupo libre del mismo puesto; MU3 ya no lo tiene; la bitácora lo registra. · RG-33, RG-43
- **Evidencia:** CAP; BIT.

#### C5-03 · Positivo · P1 · Rechazado: sigue siendo suyo
- **Pre:** un «botar» pendiente de MU3.
- **Pasos:** 1) JU lo rechaza.
- **Esperado:** W3 sigue con MU3. · RG-43
- **Evidencia:** CAP.

#### C5-04 · Positivo · P2 · Cancelar el botar
- **Pre:** un «botar» pendiente de MU3.
- **Pasos:** 1) MU3 lo cancela.
- **Esperado:** queda cancelado; W3 sigue suyo y libre de compromiso. · RG-31
- **Evidencia:** CAP.

#### C5-05 · Negativo · P1 · Usar en otra solicitud un turno que se está botando
- **Pre:** «botar» de W3 pendiente.
- **Pasos:** 1) MU3 intenta proponer un intercambio entregando W3. 2) MU3 intenta publicar una oferta general de W3.
- **Esperado:** rechazo en los dos, con el aviso de cancelar. · RG-30
- **Evidencia:** TXT; RED.

#### C5-06 · Negativo · P2 · Botar un turno ya empezado
- **Pre:** un médico con un turno en curso, en hora de Chile.
- **Pasos:** 1) Intenta botarlo; si no se ofrece, forzar (F).
- **Esperado:** no se ofrece; forzado, rechazo. · RG-25, RG-50
- **Evidencia:** CAP; RED.

#### C5-07 · Negativo · P2 · Botar un turno ajeno
- **Pasos:** 1) Forzar (F) con la sesión de MU3 el «botar» de un turno de MU1.
- **Esperado:** rechazo con aviso. · RG-43, RG-04
- **Evidencia:** RED.

#### C5-08 · Positivo · P2 · El cupo que dejó el botar lo toma otro
- **Pre:** C5-02 hecho (W3 libre).
- **Pasos:** 1) MU2 pide W3. 2) JU aprueba.
- **Esperado:** W3 queda con MU2. · RG-35, RG-43
- **Evidencia:** CAP; BIT.

### HU-C6 · Pedir un permiso

- **Rol:** médico de Urgencias; jefatura.
- **Historia:** Como médico, quiero pedir permiso para un rango de fechas, para dejar constancia de mi ausencia y que la jefatura reorganice mis turnos.
- **Reglas de origen:** MF-007 · R15 · Dec. l.1539.
- **Criterios de aceptación:**
  1. Lleva fecha de inicio y de fin; el motivo es opcional.
  2. Aprobado, queda como registro: no libera turnos por sí solo.
  3. La jefatura libera a mano los turnos que correspondan.
  4. Se rechaza o se cancela como cualquier solicitud.

#### C6-01 · Positivo · P1 · Pedir permiso sin motivo
- **Pre:** MU3 tiene un turno W4 dentro del rango P1–P2 de diciembre.
- **Pasos:** 1) MU3 pide permiso del P1 al P2, sin motivo.
- **Esperado:** nace pendiente; el motivo no es obligatorio. · RG-28, RG-44
- **Evidencia:** CAP.

#### C6-02 · Positivo · P1 · Aprobado: queda como registro
- **Pre:** C6-01 pendiente.
- **Pasos:** 1) JU aprueba.
- **Esperado:** queda aprobado y W4 sigue asignado a MU3. · RG-44
- **Evidencia:** CAP del permiso; CAP de W4 con MU3.

#### C6-03 · Positivo · P1 · La jefatura libera a mano los turnos del permiso
- **Pre:** C6-02 hecho.
- **Pasos:** 1) JU quita a MU3 de W4.
- **Esperado:** se permite (un permiso aprobado no es una solicitud pendiente sobre el turno); W4 queda libre y la bitácora lo registra. · RG-44, RG-20
- **Evidencia:** CAP; BIT.

#### C6-04 · Positivo · P2 · Rechazar un permiso
- **Pre:** un permiso pendiente de MU3.
- **Pasos:** 1) JU lo rechaza.
- **Esperado:** queda rechazado; nada cambia en los turnos. · RG-33, RG-44
- **Evidencia:** CAP.

#### C6-05 · Positivo · P2 · Cancelar un permiso
- **Pre:** un permiso pendiente de MU3.
- **Pasos:** 1) MU3 lo cancela.
- **Esperado:** queda cancelado. · RG-31
- **Evidencia:** CAP.

#### C6-06 · Negativo · P2 · Fecha de fin antes de la de inicio
- **Pasos:** 1) MU3 pide un permiso con el fin antes del inicio; si la interfaz no lo deja, forzar (F).
- **Esperado:** rechazo con aviso (S-24). · RG-44
- **Evidencia:** TXT; RED.

#### C6-07 · Negativo · P3 · Permiso en el pasado
- **Pasos:** 1) MU3 pide un permiso para fechas ya pasadas; si no se puede elegir, forzar (F).
- **Esperado:** rechazo con aviso (S-24). · RG-25, RG-44
- **Evidencia:** TXT; RED.

#### C6-08 · Positivo · P3 · Permiso con motivo
- **Pasos:** 1) MU3 pide un permiso con motivo «Prueba C6-08». 2) JU lo abre.
- **Esperado:** el motivo se ve en el detalle y en la bitácora. · RG-44, RG-47
- **Evidencia:** CAP; BIT.

### HU-C7 · Oferta particular

- **Rol:** médico de Urgencias (emisor y receptor); jefatura.
- **Historia:** Como médico, quiero ceder un turno mío a un colega determinado, para resolver un cambio sin ofrecerlo a todo el servicio.
- **Reglas de origen:** MF-011 · R15 · PLAN §6 · Dec. l.1504.
- **Criterios de aceptación:**
  1. Se ofrece un turno propio futuro a un médico del mismo servicio.
  2. Se valida el calendario del receptor: choque y descanso.
  3. El receptor responde una vez; la jefatura resuelve después de su aceptación (S-22).
  4. Mientras está pendiente, el turno no cambia de dueño por otra vía.

#### C7-01 · Positivo · P1 · Ofrecer un turno a un médico
- **Pre:** MU1 tiene X. MU2 puede recibirlo: no tiene turnos el día D1 ni Noche D1−1.
- **Pasos:** 1) MU1 ofrece X a MU2.
- **Esperado:** nace pendiente, esperando la respuesta de MU2. · RG-28, RG-45
- **Evidencia:** CAP.

#### C7-02 · Positivo · P1 · El receptor acepta y la jefatura aprueba
- **Pre:** C7-01 pendiente.
- **Pasos:** 1) MU2 acepta. 2) JU aprueba.
- **Esperado:** X queda con MU2; la bitácora lo registra. · RG-33, RG-40, RG-45
- **Evidencia:** CAP; BIT.

#### C7-03 · Positivo · P1 · El receptor rechaza
- **Pre:** una oferta particular pendiente.
- **Pasos:** 1) MU2 la rechaza.
- **Esperado:** nada se mueve; X sigue con MU1 y libre de compromiso. · RG-40
- **Evidencia:** CAP.

#### C7-04 · Negativo · P1 · El receptor quedaría con el descanso violado
- **Pre:** JU asignó a MU2 la Noche D1−1 (V8).
- **Pasos:** 1) MU1 ofrece X a MU2.
- **Esperado:** rechazo al crearla, con un aviso de descanso del receptor. · RG-23, RG-45
- **Evidencia:** TXT; RED.

#### C7-05 · Negativo · P2 · El receptor quedaría con choque
- **Pre:** MU2 tiene otro turno el Día D1.
- **Pasos:** 1) MU1 ofrece X a MU2.
- **Esperado:** rechazo por choque. · RG-24, RG-45
- **Evidencia:** TXT; RED.

#### C7-06 · Negativo · P1 · Un tercero intenta responder
- **Pasos:** 1) Forzar (F) con la sesión de MU3 la aceptación de la oferta hecha a MU2.
- **Esperado:** 403 con aviso. · RG-40, RG-04
- **Evidencia:** RED.

#### C7-07 · Negativo · P2 · Aprobar antes de que el receptor acepte
- **Pre:** oferta pendiente sin respuesta.
- **Pasos:** 1) JU intenta aprobar; si no se ofrece, forzar (F).
- **Esperado:** no se puede (S-22). · RG-40
- **Evidencia:** CAP; RED.

#### C7-08 · Negativo · P2 · El turno ofrecido no cambia de dueño mientras tanto
- **Pre:** oferta particular de X, pendiente.
- **Pasos:** 1) JU intenta reasignar X a mano. 2) MU1 intenta botar X.
- **Esperado:** los dos se rechazan. Si X llegara a cambiar de dueño, aprobar la oferta debe fallar (S-12). · RG-21, RG-30, RG-42
- **Evidencia:** TXT; RED.

#### C7-09 · Positivo · P2 · El emisor cancela
- **Pre:** oferta pendiente.
- **Pasos:** 1) MU1 la cancela.
- **Esperado:** queda cancelada; X sigue suyo. · RG-31
- **Evidencia:** CAP.

#### C7-10 · Negativo · P2 · Ofrecer a un médico de otro servicio
- **Pre:** existe un médico que solo es de Medicina (flujo D).
- **Pasos:** 1) MU1 lo busca como receptor. 2) Forzar (F) la oferta.
- **Esperado:** no figura; forzada, rechazo. · RG-17
- **Evidencia:** CAP; RED.

#### C7-11 · Negativo · P2 · Responder dos veces
- **Pre:** MU2 ya aceptó.
- **Pasos:** 1) MU2 intenta rechazar; si no se ofrece, forzar (F).
- **Esperado:** rechazo: ya respondió (S-22). · RG-40
- **Evidencia:** RED.

### HU-C8 · Oferta general

- **Rol:** médico de Urgencias (ofertor y postulantes); jefatura.
- **Historia:** Como médico, quiero ofrecer un turno mío a todo el servicio, para que lo tome quien pueda, con la jefatura eligiendo entre los interesados.
- **Reglas de origen:** MF-012 · R15 · R16 · R17 · PLAN §6 · Dec. l.1547 · Dec. encargo (retiro de la oferta).
- **Criterios de aceptación:**
  1. Publicada, queda por abrir; los médicos solo ven ofertas abiertas y de turnos que no han pasado.
  2. La jefatura abre o rechaza la apertura, y elige al postulante, con validación de choque y descanso.
  3. Quien la publica puede retirarla mientras nadie la haya tomado (S-11).
  4. Mientras está publicada, el turno no se usa en otra solicitud.

#### C8-01 · Positivo · P1 · Publicar: queda por abrir y nadie la ve aún
- **Pre:** MU1 tiene X, sin solicitudes.
- **Pasos:** 1) MU1 publica una oferta general de X. 2) MU2 revisa las ofertas disponibles.
- **Esperado:** queda por abrir; MU2 todavía no la ve. · RG-28, RG-46
- **Evidencia:** CAP de MU1; CAP de MU2.

#### C8-02 · Positivo · P1 · La jefatura la abre y el servicio la ve
- **Pre:** C8-01 hecho.
- **Pasos:** 1) JU abre la oferta. 2) MU2 revisa las ofertas.
- **Esperado:** MU2 la ve. · RG-46
- **Evidencia:** CAP.

#### C8-03 · Positivo · P1 · Dos médicos postulan
- **Pre:** oferta abierta. MU2 y MU3 pueden tomar X.
- **Pasos:** 1) MU2 postula. 2) MU3 postula.
- **Esperado:** las dos postulaciones quedan registradas y JU las ve. · RG-46
- **Evidencia:** CAP.

#### C8-04 · Positivo · P1 · La jefatura elige a un postulante
- **Pre:** C8-03 hecho.
- **Pasos:** 1) JU elige a MU2 y confirma.
- **Esperado:** X queda con MU2; la postulación de MU3 se cierra como rechazada (S-23); la bitácora lo registra. · RG-32, RG-46
- **Evidencia:** CAP; BIT.

#### C8-05 · Negativo · P1 · Elegir a un postulante con el descanso violado
- **Pre:** MU3 postuló; después, JU le asignó la Noche D1−1 (V8).
- **Pasos:** 1) JU intenta elegir a MU3.
- **Esperado:** rechazo con un aviso de descanso; X sigue con MU1. · RG-23, RG-26, RG-46
- **Evidencia:** TXT; RED.

#### C8-06 · Positivo · P1 · Retirar antes de que se abra
- **Pre:** oferta publicada y sin abrir.
- **Pasos:** 1) MU1 la retira.
- **Esperado:** queda retirada; X sigue suyo y libre de compromiso. · RG-46
- **Evidencia:** CAP.

#### C8-07 · Borde · P1 · Retirar una oferta abierta sin postulantes
- **Pre:** oferta abierta, sin postulantes.
- **Pasos:** 1) MU1 la retira.
- **Esperado:** se permite, porque nadie la ha tomado (S-11). · RG-46
- **Evidencia:** CAP.

#### C8-08 · Borde · P2 · Retirar con postulantes y sin elegido
- **Pre:** oferta abierta con postulantes y sin elegido.
- **Pasos:** 1) MU1 intenta retirarla.
- **Esperado:** no se permite, porque alguien ya la tomó al postular; el aviso lo explica (S-11). · RG-46
- **Evidencia:** TXT; CAP.

#### C8-09 · Negativo · P1 · Retirar después de la elección
- **Pre:** JU ya eligió postulante.
- **Pasos:** 1) MU1 intenta retirarla; si no se ofrece, forzar (F).
- **Esperado:** no se puede. · RG-46
- **Evidencia:** CAP; RED.

#### C8-10 · Negativo · P2 · Ofertas de turnos empezados o pasados
- **Pasos:** 1) MU1 intenta ofertar un turno en curso o terminado (forzar si no se ofrece). 2) Revisar las ofertas disponibles.
- **Esperado:** paso 1: rechazo. Paso 2: ninguna oferta de un turno ya pasado aparece. Desde el 23 oct, una oferta pendiente o abierta cuyo turno empieza vence sola (RECHAZADA, «Venció: el turno ya comenzó»; evento de sistema en la bitácora) y abrirla, rechazarla, retirarla, postular o elegir responde 409. · RG-25, RG-46
- **Evidencia:** RED; CAP.

#### C8-11 · Negativo · P2 · Postular a la propia oferta
- **Pasos:** 1) MU1 intenta postular a su oferta abierta; si no se ofrece, forzar (F).
- **Esperado:** rechazo (S-23). · RG-46
- **Evidencia:** RED.

#### C8-12 · Negativo · P2 · Postular dos veces
- **Pre:** MU2 ya postuló.
- **Pasos:** 1) MU2 intenta postular otra vez.
- **Esperado:** aviso de que ya postuló; no se duplica (S-23). · RG-29, RG-46
- **Evidencia:** TXT.

#### C8-13 · Negativo · P2 · La jefatura rechaza la apertura
- **Pasos:** 1) MU1 publica. 2) JU rechaza la apertura. 3) MU2 revisa las ofertas.
- **Esperado:** la oferta no se publica, MU2 no la ve y X sigue con MU1. · RG-46
- **Evidencia:** CAP.

#### C8-14 · Negativo · P2 · Un médico de otro servicio no la ve
- **Pre:** oferta abierta en Urgencias; existe un médico que solo es de Medicina (MM).
- **Pasos:** 1) MM revisa las ofertas disponibles.
- **Esperado:** no la ve. · RG-17
- **Evidencia:** CAP.

#### C8-15 · Negativo · P2 · Usar en otra solicitud un turno ofertado
- **Pre:** oferta general de X abierta.
- **Pasos:** 1) MU1 intenta botar X. 2) MU1 intenta proponer un intercambio entregando X.
- **Esperado:** rechazo en los dos, con el aviso de cancelar (S-25). · RG-30
- **Evidencia:** TXT; RED.

## 7. Flujo D — El administrador crea el servicio Medicina desde el sistema

Todo se hace desde la interfaz, como lo haría un administrador: sin scripts ni SQL. El patrón que debe salir está en la sección 3, y los nombres que se usan («Medicina», «Día», «Noche», «Medicina 1» a «Medicina 7», «Equipo 1» a «Equipo 6») son un supuesto (S-08).

### HU-D1 · Crear el servicio

- **Rol:** administrador.
- **Historia:** Como administrador, quiero crear el servicio Medicina, para configurarlo y que opere con sus propios turnos y personal.
- **Reglas de origen:** MF-018 · MF-019.
- **Criterios de aceptación:**
  1. Solo el administrador crea servicios.
  2. El servicio nace activo y queda disponible para asociar personal y configurarlo.
  3. No se repite el nombre de un servicio existente (S-16).

#### D1-01 · Positivo · P1 · Crear Medicina
- **Pre:** no existe un servicio «Medicina».
- **Pasos:** 1) ADM crea el servicio «Medicina».
- **Esperado:** aparece activo en la lista de servicios y queda disponible para asociar personal. · RG-06, RG-51
- **Evidencia:** CAP.

#### D1-02 · Negativo · P2 · Un nombre repetido
- **Pasos:** 1) ADM intenta crear otro servicio llamado «Urgencias».
- **Esperado:** rechazo con aviso (S-16). · RG-51
- **Evidencia:** TXT.

#### D1-03 · Negativo · P1 · La jefatura intenta crear un servicio
- **Pasos:** 1) JU busca la gestión de servicios: no debe tenerla. 2) Forzar (F) la creación de un servicio.
- **Esperado:** sin acceso; forzado, 403 con aviso. · RG-06, RG-04
- **Evidencia:** CAP; RED.

### HU-D2 · Tipos de turno de Medicina

- **Rol:** administrador.
- **Historia:** Como administrador, quiero definir los tipos de turno de Medicina, para armar sus rotativas con los horarios reales.
- **Reglas de origen:** MF-024 · R13 · Dec. encargo (reactivación por nombre) · Dec. l.1408 · Dec. l.1513.
- **Criterios de aceptación:**
  1. Cada tipo tiene nombre, hora de inicio y hora de fin; el sistema calcula la duración y si cruza la medianoche.
  2. Los tipos son de cada servicio: el mismo nombre puede existir en otro servicio.
  3. Crear un tipo con el nombre de uno eliminado lo reactiva.
  4. Eliminar un tipo usado en rotativas se permite con aviso que las nombra (S-13).
  5. Solo el administrador los gestiona (S-01).

#### D2-01 · Positivo · P1 · Crear el Día
- **Pre:** Medicina sin tipos. ADM trabaja sobre Medicina (S-29).
- **Pasos:** 1) ADM crea en Medicina el tipo «Día», de 08:00 a 20:00.
- **Esperado:** queda con 12 horas, sin cruzar la medianoche, y solo en Medicina. · RG-52
- **Evidencia:** CAP.

#### D2-02 · Positivo · P1 · Crear la Noche
- **Pasos:** 1) ADM crea en Medicina el tipo «Noche», de 20:00 a 08:00.
- **Esperado:** queda con 12 horas y marcado como que cruza la medianoche. · RG-52, RG-23
- **Evidencia:** CAP.

#### D2-03 · Positivo · P1 · Los mismos nombres que en Urgencias
- **Pasos:** 1) ADM revisa los tipos de Medicina. 2) JU revisa los de Urgencias.
- **Esperado:** cada servicio ve solo sus tipos; los nombres repetidos entre servicios no chocan. · RG-17, RG-52
- **Evidencia:** CAP de cada lista.

#### D2-04 · Negativo · P2 · Repetir un nombre activo en Medicina
- **Pasos:** 1) ADM intenta crear otro «Día» en Medicina.
- **Esperado:** rechazo con aviso (S-16). · RG-52
- **Evidencia:** TXT.

#### D2-05 · Borde · P1 · Reactivar un tipo eliminado creando su nombre
- **Pre:** D2-06 hecho: el tipo «Prueba» (09:00–13:00) quedó eliminado.
- **Pasos:** 1) ADM crea «Prueba», de 09:00 a 13:00, otra vez.
- **Esperado:** se reactiva el eliminado: la lista muestra un solo «Prueba», activo, y no dos registros. Qué pasa si se dan otras horas se pregunta en S-18. · RG-52
- **Evidencia:** CAP de la lista antes y después.

#### D2-06 · Borde · P2 · Eliminar un tipo usado en una rotativa
- **Pre:** el tipo «Prueba» (09:00–13:00) está pintado en «Rotativa prueba» (D4-04).
- **Pasos:** 1) ADM elimina «Prueba».
- **Esperado:** se permite con un aviso que nombra a «Rotativa prueba» como afectada (S-13); confirmado, el tipo deja de estar activo. · RG-52
- **Evidencia:** TXT del aviso; CAP.

#### D2-07 · Borde · P2 · Un tipo de 24 horas (la otra representación)
- **Pasos:** 1) ADM crea «24 h prueba», de 08:00 a 08:00. 2) Revisa su duración y si cruza la medianoche.
- **Esperado:** o lo guarda como 24 horas que cruzan la medianoche, o lo rechaza con un aviso claro. Nunca lo guarda como 0 horas ni sin duración. Si lo guarda, se conserva para E5-08 y se elimina en la limpieza (S-31). · RG-52, RG-23
- **Evidencia:** CAP; TXT.

#### D2-08 · Negativo · P2 · La jefatura intenta crear un tipo
- **Pasos:** 1) JU y luego JM buscan la gestión de tipos de turno. 2) Forzar (F) la creación.
- **Esperado:** sin acceso; forzado, 403 con aviso (S-01). · RG-16, RG-04
- **Evidencia:** CAP; RED.

### HU-D3 · Puestos de Medicina

- **Rol:** administrador; subrogante de Medicina.
- **Historia:** Como administrador, quiero crear los siete puestos de Medicina, para que cada médico del equipo de turno ocupe el suyo.
- **Reglas de origen:** MF-028 · Dec. l.1427.
- **Criterios de aceptación:**
  1. Los puestos son del servicio y nadie más los ve.
  2. El subrogante también los gestiona; un médico no.
  3. Inhabilitar un puesto con turnos lo saca de la gestión y conserva el histórico.

#### D3-01 · Positivo · P1 · Crear los siete puestos
- **Pasos:** 1) ADM crea los puestos «Medicina 1» a «Medicina 7».
- **Esperado:** 7 puestos activos en Medicina, que Urgencias no ve. · RG-17, RG-54
- **Evidencia:** CAP.

#### D3-02 · Negativo · P2 · Repetir el nombre de un puesto
- **Pasos:** 1) ADM intenta crear otro «Medicina 1».
- **Esperado:** rechazo con aviso (S-16). · RG-54
- **Evidencia:** TXT.

#### D3-03 · Positivo · P2 · El subrogante gestiona puestos
- **Pre:** SM designado (D5-05).
- **Pasos:** 1) SM crea «Puesto prueba SM». 2) Lo renombra. 3) Lo inhabilita.
- **Esperado:** se permite todo. · RG-12, RG-54
- **Evidencia:** CAP.

#### D3-04 · Borde · P3 · Inhabilitar un puesto con turnos
- **Pre:** «Puesto prueba» tiene al menos un turno generado (mini-molde del plan, escenario ED, paso opcional).
- **Pasos:** 1) ADM inhabilita «Puesto prueba». 2) Revisa la gestión de puestos, el calendario y la bitácora.
- **Esperado:** el puesto ya no aparece en la gestión, pero su turno y su historia se siguen viendo. · RG-54
- **Evidencia:** CAP.

#### D3-05 · Negativo · P2 · Un médico intenta crear un puesto
- **Pasos:** 1) Forzar (F) con la sesión de MM-1.1 la creación de un puesto.
- **Esperado:** 403 con aviso. · RG-54, RG-04
- **Evidencia:** RED.

### HU-D4 · Las seis rotativas en el editor

- **Rol:** administrador.
- **Historia:** Como administrador, quiero dibujar en el editor las seis rotativas de 6 semanas de Medicina, para que la generación reproduzca el calendario real de los equipos.
- **Reglas de origen:** MF-025 · Dec. l.1522 · Dec. l.1408.
- **Criterios de aceptación:**
  1. Cada rotativa tiene 6 semanas y, en los días del equipo, el Día y la Noche.
  2. El editor muestra las horas por semana y por ciclo.
  3. Sobre 44 horas en una semana avisa, pero deja guardar.
  4. Al volver a abrirla, la secuencia es la misma que se guardó.

#### D4-01 · Positivo · P1 · Crear las seis rotativas del patrón
- **Pre:** tipos Día y Noche en Medicina.
- **Pasos:** 1) ADM crea las rotativas «Equipo 1» a «Equipo 6», de 6 semanas. 2) En cada una pinta Día y Noche en los días de la tabla 3.4 y deja libres los demás. 3) Guarda y vuelve a abrir cada una.
- **Esperado:** las seis quedan guardadas con 7 días de equipo (14 turnos por ciclo), y la secuencia coincide celda por celda con la tabla 3.4. · RG-53, RG-55
- **Evidencia:** CAP de cada rotativa guardada.

#### D4-02 · Borde · P1 · Dos tipos el mismo día
- **Pasos:** 1) En un día de la rotativa, pintar Día y después Noche.
- **Esperado:** el día queda con los dos tipos (S-03). Si el editor admite solo uno, es BLOQUEADO: se anota y se sigue el plan alternativo. · RG-53
- **Evidencia:** CAP.

#### D4-03 · Borde · P1 · Aviso de 44 horas sin bloqueo
- **Pasos:** 1) Revisar la semana de 48 horas de cada rotativa. 2) Guardar.
- **Esperado:** esa semana muestra el aviso de más de 44 horas y guardar se permite. · RG-53
- **Evidencia:** CAP del aviso.

#### D4-04 · Borde · P2 · Una semana de 60 horas
- **Pasos:** 1) ADM crea «Rotativa prueba», de 1 semana, con Día de lunes a viernes (60 h) y el tipo «Prueba» el sábado. 2) Guarda.
- **Esperado:** aviso de más de 44 horas y se guarda. Se usa en D2-06 y se elimina en la limpieza. · RG-53
- **Evidencia:** CAP.

#### D4-05 · Positivo · P2 · Horas por semana y por ciclo
- **Pasos:** 1) Comparar las horas que muestra el editor con la tabla 3.4.
- **Esperado:** 24 horas en cinco semanas y 48 en una; 168 por ciclo. La semana de 48 horas es la 6 del equipo 1, la 5 del 2, la 4 del 3, la 3 del 4, la 2 del 5 y la 1 del 6. · RG-53
- **Evidencia:** CAP.

#### D4-06 · Negativo · P2 · La jefatura intenta crear una rotativa
- **Pasos:** 1) Forzar (F) con la sesión de JU, y luego con la de JM, la creación de una rotativa.
- **Esperado:** 403 con aviso (S-01). · RG-16, RG-04
- **Evidencia:** RED.

### HU-D5 · Personal y jerarquía de Medicina

- **Rol:** administrador; jefatura y subrogante de Medicina.
- **Historia:** Como administrador, quiero sumar a Medicina a sus médicos y designar su jefatura, para que el servicio se gestione solo desde dentro.
- **Reglas de origen:** MF-002 · MF-020 · MF-023 · R8 · Dec. l.1427 · Dec. l.1466 · Dec. l.1580 · Dec. l.1756 · Dec. encargo (roles al siguiente inicio de sesión).
- **Criterios de aceptación:**
  1. El administrador suma personal activo y no puede sumarse a sí mismo.
  2. Sumar a quien ya pertenece avisa y no cambia su rol; sumar no toca roles en otros servicios.
  3. El administrador designa la jefatura; la jefatura solo designa subrogantes.
  4. La jefatura suma médicos a su servicio; el subrogante no.
  5. Los roles rigen desde el siguiente inicio de sesión.

#### D5-01 · Positivo · P1 · El administrador suma el personal
- **Pasos:** 1) ADM asocia a Medicina a las 42 personas MM-k.p y a JM, JM2 y SM (S-07).
- **Esperado:** cada una figura en el personal de Medicina como médico; quien también es de Urgencias conserva allá su rol. · RG-07, RG-08
- **Evidencia:** CAP del personal de Medicina (sin transcribir RUT).

#### D5-02 · Negativo · P1 · El administrador intenta sumarse a sí mismo
- **Pasos:** 1) ADM intenta asociarse a Medicina.
- **Esperado:** rechazo con aviso. · RG-07
- **Evidencia:** TXT.

#### D5-03 · Borde · P1 · Sumar a quien ya está
- **Pre:** D5-04 hecho: JM ya es jefatura de Medicina.
- **Pasos:** 1) ADM asocia otra vez a JM a Medicina. 2) JM sale y vuelve a entrar.
- **Esperado:** aviso de que ya pertenece; JM sigue siendo jefatura. · RG-08
- **Evidencia:** TXT; CAP del rol de JM.

#### D5-04 · Positivo · P1 · Designar la jefatura de Medicina
- **Pre:** JM asociado como médico y con sesión abierta en Medicina.
- **Pasos:** 1) ADM designa a JM jefatura de Medicina. 2) JM revisa sus funciones sin salir. 3) JM sale y vuelve a entrar.
- **Esperado:** paso 2: sigue como médico. Paso 3: tiene las funciones de jefatura en Medicina. · RG-05, RG-09
- **Evidencia:** CAP de los pasos 2 y 3.

#### D5-05 · Positivo · P1 · La jefatura designa un subrogante
- **Pasos:** 1) JM designa a SM subrogante de Medicina. 2) SM vuelve a entrar.
- **Esperado:** se permite; SM tiene funciones de subrogante. · RG-05, RG-09
- **Evidencia:** CAP.

#### D5-06 · Negativo · P1 · La jefatura intenta designar otra jefatura
- **Pasos:** 1) JM abre la jerarquía: la selección debe partir en «Subrogante». 2) JM intenta designar a JM2 como jefatura; forzar (F) si la interfaz no lo deja.
- **Esperado:** rechazo con aviso; JM2 sigue como médico. · RG-09
- **Evidencia:** CAP; TXT; RED.

#### D5-07 · Positivo · P1 · La jefatura suma un médico que no está
- **Pasos:** 1) JM suma a Medicina a MD, que solo es de Urgencias.
- **Esperado:** MD queda como médico en Medicina y en Urgencias conserva su rol. · RG-08
- **Evidencia:** CAP de los dos servicios.

#### D5-08 · Negativo · P1 · El subrogante intenta sumar personal
- **Pasos:** 1) SM busca cómo sumar personal: no debe tenerlo. 2) Forzar (F).
- **Esperado:** rechazo con aviso. · RG-12, RG-04
- **Evidencia:** CAP; RED.

#### D5-09 · Borde · P2 · Sumar a Medicina a un subrogante de Urgencias
- **Pre:** SU designado en Urgencias (flujo E).
- **Pasos:** 1) JM suma a SU a Medicina. 2) SU entra a Urgencias y luego a Medicina.
- **Esperado:** en Medicina es médico; en Urgencias sigue como subrogante. · RG-08, RG-10
- **Evidencia:** CAP.

#### D5-10 · Positivo · P2 · Un médico de dos servicios elige al entrar
- **Pasos:** 1) MD entra. 2) Un médico de un solo servicio entra.
- **Esperado:** MD elige entre Urgencias y Medicina, con su rol en cada uno; el de un solo servicio entra directo al inicio. · RG-02
- **Evidencia:** CAP.

### HU-D6 · El molde de Medicina

- **Rol:** administrador.
- **Historia:** Como administrador, quiero armar el molde que une cada rotativa con cada puesto y cada médico, para generar los turnos sin cargarlos uno por uno.
- **Reglas de origen:** MF-026 · Dec. l.1408.
- **Criterios de aceptación:**
  1. Cada fila une un equipo, un puesto y un médico.
  2. Un médico repetido en filas que chocan se ve como conflicto en la vista previa.

#### D6-01 · Positivo · P1 · Armar el molde de 42 filas
- **Pre:** rotativas, puestos y personal listos.
- **Pasos:** 1) ADM arma el molde «Medicina 2026-27» con 42 filas: Equipo k, Medicina p, MM-k.p.
- **Esperado:** se guarda con 42 filas y cada persona aparece una sola vez. · RG-55
- **Evidencia:** CAP del molde.

#### D6-02 · Borde · P1 · El mismo médico dos veces en un equipo
- **Pasos:** 1) ADM pone a MM-3.1 también en la fila Equipo 3, Medicina 2, en lugar de MM-3.2. 2) Abre la vista previa. 3) Corrige la fila y vuelve a mirar.
- **Esperado:** la vista previa marca conflicto en los días del equipo 3 para una de esas dos filas, que quedaría vacante, sin bloquear la generación. Corregida la fila, el conflicto desaparece. · RG-24, RG-55
- **Evidencia:** CAP de la tabla de conflictos antes y después.

#### D6-03 · Negativo · P2 · La jefatura intenta armar un molde
- **Pasos:** 1) Forzar (F) con la sesión de JM la creación de un molde o una generación.
- **Esperado:** 403 con aviso (S-01). · RG-16, RG-04
- **Evidencia:** RED.

### HU-D7 · Vista previa y generación

- **Rol:** administrador.
- **Historia:** Como administrador, quiero ver antes de confirmar los turnos que se van a generar y luego generarlos, para que el calendario de Medicina quede listo sin sorpresas.
- **Reglas de origen:** MF-026 · PLAN §2–5 · Dec. l.1436.
- **Criterios de aceptación:**
  1. El ancla es un lunes y fija la fase; la vigencia tiene inicio y fin.
  2. La vista previa es idéntica a la generación.
  3. Un conflicto de horario deja el turno vacante y no bloquea.
  4. No se superponen dos vigencias activas del servicio.
  5. Extender, acortar y editar desde una fecha respetan la fase y no tocan lo anterior.

#### D7-01 · Positivo · P1 · Vista previa del ciclo
- **Pasos:** 1) ADM elige el ancla lunes 21 dic 2026 y la vigencia del 21 dic 2026 al 31 ene 2027, sin reglas de fin de semana ni de feriado. 2) Abre la vista previa.
- **Esperado:** 588 turnos, 14 por día; el equipo de cada día coincide con la tabla 3.6. Los conflictos que lista son choques reales con turnos de Urgencias de personas que están en los dos servicios, todos entre el 21 y el 31 dic; en enero, ninguno. · RG-55
- **Evidencia:** CAP de la vista previa y de la tabla de conflictos.

#### D7-02 · Negativo · P1 · Un ancla que no es lunes
- **Pasos:** 1) Forzar (F) la generación con ancla el martes 22 dic.
- **Esperado:** rechazo: el ancla tiene que ser lunes. · RG-55
- **Evidencia:** RED.

#### D7-03 · Positivo · P1 · Generar
- **Pasos:** 1) ADM genera con los datos de D7-01.
- **Esperado:** el resultado es idéntico a la vista previa: los mismos turnos y los mismos conflictos, que quedan como cupos vacantes. La bitácora registra la generación con ADM. · RG-47, RG-55
- **Evidencia:** CAP; BIT.

#### D7-04 · Negativo · P1 · Una segunda generación superpuesta
- **Pasos:** 1) ADM intenta generar el mismo molde del 25 ene al 7 feb 2027.
- **Esperado:** rechazo por superposición con la vigencia activa (del 25 al 31 ene); no se crea nada. · RG-56
- **Evidencia:** TXT; CAP de febrero sin turnos.

#### D7-05 · Borde · P2 · Vista previa de las fechas del dato
- **Pasos:** 1) ADM abre una vista previa con vigencia del 30 sep al 27 oct 2026 (ancla 28 sep o 21 dic) y no confirma.
- **Esperado:** el equipo de cada día coincide con las 28 fechas del dato. Si el sistema no permite vista previa de fechas pasadas, N/A: D8-02 cubre la comparación. · RG-55
- **Evidencia:** CAP.

#### D7-06 · Negativo · P2 · Fin antes del inicio
- **Pasos:** 1) ADM intenta una vigencia con fin anterior al inicio; forzar (F) si la interfaz no lo deja.
- **Esperado:** rechazo con aviso. · RG-55
- **Evidencia:** TXT; RED.

#### D7-07 · Borde · P1 · Feriados sin reglas
- **Pasos:** 1) Revisar el 25 dic y el 1 ene en la vista previa y en lo generado.
- **Esperado:** se generan como cualquier día y con su equipo (25 dic, equipo 2; 1 ene, equipo 1), porque no se eligieron reglas de feriado (S-05). · RG-55
- **Evidencia:** CAP.

#### D7-08 · Borde · P2 · Extender la vigencia
- **Pasos:** 1) ADM extiende la vigencia hasta el 14 feb 2027.
- **Esperado:** se agregan del 1 al 14 feb sin tocar lo anterior y con la misma fase: lunes 1 feb, equipo 6; martes 2 feb, equipo 5; miércoles 3 feb, equipo 3. · RG-57
- **Evidencia:** CAP.

#### D7-09 · Negativo · P2 · Acortar con fin anterior a hoy
- **Pasos:** 1) ADM intenta acortar la vigencia con fin en un día anterior a hoy.
- **Esperado:** rechazo con aviso. · RG-57
- **Evidencia:** TXT.

#### D7-10 · Positivo · P2 · Acortar a una fecha futura
- **Pre:** D7-08 hecho.
- **Pasos:** 1) ADM acorta la vigencia hasta el 31 ene 2027.
- **Esperado:** desaparecen los turnos del 1 al 14 feb y enero queda intacto. Si hubiera solicitudes u ofertas sobre los turnos que se eliminan, el sistema avisa antes de confirmar. · RG-57
- **Evidencia:** CAP.

#### D7-11 · Borde · P3 · Editar desde una fecha
- **Pasos:** 1) ADM edita la planificación desde el 11 ene: en la fila Equipo 3, Medicina 7, cambia a MM-3.7 por otra persona de Medicina que no esté en el molde. 2) Revisa el 6 y el 13 ene. 3) Revierte igual.
- **Esperado:** el 6 ene sigue con MM-3.7 y el 13 ene es de la persona nueva; el 13 ene sigue siendo del equipo 3 (la fase se conserva). · RG-57
- **Evidencia:** CAP.

### HU-D8 · Verificación contra el calendario de referencia

- **Rol:** administrador o jefatura de Medicina.
- **Historia:** Como dueño del sistema, quiero comprobar que lo generado calce con el calendario real de Medicina, para confiar en que el sistema reproduce el servicio.
- **Reglas de origen:** MF-026 · MF-030 · R2 · R7 · R13 · sección 3.
- **Criterios de aceptación:**
  1. Cada día lo cubre el equipo de la tabla 3.6, con 7 Días y 7 Noches.
  2. Las 28 fechas del dato se reproducen en su equivalente.
  3. Cada equipo y cada médico tiene lo que dice el patrón, sin días seguidos.

#### D8-01 · Positivo · P1 · El equipo de cada día
- **Pasos:** 1) Para cada día del 21 dic al 31 ene, revisar los bloques Día y Noche en el calendario, o en el CSV de Medicina.
- **Esperado:** cada bloque tiene 7 turnos del equipo de la tabla 3.6 (asignados o, entre el 21 y el 31 dic, vacantes por conflicto), y su encabezado muestra ese equipo. · RG-55, RG-61
- **Evidencia:** CAP de una semana completa; CSV.

#### D8-02 · Positivo · P1 · Las 28 fechas del dato
- **Pasos:** 1) Comparar del 23 dic al 19 ene con la tabla de equivalencia.
- **Esperado:** el equipo de cada día coincide con el de su fecha del dato. · RG-55
- **Evidencia:** tabla de comparación en el informe.

#### D8-03 · Positivo · P1 · Siete días por equipo y un fin de semana de cada tipo
- **Pasos:** 1) Contar, con el CSV de Medicina o con el calendario, los días de cada equipo en la ventana.
- **Esperado:** cada equipo trabaja 7 días en la ventana, con un viernes, un sábado y un domingo; cada semifijo, 4 veces en su día. · RG-55
- **Evidencia:** conteo por equipo en el informe.

#### D8-04 · Positivo · P1 · Los turnos de cada médico
- **Pasos:** 1) Revisar el calendario de dos médicos por equipo (puestos 1 y 7).
- **Esperado:** 7 Días y 7 Noches en las fechas de su equipo, siempre el Día y la Noche del mismo día. · RG-55
- **Evidencia:** CAP del calendario de cada uno.

#### D8-05 · Positivo · P2 · Volantes cada 6 días y semifijos en su día
- **Pasos:** 1) Listar los días de los equipos 5, 6 y 1 en la ventana.
- **Esperado:** el equipo 6 trabaja el 21 y el 27 dic y el 2, 8, 14, 20 y 26 ene; el equipo 5, el 22 y el 28 dic y el 3, 9, 15, 21 y 27 ene. El equipo 1 cubre todos los lunes salvo el 21 y el 28 dic, que son de los volantes. · RG-55
- **Evidencia:** conteo en el informe.

#### D8-06 · Positivo · P2 · Ningún equipo trabaja dos días seguidos
- **Pasos:** 1) Calcular los días que pasan entre turnos seguidos de cada equipo.
- **Esperado:** entre dos turnos de un mismo equipo pasan al menos 3 días, así que ningún médico queda con una Noche de Medicina seguida de un Día de Medicina. · RG-23, RG-55
- **Evidencia:** conteo en el informe.

#### D8-07 · Positivo · P2 · Cobertura del mes
- **Pasos:** 1) Abrir la estadística de Medicina de enero y de diciembre.
- **Esperado:** enero, 434 turnos y 100 % de cobertura; diciembre, solo las vacantes que dejaron los conflictos de D7-03. · RG-58
- **Evidencia:** CAP.

#### D8-08 · Positivo · P2 · El turno propio muestra el equipo
- **Pasos:** 1) MM-3.1 entra a Medicina y mira su inicio el 6 ene.
- **Esperado:** «Tienes turno Día: Equipo 3» y la Noche del mismo día. · RG-61
- **Evidencia:** CAP.

### HU-D9 · La jefatura de Medicina opera su servicio

- **Rol:** jefatura de Medicina.
- **Historia:** Como jefatura de Medicina, quiero gestionar los turnos de mi servicio con las mismas herramientas que Urgencias, sin ver ni tocar lo de otro servicio.
- **Reglas de origen:** MF-022 · MF-027 · R17 · Dec. l.1495 · Dec. encargo (cada servicio ve solo sus datos).
- **Criterios de aceptación:**
  1. Todo lo que ve es de Medicina.
  2. La asignación manual y las solicitudes funcionan con las mismas reglas.
  3. Lo que pasa en Medicina lo resuelve Medicina.

#### D9-01 · Positivo · P1 · Ve solo Medicina
- **Pasos:** 1) JM recorre turnos, personal, solicitudes, ofertas, bitácora, estadística y auditoría.
- **Esperado:** todo es de Medicina; nada de Urgencias. · RG-17
- **Evidencia:** CAP de cada vista.

#### D9-02 · Positivo · P1 · Quita y asigna en Medicina
- **Pasos:** 1) JM quita a MM-2.7 de su Día del 12 ene. 2) Se lo vuelve a asignar.
- **Esperado:** las mismas reglas y el mismo registro que en Urgencias. · RG-19, RG-20
- **Evidencia:** CAP; BIT.

#### D9-03 · Positivo · P1 · Una cobertura de Medicina se resuelve en Medicina
- **Pasos:** 1) Con el cupo de D9-02 libre, MM-5.1 (equipo 5: no trabaja el 12 ene ni la Noche del 11) pide cobertura. 2) JU revisa sus pendientes. 3) JM la rechaza. 4) JM vuelve a asignar el cupo a MM-2.7.
- **Esperado:** la solicitud le llega a JM y no a JU; JM la resuelve. · RG-17, RG-33
- **Evidencia:** CAP de los pendientes de JM y de JU.

#### D9-04 · Negativo · P2 · La jefatura de Medicina intenta escribir reglas de horario
- **Pasos:** 1) Forzar (F) con la sesión de JM la creación de una regla de horario en Medicina.
- **Esperado:** 403 con aviso. · RG-15, RG-04
- **Evidencia:** RED.

## 8. Flujo E — Permisos, separación entre servicios y trazabilidad

### HU-E1 · Permisos por rol

- **Rol:** todos.
- **Historia:** Como dueño del sistema, quiero que cada rol pueda hacer exactamente lo que le corresponde, para que nadie apruebe, asigne o configure sin autoridad.
- **Reglas de origen:** MF-018 a MF-033 · Dec. l.1408 · Dec. l.1418 · Dec. l.1427 · Dec. l.1466 · Dec. l.1476 · Dec. l.1495 · Dec. l.1571 · Dec. l.1581 · Dec. l.1756 · Dec. encargo.
- **Criterios de aceptación:**
  1. Cada rol tiene los permisos de la matriz y ninguno más.
  2. Lo que la interfaz no ofrece tampoco se puede hacer forzando: el servidor lo niega con aviso.

**Matriz de permisos esperada.**

| Acción | Médico | Subrogante | Jefatura | Administrador | Regla |
|---|---|---|---|---|---|
| Ver los turnos y el calendario del servicio activo | Sí | Sí | Sí | Sí | RG-17 |
| Crear solicitudes propias | Sí | Sí | Sí | Sí, si tiene turnos | RG-28 |
| Responder como receptor | Solo el receptor | Solo el receptor | Solo el receptor | Solo el receptor | RG-40 |
| Cancelar una solicitud | Solo el emisor | Solo el emisor | Solo el emisor | Solo el emisor | RG-31 |
| Aprobar o rechazar; abrir ofertas y elegir postulante | No | Sí | Sí | Sí | RG-14, RG-12, RG-33 |
| Resolver una solicitud propia | No | No | No | No | RG-31 |
| Asignar, quitar y reasignar | No | Sí | Sí | Sí | RG-19, RG-12 |
| Gestionar puestos | No | Sí | Sí | Sí | RG-12, RG-54 |
| Sumar personal al servicio | No | No | Sí, como médico | Sí | RG-07, RG-08, RG-12 |
| Designar subrogante | No | No | Sí, en su servicio | Sí | RG-09 |
| Designar jefatura | No | No | No | Sí | RG-09 |
| Quitar subrogancia | No | No | Sí, en su servicio | Sí | RG-10 |
| Cambiar el rol de una jefatura (otra o la propia) | No | No | No | Sí | RG-11 |
| Editar nombre o estado de funcionarios | No | No | Sí, en su servicio (S-27) | Sí | RG-13 |
| Tipos de turno, rotativas y planificación | No | No | No (S-01) | Sí | RG-16 |
| Escribir reglas de horario | No | No | No | Sí | RG-15 |
| Bitácora, estadística y auditoría | No | Sí | Sí | Sí | RG-47, RG-48, RG-58 |
| Historial de un turno | Solo sus turnos | Sí | Sí | Sí | RG-34 |
| Exportar CSV | Solo sus turnos | Propios o del servicio | Propios o del servicio | Propios o del servicio | RG-49 |
| Servicios, personal del sistema y panel de administración | No | No | No | Sí | RG-06, RG-51 |

#### E1-01 · Negativo · P1 · Un médico no resuelve solicitudes ni ofertas
- **Pre:** una solicitud pendiente y una oferta general por abrir, ajenas a MU2.
- **Pasos:** 1) Con la sesión de MU2, revisar que no tenga aprobar, rechazar, abrir oferta ni elegir postulante. 2) Forzar (F) cada acción.
- **Esperado:** la interfaz no las ofrece; cada intento forzado, 403 con aviso; nada cambia. · RG-14, RG-04
- **Evidencia:** CAP; RED de cada intento.

#### E1-02 · Negativo · P1 · Un médico no asigna, no quita ni reasigna
- **Pasos:** 1) Forzar (F) con la sesión de MU2 una asignación, un retiro y una reasignación.
- **Esperado:** 403 con aviso en cada uno. · RG-19, RG-20, RG-04
- **Evidencia:** RED.

#### E1-03 · Negativo · P1 · Un médico no abre bitácora, estadística ni auditoría
- **Pasos:** 1) MU2 revisa su menú. 2) Forzar (F) cada consulta.
- **Esperado:** no están en su menú; forzadas, 403 con aviso. · RG-47, RG-48, RG-58, RG-04
- **Evidencia:** CAP; RED.

#### E1-04 · Negativo · P1 · Un médico no entra a la administración
- **Pasos:** 1) MU2 busca el panel de administración y el personal del sistema. 2) Forzar (F) la consulta del personal del sistema.
- **Esperado:** no los tiene; forzado, 403 con aviso. · RG-06, RG-04
- **Evidencia:** CAP; RED.

#### E1-05 · Borde · P2 · El CSV de un médico trae solo sus turnos
- **Pasos:** 1) MU2 exporta diciembre. 2) Forzar (F) la exportación de «todo el servicio».
- **Esperado:** en los dos casos, solo turnos de MU2 (S-14). · RG-49
- **Evidencia:** CSV (sin transcribir RUT; basta el conteo de personas distintas).

#### E1-06 · Positivo · P1 · El subrogante decide y asigna
- **Pre:** SU designado (E3-01).
- **Pasos:** 1) SU aprueba una cobertura (B2-02). 2) SU abre una oferta general y elige postulante. 3) SU asigna un cupo libre (A1-14).
- **Esperado:** se permite todo, con SU como encargado en la bitácora. La gestión de puestos del subrogante se prueba en D3-03. · RG-12, RG-33, RG-19
- **Evidencia:** CAP; BIT.

#### E1-07 · Negativo · P1 · El subrogante no designa, no quita subrogancia ni suma personal
- **Pasos:** 1) SU intenta designar subrogante a MU3. 2) SU intenta quitarse la subrogancia o quitársela a otro. 3) SU intenta sumar a un médico al servicio. Forzar (F) lo que la interfaz no ofrezca.
- **Esperado:** rechazo con aviso en los tres. · RG-09, RG-10, RG-12
- **Evidencia:** CAP; RED.

#### E1-08 · Negativo · P1 · El subrogante no edita nombre ni estado de otros
- **Pasos:** 1) SU intenta cambiar el nombre de MU3 y después su estado; forzar (F) si no se ofrece.
- **Esperado:** rechazo con aviso; nada cambia. · RG-13
- **Evidencia:** RED.

#### E1-09 · Negativo · P1 · La jefatura no designa jefaturas
- **Pasos:** 1) JU abre la jerarquía: la selección parte en «Subrogante». 2) JU intenta designar jefatura a MU3; forzar (F) si no se ofrece.
- **Esperado:** rechazo con aviso; MU3 sigue como médico. · RG-09
- **Evidencia:** CAP; RED.

#### E1-10 · Negativo · P1 · Jefatura y subrogante no escriben reglas de horario
- **Pasos:** 1) Forzar (F) con la sesión de JU y luego con la de SU la creación, la edición y la eliminación de una regla de horario.
- **Esperado:** 403 con aviso en todos. · RG-15, RG-04
- **Evidencia:** RED.

#### E1-11 · Negativo · P2 · Jefatura y subrogante no gestionan tipos, rotativas ni planificación
- **Pasos:** 1) Forzar (F) con la sesión de JU y luego con la de SU la creación de un tipo de turno, de una rotativa y de un molde.
- **Esperado:** 403 con aviso (S-01). · RG-16, RG-04
- **Evidencia:** RED.

#### E1-12 · Negativo · P2 · La jefatura no administra el sistema
- **Pasos:** 1) JU busca servicios, personal del sistema y el panel de administración. 2) Forzar (F) la consulta del personal del sistema.
- **Esperado:** no los tiene; forzado, 403 con aviso. · RG-06, RG-04
- **Evidencia:** CAP; RED.

#### E1-13 · Positivo · P2 · El administrador se reconoce igual en todas partes
- **Pasos:** 1) ADM revisa sus accesos de administración en Mi Perfil y en el menú lateral de escritorio.
- **Esperado:** los mismos accesos en los dos lugares. · RG-06
- **Evidencia:** CAP de ambos.

#### E1-14 · Positivo · P2 · La jefatura edita el estado de un médico de su servicio
- **Pasos:** 1) JU deja inactivo a MX. 2) JU lo reactiva.
- **Esperado:** se permite (S-27). Si el sistema reserva esto al administrador, se anota para resolver S-27; no es FALLA. · RG-13
- **Evidencia:** CAP.

### HU-E2 · Acceso, sesión y aviso sin permiso

- **Rol:** todos.
- **Historia:** Como usuario, quiero que el sistema me avise cuando algo no me corresponde sin echarme, y que recargar la página no me saque de donde estaba.
- **Reglas de origen:** R5 · R8 · Dec. l.1589 · Dec. P-01 (l.1616).
- **Criterios de aceptación:**
  1. Una acción sin permiso muestra un aviso y la sesión sigue.
  2. Una vista no permitida para el rol cae al inicio.
  3. Recargar mantiene la vista y la sesión.
  4. Las reglas valen igual en el teléfono y en el escritorio.

#### E2-01 · Negativo · P1 · Una acción sin permiso avisa y no cierra la sesión
- **Pasos:** 1) Forzar (F) con la sesión de MU2 una aprobación. 2) Sin volver a entrar, abrir el calendario y pedir un cupo libre, y cancelarlo.
- **Esperado:** paso 1: aviso visible del rechazo, sin volver al ingreso. Paso 2: funciona. · RG-04
- **Evidencia:** CAP del aviso; CAP del paso 2.

#### E2-02 · Negativo · P2 · Una vista no permitida cae al inicio
- **Pasos:** 1) Con la sesión de MU2, dejar como vista guardada una de administración (técnica del plan) y recargar.
- **Esperado:** cae al inicio, no al panel de administración. · RG-03
- **Evidencia:** CAP.

#### E2-03 · Positivo · P2 · Recargar no saca de la vista
- **Pasos:** 1) JU va al calendario y recarga. 2) Va a Mi Perfil y recarga. 3) MD usa «Cambiar servicio» después de recargar.
- **Esperado:** sigue en la misma vista y con la sesión; «Cambiar servicio» funciona. · RG-03
- **Evidencia:** CAP.

#### E2-04 · Positivo · P2 · Las mismas reglas en el teléfono
- **Pasos:** 1) Con la ventana bajo 1200 px (ancho de teléfono), repetir A1-05, B1-02, C2-03 y E2-01.
- **Esperado:** los mismos resultados que en el escritorio. · RG-60
- **Evidencia:** CAP de cada uno.

#### E2-05 · Positivo · P1 · Ingreso con RUT y clave
- **Pasos:** 1) Cada actor entra con su RUT y su clave correctos, copiados sin errores.
- **Esperado:** entra al servicio que corresponde (directo o eligiendo). No se prueba una clave errónea: cuenta para el bloqueo de la cuenta. Si un ingreso falla una vez, se detiene y se revisa antes de reintentar. · RG-01, RG-02
- **Evidencia:** registro de ingresos del informe (sin RUT).

### HU-E3 · Cambios de rol

- **Rol:** jefatura, administrador; el funcionario afectado.
- **Historia:** Como jefatura, quiero designar y quitar subrogantes con reglas claras, para cubrir mis ausencias sin que nadie se suba de rango por error.
- **Reglas de origen:** MF-023 · Dec. l.1466 · Dec. l.1580 · Dec. l.1581 · Dec. encargo (roles al siguiente inicio de sesión; ninguna jefatura cambia el rol de otra ni el propio; la subrogancia solo se quita con su acción).
- **Criterios de aceptación:**
  1. Designar y quitar rigen desde el siguiente inicio de sesión.
  2. La subrogancia se quita solo con «Quitar subrogancia».
  3. Una jefatura no cambia el rol de otra ni el suyo.
  4. Cada jefatura actúa solo en su servicio.

#### E3-01 · Positivo · P1 · Designar subrogante rige al siguiente inicio de sesión
- **Pre:** MU5 con sesión abierta como médico en Urgencias.
- **Pasos:** 1) JU designa a MU5 subrogante (desde ahora, SU). 2) SU, sin salir, intenta aprobar una solicitud. 3) SU sale y vuelve a entrar. 4) Intenta aprobar otra vez.
- **Esperado:** paso 2: todavía no puede. Paso 4: puede. · RG-05, RG-09
- **Evidencia:** CAP de los pasos 2 y 4.

#### E3-02 · Positivo · P1 · «Quitar subrogancia» devuelve a médico
- **Pre:** SU con sesión abierta.
- **Pasos:** 1) JU usa «Quitar subrogancia» sobre SU. 2) SU, sin salir, revisa sus funciones. 3) SU sale y vuelve a entrar.
- **Esperado:** paso 1: se permite. Paso 2: conserva las funciones de subrogante hasta salir (S-20). Paso 3: es médico. · RG-05, RG-10
- **Evidencia:** CAP de cada paso; BIT si la designación se registra.

#### E3-03 · Borde · P1 · Sumar al subrogante a su mismo servicio no le quita el rol
- **Pre:** SU es subrogante de Urgencias.
- **Pasos:** 1) JU suma a SU a Urgencias otra vez. 2) SU sale y vuelve a entrar.
- **Esperado:** aviso de que ya pertenece; SU sigue como subrogante. · RG-08, RG-10
- **Evidencia:** TXT; CAP.

#### E3-04 · Negativo · P1 · Una jefatura no cambia el rol de otra
- **Pre:** ADM designó a JM2 como segunda jefatura de Medicina.
- **Pasos:** 1) JM intenta quitarle la jefatura a JM2 o dejarla como subrogante; forzar (F) si no se ofrece.
- **Esperado:** rechazo con aviso; JM2 sigue como jefatura. · RG-11
- **Evidencia:** TXT; RED.

#### E3-05 · Negativo · P1 · Una jefatura no cambia su propio rol
- **Pasos:** 1) JM intenta designarse subrogante o quitarse la jefatura; forzar (F) si no se ofrece.
- **Esperado:** rechazo con aviso. · RG-11
- **Evidencia:** TXT; RED.

#### E3-06 · Negativo · P2 · La jefatura quita subrogancias solo en su servicio
- **Pasos:** 1) Forzar (F) con la sesión de JU «Quitar subrogancia» sobre SM, que es subrogante de Medicina.
- **Esperado:** rechazo con aviso; SM sigue como subrogante. · RG-10, RG-17
- **Evidencia:** RED.

### HU-E4 · Separación entre servicios

- **Rol:** jefaturas y médicos de Urgencias y de Medicina.
- **Historia:** Como jefatura, quiero ver y gestionar solo mi servicio, para que los datos de otro servicio no se mezclen con los míos ni se toquen por error.
- **Reglas de origen:** R14 · Dec. encargo (cada servicio ve solo sus datos).
- **Criterios de aceptación:**
  1. Todas las vistas y exportaciones muestran solo el servicio activo.
  2. Nadie pide, intercambia, resuelve ni asigna en otro servicio.

#### E4-01 · Negativo · P1 · La jefatura de Medicina no ve nada de Urgencias
- **Pasos:** 1) JM recorre, en fechas de diciembre con turnos de Urgencias, turnos, personal, solicitudes, ofertas, bitácora, estadística, auditoría y CSV de «todo el servicio». 2) Forzar (F) la consulta de un turno de Urgencias por su identificador.
- **Esperado:** solo aparece Medicina; forzado, 403 con aviso o respuesta vacía. · RG-17
- **Evidencia:** CAP; CSV; RED.

#### E4-02 · Negativo · P1 · La jefatura de Urgencias no ve nada de Medicina
- **Pasos:** 1) JU hace el mismo recorrido entre el 21 dic y el 31 ene. 2) Forzar (F) la consulta de un turno de Medicina.
- **Esperado:** solo aparece Urgencias; forzado, 403 con aviso o respuesta vacía. · RG-17
- **Evidencia:** CAP; CSV; RED.

#### E4-03 · Positivo · P1 · Un médico de dos servicios ve el servicio activo
- **Pasos:** 1) MD entra a Urgencias y revisa su inicio y el calendario entre el 21 y el 31 dic. 2) Cambia a Medicina y repite.
- **Esperado:** en cada servicio ve los turnos de ese servicio (S-19). · RG-02, RG-17
- **Evidencia:** CAP de los dos.

#### E4-04 · Negativo · P1 · Un médico de Medicina no pide cupos de Urgencias
- **Pasos:** 1) MM-1.1 busca cupos libres de Urgencias. 2) Forzar (F) una cobertura sobre uno.
- **Esperado:** no los ve; forzado, rechazo. · RG-17, RG-35
- **Evidencia:** CAP; RED.

#### E4-05 · Negativo · P1 · No hay intercambios entre servicios
- **Pasos:** 1) Con Medicina activo, MD intenta cambiar un turno suyo de Medicina por uno de Urgencias de MU1; forzar (F).
- **Esperado:** rechazo. · RG-17, RG-39
- **Evidencia:** RED.

#### E4-06 · Negativo · P2 · Una jefatura no resuelve solicitudes de otro servicio
- **Pre:** una solicitud pendiente en Urgencias.
- **Pasos:** 1) Forzar (F) su aprobación con la sesión de JM.
- **Esperado:** rechazo con aviso; sigue pendiente. · RG-17, RG-33
- **Evidencia:** RED.

#### E4-07 · Negativo · P2 · Una jefatura no asigna en otro servicio
- **Pasos:** 1) Forzar (F) con la sesión de JM la asignación de un cupo libre de Urgencias.
- **Esperado:** rechazo con aviso. · RG-17, RG-19
- **Evidencia:** RED.

### HU-E5 · Un médico en dos servicios: choque y descanso

- **Rol:** jefatura de Medicina, jefatura de Urgencias, administrador; MD.
- **Historia:** Como jefatura, quiero que el sistema impida que un médico que trabaja en dos servicios quede con dos turnos a la misma hora o sin descanso después de una noche, aunque cada turno sea de un servicio distinto.
- **Reglas de origen:** PLAN §6 · R13 · MF-026 · Dec. l.1436.
- **Pregunta de fondo:** ¿choca un turno de Medicina con uno de Urgencias a la misma hora? **Sí.** El choque y el descanso se evalúan con todos los turnos de la persona, en cualquier servicio (RG-18).
- **Criterios de aceptación:**
  1. La asignación manual y las solicitudes rechazan el choque y el descanso violado contra turnos de otro servicio, en los dos sentidos.
  2. Tocarse en el borde entre servicios no es choque.
  3. La generación deja vacante el turno en choque con otro servicio y lo muestra en la vista previa.
  4. La generación no aplica el descanso (limitación conocida): se registra, no es falla.

#### E5-01 · Negativo · P1 · Asignar en Medicina un turno que choca con uno de Urgencias
- **Pre:** MD tiene el Día F1 en Urgencias. En Medicina hay un cupo libre del Día F1 (JM lo libera quitando a su titular).
- **Pasos:** 1) JM intenta asignar a MD ese cupo.
- **Esperado:** rechazo por choque. El aviso da la fecha y la hora del turno que choca sin mostrar otros datos de Urgencias (S-19). · RG-18, RG-24, RG-27
- **Evidencia:** TXT; RED.

#### E5-02 · Negativo · P1 · Un Día de Medicina al salir de una Noche de Urgencias
- **Pre:** MD tiene la Noche F2−1 en Urgencias. Hay un cupo libre del Día F2 en Medicina.
- **Pasos:** 1) JM intenta asignar a MD ese cupo.
- **Esperado:** rechazo por descanso post-nocturno. · RG-18, RG-22, RG-23
- **Evidencia:** TXT; RED.

#### E5-03 · Positivo · P1 · La Noche de Medicina el mismo día de un Día de Urgencias
- **Pre:** MD tiene el Día F1 en Urgencias y no tiene Día F1+1 en ningún servicio. Hay un cupo libre de la Noche F1 en Medicina.
- **Pasos:** 1) JM asigna a MD ese cupo. 2) JM lo revierte.
- **Esperado:** se permite: 24 corridas entre servicios, y tocarse a las 20:00 no es choque. · RG-18, RG-23, RG-24
- **Evidencia:** CAP.

#### E5-04 · Negativo · P1 · Pedir en Medicina un cupo que choca con Urgencias
- **Pre:** como en E5-02, con Medicina activo para MD.
- **Pasos:** 1) MD mira sus «Disponibles» en Medicina. 2) MD pide el cupo del Día F2.
- **Esperado:** el cupo no figura en «Disponibles», y pedirlo se rechaza con aviso de descanso. Si figura pero se rechaza al pedirlo, se anota como falla parcial de RG-36. · RG-18, RG-23, RG-36
- **Evidencia:** CAP; TXT; RED.

#### E5-05 · Negativo · P2 · Asignar en Urgencias un turno que choca con uno de Medicina
- **Pre:** JM asignó a MD un cupo de la Noche F3 en Medicina. Hay un cupo libre de la Noche F3 en Urgencias.
- **Pasos:** 1) JU intenta asignar a MD el cupo de Urgencias. 2) JM revierte la asignación de Medicina.
- **Esperado:** rechazo por choque: la regla vale igual en el otro sentido. · RG-18, RG-24
- **Evidencia:** TXT; RED.

#### E5-06 · Borde · P1 · La generación deja vacante el choque entre servicios
- **Pre:** MD tiene un Día en Urgencias el día F4, en que trabaja el equipo k de Medicina. Se hace antes de D7-03.
- **Pasos:** 1) ADM pone por un momento a MD en una fila del equipo k del molde. 2) Abre la vista previa, sin generar. 3) Devuelve la fila a su titular.
- **Esperado:** la vista previa marca conflicto para MD el día F4, y ese turno quedaría vacante sin bloquear la generación. · RG-18, RG-55
- **Evidencia:** CAP de la tabla de conflictos.

#### E5-07 · Borde · P2 · La generación no aplica el descanso entre servicios
- **Pre:** MD tiene la Noche F5−1 en Urgencias, y el equipo k de Medicina trabaja el día F5. Se hace antes de D7-03.
- **Pasos:** 1) Igual que E5-06, con esa fila. 2) Revisar la vista previa del día F5.
- **Esperado:** la vista previa no marca conflicto: la generación no aplica el descanso (limitación conocida, S-30). Se anota como observación, no como falla. Si lo marca, mejor. · RG-22, RG-55
- **Evidencia:** CAP.

#### E5-08 · Borde · P3 · Un turno de 24 horas después de una Noche (36 horas)
- **Pre:** mini-molde opcional del plan: tipo «24 h prueba» (D2-07), «Rotativa prueba 24 h», «Puesto prueba», turno de 24 horas generado el lunes 1 feb 2027 y libre. MD tiene la Noche del domingo 31 ene en Medicina (JM se la asigna liberando a su titular).
- **Pasos:** 1) JM asigna a MD el turno de 24 horas del 1 feb.
- **Esperado (regla literal):** se permite, porque el turno de 24 horas cruza la medianoche y no es diurno, y los dos turnos se tocan a las 08:00. MD queda 36 horas seguidas. Es el hueco de representar el turno como un tipo único: se informa como hallazgo para S-31, no como falla. Como control, A1-05 y E5-02 sí rechazan el Día después de una Noche. · RG-23, RG-24
- **Evidencia:** CAP; TXT si hay aviso.

### HU-E6 · Trazabilidad

- **Rol:** administrador, jefatura, subrogante; médico.
- **Historia:** Como jefatura, quiero reconstruir quién cambió qué y cuándo, para responder por la cobertura de cada turno.
- **Reglas de origen:** MF-013 · MF-031 · MF-032 · MF-033 · R15 · R16 · R18 · Dec. l.1456 · Dec. l.1476 · Dec. encargo (historial sin solicitudes de otros).
- **Criterios de aceptación:**
  1. Cada cambio de turnos y de solicitudes deja un evento con categoría, tipo, estado, encargado, fecha y hora de Chile.
  2. Los filtros dejan encontrar cualquier evento y distinguen cancelación, rechazo y rechazo automático.
  3. Cada rol ve el historial que le corresponde.
  4. Auditoría y CSV cuentan lo mismo que la bitácora.

#### E6-01 · Positivo · P1 · Cada cambio deja su evento
- **Pasos:** 1) JU y JM revisan la bitácora del período de cada escenario y la cotejan con la bitácora de cambios del plan.
- **Esperado:** cada acción de los flujos A a D tiene su evento: asignar, quitar y reasignar; crear, responder, aprobar, rechazar, cancelar y rechazo automático de solicitudes; publicar, abrir, postular, elegir y retirar ofertas; generar, extender y acortar. Cada uno con categoría, tipo, estado, encargado y hora de Chile. Las designaciones y la configuración no son obligatorias en la bitácora (MF-031 habla de solicitudes y turnos): si no aparecen, se anota como observación. · RG-47, RG-50
- **Evidencia:** BIT; tabla de cotejo en el informe.

#### E6-02 · Positivo · P1 · Filtros y estados de la bitácora
- **Pasos:** 1) Filtrar por categoría, tipo, estado y encargado. 2) Filtrar por estado rechazado.
- **Esperado:** cada filtro deja lo que corresponde. Con «rechazado» aparecen las canceladas, las rechazadas por la jefatura y las rechazadas automáticamente, cada una con su motivo. · RG-31, RG-47
- **Evidencia:** CAP por filtro.

#### E6-03 · Positivo · P1 · El historial de un turno según quién lo mira
- **Pasos:** 1) JU y SU abren el historial de V1 y de un turno cualquiera del servicio. 2) MU4 abre el de V1, que es suyo. 3) MU1 intenta abrir el de V1 (A4-04).
- **Esperado:** la gestión ve el historial de cualquier turno del servicio; el médico, solo el de los suyos y sin solicitudes de otros; el intento de MU1 se rechaza. · RG-34
- **Evidencia:** HIS; RED.

#### E6-04 · Positivo · P2 · El historial de solicitudes de un médico
- **Pasos:** 1) MU2 abre el historial de sus solicitudes.
- **Esperado:** aparecen las que emitió y aquellas en que fue receptor; no aparece, por ejemplo, la cobertura de MU3 sobre V4 que se rechazó automáticamente, aunque era del mismo cupo (S-15). · RG-34
- **Evidencia:** CAP.

#### E6-05 · Positivo · P2 · La auditoría muestra al encargado
- **Pasos:** 1) JU abre la auditoría de los meses de prueba.
- **Esperado:** cada turno con su titular o «vacante», y el encargado de cada asignación (manual o por generación). Si solo cubre meses pasados, N/A por ahora. · RG-48
- **Evidencia:** CAP.

#### E6-06 · Positivo · P2 · El CSV según el rol y el servicio
- **Pasos:** 1) MU2 exporta diciembre. 2) JU exporta diciembre con «solo mis turnos» y con «todo el servicio». 3) JM exporta diciembre y enero con «todo el servicio».
- **Esperado:** MU2, solo sus turnos; JU, lo que eligió; JM, solo Medicina. Todos con la columna de origen o trazabilidad, y los datos vigentes al exportar. · RG-17, RG-49
- **Evidencia:** CSV (sin transcribir RUT).

#### E6-07 · Borde · P2 · La hora de la bitácora es la de Chile
- **Pasos:** 1) Hacer una acción a una hora anotada, idealmente entre las 21:00 y las 24:00, que es cuando un huso equivocado ya cambia el día. 2) Buscar su evento.
- **Esperado:** la fecha y la hora del evento coinciden con el reloj de Chile: ni 3 horas más ni el día siguiente. · RG-50
- **Evidencia:** BIT; hora del reloj.

## 9. Matriz de trazabilidad: regla → casos

Cada regla de la sección 1 tiene al menos un caso. La matriz se generó desde los casos, así que coincide con ellos.

| Regla | Casos |
|---|---|
| RG-01 | E2-05 |
| RG-02 | D5-10, E2-05, E4-03 |
| RG-03 | E2-02, E2-03 |
| RG-04 | A1-11, A1-13, A2-06, A4-04, A4-05, B2-03, B4-03, C2-04, C3-07, C5-07, C7-06, D1-03, D2-08, D3-05, D4-06, D5-08, D6-03, D9-04, E1-01, E1-02, E1-03, E1-04, E1-10, E1-11, E1-12, E2-01 |
| RG-05 | D5-04, D5-05, E3-01, E3-02 |
| RG-06 | D1-01, D1-03, E1-04, E1-12, E1-13 |
| RG-07 | A1-12, D5-01, D5-02 |
| RG-08 | D5-01, D5-03, D5-07, D5-09, E3-03 |
| RG-09 | D5-04, D5-05, D5-06, E1-07, E1-09, E3-01 |
| RG-10 | D5-09, E1-07, E3-02, E3-03, E3-06 |
| RG-11 | E3-04, E3-05 |
| RG-12 | A1-14, B2-02, D3-03, D5-08, E1-06, E1-07 |
| RG-13 | E1-08, E1-14 |
| RG-14 | B2-03, C3-07, E1-01 |
| RG-15 | D9-04, E1-10 |
| RG-16 | D2-08, D4-06, D6-03, E1-11 |
| RG-17 | A1-11, A3-07, A4-09, B1-11, C1-10, C7-10, C8-14, D2-03, D3-01, D9-01, D9-03, E3-06, E4-01, E4-02, E4-03, E4-04, E4-05, E4-06, E4-07, E6-06 |
| RG-18 | E5-01, E5-02, E5-03, E5-04, E5-05, E5-06 |
| RG-19 | A1-01, A1-02, A1-11, A1-12, A1-13, A1-14, A3-07, D9-02, E1-02, E1-06, E4-07 |
| RG-20 | A2-01, A2-04, A2-06, A3-01, A3-04, A3-06, C6-03, D9-02, E1-02 |
| RG-21 | A1-08, A2-02, A3-05, B5-03, C7-08 |
| RG-22 | A1-05, A1-06, A3-02, E5-02, E5-07 |
| RG-23 | A1-03, A1-04, A1-05, A1-06, A3-02, A3-06, B1-03, B1-04, B1-05, B2-04, C1-05, C1-06, C1-08, C2-07, C3-04, C7-04, C8-05, D2-02, D2-07, D8-06, E5-02, E5-03, E5-04, E5-08 |
| RG-24 | A1-03, A1-07, A3-03, B1-06, C1-07, C7-05, D6-02, E5-01, E5-03, E5-05, E5-08 |
| RG-25 | A1-09, A1-10, A2-03, B1-07, B1-08, B1-09, B2-05, C1-09, C5-06, C6-07, C8-10 |
| RG-26 | B2-04, B2-05, B2-06, B4-06, C3-01, C3-04, C3-05, C8-05 |
| RG-27 | A1-05, A1-06, A1-07, A3-02, B1-03, C1-05, E5-01 |
| RG-28 | C1-01, C5-01, C6-01, C7-01, C8-01 |
| RG-29 | B1-02, B3-02, B4-02, C8-12 |
| RG-30 | C1-03, C1-04, C1-12, C2-02, C4-05, C5-05, C7-08, C8-15 |
| RG-31 | B2-07, B4-01, B4-02, B4-03, B4-04, B4-05, B4-06, B4-07, C2-08, C4-01, C4-02, C4-03, C4-04, C4-05, C5-04, C6-05, C7-09, E6-02 |
| RG-32 | B4-07, B5-01, B5-02, B5-04, C1-12, C3-05, C3-06, C8-04 |
| RG-33 | B2-01, B2-02, B3-01, B3-03, C3-01, C3-02, C5-02, C6-04, C7-02, D9-03, E1-06, E4-06 |
| RG-34 | A4-03, A4-04, A4-06, E6-03, E6-04 |
| RG-35 | A2-05, B1-01, B1-09, B1-10, C5-08, E4-04 |
| RG-36 | A2-05, B1-03, B1-04, B1-06, E5-04 |
| RG-37 | B5-01 |
| RG-38 | A1-15, B5-02, C3-05 |
| RG-39 | C1-01, C1-02, C1-10, C1-11, E4-05 |
| RG-40 | C2-01, C2-02, C2-03, C2-04, C2-05, C2-06, C2-08, C3-03, C7-02, C7-03, C7-06, C7-07, C7-11 |
| RG-41 | C1-01, C1-05, C1-06, C1-07, C1-08, C2-01, C2-07 |
| RG-42 | C3-05, C7-08 |
| RG-43 | C5-01, C5-02, C5-03, C5-07, C5-08 |
| RG-44 | C6-01, C6-02, C6-03, C6-04, C6-06, C6-07, C6-08 |
| RG-45 | C7-01, C7-02, C7-04, C7-05 |
| RG-46 | C8-01, C8-02, C8-03, C8-04, C8-05, C8-06, C8-07, C8-08, C8-09, C8-10, C8-11, C8-12, C8-13 |
| RG-47 | A1-01, A1-02, A2-01, A3-01, A4-01, A4-02, A4-05, B2-01, B3-01, B4-07, C3-01, C6-08, D7-03, E1-03, E6-01, E6-02 |
| RG-48 | A4-07, E1-03, E6-05 |
| RG-49 | A4-08, E1-05, E6-06 |
| RG-50 | A1-09, A2-03, A4-01, B1-07, B1-08, C1-09, C5-06, E6-01, E6-07 |
| RG-51 | D1-01, D1-02 |
| RG-52 | D2-01, D2-02, D2-03, D2-04, D2-05, D2-06, D2-07 |
| RG-53 | D4-01, D4-02, D4-03, D4-04, D4-05 |
| RG-54 | D3-01, D3-02, D3-03, D3-04, D3-05 |
| RG-55 | D4-01, D6-01, D6-02, D7-01, D7-02, D7-03, D7-05, D7-06, D7-07, D8-01, D8-02, D8-03, D8-04, D8-05, D8-06, E5-06, E5-07 |
| RG-56 | D7-04 |
| RG-57 | D7-08, D7-09, D7-10, D7-11 |
| RG-58 | D8-07, E1-03 |
| RG-59 | A1-01, A1-15, A1-16, A2-01, A3-01, B2-06 |
| RG-60 | E2-04 |
| RG-61 | D8-01, D8-08 |
| RG-62 | B1-01, B4-01, C1-01, C5-01 |

## 10. Resumen de cobertura

| Flujo | Historias | Casos | Positivos | Negativos | Borde | P1 | P2 | P3 |
|---|---|---|---|---|---|---|---|---|
| A · Asignación manual | 4 | 38 | 14 | 20 | 4 | 23 | 13 | 2 |
| B · Cobertura | 5 | 32 | 11 | 17 | 4 | 16 | 13 | 3 |
| C · Intercambio y otras solicitudes | 8 | 74 | 29 | 41 | 4 | 39 | 32 | 3 |
| D · Alta de Medicina | 9 | 58 | 28 | 16 | 14 | 32 | 24 | 2 |
| E · Permisos, separación y trazabilidad | 6 | 47 | 16 | 25 | 6 | 29 | 17 | 1 |
| **Total** | **32** | **249** | **98** | **119** | **32** | **139** | **99** | **11** |

**Índice de historias.**

| Historia | Título | Casos |
|---|---|---|
| HU-A1 | Asignar un médico a un cupo libre | 16 |
| HU-A2 | Sacar a un médico de un turno | 6 |
| HU-A3 | Cambiar un médico por otro | 7 |
| HU-A4 | Qué queda registrado y quién lo ve | 9 |
| HU-B1 | Pedir un cupo libre (cobertura) | 11 |
| HU-B2 | La jefatura aprueba una cobertura | 7 |
| HU-B3 | La jefatura rechaza una cobertura | 3 |
| HU-B4 | El médico cancela su solicitud | 7 |
| HU-B5 | Varios piden el mismo cupo | 4 |
| HU-C1 | Proponer un intercambio | 12 |
| HU-C2 | El receptor responde | 8 |
| HU-C3 | La jefatura resuelve el intercambio | 7 |
| HU-C4 | El emisor cancela en cada etapa | 5 |
| HU-C5 | Botar un turno propio | 8 |
| HU-C6 | Pedir un permiso | 8 |
| HU-C7 | Oferta particular | 11 |
| HU-C8 | Oferta general | 15 |
| HU-D1 | Crear el servicio | 3 |
| HU-D2 | Tipos de turno de Medicina | 8 |
| HU-D3 | Puestos de Medicina | 5 |
| HU-D4 | Las seis rotativas en el editor | 6 |
| HU-D5 | Personal y jerarquía de Medicina | 10 |
| HU-D6 | El molde de Medicina | 3 |
| HU-D7 | Vista previa y generación | 11 |
| HU-D8 | Verificación contra el calendario de referencia | 8 |
| HU-D9 | La jefatura de Medicina opera su servicio | 4 |
| HU-E1 | Permisos por rol | 14 |
| HU-E2 | Acceso, sesión y aviso sin permiso | 5 |
| HU-E3 | Cambios de rol | 6 |
| HU-E4 | Separación entre servicios | 7 |
| HU-E5 | Un médico en dos servicios: choque y descanso | 8 |
| HU-E6 | Trazabilidad | 7 |
