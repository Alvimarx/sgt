package com.pingeso.HUAP.Repository;

import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;

import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.ServiciosFuncionarioEntity;

import java.util.List;

@Repository
public interface ServiciosFuncionarioRepository extends JpaRepository<ServiciosFuncionarioEntity, Long>{
    List<ServiciosFuncionarioEntity> findByServicio_IdServicioAndFuncionario_EliminadoFalse(Long idServicio);
    boolean existsByServicio_IdServicioAndFuncionario_IdFuncionarioAndFuncionario_EliminadoFalse(
            Long idServicio,
            Long idFuncionario
    );
    
}
