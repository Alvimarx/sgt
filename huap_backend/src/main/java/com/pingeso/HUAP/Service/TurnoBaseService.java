package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.TurnoBaseEntity;
import com.pingeso.HUAP.Repository.TurnoBaseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TurnoBaseService {

    private final TurnoBaseRepository turnoBaseRepository;

    @Autowired
    public TurnoBaseService(TurnoBaseRepository turnoBaseRepository) {
        this.turnoBaseRepository = turnoBaseRepository;
    }

    // --- CRUD Básico ---

    // Obtener todos
    public List<TurnoBaseEntity> findAll() {
        return turnoBaseRepository.findAll();
    }

    // Obtener por ID
    public Optional<TurnoBaseEntity> findById(Long id) {
        return turnoBaseRepository.findById(id);
    }

    // Guardar (Crear o Actualizar)
    public TurnoBaseEntity save(TurnoBaseEntity turnoBase) {
        return turnoBaseRepository.save(turnoBase);
    }

    // Actualizar (siguiendo el formato de tu updateTurno)
    public TurnoBaseEntity update(Long id, TurnoBaseEntity turnoActualizado) {
        Optional<TurnoBaseEntity> existente = turnoBaseRepository.findById(id);
        if (existente.isPresent()) {
            TurnoBaseEntity turno = existente.get();
            turno.setNombre(turnoActualizado.getNombre());
            turno.setTipoTurno(turnoActualizado.getTipoTurno());
            turno.setHoraInicio(turnoActualizado.getHoraInicio());
            turno.setHoraFin(turnoActualizado.getHoraFin());
            turno.setServicio(turnoActualizado.getServicio());
            turno.setCreador(turnoActualizado.getCreador());
            return turnoBaseRepository.save(turno);
        }
        return null;
    }

    // Eliminar
    public boolean delete(Long id) {
        if (turnoBaseRepository.existsById(id)) {
            turnoBaseRepository.deleteById(id);
            return true;
        }
        return false;
    }

    // --- Métodos de Búsqueda (del Repositorio) ---

    // Buscar por nombre
    public List<TurnoBaseEntity> findByNombre(String nombre) {
        return turnoBaseRepository.findByNombre(nombre);
    }

    // Buscar por tipo de turno
    public List<TurnoBaseEntity> findByTipoTurno(Long tipoTurno) {
        return turnoBaseRepository.findByTipoTurno(tipoTurno);
    }

    // Buscar por ID del servicio
    public List<TurnoBaseEntity> findByServicio(Long idServicio) {
        // Llamamos al método específico del repositorio
        return turnoBaseRepository.findByServicioIdServicio(idServicio);
    }

    // Buscar por ID del creador
    public List<TurnoBaseEntity> findByCreador(Long idCreador) {
        // Llamamos al método específico del repositorio
        return turnoBaseRepository.findByCreadorIdPersonal(idCreador);
    }
}