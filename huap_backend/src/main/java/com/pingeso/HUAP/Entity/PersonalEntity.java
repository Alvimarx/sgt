package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "viewPersonal")
public class PersonalEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_personal", nullable = false)
    private Long idPersonal;

    @Column(name = "rol", length = 100)
    private String rol;

    @Column(name = "rut", length = 12)
    private String rut;

    @Column(name = "dv", length = 1)
    private String dv;

    @Column(name = "nombre", length = 100)
    private String nombre;

    @Column(name = "apel_pat", length = 100)
    private String apellidoPaterno;

    @Column(name = "apel_mat", length = 100)
    private String apellidoMaterno;

    @Column(name = "rrhh")
    private Boolean rrhh; // tinyint(1)

    @Column(name = "jefatura")
    private Integer jefatura;

    @Column(name = "id_servicio")
    private Integer idServicio;

    @Column(name = "id_tipocargo")
    private Integer idTipoCargo;

    @Column(name = "id_tipocontrato")
    private Integer idTipoContrato;

    @Column(name = "profesion")
    private Integer profesion;

    @Column(name = "clave", length = 512)
    private String clave;

    @Column(name = "estado")
    private Integer estado;

    @Column(name = "date_added")
    private LocalDateTime dateAdded;

    public PersonalEntity() {
    }

    public PersonalEntity(String nombre, String apellidoPaterno, String apellidoMaterno,
            String rut, String dv, String rol) {
        this.nombre = nombre;
        this.apellidoPaterno = apellidoPaterno;
        this.apellidoMaterno = apellidoMaterno;
        this.rut = rut;
        this.dv = dv;
        this.rol = rol;
        this.estado = 1;
        this.dateAdded = LocalDateTime.now();
    }

    public Long getIdPersonal() {
        return idPersonal;
    }

    public void setIdPersonal(Long idPersonal) {
        this.idPersonal = idPersonal;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public String getRut() {
        return rut;
    }

    public void setRut(String rut) {
        this.rut = rut;
    }

    public String getDv() {
        return dv;
    }

    public void setDv(String dv) {
        this.dv = dv;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellidoPaterno() {
        return apellidoPaterno;
    }

    public void setApellidoPaterno(String apellidoPaterno) {
        this.apellidoPaterno = apellidoPaterno;
    }

    public String getApellidoMaterno() {
        return apellidoMaterno;
    }

    public void setApellidoMaterno(String apellidoMaterno) {
        this.apellidoMaterno = apellidoMaterno;
    }

    public Boolean getRrhh() {
        return rrhh;
    }

    public void setRrhh(Boolean rrhh) {
        this.rrhh = rrhh;
    }

    public Integer getJefatura() {
        return jefatura;
    }

    public void setJefatura(Integer jefatura) {
        this.jefatura = jefatura;
    }

    public Integer getIdServicio() {
        return idServicio;
    }

    public void setIdServicio(Integer idServicio) {
        this.idServicio = idServicio;
    }

    public Integer getIdTipoCargo() {
        return idTipoCargo;
    }

    public void setIdTipoCargo(Integer idTipoCargo) {
        this.idTipoCargo = idTipoCargo;
    }

    public Integer getIdTipoContrato() {
        return idTipoContrato;
    }

    public void setIdTipoContrato(Integer idTipoContrato) {
        this.idTipoContrato = idTipoContrato;
    }

    public Integer getProfesion() {
        return profesion;
    }

    public void setProfesion(Integer profesion) {
        this.profesion = profesion;
    }

    public String getClave() {
        return clave;
    }

    public void setClave(String clave) {
        this.clave = clave;
    }

    public Integer getEstado() {
        return estado;
    }

    public void setEstado(Integer estado) {
        this.estado = estado;
    }

    public LocalDateTime getDateAdded() {
        return dateAdded;
    }

    public void setDateAdded(LocalDateTime dateAdded) {
        this.dateAdded = dateAdded;
    }
}
