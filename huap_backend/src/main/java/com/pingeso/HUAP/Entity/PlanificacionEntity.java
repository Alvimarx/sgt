package com.pingeso.HUAP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Molde reutilizable de planificación de un servicio: agrupa qué rotativas y
 * funcionarios se designan. No guarda fecha: la fecha de inicio se entrega como
 * parámetro al momento de generar ("pegar") los turnos.
 */
@Entity
@Table(
    name = "planificacion",
    uniqueConstraints = @UniqueConstraint(columnNames = {"id_servicio", "nombre"})
)
@Getter
@Setter
@NoArgsConstructor
public class PlanificacionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_planificacion")
    private Long idPlanificacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servicio", nullable = false)
    private ServicioEntity servicio;

    @Column(name = "nombre", nullable = false, length = 255)
    private String nombre;

    @JsonIgnore
    @OneToMany(mappedBy = "planificacion", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PlanificacionAsignacionEntity> asignaciones = new ArrayList<>();

    public PlanificacionEntity(ServicioEntity servicio, String nombre) {
        this.servicio = servicio;
        this.nombre = nombre;
    }
}
