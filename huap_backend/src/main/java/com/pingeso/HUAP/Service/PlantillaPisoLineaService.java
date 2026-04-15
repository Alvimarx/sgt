package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PlantillaPisoLineaEntity;
import com.pingeso.HUAP.Repository.PlantillaPisoLineaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
public class PlantillaPisoLineaService {

    private final PlantillaPisoLineaRepository repository;

    @Autowired
    public PlantillaPisoLineaService(PlantillaPisoLineaRepository repository) {
        this.repository = repository;
    }

    public List<PlantillaPisoLineaEntity> findByPlantilla(Long idPlantilla) {
        return repository.findByPlantillaPisoIdPlantillaPisoOrderByOrdenAsc(idPlantilla);
    }

    public PlantillaPisoLineaEntity save(PlantillaPisoLineaEntity linea) {
        return repository.save(linea);
    }

    public boolean delete(Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }

    // Reordenar líneas masivamente (si se llegara a necesitar en el front)
    @Transactional
    public void reorderLineas(List<PlantillaPisoLineaEntity> lineas) {
        for (PlantillaPisoLineaEntity l : lineas) {
            Optional<PlantillaPisoLineaEntity> original = repository.findById(l.getIdPlantillaLinea());
            if (original.isPresent()) {
                PlantillaPisoLineaEntity entidad = original.get();
                entidad.setOrden(l.getOrden());
                repository.save(entidad);
            }
        }
    }
    @Transactional
    public void deleteByPlantilla(Long idPlantilla) {
        repository.deleteByPlantillaPisoIdPlantillaPiso(idPlantilla);
    }
}