package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

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

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_turno", unique = true, nullable = false)
    private Long idTurno;

    @Column(name = "dia_inicio_turno", nullable = false)
    private LocalDate diaInicioTurno;

    @Column(name = "dia_final_turno", nullable = false)
    private LocalDate diaFinalTurno;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    @Builder.Default
    @Column(name = "eliminado", nullable = false)
    private boolean eliminado = false;

    // --- Relaciones ---

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_FUNCIONARIO")
    private FuncionarioEntity funcionario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servicio")
    private ServicioEntity servicio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_puesto")
    private PuestoEntity puesto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_plantilla")
    private PlantillaEntity plantilla;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_tipo_turno")
    private PlantillaTurnoEntity tipoTurno;

}