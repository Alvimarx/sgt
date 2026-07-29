package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * Repositorio de {@link TipoTurnoEntity} (catálogo de horarios nombrados por servicio).
 *
 * <p>CRUD de Spring Data más consultas por servicio y verificaciones de nombre duplicado. Las
 * variantes {@code ...EliminadoFalse} operan solo sobre tipos de turno <b>vigentes</b> (soft-delete);
 * las de sufijo {@code IdTipoTurnoNot} excluyen un id concreto para validar el nombre al actualizar.
 */
@Repository
public interface TipoTurnoRepository extends JpaRepository<TipoTurnoEntity, Long> {

    /** ¿Existe un tipo de turno con ese nombre en el servicio (incluye eliminados)? */
    boolean existsByServicio_IdServicioAndNombre(Long idServicio, String nombre);

    /** ¿Existe otro tipo de turno (distinto de {@code idTipoTurno}) con ese nombre en el servicio? */
    boolean existsByServicio_IdServicioAndNombreAndIdTipoTurnoNot(Long idServicio, String nombre, Long idTipoTurno);

    /** Todos los tipos de turno de un servicio (incluye eliminados). */
    List<TipoTurnoEntity> findByServicio_IdServicio(Long idServicio);

    /** Todos los tipos de turno vigentes (no eliminados). */
    List<TipoTurnoEntity> findByEliminadoFalse();

    /** Tipos de turno vigentes de un servicio. */
    List<TipoTurnoEntity> findByServicio_IdServicioAndEliminadoFalse(Long idServicio);

    /** ¿Existe un tipo de turno <b>vigente</b> con ese nombre en el servicio? (para evitar duplicados al crear). */
    boolean existsByServicio_IdServicioAndNombreAndEliminadoFalse(Long idServicio, String nombre);

    /** ¿Existe otro tipo de turno <b>vigente</b> con ese nombre en el servicio? (para evitar duplicados al actualizar). */
    boolean existsByServicio_IdServicioAndNombreAndIdTipoTurnoNotAndEliminadoFalse(Long idServicio, String nombre, Long idTipoTurno);

}
