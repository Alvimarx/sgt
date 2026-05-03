package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "Funcionario")
public class FuncionarioEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_funcionario", unique = true, nullable = false)
    private Long idFuncionario;

    @Column(name = "nombre", nullable = false)
    private String nombre;

    @Column(name = "apel_pat", nullable = false)
    private String apelPat;

    @Column(name = "apel_mat")
    private String apelMat;

    @Column(name = "rut", nullable = false, unique = true)
    private String rut;

    @Column(name = "clave", nullable = false)
    private String clave;

    @Column(name = "profesion")
    private String profesion;

    // --- Relaciones ---

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_rol_sistema", nullable = false)
    private RolSistemaEntity rolSistema;

    @OneToMany(mappedBy = "funcionario")
    private List<TurnoEntity> turnos = new ArrayList<>();

    @OneToMany(mappedBy = "funcionario")
    private List<ServiciosFuncionarioEntity> serviciosFuncionario = new ArrayList<>();

    // --- Constructores ---

    public FuncionarioEntity() {
    }

    public FuncionarioEntity(
            String nombre,
            String apelPat,
            String apelMat,
            String rut,
            String clave,
            String profesion,
            RolSistemaEntity rolSistema
    ) {
        this.nombre = nombre;
        this.apelPat = apelPat;
        this.apelMat = apelMat;
        this.rut = rut;
        this.clave = clave;
        this.profesion = profesion;
        this.rolSistema = rolSistema;
    }

    // --- Getters y Setters ---

    public Long getIdFuncionario() {
        return idFuncionario;
    }

    public void setIdFuncionario(Long idFuncionario) {
        this.idFuncionario = idFuncionario;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApelPat() {
        return apelPat;
    }

    public void setApelPat(String apelPat) {
        this.apelPat = apelPat;
    }

    public String getApelMat() {
        return apelMat;
    }

    public void setApelMat(String apelMat) {
        this.apelMat = apelMat;
    }

    public String getRut() {
        return rut;
    }

    public void setRut(String rut) {
        this.rut = rut;
    }

    public String getClave() {
        return clave;
    }

    public void setClave(String clave) {
        this.clave = clave;
    }

    public String getProfesion() {
        return profesion;
    }

    public void setProfesion(String profesion) {
        this.profesion = profesion;
    }

    public RolSistemaEntity getRolSistema() {
        return rolSistema;
    }

    public void setRolSistema(RolSistemaEntity rolSistema) {
        this.rolSistema = rolSistema;
    }

    public List<TurnoEntity> getTurnos() {
        return turnos;
    }

    public void setTurnos(List<TurnoEntity> turnos) {
        this.turnos = turnos;
    }

    public List<ServiciosFuncionarioEntity> getServiciosFuncionario() {
        return serviciosFuncionario;
    }

    public void setServiciosFuncionario(List<ServiciosFuncionarioEntity> serviciosFuncionario) {
        this.serviciosFuncionario = serviciosFuncionario;
    }
}