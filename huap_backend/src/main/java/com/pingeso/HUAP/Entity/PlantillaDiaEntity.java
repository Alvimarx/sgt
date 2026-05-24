package com.pingeso.HUAP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

// uniqueConstraints = @UniqueConstraint(columnNames = {"id_plantilla", "dia_index"})
@Entity
@Table( name = "plantilla_secuencia_dias")
@Getter
@Setter
@NoArgsConstructor
public class PlantillaDiaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_plantilladia")
    private Long idPlantillaDia;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_plantilla", nullable = false)
    private PlantillaEntity plantilla;

    // Posición 0-based dentro del patrón de la rotativa.
    @Column(name = "dia_index", nullable = false)
    private int diaIndex;

    // null = día libre en el patrón
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_plantilla_turno", nullable = true)
    private PlantillaTurnoEntity plantillaTurno;

    public PlantillaDiaEntity(PlantillaEntity plantilla, int diaIndex, PlantillaTurnoEntity plantillaTurno) {
        this.plantilla = plantilla;
        this.diaIndex = diaIndex;
        this.plantillaTurno = plantillaTurno;
    }
}
