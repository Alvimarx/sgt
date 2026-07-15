package com.pingeso.HUAP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

// uniqueConstraints = @UniqueConstraint(columnNames = {"id_rotativa", "dia_index"})
@Entity
@Table( name = "rotativa_secuencia_dias")
@Getter
@Setter
@NoArgsConstructor
public class RotativaDiaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rotativa_dia")
    private Long idRotativaDia;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_rotativa", nullable = false)
    private RotativaEntity rotativa;

    // Posición 0-based dentro del patrón de la rotativa.
    @Column(name = "dia_index", nullable = false)
    private int diaIndex;

    // null = día libre en el patrón
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_tipo_turno", nullable = true)
    private TipoTurnoEntity tipoTurno;

    public RotativaDiaEntity(RotativaEntity rotativa, int diaIndex, TipoTurnoEntity tipoTurno) {
        this.rotativa = rotativa;
        this.diaIndex = diaIndex;
        this.tipoTurno = tipoTurno;
    }
}
