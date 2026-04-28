package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.Notificacion2Entity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface Notificacion2Repository extends JpaRepository<Notificacion2Entity, Long> {
}
