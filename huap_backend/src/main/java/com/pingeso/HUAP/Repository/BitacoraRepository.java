package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.BitacoraEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BitacoraRepository extends JpaRepository<BitacoraEntity, Long> {
}
