package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bitacora_de_eventos")
public class EventLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_evento")
    private Long idEvento;

    @Column(name = "tipo_evento", length = 50, nullable = false)
    private String tipoEvento;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "fecha_evento")
    private LocalDateTime fechaEvento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_personal")
    private PersonalEntity usuario;

    @Column(name = "id_turno")
    private Long idTurno;

    @Column(name = "id_solicitud")
    private Long idSolicitud;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_personal_secundario")
    private PersonalEntity usuarioSecundario;

    @Column(name = "estado_anterior", length = 50)
    private String estadoAnterior;

    @Column(name = "estado_nuevo", length = 50)
    private String estadoNuevo;

    @Column(name = "motivo", columnDefinition = "TEXT")
    private String motivo;

    @Column(name = "observaciones", columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "fecha_inicio_afectada")
    private java.time.LocalDate fechaInicioAfectada;

    @Column(name = "fecha_fin_afectada")
    private java.time.LocalDate fechaFinAfectada;

    @Column(name = "activo")
    private Boolean activo;

    @Column(name = "fecha_modificacion")
    private LocalDateTime fechaModificacion;

    public EventLogEntity() {}

    // Getters y setters
    public Long getIdEvento() { return idEvento; }
    public void setIdEvento(Long idEvento) { this.idEvento = idEvento; }

    public String getTipoEvento() { return tipoEvento; }
    public void setTipoEvento(String tipoEvento) { this.tipoEvento = tipoEvento; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public LocalDateTime getFechaEvento() { return fechaEvento; }
    public void setFechaEvento(LocalDateTime fechaEvento) { this.fechaEvento = fechaEvento; }

    public PersonalEntity getUsuario() { return usuario; }
    public void setUsuario(PersonalEntity usuario) { this.usuario = usuario; }

    public Long getIdTurno() { return idTurno; }
    public void setIdTurno(Long idTurno) { this.idTurno = idTurno; }

    public Long getIdSolicitud() { return idSolicitud; }
    public void setIdSolicitud(Long idSolicitud) { this.idSolicitud = idSolicitud; }

    public PersonalEntity getUsuarioSecundario() { return usuarioSecundario; }
    public void setUsuarioSecundario(PersonalEntity usuarioSecundario) { this.usuarioSecundario = usuarioSecundario; }

    public String getEstadoAnterior() { return estadoAnterior; }
    public void setEstadoAnterior(String estadoAnterior) { this.estadoAnterior = estadoAnterior; }

    public String getEstadoNuevo() { return estadoNuevo; }
    public void setEstadoNuevo(String estadoNuevo) { this.estadoNuevo = estadoNuevo; }

    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public java.time.LocalDate getFechaInicioAfectada() { return fechaInicioAfectada; }
    public void setFechaInicioAfectada(java.time.LocalDate fechaInicioAfectada) { this.fechaInicioAfectada = fechaInicioAfectada; }

    public java.time.LocalDate getFechaFinAfectada() { return fechaFinAfectada; }
    public void setFechaFinAfectada(java.time.LocalDate fechaFinAfectada) { this.fechaFinAfectada = fechaFinAfectada; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getFechaModificacion() { return fechaModificacion; }
    public void setFechaModificacion(LocalDateTime fechaModificacion) { this.fechaModificacion = fechaModificacion; }
}
