package com.pingeso.HUAP.Service;


import com.pingeso.HUAP.DTO.CrearNotificacionDTO;
import com.pingeso.HUAP.DTO.NotificacionRespuestaDTO;
import com.pingeso.HUAP.Entity.NotificacionEntity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Repository.NotificacionRepository;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificacionService {

    private final NotificacionRepository notificacionRepository;
    private final SolicitudRepository solicitudRepository;

    @Transactional
    public NotificacionEntity crearNotificacion(CrearNotificacionDTO dto) {
        SolicitudEntity solicitud = solicitudRepository.findById(dto.getIdSolicitud())
                .orElseThrow(() -> new RuntimeException("Solicitud no existe"));

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
            notificacion.setEstado("LEIDO");
            notificacionRepository.save(notificacion);
            return true;
        }).orElse(false);
    }

    @Transactional
    public boolean marcarComoEliminado(Long idNotificacion) {
        return notificacionRepository.findById(idNotificacion).map(notificacion -> {
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

    public NotificacionEntity findNotificacionById(Long id) {
        return notificacionRepository.findById(id).orElseThrow(() -> new RuntimeException("Notificacion no encontrada"));
    }


    //Todas las notificaciones sin considerar el servicio
    public List<NotificacionEntity> findAllNotificacion(){
        return notificacionRepository.findAll();
    }

    public NotificacionEntity findByIdSolicitud(Long idSolicitud) {
        return notificacionRepository
                .findBySolicitud_IdSolicitud(idSolicitud)
                .orElseThrow(() -> new RuntimeException(
                        "No existe notificación para la solicitud con ID: " + idSolicitud
                ));
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
