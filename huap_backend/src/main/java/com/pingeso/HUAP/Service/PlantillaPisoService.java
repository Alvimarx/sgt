package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PlantillaPisoEntity;
import com.pingeso.HUAP.Repository.PlantillaPisoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class PlantillaPisoService {

    private final PlantillaPisoRepository repository;

    @Autowired
    public PlantillaPisoService(PlantillaPisoRepository repository) {
        this.repository = repository;
    }

    public List<PlantillaPisoEntity> findAll() { return repository.findAll(); }

    public Optional<PlantillaPisoEntity> findById(Long id) { return repository.findById(id); }

    public PlantillaPisoEntity save(PlantillaPisoEntity plantilla) { return repository.save(plantilla); }

    public boolean delete(Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }
}