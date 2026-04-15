package com.pingeso.HUAP.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class SolicitudBotarTurnoDTO {

    @NotNull(message = "La fecha de inicio no puede ser nula.")
    private LocalDateTime fechaInicio;

    @NotNull(message = "La fecha de término no puede ser nula.")
    private LocalDateTime fechaFin;

    @NotBlank(message = "El motivo no puede ser vacío.")
    private String motivo;

    @NotNull(message = "El ID del turno a botar no puede ser nulo.")
    private Long turnoId;

    // 🌟 NUEVO CAMPO 🌟
    @NotNull(message = "Debe especificar el tipo de permiso/devolución.")
    private String tipoAutorizacion;

    // Constructor vacío
    public SolicitudBotarTurnoDTO() {
    }

    // Constructor con parámetros
    public SolicitudBotarTurnoDTO(LocalDateTime fechaInicio, LocalDateTime fechaFin, String motivo, Long turnoId, String tipoAutorizacion) {
        this.fechaInicio = fechaInicio;
        this.fechaFin = fechaFin;
        this.motivo = motivo;
        this.turnoId = turnoId; // Asignar el nuevo campo
        this.tipoAutorizacion = tipoAutorizacion;
    }

    // Getters y Setters
    public LocalDateTime getFechaInicio() {
        return fechaInicio;
    }

    public void setFechaInicio(LocalDateTime fechaInicio) {
        this.fechaInicio = fechaInicio;
    }

    public LocalDateTime getFechaFin() {
        return fechaFin;
    }

    public void setFechaFin(LocalDateTime fechaFin) {
        this.fechaFin = fechaFin;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    public Long getTurnoId() {
        return turnoId;
    }

    public void setTurnoId(Long turnoId) {
        this.turnoId = turnoId;
    }

    public String getTipoAutorizacion() {
        return tipoAutorizacion;
    }

    public void setTipoAutorizacion(String tipoAutorizacion) {
        this.tipoAutorizacion = tipoAutorizacion;
    }
}