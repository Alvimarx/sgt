package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "plantilla_piso")
public class PlantillaPisoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_plantilla_piso", unique = true, nullable = false)
    private Long idPlantillaPiso;

    @Column(name = "nombre", nullable = false)
    private String nombre;

    @ManyToOne
    @JoinColumn(name = "id_creador")
    private PersonalEntity creador;

    public PlantillaPisoEntity() {
    }

    // Getters y Setters
    public Long getIdPlantillaPiso() { return idPlantillaPiso; }
    public void setIdPlantillaPiso(Long idPlantillaPiso) { this.idPlantillaPiso = idPlantillaPiso; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public PersonalEntity getCreador() { return creador; }
    public void setCreador(PersonalEntity creador) { this.creador = creador; }
}