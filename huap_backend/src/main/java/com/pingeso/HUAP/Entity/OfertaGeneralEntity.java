package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "Oferta_General")
public class OfertaGeneralEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_OFERTA_GENERAL")
    private Long idOfertaGeneral;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_TURNO")
    private TurnoEntity turno;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_OFERTOR")
    private FuncionarioEntity ofertor;

    @Enumerated(EnumType.STRING)
    @Column(name = "Estado")
    private EstadoOferta estado;

    @Column(name = "Motivo", columnDefinition = "TEXT")
    private String motivo;

    @Column(name = "Fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Builder.Default
    @OneToMany(mappedBy = "ofertaGeneral", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<PostulacionEntity> postulaciones = new ArrayList<>();

    public enum EstadoOferta {
        PENDIENTE_APROBACION,
        ABIERTA,
        CERRADA,
        RECHAZADA
    }
}
