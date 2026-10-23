# Supuestos y preguntas de las pruebas integrales del SGT-HUAP

Versión 1.0 · 20 de octubre de 2026

Cada supuesto llena un hueco de las reglas con la lectura más coherente con ellas. Mientras el dueño no responda, los casos se ejecutan con ese supuesto; si la respuesta cambia, cambia el resultado esperado de los casos que se indican.

## Los que más pesan

| Supuesto | Por qué importa |
|---|---|
| S-02 y S-03 · El turno de 24 h de Medicina es Día más Noche, y el editor admite dos tipos por día | Si el editor no lo admite, el flujo D se detiene en D4-02 |
| S-29 · El administrador configura Medicina sin asignarse a ella | Si no puede, el flujo D no arranca |
| S-04 · Regla de los fines de semana de Medicina | Define 14 de las 42 celdas del ciclo; se puede comprobar con el calendario real del 30 oct al 8 nov |
| S-06 y S-07 · Ventana del 21 dic al 31 ene y origen de los 42 médicos | Deciden si la verificación de Medicina sale limpia o con vacantes por choque con Urgencias |
| S-01 · «Solo el administrador» se refiere a tipos de turno, rotativas y planificación | Decide si la jefatura debe ser rechazada en esos módulos |
| S-11 · Hasta cuándo se puede retirar una oferta general | El encargo y la línea 1547 dicen cosas distintas |
| S-09 · Asignación manual sobre turnos ya empezados | Toca los reemplazos de último minuto, que en Urgencias ocurren |
| S-20 · Quien pierde un rol lo conserva hasta su próximo ingreso | Es un riesgo de seguridad que la decisión acepta |

## Lista completa

### S-01 · «Solo el administrador» (línea 1408) se refiere a tipos de turno, rotativas y planificación
- **Supuesto:** la decisión «como se recomienda: solo el administrador. Corregir el manual y retirar las tarjetas ocultas de los paneles» deja solo al administrador la creación y edición de tipos de turno, rotativas y planificación (molde y generación). El manual también se las daba a la jefatura y al subrogante (MF-024 a MF-026).
- **Por qué:** es la única decisión sin tema explícito que reserva algo al administrador y menciona tarjetas ocultas de los paneles; la otra que dice «solo el administrador» (línea 1495) es de reglas de horario. No pude leer la pregunta que la originó.
- **Afecta a:** RG-16; D2-08, D4-06, D6-03, E1-11.
- **Pregunta:** ¿a qué módulos se refiere la decisión de la línea 1408?
- **Mientras no respondas:** esos casos se ejecutan y su resultado se reporta como observación, no como FALLA.

### S-02 · El turno de 24 horas de Medicina se representa como Día más Noche
- **Supuesto:** Medicina usa dos tipos, «Día» de 08:00 a 20:00 y «Noche» de 20:00 a 08:00, que el mismo equipo hace el mismo día.
- **Por qué:** R13 nombra Día más su Noche como «24 corridas» legales; un tipo único de 08:00 a 08:00 cruza la medianoche, R13 lo trata como nocturno y deja pasar 36 horas seguidas (S-31). Además, con dos tipos se puede cambiar o cubrir solo una mitad. Detalle en la sección 3.2 de las historias.
- **Afecta a:** todo el flujo D y HU-E5.
- **Pregunta:** ¿confirmas Día más Noche? ¿Cuáles son los horarios reales de Medicina: de 08:00 a 08:00 o de 09:00 a 09:00?
- **Mientras no respondas:** Día de 08:00 a 20:00 y Noche de 20:00 a 08:00.

### S-03 · El editor de rotativas admite dos tipos el mismo día
- **Supuesto:** en un día de la rotativa se pueden pintar el Día y la Noche.
- **Por qué:** el plan de corrección describe la secuencia de una rotativa con «0, 1 o más» turnos por día (día más noche).
- **Afecta a:** D4-02 y, por arrastre, todo el flujo D.
- **Pregunta:** si el editor admite un solo tipo por día, ¿prefieres un tipo único de 24 horas (con el hueco de S-31) o doce rotativas (Día y Noche por separado, que ya no son «seis rotativas»)?
- **Mientras no respondas:** si el editor no lo permite, el flujo D se detiene en D4-02.

### S-04 · La regla de los fines de semana de Medicina
- **Supuesto:** el ciclo se lee en bloques de 6 días que abre el volante 6, seguido del 5. Cada semifijo trabaja su día si cae en el bloque; si no, compensa en el viernes, sábado o domingo libre del bloque, y quien ya venía compensando mantiene su ritmo de 6 días. Con el descanso de R13 y un viernes, un sábado y un domingo por equipo, es la única solución compatible con las 28 fechas y con el ejemplo del dueño.
- **Afecta a:** secciones 3.3 a 3.6, D4-01 y el flujo de verificación D8.
- **Pregunta:** ¿el calendario real dice equipo 4 el viernes 30 oct, 3 el sábado 31 oct, 2 el domingo 1 nov, 3 el viernes 6 nov, 2 el sábado 7 nov y 1 el domingo 8 nov? Si no, ¿con qué regla se reparten esos días?
- **Mientras no respondas:** se usa la regla deducida.

### S-05 · Los feriados no cambian el patrón
- **Supuesto:** un feriado lo cubre el equipo que toca según el patrón, y Medicina se genera sin reglas de fin de semana ni de feriado.
- **Por qué:** el lunes 12 oct, feriado, lo cubrió el equipo 1, como cualquier lunes.
- **Afecta a:** D7-07 (25 dic y 1 ene).
- **Pregunta:** ¿Medicina cambia horarios o equipos en feriados o fines de semana?
- **Mientras no respondas:** sin reglas.

### S-06 · Medicina se genera del 21 dic 2026 al 31 ene 2027
- **Supuesto:** un ciclo completo, con ancla y comienzo el lunes 21 dic (un lunes que abre ciclo) y fin el domingo 31 ene, en vez de solo diciembre.
- **Por qué:** prueba los 42 días; las 28 fechas del dato caen, día por día y con el mismo día de la semana, entre el 23 dic y el 19 ene; del 21 al 31 dic se cruza con Urgencias, lo que sirve para los choques entre servicios, y enero queda limpio. No toca octubre.
- **Afecta a:** D7, D8 y HU-E5.
- **Pregunta:** ¿te sirve generar hasta el 31 ene 2027, o lo quieres solo en diciembre?
- **Mientras no respondas:** del 21 dic al 31 ene.

### S-07 · Los 42 médicos de Medicina y de dónde salen
- **Supuesto:** 6 equipos de 7 personas, más JM, JM2, SM y MD. Se toman de funcionarios sin servicio; si no alcanzan, de médicos de Urgencias que no participan en otras pruebas.
- **Por qué:** el dato dice 7 por equipo. Si son médicos de Urgencias, los turnos de Medicina del 21 al 31 dic que choquen con sus turnos de Urgencias quedarán vacantes.
- **Afecta a:** D5-01, D7 y D8.
- **Pregunta:** ¿hay en el ambiente funcionarios sin servicio suficientes? ¿Aceptas que médicos ficticios de Urgencias queden también en Medicina después de la prueba?
- **Mientras no respondas:** primero sin servicio, después de Urgencias.

### S-08 · Los nombres de Medicina
- **Supuesto:** servicio «Medicina»; tipos «Día» y «Noche»; puestos «Medicina 1» a «Medicina 7»; rotativas «Equipo 1» a «Equipo 6»; molde «Medicina 2026-27».
- **Afecta a:** todo el flujo D.
- **Pregunta:** ¿Medicina usa otros nombres, por ejemplo rotativas «Turno I» en adelante, como Urgencias?
- **Mientras no respondas:** esos nombres.

### S-09 · Asignación manual sobre turnos ya empezados o terminados
- **Supuesto:** asignar, quitar o reasignar a mano un turno que ya empezó o terminó se rechaza, como las solicitudes.
- **Por qué:** las reglas prohíben pedir sobre turnos empezados y acortar una vigencia hacia el pasado, pero ninguna habla de la asignación manual.
- **Afecta a:** A1-09, A1-10, A2-03.
- **Pregunta:** ¿la jefatura debe poder registrar a mano un reemplazo de último minuto en un turno en curso o terminado, para que la auditoría muestre quién lo hizo de verdad?
- **Mientras no respondas:** rechazo.

### S-10 · Aprobar cuando el turno ya empezó
- **Supuesto:** una solicitud cuyo turno empezó antes de resolverse ya no se puede aprobar.
- **Afecta a:** B2-05.
- **Pregunta:** ¿una cobertura pendiente se puede aprobar con el turno en curso? ¿Debería rechazarse sola cuando el turno empieza?
- **Mientras no respondas:** no se aprueba.
- **Respuesta (23 oct):** no se aprueba, y además se cierra sola al empezar el turno (ver «Respuestas del dueño del sistema (23 oct 2026)»).

### S-11 · Hasta cuándo se retira una oferta general
- **Supuesto:** quien la publica puede retirarla mientras nadie la haya tomado, y «tomada» significa que al menos un médico postuló. Por abrir, o abierta sin postulantes, se puede retirar; con postulantes o con elegido, no.
- **Por qué:** el encargo dice «mientras nadie la haya tomado»; la línea 1547 dice «mientras nadie la haya abierto». No coinciden.
- **Afecta a:** C8-06, C8-07, C8-08, C8-09.
- **Pregunta:** ¿hasta cuándo se puede retirar: hasta que la jefatura la abre, hasta que alguien postula o hasta que la jefatura elige?
- **Mientras no respondas:** hasta que alguien postula.

### S-12 · Qué se revisa al aprobar intercambios y ofertas particulares (línea 1504)
- **Supuesto:** «revisarlo en el backend al aprobar» significa comprobar que cada turno siga siendo de quien lo entrega, y revalidar choque y descanso.
- **Por qué:** la línea no dice qué se revisa; esta lectura calza con R15 (la aprobación no pisa dueños) y con la regla de que el turno pedido es del receptor.
- **Afecta a:** RG-42; C3-05, C7-08.
- **Pregunta:** ¿qué hay que revisar al aprobar según la línea 1504?
- **Mientras no respondas:** dueño, choque y descanso.

### S-13 · Eliminar un tipo de turno usado en rotativas (línea 1513)
- **Supuesto:** «permitir con aviso, como hoy, y corregir el manual» se refiere a eliminar un tipo de turno que está en rotativas: se permite, con un aviso que nombra las rotativas afectadas. El manual decía que no se podía (MF-024).
- **Por qué:** es la decisión anterior a la de las 44 horas de las rotativas, y MF-024 es la única regla del manual que exige que el tipo no esté en rotativas.
- **Afecta a:** RG-52; D2-06.
- **Pregunta:** ¿la línea 1513 trata de eliminar tipos de turno usados en rotativas? Si no, ¿de qué?
- **Mientras no respondas:** así.

### S-14 · El CSV del médico trae solo sus turnos (línea 1476)
- **Supuesto:** «sí, sus turnos: el backend fuerza que salgan solo los del médico» es sobre la exportación CSV.
- **Afecta a:** RG-49; E1-05, E6-06.
- **Pregunta:** ¿la línea 1476 trata del CSV o de otra vista, como Mi Dashboard?
- **Mientras no respondas:** del CSV.

### S-15 · Lo que el médico ve en su historial
- **Supuesto:** en el historial de un turno suyo ve los eventos del turno (asignaciones, retiros, cambios), pero no solicitudes de otros, como una cobertura que otro pidió y canceló cuando el turno era cupo libre. En su historial de solicitudes ve las que emitió y aquellas en que fue receptor.
- **Afecta a:** A4-06, E6-03, E6-04.
- **Pregunta:** ¿el médico debe ver las solicitudes en que fue receptor? ¿Debe ver en el historial de su turno quién lo tuvo antes?
- **Mientras no respondas:** así.

### S-16 · Nombres repetidos
- **Supuesto:** no se repite el nombre de un servicio, ni el de un tipo de turno activo o de un puesto dentro del mismo servicio. Entre servicios sí se puede.
- **Por qué:** que crear un tipo con el nombre de uno eliminado lo reactive implica que el nombre identifica al tipo dentro de su servicio.
- **Afecta a:** D1-02, D2-04, D3-02.
- **Pregunta:** ¿puede haber dos servicios, dos tipos activos o dos puestos con el mismo nombre?
- **Mientras no respondas:** no.

### S-17 · El médico inactivo
- **Supuesto:** un funcionario inactivo no aparece para asignar y no se le puede asignar.
- **Afecta a:** A1-12, A3-07.
- **Pregunta:** ¿qué pasa con los turnos futuros de un médico que se inactiva? ¿Puede seguir entrando al sistema?
- **Mientras no respondas:** así; la prueba usa un médico sin turnos cercanos y no evalúa sus turnos futuros.

### S-18 · El horario de un tipo de turno reactivado
- **Supuesto:** reactivar por nombre recupera el mismo tipo, sin crear otro. D2-05 usa las mismas horas para no depender de la respuesta.
- **Afecta a:** D2-05.
- **Pregunta:** si al reactivar se escriben otras horas, ¿quedan las nuevas o las antiguas? ¿Qué pasa con los turnos ya generados con ese tipo?
- **Mientras no respondas:** no se prueba con horas distintas.

### S-19 · El médico de dos servicios
- **Supuesto:** con un servicio activo ve solo los turnos de ese servicio, aunque el choque y el descanso se validan con todos sus turnos. El aviso de choque con un turno de otro servicio da la fecha y la hora, sin más datos de ese servicio.
- **Afecta a:** E4-03, E5-01, E5-04.
- **Pregunta:** ¿debería ver en su inicio también sus turnos del otro servicio, para no pedir algo que va a chocar? ¿El aviso debe decir de qué servicio es el turno que choca?
- **Mientras no respondas:** así.

### S-20 · Quien pierde un rol lo conserva hasta su próximo ingreso
- **Supuesto:** «rigen desde el siguiente inicio de sesión» vale también al quitar permisos: un subrogante al que se le quita la subrogancia conserva sus funciones hasta salir o hasta que venza su sesión.
- **Afecta a:** E3-02, D5-04.
- **Pregunta:** ¿lo confirmas? El costo: alguien removido puede seguir aprobando durante esa sesión.
- **Mientras no respondas:** así, porque es lo que dice la decisión.

### S-21 · El receptor puede pedir algo sobre el turno que le pidieron
- **Supuesto:** si MU1 le pidió Y a MU2 en un intercambio pendiente, MU2 igual puede crear su propia solicitud sobre Y (por ejemplo, botarlo), porque la regla del turno comprometido es por funcionario. Al aprobarse una, la otra se rechaza sola.
- **Afecta a:** C1-12, C3-05.
- **Pregunta:** ¿debe bloquearse que el receptor pida algo sobre un turno que está en un intercambio que le propusieron?
- **Mientras no respondas:** se permite. Si el sistema lo bloquea, C3-05 queda N/A con esta pregunta.

### S-22 · La oferta particular sigue el ciclo del intercambio
- **Supuesto:** el receptor responde una sola vez y la jefatura resuelve después de que acepta.
- **Por qué:** la regla de responder una sola vez está escrita para el intercambio, y el manual exige la aceptación previa solo en intercambios (MF-027).
- **Afecta a:** C7-07, C7-11.
- **Pregunta:** ¿la oferta particular necesita la aprobación de la jefatura además de la aceptación del receptor?
- **Mientras no respondas:** sí.

### S-23 · Cómo se cierra una oferta general
- **Supuesto:** al elegir un postulante, las demás postulaciones se cierran como rechazadas; quien publica no postula a su propia oferta; postular dos veces avisa y no duplica; si la jefatura rechaza la apertura, la oferta se cierra.
- **Afecta a:** C8-04, C8-11, C8-12, C8-13.
- **Pregunta:** ¿algo de esto funciona distinto en el servicio?
- **Mientras no respondas:** así.

### S-24 · Fechas válidas de un permiso
- **Supuesto:** la fecha de fin no es anterior a la de inicio, y no se piden permisos para fechas pasadas.
- **Afecta a:** C6-06, C6-07.
- **Pregunta:** ¿se puede registrar un permiso pasado, por ejemplo para dejar constancia de una ausencia que ya ocurrió?
- **Mientras no respondas:** no.

### S-25 · Qué cuenta como solicitud pendiente sobre un turno
- **Supuesto:** para la regla de que no hay asignación manual sobre un turno con solicitudes pendientes, cuentan todas las que lo involucran: cobertura, botar, intercambio (de cualquiera de los dos lados), oferta particular y oferta general por abrir o abierta. La regla abarca asignar, quitar y reasignar.
- **Afecta a:** A1-08, A2-02, A3-05, B5-03, C7-08, C8-15.
- **Pregunta:** ¿un permiso pendiente que cubre la fecha de un turno también bloquea la asignación manual de ese turno?
- **Mientras no respondas:** el permiso no bloquea, porque no apunta a un turno.

### S-26 · Reasignar a la misma persona
- **Supuesto:** no es un cambio: el sistema no lo ofrece o avisa, y no deja evento en la bitácora.
- **Afecta a:** A3-04.
- **Pregunta:** ¿te basta que no se ofrezca, o quieres un aviso explícito?
- **Mientras no respondas:** cualquiera de los dos es OK; dejar un evento duplicado es FALLA.

### S-27 · La jefatura edita nombre y estado en su servicio
- **Supuesto:** la decisión solo se lo prohíbe al subrogante, así que la jefatura sí puede, dentro de su servicio.
- **Afecta a:** E1-14 y la matriz de permisos.
- **Pregunta:** ¿quién puede cambiar el nombre y el estado de un funcionario: solo el administrador, o también la jefatura de su servicio?
- **Mientras no respondas:** también la jefatura. Si el sistema lo reserva al administrador, se anota y no es FALLA.

### S-28 · Cómo se quita una jefatura
- **Supuesto:** solo el administrador puede quitar una jefatura, y ninguna regla describe cómo. La segunda jefatura de Medicina (JM2) queda como jefatura al terminar.
- **Afecta a:** E3-04 y la fila 16 de la bitácora de cambios.
- **Pregunta:** ¿cómo se quita una jefatura? ¿Debe haber un máximo por servicio, o sigue a criterio de TIC (línea 1466)?
- **Mientras no respondas:** JM2 queda.

### S-29 · Cómo configura el administrador un servicio al que no pertenece
- **Supuesto:** los módulos de administración permiten elegir el servicio sobre el que se trabaja, sin que el administrador se asigne a Medicina, cosa que MF-020 le prohíbe.
- **Afecta a:** todo el flujo D.
- **Pregunta:** si el administrador necesita estar asignado al servicio para configurarlo, ¿lo asigna otro administrador?
- **Mientras no respondas:** si no se puede, el flujo D se detiene y se pregunta.

### S-30 · La generación no aplica el descanso (línea 1436)
- **Supuesto:** como quedó como limitación conocida, una generación puede dejar a un médico de dos servicios con una Noche de Urgencias seguida de un Día de Medicina. Se registra como observación.
- **Afecta a:** E5-07 y la verificación de diciembre.
- **Pregunta:** con personal compartido entre servicios el riesgo crece. ¿Sigue siendo aceptable, o la vista previa debería al menos advertirlo?
- **Mientras no respondas:** observación, no FALLA.

### S-31 · El tipo único de 24 horas y el descanso
- **Supuesto:** un tipo de 08:00 a 08:00 cruza la medianoche y R13 no lo trata como diurno, así que una Noche que termina a las 08:00 seguida de un turno de 24 horas que empieza a las 08:00 se permite: 36 horas seguidas. Además, un horario de 08:00 a 08:00 podría guardarse como 0 horas.
- **Afecta a:** D2-07 y E5-08; es la razón de S-02.
- **Pregunta:** si algún servicio usa turnos de 24 horas como un solo tipo, ¿quieres que el sistema bloquee la Noche previa? ¿Cómo debe registrarse un horario de 08:00 a 08:00?
- **Mientras no respondas:** se reporta como hallazgo.

### S-32 · Los casos que dependen de la hora real
- **Supuesto:** los casos de turnos ya empezados y de la hora de Chile se hacen en la fecha real de la ejecución, que puede caer en octubre. Solo se intentan acciones que deben fallar, salvo B1-08, que deja una solicitud cancelada.
- **Afecta a:** A1-09, A1-10, A2-03, B1-07, B1-08, B1-09, B2-05, C1-09, C5-06, C6-07, C8-10, E6-07.
- **Pregunta:** ¿autorizas esos intentos en la fecha real, incluido B1-08?
- **Mientras no respondas:** se ejecutan todos menos B1-08, que queda N/A.

### S-33 · Medicina queda en el sistema
- **Supuesto:** el servicio, su configuración, su personal y los 588 turnos del 21 dic al 31 ene quedan después de la prueba; solo se borra lo temporal.
- **Afecta a:** limpieza de ED y EZ.
- **Pregunta:** ¿lo conservas como ambiente de prueba, o hay que inhabilitarlo y borrar sus turnos al final?
- **Mientras no respondas:** queda.

### S-34 · Una aprobación que falla al revalidar deja la solicitud pendiente
- **Supuesto:** si al aprobar el calendario ya no lo permite, la aprobación falla, no mueve nada y la solicitud sigue pendiente para que la jefatura la rechace.
- **Afecta a:** B2-04, C3-04.
- **Pregunta:** ¿debería rechazarse sola, con el motivo?
- **Mientras no respondas:** sigue pendiente. Si se rechaza sola con el motivo, también es OK.

### S-35 · La aceptación del receptor también revalida
- **Supuesto:** si al aceptar el calendario del receptor ya no lo permite, la aceptación se rechaza con aviso y la solicitud sigue pendiente.
- **Por qué:** el plan de corrección pide la misma validación al aceptar, «como aviso temprano».
- **Afecta a:** C2-07.
- **Pregunta:** ¿la aceptación se bloquea o solo advierte?
- **Mientras no respondas:** se bloquea.

### S-36 · Decisiones de la §5 sin tema identificable
- **Supuesto:** las líneas 1446 («dejar "Mis turnos", documentarlo y retirar el código del aviso»), 1530 («corregir el manual»), 1564 («corregir antes de entregar») y 1604 («corregir el texto de la pantalla y anotarlo como limitación; limitar el borrado queda para TIC») no dicen a qué regla se refieren y no se convirtieron en casos. La línea 1596 («agregar el botón en Personal del servicio») la leí como la ubicación de «Quitar subrogancia».
- **Pregunta:** ¿alguna fija una regla que deba probarse? En particular, ¿qué borrado queda sin límite según la línea 1604?
- **Mientras no respondas:** fuera del alcance.

### S-37 · Las cuentas de prueba
- **Supuesto:** ni la cuenta de administración ni la de jefatura de Urgencias que use el agente son del funcionario con id 4.
- **Pregunta:** ¿qué cuentas de administración y de jefatura de Urgencias debe usar el agente?
- **Mientras no respondas:** el agente comprueba el id antes de empezar y se detiene si es el 4.

### S-38 · El receptor de un intercambio es otra persona
- **Supuesto:** no existe el intercambio consigo mismo.
- **Afecta a:** C1-11.
- **Pregunta:** ¿confirmas que el receptor siempre es otra persona del mismo servicio?
- **Mientras no respondas:** rechazo.

## Respuestas del dueño del sistema (20 oct 2026)

| Supuesto | Respuesta | Efecto en las pruebas |
|---|---|---|
| Turno de 24 h en Medicina (S-02, S-03) | Día + Noche el mismo día | Camino principal: dos tipos de 12 h por día y equipo; el tipo único de 24 h queda como caso borde |
| Retirar una oferta general (S-11) | Hasta que alguien postule | Se mantiene lo diseñado |
| Asignación manual en un turno ya empezado (S-09) | Sí, para reemplazos | Cambia el resultado esperado: la jefatura puede asignar o cambiar a un médico en un turno en curso, y el cambio queda registrado |
| Quién configura un servicio nuevo (S-29) | El administrador | Se mantiene lo diseñado |

Pendiente: A1-08. La regla que le pasé al diseño («no se asigna a mano un turno con solicitudes pendientes») la redacté mal. Lo implementado en el cierre es que la asignación manual se acepta y rechaza sola las solicitudes pendientes de ese cupo, con el motivo «El turno fue asignado manualmente». Hay que confirmar cuál de las dos vale.

## Respuestas del dueño del sistema (23 oct 2026)

Palabras de Álvaro: «no deberían estar vigentes las solicitudes ocurridas en el pasado, pero sí yo podría poder cambiar en el sistema de turnos quién hizo el turno en el pasado como jefatura y admin».

| Supuesto | Respuesta | Efecto en las pruebas |
|---|---|---|
| Aprobar cuando el turno ya empezó (S-10) | Las solicitudes y ofertas pendientes sobre un turno que empezó dejan de estar vigentes y se cierran solas | B2-05 cambia: 409 al intentar aprobar y la solicitud aparece «Vencida». B1-08, C1-09 y C8-10 suman el vencimiento. El seed trae solicitudes y ofertas pendientes de mayo: vencen en la primera lectura, así que ya no sirven de dato de partida «pendiente» |
