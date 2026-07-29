package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.RotativaDiaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio de {@link RotativaDiaEntity} (días del patrón de una rotativa).
 *
 * <p>Además de leer la secuencia de una rotativa, ofrece utilidades usadas al eliminar un tipo de
 * turno del catálogo: contar/nombrar las rotativas que lo usan y liberar sus referencias.
 */
@Repository
public interface RotativaDiaRepository extends JpaRepository<RotativaDiaEntity, Long> {

    /** Días de una rotativa ordenados por {@code diaIndex} ascendente. */
    List<RotativaDiaEntity> findByRotativa_IdRotativaOrderByDiaIndexAsc(Long idRotativa);

    /** Cuenta cuántos días del catálogo usan un tipo de turno (para validar antes de eliminarlo). */
    long countByTipoTurno_IdTipoTurno(Long idTipoTurno);

    /**
     * Nombres (sin repetir) de las rotativas que tienen al menos un día asignado a
     * este tipo de turno. Sirve para advertir el impacto antes de eliminarlo.
     */
    @Query("SELECT DISTINCT d.rotativa.nombre FROM RotativaDiaEntity d " +
           "WHERE d.tipoTurno.idTipoTurno = :idTipoTurno " +
           "ORDER BY d.rotativa.nombre ASC")
    List<String> findNombresRotativasUsando(@Param("idTipoTurno") Long idTipoTurno);

    /**
     * Libera (deja en NULL = día libre) todas las referencias a un tipo de turno
     * antes de eliminarlo del catálogo. Conserva la fila y su diaIndex, por lo que
     * la longitud del patrón de la rotativa no cambia: el día simplemente pasa a ser libre.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE RotativaDiaEntity d SET d.tipoTurno = NULL " +
           "WHERE d.tipoTurno.idTipoTurno = :idTipoTurno")
    int liberarReferenciasAlTipoTurno(@Param("idTipoTurno") Long idTipoTurno);
}
