package com.pingeso.HUAP.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class SolicitudOfertaDTO {

    @NotNull(message = "El ID del turno a ofrecer no puede ser nulo.")
    private Long turnoOfrecidoId;

    private Long medicoReceptorId;

    @NotBlank(message = "El motivo no puede ser vacío.")
    private String condiciones;

    private final String tipo = "Oferta de turno";

    //getters y setters
    public Long getTurnoOfrecidoId() {
        return turnoOfrecidoId; }

    public void setTurnoOfrecidoId(Long turnoOfrecidoId) {
        this.turnoOfrecidoId = turnoOfrecidoId; }

    public Long getMedicoReceptorId() {
        return medicoReceptorId; }

    public void setMedicoReceptorId(Long medicoReceptorId) {
        this.medicoReceptorId = medicoReceptorId; }

    public String getCondiciones() {
        return condiciones; }

    public void setCondiciones(String condiciones) {
        this.condiciones = condiciones; }

    public String getTipo() { return tipo; }
}