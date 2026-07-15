package com.pingeso.HUAP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

/**
 * Una designación dentro de una planificación: una rotativa (rotativa) cubierta
 * por un funcionario en un puesto. funcionario y puesto son opcionales (se puede
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
    @JoinColumn(name = "id_rotativa", nullable = false)
    private RotativaEntity rotativa;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_funcionario", nullable = true)
    private FuncionarioEntity funcionario;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_puesto", nullable = true)
    private PuestoEntity puesto;

    public PlanificacionAsignacionEntity(
            PlanificacionEntity planificacion,
            RotativaEntity rotativa,
            FuncionarioEntity funcionario,
            PuestoEntity puesto
    ) {
        this.planificacion = planificacion;
        this.rotativa = rotativa;
        this.funcionario = funcionario;
        this.puesto = puesto;
    }
}
