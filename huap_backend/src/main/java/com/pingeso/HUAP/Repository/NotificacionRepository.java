package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.NotificacionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificacionRepository extends JpaRepository<NotificacionEntity, Long> {

    Optional<NotificacionEntity> findBySolicitud_IdSolicitud(Long idSolicitud);
    @Query("SELECT n FROM NotificacionEntity n JOIN n.solicitud s " +
            "WHERE (s.funcionario.idFuncionario = :idFuncionario " +
            "OR s.funcionarioReceptor.idFuncionario = :idFuncionario) " +
            "AND n.estado != 'ELIMINADO' " +
            "ORDER BY n.fechaEnvio DESC")
            
    List<NotificacionEntity> findByFuncionarioId(@Param("idFuncionario") Long idFuncionario);
    
    @Query("SELECT COUNT(n) FROM NotificacionEntity n JOIN n.solicitud s " +
       "WHERE (s.funcionario.idFuncionario = :idFuncionario OR s.funcionarioReceptor.idFuncionario = :idFuncionario) " +
       "AND n.estado = 'NO_LEIDO'")
    long countNoLeidasByFuncionario(@Param("idFuncionario") Long idFuncionario);

}
