package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PersonalEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PersonalRepository extends JpaRepository<PersonalEntity, Long> {
    PersonalEntity findByRut(String rut);

    // encontrar el usuario por el id
    Optional<PersonalEntity> findById(Long id);

    // Devuelve todos los usuarios filtrados por servicio
    @Query("SELECT u FROM PersonalEntity u WHERE :servicioId IS NULL OR u.idServicio = :servicioId")
    List<PersonalEntity> findAllByServicioId(@Param("servicioId") Long servicioId);

    // Count users by estado for a given servicio id
    @Query("SELECT COUNT(u) FROM PersonalEntity u WHERE (:servicioId IS NULL OR u.idServicio = :servicioId) AND u.estado = :estado")
    Long countByEstadoAndServicioId(@Param("estado") Integer estado, @Param("servicioId") Long servicioId);

    // En PersonalRepository.java
    List<PersonalEntity> findByIdServicio(Integer idServicio);

    @Query("SELECT p FROM PersonalEntity p WHERE p.rut = :rut")
    List<PersonalEntity> findByRutMultipleServices(@Param("rut") String rut);
}
