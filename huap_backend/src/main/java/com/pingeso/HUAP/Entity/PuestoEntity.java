package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor

@Entity
@Table(name = "puestos")
public class PuestoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", unique = true, nullable = false)
    private Long idPuesto;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Builder.Default
    @Column(name = "eliminado", nullable = false, columnDefinition = "bit(1) default 0")
    private boolean eliminado = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servicio", nullable = false)
    private ServicioEntity servicio;
}
