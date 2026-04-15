package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "turnos_solicitados")
public class TurnoSolicitadoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(unique = true, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_solicitud") // En BD es NULLABLE
    private SolicitudEntity solicitud;

    @Column(name = "dia_inicio") // En BD se llama así
    private LocalDate diaInicio;

    @Column(name = "dia_fin") // En BD se llama así
    private LocalDate diaFin;

    public TurnoSolicitadoEntity() {
    }

    public TurnoSolicitadoEntity(SolicitudEntity solicitud, LocalDate diaInicio, LocalDate diaFin) {
        this.solicitud = solicitud;
        this.diaInicio = diaInicio;
        this.diaFin = diaFin;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public SolicitudEntity getSolicitud() {
        return solicitud;
    }

    public void setSolicitud(SolicitudEntity solicitud) {
        this.solicitud = solicitud;
    }

    public LocalDate getDiaInicio() {
        return diaInicio;
    }

    public void setDiaInicio(LocalDate diaInicio) {
        this.diaInicio = diaInicio;
    }

    public LocalDate getDiaFin() {
        return diaFin;
    }

    public void setDiaFin(LocalDate diaFin) {
        this.diaFin = diaFin;
    }
}
