package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "categoria_tipo_turno")
public class CategoriaTipoTurnoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_categoria_tipo_turno", unique = true, nullable = false)
    private Long idCategoriaTipoTurno;

    @Column(name = "nombre", nullable = false)
    private String nombre;

    @Column(name = "prioridad", nullable = false)
    private int prioridad;

    @ManyToOne
    @JoinColumn(name = "id_servicio")
    private ServicioEntity servicio;

    // --- Constructor Vacío ---
    public CategoriaTipoTurnoEntity() {
    }

    public CategoriaTipoTurnoEntity(String nombre, int prioridad, ServicioEntity servicio) {
        this.nombre = nombre;
        this.prioridad = prioridad;
        this.servicio = servicio;
    }

    public Long getIdCategoriaTipoTurno() {
        return idCategoriaTipoTurno;
    }

    public void setIdCategoriaTipoTurno(Long idCategoriaTipoTurno) {
        this.idCategoriaTipoTurno = idCategoriaTipoTurno;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public int getPrioridad() {
        return prioridad;
    }

    public void setPrioridad(int prioridad) {
        this.prioridad = prioridad;
    }

    public ServicioEntity getServicio() {
        return servicio;
    }

    public void setServicio(ServicioEntity servicio) {
        this.servicio = servicio;
    }
}