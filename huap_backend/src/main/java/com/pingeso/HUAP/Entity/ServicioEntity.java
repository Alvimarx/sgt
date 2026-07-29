package com.pingeso.HUAP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;

/**
 * Servicio (unidad) del hospital.
 *
 * <p>Agrupa los {@link PuestoEntity} y {@link RotativaEntity} de una unidad (p. ej. Urgencias) y
 * es el ámbito sobre el que se asignan turnos y roles de los funcionarios. Usa <b>soft-delete</b>
 * ({@code eliminado}) para conservar el histórico. Mapea la tabla {@code servicios}.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "servicios")
public class ServicioEntity {

    /** Identificador único del servicio. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_servicio", unique = true, nullable = false)
    private Long idServicio;

    /** Nombre del servicio. */
    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    /** Soft-delete: si es {@code true}, el servicio queda inactivo pero se conserva. */
    @Builder.Default
    @Column(name = "eliminado", nullable = false, columnDefinition = "bit(1) default 0")
    private boolean eliminado = false;

    /** Puestos del servicio (se eliminan en cascada al borrar el servicio). No se serializa. */
    @JsonIgnore
    @OneToMany(mappedBy = "servicio", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PuestoEntity> puestos;

    /** Rotativas del servicio (se eliminan en cascada al borrar el servicio). No se serializa. */
    @JsonIgnore
    @OneToMany(mappedBy = "servicio", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RotativaEntity> rotativa;

}
