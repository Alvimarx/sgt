package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.ProfesionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProfesionRepository extends JpaRepository<ProfesionEntity, Long> {
}
