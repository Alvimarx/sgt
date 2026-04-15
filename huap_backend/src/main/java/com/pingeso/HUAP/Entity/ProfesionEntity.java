package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "conf_profesion")
public class ProfesionEntity {

    @Id
    @Column(name = "id_profesion")
    private Long idProfesion;

    @Column(name = "nombre")
    private String nombre;

    @Column(name = "date_added")
    private LocalDateTime dateAdded;

    @Column(name = "modified")
    private LocalDateTime modified;

    @Column(name = "estado")
    private Integer estado;

    public ProfesionEntity() {}

    public Long getIdProfesion() {
        return idProfesion;
    }

    public void setIdProfesion(Long idProfesion) {
        this.idProfesion = idProfesion;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public LocalDateTime getDateAdded() {
        return dateAdded;
    }

    public void setDateAdded(LocalDateTime dateAdded) {
        this.dateAdded = dateAdded;
    }

    public LocalDateTime getModified() {
        return modified;
    }

    public void setModified(LocalDateTime modified) {
        this.modified = modified;
    }

    public Integer getEstado() {
        return estado;
    }

    public void setEstado(Integer estado) {
        this.estado = estado;
    }
}
