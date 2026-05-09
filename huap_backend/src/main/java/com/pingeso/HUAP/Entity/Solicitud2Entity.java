package com.pingeso.HUAP.Entity;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Builder
@Data
@Table(name = "Solicitudes")
@NoArgsConstructor
@AllArgsConstructor
@Entity

public class Solicitud2Entity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_SOLICITUD", unique = true, nullable = false)
    private Long idSolicitud;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_FUNCIONARIO")
    private FuncionarioEntity funcionario; // El que emite la solicitud

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_TIPO_SOLICITUD")
    private TipoSolicitudEntity tipoSolicitud;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_TURNO")
    private TurnoEntity turno;

    //Util para intercambios de Turno (Ofrecer particular a todos necesito saber que gano y que se va)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_TURNO_RECEPTOR")
    private TurnoEntity turnoReceptor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_FUNCIONARIO_RECEPTOR")
    private FuncionarioEntity funcionarioReceptor; // El que recibe la solicitud

    @Column(name = "Aceptado_Receptor")
    private Boolean aceptadoReceptor;

    //Para mantener la consistencia dentro de las solicitudes
    public enum EstadoSolicitud {
        PENDIENTE,
        APROBADA,
        RECHAZADA
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "Estado")
    private EstadoSolicitud estado;

    @Column(name = "Fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Column(name = "Fecha_inicio_permiso")
    private LocalDateTime fechaInicioPermiso;

    @Column(name = "Fecha_termino_permiso")
    private LocalDateTime fechaTerminoPermiso;

    @Column(name = "Motivo", columnDefinition = "TEXT")
    private String motivo;
}