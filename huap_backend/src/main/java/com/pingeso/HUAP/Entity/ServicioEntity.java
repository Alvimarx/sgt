package com.pingeso.HUAP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "servicios")
public class ServicioEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_servicio", unique = true, nullable = false)
    private Long idServicio;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    // Relación con Piso: 1 Servicio tiene muchos Pisos.
    @JsonIgnore
    @OneToMany(mappedBy = "servicio", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PisoEntity> pisos;

    @JsonIgnore
    @OneToMany(mappedBy = "servicio", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PlantillaEntity> plantilla;

}