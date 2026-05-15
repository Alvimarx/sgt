package com.pingeso.HUAP.Repository;


import com.pingeso.HUAP.Entity.Solicitud2Entity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface Solicitud2Repository extends JpaRepository<Solicitud2Entity, Long>{

    List<Solicitud2Entity> findByFuncionario_IdFuncionario(Long idFuncionario);

    List<Solicitud2Entity> findByFuncionarioReceptor_IdFuncionario(Long idFuncionario);

    List<Solicitud2Entity> findByTipoSolicitud_IdTipoSolicitud(Long idTipoSolicitud);

    List<Solicitud2Entity> findByTurno_IdTurno(Long idTurno);

}
