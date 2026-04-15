package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.EventLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventLogRepository extends JpaRepository<EventLogEntity, Long> {
    List<EventLogEntity> findByTipoEvento(String tipoEvento);
    List<EventLogEntity> findByUsuario_IdPersonal(Long idPersonal);
    List<EventLogEntity> findByIdTurno(Long idTurno);
    List<EventLogEntity> findByIdSolicitud(Long idSolicitud);
    List<EventLogEntity> findByActivoTrue();
}
