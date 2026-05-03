package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "Servicio")
public class ServicioEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_servicio", unique = true, nullable = false)
    private Long idServicio;

    @Column(name = "nombre", nullable = false)
    private String nombre;

    @OneToMany(mappedBy = "servicio")
    private List<TurnoEntity> turnos = new ArrayList<>();

    @OneToMany(mappedBy = "servicio")
    private List<PlantillaEntity> plantillas = new ArrayList<>();

    @OneToMany(mappedBy = "servicio")
    private List<ServiciosFuncionarioEntity> serviciosFuncionario = new ArrayList<>();

    public ServicioEntity() {
    }

    public ServicioEntity(String nombre) {
        this.nombre = nombre;
    }

    public Long getIdServicio() {
        return idServicio;
    }

    public void setIdServicio(Long idServicio) {
        this.idServicio = idServicio;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public List<TurnoEntity> getTurnos() {
        return turnos;
    }

    public void setTurnos(List<TurnoEntity> turnos) {
        this.turnos = turnos;
    }

    public List<PlantillaEntity> getPlantillas() {
        return plantillas;
    }

    public void setPlantillas(List<PlantillaEntity> plantillas) {
        this.plantillas = plantillas;
    }

    public List<ServiciosFuncionarioEntity> getServiciosFuncionario() {
        return serviciosFuncionario;
    }

    public void setServiciosFuncionario(List<ServiciosFuncionarioEntity> serviciosFuncionario) {
        this.serviciosFuncionario = serviciosFuncionario;
    }
}