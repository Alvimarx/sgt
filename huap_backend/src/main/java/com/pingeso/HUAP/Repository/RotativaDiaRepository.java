package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.RotativaDiaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RotativaDiaRepository extends JpaRepository<RotativaDiaEntity, Long> {

    List<RotativaDiaEntity> findByRotativa_IdRotativaOrderByDiaIndexAsc(Long idRotativa);

    // Usado antes de eliminar un tipo de turno del catálogo para validar que no esté en uso.
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
