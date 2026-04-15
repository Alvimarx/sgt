package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.CategoriaTipoTurnoEntity;
import com.pingeso.HUAP.Repository.CategoriaTipoTurnoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // Importante

import java.util.List;
import java.util.Optional;

@Service
public class CategoriaTipoTurnoService {

    private final CategoriaTipoTurnoRepository repository;

    @Autowired
    public CategoriaTipoTurnoService(CategoriaTipoTurnoRepository repository) {
        this.repository = repository;
    }

    // --- (NUEVO) Método para reordenar masivamente ---
    /**
     * Recibe una lista de categorías y actualiza su campo 'prioridad'
     * basado en su nuevo orden. Se ejecuta en una transacción.
     */
    @Transactional // Asegura que si algo falla, se hace rollback
    public void reorderCategorias(List<CategoriaTipoTurnoEntity> categorias) {
        if (categorias == null || categorias.isEmpty()) {
            return;
        }

        // Recorremos la lista y actualizamos la prioridad
        for (CategoriaTipoTurnoEntity cat : categorias) {
            // Buscamos la entidad original por su ID
            Optional<CategoriaTipoTurnoEntity> opt = repository.findById(cat.getIdCategoriaTipoTurno());
            if (opt.isPresent()) {
                CategoriaTipoTurnoEntity original = opt.get();
                // Actualizamos solo la prioridad
                original.setPrioridad(cat.getPrioridad());
                repository.save(original); // Guardamos el cambio
            }
            // Si no se encuentra, se ignora (aunque no debería pasar)
        }
    }


    // --- CRUD Básico ---

    public List<CategoriaTipoTurnoEntity> findAll() {
        return repository.findAll();
    }

    public Optional<CategoriaTipoTurnoEntity> findById(Long id) {
        return repository.findById(id);
    }

    public CategoriaTipoTurnoEntity save(CategoriaTipoTurnoEntity categoria) {
        return repository.save(categoria);
    }

    public CategoriaTipoTurnoEntity update(Long id, CategoriaTipoTurnoEntity categoriaActualizada) {
        Optional<CategoriaTipoTurnoEntity> existente = repository.findById(id);
        if (existente.isPresent()) {
            CategoriaTipoTurnoEntity categoria = existente.get();
            categoria.setNombre(categoriaActualizada.getNombre());
            categoria.setPrioridad(categoriaActualizada.getPrioridad());
            categoria.setServicio(categoriaActualizada.getServicio());
            return repository.save(categoria);
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

    public List<CategoriaTipoTurnoEntity> findByServicioOrderByPrioridad(Long idServicio) {
        return repository.findByServicioIdServicioOrderByPrioridadAsc(idServicio);
    }
}