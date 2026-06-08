package com.pingeso.HUAP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "Postulacion_Oferta")
public class PostulacionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_POSTULACION")
    private Long idPostulacion;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_OFERTA_GENERAL")
    private OfertaGeneralEntity ofertaGeneral;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_POSTULANTE")
    private FuncionarioEntity postulante;

    @Column(name = "Fecha_postulacion")
    private LocalDateTime fechaPostulacion;

    @Builder.Default
    @Column(name = "Seleccionado")
    private Boolean seleccionado = false;
}
