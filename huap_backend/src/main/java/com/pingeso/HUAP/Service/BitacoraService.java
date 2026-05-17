package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.BitacoraEntity;
import com.pingeso.HUAP.Repository.BitacoraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BitacoraService {

    private final BitacoraRepository bitacoraRepository;

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
}