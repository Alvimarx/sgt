package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.OfertaGeneralEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OfertaGeneralRepository extends JpaRepository<OfertaGeneralEntity, Long> {

    List<OfertaGeneralEntity> findByOfertor_IdFuncionario(Long idFuncionario);

    List<OfertaGeneralEntity> findByTurno_Servicio_IdServicio(Long idServicio);
}
