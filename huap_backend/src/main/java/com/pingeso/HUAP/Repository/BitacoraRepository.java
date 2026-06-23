package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.BitacoraEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface BitacoraRepository extends JpaRepository<BitacoraEntity, Long> {

    List<BitacoraEntity> findByTipoEvento(String tipoEvento);

    List<BitacoraEntity> findByFuncionario_IdFuncionario(Long idFuncionario);

    List<BitacoraEntity> findByTurno_IdTurno(Long idTurno);

    List<BitacoraEntity> findBySolicitud_IdSolicitud(Long idSolicitud);

    List<BitacoraEntity> findByActivoTrue();

    @Query("""
        SELECT DISTINCT e
        FROM BitacoraEntity e
        LEFT JOIN FETCH e.turno t
        LEFT JOIN FETCH e.solicitud s
        LEFT JOIN FETCH s.tipoSolicitud ts
        LEFT JOIN FETCH s.turno st
        LEFT JOIN FETCH s.turnoReceptor tr
        WHERE e.activo = true
        AND (
                t.idTurno IN :idsTurnos
            OR st.idTurno IN :idsTurnos
            OR tr.idTurno IN :idsTurnos
        )
        ORDER BY e.fechaModificacion DESC
    """)
    List<BitacoraEntity> findEventosOrigenByTurnos(@Param("idsTurnos") List<Long> idsTurnos);
}
