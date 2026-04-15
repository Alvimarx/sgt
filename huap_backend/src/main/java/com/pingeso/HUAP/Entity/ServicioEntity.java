package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "servicio")
public class ServicioEntity {

    @Id
    @Column(name = "id_servicio", unique = true, nullable = false)
    private Integer idServicio;

    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "id_responsable")
    private Integer idResponsable;

    @Column(name = "id_subrogante")
    private Integer idSubrogante;

    @Column(name = "estado", nullable = false)
    private Boolean estado;

// Relaciones JPA (solo lectura para estos fk)
    @ManyToOne
    @JoinColumn(
            name = "id_responsable",
            referencedColumnName = "id_personal",
            insertable = false,
            updatable = false,
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT)
    )
    private PersonalEntity responsable;

    @ManyToOne
    @JoinColumn(
            name = "id_subrogante",
            referencedColumnName = "id_personal",
            insertable = false,
            updatable = false,
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT)
    )
    private PersonalEntity subrogante;

    public ServicioEntity() {}

    public ServicioEntity(Integer idServicio, String nombre, Integer idResponsable, Integer idSubrogante, Boolean estado) {
        this.idServicio = idServicio;
        this.nombre = nombre;
        this.idResponsable = idResponsable;
        this.idSubrogante = idSubrogante;
        this.estado = estado;
    }

    public ServicioEntity(String nombre) {
        this.nombre = nombre;
        this.estado = true;
    }

    public Integer getIdServicio() {
        return idServicio;
    }

    public void setIdServicio(Integer idServicio) {
        this.idServicio = idServicio;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public Integer getIdResponsable() {
        return idResponsable;
    }

    public void setIdResponsable(Integer idResponsable) {
        this.idResponsable = idResponsable;
    }

    public Integer getIdSubrogante() {
        return idSubrogante;
    }

    public void setIdSubrogante(Integer idSubrogante) {
        this.idSubrogante = idSubrogante;
    }

    public Boolean getEstado() {
        return estado;
    }

    public void setEstado(Boolean estado) {
        this.estado = estado;
    }

    public PersonalEntity getResponsable() {
        return responsable;
    }

    public PersonalEntity getSubrogante() {
        return subrogante;
    }
}
