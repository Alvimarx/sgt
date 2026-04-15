package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Repository.TipoTurnoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // Importante

import java.util.List;
import java.util.Optional;

@Service
public class TipoTurnoService {

    private final TipoTurnoRepository repository;

    @Autowired
    public TipoTurnoService(TipoTurnoRepository repository) {
        this.repository = repository;
    }

    // --- (NUEVO) Método para reordenar masivamente ---
    /**
     * Recibe una lista de tipos de turno y actualiza su 'prioridadInterna'
     * basado en su nuevo orden. Se ejecuta en una transacción.
     */
    @Transactional // Asegura que si algo falla, se hace rollback
    public void reorderTiposTurno(List<TipoTurnoEntity> tiposTurno) {
        if (tiposTurno == null || tiposTurno.isEmpty()) {
            return;
        }

        for (TipoTurnoEntity tt : tiposTurno) {
            // Buscamos la entidad original por su ID
            Optional<TipoTurnoEntity> opt = repository.findById(tt.getIdTipoTurno());
            if (opt.isPresent()) {
                TipoTurnoEntity original = opt.get();
                // Actualizamos solo la prioridad interna
                original.setPrioridadInterna(tt.getPrioridadInterna());
                repository.save(original); // Guardamos el cambio
            }
        }
    }


    // --- CRUD Básico ---

    public List<TipoTurnoEntity> findAll() {
        return repository.findAll();
    }

    public Optional<TipoTurnoEntity> findById(Long id) {
        return repository.findById(id);
    }

    public TipoTurnoEntity save(TipoTurnoEntity tipoTurno) {
        return repository.save(tipoTurno);
    }

    public TipoTurnoEntity update(Long id, TipoTurnoEntity tipoTurnoActualizado) {
        Optional<TipoTurnoEntity> existente = repository.findById(id);
        if (existente.isPresent()) {
            TipoTurnoEntity tipoTurno = existente.get();
            tipoTurno.setNombre(tipoTurnoActualizado.getNombre());
            tipoTurno.setCategoria(tipoTurnoActualizado.getCategoria());
            tipoTurno.setPrioridadInterna(tipoTurnoActualizado.getPrioridadInterna());
            tipoTurno.setMatrizPatron(tipoTurnoActualizado.getMatrizPatron());
            tipoTurno.setCreador(tipoTurnoActualizado.getCreador());
            return repository.save(tipoTurno);
        }
        return null;
    }

    public boolean delete(Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }

    // --- Métodos Específicos ---

    public List<TipoTurnoEntity> findByCategoria(Long idCategoria) {
        return repository.findByCategoriaIdCategoriaTipoTurnoOrderByPrioridadInternaAsc(idCategoria);
    }

    public List<TipoTurnoEntity> findAllByServicioOrdenado(Long idServicio) {
        return repository.findAllByServicioIdOrdenadoParaPintado(idServicio);
    }
}