package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class PisoService {

    private static final Logger logger = LoggerFactory.getLogger(PisoService.class);

    private final PisoRepository pisoRepository;
    private final ServicioRepository servicioRepository;
    private final TurnoRepository turnoRepository;
    private final SolicitudRepository solicitudRepository;

    @Autowired
    public PisoService(PisoRepository pisoRepository,
                       ServicioRepository servicioRepository,
                       TurnoRepository turnoRepository,
                       SolicitudRepository solicitudRepository) {
        this.pisoRepository = pisoRepository;
        this.servicioRepository = servicioRepository;
        this.turnoRepository = turnoRepository;
        this.solicitudRepository = solicitudRepository;
    }

    // ====================================================================
    // 1. MÉTODOS DE MAPEO (Reutilizables para evitar código duplicado)
    // ====================================================================

    /**
     * Convierte la Entidad Piso a un Map plano para el Frontend.
     */
    private Map<String, Object> convertirPisoAMap(PisoEntity p) {
        if (p == null) return null;
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId());
        m.put("nombre", p.getNombre());
        
        if (p.getServicio() != null) {
            m.put("servicioId", p.getServicio().getId());
            m.put("servicioNombre", p.getServicio().getNombre());
        } else {
            m.put("servicioId", null);
            m.put("servicioNombre", "Sin Servicio");
        }
        return m;
    }

    // ====================================================================
    // 2. LECTURA (GET)
    // ====================================================================

    public List<PisoEntity> getAllPisos() {
        return pisoRepository.findAll();
    }

    public List<Map<String, Object>> getAllPisosSummary(Long servicioId) {
        List<PisoEntity> pisos;
        if (servicioId != null) {
            pisos = pisoRepository.findByServicio_Id(servicioId);
        } else {
            pisos = pisoRepository.findAll();
        }
        return pisos.stream().map(this::convertirPisoAMap).collect(Collectors.toList());
    }

    public PisoEntity getPisoById(Long id) {
        if (id == null) return null;
        return pisoRepository.findById(id).orElse(null);
    }

    public Map<String, Object> getPisoSummary(Long id) {
        return convertirPisoAMap(getPisoById(id));
    }

    public PisoEntity getPisoByNombre(String nombre) {
        if (nombre == null) return null;
        return pisoRepository.findByNombre(nombre).orElse(null);
    }

    public List<PisoEntity> getPisosByServicioId(Long servicioId) {
        if (servicioId == null) return new ArrayList<>();
        return pisoRepository.findByServicio_Id(servicioId);
    }

    // ====================================================================
    // 3. ESCRITURA Y MODIFICACIÓN (POST/PUT)
    // ====================================================================

    public PisoEntity createPiso(Map<String, Object> payload) {
        if (!payload.containsKey("nombre") || !payload.containsKey("servicioId")) {
            throw new RuntimeException("Faltan campos requeridos: nombre, servicioId");
        }

        PisoEntity piso = new PisoEntity();
        piso.setNombre((String) payload.get("nombre"));

        try {
            Long servicioId = Long.valueOf(payload.get("servicioId").toString());
            ServicioEntity servicio = servicioRepository.findById(servicioId)
                    .orElseThrow(() -> new RuntimeException("Servicio con ID " + servicioId + " no encontrado"));
            piso.setServicio(servicio);
        } catch (NumberFormatException e) {
            throw new RuntimeException("El servicioId debe ser un número válido.");
        }

        return pisoRepository.save(piso);
    }

    public Map<String, Object> updatePiso(Long id, Map<String, Object> payload) {
        if (id == null) return null;

        PisoEntity piso = pisoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Piso no encontrado con ID: " + id));

        if (payload.containsKey("nombre")) {
            piso.setNombre((String) payload.get("nombre"));
        }

        if (payload.containsKey("servicioId")) {
            try {
                Long servicioId = Long.valueOf(payload.get("servicioId").toString());
                ServicioEntity servicio = servicioRepository.findById(servicioId)
                        .orElseThrow(() -> new RuntimeException("Servicio con ID " + servicioId + " no encontrado"));
                piso.setServicio(servicio);
            } catch (NumberFormatException e) {
                throw new RuntimeException("El servicioId debe ser un número válido.");
            }
        }

        pisoRepository.save(piso);
        return getPisoSummary(piso.getId());
    }

    // ====================================================================
    // 4. ELIMINACIÓN CON CASCADA MANUAL
    // ====================================================================

    @Transactional
    public boolean deletePiso(Long id) {
        if (id == null) return false;

        logger.info(">>> [DELETE PISO] Intentando eliminar piso con ID: {}", id);

        if (!pisoRepository.existsById(id)) {
            logger.warn(">>> [DELETE PISO] Piso no encontrado en la base de datos.");
            return false;
        }

        try {
            // MEJORA: Usamos el método nativo por Long, ya no por String
            List<TurnoEntity> turnosAsociados = turnoRepository.findByPiso_Id(id);
            logger.info(">>> [DELETE PISO] Turnos encontrados asociados al piso: {}", turnosAsociados.size());

            List<SolicitudEntity> solicitudesABorrar = new ArrayList<>();

            for (TurnoEntity turno : turnosAsociados) {
                // 1. Buscar solicitudes que referencian a este turno como turno principal
                solicitudesABorrar.addAll(solicitudRepository.findByTurno(turno));

                // 2. Buscar solicitudes donde este turno es el del solicitante
                solicitudesABorrar.addAll(solicitudRepository.findByTurnoDeSolicitanteId(turno.getId()));
            }

            // Eliminar duplicados
            List<SolicitudEntity> unicasParaBorrar = solicitudesABorrar.stream()
                    .distinct()
                    .collect(Collectors.toList());

            if (!unicasParaBorrar.isEmpty()) {
                solicitudRepository.deleteAll(unicasParaBorrar);
                logger.info(">>> [DELETE PISO] {} Solicitudes eliminadas correctamente.", unicasParaBorrar.size());
            }

            if (!turnosAsociados.isEmpty()) {
                turnoRepository.deleteAll(turnosAsociados);
                logger.info(">>> [DELETE PISO] {} Turnos eliminados correctamente.", turnosAsociados.size());
            }

            pisoRepository.deleteById(id);
            logger.info(">>> [DELETE PISO] Piso ID {} eliminado correctamente. Proceso finalizado.", id);
            return true;
            
        } catch (Exception e) {
            logger.error("Error crítico al eliminar piso con ID {}: {}", id, e.getMessage());
            throw new RuntimeException("Error crítico al eliminar piso y dependencias: " + e.getMessage());
        }
    }
}