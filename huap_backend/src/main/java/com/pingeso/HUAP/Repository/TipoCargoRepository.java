package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.TipoCargoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TipoCargoRepository extends JpaRepository<TipoCargoEntity, Long> {
}
