package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PersonalEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.PersonalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.ArrayList;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioService {

    private static final Logger logger = LoggerFactory.getLogger(ServicioService.class);

    private final ServicioRepository servicioRepository;
    private final PersonalRepository personalRepository;
    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public ServicioService(ServicioRepository servicioRepository, PersonalRepository personalRepository, JdbcTemplate jdbcTemplate) {
        this.servicioRepository = servicioRepository;
        this.personalRepository = personalRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    // Obtener todos los servicios
    public List<ServicioEntity> getAllServicios() {
        return servicioRepository.findAll();
    }

    // Obtener todos los servicios en formato de resumen para la UI
    public List<Map<String, Object>> getAllServiciosSummary() {
        List<ServicioEntity> servicios = servicioRepository.findAll();
        List<Map<String, Object>> list = new ArrayList<>();

        for (ServicioEntity s : servicios) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getIdServicio());
            m.put("nombre", s.getNombre());
            m.put("estado", s.getEstado());
            m.put("idResponsable", s.getIdResponsable());
            m.put("idSubrogante", s.getIdSubrogante());

            // Agregar nombres de responsable y subrogante si existen
            if (s.getResponsable() != null) {
                String nombreResponsable = s.getResponsable().getNombre();
                if (s.getResponsable().getApellidoPaterno() != null) {
                    nombreResponsable += " " + s.getResponsable().getApellidoPaterno();
                }
                m.put("nombreResponsable", nombreResponsable);
            } else {
                m.put("nombreResponsable", null);
            }

            if (s.getSubrogante() != null) {
                String nombreSubrogante = s.getSubrogante().getNombre();
                if (s.getSubrogante().getApellidoPaterno() != null) {
                    nombreSubrogante += " " + s.getSubrogante().getApellidoPaterno();
                }
                m.put("nombreSubrogante", nombreSubrogante);
            } else {
                m.put("nombreSubrogante", null);
            }

            list.add(m);
        }
        return list;
    }

    // Obtener servicio por ID
    public ServicioEntity getServicioById(Integer id) {
        if (id == null)
            return null;
        return servicioRepository.findById(id).orElse(null);
    }

    // Obtener resumen de un servicio por ID
    public Map<String, Object> getServicioSummary(Integer id) {
        if (id == null)
            return null;
        ServicioEntity s = servicioRepository.findById(id).orElse(null);
        if (s == null)
            return null;

        Map<String, Object> m = new HashMap<>();
        m.put("id", s.getIdServicio());
        m.put("nombre", s.getNombre());
        m.put("estado", s.getEstado());
        m.put("idResponsable", s.getIdResponsable());
        m.put("idSubrogante", s.getIdSubrogante());

        // Agregar nombres de responsable y subrogante si existen
        if (s.getResponsable() != null) {
            String nombreResponsable = s.getResponsable().getNombre();
            if (s.getResponsable().getApellidoPaterno() != null) {
                nombreResponsable += " " + s.getResponsable().getApellidoPaterno();
            }
            m.put("nombreResponsable", nombreResponsable);
        } else {
            m.put("nombreResponsable", null);
        }

        if (s.getSubrogante() != null) {
            String nombreSubrogante = s.getSubrogante().getNombre();
            if (s.getSubrogante().getApellidoPaterno() != null) {
                nombreSubrogante += " " + s.getSubrogante().getApellidoPaterno();
            }
            m.put("nombreSubrogante", nombreSubrogante);
        } else {
            m.put("nombreSubrogante", null);
        }

        return m;
    }

    // Buscar servicio por nombre
    public ServicioEntity getServicioByNombre(String nombre) {
        if (nombre == null)
            return null;
        return servicioRepository.findByNombre(nombre).orElse(null);
    }

    // Crear nuevo servicio
    public ServicioEntity createServicio(Map<String, Object> payload) {
        // Validar campos requeridos
        if (!payload.containsKey("nombre")) {
            throw new RuntimeException("Falta campo requerido: nombre");
        }

        ServicioEntity servicio = new ServicioEntity();

        // Asignar nombre
        servicio.setNombre((String) payload.get("nombre"));

        // Asignar estado (por defecto true)
        if (payload.containsKey("estado")) {
            Object estadoObj = payload.get("estado");
            if (estadoObj instanceof Boolean) {
                servicio.setEstado((Boolean) estadoObj);
            } else if (estadoObj instanceof String) {
                servicio.setEstado(Boolean.valueOf((String) estadoObj));
            }
        } else {
            servicio.setEstado(true);
        }

        // Asignar ID de servicio si viene en el payload
        if (payload.containsKey("idServicio")) {
            try {
                servicio.setIdServicio(Integer.valueOf(String.valueOf(payload.get("idServicio"))));
            } catch (Exception e) {
                logger.error("Error al asignar idServicio: {}", e.getMessage());
            }
        }

        // Asignar responsable
        if (payload.containsKey("idResponsable")) {
            Object idResponsableObj = payload.get("idResponsable");
            if (idResponsableObj != null) {
                try {
                    Integer idResponsable = Integer.valueOf(String.valueOf(idResponsableObj));
                    // Verificar que el usuario exista
                    Optional<PersonalEntity> responsable = personalRepository.findById(idResponsable.longValue());
                    if (responsable.isEmpty()) {
                        logger.warn("Usuario responsable con ID {} no encontrado", idResponsable);
                    }
                    servicio.setIdResponsable(idResponsable);
                } catch (Exception e) {
                    logger.error("Error al asignar responsable: {}", e.getMessage());
                }
            }
        }

        // Asignar subrogante
        if (payload.containsKey("idSubrogante")) {
            Object idSubroganteObj = payload.get("idSubrogante");
            if (idSubroganteObj != null) {
                try {
                    Integer idSubrogante = Integer.valueOf(String.valueOf(idSubroganteObj));
                    // Verificar que el usuario exista
                    Optional<PersonalEntity> subrogante = personalRepository.findById(idSubrogante.longValue());
                    if (subrogante.isEmpty()) {
                        logger.warn("Usuario subrogante con ID {} no encontrado", idSubrogante);
                    }
                    servicio.setIdSubrogante(idSubrogante);
                } catch (Exception e) {
                    logger.error("Error al asignar subrogante: {}", e.getMessage());
                }
            }
        }

        return servicioRepository.save(servicio);
    }

    // Actualizar servicio existente
    public Map<String, Object> updateServicio(Integer id, Map<String, Object> payload) {
        if (id == null)
            return null;

        ServicioEntity servicio = servicioRepository.findById(id).orElse(null);
        if (servicio == null)
            return null;

        // Actualizar nombre si viene en el payload
        if (payload.containsKey("nombre")) {
            servicio.setNombre((String) payload.get("nombre"));
        }

        // Actualizar estado si viene en el payload
        if (payload.containsKey("estado")) {
            Object estadoObj = payload.get("estado");
            if (estadoObj instanceof Boolean) {
                servicio.setEstado((Boolean) estadoObj);
            } else if (estadoObj instanceof String) {
                servicio.setEstado(Boolean.valueOf((String) estadoObj));
            }
        }

        // Actualizar responsable si viene en el payload
        if (payload.containsKey("idResponsable")) {
            Object idResponsableObj = payload.get("idResponsable");
            if (idResponsableObj != null) {
                try {
                    Integer idResponsable = Integer.valueOf(String.valueOf(idResponsableObj));
                    // Verificar que el usuario exista
                    Optional<PersonalEntity> responsable = personalRepository.findById(idResponsable.longValue());
                    if (responsable.isEmpty()) {
                        logger.warn("Usuario responsable con ID {} no encontrado", idResponsable);
                    }
                    servicio.setIdResponsable(idResponsable);
                } catch (Exception e) {
                    logger.error("Error al actualizar responsable: {}", e.getMessage());
                    throw new RuntimeException("Error al actualizar responsable: " + e.getMessage());
                }
            } else {
                servicio.setIdResponsable(null);
            }
        }

        // Actualizar subrogante si viene en el payload
        if (payload.containsKey("idSubrogante")) {
            Object idSubroganteObj = payload.get("idSubrogante");
            if (idSubroganteObj != null) {
                try {
                    Integer idSubrogante = Integer.valueOf(String.valueOf(idSubroganteObj));
                    // Verificar que el usuario exista
                    Optional<PersonalEntity> subrogante = personalRepository.findById(idSubrogante.longValue());
                    if (subrogante.isEmpty()) {
                        logger.warn("Usuario subrogante con ID {} no encontrado", idSubrogante);
                    }
                    servicio.setIdSubrogante(idSubrogante);
                } catch (Exception e) {
                    logger.error("Error al actualizar subrogante: {}", e.getMessage());
                    throw new RuntimeException("Error al actualizar subrogante: " + e.getMessage());
                }
            } else {
                servicio.setIdSubrogante(null);
            }
        }

        servicioRepository.save(servicio);
        return getServicioSummary(servicio.getIdServicio());
    }

    // Eliminar servicio
    public boolean deleteServicio(Integer id) {
        if (id == null)
            return false;

        Optional<ServicioEntity> servicio = servicioRepository.findById(id);
        if (servicio.isEmpty())
            return false;

        try {
            servicioRepository.deleteById(id);
            return true;
        } catch (Exception e) {
            logger.error("Error al eliminar servicio con ID {}: {}", id, e.getMessage());
            return false;
        }
    }

    // Obtener usuarios por servicio
    public List<Map<String, Object>> getUsuariosByServicio(Integer servicioId) {
        if (servicioId == null)
            return new ArrayList<>();

        List<PersonalEntity> usuarios = personalRepository.findAllByServicioId(servicioId.longValue());
        List<Map<String, Object>> list = new ArrayList<>();

        for (PersonalEntity u : usuarios) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getIdPersonal());
            m.put("nombre", u.getNombre());
            String apellidos = "";
            if (u.getApellidoPaterno() != null) {
                apellidos = u.getApellidoPaterno();
            }
            if (u.getApellidoMaterno() != null) {
                apellidos += (apellidos.isEmpty() ? "" : " ") + u.getApellidoMaterno();
            }
            m.put("apellidos", apellidos);
            m.put("rol", u.getRol());
            list.add(m);
        }

        return list;
    }

    // Obtener servicios activos
    public List<ServicioEntity> getServiciosActivos() {
        return servicioRepository.findAll().stream()
                .filter(s -> s.getEstado() != null && s.getEstado())
                .toList();
    }
    // Limpiar servicio (Eliminación en cascada manual)
    @Transactional
    public void limpiarServicio(Integer idServicio) {
        if (idServicio == null) return;
        
        // DELETE Turnos Solicitados - MySQL syntax for multi-table delete
        String deleteTurnosSolicitados = "DELETE ts FROM turnos_solicitados ts " +
                "INNER JOIN solicitudes s ON ts.id_solicitud = s.id " +
                "INNER JOIN viewPersonal p ON s.medico_solicitante_id = p.id_personal " +
                "WHERE p.id_servicio = ?";
        jdbcTemplate.update(deleteTurnosSolicitados, idServicio);

        // DELETE Notificaciones
        String deleteNotificaciones = "DELETE FROM notificacion WHERE id_emisor IN (SELECT id_personal FROM viewPersonal WHERE id_servicio = ?) OR id_receptor IN (SELECT id_personal FROM viewPersonal WHERE id_servicio = ?)";
        jdbcTemplate.update(deleteNotificaciones, idServicio, idServicio);

        // DELETE Bitacora
        String deleteBitacora = "DELETE FROM bitacora_de_eventos WHERE id_personal IN (SELECT id_personal FROM viewPersonal WHERE id_servicio = ?)";
        jdbcTemplate.update(deleteBitacora, idServicio);

        // DELETE Solicitudes
        String deleteSolicitudes = "DELETE FROM solicitudes WHERE medico_solicitante_id IN (SELECT id_personal FROM viewPersonal WHERE id_servicio = ?)";
        jdbcTemplate.update(deleteSolicitudes, idServicio);
         
        // DELETE Vinculo Turno Rotativa
        String deleteVinculo = "DELETE vtr FROM vinculo_turno_rotativa vtr " +
                "INNER JOIN turnos t ON vtr.id_turno = t.id " +
                "INNER JOIN viewPersonal p ON t.id_creador = p.id_personal " +
                "WHERE p.id_servicio = ?";
        jdbcTemplate.update(deleteVinculo, idServicio);

        // DELETE Turnos
        String deleteTurnos = "DELETE FROM turnos WHERE id_creador IN (SELECT id_personal FROM viewPersonal WHERE id_servicio = ?)";
        jdbcTemplate.update(deleteTurnos, idServicio);

        // DELETE Turno Base
        String deleteTurnoBase = "DELETE FROM turno_base WHERE id_servicio = ?";
        jdbcTemplate.update(deleteTurnoBase, idServicio);
        
        // DELETE Plantilla Piso Linea
        String deletePlantillaLinea = "DELETE ppl FROM plantilla_piso_linea ppl " +
                "INNER JOIN plantilla_piso pp ON ppl.id_plantilla_piso = pp.id_plantilla_piso " +
                "INNER JOIN viewPersonal p ON pp.id_creador = p.id_personal " +
                "WHERE p.id_servicio = ?";
        jdbcTemplate.update(deletePlantillaLinea, idServicio);

        // DELETE Pisos
        String deletePisos = "DELETE FROM pisos WHERE servicio_id = ?";
        jdbcTemplate.update(deletePisos, idServicio);
        
        // DELETE Plantilla Piso
        String deletePlantillaPiso = "DELETE FROM plantilla_piso WHERE id_creador IN (SELECT id_personal FROM viewPersonal WHERE id_servicio = ?)";
        jdbcTemplate.update(deletePlantillaPiso, idServicio);
        
        // DELETE Tipo Turno
        String deleteTipoTurno = "DELETE tt FROM tipo_turno tt " +
                "INNER JOIN categoria_tipo_turno ctt ON tt.id_categoria_tipo_turno = ctt.id_categoria_tipo_turno " +
                "WHERE ctt.id_servicio = ?";
        jdbcTemplate.update(deleteTipoTurno, idServicio);

        // DELETE Categoria Tipo Turno
        String deleteCategoria = "DELETE FROM categoria_tipo_turno WHERE id_servicio = ?";
        jdbcTemplate.update(deleteCategoria, idServicio);
        
        logger.info("Servicio ID {} limpiado correctamente (datos eliminados).", idServicio);
    }
}
