package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.ServicioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@Service
public class ServicioService {

    private static final Logger logger = LoggerFactory.getLogger(ServicioService.class);

    private final ServicioRepository servicioRepository;

    @Autowired
    public ServicioService(ServicioRepository servicioRepository) {
        this.servicioRepository = servicioRepository;
    }

    private Map<String, Object> convertirServicioAMap(ServicioEntity s) {
        if (s == null) return null;
        Map<String, Object> m = new HashMap<>();
        m.put("id", s.getId()); 
        m.put("nombre", s.getNombre());
        return m;
    }

    public List<ServicioEntity> getAllServicios() {
        return servicioRepository.findAll();
    }

    public List<Map<String, Object>> getAllServiciosSummary() {
        return servicioRepository.findAll().stream()
                .map(this::convertirServicioAMap)
                .collect(Collectors.toList());
    }

    public ServicioEntity getServicioById(Long id) {
        if (id == null) {
            logger.warn("Se intentó buscar un servicio con ID nulo");
            return null;
        }
        return servicioRepository.findById(id).orElse(null);
    }

    public Map<String, Object> getServicioSummary(Long id) {
        return convertirServicioAMap(getServicioById(id));
    }

    public ServicioEntity getServicioByNombre(String nombre) {
        if (nombre == null) return null;
        return servicioRepository.findByNombre(nombre).orElse(null);
    }

    public ServicioEntity createServicio(Map<String, Object> payload) {
        if (!payload.containsKey("nombre")) {
            logger.error("Error al crear servicio: Falta campo requerido 'nombre'");
            throw new RuntimeException("Falta campo requerido: nombre");
        }
        
        ServicioEntity servicio = new ServicioEntity();
        servicio.setNombre((String) payload.get("nombre"));
        
        ServicioEntity nuevoServicio = servicioRepository.save(servicio);
        logger.info("Servicio creado exitosamente con ID: {}", nuevoServicio.getId());
        
        return nuevoServicio;
    }

    public Map<String, Object> updateServicio(Long id, Map<String, Object> payload) {
        if (id == null) return null;
        
        ServicioEntity servicio = servicioRepository.findById(id)
                .orElseThrow(() -> {
                    logger.error("Error al actualizar: Servicio no encontrado con ID {}", id);
                    return new RuntimeException("Servicio no encontrado con ID: " + id);
                });

        if (payload.containsKey("nombre")) {
            String nombreAntiguo = servicio.getNombre();
            servicio.setNombre((String) payload.get("nombre"));
            logger.info("Actualizando nombre de servicio ID {}: '{}' -> '{}'", id, nombreAntiguo, servicio.getNombre());
        }
        
        servicioRepository.save(servicio);
        return getServicioSummary(servicio.getId());
    }

    public boolean deleteServicio(Long id) {
        if (id == null) {
            logger.warn("Se intentó eliminar un servicio con ID nulo");
            return false;
        }
        
        if (!servicioRepository.existsById(id)) {
            logger.warn("Se intentó eliminar el servicio ID {} pero no existe en la base de datos", id);
            return false;
        }
        
        try {
            servicioRepository.deleteById(id);
            logger.info("Servicio ID {} eliminado exitosamente", id);
            return true;
        } catch (Exception e) {
            logger.error("Error al eliminar el servicio ID {}: {}", id, e.getMessage());
            throw new RuntimeException("Error al eliminar servicio: " + e.getMessage());
        }
    }

    // FALTA AGREGAR MÉTODO DE ELIMINACIÓN CON CASCADA MANUAL SI ES NECESARIO PARA LIMPIAR EL SERVICIO

    
}