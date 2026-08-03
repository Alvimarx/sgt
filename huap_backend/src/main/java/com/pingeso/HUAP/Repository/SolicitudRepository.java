package com.pingeso.HUAP.Repository;


import com.pingeso.HUAP.Entity.SolicitudEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface SolicitudRepository extends JpaRepository<SolicitudEntity, Long>{

    List<SolicitudEntity> findByFuncionario_IdFuncionario(Long idFuncionario);

    List<SolicitudEntity> findByFuncionarioReceptor_IdFuncionario(Long idFuncionario);

    List<SolicitudEntity> findByTipoSolicitud_IdTipoSolicitud(Long idTipoSolicitud);

    List<SolicitudEntity> findByTurno_IdTurno(Long idTurno);

    /** Cuenta solicitudes en un estado dado que apunten a alguno de los turnos indicados (advisory, para advertencias de UI). */
    long countByTurno_IdTurnoInAndEstado(List<Long> idsTurno, SolicitudEntity.EstadoSolicitud estado);

    /**
     * Lock pesimista (SELECT ... FOR UPDATE) sobre la fila de la solicitud. Se usa en
     * {@code cambiarEstado} para releer su estado con datos frescos (no la foto de antes de
     * esperar el lock del turno) y detectar si otra aprobación concurrente ya la resolvió.
     * Debe invocarse dentro de una transacción.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SolicitudEntity s WHERE s.idSolicitud = :id")
    Optional<SolicitudEntity> findByIdForUpdate(@Param("id") Long id);

}
