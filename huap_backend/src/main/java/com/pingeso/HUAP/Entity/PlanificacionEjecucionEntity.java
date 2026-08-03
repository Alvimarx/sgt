package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Una "puesta en vigencia" (generación) de un molde de {@link PlanificacionEntity}.
 *
 * <p>Separa el <b>ancla de rotativa</b> ({@code fechaInicioRotativa}, siempre un lunes, que fija la
 * fase del ciclo cíclico) de la <b>vigencia efectiva</b> ({@code fechaInicioEfectiva}..{@code
 * fechaFinEfectiva}, el rango real de fechas con turnos persistidos). Cada {@link TurnoEntity}
 * generado queda ligado a la ejecución que lo creó, dándole un origen inequívoco (a diferencia de
 * identificarlo solo por rotativa, que puede ser compartida por más de una planificación).
 *
 * <p>No pueden existir, para un mismo servicio, dos ejecuciones en estado {@code ACTIVA} cuyos
 * rangos efectivos se superpongan (validado en {@code PlanificacionService}). Editar una
 * planificación "desde una fecha" trunca o anula la ejecución vigente y crea una nueva, en vez de
 * mutar el rango de la existente, preservando así la trazabilidad histórica.
 */
@Entity
@Table(name = "planificacion_ejecucion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlanificacionEjecucionEntity {

    public enum EstadoEjecucion {
        ACTIVA,
        ANULADA
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ejecucion")
    private Long idEjecucion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_planificacion", nullable = false)
    private PlanificacionEntity planificacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_servicio", nullable = false)
    private ServicioEntity servicio;

    /** Lunes que fija la fase del ciclo de las rotativas de esta ejecución. */
    @Column(name = "fecha_inicio_rotativa", nullable = false)
    private LocalDate fechaInicioRotativa;

    /** Primer día con turnos reales de esta ejecución (inclusive). */
    @Column(name = "fecha_inicio_efectiva", nullable = false)
    private LocalDate fechaInicioEfectiva;

    /** Último día con turnos reales de esta ejecución (inclusive). */
    @Column(name = "fecha_fin_efectiva", nullable = false)
    private LocalDate fechaFinEfectiva;

    @Column(name = "fecha_generacion", nullable = false)
    private LocalDateTime fechaGeneracion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_funcionario_actor")
    private FuncionarioEntity actor;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoEjecucion estado = EstadoEjecucion.ACTIVA;

    /** Ids de las reglas de horario aplicadas en esta generación, separados por coma; vacío = ninguna. */
    @Column(name = "ids_reglas_aplicadas", length = 255)
    private String idsReglasAplicadas;

    public boolean isActiva() {
        return estado == EstadoEjecucion.ACTIVA;
    }
}
