package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "plantilla")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlantillaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_plantilla")
    private Long idPlantilla;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servicio", nullable = false)
    private ServicioEntity servicio;

    @Column(name = "nombre", nullable = false, length = 255)
    private String nombre;

    @Column(name = "semanas", nullable = false)
    private Byte semanas;

    @OneToMany(
            mappedBy = "plantilla",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<PlantillaTurnoEntity> turnos = new ArrayList<>();

    public PlantillaEntity(ServicioEntity servicio, String nombre, Byte semanas) {
        this.servicio = servicio;
        this.nombre = nombre;
        this.semanas = semanas;
    }

    public void addTurno(PlantillaTurnoEntity turno) {
        turnos.add(turno);
        turno.setPlantilla(this);
    }
    
    public void removeTurno(PlantillaTurnoEntity turno) {
        turnos.remove(turno);
        turno.setPlantilla(null);
    }
}