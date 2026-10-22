package com.pingeso.HUAP.DTO;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class BitacoraResponseDTO {

    private Long idEvento;
    private String tipoEvento;
    private String motivo;
    private String observaciones;
    private LocalDateTime fechaModificacion;
    private LocalDateTime fechaInicioAfectada;
    private LocalDateTime fechaFinAfectada;
    private Boolean activo;

    // Actor del evento (quien ejecutó la acción: jefatura, receptor, sistema)
    private Long idFuncionario;
    private String nombreFuncionario;
    private String rutFuncionario;

    // Turno directo del BitacoraEntity (puede ser null — usar turnoSolicitud)
    private Long idTurno;
    private String diaInicioTurno;
    private String diaFinalTurno;
    private String horaInicioTurno;
    private String horaFinTurno;
    private String nombrePuesto;
    // Funcionario asignado AHORA al turno directo (null = turno libre/vacante). Cambia con cada
    // reasignación: no es quien lo tenía cuando ocurrió el evento (ver nombreTitularAlCrearse).
    private Long idFuncionarioTurno;
    private String nombreFuncionarioTurno;
    // Solo en el evento de creación del turno (GENERACION_TURNO), null en los demás: quién lo tenía AL
    // CREARSE, tal como quedó guardado en el propio evento (O-1). titularAlCrearseRegistrado = false si
    // el evento no lo guardó (turnos importados): ahí no se sabe, y no se muestra al titular de hoy.
    // nombreTitularAlCrearse = null con registrado = true: el turno nació vacante.
    private Boolean titularAlCrearseRegistrado;
    private String nombreTitularAlCrearse;

    // Solicitud — datos base
    private Long idSolicitud;
    private String tipoSolicitud;
    private String estadoSolicitud;
    private String motivoSolicitud;
    private Boolean aceptadoReceptor;

    // Solicitud — fechas de permiso
    private LocalDateTime fechaInicioPermiso;
    private LocalDateTime fechaTerminoPermiso;

    // Solicitud — emisor (quien creó la solicitud)
    private Long idFuncionarioEmisor;
    private String nombreFuncionarioEmisor;

    // Solicitud — turno principal (de solicitud.turno)
    private Long idTurnoSolicitud;
    private String diaInicioTurnoSolicitud;
    private String diaFinalTurnoSolicitud;
    private String horaInicioTurnoSolicitud;
    private String horaFinTurnoSolicitud;
    private String nombrePuestoSolicitud;

    // Solicitud — receptor e intercambio
    private Long idFuncionarioReceptor;
    private String nombreFuncionarioReceptor;
    private Long idTurnoReceptor;
    private String diaInicioTurnoReceptor;
    private String diaFinalTurnoReceptor;
    private String horaInicioTurnoReceptor;
    private String horaFinTurnoReceptor;
    private String nombrePuestoReceptor;

    // Oferta general (enriquecido desde motivo = "idOferta=X")
    private String nombreOferente;
    private String diaInicioTurnoOferta;
    private String horaInicioTurnoOferta;
    private String horaFinTurnoOferta;
    private String nombrePuestoTurnoOferta;
    private String nombreAsignado;
}
