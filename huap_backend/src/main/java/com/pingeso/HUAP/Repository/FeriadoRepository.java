package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.FeriadoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface FeriadoRepository extends JpaRepository<FeriadoEntity, Long> {

    boolean existsByFecha(LocalDate fecha);

    List<FeriadoEntity> findByFechaBetweenOrderByFechaAsc(LocalDate desde, LocalDate hasta);

    List<FeriadoEntity> findAllByOrderByFechaAsc();
}
