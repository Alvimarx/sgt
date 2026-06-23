package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.OfertaGeneralEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface OfertaGeneralRepository extends JpaRepository<OfertaGeneralEntity, Long> {

    List<OfertaGeneralEntity> findByOfertor_IdFuncionario(Long idFuncionario);

    List<OfertaGeneralEntity> findByTurno_Servicio_IdServicio(Long idServicio);

    @Query("""
        SELECT DISTINCT o
        FROM OfertaGeneralEntity o
        LEFT JOIN FETCH o.postulaciones p
        LEFT JOIN FETCH p.postulante
        WHERE o.turno.idTurno IN :idsTurnos
        ORDER BY o.fechaCreacion DESC
    """)
    List<OfertaGeneralEntity> findByTurnoIdInWithPostulaciones(@Param("idsTurnos") List<Long> idsTurnos);
}
