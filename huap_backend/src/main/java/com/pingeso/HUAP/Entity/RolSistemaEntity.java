package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "Rol_Sistema")
public class RolSistemaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rol_sistema", unique = true, nullable = false)
    private Long idRolSistema;

    @Column(name = "nombre_rol", nullable = false)
    private String nombreRol;

    // --- Relaciones ---

    @OneToMany(mappedBy = "rolSistema")
    private List<FuncionarioEntity> funcionarios = new ArrayList<>();

    // --- Constructores ---

    public RolSistemaEntity() {
    }

    public RolSistemaEntity(String nombreRol) {
        this.nombreRol = nombreRol;
    }

    // --- Getters y Setters ---

    public Long getIdRolSistema() {
        return idRolSistema;
    }

    public void setIdRolSistema(Long idRolSistema) {
        this.idRolSistema = idRolSistema;
    }

    public String getNombreRol() {
        return nombreRol;
    }

    public void setNombreRol(String nombreRol) {
        this.nombreRol = nombreRol;
    }

    public List<FuncionarioEntity> getFuncionarios() {
        return funcionarios;
    }

    public void setFuncionarios(List<FuncionarioEntity> funcionarios) {
        this.funcionarios = funcionarios;
    }
}