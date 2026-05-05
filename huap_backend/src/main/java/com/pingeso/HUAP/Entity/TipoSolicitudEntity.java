package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.type.descriptor.jdbc.TinyIntAsSmallIntJdbcType;


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

    @Column(name = "Tipo")
    private TinyIntAsSmallIntJdbcType tipo;

}
