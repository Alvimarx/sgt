package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.util.Date;

@Entity
@Table(name = "notificacion")
public class NotificacionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "tipo_solicitud") // En BD es NULLABLE y VARCHAR(255)
    private String tipoSolicitud;

    @Column(name = "mensaje") // En BD es VARCHAR(255)
    private String mensaje;

    @Column(name = "mensaje_para_emisor") // En BD es VARCHAR(255)
    private String mensajeParaEmisor;

    @Column(name = "estado") // En BD es NULLABLE
    private String estado;

    @Column(name = "fecha_envio") // En BD es NULLABLE
    @Temporal(TemporalType.TIMESTAMP)
    private Date fechaEnvio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_emisor") // En BD es NULLABLE
    private PersonalEntity emisor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_receptor") // En BD es NULLABLE
    private PersonalEntity receptor;

    @Column(name = "leido")
    private Boolean leido;

    @Column(name = "eliminado")
    private Boolean eliminado;

    public NotificacionEntity() {}

    public NotificacionEntity(String tipoSolicitud, String mensaje, String mensajeParaEmisor, String estado, Date fechaEnvio, PersonalEntity emisor, PersonalEntity receptor, Boolean leido, Boolean eliminado) {
        this.tipoSolicitud = tipoSolicitud;
        this.mensaje = mensaje;
        this.mensajeParaEmisor = mensajeParaEmisor;
        this.estado = estado;
        this.fechaEnvio = fechaEnvio;
        this.emisor = emisor;
        this.receptor = receptor;
        this.leido = leido;
        this.eliminado = eliminado;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTipoSolicitud() {
        return tipoSolicitud;
    }

    public void setTipoSolicitud(String tipoSolicitud) {
        this.tipoSolicitud = tipoSolicitud;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public String getMensajeParaEmisor() {
        return mensajeParaEmisor;
    }

    public void setMensajeParaEmisor(String mensajeParaEmisor) {
        this.mensajeParaEmisor = mensajeParaEmisor;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public Date getFechaEnvio() {
        return fechaEnvio;
    }

    public void setFechaEnvio(Date fechaEnvio) {
        this.fechaEnvio = fechaEnvio;
    }

    public PersonalEntity getEmisor() {
        return emisor;
    }

    public void setEmisor(PersonalEntity emisor) {
        this.emisor = emisor;
    }

    public PersonalEntity getReceptor() {
        return receptor;
    }

    public void setReceptor(PersonalEntity receptor) {
        this.receptor = receptor;
    }

    public Boolean getLeido() {
        return leido;
    }

    public void setLeido(Boolean leido) {
        this.leido = leido;
    }

    public Boolean getEliminado() {
        return eliminado;
    }

    public void setEliminado(Boolean eliminado) {
        this.eliminado = eliminado;
    }
}
