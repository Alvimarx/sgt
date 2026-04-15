package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "pisos")
public class PisoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", unique = true, nullable = false)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "servicio_id", nullable = false)
    private ServicioEntity servicio;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "color_hexa", length = 7)
    private String colorHexa;

    // (NUEVO) Relación con la Plantilla Asignada
    // Muchos pisos pueden tener la misma plantilla
    @ManyToOne
    @JoinColumn(name = "id_plantilla_piso")
    private PlantillaPisoEntity plantillaPiso;

    public PisoEntity() {}

    public PisoEntity(ServicioEntity servicio, String nombre, String colorHexa) {
        this.servicio = servicio;
        this.nombre = nombre;
        this.colorHexa = colorHexa;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ServicioEntity getServicio() {
        return servicio;
    }

    public void setServicio(ServicioEntity servicio) {
        this.servicio = servicio;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getColorHexa() {
        return colorHexa;
    }

    public void setColorHexa(String colorHexa) {
        this.colorHexa = colorHexa;
    }

    public PlantillaPisoEntity getPlantillaPiso() {
        return plantillaPiso;
    }

    public void setPlantillaPiso(PlantillaPisoEntity plantillaPiso) {
        this.plantillaPiso = plantillaPiso;
    }
}
