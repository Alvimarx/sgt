package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PostulacionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PostulacionRepository extends JpaRepository<PostulacionEntity, Long> {

    List<PostulacionEntity> findByOfertaGeneral_IdOfertaGeneral(Long idOfertaGeneral);

    Optional<PostulacionEntity> findByOfertaGeneral_IdOfertaGeneralAndPostulante_IdFuncionario(Long idOfertaGeneral, Long idFuncionario);

    boolean existsByOfertaGeneral_IdOfertaGeneralAndPostulante_IdFuncionario(Long idOfertaGeneral, Long idFuncionario);
}
