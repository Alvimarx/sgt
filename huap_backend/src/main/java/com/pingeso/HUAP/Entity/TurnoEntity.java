package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Turno de trabajo del personal.
 *
 * <p>Representa un bloque de tiempo (fecha/hora de inicio y fin) dentro de un servicio y un puesto,
 * que puede estar asignado a un {@link FuncionarioEntity} o quedar vacante ({@code funcionario} nulo).
 * Opcionalmente se genera a partir de una {@link RotativaEntity} y tiene un {@link TipoTurnoEntity}.
 * Usa <b>soft-delete</b> ({@code eliminado}) para no perder las referencias históricas
 * (solicitudes, bitácora) que lo apuntan. Mapea la tabla {@code Turnos}.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "Turnos", indexes = {
    @Index(name = "idx_servicio_fechas", columnList = "id_servicio, dia_inicio_turno, dia_final_turno")
})
public class TurnoEntity {

    /** Identificador único del turno. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_turno", unique = true, nullable = false)
    private Long idTurno;

    /** Fecha de inicio del turno. */
    @Column(name = "dia_inicio_turno", nullable = false)
    private LocalDate diaInicioTurno;

    /** Fecha de término del turno (puede ser el mismo día o el siguiente, p. ej. turnos nocturnos). */
    @Column(name = "dia_final_turno", nullable = false)
    private LocalDate diaFinalTurno;

    /** Hora de inicio. */
    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    /** Hora de término. */
    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    /** Soft-delete: si es {@code true}, el turno no aparece en la agenda vigente pero se conserva. */
    @Builder.Default
    @Column(name = "eliminado", nullable = false, columnDefinition = "bit(1) default 0")
    private boolean eliminado = false;

    // --- Relaciones ---

    /** Funcionario asignado, o {@code null} si el turno está vacante. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_FUNCIONARIO")
    private FuncionarioEntity funcionario;

    /** Servicio al que pertenece el turno. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servicio")
    private ServicioEntity servicio;

    /** Puesto (ubicación) del turno. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_puesto")
    private PuestoEntity puesto;

    /** Rotativa con la que se generó el turno, si aplica. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_rotativa")
    private RotativaEntity rotativa;

    /** Tipo de turno (diurno, nocturno, etc.). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_tipo_turno")
    private TipoTurnoEntity tipoTurno;

    /**
     * Ejecución de planificación que generó este turno, o {@code null} si es un turno manual o fue
     * generado antes de introducirse este campo (origen "legado" — nunca se toca automáticamente
     * al deshacer/editar una ejecución posterior, ver {@link PlanificacionEjecucionEntity}).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_ejecucion")
    private PlanificacionEjecucionEntity ejecucion;

}
