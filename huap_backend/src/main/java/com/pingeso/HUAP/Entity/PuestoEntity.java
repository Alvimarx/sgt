package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Puesto de un servicio.
 *
 * <p>Representa una ubicación o posición dentro de un {@link ServicioEntity} a la que se asignan
 * turnos (p. ej. "Box 1", "Reanimación"). Usa <b>soft-delete</b> ({@code eliminado}) para no
 * perder las referencias históricas de los turnos que lo apuntan. Mapea la tabla {@code puestos}.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "puestos")
public class PuestoEntity {

    /** Identificador único del puesto. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", unique = true, nullable = false)
    private Long idPuesto;

    /** Nombre del puesto (único a nivel de negocio dentro del servicio). */
    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    /** Soft-delete: si es {@code true}, el puesto no aparece en las listas vigentes pero se conserva. */
    @Builder.Default
    @Column(name = "eliminado", nullable = false, columnDefinition = "bit(1) default 0")
    private boolean eliminado = false;

    /** Servicio al que pertenece el puesto. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servicio", nullable = false)
    private ServicioEntity servicio;
}
