package com.pingeso.HUAP.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data

public class CrearSolicitudDTO {
    private Long idFuncionario;
    private Long idFuncionarioReceptor; // Puede ser null si es un permiso o cobertura
    private Long idTipoSolicitud;
    private Long idTurno; // El turno deseado, el turno a cubrir o el turno a botar
    private Long idTurnoIntercambio; // Para guardar el turno que el solicitante está ENTREGANDO en un intercambio
    private LocalDateTime fechaInicioPermiso;
    private LocalDateTime fechaTerminoPermiso;
    private String motivo;
}
