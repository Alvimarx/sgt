package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PersonalEntity;
import com.pingeso.HUAP.Repository.PersonalRepository;
import com.pingeso.HUAP.Repository.PisoRepository;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Optional;
import com.pingeso.HUAP.DTO.ResumenMesDTO;
import com.pingeso.HUAP.Entity.ProfesionEntity;
import com.pingeso.HUAP.Entity.TipoCargoEntity;
import com.pingeso.HUAP.Repository.ProfesionRepository;
import com.pingeso.HUAP.Repository.TipoCargoRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import com.pingeso.HUAP.Entity.TurnoEntity;
import java.time.LocalDateTime;
import java.time.Duration;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;

@Service
public class PersonalService {

    private static final Logger logger = LoggerFactory.getLogger(PersonalService.class);

    private final PersonalRepository personalRepository;

    private final PisoRepository pisoRepository;

    private final SolicitudRepository solicitudRepository;

    private final PasswordEncoder passwordEncoder;

    private final ProfesionRepository profesionRepository;

    private final TipoCargoRepository tipoCargoRepository;

    private final TurnoRepository turnoRepository;

    @Autowired
    public PersonalService(PersonalRepository personalRepository, PisoRepository pisoRepository,
            SolicitudRepository solicitudRepository, PasswordEncoder passwordEncoder,
            ProfesionRepository profesionRepository, TipoCargoRepository tipoCargoRepository,
            TurnoRepository turnoRepository) {
        this.personalRepository = personalRepository;
        this.pisoRepository = pisoRepository;
        this.solicitudRepository = solicitudRepository;
        this.passwordEncoder = passwordEncoder;
        this.profesionRepository = profesionRepository;
        this.tipoCargoRepository = tipoCargoRepository;
        this.turnoRepository = turnoRepository;
    }

    /**
     * Método legacy - Mantener por compatibilidad pero deprecado
     * 
     * @deprecated Usar authenticateWithPassword en su lugar
     */
    @Deprecated
    public Long[] authenticate(String rut) {
        if (rut == null)
            return null;

        // Limpiar el RUT para buscar
        String cleanRut = rut.replaceAll("[^0-9Kk]", "").toUpperCase();

        PersonalEntity byRut = null;

        // Intentar buscar por rut completo (sin dv)
        if (cleanRut.length() > 1) {
            String rutSinDv = cleanRut.substring(0, cleanRut.length() - 1);
            byRut = personalRepository.findByRut(rutSinDv);
        }

        // Si no encontró, intentar con el rut original
        if (byRut == null) {
            byRut = personalRepository.findByRut(rut);
        }

        // Si no encontró, intentar con el rut limpio completo
        if (byRut == null) {
            byRut = personalRepository.findByRut(cleanRut);
        }

        Optional<PersonalEntity> usuarioOpt = Optional.ofNullable(byRut);
        if (usuarioOpt.isEmpty()) {
            return null;
        }

        PersonalEntity usuario = usuarioOpt.get();
        Long servicioId = null;

        // Obtener servicio desde id_servicio
        if (usuario.getIdServicio() != null) {
            servicioId = usuario.getIdServicio().longValue();
        }

        // Retornamos solo los ids: [usuarioId, servicioId]
        return new Long[] { usuario.getIdPersonal(), servicioId };
    }

    /**
     * Autentica un usuario validando RUT y contraseña
     * 
     * @param rut      RUT del usuario (con o sin formato)
     * @param password Contraseña en texto plano
     * @return PersonalEntity si las credenciales son válidas, null en caso
     *         contrario
     */
    public PersonalEntity authenticateWithPassword(String rut, String password) {
        if (rut == null || password == null) return null;

        // 1. Limpiar el RUT
        String cleanRut = rut.replaceAll("[^0-9Kk]", "").toUpperCase();
        String rutSinDv = cleanRut.length() > 1 ? cleanRut.substring(0, cleanRut.length() - 1) : cleanRut;

        // 2. BIFURCACIÓN: Obtenemos TODOS los registros para ese RUT
        // Usamos el nuevo método que creamos para evitar la NonUniqueResultException
        List<PersonalEntity> usuarios = personalRepository.findByRutMultipleServices(rutSinDv);

        // Si no encontró por rutSinDv, intentamos con el cleanRut completo
        if (usuarios.isEmpty()) {
            usuarios = personalRepository.findByRutMultipleServices(cleanRut);
        }

        if (usuarios.isEmpty()) {
            logger.warn("No se encontró ningún registro para el RUT: {}", rut);
            return null;
        }

        // 3. LOGICA DE AUTENTICACIÓN
        // Buscamos dentro de la lista cuál registro coincide con la contraseña
        for (PersonalEntity u : usuarios) {
            // Solo verificamos si está activo (estado 1)
            if (u.getEstado() != null && u.getEstado() == 1) {
                if (passwordEncoder.matches(password, u.getClave())) {
                    // Al encontrar el primero válido, retornamos ese para que el
                    // controlador genere el JWT. El frontend ya sabe que si hay
                    // más de uno, debe pedirle al usuario que elija.
                    return u;
                }
            }
        }

        logger.warn("Contraseña incorrecta o sin perfiles activos para RUT: {}", rut);
        return null;
    }

    /**
     * Obtiene la lista de todos los perfiles (servicios y roles) asociados a un RUT
     */
    public List<java.util.Map<String, Object>> getServiciosYRolesPorRut(String rut) {
        if (rut == null || rut.isEmpty()) return new java.util.ArrayList<>();

        // 1. Limpiar solo caracteres no numéricos (por seguridad),
        // pero NO recortamos el último dígito.
        String cuerpoRut = rut.replaceAll("[^0-9]", "");

        logger.info("Consultando base de datos para el cuerpo del RUT: {}", cuerpoRut);

        // 2. Llamada directa al repositorio
        List<PersonalEntity> registros = personalRepository.findByRutMultipleServices(cuerpoRut);

        // 3. Transformación a la respuesta esperada
        return registros.stream().map(p -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("idPersonal", p.getIdPersonal());
            map.put("idServicio", p.getIdServicio());
            map.put("rol", p.getRol());
            map.put("jefatura", p.getJefatura());
            map.put("nombreCompleto", p.getNombre() + " " + p.getApellidoPaterno());
            return map;
        }).collect(java.util.stream.Collectors.toList());
    }

    // Ahora recibimos directamente el id del servicio y devolvemos los usuarios
    // vinculados a ese servicio
    public List<PersonalEntity> getAllUsers(Long servicioId) {
        if (servicioId == null) {
            // Devolver todos los usuarios si no se especifica un servicio
            return personalRepository.findAll();
        }
        return personalRepository.findAllByServicioId(servicioId);
    }

    // Devuelve un resumen listo para la UI (map) con todos los campos de
    // PersonalEntity
    public List<Map<String, Object>> getAllUsersSummary(Long servicioId) {
        List<PersonalEntity> users = getAllUsers(servicioId);
        List<Map<String, Object>> list = new ArrayList<>();
        for (PersonalEntity u : users) {
            Map<String, Object> m = new HashMap<>();

            // ID
            m.put("id", u.getIdPersonal());
            m.put("idPersonal", u.getIdPersonal());

            // Nombre y apellidos
            m.put("nombre", u.getNombre());
            m.put("apellidoPaterno", u.getApellidoPaterno());
            m.put("apellidoMaterno", u.getApellidoMaterno());

            // Apellidos concatenados (para compatibilidad)
            String apellidos = "";
            if (u.getApellidoPaterno() != null) {
                apellidos = u.getApellidoPaterno();
            }
            if (u.getApellidoMaterno() != null) {
                apellidos += (apellidos.isEmpty() ? "" : " ") + u.getApellidoMaterno();
            }
            m.put("apellidos", apellidos);

            // RUT y DV
            m.put("rutSinDv", u.getRut());
            m.put("dv", u.getDv());
            // RUT completo (para compatibilidad)
            String rutCompleto = u.getRut();
            if (u.getDv() != null) {
                rutCompleto += "-" + u.getDv();
            }
            m.put("rut", rutCompleto);

            // Rol y permisos
            m.put("rol", u.getRol());
            m.put("jefatura", u.getJefatura());

            // Información laboral
            m.put("rrhh", u.getRrhh());
            m.put("idServicio", u.getIdServicio());
            m.put("idTipoCargo", u.getIdTipoCargo());
            m.put("idTipoContrato", u.getIdTipoContrato());
            m.put("profesion", u.getProfesion());

            // Resolver nombre de profesión y tipo de cargo (si existen)
            String profesionNombre = null;
            Integer profId = u.getProfesion();
            if (profId != null) {
                profesionNombre = profesionRepository.findById(profId.longValue()).map(ProfesionEntity::getNombre)
                        .orElse(null);
            }
            m.put("profesionNombre", profesionNombre);

            String tipoCargoNombre = null;
            Integer tipoCargoId = u.getIdTipoCargo();
            if (tipoCargoId != null) {
                tipoCargoNombre = tipoCargoRepository.findById(tipoCargoId.longValue()).map(TipoCargoEntity::getNombre)
                        .orElse(null);
            }
            m.put("tipoCargoNombre", tipoCargoNombre);

            // Estado
            m.put("estadoCodigo", u.getEstado());
            m.put("estado", u.getEstado() == 1 ? "activo" : "inactivo");

            // Fechas
            m.put("dateAdded", u.getDateAdded());

            // Campos para compatibilidad
            m.put("piso", null);
            // Para compatibilidad, dejar "especialidad" con el nombre de la profesión
            // cuando aplique
            m.put("especialidad", profesionNombre);

            list.add(m);
        }
        return list;
    }

    // Devuelve conteo de usuarios activos/inactivos (y total) para el servicio dado
    public Map<String, Object> getAvailabilityByServicio(Long servicioId) {
        Map<String, Object> out = new HashMap<>();
        try {
            // Contar por estado (1 = activo, otros = inactivo)
            Long activos = personalRepository.countByEstadoAndServicioId(1, servicioId);

            // Contar total
            List<PersonalEntity> allUsers = getAllUsers(servicioId);
            long total = allUsers.size();
            long inactivos = total - (activos == null ? 0L : activos);

            out.put("activos", activos == null ? 0L : activos);
            out.put("inactivos", inactivos);
            out.put("total", total);
            double pct = total == 0 ? 0.0 : (100.0 * (activos == null ? 0.0 : activos.doubleValue()) / (double) total);
            out.put("porcentajeActivos", Math.round(pct));
        } catch (Exception e) {
            logger.error("Error al obtener disponibilidad por servicioId={}: {}", servicioId, e.getMessage(), e);
            out.put("activos", 0L);
            out.put("inactivos", 0L);
            out.put("total", 0L);
            out.put("porcentajeActivos", 0);
        }
        return out;
    }

    // Devuelve el resumen (map) de un único usuario por id con todos los campos
    public Map<String, Object> getUserSummary(Long userId) {
        if (userId == null)
            return null;
        PersonalEntity u = personalRepository.findById(userId).orElse(null);
        if (u == null)
            return null;

        Map<String, Object> m = new HashMap<>();

        // ID
        m.put("id", u.getIdPersonal());
        m.put("idPersonal", u.getIdPersonal());

        // Nombre y apellidos
        m.put("nombre", u.getNombre());
        m.put("apellidoPaterno", u.getApellidoPaterno());
        m.put("apellidoMaterno", u.getApellidoMaterno());

        // Apellidos concatenados (para compatibilidad)
        String apellidos = "";
        if (u.getApellidoPaterno() != null) {
            apellidos = u.getApellidoPaterno();
        }
        if (u.getApellidoMaterno() != null) {
            apellidos += (apellidos.isEmpty() ? "" : " ") + u.getApellidoMaterno();
        }
        m.put("apellidos", apellidos);

        // RUT y DV
        m.put("rutSinDv", u.getRut());
        m.put("dv", u.getDv());
        // RUT completo (para compatibilidad)
        String rutCompleto = u.getRut();
        if (u.getDv() != null) {
            rutCompleto += "-" + u.getDv();
        }
        m.put("rut", rutCompleto);

        // Rol y permisos
        m.put("rol", u.getRol());
        m.put("jefatura", u.getJefatura());

        // Información laboral
        m.put("rrhh", u.getRrhh());
        m.put("idServicio", u.getIdServicio());
        m.put("idTipoCargo", u.getIdTipoCargo());
        m.put("idTipoContrato", u.getIdTipoContrato());
        m.put("profesion", u.getProfesion());

        // Resolver nombre de profesión y tipo de cargo
        String profesionNombre = null;
        Integer profId = u.getProfesion();
        if (profId != null) {
            profesionNombre = profesionRepository.findById(profId.longValue()).map(ProfesionEntity::getNombre)
                    .orElse(null);
        }
        m.put("profesionNombre", profesionNombre);

        String tipoCargoNombre = null;
        Integer tipoCargoId = u.getIdTipoCargo();
        if (tipoCargoId != null) {
            tipoCargoNombre = tipoCargoRepository.findById(tipoCargoId.longValue()).map(TipoCargoEntity::getNombre)
                    .orElse(null);
        }
        m.put("tipoCargoNombre", tipoCargoNombre);

        // Estado
        m.put("estadoCodigo", u.getEstado());
        m.put("estado", u.getEstado() == 1 ? "activo" : "inactivo");

        // Fechas
        m.put("dateAdded", u.getDateAdded());

        // Campos para compatibilidad
        m.put("piso", null);
        m.put("especialidad", profesionNombre);
        m.put("servicio", null);

        return m;
    }

    // Actualiza campos permitidos de un usuario y retorna el resumen actualizado
    public Map<String, Object> updateUser(Long userId, Map<String, Object> payload) {
        if (userId == null)
            return null;
        PersonalEntity u = personalRepository.findById(userId).orElse(null);
        if (u == null)
            return null;

        // Actualizar campos simples si vienen en el payload
        if (payload.containsKey("nombre"))
            u.setNombre((String) payload.get("nombre"));
        if (payload.containsKey("apellidoPaterno"))
            u.setApellidoPaterno((String) payload.get("apellidoPaterno"));
        if (payload.containsKey("apellidoMaterno"))
            u.setApellidoMaterno((String) payload.get("apellidoMaterno"));

        // Actualizar RUT (separar rut y dv si viene con guión)
        if (payload.containsKey("rut")) {
            String rutCompleto = (String) payload.get("rut");
            if (rutCompleto != null && rutCompleto.contains("-")) {
                String[] parts = rutCompleto.split("-");
                u.setRut(parts[0]);
                if (parts.length > 1) {
                    u.setDv(parts[1]);
                }
            } else {
                u.setRut(rutCompleto);
            }
        }

        // Estado (convertir string a integer)
        if (payload.containsKey("estado")) {
            String estadoStr = (String) payload.get("estado");
            if ("activo".equalsIgnoreCase(estadoStr)) {
                u.setEstado(1);
            } else {
                u.setEstado(5); // No activo
            }
        }

        // Mapear rol
        if (payload.containsKey("rol")) {
            Object rolObj = payload.get("rol");
            if (rolObj != null) {
                u.setRol(rolObj.toString());
            }
        }

        // Actualizar id_servicio si viene en el payload
        if (payload.containsKey("servicioId")) {
            Object sId = payload.get("servicioId");
            if (sId != null) {
                try {
                    u.setIdServicio(Integer.valueOf(String.valueOf(sId)));
                } catch (Exception e) {
                    logger.warn("No se pudo parsear servicioId='{}' para userId={}", sId, userId);
                }
            }
        }

        personalRepository.save(u);
        return getUserSummary(u.getIdPersonal());
    }

    // Devuelve todas las solicitudes cuyos medicoSolicitante está vinculado al
    // servicio indicado
    public List<SolicitudEntity> getAllSolicitudesByServicioId(Long servicioId) {
        if (servicioId == null)
            return java.util.Collections.emptyList();
        try {
            return solicitudRepository.findAllByMedicoSolicitanteServicioId(servicioId);
        } catch (Exception e) {
            logger.error("Error al obtener solicitudes por servicioId={}: {}", servicioId, e.getMessage(), e);
            return java.util.Collections.emptyList();
        }
    }

    // Devuelve conteo de solicitudes agrupadas por fecha para mostrar en el
    // calendario
    public java.util.List<ResumenMesDTO> getSolicitudCountsByServicioGroupedByDate(Long servicioId) {
        java.util.List<ResumenMesDTO> out = new java.util.ArrayList<>();
        if (servicioId == null)
            return out;
        try {
            java.util.List<Object[]> rows = solicitudRepository.findSolicitudCountsByServicioGroupedByDate(servicioId);
            for (Object[] row : rows) {
                if (row == null || row.length < 2)
                    continue;
                String dia = row[0] == null ? null : row[0].toString();
                Long total = 0L;
                try {
                    total = row[1] == null ? 0L : ((Number) row[1]).longValue();
                } catch (Exception ex) {
                    total = Long.valueOf(String.valueOf(row[1]));
                }
                out.add(new ResumenMesDTO(dia, total));
            }
        } catch (Exception e) {
            logger.error("Error al obtener conteos de solicitudes por servicioId={}: {}", servicioId, e.getMessage(),
                    e);
        }
        return out;
    }

    // Creación de usuarios: deshabilitada.
    // Este método existía para crear nuevos usuarios desde el API. Se conserva
    // la firma por compatibilidad interna, pero lanzará UnsupportedOperation
    // para dejar claro que la operación ya no está permitida.
    public PersonalEntity createUser(Map<String, Object> payload) {
        throw new UnsupportedOperationException("Creación de usuarios deshabilitada");
    }

    // Obtener estadísticas de horas por servicio
    public Map<String, Object> getHorasStatsByServicio(Long servicioId, int page, int size) {
        Map<String, Object> stats = new HashMap<>();
        try {
            List<PersonalEntity> usuarios = getAllUsers(servicioId);

            if (usuarios.isEmpty()) {
                stats.put("total", 0);
                stats.put("promedio", 0.0);
                stats.put("medicos", new ArrayList<>());
                return stats;
            }

            // Calcular fechas para períodos actuales
            LocalDate today = LocalDate.now();
            LocalDate semanaInicio = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            LocalDate mesInicio = today.with(TemporalAdjusters.firstDayOfMonth());

            List<Map<String, Object>> medicosConHoras = new ArrayList<>();

            for (PersonalEntity u : usuarios) {
                // Calcular horas trabajadas totales, semanales y mensuales
                double horasTrabajadas = 0.0;
                double horasSemanales = 0.0;
                double horasMensuales = 0.0;

                try {
                    if (u.getIdPersonal() != null) {
                        java.util.List<TurnoEntity> turnos = turnoRepository.findByIdMedico(u.getIdPersonal());
                        for (TurnoEntity t : turnos) {
                            try {
                                LocalDateTime inicio = LocalDateTime.of(t.getDiaInicioTurno(), t.getHoraInicio());
                                LocalDateTime fin = LocalDateTime.of(t.getDiaFinalTurno(), t.getHoraFin());
                                long minutos = Duration.between(inicio, fin).toMinutes();

                                // Si por alguna razón resulta negativo, ignorar ese turno
                                if (minutos > 0) {
                                    double horasTurno = (double) minutos / 60.0;
                                    horasTrabajadas += horasTurno;

                                    // Verificar si el turno pertenece a la semana actual
                                    if (!t.getDiaInicioTurno().isBefore(semanaInicio)) {
                                        horasSemanales += horasTurno;
                                    }

                                    // Verificar si el turno pertenece al mes actual
                                    if (!t.getDiaInicioTurno().isBefore(mesInicio)) {
                                        horasMensuales += horasTurno;
                                    }
                                }
                            } catch (Exception exInner) {
                                logger.warn("No se pudo calcular duración de turno id={} para medicoId={}: {}",
                                        t.getId(), u.getIdPersonal(), exInner.getMessage());
                            }
                        }
                    }
                } catch (Exception ex) {
                    logger.warn("Error al obtener turnos para medico id={}: {}", u.getIdPersonal(), ex.getMessage());
                }

                // Si hay horas trabajadas, agregar a las estadísticas
                if (horasTrabajadas > 0) {
                    Map<String, Object> medicoInfo = new HashMap<>();
                    medicoInfo.put("id", u.getIdPersonal());
                    String nombreCompleto = (u.getNombre() == null ? "" : u.getNombre());
                    if (u.getApellidoPaterno() != null) {
                        nombreCompleto += " " + u.getApellidoPaterno();
                    }
                    medicoInfo.put("nombre", nombreCompleto.trim());
                    medicoInfo.put("horas_trabajadas", Math.round(horasTrabajadas * 10) / 10.0);
                    medicoInfo.put("horas_semanales", Math.round(horasSemanales * 10) / 10.0);
                    medicoInfo.put("horas_mensuales", Math.round(horasMensuales * 10) / 10.0);
                    medicoInfo.put("horas_contratadas", 160);
                    String rutCompleto2 = u.getRut();
                    if (u.getDv() != null)
                        rutCompleto2 = rutCompleto2 + "-" + u.getDv();
                    medicoInfo.put("rut", rutCompleto2);
                    double utilization = (horasTrabajadas * 100.0) / 160.0; // comparar contra 160 por defecto
                    medicoInfo.put("utilization", Math.round(utilization * 10) / 10.0);
                    medicosConHoras.add(medicoInfo);
                }
            }

            stats.put("total", usuarios.size());
            stats.put("promedio", 0.0);
            stats.put("medicos", medicosConHoras);

            // Ordenar médicos por horas trabajadas
            medicosConHoras.sort((a, b) -> {
                Double horasA = (Double) a.get("horas_trabajadas");
                Double horasB = (Double) b.get("horas_trabajadas");
                return horasB.compareTo(horasA);
            });

            // Paginación
            int totalElements = medicosConHoras.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            int start = page * size;
            int end = Math.min(start + size, totalElements);
            List<Map<String, Object>> paginatedMedicos = medicosConHoras.subList(start, end);

            stats.put("medicos", paginatedMedicos);
            stats.put("currentPage", page);
            stats.put("totalPages", totalPages);
            stats.put("totalElements", totalElements);
            stats.put("size", size);

        } catch (Exception e) {
            logger.error("Error al obtener estadísticas de horas por servicioId={}: {}", servicioId, e.getMessage(), e);
            stats.put("error", e.getMessage());
        }
        return stats;
    }
}