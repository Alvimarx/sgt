package com.pingeso.HUAP.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class SolicitudIntercambioDTO {

    @NotNull(message = "El ID del turno deseado no puede ser nulo.")
    private Long turnoDeseadoId;

    @NotNull(message = "El ID del turno a intercambiar no puede ser nulo.")
    private Long turnoPropioId;

    @NotNull(message = "Debe especificar el ID del médico con quien desea intercambiar.")
    private Long medicoReceptorId;

    @NotBlank(message = "Debe especificar un motivo para el intercambio.")
    private String motivo;

    private final String tipo = "Cambio de turno";

    //getters y setters
    public Long getTurnoDeseadoId() {
        return turnoDeseadoId;
    }

    public void setTurnoDeseadoId(Long turnoDeseadoId) {
        this.turnoDeseadoId = turnoDeseadoId;
    }

    public Long getTurnoPropioId() {
        return turnoPropioId;
    }

    public void setTurnoPropioId(Long turnoPropioId) {
        this.turnoPropioId = turnoPropioId;
    }

    // --- NUEVOS GETTER Y SETTER ---
    public Long getMedicoReceptorId() {
        return medicoReceptorId;
    }

    public void setMedicoReceptorId(Long medicoReceptorId) {
        this.medicoReceptorId = medicoReceptorId;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    public String getTipo() {
        return tipo;
    }
}