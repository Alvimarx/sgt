package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;

/**
 * Tipo de turno: horario nombrado y reutilizable de un servicio.
 *
 * <p>Define un bloque horario (nombre + hora de inicio y término) dentro de un {@link ServicioEntity}.
 * Sirve de base para armar las rotativas ({@code RotativaDia} lo referencia) y para generar los turnos
 * concretos. El par ({@code servicio}, {@code nombre}) es único para no repetir dos horarios con el
 * mismo nombre en un servicio. Usa <b>soft-delete</b> ({@code eliminado}). Mapea la tabla
 * {@code tipo_turno}.
 */
@Entity
@Table(
    name = "tipo_turno",
    uniqueConstraints = @UniqueConstraint(columnNames = {"id_servicio", "nombre"}) // Evita que haya dos tipos de turno con el mismo nombre dentro del mismo servicio
)
@Getter
@Setter
@NoArgsConstructor
public class TipoTurnoEntity {

    /** Identificador único del tipo de turno. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tipo_turno")
    private Long idTipoTurno;

    /** Nombre del tipo de turno (único dentro del servicio). */
    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    /** Hora de inicio del turno. */
    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    /** Hora de término del turno (puede ser anterior a la de inicio si el turno cruza medianoche). */
    @Column(name = "hora_termino", nullable = false)
    private LocalTime horaTermino;

    /** Servicio al que pertenece el tipo de turno. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servicio", nullable = false)
    private ServicioEntity servicio;

    /** Soft-delete: si es {@code true}, el tipo de turno no aparece en el catálogo vigente. */
    @Column(name = "eliminado", nullable = false, columnDefinition = "bit(1) default 0")
    private boolean eliminado = false;

    /** Crea un tipo de turno para un servicio con su nombre y horario. */
    public TipoTurnoEntity(String nombre, ServicioEntity servicio, LocalTime horaInicio, LocalTime horaTermino) {
        this.nombre = nombre;
        this.servicio = servicio;
        this.horaInicio = horaInicio;
        this.horaTermino = horaTermino;
    }
}
