package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "Servicios_Funcionario")
public class ServiciosFuncionarioEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_servicios_funcionario", unique = true, nullable = false)
    private Long idServiciosFuncionario;

    // --- Relaciones ---

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_funcionario", nullable = false)
    private FuncionarioEntity funcionario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servicio", nullable = false)
    private ServicioEntity servicio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_rol_servicio", nullable = false)
    private RolServicioEntity rolServicio;

    // --- Constructores ---

    public ServiciosFuncionarioEntity() {
    }

    public ServiciosFuncionarioEntity(
            FuncionarioEntity funcionario,
            ServicioEntity servicio,
            RolServicioEntity rolServicio
    ) {
        this.funcionario = funcionario;
        this.servicio = servicio;
        this.rolServicio = rolServicio;
    }

    // --- Getters y Setters ---

    public Long getIdServiciosFuncionario() {
        return idServiciosFuncionario;
    }

    public void setIdServiciosFuncionario(Long idServiciosFuncionario) {
        this.idServiciosFuncionario = idServiciosFuncionario;
    }

    public FuncionarioEntity getFuncionario() {
        return funcionario;
    }

    public void setFuncionario(FuncionarioEntity funcionario) {
        this.funcionario = funcionario;
    }

    public ServicioEntity getServicio() {
        return servicio;
    }

    public void setServicio(ServicioEntity servicio) {
        this.servicio = servicio;
    }

    public RolServicioEntity getRolServicio() {
        return rolServicio;
    }

    public void setRolServicio(RolServicioEntity rolServicio) {
        this.rolServicio = rolServicio;
    }
}