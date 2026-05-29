package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PlantillaDiaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlantillaDiaRepository extends JpaRepository<PlantillaDiaEntity, Long> {

    List<PlantillaDiaEntity> findByPlantilla_IdPlantillaOrderByDiaIndexAsc(Long idPlantilla);

    // Usado antes de eliminar un tipo de turno del catálogo para validar que no esté en uso.
    long countByPlantillaTurno_IdPlantillaTurno(Long idPlantillaTurno);

    /**
     * Nombres (sin repetir) de las rotativas que tienen al menos un día asignado a
     * este tipo de turno. Sirve para advertir el impacto antes de eliminarlo.
     */
    @Query("SELECT DISTINCT d.plantilla.nombre FROM PlantillaDiaEntity d " +
           "WHERE d.plantillaTurno.idPlantillaTurno = :idPlantillaTurno " +
           "ORDER BY d.plantilla.nombre ASC")
    List<String> findNombresRotativasUsando(@Param("idPlantillaTurno") Long idPlantillaTurno);

    /**
     * Libera (deja en NULL = día libre) todas las referencias a un tipo de turno
     * antes de eliminarlo del catálogo. Conserva la fila y su diaIndex, por lo que
     * la longitud del patrón de la rotativa no cambia: el día simplemente pasa a ser libre.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE PlantillaDiaEntity d SET d.plantillaTurno = NULL " +
           "WHERE d.plantillaTurno.idPlantillaTurno = :idPlantillaTurno")
    int liberarReferenciasAlTipoTurno(@Param("idPlantillaTurno") Long idPlantillaTurno);
}
