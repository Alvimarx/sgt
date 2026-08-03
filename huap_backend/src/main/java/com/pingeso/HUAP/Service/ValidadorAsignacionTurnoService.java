package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.TurnoEntity;
import org.springframework.stereotype.Service;

import java.time.Duration;
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
 *   <li><b>Secuencia incompatible de 12 horas</b>: si el turno candidato dura exactamente 12 horas
 *   y el funcionario ya tiene (o quedaría con) otro turno de exactamente 12 horas que termina justo
 *   cuando el candidato empieza, o que empieza justo cuando el candidato termina, se rechaza — no
 *   hay período de descanso entre ambos. Esta regla es simétrica: no importa si el turno existente
 *   o el candidato es "diurno" o "nocturno" según su nombre, solo que ambos duren 12 horas y sean
 *   adyacentes sin holgura.</li>
 * </ol>
 */
@Service
public class ValidadorAsignacionTurnoService {

    /** Duración exacta que activa la regla de secuencia incompatible (parametrizable a futuro). */
    private static final Duration DURACION_TURNO_LARGO = Duration.ofHours(12);

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

        Duration duracionNuevo = Duration.between(nuevoInicio, nuevoFin);

        for (TurnoEntity existente : turnosVigentes) {
            if (idTurnoCandidato != null && idTurnoCandidato.equals(existente.getIdTurno())) continue;
            if (existente.getDiaInicioTurno() == null || existente.getHoraInicio() == null
                    || existente.getDiaFinalTurno() == null || existente.getHoraFin() == null) continue;

            LocalDateTime existenteInicio = existente.getDiaInicioTurno().atTime(existente.getHoraInicio());
            LocalDateTime existenteFin = existente.getDiaFinalTurno().atTime(existente.getHoraFin());

            if (solapan(nuevoInicio, nuevoFin, existenteInicio, existenteFin)) {
                throw new ConflictoAsignacionException(
                        "No es posible asignar el turno a " + nombreFuncionario + " porque ya tiene otro turno "
                        + "asignado que se superpone (" + existenteInicio + " a " + existenteFin + ").");
            }

            if (esSecuencia12HorasIncompatible(nuevoInicio, nuevoFin, duracionNuevo, existenteInicio, existenteFin)) {
                boolean existenteEsAnterior = existenteFin.equals(nuevoInicio);
                String motivo = existenteEsAnterior
                        ? "tiene un turno de 12 horas inmediatamente anterior (" + existenteInicio + " a " + existenteFin
                          + "), sin período de descanso entre ambos turnos."
                        : "quedaría con un turno de 12 horas inmediatamente posterior (" + existenteInicio + " a " + existenteFin
                          + "), sin período de descanso entre ambos turnos.";
                throw new ConflictoAsignacionException(
                        "No es posible realizar la solicitud porque el funcionario " + nombreFuncionario + " " + motivo);
            }
        }
    }

    /**
     * ¿El turno candidato y el existente forman una secuencia de dos turnos de 12 horas exactas,
     * adyacentes sin holgura (uno termina exactamente cuando el otro empieza)?
     */
    private boolean esSecuencia12HorasIncompatible(
            LocalDateTime nuevoInicio, LocalDateTime nuevoFin, Duration duracionNuevo,
            LocalDateTime existenteInicio, LocalDateTime existenteFin
    ) {
        if (!duracionNuevo.equals(DURACION_TURNO_LARGO)) return false;

        Duration duracionExistente = Duration.between(existenteInicio, existenteFin);
        if (!duracionExistente.equals(DURACION_TURNO_LARGO)) return false;

        boolean existenteTerminaCuandoNuevoEmpieza = existenteFin.equals(nuevoInicio);
        boolean nuevoTerminaCuandoExistenteEmpieza = nuevoFin.equals(existenteInicio);

        return existenteTerminaCuandoNuevoEmpieza || nuevoTerminaCuandoExistenteEmpieza;
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
