package com.pingeso.HUAP.Security;

import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;

import java.util.Objects;

/**
 * Reglas de pertenencia que usan las lecturas acotadas por servicio y por dueño (C-17).
 *
 * <p>Se calculan siempre desde las entidades cargadas de BD, nunca desde parámetros del cliente.
 * Una solicitud es del servicio de sus turnos; si no tiene turno (un permiso), del servicio de su
 * emisor, la misma regla con que la gestión arma su bandeja (HU-SOL-02).
 */
public final class AlcanceServicio {

    private AlcanceServicio() {
    }

    /** Id del servicio del turno, o {@code null} si el turno o su servicio no están. */
    public static Long servicioDe(TurnoEntity turno) {
        return (turno != null && turno.getServicio() != null) ? turno.getServicio().getIdServicio() : null;
    }

    /** ¿El funcionario tiene una relación vigente (servicio no eliminado) con el servicio indicado? */
    public static boolean perteneceAServicio(FuncionarioEntity funcionario, Long idServicio) {
        if (funcionario == null || idServicio == null || funcionario.getServiciosFuncionario() == null) return false;
        return funcionario.getServiciosFuncionario().stream()
                .anyMatch(sf -> sf.getServicio() != null
                        && !sf.getServicio().isEliminado()
                        && idServicio.equals(sf.getServicio().getIdServicio()));
    }

    /** ¿La solicitud es del servicio indicado? Ver la regla en la descripción de la clase. */
    public static boolean solicitudEsDelServicio(SolicitudEntity solicitud, Long idServicio) {
        if (solicitud == null || idServicio == null) return false;
        Long deTurno = servicioDe(solicitud.getTurno());
        Long deTurnoReceptor = servicioDe(solicitud.getTurnoReceptor());
        if (deTurno != null || deTurnoReceptor != null) {
            return idServicio.equals(deTurno) || idServicio.equals(deTurnoReceptor);
        }
        return perteneceAServicio(solicitud.getFuncionario(), idServicio);
    }

    /** ¿El funcionario es el emisor o el receptor de la solicitud? */
    public static boolean participaEnSolicitud(SolicitudEntity solicitud, Long idFuncionario) {
        if (solicitud == null || idFuncionario == null) return false;
        return esFuncionario(solicitud.getFuncionario(), idFuncionario)
                || esFuncionario(solicitud.getFuncionarioReceptor(), idFuncionario);
    }

    private static boolean esFuncionario(FuncionarioEntity funcionario, Long idFuncionario) {
        return funcionario != null && Objects.equals(funcionario.getIdFuncionario(), idFuncionario);
    }
}
