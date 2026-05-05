package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.Solicitud2Entity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Entity.TipoSolicitudEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.Solicitud2Repository;
import com.pingeso.HUAP.Repository.TipoSolicitudRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
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
        return solicitud2Repository.findByfuncionarioReceptor_IdReceptor(idFuncionario);
    }

    //Todas las solicitudes de un cierto tipo
    public List<Solicitud2Entity> findByTipoSolicitud(Long idTipoSolicitud) {
        return solicitud2Repository.findBytipoSolicitud_IdTipoSolicitud(idTipoSolicitud);
    }

    //Todas las solicitudes de cierto turno
    public List<Solicitud2Entity> findByTurno(Long idTurno) {
        return solicitud2Repository.findByturno_IdTurno(idTurno);
    }

    /*
    Getters para solicitudes en base a las FK y PK
     */

    @Transactional
    public Solicitud2Entity crearSolicitud(Long idFuncionario, Long idFuncionarioReceptor, Long idTipoSolicitud, Long idTurno, String motivo) {
        // FKs
        FuncionarioEntity funcionario = funcionarioRepository.findById(idFuncionario)
                .orElseThrow(() -> new RuntimeException("Funcionario emisor no existe"));

        FuncionarioEntity funcionarioReceptor = funcionarioRepository.findById(idFuncionarioReceptor)
                .orElseThrow(() -> new RuntimeException("Funcionario receptor no existe"));

        TipoSolicitudEntity tipoSolicitud = tipoSolicitudRepository.findById(idTipoSolicitud)
                .orElseThrow(() -> new RuntimeException("Tipo de solicitud no existe"));

        TurnoEntity turno = turnoRepository.findById(idTurno)
                .orElseThrow(() -> new RuntimeException("Turno no existe"));

        // Creacion de la solicitud
        Solicitud2Entity solicitud = Solicitud2Entity.builder()
                .funcionario(funcionario)
                .funcionarioReceptor(funcionarioReceptor)
                .tipoSolicitud(tipoSolicitud)
                .turno(turno)
                .estado(Solicitud2Entity.EstadoSolicitud.PENDIENTE)
                .fechaCreacion(LocalDateTime.now())
                .motivo(motivo) //Dentro del front por un dropdown Probablemente
                .build();
        return solicitud2Repository.save(solicitud);
    }

    /*
    Modificadores y utilidades
     */
    @Transactional
    public Solicitud2Entity cambiarEstado(Long idSolicitud, Solicitud2Entity.EstadoSolicitud nuevoEstado) {
        Solicitud2Entity solicitud = solicitud2Repository.findById(idSolicitud)
                .orElseThrow(() -> new RuntimeException("Solicitud no existe"));

        solicitud.setEstado(nuevoEstado);

        return solicitud2Repository.save(solicitud);
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

