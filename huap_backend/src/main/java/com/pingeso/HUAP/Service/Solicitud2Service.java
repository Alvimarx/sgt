package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.CrearSolicitudDTO;
import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.hibernate.type.descriptor.jdbc.TinyIntAsSmallIntJdbcType;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor

public class Solicitud2Service {

    private final Solicitud2Repository solicitud2Repository;
    private final FuncionarioRepository funcionarioRepository;
    private final TipoSolicitudRepository tipoSolicitudRepository;
    private final TurnoRepository turnoRepository;
    private final BitacoraRepository bitacoraRepository;

    //Los estados de una solicitud


    public List<Solicitud2Entity> findAllSolicitudes() {
        return solicitud2Repository.findAll();
    }

    /*
    Getters para solicitudes en base a las FK y PK
     */
    //Todas las solicitudes de 1 funcionario
    public List<Solicitud2Entity> findByFuncionario(Long idFuncionario) {
        return solicitud2Repository.findByFuncionario_IdFuncionario(idFuncionario);
    }

    //Todas Las solicitudes para un Receptor
    public List<Solicitud2Entity> findByFuncionarioReceptor(Long idFuncionario) {
        return solicitud2Repository.findByFuncionarioReceptor_IdFuncionario(idFuncionario);
    }

    //Todas las solicitudes de un cierto tipo
    public List<Solicitud2Entity> findByTipoSolicitud(Long idTipoSolicitud) {
        return solicitud2Repository.findByTipoSolicitud_IdTipoSolicitud(idTipoSolicitud);
    }

    //Todas las solicitudes de cierto turno
    public List<Solicitud2Entity> findByTurno(Long idTurno) {
        return solicitud2Repository.findByTurno_Id(idTurno);
    }

     /*
        Modificadores y utilidades
     */

    @Transactional
    public Solicitud2Entity crearSolicitud(CrearSolicitudDTO dto) {
        FuncionarioEntity funcionario = funcionarioRepository.findById(dto.getIdFuncionario())
                .orElseThrow(() -> new RuntimeException("Funcionario emisor no existe"));

        TipoSolicitudEntity tipoSolicitud = tipoSolicitudRepository.findById(dto.getIdTipoSolicitud())
                .orElseThrow(() -> new RuntimeException("Tipo de solicitud no existe"));

        // Buscamos opcionales
        FuncionarioEntity receptor = dto.getIdFuncionarioReceptor() != null ?
                funcionarioRepository.findById(dto.getIdFuncionarioReceptor()).orElse(null) : null;

        TurnoEntity turno = dto.getIdTurno() != null ?
                turnoRepository.findById(dto.getIdTurno()).orElse(null) : null;

        TurnoEntity turnoIntercambio = dto.getIdTurnoIntercambio() != null ?
                turnoRepository.findById(dto.getIdTurnoIntercambio()).orElse(null) : null;

        Solicitud2Entity solicitud = Solicitud2Entity.builder()
                .funcionario(funcionario)
                .funcionarioReceptor(receptor)
                .tipoSolicitud(tipoSolicitud)
                .turno(turno)
                .turnoReceptor(turnoIntercambio) // El turno que se entrega
                .estado(Solicitud2Entity.EstadoSolicitud.PENDIENTE)
                .fechaCreacion(LocalDateTime.now())
                .fechaInicioPermiso(dto.getFechaInicioPermiso())
                .fechaTerminoPermiso(dto.getFechaTerminoPermiso())
                .motivo(dto.getMotivo())
                .aceptadoReceptor(null) // Todavía no es aceptado por otro
                .build();

        Solicitud2Entity guardada = solicitud2Repository.save(solicitud);

        // Registrar en Bitácora
        registrarEvento("SOLICITUD_CREADA", guardada, funcionario);

        return guardada;
    }

    @Transactional
    public Solicitud2Entity responderOfertaIntercambio(Long idSolicitud, Long idReceptor, boolean acepta) {
        Solicitud2Entity solicitud = solicitud2Repository.findById(idSolicitud)
                .orElseThrow(() -> new RuntimeException("Solicitud no existe"));

        if (!solicitud.getFuncionarioReceptor().getIdFuncionario().equals(idReceptor)) {
            throw new RuntimeException("No eres el receptor de esta solicitud");
        }

        FuncionarioEntity receptor = funcionarioRepository.findById(idReceptor).orElseThrow();

        if (acepta) {
            solicitud.setAceptadoReceptor(true);
            registrarEvento("OFERTA_ACEPTADA_POR_RECEPTOR", solicitud, receptor);
            // Queda en estado PENDIENTE esperando a la Jefatura
        } else {
            solicitud.setAceptadoReceptor(false);
            solicitud.setEstado(Solicitud2Entity.EstadoSolicitud.RECHAZADA);
            registrarEvento("OFERTA_RECHAZADA_POR_RECEPTOR", solicitud, receptor);
        }

        return solicitud2Repository.save(solicitud);
    }


    @Transactional
    public Solicitud2Entity cambiarEstado(Long idSolicitud, Solicitud2Entity.EstadoSolicitud nuevoEstado, Long idUsuarioAsignador) {
        Solicitud2Entity solicitud = solicitud2Repository.findById(idSolicitud)
                .orElseThrow(() -> new RuntimeException("Solicitud no existe"));

        FuncionarioEntity asignador = funcionarioRepository.findById(idUsuarioAsignador).orElse(null);
        TinyIntAsSmallIntJdbcType tipoSolicitud = solicitud.getTipoSolicitud().getTipo();

        if (nuevoEstado == Solicitud2Entity.EstadoSolicitud.APROBADA) {

            // 3.1 Rechazar solicitudes competidoras para el mismo turno
            if (solicitud.getTurno() != null) {
                rechazarSolicitudesCompetitivas(solicitud.getTurno().getId(), idSolicitud, asignador);
            }

            // 3.2 Lógica Colateral según el Tipo de Solicitud
            if (tipoSolicitud.equals(1) || tipoSolicitud.equals(2)) {
                // Liberar el turno
                TurnoEntity turno = solicitud.getTurno();
                if (turno != null) {
                    turno.setFuncionario(null); // Lo dejamos disponible
                    turnoRepository.save(turno);
                }
            }
            else if (tipoSolicitud.equals(3)) {
                // Asignar el turno al solicitante
                TurnoEntity turno = solicitud.getTurno();
                turno.setFuncionario(solicitud.getFuncionario());
                turnoRepository.save(turno);
            }
            else if (tipoSolicitud.equals(4)) {
                // Intercambiar turnos entre solicitante y receptor
                TurnoEntity turnoDeseado = solicitud.getTurno();
                TurnoEntity turnoPropio = solicitud.getTurnoReceptor();

                turnoDeseado.setFuncionario(solicitud.getFuncionario());
                turnoPropio.setFuncionario(solicitud.getFuncionarioReceptor());

                turnoRepository.save(turnoDeseado);
                turnoRepository.save(turnoPropio);
            }
        }

        solicitud.setEstado(nuevoEstado);
        registrarEvento("CAMBIO_ESTADO_" + nuevoEstado.name(), solicitud, asignador);

        return solicitud2Repository.save(solicitud);
    }

    private void rechazarSolicitudesCompetitivas(Long idTurno, Long idSolicitudAprobada, FuncionarioEntity asignador) {
        List<Solicitud2Entity> conflictos = solicitud2Repository.findByTurno_Id(idTurno).stream()
                .filter(s -> s.getEstado() == Solicitud2Entity.EstadoSolicitud.PENDIENTE && !s.getIdSolicitud().equals(idSolicitudAprobada))
                .toList();

        for (Solicitud2Entity conflicto : conflictos) {
            conflicto.setEstado(Solicitud2Entity.EstadoSolicitud.RECHAZADA);
            conflicto.setMotivo("Rechazo automático: Otra solicitud para este turno fue aprobada.");
            solicitud2Repository.save(conflicto);
            registrarEvento("RECHAZO_AUTOMATICO", conflicto, asignador);
        }
    }

    //Hay que validar finalmente que vamos registra dentro de las bitacoras
    private void registrarEvento(String tipoEvento, Solicitud2Entity solicitud, FuncionarioEntity actor) {
        try {
            BitacoraEntity log = BitacoraEntity.builder()
                    .tipoEvento(tipoEvento)
                    .solicitud(solicitud)
                    .funcionario(actor)
                    .fechaInicioAfectada(LocalDateTime.now())
                    .build();
            bitacoraRepository.save(log);
        } catch (Exception e) {
            System.err.println("Error guardando en bitácora: " + e.getMessage());
        }
    }

    @Transactional
    public Solicitud2Entity modificarMotivo(Long idSolicitud, String nuevoMotivo) {
        Solicitud2Entity solicitud = solicitud2Repository.findById(idSolicitud)
                .orElseThrow(() -> new RuntimeException("Solicitud no existe"));
        if (solicitud.getEstado() != Solicitud2Entity.EstadoSolicitud.PENDIENTE) {
            throw new RuntimeException("Solo se puede modificar el motivo si la solicitud está en estado PENDIENTE");
        }
        solicitud.setMotivo(nuevoMotivo);
        return solicitud2Repository.save(solicitud);
    }

}

