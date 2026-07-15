package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Regla de ajuste de horario por servicio (tabla única). En fines de semana y/o feriados
 * desplaza {@link #tiempoMinutos} minutos la hora de ENTRADA del tipo {@link #tipoTurnoInicio}
 * y/o la hora de SALIDA del tipo {@link #tipoTurnoFin}. Cualquiera de los dos tipos puede ser
 * null (ajuste solo de inicio o solo de fin). La lógica de aplicación vive en
 * {@code ReglaServicioService.aplicarReglas} (las reglas se seleccionan al generar).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor

@Entity
@Table(name = "reglas_horarios_turnos_servicio")
public class ReglasHorariosTurnosServicioEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_regla", unique = true, nullable = false)
    private Long idRegla;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servicio", nullable = false)
    private ServicioEntity servicio;

    @Builder.Default
    @Column(name = "eliminado", nullable = false, columnDefinition = "bit(1) default 0")
    private boolean eliminado = false;

    @Builder.Default
    @Column(name = "aplica_fin_de_semana", nullable = false)
    private boolean aplicaFinDeSemana = true;

    @Builder.Default
    @Column(name = "aplica_feriado", nullable = false)
    private boolean aplicaFeriado = true;

    // Tipo de turno cuya hora de ENTRADA (inicio) se desplaza (+tiempoMinutos). Nullable.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_tipo_turno_inicio")
    private TipoTurnoEntity tipoTurnoInicio;

    // Tipo de turno cuya hora de SALIDA (fin) se desplaza (+tiempoMinutos). Nullable.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_tipo_turno_fin")
    private TipoTurnoEntity tipoTurnoFin;

    // Desfase en minutos aplicado al inicio de tipoTurnoInicio y al fin de tipoTurnoFin.
    @Builder.Default
    @Column(name = "tiempo_minutos", nullable = false)
    private int tiempoMinutos = 0;
}
