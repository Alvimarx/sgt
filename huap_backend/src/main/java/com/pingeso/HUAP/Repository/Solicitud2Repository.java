package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.Solicitud2Entity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface Solicitud2Repository extends JpaRepository<Solicitud2Entity, Long>{
}
