package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.EventLogEntity;
import com.pingeso.HUAP.Repository.EventLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EventLogService {

    private final EventLogRepository eventLogRepository;

    @Autowired
    public EventLogService(EventLogRepository eventLogRepository) {
        this.eventLogRepository = eventLogRepository;
    }

    public List<EventLogEntity> findAll() {
        return eventLogRepository.findAll();
    }

    public Optional<EventLogEntity> findById(Long id) {
        return eventLogRepository.findById(id);
    }

    public List<EventLogEntity> findByTipoEvento(String tipoEvento) {
        return eventLogRepository.findByTipoEvento(tipoEvento);
    }

    public List<EventLogEntity> findByUsuarioId(Long idPersonal) {
        return eventLogRepository.findByUsuario_IdPersonal(idPersonal);
    }

    public List<EventLogEntity> findByIdTurno(Long idTurno) {
        return eventLogRepository.findByIdTurno(idTurno);
    }

    public List<EventLogEntity> findByIdSolicitud(Long idSolicitud) {
        return eventLogRepository.findByIdSolicitud(idSolicitud);
    }

    public List<EventLogEntity> findActive() {
        return eventLogRepository.findByActivoTrue();
    }

    public EventLogEntity save(EventLogEntity event) {
        return eventLogRepository.save(event);
    }
}
