# R4 · Solicitar un cupo libre tocándolo directamente

**Estado: aprobado ✅** (visto bueno del usuario, 2026-08-23) · Fecha: 2026-08-23 · Alcance: solo frontend

## Qué se pidió

> "Si, como médico, aprieto un turno y hay un espacio disponible, debería poder
> solicitar turno apretando directamente en el 'cupo libre - falta cubrir', así
> como solicitando turno abajo, al igual que se puede hacer desde el calendario"

## Qué se hizo

En el detalle de un turno (sheet "Detalle del turno"), la tarjeta de vacante
que para un médico decía "Cupo libre — falta cubrir" y **no hacía nada** al
tocarla, ahora:

- dice **"Cupo libre — tocar para solicitar"**, con estilo tocable (borde
  punteado y fondo en el color acento, cursor pointer, chevron), y
- al tocarla abre el MISMO flujo del botón "Solicitar turno" de abajo: la
  solicitud de **Cobertura** (tipo 3) precargada con ese turno.

Para jefatura/subrogante/admin **nada cambió**: su tarjeta sigue siendo
"Asignar funcionario a este cupo" (asignación directa).

## Por qué así

Se reutilizó íntegro el flujo existente (`onAction("solicitar-turno", turno)`):
los dos padres del sheet (home y calendario) ya lo manejaban y terminan en
`CrearSolicitudSheet` precargado → `POST /solicitudes` con
`{idFuncionario, idTipoSolicitud: 3, motivo, idTurno}`. Cero endpoints nuevos,
cero lógica duplicada, y la solicitud sigue pasando por la aprobación de
jefatura como corresponde. NO se usó `AsignarTurnoLibreSheet` para esto: ese es
el flujo de asignación directa de jefatura (`POST /turnos/alterar`) y se salta
la aprobación.

## Cómo se hizo

Archivo único: `sgt-huap_frontend/src/components/Comun/ShiftDetail.jsx`.

1. Junto a `handleAssignVacancy`, agregar:
   ```jsx
   const handleRequestVacancy = (vacantShift) => {
       if (!vacantShift || !onAction) return;
       onAction("solicitar-turno", vacantShift);
   };
   ```
2. En el montaje de `<TeamByPuesto ...>` agregar la prop
   `onRequestVacancy={handleRequestVacancy}`, y agregar `onRequestVacancy` a la
   firma de `TeamByPuesto`.
3. En el `onClick` del botón de vacante (ancla: `onAssignVacancy?.(vacante)`),
   agregar la rama del médico:
   ```jsx
   onClick={() => {
       if (canManageAssignments) {
           onAssignVacancy?.(vacante);
       } else {
           onRequestVacancy?.(vacante);
       }
   }}
   ```
4. Estilos de la misma tarjeta para el caso `!canManageAssignments`: borde
   `1px dashed ${P2().accent}`, fondo `P2().accentSoft`, `cursor: "pointer"`
   siempre, texto "Cupo libre — tocar para solicitar" en color `#B85A60`
   (sin cursiva), círculo punteado en accent y chevron visible para ambos roles.

**Limitación conocida (sin cambio):** la rama "placeholder" de vacantes que
solo conoce un conteo (`puesto.vacantes`) sin objetos turno sigue no siendo
tocable — sin id de turno real no hay qué solicitar.

## Cómo probarlo

1. Como médico (seed: Pablo Garrido 30000070-0), abrir un día con vacantes y
   tocar la tarjeta rosada "Cupo libre — tocar para solicitar".
2. Debe abrirse "Crear solicitud" ya en el paso 2, tipo Cobertura, con el turno
   precargado. Enviar y verificar que la solicitud queda Pendiente.
3. Como jefatura (seed: Flavio Ayala 30000006-6), la misma tarjeta debe seguir
   diciendo "Asignar funcionario a este cupo" y abrir la asignación directa.
