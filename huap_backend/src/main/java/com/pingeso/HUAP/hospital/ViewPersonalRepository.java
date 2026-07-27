package com.pingeso.HUAP.hospital;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio de solo lectura sobre la vista {@code viewPersonal} del hospital.
 * Ligado al datasource del hospital (ver {@code Config/HospitalDataSourceConfig}).
 */
@Repository
public interface ViewPersonalRepository extends JpaRepository<ViewPersonalEntity, Long> {

    Optional<ViewPersonalEntity> findByRut(String rut);

}
