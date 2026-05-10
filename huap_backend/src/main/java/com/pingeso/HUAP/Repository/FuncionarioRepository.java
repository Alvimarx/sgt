package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.FuncionarioEntity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface FuncionarioRepository extends JpaRepository<FuncionarioEntity, Long> {

    // Repository para encontrar el usuario por id
    Optional<FuncionarioEntity> findById(Long id);

    // Repository para encontrar al usuario por el rut
    @Query ("SELECT f FROM FuncionarioEntity f WHERE f.rut = :rut")
    FuncionarioEntity findByRut(@Param ("rut") String rut); 

    
}
