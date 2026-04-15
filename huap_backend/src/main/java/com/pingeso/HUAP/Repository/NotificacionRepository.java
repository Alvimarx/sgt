package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.DTO.NotificacionDTO;
import com.pingeso.HUAP.Entity.NotificacionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificacionRepository extends JpaRepository<NotificacionEntity, Long> {

    // Buscar notificaciones por el tipo de solicitud
    List<NotificacionEntity> findByTipoSolicitud(String tipoSolicitud);

    // Buscar notificaciones enviadas por un usuario (emisor)
    List<NotificacionEntity> findByEmisorIdPersonal(Long idEmisor);  // CAMBIADO

    // Buscar notificaciones recibidas por un usuario (receptor)
    List<NotificacionEntity> findByReceptorIdPersonal(Long idReceptor);  // CAMBIADO

    // Buscar todas las notificaciones donde el usuario participe
    @Query("""
       SELECT new com.pingeso.HUAP.DTO.NotificacionDTO(
           n.id,
           n.tipoSolicitud,
           CASE 
               WHEN n.emisor.idPersonal = :idUsuario THEN n.mensajeParaEmisor
               ELSE n.mensaje
           END,
           n.estado,
           n.fechaEnvio,
           n.leido,
           n.eliminado
       )
       FROM NotificacionEntity n
       WHERE (n.emisor.idPersonal = :idUsuario OR n.receptor.idPersonal = :idUsuario)
       ORDER BY n.fechaEnvio DESC
       """)
    List<NotificacionDTO> findNotificacionesPorUsuario(@Param("idUsuario") Long idUsuario);

    // Filtra por notificaciones no leídas
    @Query("""
        SELECT COUNT(n)
        FROM NotificacionEntity n
        WHERE (n.emisor.idPersonal = :idUsuario OR n.receptor.idPersonal = :idUsuario)
          AND n.leido = false
          AND n.eliminado = false
    """)
    Long contarNoLeidasPorUsuario(@Param("idUsuario") Long idUsuario);
}

