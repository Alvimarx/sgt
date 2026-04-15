package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "plantilla_piso_linea")
public class PlantillaPisoLineaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_plantilla_linea", unique = true, nullable = false)
    private Long idPlantillaLinea;

    @ManyToOne
    @JoinColumn(name = "id_plantilla_piso", nullable = false)
    private PlantillaPisoEntity plantillaPiso;

    @Column(name = "nombre_linea", nullable = false)
    private String nombreLinea;

    @Column(name = "orden", nullable = false)
    private int orden;

    // Mapeamos el JSON Array de 7 elementos como String
    @Column(name = "matriz_semana", columnDefinition = "json")
    private String matrizSemana;

    public PlantillaPisoLineaEntity() {
    }

    // Getters y Setters...
    public Long getIdPlantillaLinea() { return idPlantillaLinea; }
    public void setIdPlantillaLinea(Long idPlantillaLinea) { this.idPlantillaLinea = idPlantillaLinea; }

    public PlantillaPisoEntity getPlantillaPiso() { return plantillaPiso; }
    public void setPlantillaPiso(PlantillaPisoEntity plantillaPiso) { this.plantillaPiso = plantillaPiso; }

    public String getNombreLinea() { return nombreLinea; }
    public void setNombreLinea(String nombreLinea) { this.nombreLinea = nombreLinea; }

    public int getOrden() { return orden; }
    public void setOrden(int orden) { this.orden = orden; }

    public String getMatrizSemana() { return matrizSemana; }
    public void setMatrizSemana(String matrizSemana) { this.matrizSemana = matrizSemana; }
}