package com.pingeso.HUAP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

/**
 * Una designación dentro de una planificación: una rotativa (plantilla) cubierta
 * por un funcionario en un piso. funcionario y piso son opcionales (se puede
 * colocar la rotativa antes de decidir quién la cubre o dónde).
 */
@Entity
@Table(name = "planificacion_asignacion")
@Getter
@Setter
@NoArgsConstructor
public class PlanificacionAsignacionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_asignacion")
    private Long idAsignacion;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_planificacion", nullable = false)
    private PlanificacionEntity planificacion;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_plantilla", nullable = false)
    private PlantillaEntity plantilla;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_funcionario", nullable = true)
    private FuncionarioEntity funcionario;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_piso", nullable = true)
    private PisoEntity piso;

    public PlanificacionAsignacionEntity(
            PlanificacionEntity planificacion,
            PlantillaEntity plantilla,
            FuncionarioEntity funcionario,
            PisoEntity piso
    ) {
        this.planificacion = planificacion;
        this.plantilla = plantilla;
        this.funcionario = funcionario;
        this.piso = piso;
    }
}
