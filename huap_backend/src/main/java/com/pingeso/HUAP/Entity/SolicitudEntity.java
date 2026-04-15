package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "solicitudes")
public class SolicitudEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medico_solicitante_id", nullable = false)
    private PersonalEntity medicoSolicitante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "turno_id")
    private TurnoEntity turno;

    @Column(name = "tipo", length = 100)
    private String tipo;

    @Column(name = "motivo", columnDefinition = "TEXT")
    private String motivo;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "estado", length = 100)
    private String estado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medico_receptor_id")
    private PersonalEntity medicoReceptor;

    @Column(name = "turno_de_solicitante_id")
    private Long turnoDeSolicitanteId;

    @Column(name = "aceptado_medico")
    private Boolean aceptadoMedico;

    @Column(name = "fecha_inicio_permiso")
    private LocalDateTime fechaInicioPermiso;

    @Column(name = "fecha_termino_permiso")
    private LocalDateTime fechaTerminoPermiso;

    @Column(name = "tipo_autorizacion", length = 100)
    private String tipoAutorizacion;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "solicitud_turnos_afectados",
            joinColumns = @JoinColumn(name = "solicitud_id"),
            inverseJoinColumns = @JoinColumn(name = "turno_id")
    )
    private List<TurnoEntity> turnosAfectados = new ArrayList<>();

    public SolicitudEntity() {}

    public SolicitudEntity(
            PersonalEntity medicoSolicitante,
            TurnoEntity turno,
            String tipo,
            String motivo,
            LocalDateTime fechaCreacion,
            String estado,
            PersonalEntity medicoReceptor,
            Long turnoDeSolicitanteId,
            Boolean aceptadoMedico,
            LocalDateTime fechaInicioPermiso,
            LocalDateTime fechaTerminoPermiso,
            String tipoAutorizacion
    ) {
        this.medicoSolicitante = medicoSolicitante;
        this.turno = turno;
        this.tipo = tipo;
        this.motivo = motivo;
        this.fechaCreacion = fechaCreacion;
        this.estado = estado;
        this.medicoReceptor = medicoReceptor;
        this.turnoDeSolicitanteId = turnoDeSolicitanteId;
        this.aceptadoMedico = aceptadoMedico;
        this.fechaInicioPermiso = fechaInicioPermiso;
        this.fechaTerminoPermiso = fechaTerminoPermiso;
        this.tipoAutorizacion = tipoAutorizacion;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public PersonalEntity getMedicoSolicitante() {
        return medicoSolicitante;
    }

    public void setMedicoSolicitante(PersonalEntity medicoSolicitante) {
        this.medicoSolicitante = medicoSolicitante;
    }

    public TurnoEntity getTurno() {
        return turno;
    }

    public void setTurno(TurnoEntity turno) {
        this.turno = turno;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public PersonalEntity getMedicoReceptor() {
        return medicoReceptor;
    }

    public void setMedicoReceptor(PersonalEntity medicoReceptor) {
        this.medicoReceptor = medicoReceptor;
    }

    public Long getTurnoDeSolicitanteId() {
        return turnoDeSolicitanteId;
    }

    public void setTurnoDeSolicitanteId(Long turnoDeSolicitanteId) {
        this.turnoDeSolicitanteId = turnoDeSolicitanteId;
    }

    public Boolean getAceptadoMedico() {
        return aceptadoMedico;
    }

    public void setAceptadoMedico(Boolean aceptadoMedico) {
        this.aceptadoMedico = aceptadoMedico;
    }

    public LocalDateTime getFechaInicioPermiso() {
        return fechaInicioPermiso;
    }

    public void setFechaInicioPermiso(LocalDateTime fechaInicioPermiso) {
        this.fechaInicioPermiso = fechaInicioPermiso;
    }

    public LocalDateTime getFechaTerminoPermiso() {
        return fechaTerminoPermiso;
    }

    public void setFechaTerminoPermiso(LocalDateTime fechaTerminoPermiso) {
        this.fechaTerminoPermiso = fechaTerminoPermiso;
    }

    public String getTipoAutorizacion() {
        return tipoAutorizacion;
    }

        public void setTipoAutorizacion(String tipoAutorizacion) {
        this.tipoAutorizacion = tipoAutorizacion;
    }

    // Agrega los correspondientes Getters y Setters
    public List<TurnoEntity> getTurnosAfectados() {
        return turnosAfectados;
    }

    public void setTurnosAfectados(List<TurnoEntity> turnosAfectados) {
        this.turnosAfectados = turnosAfectados;
    }

    // Getters y setters...
}
