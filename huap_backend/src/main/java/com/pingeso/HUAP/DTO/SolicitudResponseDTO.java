package com.pingeso.HUAP.DTO;

import java.time.LocalDateTime;
import java.util.List;

public class SolicitudResponseDTO {

    private Long id;
    private String tipo;
    private String estado;
    private String motivo;
    private LocalDateTime fechaCreacion;

    private TurnoDetailDTO turno;

    private MedicoDTO medicoSolicitante;
    private MedicoDTO medicoReceptor;

    private TurnoDetailDTO turnoPropio;
    private TurnoDetailDTO turnoDeseado;

    private Boolean aceptadoMedico;

    private LocalDateTime fechaInicioPermiso;
    private LocalDateTime fechaTerminoPermiso;

    private List<TurnoDetailDTO> turnosAfectados;

    private String tipoAutorizacion;


    //getters
    public Long getId() { return id; }
    public String getTipo() { return tipo; }
    public String getEstado() { return estado; }
    public String getMotivo() { return motivo; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public TurnoDetailDTO getTurno() { return turno; }
    public MedicoDTO getMedicoSolicitante() { return medicoSolicitante; }
    public MedicoDTO getMedicoReceptor() { return medicoReceptor; }
    public TurnoDetailDTO getTurnoPropio() { return turnoPropio; }
    public TurnoDetailDTO getTurnoDeseado() { return turnoDeseado; }
    public Boolean getAceptadoMedico() { return aceptadoMedico; }
    public LocalDateTime getFechaInicioPermiso() { return fechaInicioPermiso; }
    public LocalDateTime getFechaTerminoPermiso() { return fechaTerminoPermiso; }

    public List<TurnoDetailDTO> getTurnosAfectados() { return turnosAfectados; }
    public String getTipoAutorizacion() { return tipoAutorizacion; }

    //setters
    public void setId(Long id) { this.id = id; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public void setEstado(String estado) { this.estado = estado; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public void setTurno(TurnoDetailDTO turno) { this.turno = turno; }
    public void setMedicoSolicitante(MedicoDTO medicoSolicitante) { this.medicoSolicitante = medicoSolicitante; }
    public void setMedicoReceptor(MedicoDTO medicoReceptor) { this.medicoReceptor = medicoReceptor; }
    public void setTurnoPropio(TurnoDetailDTO turnoPropio) { this.turnoPropio = turnoPropio; }
    public void setTurnoDeseado(TurnoDetailDTO turnoDeseado) { this.turnoDeseado = turnoDeseado; }
    public void setAceptadoMedico(Boolean aceptadoMedico) { this.aceptadoMedico = aceptadoMedico; }
    public void setFechaInicioPermiso(LocalDateTime fechaInicioPermiso) { this.fechaInicioPermiso = fechaInicioPermiso; }
    public void setFechaTerminoPermiso(LocalDateTime fechaTerminoPermiso) { this.fechaTerminoPermiso = fechaTerminoPermiso; }

    public void setTurnosAfectados(List<TurnoDetailDTO> turnosAfectados) { this.turnosAfectados = turnosAfectados; }
    public void setTipoAutorizacion(String tipoAutorizacion) { this.tipoAutorizacion = tipoAutorizacion; }
}