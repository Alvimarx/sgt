package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "Rol_Servicio")
public class RolServicioEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rol_servicio", unique = true, nullable = false)
    private Long idRolServicio;

    @Column(name = "nombre_rol", nullable = false)
    private String nombreRol;

    // --- Relaciones ---

    @OneToMany(mappedBy = "rolServicio")
    private List<ServiciosFuncionarioEntity> serviciosFuncionario = new ArrayList<>();

    // --- Constructores ---

    public RolServicioEntity() {
    }

    public RolServicioEntity(String nombreRol) {
        this.nombreRol = nombreRol;
    }

    // --- Getters y Setters ---

    public Long getIdRolServicio() {
        return idRolServicio;
    }

    public void setIdRolServicio(Long idRolServicio) {
        this.idRolServicio = idRolServicio;
    }

    public String getNombreRol() {
        return nombreRol;
    }

    public void setNombreRol(String nombreRol) {
        this.nombreRol = nombreRol;
    }

    public List<ServiciosFuncionarioEntity> getServiciosFuncionario() {
        return serviciosFuncionario;
    }

    public void setServiciosFuncionario(List<ServiciosFuncionarioEntity> serviciosFuncionario) {
        this.serviciosFuncionario = serviciosFuncionario;
    }
}