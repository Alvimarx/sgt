package com.pingeso.HUAP.Repository;


import com.pingeso.HUAP.Entity.SolicitudEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface SolicitudRepository extends JpaRepository<SolicitudEntity, Long>{

    List<SolicitudEntity> findByFuncionario_IdFuncionario(Long idFuncionario);

    List<SolicitudEntity> findByFuncionarioReceptor_IdFuncionario(Long idFuncionario);

    List<SolicitudEntity> findByTipoSolicitud_IdTipoSolicitud(Long idTipoSolicitud);

    List<SolicitudEntity> findByTurno_IdTurno(Long idTurno);

}
