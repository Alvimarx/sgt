package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.ViewPersonalEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ViewPersonalRepository extends JpaRepository<ViewPersonalEntity,Long> {

    Optional<ViewPersonalEntity> findByRut(String rut);

}
