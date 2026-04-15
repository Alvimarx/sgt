package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PisoService {

    private static final Logger logger = LoggerFactory.getLogger(PisoService.class);

    private final PisoRepository pisoRepository;
    private final ServicioRepository servicioRepository;
    // 1. Cambiamos a 'final' para garantizar que se asigne en el constructor
    private final PlantillaPisoRepository plantillaPisoRepository;
    private final TurnoRepository turnoRepository;
    private final SolicitudRepository solicitudRepository;

    @Autowired
    // 2. Agregamos el tercer repositorio al constructor
    public PisoService(PisoRepository pisoRepository,
                       ServicioRepository servicioRepository,
                       PlantillaPisoRepository plantillaPisoRepository,
                       TurnoRepository turnoRepository,
                       SolicitudRepository solicitudRepository) {
        this.pisoRepository = pisoRepository;
        this.servicioRepository = servicioRepository;
        this.plantillaPisoRepository = plantillaPisoRepository;
        this.turnoRepository = turnoRepository;
        this.solicitudRepository = solicitudRepository;
    }

    // --- EL RESTO DEL CÓDIGO SE MANTIENE EXACTAMENTE IGUAL ---

    public List<PisoEntity> getAllPisos() {
        return pisoRepository.findAll();
    }

    public List<Map<String, Object>> getAllPisosSummary(Long servicioId) {
        List<PisoEntity> pisos;
        if (servicioId != null) {
            pisos = pisoRepository.findAll().stream()
                    .filter(p -> p.getServicio() != null && p.getServicio().getIdServicio().equals(servicioId.intValue()))
                    .toList();
        } else {
            pisos = pisoRepository.findAll();
        }

        List<Map<String, Object>> list = new ArrayList<>();
        for (PisoEntity p : pisos) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", p.getId());
            m.put("nombre", p.getNombre());
            m.put("colorHexa", p.getColorHexa());
            m.put("servicioId", p.getServicio() != null ? p.getServicio().getIdServicio() : null);
            m.put("servicioNombre", p.getServicio() != null ? p.getServicio().getNombre() : null);
            m.put("idPlantillaPiso", p.getPlantillaPiso() != null ? p.getPlantillaPiso().getIdPlantillaPiso() : null);
            list.add(m);
        }
        return list;
    }

    public PisoEntity getPisoById(Long id) {
        if (id == null) return null;
        return pisoRepository.findById(id).orElse(null);
    }

    public Map<String, Object> getPisoSummary(Long id) {
        if (id == null) return null;
        PisoEntity p = pisoRepository.findById(id).orElse(null);
        if (p == null) return null;

        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId());
        m.put("nombre", p.getNombre());
        m.put("colorHexa", p.getColorHexa());
        m.put("servicioId", p.getServicio() != null ? p.getServicio().getIdServicio() : null);
        m.put("servicioNombre", p.getServicio() != null ? p.getServicio().getNombre() : null);
        m.put("idPlantillaPiso", p.getPlantillaPiso() != null ? p.getPlantillaPiso().getIdPlantillaPiso() : null);

        return m;
    }

    public PisoEntity getPisoByNombre(String nombre) {
        if (nombre == null) return null;
        return pisoRepository.findByNombre(nombre).orElse(null);
    }

    public PisoEntity createPiso(Map<String, Object> payload) {
        if (!payload.containsKey("nombre") || !payload.containsKey("servicioId")) {
            throw new RuntimeException("Faltan campos requeridos: nombre, servicioId");
        }

        PisoEntity piso = new PisoEntity();
        piso.setNombre((String) payload.get("nombre"));

        if (payload.containsKey("colorHexa")) {
            piso.setColorHexa((String) payload.get("colorHexa"));
        }

        Object servicioIdObj = payload.get("servicioId");
        if (servicioIdObj != null) {
            try {
                Integer servicioId = Integer.valueOf(String.valueOf(servicioIdObj));
                ServicioEntity servicio = servicioRepository.findById(servicioId).orElse(null);
                if (servicio == null) {
                    throw new RuntimeException("Servicio con ID " + servicioId + " no encontrado");
                }
                piso.setServicio(servicio);
            } catch (Exception e) {
                logger.error("Error al asignar servicio: {}", e.getMessage());
                throw new RuntimeException("Error al asignar servicio: " + e.getMessage());
            }
        }

        return pisoRepository.save(piso);
    }

    public Map<String, Object> updatePiso(Long id, Map<String, Object> payload) {
        if (id == null) return null;

        PisoEntity piso = pisoRepository.findById(id).orElse(null);
        if (piso == null) return null;

        if (payload.containsKey("nombre")) {
            piso.setNombre((String) payload.get("nombre"));
        }

        if (payload.containsKey("colorHexa")) {
            piso.setColorHexa((String) payload.get("colorHexa"));
        }

        if (payload.containsKey("servicioId")) {
            Object servicioIdObj = payload.get("servicioId");
            if (servicioIdObj != null) {
                try {
                    Integer servicioId = Integer.valueOf(String.valueOf(servicioIdObj));
                    ServicioEntity servicio = servicioRepository.findById(servicioId).orElse(null);
                    if (servicio == null) {
                        throw new RuntimeException("Servicio con ID " + servicioId + " no encontrado");
                    }
                    piso.setServicio(servicio);
                } catch (Exception e) {
                    logger.error("Error al actualizar servicio: {}", e.getMessage());
                    throw new RuntimeException("Error al actualizar servicio: " + e.getMessage());
                }
            }
        }

        if (payload.containsKey("plantillaPiso")) {
            Map<String, Object> plantillaMap = (Map<String, Object>) payload.get("plantillaPiso");
            if (plantillaMap == null) {
                piso.setPlantillaPiso(null);
            } else if (plantillaMap.containsKey("idPlantillaPiso")) {
                Long idPlantilla = Long.parseLong(plantillaMap.get("idPlantillaPiso").toString());
                Optional<PlantillaPisoEntity> plantillaOpt = plantillaPisoRepository.findById(idPlantilla);
                if (plantillaOpt.isPresent()) {
                    piso.setPlantillaPiso(plantillaOpt.get());
                }
            }
        }

        pisoRepository.save(piso);
        return getPisoSummary(piso.getId());
    }

    @Transactional
    public boolean deletePiso(Long id) {
        if (id == null) return false;
        
        System.out.println(">>> [DELETE PISO] Intentando eliminar piso con ID: " + id);
        
        Optional<PisoEntity> piso = pisoRepository.findById(id);
        if (piso.isEmpty()) {
            System.out.println(">>> [DELETE PISO] Piso no encontrado en la base de datos.");
            return false;
        }
        
        try {
            // Lógica de eliminación en cascada REFORZADA
            String idPisoStr = String.valueOf(id);
            System.out.println(">>> [DELETE PISO] Buscando turnos con idPiso (String): '" + idPisoStr + "'");

            // 1. Buscar todos los turnos asociados al piso
            List<TurnoEntity> turnosAsociados = turnoRepository.findByIdPiso(idPisoStr);
            System.out.println(">>> [DELETE PISO] Turnos encontrados asociados al piso: " + turnosAsociados.size());

            if (!turnosAsociados.isEmpty()) {
                System.out.println(">>> [DELETE PISO] IDs de turnos a eliminar: " + turnosAsociados.stream().map(TurnoEntity::getId).collect(Collectors.toList()));
            }

            // Lista para acumular todas las solicitudes a borrar
            List<SolicitudEntity> solicitudesABorrar = new ArrayList<>();

            for (TurnoEntity turno : turnosAsociados) {
                // 2. Buscar solicitudes que referencian a este turno como turno principal (turno_id)
                List<SolicitudEntity> solicitudesDirectas = solicitudRepository.findByTurno(turno);
                if (!solicitudesDirectas.isEmpty()) {
                    System.out.println(">>> [DELETE PISO] Turno ID " + turno.getId() + " tiene " + solicitudesDirectas.size() + " solicitudes directas.");
                }
                solicitudesABorrar.addAll(solicitudesDirectas);

                // 2.1 Buscar solicitudes donde este turno es el del solicitante (turno_de_solicitante_id)
                List<SolicitudEntity> solicitudesComoSolicitante = solicitudRepository.findByTurnoDeSolicitanteId(turno.getId());
                if (!solicitudesComoSolicitante.isEmpty()) {
                    System.out.println(">>> [DELETE PISO] Turno ID " + turno.getId() + " aparece en " + solicitudesComoSolicitante.size() + " solicitudes como solicitante.");
                }
                solicitudesABorrar.addAll(solicitudesComoSolicitante);
            }

            // Eliminar duplicados
            List<SolicitudEntity> unicasParaBorrar = solicitudesABorrar.stream().distinct().collect(Collectors.toList());
            System.out.println(">>> [DELETE PISO] Total solicitudes únicas a eliminar: " + unicasParaBorrar.size());
            
            if (!unicasParaBorrar.isEmpty()) {
                System.out.println(">>> [DELETE PISO] IDs de solicitudes a eliminar: " + unicasParaBorrar.stream().map(SolicitudEntity::getId).collect(Collectors.toList()));
            }

            // 3. Borrar todas las solicitudes encontradas
            if (!unicasParaBorrar.isEmpty()) {
                solicitudRepository.deleteAll(unicasParaBorrar);
                System.out.println(">>> [DELETE PISO] Solicitudes eliminadas correctamente.");
            }

            // 4. Eliminar los turnos
            if (!turnosAsociados.isEmpty()) {
                turnoRepository.deleteAll(turnosAsociados);
                System.out.println(">>> [DELETE PISO] Turnos eliminados correctamente.");
            }

            // 5. Eliminar el piso
            pisoRepository.deleteById(id);
            System.out.println(">>> [DELETE PISO] Piso ID " + id + " eliminado correctamente. Proceso finalizado.");
            return true;
        } catch (Exception e) {
            System.err.println(">>> [DELETE PISO] ERROR CRÍTICO: " + e.getMessage());
            e.printStackTrace();
            logger.error("Error al eliminar piso con ID {}: {}", id, e.getMessage());
            throw new RuntimeException("Error crítico al eliminar piso y dependencias: " + e.getMessage());
        }
    }

    public List<PisoEntity> getPisosByServicioId(Long servicioId) {
        if (servicioId == null) return new ArrayList<>();
        return pisoRepository.findAll().stream()
                .filter(p -> p.getServicio() != null && p.getServicio().getIdServicio().equals(servicioId.intValue()))
                .toList();
    }
}