package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.VinculoTurnoRotativaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VinculoTurnoRotativaRepository extends JpaRepository<VinculoTurnoRotativaEntity, Long> {

    VinculoTurnoRotativaEntity findByIdTurno(Long idTurno);
    List<VinculoTurnoRotativaEntity> findByIdTipoTurno(Long idTipoTurno);

    // (NUEVO) Buscar vínculos para una lista de IDs de turnos (Batch Fetching)
    List<VinculoTurnoRotativaEntity> findByIdTurnoIn(List<Long> idsTurnos);
}