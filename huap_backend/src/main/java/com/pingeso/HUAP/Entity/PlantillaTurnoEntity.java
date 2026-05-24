package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;

@Entity
@Table(
    name = "plantilla_turno",
    uniqueConstraints = @UniqueConstraint(columnNames = {"id_servicio", "nombre"}) // Evita que haya dos tipos de turno con el mismo nombre dentro del mismo servicio
)
@Getter
@Setter
@NoArgsConstructor
public class PlantillaTurnoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_plantilla_turno")
    private Long idPlantillaTurno;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_termino", nullable = false)
    private LocalTime horaTermino;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servicio", nullable = false)
    private ServicioEntity servicio;

    public PlantillaTurnoEntity(String nombre, ServicioEntity servicio, LocalTime horaInicio, LocalTime horaTermino) {
        this.nombre = nombre;
        this.servicio = servicio;
        this.horaInicio = horaInicio;
        this.horaTermino = horaTermino;
    }
}
