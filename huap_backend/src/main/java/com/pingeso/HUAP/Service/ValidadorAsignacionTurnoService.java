package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Utils.FormatoFecha;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * Componente de dominio compartido que valida si un turno puede asignarse a un funcionario dado su
 * calendario vigente, sin duplicar la lógica en cada flujo que termina asignando un turno a alguien
 * (asignación manual, solicitudes de cambio de turno, ofertas generales).
 *
 * <p>Aplica dos reglas, ambas determinadas exclusivamente por fecha, hora y duración real del turno
 * — nunca por su nombre o tipo (que son solo información complementaria, ver
 * {@code Archivo de funcionalidades.md}, corrección 6):
 * <ol>
 *   <li><b>Solapamiento</b>: dos turnos del mismo funcionario no pueden ocupar el mismo instante.
 *   El intervalo es semiabierto ([inicio, fin)): tocarse exactamente en el borde no es solape,
 *   permitiendo turnos consecutivos de duraciones distintas.</li>
 *   <li><b>Descanso post-nocturno</b> (corrección R13; reemplaza a la antigua regla simétrica de
 *   "dos turnos de 12 horas exactas adyacentes", que prohibía lo permitido y permitía lo prohibido):
 *   quien sale de un turno que cruzó la medianoche (termina la mañana del día D) no puede tener
 *   además un turno diurno (que empieza y termina dentro del mismo día) ese mismo día D — "noche
 *   seguida de día" queda prohibido, sin exigir duraciones exactas ni adyacencia exacta (los turnos
 *   reales duran 11 a 13 horas). La dirección inversa es legal: un día completo seguido del
 *   nocturno que parte esa misma tarde son 24 horas corridas permitidas, igual que dos nocturnos en
 *   días consecutivos. Se evalúa por fechas y horas reales, nunca por el nombre del tipo.</li>
 * </ol>
 */
@Service
public class ValidadorAsignacionTurnoService {

    /**
     * Excepción de negocio con el detalle exigido por la corrección 6: qué turno se intenta
     * asignar, cuál existente produce el choque, y el motivo.
     */
    public static class ConflictoAsignacionException extends RuntimeException {
        public ConflictoAsignacionException(String mensaje) {
            super(mensaje);
        }
    }

    /**
     * Valida que asignar el intervalo [{@code nuevoInicio}, {@code nuevoFin}) a un funcionario no
     * produzca ni solapamiento ni una secuencia incompatible de 12 horas contra su calendario vigente.
     *
     * @param turnosVigentes turnos actuales del funcionario (cualquier servicio), ya excluyendo los
     *                       que el propio movimiento libera (p. ej. en un intercambio, el turno que
     *                       el funcionario entrega no debe venir en esta lista).
     * @param idTurnoCandidato id del turno que se está evaluando, para no comparar el turno contra
     *                         sí mismo si ya viene incluido en {@code turnosVigentes}; puede ser null.
     * @throws ConflictoAsignacionException si hay solapamiento o secuencia incompatible de 12 horas.
     */
    public void validarAsignacion(
            String nombreFuncionario,
            LocalDateTime nuevoInicio,
            LocalDateTime nuevoFin,
            Long idTurnoCandidato,
            List<TurnoEntity> turnosVigentes
    ) {
        if (nuevoInicio == null || nuevoFin == null || turnosVigentes == null) return;

        for (TurnoEntity existente : turnosVigentes) {
            if (idTurnoCandidato != null && idTurnoCandidato.equals(existente.getIdTurno())) continue;
            if (existente.getDiaInicioTurno() == null || existente.getHoraInicio() == null
                    || existente.getDiaFinalTurno() == null || existente.getHoraFin() == null) continue;

            LocalDateTime existenteInicio = existente.getDiaInicioTurno().atTime(existente.getHoraInicio());
            LocalDateTime existenteFin = existente.getDiaFinalTurno().atTime(existente.getHoraFin());

            // P-01: el turno que choca se cita con fecha legible («mar 20 oct, 20:00 a mié 21 oct,
            // 08:00»); antes salía en ISO («2026-10-20T20:00 a 2026-10-21T08:00»).
            String turnoQueChoca = FormatoFecha.intervalo(existenteInicio, existenteFin);

            if (solapan(nuevoInicio, nuevoFin, existenteInicio, existenteFin)) {
                throw new ConflictoAsignacionException(
                        "No es posible asignar el turno a " + nombreFuncionario + " porque ya tiene otro turno "
                        + "asignado que se superpone (" + turnoQueChoca + ").");
            }

            if (esDescansoPostNocturnoViolado(nuevoInicio, nuevoFin, existenteInicio, existenteFin)) {
                throw new ConflictoAsignacionException(
                        mensajeDescansoPostNocturno(nombreFuncionario, existenteInicio, existenteFin));
            }
        }
    }

    /**
     * Solo la regla de descanso post-nocturno (R13), sin el solapamiento. La usa la asignación
     * manual ({@code GestionTurnoService}, C-04), que revisa el cruce de horario por su cuenta y
     * con su propio mensaje; el mensaje de R13 es el mismo de las solicitudes y las ofertas.
     *
     * @throws ConflictoAsignacionException si el turno queda como noche seguida de día con alguno
     *                                      de {@code turnosVigentes}.
     */
    public void validarDescansoPostNocturno(
            String nombreFuncionario,
            LocalDateTime nuevoInicio,
            LocalDateTime nuevoFin,
            Long idTurnoCandidato,
            List<TurnoEntity> turnosVigentes
    ) {
        if (nuevoInicio == null || nuevoFin == null || turnosVigentes == null) return;

        for (TurnoEntity existente : turnosVigentes) {
            if (idTurnoCandidato != null && idTurnoCandidato.equals(existente.getIdTurno())) continue;
            if (existente.getDiaInicioTurno() == null || existente.getHoraInicio() == null
                    || existente.getDiaFinalTurno() == null || existente.getHoraFin() == null) continue;

            LocalDateTime existenteInicio = existente.getDiaInicioTurno().atTime(existente.getHoraInicio());
            LocalDateTime existenteFin = existente.getDiaFinalTurno().atTime(existente.getHoraFin());

            if (esDescansoPostNocturnoViolado(nuevoInicio, nuevoFin, existenteInicio, existenteFin)) {
                throw new ConflictoAsignacionException(
                        mensajeDescansoPostNocturno(nombreFuncionario, existenteInicio, existenteFin));
            }
        }
    }

    /** Mensaje de R13, que cita el turno ya asignado con que choca el candidato. */
    private String mensajeDescansoPostNocturno(String nombreFuncionario,
            LocalDateTime existenteInicio, LocalDateTime existenteFin) {
        String turnoQueChoca = FormatoFecha.intervalo(existenteInicio, existenteFin);
        boolean existenteEsElNocturno = existenteInicio.toLocalDate().isBefore(existenteFin.toLocalDate());
        String motivo = existenteEsElNocturno
                ? "sale de su turno de noche (" + turnoQueChoca + ") la mañana de ese mismo día"
                : "saldría de ese turno de noche la misma mañana en que empieza su turno de día ("
                  + turnoQueChoca + ")";
        return "No es posible asignar el turno a " + nombreFuncionario + " porque " + motivo
                + ". Se permite un día seguido de su noche (24 horas corridas), pero no una noche seguida de día.";
    }

    /**
     * ¿Este par (candidato, existente) viola el descanso post-nocturno? Ocurre cuando uno de los
     * dos es un turno nocturno (cruza medianoche) que termina la mañana del día en que el otro —
     * un turno diurno (mismo día calendario) — comienza. Da igual cuál de los dos es el candidato:
     * tomar el día saliendo de la noche y tomar la noche que desemboca en un día ya asignado son
     * el mismo "24 invertido". No exige adyacencia exacta: un diurno que parte a las 10:00 tras
     * salir de la noche a las 09:00 sigue prohibido.
     */
    private boolean esDescansoPostNocturnoViolado(
            LocalDateTime nuevoInicio, LocalDateTime nuevoFin,
            LocalDateTime existenteInicio, LocalDateTime existenteFin
    ) {
        boolean nuevoEsNocturno = nuevoInicio.toLocalDate().isBefore(nuevoFin.toLocalDate());
        boolean existenteEsNocturno = existenteInicio.toLocalDate().isBefore(existenteFin.toLocalDate());

        if (existenteEsNocturno && !nuevoEsNocturno
                && existenteFin.toLocalDate().equals(nuevoInicio.toLocalDate())) {
            return true;
        }
        if (nuevoEsNocturno && !existenteEsNocturno
                && nuevoFin.toLocalDate().equals(existenteInicio.toLocalDate())) {
            return true;
        }
        return false;
    }

    /** Solape de dos intervalos semiabiertos [ini,fin); tocarse en el borde no cuenta como choque. */
    private boolean solapan(LocalDateTime aIni, LocalDateTime aFin, LocalDateTime bIni, LocalDateTime bFin) {
        return aIni.isBefore(bFin) && bIni.isBefore(aFin);
    }

    /**
     * Filtra de una lista de turnos vigentes aquellos cuyo id no esté en {@code idsExcluir} (para
     * simular, en un intercambio, el calendario de cada funcionario sin los turnos que están a punto
     * de dejar de ser suyos).
     */
    public List<TurnoEntity> excluyendo(List<TurnoEntity> turnos, Long... idsExcluir) {
        var excluidos = java.util.Arrays.stream(idsExcluir).filter(Objects::nonNull).toList();
        return turnos.stream().filter(t -> !excluidos.contains(t.getIdTurno())).toList();
    }
}
