# R13 · (bug GRAVE) Regla de descanso: 24 corridas sí, "24 invertido" no

**Estado: pendiente de visto bueno** · Fecha: 2026-08-25 · Alcance: solo backend

## Qué se pidió

> "Hay un error GRAVE: la gente puede pedir 12hrs noche si tiene 12hrs día
> previo [correcto], pero no puede pedir 12hrs día si hizo 12 noche anterior
> (se pueden hacer 24, pero no 24hrs 'invertido')"

La regla del servicio: **día seguido de su noche** (24 horas corridas) es
legal; **noche seguida del día siguiente** (terminas de amanecida y entras al
diurno) está prohibido.

## Diagnóstico: la regla implementada era doblemente incorrecta

La validación vivía en `ValidadorAsignacionTurnoService` (compartida por
solicitudes, asignación manual de jefatura y ofertas generales) como
"secuencia incompatible de 12 horas", y fallaba en las dos direcciones:

1. **Era simétrica a propósito** (su javadoc lo declaraba): bloqueaba
   cualquier par de turnos pegados… incluyendo el 24 corrido **legal**
   (día→noche).
2. **Solo se activaba con turnos de exactamente 12 horas y exactamente
   adyacentes.** Los turnos reales del servicio duran 13h (noche 20:00–09:00)
   y 11h (día 09:00–20:00): la regla **nunca se disparaba** con ellos, y el
   "24 invertido" pasaba limpio. Ese es el error grave observado.

## Qué se hizo

Se reemplazó esa regla por **"descanso post-nocturno"**, asimétrica y sin
exigencia de duraciones:

> Un turno **nocturno** (cruza la medianoche) que termina la mañana del día D
> es incompatible con un turno **diurno** (empieza y termina dentro del mismo
> día) de ese mismo día D — sin importar cuál de los dos se está pidiendo, ni
> cuánto duren, ni si quedan huecos de una o dos horas entre ambos.

Explícitamente permitido: día completo + la noche que parte esa misma tarde
(24 corridas), y noches en días consecutivos (descansas el día de por medio).
Explícitamente prohibido: tomar el diurno saliendo de la noche **y también**
tomar una noche que desemboca en un diurno que ya tienes (el mismo invertido,
visto desde el otro lado). Nocturno/diurno se determina por fechas y horas
reales, nunca por el nombre del tipo de turno.

Decisión de alcance (documentada en el código): un diurno que parte a las
10:00 tras salir de la noche a las 09:00 **también se rechaza** — dos horas de
descanso no convierten el invertido en legal. Si el servicio quisiera un
umbral de descanso mínimo en horas, es un ajuste puntual del helper.

## Dónde rige (sin cambios extra)

El validador es compartido: la regla nueva aplica automáticamente a
**solicitudes** (crear y aprobar — la aprobación revalida siempre),
**asignación manual** de jefatura y **ofertas generales**. El mensaje de error
explica la regla y, gracias a R12, el frontend ahora lo muestra tal cual.

El filtro "Disponibles" del home (R9) ya ocultaba el diurno post-noche, así
que frontend y backend quedan coherentes.

## Archivos

- `huap_backend/.../Service/ValidadorAsignacionTurnoService.java` — regla
  reescrita (`esDescansoPostNocturnoViolado` reemplaza a
  `esSecuencia12HorasIncompatible`), javadoc actualizado, mensaje nuevo.
- `huap_backend/.../test/.../ValidadorAsignacionTurnoServiceTest.java` —
  suite reescrita a la semántica correcta (12 tests): invertido rechazado en
  ambas direcciones y con los horarios reales 13h/11h; 24 corridas y noches
  consecutivas permitidas; descanso corto del mismo día rechazado.

Validación: 264/264 tests unitarios verdes (los únicos que fallan en el
ambiente de desarrollo son los de integración con Testcontainers, que
requieren daemon Docker; conviene correrlos en la otra máquina tras aplicar
el lote: `./mvnw test`).

## Cómo probarlo

1. Con un médico que tiene NOCHE el día X: solicitar el cupo de DÍA del X+1 →
   debe rechazarse con el mensaje de la regla (desde cualquier flujo: cobertura,
   asignación manual de jefatura, intercambio).
2. Con un médico que tiene DÍA el día X: solicitar la NOCHE del mismo X → debe
   permitirse (24 corridas).
3. Noche el X y noche el X+1 → permitido.
