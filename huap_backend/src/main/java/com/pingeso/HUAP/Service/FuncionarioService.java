package com.pingeso.HUAP.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.pingeso.HUAP.DTO.FuncionarioSummaryDTO;
import com.pingeso.HUAP.DTO.ResumenMesDTO;
import com.pingeso.HUAP.DTO.RolServicioDTO;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.RolServicioEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.ServiciosFuncionarioEntity;
import com.pingeso.HUAP.Entity.Solicitud2Entity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.RolServicioRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;

import jakarta.transaction.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FuncionarioService {

    private static final Logger logger = LoggerFactory.getLogger(FuncionarioService.class);

    private final PasswordEncoder passwordEncoder;

    private final FuncionarioRepository funcionarioRepository;
    private final RolServicioRepository rolServicioRepository;
    private final ServicioRepository servicioRepository;

    public FuncionarioEntity authenticateWithPassword(String rut, String password){

        if (rut == null || rut.isBlank()) throw new IllegalArgumentException("El argumento rut es obligatorio");

        if (password == null || password.isBlank()) throw new IllegalArgumentException("El argumento password es obligatorio");
        
        // 1. Limpiar el RUT
        String cleanRut = rut.replaceAll("[^0-9Kk]", "").toUpperCase();
        String rutSinDv = cleanRut.length() > 1 ? cleanRut.substring(0, cleanRut.length() - 1) : cleanRut;

        // Buscar al usuario con el rut
        FuncionarioEntity usuario = funcionarioRepository.findByRut(rutSinDv);

        // Esto es traido directo de la version legacy, evaluar si se mantiene
        if (usuario == null){
            usuario = funcionarioRepository.findByRut(rut);
        }
        
        if (usuario == null){
            logger.warn("Intento de login fallido: No se encontró registro para el RUT: {}", rut);
            throw new RuntimeException("Credenciales incorrectas");
        }


        //Logica de AUTENTICACIÓN

        if (usuario.getEstado() != 1){ // 1 = Activo
            logger.warn("Intento de login fallido: Perfil inactivo para RUT: {}", rut);
            throw new RuntimeException("El usuario se encuentra inactivo en el sistema");
        }

    
        if (!passwordEncoder.matches(password, usuario.getClave())){
            logger.warn("Intento de login fallido: Contraseña incorrecta para RUT: {}", rut);
            throw new RuntimeException("Credenciales incorrectas");
        }
        
        return usuario;
    
    }


    public List<java.util.Map<String, Object>> getServiciosYRolesPorRut(String rut) {
        // Verificacion de entrada
        if (rut == null || rut.isBlank()) throw new IllegalArgumentException("El argumento rut es obligatorio");

        // Limpieza de caracteres
        String cuerpoRut = rut.replaceAll("[^0-9]","");

        logger.info("Consultando base de datos para el cuerpo del RUT: {}", cuerpoRut);

        // Obtener funcionario desde el repositorio
        FuncionarioEntity funcionario = funcionarioRepository.findByRut(cuerpoRut);

        if (funcionario == null){
            logger.warn("No se encontró funcionario con el RUT: {}", cuerpoRut);
            throw new RuntimeException("No se encontro al usuario en el sistema");
        }

        return funcionario.getServiciosFuncionario().stream().map(sf -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();

            map.put("idPersonal", funcionario.getIdFuncionario());
            map.put("nombreCompleto", funcionario.getNombre() + " " + funcionario.getApelPat());


            map.put("idServicio", sf.getServicio() != null ? sf.getServicio().getIdServicio() : null);
            map.put("rolServicio", sf.getRolServicio() != null ? sf.getRolServicio().getIdRolServicio() : null);

            return map;
        }).collect(java.util.stream.Collectors.toList());
        

    }
        
    public List<FuncionarioEntity> getAllUsersByServicio(Long servicioId) {
        if (servicioId == null) {
            return funcionarioRepository.findAll();
        }
        return funcionarioRepository.findAllByServicioId(servicioId);
    }

    private FuncionarioSummaryDTO mapToDTO(FuncionarioEntity f) {
        if (f == null) return null;

        FuncionarioSummaryDTO dto = new FuncionarioSummaryDTO();
        dto.setIdFuncionario(f.getIdFuncionario());
        dto.setNombre(f.getNombre());
        dto.setApellidoPaterno(f.getApelPat());
        dto.setApellidoMaterno(f.getApelMat());
        
        // Apellidos concatenados
        String apellidos = (f.getApelPat() != null ? f.getApelPat() : "") + 
                            (f.getApelMat() != null ? " " + f.getApelMat() : "");
        dto.setApellidos(apellidos);

        dto.setRut(f.getRut());
        dto.setDv(f.getDv());
        dto.setRutCompleto((f.getDv() != null) ? (f.getRut() + "-" + f.getDv()) : f.getRut());


        dto.setEstado(f.getEstado());
        dto.setProfesion(f.getProfesion());
        dto.setIdRolSistema(f.getRolSistema() != null ? f.getRolSistema().getIdRolSistema() : null);

        // Mapeo de la lista de servicios
        if (f.getServiciosFuncionario() != null) {
            List<RolServicioDTO> serviciosList = f.getServiciosFuncionario().stream()
                .map(sf -> new RolServicioDTO(
                    (sf.getServicio() != null) ? sf.getServicio().getIdServicio() : null,
                    (sf.getRolServicio() != null) ? sf.getRolServicio().getIdRolServicio() : null,
                    (sf.getRolServicio() != null) ? sf.getRolServicio().getNombreRol() : null
                )).collect(Collectors.toList());
            
            dto.setServicios(serviciosList);
        }

        return dto;
    }

    /**
     * Obtiene un resumen de todos los usuarios filtrados por servicio.
     * NOTA PARA V2: Si servicioId es null, los campos 'idServicio', 'idRolServicio' 
     * y 'rolServicioNombre' devolverán una LISTA para soportar la nueva lógica 
     * de múltiples servicios por funcionario. La Vista de Administrador debe 
     * estar preparada para iterar estos arreglos.
     * @param servicioId
     * @return FuncionarioSummaryDTO
     * 
     */
    public List<FuncionarioSummaryDTO> getAllUserSummaryByServicio(Long servicioId){
        List<FuncionarioEntity> funcionarios = getAllUsersByServicio(servicioId);

        return funcionarios.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public FuncionarioSummaryDTO getUserSummary(Long funcionarioId){
        if (funcionarioId == null) throw new IllegalArgumentException("El parametro de Id es obligatorio");

        FuncionarioEntity funcionario = funcionarioRepository.findByIdFuncionario(funcionarioId);

        return mapToDTO(funcionario);
    }

    // Devuelve conteo de usuarios activos/inactivos (y total) para el servicio dado
    public Map<String,Object> getAvailabilityByServicio(Long servicioId) {
        if(servicioId == null) throw new IllegalArgumentException("El id del servicio es obligatorio");
        
        Map<String,Object> out = new HashMap<>();
        try {
            Long activos = funcionarioRepository.countByEstadoAndServicioId(1, servicioId);

            List<FuncionarioEntity> allUsers = funcionarioRepository.findAllByServicioId(servicioId);
            long total = allUsers.size();
            long inactivos = total - (activos == null ? 0L : activos);

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

    // Actualización datos del usuario
    @Transactional
    public FuncionarioSummaryDTO updateUser(Long userId, Map<String, Object> payload) {
        if (userId == null) return null;
        
        // V2: Buscamos en la nueva entidad
        FuncionarioEntity u = funcionarioRepository.findById(userId).orElse(null);
        if (u == null) return null;

        // 1. Actualizar campos simples (Datos Personales)
        if (payload.containsKey("nombre"))
            u.setNombre((String) payload.get("nombre"));
        if (payload.containsKey("apellidoPaterno"))
            u.setApelPat((String) payload.get("apellidoPaterno"));
        if (payload.containsKey("apellidoMaterno"))
            u.setApelMat((String) payload.get("apellidoMaterno"));

        // 2. Actualizar RUT
        if (payload.containsKey("rut")) {
            String rutCompleto = (String) payload.get("rut");
            if (rutCompleto != null && rutCompleto.contains("-")) {
                String[] parts = rutCompleto.split("-");
                u.setRut(parts[0].replaceAll("[^0-9]", "")); // Limpiamos por seguridad
                if (parts.length > 1) {
                    u.setDv(parts[1]);
                }
            } else if (rutCompleto != null) {
                u.setRut(rutCompleto.replaceAll("[^0-9]", ""));
            }
        }

        // 3. Estado
        if (payload.containsKey("estado")) {
            String estadoStr = (String) payload.get("estado");
            if ("activo".equalsIgnoreCase(estadoStr)) {
                u.setEstado(1);
            } else {
                u.setEstado(5); // No activo
            }
        }

        if (payload.containsKey("servicioId") && payload.containsKey("rol")) {
            Long sId = Long.valueOf(payload.get("servicioId").toString());
            Long rId = Long.valueOf(payload.get("rol").toString());

            // Buscamos si ya existe la relación en la colección actual
            ServiciosFuncionarioEntity relacion = u.getServiciosFuncionario().stream()
                .filter(sf -> sf.getServicio() != null && sf.getServicio().getIdServicio().equals(sId))
                .findFirst()
                .orElse(null);

            if (relacion != null) {
                // Caso Actualizar: Solo cambiamos el objeto Rol dentro de la relación
                RolServicioEntity nuevoRol = rolServicioRepository.findById(rId).orElse(null);
                if (nuevoRol != null) relacion.setRolServicio(nuevoRol);
            } else {
                // Caso Insertar: Creamos el objeto y lo añadimos a la lista
                ServicioEntity servicioDb = servicioRepository.findById(sId).orElse(null);
                RolServicioEntity rolDb = rolServicioRepository.findById(rId).orElse(null);

                if (servicioDb != null && rolDb != null) {
                    ServiciosFuncionarioEntity nuevaRelacion = new ServiciosFuncionarioEntity();
                    nuevaRelacion.setFuncionario(u); // <--- IMPORTANTE: Establecer ambos lados de la relación
                    nuevaRelacion.setServicio(servicioDb);
                    nuevaRelacion.setRolServicio(rolDb);
                    
                    u.getServiciosFuncionario().add(nuevaRelacion);
                }
            }
        }

    
        funcionarioRepository.save(u);
    
        return getUserSummary(u.getIdFuncionario());
    }

    public FuncionarioEntity findById(Long idFuncionario){
        if (idFuncionario == null) throw new IllegalArgumentException("El id es un campo obligatorio");

        return funcionarioRepository.findByIdFuncionario(idFuncionario);
    }
    
    /**
     * @deprecated TODO: CÓDIGO MUERTO. No tiene controlador asociado. 
     * Se recomienda ELIMINAR en lugar de refactorizar la query para la V2.
     * Antipatrón: Este método debe moverse a SolicitudService.
     * ALERTA V2: La query automática 'findAllByMedicoSolicitanteServicioId' 
     * FALLARÁ porque FuncionarioEntity ya no tiene el atributo 'servicioId' directo.
     
    @Deprecated
    public List<Solicitud2Entity> getAllSolicitudesByServicioId(Long servicioId) {
        if (servicioId == null)
            return java.util.Collections.emptyList();
        try {
            return solicitudRepository.findAllByMedicoSolicitanteServicioId(servicioId);
        } catch (Exception e) {
            logger.error("Error al obtener solicitudes por servicioId={}: {}", servicioId, e.getMessage(), e);
            return java.util.Collections.emptyList();
        }
    }

    */


    /**
     * @deprecated 
     * MOTIVO: Violación de SRP (Single Responsibility Principle). Este método pertenece 
     * al dominio de 'Solicitudes' y debe ser trasladado a SolicitudService.
     * * RIESGO V2: Este método utiliza 'solicitudRepository.findSolicitudCountsByServicioGroupedByDate'. 
     * Dicha consulta en el repositorio lanzará una excepción en la V2 porque intenta 
     * acceder a un 'servicioId' directo en el Funcionario, campo que ha sido 
     * reemplazado por la relación @OneToMany 'serviciosFuncionario'.
     * * TODO: 
     * 1. Mover lógica a SolicitudService.
     * 2. Actualizar la Query en SolicitudRepository para realizar un JOIN con la 
     * nueva tabla intermedia de servicios.
     * 3. Refactorizar el Controlador correspondiente para que inyecte SolicitudService.
     *
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
    
    */
    /**
     * Codigo no estudiado, falta analizar la logica general y de otras entidades para evaluar como 
     * realizarlo bien. Optimizar
     * Quizas ocupar otra logica para estos calculos
     * 
    
    public Map<String, Object> getHorasStatsByServicio(Long servicioId, int page, int size) {
        Map<String, Object> stats = new HashMap<>();
        try {
            // V2: Usamos el método que ya refactorizamos antes para obtener FuncionarioEntity
            List<FuncionarioEntity> usuarios = getAllUsersByServicio(servicioId);

            if (usuarios == null || usuarios.isEmpty()) {
                stats.put("total", 0);
                stats.put("promedio", 0.0);
                stats.put("medicos", new ArrayList<>());
                return stats;
            }

            LocalDate today = LocalDate.now();
            LocalDate semanaInicio = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            LocalDate mesInicio = today.with(TemporalAdjusters.firstDayOfMonth());

            List<Map<String, Object>> medicosConHoras = new ArrayList<>();

            for (FuncionarioEntity u : usuarios) {
                double horasTrabajadas = 0.0;
                double horasSemanales = 0.0;
                double horasMensuales = 0.0;

                try {
                    // V2: getIdFuncionario en lugar de getIdPersonal
                    if (u.getIdFuncionario() != null) { 
                        // TODO: TurnoRepository debe estar preparado para recibir el ID del Funcionario
                        java.util.List<TurnoEntity> turnos = turnoRepository.findByIdMedico(u.getIdFuncionario());
                        
                        for (TurnoEntity t : turnos) {
                            try {
                                LocalDateTime inicio = LocalDateTime.of(t.getDiaInicioTurno(), t.getHoraInicio());
                                LocalDateTime fin = LocalDateTime.of(t.getDiaFinalTurno(), t.getHoraFin());
                                long minutos = Duration.between(inicio, fin).toMinutes();

                                if (minutos > 0) {
                                    double horasTurno = (double) minutos / 60.0;
                                    horasTrabajadas += horasTurno;

                                    if (!t.getDiaInicioTurno().isBefore(semanaInicio)) {
                                        horasSemanales += horasTurno;
                                    }

                                    if (!t.getDiaInicioTurno().isBefore(mesInicio)) {
                                        horasMensuales += horasTurno;
                                    }
                                }
                            } catch (Exception exInner) {
                                logger.warn("No se pudo calcular duración de turno id={} para medicoId={}: {}",
                                        t.getId(), u.getIdFuncionario(), exInner.getMessage());
                            }
                        }
                    }
                } catch (Exception ex) {
                    logger.warn("Error al obtener turnos para medico id={}: {}", u.getIdFuncionario(), ex.getMessage());
                }

                if (horasTrabajadas > 0) {
                    Map<String, Object> medicoInfo = new HashMap<>();
                    medicoInfo.put("id", u.getIdFuncionario()); // V2
                    
                    String nombreCompleto = (u.getNombre() == null ? "" : u.getNombre());
                    // V2: getApelPat en lugar de getApellidoPaterno
                    if (u.getApelPat() != null) {
                        nombreCompleto += " " + u.getApelPat(); 
                    }
                    
                    medicoInfo.put("nombre", nombreCompleto.trim());
                    medicoInfo.put("horas_trabajadas", Math.round(horasTrabajadas * 10) / 10.0);
                    medicoInfo.put("horas_semanales", Math.round(horasSemanales * 10) / 10.0);
                    medicoInfo.put("horas_mensuales", Math.round(horasMensuales * 10) / 10.0);
                    medicoInfo.put("horas_contratadas", 160); // TODO: ¿Debería venir de un campo de la BD?
                    
                    String rutCompleto2 = u.getRut();
                    if (u.getDv() != null)
                        rutCompleto2 = rutCompleto2 + "-" + u.getDv();
                    medicoInfo.put("rut", rutCompleto2);
                    
                    double utilization = (horasTrabajadas * 100.0) / 160.0;
                    medicoInfo.put("utilization", Math.round(utilization * 10) / 10.0);
                    medicosConHoras.add(medicoInfo);
                }
            }

            stats.put("total", usuarios.size());
            stats.put("promedio", 0.0);

            // Ordenar médicos por horas trabajadas
            medicosConHoras.sort((a, b) -> {
                Double horasA = (Double) a.get("horas_trabajadas");
                Double horasB = (Double) b.get("horas_trabajadas");
                return horasB.compareTo(horasA);
            });

            // Paginación en memoria
            int totalElements = medicosConHoras.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            int start = page * size;
            // Evitar excepciones si la página pedida está fuera de rango
            if (start > totalElements) start = totalElements; 
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

    */
}
