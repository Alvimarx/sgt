package com.pingeso.HUAP.Service;


import com.pingeso.HUAP.DTO.CrearNotificacionDTO;
import com.pingeso.HUAP.DTO.NotificacionRespuestaDTO;
import com.pingeso.HUAP.Entity.NotificacionEntity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Repository.NotificacionRepository;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import com.pingeso.HUAP.Security.AlcanceServicio;
import com.pingeso.HUAP.Security.SeguridadServicio;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificacionService {

    private static final String NOTIFICACION_AJENA = "No tienes acceso a una notificación de otro funcionario";

    private final NotificacionRepository notificacionRepository;
    private final SolicitudRepository solicitudRepository;
    private final SeguridadServicio seguridadServicio;

    @Transactional
    public NotificacionEntity crearNotificacion(CrearNotificacionDTO dto) {
        SolicitudEntity solicitud = solicitudRepository.findById(dto.getIdSolicitud())
                .orElseThrow(() -> new RuntimeException("Solicitud no existe"));
        // SEC (C-17): antes cualquier autenticado podía dejar un mensaje en la bandeja de
        // quienes participan en una solicitud ajena.
        exigirParticipante(solicitud, "Solo quien participa en la solicitud puede crear una notificación sobre ella");

        NotificacionEntity notificacion = NotificacionEntity.builder()
                .estado("NO_LEIDO")
                .fechaEnvio(LocalDateTime.now())
                .mensaje(dto.getMensaje())
                .solicitud(solicitud)
                .build();

        return notificacionRepository.save(notificacion);
    }

    @Transactional
    public boolean marcarLeido(Long idNotificacion) {
        return notificacionRepository.findById(idNotificacion).map(notificacion -> {
            exigirDueno(notificacion);
            notificacion.setEstado("LEIDO");
            notificacionRepository.save(notificacion);
            return true;
        }).orElse(false);
    }

    @Transactional
    public boolean marcarComoEliminado(Long idNotificacion) {
        return notificacionRepository.findById(idNotificacion).map(notificacion -> {
            exigirDueno(notificacion);
            notificacion.setEstado("ELIMINADO"); // O "ARCHIVADO"
            notificacionRepository.save(notificacion);
            return true;
        }).orElse(false);
    }


    /*
        Modificadores y utilidades
    */

    public List<NotificacionRespuestaDTO> obtenerNotificacionesFuncionario(Long idFuncionario) {
        List<NotificacionEntity> entidades = notificacionRepository.findByFuncionarioId(idFuncionario);

        return entidades.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public long contarNoLeidasPorUsuario(Long idFuncionario) {
    return notificacionRepository.countNoLeidasByFuncionario(idFuncionario);
    }

    @Transactional
    public NotificacionEntity findNotificacionById(Long id) {
        NotificacionEntity notificacion = notificacionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "La notificación no existe"));
        exigirDueno(notificacion);
        return notificacion;
    }


    //Todas las notificaciones sin considerar el servicio
    public List<NotificacionEntity> findAllNotificacion(){
        return notificacionRepository.findAll();
    }

    @Transactional
    public NotificacionEntity findByIdSolicitud(Long idSolicitud) {
        SolicitudEntity solicitud = solicitudRepository.findById(idSolicitud)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "La solicitud no existe"));
        exigirParticipante(solicitud, NOTIFICACION_AJENA);
        return notificacionRepository
                .findBySolicitud_IdSolicitud(idSolicitud)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No existe notificación para la solicitud con ID: " + idSolicitud
                ));
    }

    /**
     * SEC (C-17, BUG-006): el dueño de una notificación es el emisor o el receptor de la
     * solicitud a la que está ligada, la misma regla con que se arma la bandeja
     * ({@link NotificacionRepository#findByFuncionarioId}). Una notificación sin solicitud no
     * tiene dueño identificable: solo la toca el ADMINISTRADOR.
     */
    private void exigirDueno(NotificacionEntity notificacion) {
        exigirParticipante(notificacion.getSolicitud(), NOTIFICACION_AJENA);
    }

    private void exigirParticipante(SolicitudEntity solicitud, String mensaje) {
        if (seguridadServicio.esAdministrador()) return;
        if (!AlcanceServicio.participaEnSolicitud(solicitud, seguridadServicio.idUsuarioActual())) {
            throw new AccessDeniedException(mensaje);
        }
    }

    @Transactional
    public NotificacionEntity crearNotificacionSistema(com.pingeso.HUAP.Entity.FuncionarioEntity receptor, String mensaje) {
        NotificacionEntity notificacion = NotificacionEntity.builder()
                .estado("NO_LEIDO")
                .fechaEnvio(LocalDateTime.now())
                .mensaje(mensaje)
                .solicitud(null)
                .build();
        return notificacionRepository.save(notificacion);
    }

    private NotificacionRespuestaDTO mapToDTO(NotificacionEntity entity) {
        return NotificacionRespuestaDTO.builder()
                .idNotificacion(entity.getIdNotificacion())
                .mensaje(entity.getMensaje())
                .estado(entity.getEstado())
                .fechaEnvio(entity.getFechaEnvio())
                .idSolicitud(entity.getSolicitud() != null ? entity.getSolicitud().getIdSolicitud() : null)
                .build();
    }
}
