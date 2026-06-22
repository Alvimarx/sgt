package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor

@Entity
@Table(name = "feriados")
public class FeriadoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_feriado", unique = true, nullable = false)
    private Long idFeriado;

    @Column(name = "fecha", unique = true, nullable = false)
    private LocalDate fecha;

    @Column(name = "descripcion", length = 150)
    private String descripcion;
}
