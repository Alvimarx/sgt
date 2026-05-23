package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.BitacoraEntity;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.Solicitud2Entity;
import com.pingeso.HUAP.Repository.BitacoraRepository;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.Solicitud2Repository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BitacoraService {

    private final BitacoraRepository bitacoraRepository;
    private final Solicitud2Repository solicitud2Repository;
    private final FuncionarioRepository funcionarioRepository;

    public List<BitacoraEntity> findAll() {
        return bitacoraRepository.findAll();
    }

    public Optional<BitacoraEntity> findById(Long id) {
        return bitacoraRepository.findById(id);
    }

    public List<BitacoraEntity> findByTipoEvento(String tipoEvento) {
        return bitacoraRepository.findByTipoEvento(tipoEvento);
    }

    public List<BitacoraEntity> findByFuncionario(Long idFuncionario) {
        return bitacoraRepository.findByFuncionario_IdFuncionario(idFuncionario);
    }

    public List<BitacoraEntity> findByTurno(Long idTurno) {
        return bitacoraRepository.findByTurno_IdTurno(idTurno);
    }

    public List<BitacoraEntity> findBySolicitud(Long idSolicitud) {
        return bitacoraRepository.findBySolicitud_IdSolicitud(idSolicitud);
    }

    public List<BitacoraEntity> findActivos() {
        return bitacoraRepository.findByActivoTrue();
    }

    public BitacoraEntity save(BitacoraEntity evento) {
        if (evento.getFechaModificacion() == null) {
            evento.setFechaModificacion(LocalDateTime.now());
        }
        if (evento.getActivo() == null) {
            evento.setActivo(true);
        }
        return bitacoraRepository.save(evento);
    }

    // Llamar siempre desde un afterCommit hook para evitar lock conflicts con la TX principal
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrarEvento(String tipoEvento, Long idSolicitud, Long idFuncionario) {
        try {
            Solicitud2Entity solicitud = idSolicitud != null
                    ? solicitud2Repository.findById(idSolicitud).orElse(null) : null;
            FuncionarioEntity actor = idFuncionario != null
                    ? funcionarioRepository.findById(idFuncionario).orElse(null) : null;

            BitacoraEntity log = BitacoraEntity.builder()
                    .tipoEvento(tipoEvento)
                    .solicitud(solicitud)
                    .funcionario(actor)
                    .fechaInicioAfectada(LocalDateTime.now())
                    .activo(true)
                    .build();
            bitacoraRepository.save(log);
        } catch (Exception e) {
            System.err.println("Error guardando en bitácora: " + e.getMessage());
        }
    }
}
