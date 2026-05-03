package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.time.LocalTime;

@Entity
@Table(name = "plantilla_turno")
public class PlantillaTurnoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_plantilla_turno")
    private Long idPlantillaTurno;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_plantilla", nullable = false)
    private PlantillaEntity plantilla;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_termino", nullable = false)
    private LocalTime horaTermino;

    @Column(name = "nombre", nullable = false, length = 255)
    private String nombre;

    public PlantillaTurnoEntity() {
    }

    public PlantillaTurnoEntity(
            PlantillaEntity plantilla,
            LocalTime horaInicio,
            LocalTime horaTermino,
            String nombre
    ) {
        this.plantilla = plantilla;
        this.horaInicio = horaInicio;
        this.horaTermino = horaTermino;
        this.nombre = nombre;
    }

    public Long getIdPlantillaTurno() {
        return idPlantillaTurno;
    }

    public void setIdPlantillaTurno(Long idPlantillaTurno) {
        this.idPlantillaTurno = idPlantillaTurno;
    }

    public PlantillaEntity getPlantilla() {
        return plantilla;
    }

    public void setPlantilla(PlantillaEntity plantilla) {
        this.plantilla = plantilla;
    }

    public LocalTime getHoraInicio() {
        return horaInicio;
    }

    public void setHoraInicio(LocalTime horaInicio) {
        this.horaInicio = horaInicio;
    }

    public LocalTime getHoraTermino() {
        return horaTermino;
    }

    public void setHoraTermino(LocalTime horaTermino) {
        this.horaTermino = horaTermino;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }
}