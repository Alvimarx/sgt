package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "conf_tipocargo")
public class TipoCargoEntity {

    @Id
    @Column(name = "id_tipocargo")
    private Long idTipoCargo;

    @Column(name = "nombre")
    private String nombre;

    @Column(name = "clinico")
    private Integer clinico;

    @Column(name = "date_added")
    private LocalDateTime dateAdded;

    @Column(name = "modified")
    private LocalDateTime modified;

    @Column(name = "estado")
    private Integer estado;

    public TipoCargoEntity() {}

    public Long getIdTipoCargo() {
        return idTipoCargo;
    }

    public void setIdTipoCargo(Long idTipoCargo) {
        this.idTipoCargo = idTipoCargo;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public Integer getClinico() {
        return clinico;
    }

    public void setClinico(Integer clinico) {
        this.clinico = clinico;
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
