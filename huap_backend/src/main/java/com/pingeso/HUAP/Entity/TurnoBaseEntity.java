package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;

import java.time.LocalTime;


@Entity
@Table(name = "turno_base")
public class TurnoBaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_turno_base", unique = true, nullable = false)
    private Long idTurnoBase;

    @Column(name = "nombre")
    private String nombre;

    @ManyToOne
    @JoinColumn(name = "id_tipo_turno")
    private TipoTurnoEntity tipoTurno;

    // CAMBIO: De LocalDateTime a LocalTime
    @Column(name = "hora_inicio")
    private LocalTime horaInicio; // Para TIME (SQL)

    // CAMBIO: De LocalDateTime a LocalTime
    @Column(name = "hora_fin")
    private LocalTime horaFin; // Para TIME (SQL)

    @ManyToOne
    @JoinColumn(name = "id_servicio")
    private ServicioEntity servicio;

    @ManyToOne
    @JoinColumn(name = "id_creador")
    private PersonalEntity creador;

    public TurnoBaseEntity() {
    }

    public TurnoBaseEntity(String nombre, TipoTurnoEntity tipoTurno, LocalTime horaInicio, LocalTime horaFin, ServicioEntity servicio, PersonalEntity creador) {
        this.nombre = nombre;
        this.tipoTurno = tipoTurno;
        this.horaInicio = horaInicio;
        this.horaFin = horaFin;
        this.servicio = servicio;
        this.creador = creador;
    }

    public PersonalEntity getCreador() {
        return creador;
    }

    public void setCreador(PersonalEntity creador) {
        this.creador = creador;
    }

    public ServicioEntity getServicio() {
        return servicio;
    }

    public void setServicio(ServicioEntity servicio) {
        this.servicio = servicio;
    }

    public LocalTime getHoraFin() {
        return horaFin;
    }

    public void setHoraFin(LocalTime horaFin) {
        this.horaFin = horaFin;
    }

    public LocalTime getHoraInicio() {
        return horaInicio;
    }

    public void setHoraInicio(LocalTime horaInicio) {
        this.horaInicio = horaInicio;
    }

    public TipoTurnoEntity getTipoTurno() {
        return tipoTurno;
    }

    public void setTipoTurno(TipoTurnoEntity IDtipoTurno) {
        this.tipoTurno = IDtipoTurno;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public Long getIdTurnoBase() {
        return idTurnoBase;
    }

    public void setIdTurnoBase(Long idTurnoBase) {
        this.idTurnoBase = idTurnoBase;
    }
}