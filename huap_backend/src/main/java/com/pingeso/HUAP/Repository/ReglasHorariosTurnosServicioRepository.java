package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.ReglasHorariosTurnosServicioEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReglasHorariosTurnosServicioRepository
        extends JpaRepository<ReglasHorariosTurnosServicioEntity, Long> {

    List<ReglasHorariosTurnosServicioEntity> findByServicio_IdServicioAndEliminadoFalse(Long idServicio);

    // Los tipos (ManyToOne) se cargan de forma perezosa dentro de la transacción del
    // servicio que aplica el ajuste (generación / guardado).
    List<ReglasHorariosTurnosServicioEntity> findByServicio_IdServicioAndActivoTrueAndEliminadoFalse(Long idServicio);
}
