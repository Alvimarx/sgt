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

    List<SolicitudEntity> findByTurnoReceptor_IdTurno(Long idTurno);

    /** ¿El funcionario ya tiene una solicitud en este estado sobre este turno? (anti-duplicado) */
    boolean existsByFuncionario_IdFuncionarioAndTurno_IdTurnoAndEstado(
            Long idFuncionario, Long idTurno, SolicitudEntity.EstadoSolicitud estado);

    /**
     * Ids de los turnos sobre los que el funcionario tiene una solicitud en el estado dado.
     * Proyección directa (una sola consulta) para marcar "ya lo solicitaste" en los listados
     * de turnos sin materializar entidades.
     */
    @Query("SELECT s.turno.idTurno FROM SolicitudEntity s " +
           "WHERE s.funcionario.idFuncionario = :idFuncionario AND s.estado = :estado AND s.turno IS NOT NULL")
    List<Long> findTurnoIdsByFuncionarioAndEstado(
            @Param("idFuncionario") Long idFuncionario,
            @Param("estado") SolicitudEntity.EstadoSolicitud estado);

    /**
     * Ids de los turnos que el funcionario ENTREGA en solicitudes en el estado dado (el turno
     * propio de un intercambio). Complementa a {@link #findTurnoIdsByFuncionarioAndEstado}: un
     * turno queda "comprometido" tanto si lo pides como si lo ofreces.
     */
    @Query("SELECT s.turnoReceptor.idTurno FROM SolicitudEntity s " +
           "WHERE s.funcionario.idFuncionario = :idFuncionario AND s.estado = :estado AND s.turnoReceptor IS NOT NULL")
    List<Long> findTurnoReceptorIdsByFuncionarioAndEstado(
            @Param("idFuncionario") Long idFuncionario,
            @Param("estado") SolicitudEntity.EstadoSolicitud estado);

    /**
     * ¿El funcionario tiene una solicitud en este estado que involucre el turno, ya sea como turno
     * pedido o como turno entregado? Es la consulta del bloqueo "un turno comprometido a la vez".
     */
    // LEFT JOIN explícito, NO navegación implícita (s.turno.idTurno): la navegación implícita
    // genera INNER JOIN y descartaría las solicitudes que tienen uno de los dos turnos en NULL
    // — es decir, casi todas (una cobertura no tiene turnoReceptor), dejando la regla sin efecto.
    @Query("SELECT COUNT(s) FROM SolicitudEntity s " +
           "LEFT JOIN s.turno t LEFT JOIN s.turnoReceptor tr " +
           "WHERE s.funcionario.idFuncionario = :idFuncionario AND s.estado = :estado " +
           "AND (t.idTurno = :idTurno OR tr.idTurno = :idTurno)")
    long contarPendientesQueInvolucranTurno(
            @Param("idFuncionario") Long idFuncionario,
            @Param("idTurno") Long idTurno,
            @Param("estado") SolicitudEntity.EstadoSolicitud estado);

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
