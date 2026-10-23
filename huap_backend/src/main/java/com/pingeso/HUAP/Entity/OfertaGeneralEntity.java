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

    /**
     * Estados de la oferta. Se guardan por nombre en la columna {@code Estado}, un enum de MySQL
     * que debe traer los mismos valores: RETIRADA llegó con la migración V3
     * ({@code BaseDatosMySQL/migraciones/V3__oferta_retirada.sql}).
     */
    public enum EstadoOferta {
        PENDIENTE_APROBACION,
        ABIERTA,
        CERRADA,
        RECHAZADA,
        /**
         * C-16: su ofertor la retiró mientras nadie había postulado, pendiente de apertura o ya
         * abierta (la decisión del 20 oct reemplazó a la del 17 oct, «mientras nadie la abra»).
         */
        RETIRADA;

        /**
         * C-16: una oferta rechazada o retirada, fuera de la gestión y del ADMINISTRADOR, solo la
         * ve quien la publicó.
         */
        public boolean soloLaVeSuOfertor() {
            return this == RECHAZADA || this == RETIRADA;
        }

        /**
         * C-16 (20 oct): ¿su ofertor todavía puede retirarla en este estado? Pendiente de apertura
         * o abierta; cerrada (el turno ya se asignó), rechazada y retirada, nunca. Además la oferta
         * no debe tener ninguna postulación: eso lo revisa {@code OfertaGeneralService.retirarOferta}.
         */
        public boolean admiteRetiro() {
            return this == PENDIENTE_APROBACION || this == ABIERTA;
        }
    }
}
