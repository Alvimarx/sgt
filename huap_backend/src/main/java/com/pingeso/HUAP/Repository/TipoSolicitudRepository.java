package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.TipoSolicitudEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TipoSolicitudRepository extends JpaRepository<TipoSolicitudEntity, Long> {

}
