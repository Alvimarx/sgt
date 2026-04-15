package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.NotificacionDTO;
import com.pingeso.HUAP.Entity.NotificacionEntity;
import com.pingeso.HUAP.Entity.PersonalEntity;
import com.pingeso.HUAP.Repository.NotificacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class NotificacionService {

    private final NotificacionRepository notificacionRepository;

    @Autowired
    public NotificacionService(NotificacionRepository notificacionRepository) {
        this.notificacionRepository = notificacionRepository;
    }

    // Obtener todas las notificaciones (sin filtros)
    public List<NotificacionEntity> findAll() {
        return notificacionRepository.findAll();
    }

    // Buscar notificaciones por el tipo de solicitud
    public List<NotificacionEntity> findByTipoSolicitud(String tipoSolicitud) {
        return notificacionRepository.findByTipoSolicitud(tipoSolicitud);
    }

    // Buscar notificaciones enviadas por un usuario (emisor)
    public List<NotificacionEntity> findByEmisorId(Long idEmisor) {
        return notificacionRepository.findByEmisorIdPersonal(idEmisor); // CAMBIADO
    }

    // Buscar notificaciones recibidas por un usuario (receptor)
    public List<NotificacionEntity> findByReceptorId(Long idReceptor) {
        return notificacionRepository.findByReceptorIdPersonal(idReceptor); // CAMBIADO
    }

    // Buscar todas las notificaciones donde el usuario participe (como emisor o
    // receptor)
    public List<NotificacionDTO> obtenerNotificacionesUsuario(Long idUsuario) {
        return notificacionRepository.findNotificacionesPorUsuario(idUsuario);
    }

    // Buscar una notificación por su ID
    public Optional<NotificacionEntity> findById(Long id) {
        return notificacionRepository.findById(id);
    }

    // Marcar una notificacion como leida
    public boolean marcarComoLeido(Long id) {
        return notificacionRepository.findById(id).map(notificacion -> {
            notificacion.setLeido(true);
            notificacionRepository.save(notificacion);
            return true;
        }).orElse(false);
    }

    // Marcar una notificacion como eliminada para no mostrarla
    public boolean marcarComoEliminado(Long id) {
        return notificacionRepository.findById(id).map(notificacion -> {
            notificacion.setEliminado(true);
            notificacionRepository.save(notificacion);
            return true;
        }).orElse(false);
    }

    // Busca cuantas notificaciones tiene pendiente un usuario
    public Long contarNoLeidasPorUsuario(Long idUsuario) {
        return notificacionRepository.contarNoLeidasPorUsuario(idUsuario);
    }

    /**
     * Crea una nueva notificación y la guarda en la base de datos.
     * 
     * @param tipoSolicitud     Tipo de notificación (ej: "ASIGNACION_TURNO",
     *                          "ALTERACION_TURNO")
     * @param mensaje           Mensaje para el receptor
     * @param mensajeParaEmisor Mensaje para el emisor (puede ser null)
     * @param estado            Estado de la notificación
     * @param emisor            Persona que genera la notificación (admin)
     * @param receptor          Persona que recibe la notificación (médico afectado)
     * @return La notificación creada
     */
    public NotificacionEntity crearNotificacion(
            String tipoSolicitud,
            String mensaje,
            String mensajeParaEmisor,
            String estado,
            PersonalEntity emisor,
            PersonalEntity receptor) {

        NotificacionEntity notificacion = new NotificacionEntity();
        notificacion.setTipoSolicitud(tipoSolicitud);
        notificacion.setMensaje(mensaje);
        notificacion.setMensajeParaEmisor(mensajeParaEmisor);
        notificacion.setEstado(estado);
        notificacion.setFechaEnvio(new java.util.Date());
        notificacion.setEmisor(emisor);
        notificacion.setReceptor(receptor);
        notificacion.setLeido(false);
        notificacion.setEliminado(false);

        return notificacionRepository.save(notificacion);
    }
}