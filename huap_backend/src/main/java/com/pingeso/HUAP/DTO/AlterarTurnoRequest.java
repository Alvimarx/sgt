package com.pingeso.HUAP.DTO;

import java.time.LocalTime;

public class AlterarTurnoRequest {
    
    private Long idTurno;
    private String accion; // "DESASIGNAR", "REASIGNAR", "CAMBIAR_HORAS"
    private Long idNuevoMedico; // Para reasignación
    private LocalTime nuevaHoraInicio;
    private LocalTime nuevaHoraFin;
    private String motivo;
    private Long idAdministrador; // Quien realiza la acción

    // Getters y Setters
    public Long getIdTurno() {
        return idTurno;
    }

    public void setIdTurno(Long idTurno) {
        this.idTurno = idTurno;
    }

    public String getAccion() {
        return accion;
    }

    public void setAccion(String accion) {
        this.accion = accion;
    }

    public Long getIdNuevoMedico() {
        return idNuevoMedico;
    }

    public void setIdNuevoMedico(Long idNuevoMedico) {
        this.idNuevoMedico = idNuevoMedico;
    }

    public LocalTime getNuevaHoraInicio() {
        return nuevaHoraInicio;
    }

    public void setNuevaHoraInicio(LocalTime nuevaHoraInicio) {
        this.nuevaHoraInicio = nuevaHoraInicio;
    }

    public LocalTime getNuevaHoraFin() {
        return nuevaHoraFin;
    }

    public void setNuevaHoraFin(LocalTime nuevaHoraFin) {
        this.nuevaHoraFin = nuevaHoraFin;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    public Long getIdAdministrador() {
        return idAdministrador;
    }

    public void setIdAdministrador(Long idAdministrador) {
        this.idAdministrador = idAdministrador;
    }
}
