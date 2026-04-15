package com.pingeso.HUAP.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public class SolicitudPermisoDTO {

    @NotBlank(message = "Debe especificar un tipo de permiso.")
    private String tipoPermiso;

    @NotNull(message = "La fecha de inicio no puede ser nula.")
    private LocalDateTime fechaInicioPermiso;

    @NotNull(message = "La fecha de término no puede ser nula.")
    private LocalDateTime fechaTerminoPermiso;

    @NotBlank(message = "La descripción detallada del motivo no puede ser vacía.")
    private String descripcion;

    //Lista de IDs de los turnos que el médico desea liberar/afectar
    private List<Long> turnosAfectadosIds;

    // ===================================
    // Getters y Setters
    // ===================================

    public String getTipoPermiso() {
        return tipoPermiso; }

    public void setTipoPermiso(String tipoPermiso) {
        this.tipoPermiso = tipoPermiso; }

    public LocalDateTime getFechaInicioPermiso() {
        return fechaInicioPermiso; }

    public void setFechaInicioPermiso(LocalDateTime fechaInicioPermiso) {
        this.fechaInicioPermiso = fechaInicioPermiso; }

    public LocalDateTime getFechaTerminoPermiso() {
        return fechaTerminoPermiso; }

    public void setFechaTerminoPermiso(LocalDateTime fechaTerminoPermiso) {
        this.fechaTerminoPermiso = fechaTerminoPermiso; }

    public String getDescripcion() {
        return descripcion; }

    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public List<Long> getTurnosAfectadosIds() {
        return turnosAfectadosIds;
    }

    public void setTurnosAfectadosIds(List<Long> turnosAfectadosIds) {
        this.turnosAfectadosIds = turnosAfectadosIds;
    }
}