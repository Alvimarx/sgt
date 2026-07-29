package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

/**
 * Servicio de servicios (unidades del hospital).
 *
 * <p>CRUD de {@link ServicioEntity} (creación, actualización, consulta y soft-delete), listados de
 * vigentes/inactivos, búsqueda paginada por nombre y conteo de dependencias (turnos y funcionarios
 * asociados) para advertir antes de eliminar. Los resúmenes para la API se devuelven como
 * {@code Map} con {@code id} y {@code nombre}.
 */
@Service
public class ServicioService {

    private static final Logger logger = LoggerFactory.getLogger(ServicioService.class);

    private final ServicioRepository servicioRepository;
    private final TurnoRepository turnoRepository;
    private final FuncionarioRepository funcionarioRepository;

    @Autowired
    public ServicioService(ServicioRepository servicioRepository,
                           TurnoRepository turnoRepository,
                           FuncionarioRepository funcionarioRepository) {
        this.servicioRepository = servicioRepository;
        this.turnoRepository = turnoRepository;
        this.funcionarioRepository = funcionarioRepository;
    }

    /** Mapea un servicio a su resumen para la API ({@code id}, {@code nombre}); {@code null} si es nulo. */
    private Map<String, Object> convertirServicioAMap(ServicioEntity s) {
        if (s == null) return null;
        Map<String, Object> m = new HashMap<>();
        m.put("id", s.getIdServicio());
        m.put("nombre", s.getNombre());
        return m;
    }

    /** Lista los servicios inactivos (eliminados por soft-delete). */
    public List<ServicioEntity> getAllServiciosInactivos() {
        return servicioRepository.findByEliminadoTrue();
    }

    /** Resumen de todos los servicios vigentes. */
    public List<Map<String, Object>> getAllServiciosSummary() {
        return servicioRepository.findByEliminadoFalse().stream()
                .map(this::convertirServicioAMap)
                .collect(Collectors.toList());
    }

    /** Obtiene un servicio por id, o {@code null} si el id es nulo o no existe. */
    public ServicioEntity getServicioById(Long id) {
        if (id == null) {
            logger.warn("Se intentó buscar un servicio con ID nulo");
            return null;
        }
        return servicioRepository.findById(id).orElse(null);
    }

    /** Resumen ({@code id}, {@code nombre}) de un servicio, o {@code null} si no existe. */
    public Map<String, Object> getServicioSummary(Long id) {
        return convertirServicioAMap(getServicioById(id));
    }

    /** Busca un servicio vigente por nombre exacto, o {@code null} si no existe. */
    public ServicioEntity getServicioByNombre(String nombre) {
        if (nombre == null) return null;
        return servicioRepository.findByNombreAndEliminadoFalse(nombre).orElse(null);
    }

    /**
     * Crea un servicio.
     * @param payload debe contener la clave {@code nombre}.
     * @return el servicio creado.
     * @throws RuntimeException si falta el campo {@code nombre}.
     */
    public ServicioEntity createServicio(Map<String, Object> payload) {
        if (!payload.containsKey("nombre")) {
            logger.error("Error al crear servicio: Falta campo requerido 'nombre'");
            throw new RuntimeException("Falta campo requerido: nombre");
        }

        ServicioEntity servicio = new ServicioEntity();
        servicio.setNombre((String) payload.get("nombre"));

        ServicioEntity nuevoServicio = servicioRepository.save(servicio);
        logger.info("Servicio creado exitosamente con ID: {}", nuevoServicio.getIdServicio());

        return nuevoServicio;
    }

    /**
     * Actualiza un servicio (por ahora, su nombre).
     * @return el resumen actualizado, o {@code null} si el id es nulo.
     * @throws RuntimeException si el servicio no existe.
     */
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
        return getServicioSummary(servicio.getIdServicio());
    }

    /** Cuenta los turnos (histórico) asociados a un servicio. */
    public long contarTurnosAsociados(Long idServicio) {
        getServicioById(idServicio);
        return turnoRepository.countByServicio_IdServicio(idServicio);
    }

    /** Cuenta los funcionarios asociados a un servicio. */
    public long contarFuncionariosAsociados(Long idServicio) {
        return funcionarioRepository.contarFuncionariosPorServicio(idServicio);
    }

    /** Suma de dependencias (turnos + funcionarios) de un servicio; para advertir antes de eliminar. */
    public long contarDependencias(Long idServicio) {
        long turnos = contarTurnosAsociados(idServicio);
        long funcionarios = contarFuncionariosAsociados(idServicio);
        return turnos + funcionarios;
    }

    /**
     * Elimina un servicio por soft-delete.
     * @return {@code true} si se eliminó; {@code false} si el id es nulo o el servicio no existe.
     */
    public boolean deleteServicio(Long id) {
        if (id == null) {
            logger.warn("Se intentó eliminar un servicio con ID nulo");
            return false;
        }

        ServicioEntity servicio = servicioRepository.findById(id).orElse(null);
        if (servicio == null) {
            logger.warn("Se intentó eliminar el servicio ID {} pero no existe en la base de datos", id);
            return false;
        }

        servicio.setEliminado(true);
        servicioRepository.save(servicio);
        logger.info("Servicio ID {} marcado como eliminado (soft-delete)", id);
        return true;
    }

    /** Lista paginada de los servicios vigentes (resumen). */
    public Page<Map<String, Object>> getServiciosPaginados(Pageable pageable) {
        return servicioRepository.findByEliminadoFalse(pageable)
                .map(this::convertirServicioAMap);
    }

    /**
     * Búsqueda paginada de servicios vigentes por nombre parcial. Si el nombre viene vacío,
     * devuelve todos los vigentes paginados.
     */
    public Page<Map<String, Object>> buscarServicios(String nombre, Pageable pageable) {
        if (nombre == null || nombre.trim().isEmpty()) {
            return getServiciosPaginados(pageable);
        }

        return servicioRepository.findByNombreContainingIgnoreCaseAndEliminadoFalse(nombre.trim(), pageable)
                .map(this::convertirServicioAMap);
    }
}
