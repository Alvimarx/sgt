package com.pingeso.HUAP.DTO;

import jakarta.validation.constraints.NotNull;
import org.hibernate.validator.constraints.Length;

public class SolicitudTurnoDTO {

    @NotNull(message = "El ID del turno solicitado no puede ser nulo.")
    private Long turnoSolicitadoId;

    @Length(max = 255, message = "El motivo no puede exceder los 255 caracteres.")
    private String motivo;

    private final String tipo = "Solicitud de cobertura";

    //getters y setters
    public Long getTurnoSolicitadoId() {
        return turnoSolicitadoId; }

    public void setTurnoSolicitadoId(Long turnoSolicitadoId) {
        this.turnoSolicitadoId = turnoSolicitadoId; }

    public String getMotivo() {
        return motivo; }

    public void setMotivo(String motivo) {
        this.motivo = motivo; }

    public String getTipo() { return tipo; }
}