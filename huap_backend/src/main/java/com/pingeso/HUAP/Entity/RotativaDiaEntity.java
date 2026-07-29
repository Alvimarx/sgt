package com.pingeso.HUAP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

/**
 * Día del patrón de una {@link RotativaEntity}.
 *
 * <p>Cada fila asocia una posición ({@code diaIndex}, 0-based) de la rotativa con un
 * {@link TipoTurnoEntity}. Un {@code tipoTurno} nulo representa un <b>día libre</b>. Un mismo
 * {@code diaIndex} puede tener varias filas cuando un día lleva más de un turno (p. ej. día + noche
 * para cubrir 24 h). Mapea la tabla {@code rotativa_secuencia_dias}.
 */
@Entity
@Table(name = "rotativa_secuencia_dias")
@Getter
@Setter
@NoArgsConstructor
public class RotativaDiaEntity {

    /** Identificador único de la fila. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rotativa_dia")
    private Long idRotativaDia;

    /** Rotativa a la que pertenece este día. No se serializa. */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_rotativa", nullable = false)
    private RotativaEntity rotativa;

    /** Posición 0-based dentro del patrón de la rotativa. */
    @Column(name = "dia_index", nullable = false)
    private int diaIndex;

    /** Tipo de turno de este día; {@code null} = día libre. Se carga con {@code EAGER}. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_tipo_turno", nullable = true)
    private TipoTurnoEntity tipoTurno;

    /** Crea un día del patrón en la posición {@code diaIndex} con un tipo de turno ({@code null} = libre). */
    public RotativaDiaEntity(RotativaEntity rotativa, int diaIndex, TipoTurnoEntity tipoTurno) {
        this.rotativa = rotativa;
        this.diaIndex = diaIndex;
        this.tipoTurno = tipoTurno;
    }
}
