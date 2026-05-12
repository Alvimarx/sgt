package com.pingeso.HUAP.DTO;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SolicitudResponseDTO {

    private Long id;
    private String tipo;
    private String estado;
    private String motivo;
    private LocalDateTime fechaCreacion;

    private TurnoDetailDTO turno;

    private MedicoDTO medicoSolicitante;
    private MedicoDTO medicoReceptor;

    private TurnoDetailDTO turnoPropio;
    private TurnoDetailDTO turnoDeseado;

    private Boolean aceptadoMedico;

    private LocalDateTime fechaInicioPermiso;
    private LocalDateTime fechaTerminoPermiso;

    private List<TurnoDetailDTO> turnosAfectados;

    private String tipoAutorizacion;
}
