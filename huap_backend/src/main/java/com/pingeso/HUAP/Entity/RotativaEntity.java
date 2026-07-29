package com.pingeso.HUAP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Rotativa: patrón cíclico de turnos de un servicio.
 *
 * <p>Define, mediante su {@link #secuenciaDias secuencia de días} ({@link RotativaDiaEntity}), qué
 * turno corresponde a cada día a lo largo de {@code semanas} semanas. Se usa como plantilla para
 * generar los turnos de una planificación. Usa <b>soft-delete</b> ({@code eliminado}).
 * Mapea la tabla {@code rotativa}.
 */
@Entity
@Table(name = "rotativa")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RotativaEntity {

    /** Identificador único de la rotativa. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rotativa")
    private Long idRotativa;

    /** Servicio al que pertenece la rotativa. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servicio", nullable = false)
    private ServicioEntity servicio;

    /** Nombre de la rotativa (único dentro del servicio). */
    @Column(name = "nombre", nullable = false, length = 255)
    private String nombre;

    /** Número de semanas que cubre el patrón (la secuencia debe tener {@code semanas × 7} días). */
    @Column(name = "semanas", nullable = false)
    private Byte semanas;

    /** Soft-delete: si es {@code true}, la rotativa no aparece en las listas vigentes. */
    @Column(name = "eliminado", nullable = false, columnDefinition = "bit(1) default 0")
    private boolean eliminado = false;

    /**
     * Secuencia de días del patrón, ordenada por {@code diaIndex}. Se elimina en cascada con la
     * rotativa. Un mismo {@code diaIndex} puede tener varias filas (p. ej. día + noche); un día
     * sin turno es libre. No se serializa directamente.
     */
    @JsonIgnore
    @OneToMany(mappedBy = "rotativa", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("diaIndex ASC")
    private List<RotativaDiaEntity> secuenciaDias = new ArrayList<>();

    /** Crea una rotativa para un servicio con su nombre y cantidad de semanas (sin secuencia). */
    public RotativaEntity(ServicioEntity servicio, String nombre, Byte semanas) {
        this.servicio = servicio;
        this.nombre = nombre;
        this.semanas = semanas;
    }
}
