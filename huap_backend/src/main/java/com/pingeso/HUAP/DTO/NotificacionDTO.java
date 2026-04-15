package com.pingeso.HUAP.DTO;

import java.util.Date;

public class NotificacionDTO {

    private Long id;
    private String tipoSolicitud;
    private String mensaje;
    private String estado;
    private Date fechaEnvio;
    private Boolean leido;
    private Boolean eliminado;

    public NotificacionDTO(Long id, String tipoSolicitud, String mensaje, String estado, Date fechaEnvio, Boolean leido, Boolean eliminado) {
        this.id = id;
        this.tipoSolicitud = tipoSolicitud;
        this.mensaje = mensaje;
        this.estado = estado;
        this.fechaEnvio = fechaEnvio;
        this.leido = leido;
        this.eliminado = eliminado;
    }

    // Getters y setters
    public Long getId() { return id; }
    public String getTipoSolicitud() { return tipoSolicitud; }
    public String getMensaje() { return mensaje; }
    public String getEstado() { return estado; }
    public Date getFechaEnvio() { return fechaEnvio; }
    public Boolean getLeido() { return leido; }
    public Boolean getEliminado() { return eliminado; }

    public void setId(Long id) { this.id = id; }
    public void setTipoSolicitud(String tipoSolicitud) { this.tipoSolicitud = tipoSolicitud; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }
    public void setEstado(String estado) { this.estado = estado; }
    public void setFechaEnvio(Date fechaEnvio) { this.fechaEnvio = fechaEnvio; }
    public void setLeido(Boolean leido) { this.leido = leido; }
    public void setEliminado(Boolean eliminado) { this.eliminado = eliminado; }
}

