package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PlantillaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlantillaRepository extends JpaRepository<PlantillaEntity, Long> {
}
