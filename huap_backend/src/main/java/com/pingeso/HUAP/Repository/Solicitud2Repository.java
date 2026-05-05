package com.pingeso.HUAP.Repository;


import com.pingeso.HUAP.Entity.Solicitud2Entity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface Solicitud2Repository extends JpaRepository<Solicitud2Entity, Long>{

    List<Solicitud2Entity> findByFuncionario_IdFuncionario(Long idFuncionario);

    List<Solicitud2Entity> findByfuncionarioReceptor_IdReceptor(Long idReceptor);

    List<Solicitud2Entity> findBytipoSolicitud_IdTipoSolicitud(Long idTipoSolicitud);

    List<Solicitud2Entity> findByturno_IdTurno(Long idTurno);
}
