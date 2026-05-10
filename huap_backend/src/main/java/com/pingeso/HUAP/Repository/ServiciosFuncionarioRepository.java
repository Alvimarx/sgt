package com.pingeso.HUAP.Repository;

import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;

import com.pingeso.HUAP.Entity.ServiciosFuncionarioEntity;

import java.util.List;

@Repository
public interface ServiciosFuncionarioRepository extends JpaRepository<ServiciosFuncionarioEntity, Long>{

    // Repository para encontrar a todos los usuarios dentro de un servicio
    List<ServiciosFuncionarioEntity> findByFuncionario(Long Id);
    
}
