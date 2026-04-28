package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Builder
@Data
@Table(name = "Notificacion")
@NoArgsConstructor
@AllArgsConstructor
@Entity

public class Notificacion2Entity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_NOTIFICACION", unique = true, nullable = false)
    private Long idNotificacion;

    @Column(name = "Estado")
    private String estado;

    @Column(name = "Fecha_envio")
    private LocalDateTime fechaEnvio;

    @Column(name = "Mensaje")
    private String mensaje;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_SOLICITUD")
    private Solicitud2Entity solicitud;
}
