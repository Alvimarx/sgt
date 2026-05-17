package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.BitacoraEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BitacoraRepository extends JpaRepository<BitacoraEntity, Long> {

    List<BitacoraEntity> findByTipoEvento(String tipoEvento);

    List<BitacoraEntity> findByFuncionario_IdFuncionario(Long idFuncionario);

    List<BitacoraEntity> findByTurno_IdTurno(Long idTurno);

    List<BitacoraEntity> findBySolicitud_IdSolicitud(Long idSolicitud);

    List<BitacoraEntity> findByActivoTrue();
}
