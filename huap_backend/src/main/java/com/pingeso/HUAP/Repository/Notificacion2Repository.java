package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.Notificacion2Entity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface Notificacion2Repository extends JpaRepository<Notificacion2Entity, Long> {
    Optional<Notificacion2Entity> findBySolicitud_IdSolicitud(Long idSolicitud);

    @Query("SELECT n FROM Notificacion2Entity n JOIN n.solicitud s " +
            "WHERE (s.funcionario.idFuncionario = :idFuncionario " +
            "OR s.funcionarioReceptor.idFuncionario = :idFuncionario) " +
            "AND n.estado != 'ELIMINADO' " +
            "ORDER BY n.fechaEnvio DESC")
    List<Notificacion2Entity> findByFuncionarioId(@Param("idFuncionario") Long idFuncionario);
}
