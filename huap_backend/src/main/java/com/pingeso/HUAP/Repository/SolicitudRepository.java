package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.SolicitudEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SolicitudRepository extends JpaRepository<SolicitudEntity, Long> {

    //metodo para obtener todas las solicitudes
    List<SolicitudEntity> findAllByOrderByFechaCreacionDesc();

    //metodo para obtener todas las solicitudes donde el medico es solicitante
    List<SolicitudEntity> findAllByMedicoSolicitante_IdPersonalOrderByFechaCreacionDesc(Long medicoSolicitanteId);

    //metodo para obtener todas las solicitudes donde el medico es solicitante y un estado especifio
    List<SolicitudEntity> findAllByEstadoAndMedicoSolicitante_IdPersonalOrderByFechaCreacionDesc(String estado, Long medicoSolicitanteId);

    //metodo que busca por solicitante o receptor (sin filtro de estado)
    List<SolicitudEntity> findAllByMedicoSolicitante_IdPersonalOrMedicoReceptor_IdPersonalOrderByFechaCreacionDesc(Long medicoSolicitanteId, Long medicoReceptorId);

    //metodo que filtra por estado
    @Query("SELECT s FROM SolicitudEntity s WHERE " +
            "(s.medicoSolicitante.idPersonal = :medicoId OR s.medicoReceptor.idPersonal = :medicoId) AND " +
            "s.estado = :estado " +
            "ORDER BY s.fechaCreacion DESC")
    List<SolicitudEntity> findAllByMedicoIdAndEstado(@Param("medicoId") Long medicoId, @Param("estado") String estado);

    //metodo para obtener todas las solicitudes segun un estado (pendiente/aprobado/rechazado)
    List<SolicitudEntity> findAllByEstadoOrderByFechaCreacionDesc(String estado);

    //metodo que devuelve solicitudes con un estado dado cuyo medicoSolicitante pertenece al servicio indicado.
    @Query("SELECT s FROM SolicitudEntity s JOIN s.medicoSolicitante u WHERE u.idServicio = :servicioId AND s.estado = :estado ORDER BY s.fechaCreacion DESC")
    List<SolicitudEntity> findAllByEstadoAndMedicoSolicitanteServicioId(@Param("estado") String estado, @Param("servicioId") Long servicioId);

    //metodo que devuelve todas las solicitudes (independiente del estado) cuyo medicoSolicitante pertenece al servicio indicado.
    @Query("SELECT s FROM SolicitudEntity s JOIN s.medicoSolicitante u WHERE u.idServicio = :servicioId ORDER BY s.fechaCreacion DESC")
    List<SolicitudEntity> findAllByMedicoSolicitanteServicioId(@Param("servicioId") Long servicioId);

    // 8. Query nativa - cambiar también aquí
    @Query(value = "SELECT to_char(COALESCE((s.fecha_inicio_permiso)::date, (s.fecha_creacion)::date), 'YYYY-MM-DD') AS dia, COUNT(*) AS total " +
            "FROM solicitudes s JOIN personal u ON s.medico_solicitante_id = u.id_personal " +
            "WHERE u.id_servicio = :servicioId " +
            "GROUP BY dia ORDER BY dia", nativeQuery = true)
    List<Object[]> findSolicitudCountsByServicioGroupedByDate(@Param("servicioId") Long servicioId);

    //busca solicitudes pendientes para un turno específico, excluyendo la que estamos aprobando
    List<SolicitudEntity> findAllByTurno_IdAndEstadoAndIdNot(Long turnoId, String estado, Long solicitudIdExcluded);

    List<SolicitudEntity> findAllByTurnoDeSolicitanteIdAndEstadoAndIdNot(
            Long turnoDeSolicitanteId,
            String estado,
            Long solicitudIdExcluir);

    List<SolicitudEntity> findAllByTurno_Id(Long turnoId);

    List<SolicitudEntity> findAllByTurnoDeSolicitanteId(Long turnoDeSolicitanteId);

    // Métodos alias para coincidir con la llamada del servicio
    List<SolicitudEntity> findByTurno(com.pingeso.HUAP.Entity.TurnoEntity turno);
    List<SolicitudEntity> findByTurnoDeSolicitanteId(Long id);

}