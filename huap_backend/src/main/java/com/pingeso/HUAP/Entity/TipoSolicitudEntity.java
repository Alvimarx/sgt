package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
@Builder
@Data
@Table(name = "Tipo_Solicitud")
@NoArgsConstructor
@AllArgsConstructor
@Entity

public class TipoSolicitudEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_TIPO_SOLICITUD", unique = true, nullable = false)
    private Long idTipoSolicitud;

    // 1=Permiso  2=Botar turno  3=Cobertura  4=Intercambio
    @Column(name = "Tipo")
    private Integer tipo;

}
