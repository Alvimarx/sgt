package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.*;
import com.pingeso.HUAP.hospital.ViewPersonalEntity;
import com.pingeso.HUAP.hospital.ViewPersonalRepository;
import jakarta.persistence.EntityExistsException;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.pingeso.HUAP.DTO.FuncionarioSummaryDTO;
import com.pingeso.HUAP.DTO.RolServicioDTO;
import com.pingeso.HUAP.DTO.ServicioDisponibleDTO;

import jakarta.transaction.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;
import java.util.HexFormat;

import lombok.RequiredArgsConstructor;

/**
 * Servicio de funcionarios (usuarios del sistema).
 *
 * <p>Responsable de la autenticación por RUT y contraseña
 * ({@link #authenticateWithPassword}), la consulta de servicios y roles del funcionario,
 * los resúmenes y la disponibilidad por servicio, la actualización de datos/rol/estado y
 * el registro de personal existente ({@code viewPersonal}) como funcionario del sistema de
 * turnos. La autorización efectiva se aplica en la capa de seguridad y los controllers.
 */
@Service
@RequiredArgsConstructor
public class FuncionarioService {

    private static final Logger logger = LoggerFactory.getLogger(FuncionarioService.class);

    private final PasswordEncoder passwordEncoder;

    private final FuncionarioRepository funcionarioRepository;
    private final ViewPersonalRepository viewPersonalRepository;
    private final RolServicioRepository rolServicioRepository;
    private final ServicioRepository servicioRepository;
    private final RolSistemaRepository rolSistemaRepository;

    // SEC-013: hash BCrypt señuelo, de formato válido pero sin usuario real asociado.
    // Se compara contra él cuando el RUT no existe, para que esa rama tome un tiempo
    // similar al de "RUT existe, contraseña incorrecta" y no se pueda distinguir por
    // temporización si un RUT está o no registrado. No cambia ningún mensaje ni resultado.
    private static final String DUMMY_BCRYPT_HASH =
            "{bcrypt}$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    // ====================================================================
    // AUTENTICACIÓN Y VALIDACIÓN DE CREDENCIALES
    // ====================================================================

    /**
     * Autentica a un funcionario mediante RUT y contraseña, validando estado activo
     * y aplicando la normalización necesaria para comparar el hash almacenado.
     */
    public FuncionarioEntity authenticateWithPassword(String rut, String password){

        if (rut == null || rut.isBlank()) throw new IllegalArgumentException("El argumento rut es obligatorio");

        if (password == null || password.isBlank()) throw new IllegalArgumentException("El argumento password es obligatorio");


        FuncionarioEntity funcionarioRetornado;

        //Limpiar el RUT
        String cleanRut = rut.replaceAll("[^0-9Kk]", "").toUpperCase();
        String rutSinDv = cleanRut.length() > 1 ? cleanRut.substring(0, cleanRut.length() - 1) : cleanRut;


        // Buscar al usuario con el rut
        Optional<ViewPersonalEntity> usuario = viewPersonalRepository.findByRut(rutSinDv);

        // Esto es traido directo de la version legacy, evaluar si se mantiene
        if (usuario.isEmpty()){
            usuario = viewPersonalRepository.findByRut(rut);
            funcionarioRetornado = funcionarioRepository.findByRut(rut);

        } else {
            funcionarioRetornado = funcionarioRepository.findByRut(rutSinDv);
        }
        
        if (usuario.isEmpty()){
            // SEC-013: se ejecuta igual una comparación de hash (contra un valor señuelo)
            // para que esta rama no responda notablemente más rápido que la de
            // "contraseña incorrecta" y así evitar enumerar RUTs válidos por temporización.
            passwordEncoder.matches(password, DUMMY_BCRYPT_HASH);
            throw new RuntimeException("Credenciales incorrectas");
        }
        ViewPersonalEntity user = usuario.get();

        //Logica de AUTENTICACIÓN

        if (!Integer.valueOf(1).equals(user.getEstado())){ // 1 = Activo
            logger.warn("Intento de login fallido: Perfil inactivo para RUT: {}", rut);
            throw new RuntimeException("El usuario se encuentra inactivo en el sistema");
        }

    
        String encodedPassword = normalizeEncodedPassword(user.getClave());
        boolean passwordMatches = passwordEncoder.matches(password, encodedPassword);

        if (!passwordMatches){
            throw new RuntimeException("Credenciales incorrectas");
        }

        //
        return funcionarioRetornado;
    
    }

    /**
     * Normaliza el hash de contraseña recuperado desde la base de datos para poder compararlo
     * correctamente con el valor ingresado por el usuario.
     */
    private String normalizeEncodedPassword(byte[] encodedPassword) {
        // 1. Manejo de nulos o vacíos
        if (encodedPassword == null || encodedPassword.length == 0) {
            logger.error("Error de integridad de datos: El hash de la contraseña recuperado es nulo o vacío.");
            // Lanzamos BadCredentialsException para que la capa superior la maneje igual que un login fallido normal
            throw new BadCredentialsException("Credenciales incorrectas");
        }

        // 2. Escenario B (El más probable según tu ejemplo): Texto hexadecimal guardado como bytes
        if (encodedPassword.length == 128) {
            logger.info("[AUTH] Hash recuperado como texto hexadecimal en bytes (128 bytes). Se usa UTF-8 directo.");
            return new String(encodedPassword, StandardCharsets.UTF_8);
        }

        // 3. Escenario A (Fallback): Hash binario real de 64 bytes
        if (encodedPassword.length == 64) {
            logger.info("[AUTH] Hash recuperado como binario real (64 bytes). Se convierte a hex.");
            return HexFormat.of().formatHex(encodedPassword);
        }

        // 4. Excepción por datos corruptos
        // Si no es ni 64 ni 128, los datos en la base de datos están mal formados.
        logger.error("Error de integridad de datos: Longitud de hash inesperada ({} bytes). Se esperaba 64 o 128.", encodedPassword.length);
        throw new BadCredentialsException("Error interno al validar las credenciales");
    }

    /*
    Actualmente no se esta utilizando
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
     */
    // ====================================================================
    // CONSULTAS Y RESÚMENES DE FUNCIONARIOS
    // ====================================================================

    /**
     * Obtiene los funcionarios vigentes de un servicio específico, o el listado global
     * cuando no se filtra por servicio.
     */
    public List<FuncionarioEntity> getAllUsersByServicio(Long servicioId) {
        if (servicioId == null) {
            return funcionarioRepository.findByEliminadoFalse();
        }
        return funcionarioRepository.findAllByServicioId(servicioId);
    }

    /**
     * Transforma una entidad de funcionario en su DTO de resumen, incluyendo servicios
     * y roles asociados sin exponer los registros eliminados.
     */
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

        // Mapeo de la lista de servicios.
        // Un ADMINISTRADOR ve TODOS los servicios vigentes (rol JEFATURA donde no es miembro),
        // para poder cambiar a cualquiera desde el selector del frontend aunque no tenga asignación.
        // El resto solo ve sus servicios asignados vigentes (excluye eliminados por soft-delete).
        List<RolServicioDTO> serviciosList;
        if (esAdministrador(f)) {
            Map<Long, RolServicioEntity> rolPorServicio = (f.getServiciosFuncionario() != null)
                ? f.getServiciosFuncionario().stream()
                    .filter(sf -> sf.getServicio() != null && sf.getRolServicio() != null)
                    .collect(Collectors.toMap(
                        sf -> sf.getServicio().getIdServicio(),
                        ServiciosFuncionarioEntity::getRolServicio,
                        (a, b) -> a))
                : Map.of();

            serviciosList = servicioRepository.findByEliminadoFalse().stream()
                .map(s -> {
                    RolServicioEntity rol = rolPorServicio.get(s.getIdServicio());
                    return new RolServicioDTO(
                        s.getIdServicio(),
                        s.getNombre(),
                        rol != null ? rol.getIdRolServicio() : null,
                        rol != null ? rol.getNombreRol() : ROL_SERVICIO_ADMIN);
                })
                .collect(Collectors.toList());
        } else if (f.getServiciosFuncionario() != null) {
            serviciosList = f.getServiciosFuncionario().stream()
                .filter(sf -> sf.getServicio() != null && !sf.getServicio().isEliminado())
                .map(sf -> new RolServicioDTO(
                    sf.getServicio().getIdServicio(),
                    sf.getServicio().getNombre(),
                    (sf.getRolServicio() != null) ? sf.getRolServicio().getIdRolServicio() : null,
                    (sf.getRolServicio() != null) ? sf.getRolServicio().getNombreRol() : null
                )).collect(Collectors.toList());
        } else {
            serviciosList = new ArrayList<>();
        }
        dto.setServicios(serviciosList);

        return dto;
    }

    /**
     * Obtiene un resumen de todos los usuarios filtrados por servicio.
     * NOTA PARA V2: Si servicioId es null, los campos 'idServicio', 'idRolServicio' 
     * y 'rolServicioNombre' devolverán una LISTA para soportar la nueva lógica 
     * de múltiples servicios por funcionario.
     * @param servicioId Id del servicio que se quiere obtener los funcionarios
     * @return FuncionarioSummaryDTO
     * 
     */
    public List<FuncionarioSummaryDTO> getAllUserSummaryByServicio(Long servicioId){
        List<FuncionarioEntity> funcionarios = getAllUsersByServicio(servicioId);

        return funcionarios.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene el resumen de un funcionario específico por su identificador.
     */
    public FuncionarioSummaryDTO getUserSummary(Long funcionarioId){
        if (funcionarioId == null) throw new IllegalArgumentException("El parametro de Id es obligatorio");

        FuncionarioEntity funcionario = funcionarioRepository.findByIdFuncionario(funcionarioId);

        return mapToDTO(funcionario);
    }

    /**
     * Devuelve métricas de disponibilidad de funcionarios para un servicio, incluyendo
     * activos, inactivos, total y porcentaje de cobertura activa.
     */
    public Map<String,Object> getAvailabilityByServicio(Long servicioId) {
        if(servicioId == null) throw new IllegalArgumentException("El id del servicio es obligatorio");
        
        Map<String,Object> out = new HashMap<>();
        try {
            long activos = funcionarioRepository.countByEstadoAndServicioId(1, servicioId);

            List<FuncionarioEntity> allUsers = funcionarioRepository.findAllByServicioId(servicioId);
            long total = allUsers.size();
            long inactivos = total - activos;

            out.put("activos", activos);
            out.put("inactivos", inactivos);
            out.put("total", total);
            double pct = total == 0 ? 0.0 : (100.0 * activos / (double) total);
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

    // ====================================================================
    // ACTUALIZACIÓN Y GESTIÓN DE RELACIONES
    // ====================================================================

    /**
     * Actualiza los datos personales de un funcionario y, cuando se envía, también
     * gestiona su relación con un servicio y un rol de servicio.
     */
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
                rolServicioRepository.findById(rId).ifPresent(relacion::setRolServicio);
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

    /**
     * Recupera un funcionario por su identificador interno.
     */
    public FuncionarioEntity findById(Long idFuncionario){
        if (idFuncionario == null) throw new IllegalArgumentException("El id es un campo obligatorio");

        return funcionarioRepository.findByIdFuncionario(idFuncionario);
    }

    // =========================================================
    // ACCESO A SERVICIOS (selección de servicio en el login)
    // =========================================================

    private static final String ROL_SISTEMA_ADMIN = "ADMINISTRADOR";
    /** Rol de servicio por defecto de un ADMINISTRADOR en un servicio donde no es miembro. */
    private static final String ROL_SERVICIO_ADMIN = "JEFATURA";
    /** Rol de servicio por defecto cuando una asignación no tiene rol explícito. */
    private static final String ROL_SERVICIO_DEFECTO = "MEDICO";

    /** ¿El funcionario tiene rol de sistema ADMINISTRADOR (super-admin global)? */
    public boolean esAdministrador(FuncionarioEntity usuario) {
        return usuario != null
                && usuario.getRolSistema() != null
                && ROL_SISTEMA_ADMIN.equals(usuario.getRolSistema().getNombreRol());
    }

    /**
     * Servicios que el funcionario puede elegir al iniciar sesión.
     *
     * <p>Un {@code ADMINISTRADOR} ve <b>todos</b> los servicios vigentes aunque no sea miembro
     * (rol efectivo {@code JEFATURA} en los que no tiene asignación explícita); el resto solo ve
     * sus servicios asignados vigentes.
     */
    public List<ServicioDisponibleDTO> getServiciosDisponibles(FuncionarioEntity usuario) {
        if (esAdministrador(usuario)) {
            // Rol propio por servicio donde el admin SÍ es miembro (respeta su asignación explícita).
            Map<Long, String> rolPorServicio = usuario.getServiciosFuncionario().stream()
                    .filter(sf -> sf.getServicio() != null && sf.getRolServicio() != null)
                    .collect(Collectors.toMap(
                            sf -> sf.getServicio().getIdServicio(),
                            sf -> sf.getRolServicio().getNombreRol(),
                            (a, b) -> a));

            return servicioRepository.findByEliminadoFalse().stream()
                    .map(s -> new ServicioDisponibleDTO(
                            s.getIdServicio(),
                            s.getNombre(),
                            rolPorServicio.getOrDefault(s.getIdServicio(), ROL_SERVICIO_ADMIN)))
                    .collect(Collectors.toList());
        }

        return usuario.getServiciosFuncionario().stream()
                .filter(sf -> sf.getServicio() != null && !sf.getServicio().isEliminado())
                .map(sf -> new ServicioDisponibleDTO(
                        sf.getServicio().getIdServicio(),
                        sf.getServicio().getNombre(),
                        sf.getRolServicio() != null ? sf.getRolServicio().getNombreRol() : ROL_SERVICIO_DEFECTO))
                .collect(Collectors.toList());
    }

    /** Resultado de resolver el acceso a un servicio: el servicio y el rol efectivo del usuario en él. */
    public record AccesoServicio(ServicioEntity servicio, String rolServicio) {}

    /**
     * Resuelve el acceso de un funcionario a un servicio y su rol efectivo en él.
     *
     * <p>Si es miembro del servicio (asignación vigente), usa su rol asignado. Si <b>no</b> es
     * miembro pero es {@code ADMINISTRADOR}, se le concede acceso con rol efectivo {@code JEFATURA}.
     * En cualquier otro caso lanza una excepción (acceso denegado).
     *
     * @throws RuntimeException si el usuario no tiene acceso al servicio o el servicio no existe/está inactivo.
     */
    public AccesoServicio resolverAccesoServicio(FuncionarioEntity usuario, Long idServicio) {
        ServiciosFuncionarioEntity relacion = usuario.getServiciosFuncionario().stream()
                .filter(sf -> sf.getServicio() != null
                        && !sf.getServicio().isEliminado()
                        && sf.getServicio().getIdServicio().equals(idServicio))
                .findFirst()
                .orElse(null);

        if (relacion != null) {
            String rol = relacion.getRolServicio() != null
                    ? relacion.getRolServicio().getNombreRol()
                    : ROL_SERVICIO_DEFECTO;
            return new AccesoServicio(relacion.getServicio(), rol);
        }

        // No es miembro: solo el ADMINISTRADOR puede entrar a cualquier servicio vigente.
        if (esAdministrador(usuario)) {
            ServicioEntity servicio = servicioRepository.findById(idServicio)
                    .filter(s -> !s.isEliminado())
                    .orElseThrow(() -> new RuntimeException("Servicio no encontrado o inactivo"));
            return new AccesoServicio(servicio, ROL_SERVICIO_ADMIN);
        }

        throw new RuntimeException("Acceso denegado al servicio indicado");
    }

    // ====================================================================
    // REGISTRO Y VERIFICACIÓN DE PERSONAL
    // ====================================================================

    /**
     * Servicio que verifica si un usuario esta registrado en el sistema de turnos
     * @param rut Rut del funcionario a consultar
     * @return boolean Indicando si es verdad que esta registrado el usuario
     */
    public Long isPresent(String rut) {
        if (rut == null || rut.isBlank()) {
            throw new IllegalArgumentException("El rut es un campo obligatorio");
        }


        String cleanRut = rut.replaceAll("[^0-9Kk]", "").toUpperCase();

        if (cleanRut.length() <= 1) {
            throw new IllegalArgumentException("El rut no tiene un largo correcto");
        }

        String rutSinDv = cleanRut.substring(0, cleanRut.length() - 1);

        if (funcionarioRepository.existsByRut(rutSinDv)) {
            return funcionarioRepository.findByRut(rutSinDv).getIdFuncionario();
        }

        return -1L;
    }

    /**
     * Servicio encargado de registrar a un usuario del sistema del hospital en el sistema
     * de turnos
     * @param rut
     * @return Long id del nuevo funcionario registrado
     */
    @Transactional
    public Long registerPersonal(String rut) {
        if (rut == null || rut.isBlank()) {
            throw new IllegalArgumentException("El rut es un campo obligatorio");
        }

        String cleanRut = rut.replaceAll("[^0-9Kk]", "").toUpperCase();

        if (cleanRut.length() <= 1) {
            throw new IllegalArgumentException("El rut no tiene un largo correcto");
        }

        String rutSinDv = cleanRut.substring(0, cleanRut.length() - 1);

        // Control de Duplicados: Evita registrar dos veces al mismo funcionario en turnos
        if (funcionarioRepository.existsByRut(rutSinDv)) {
            throw new EntityExistsException("El funcionario ya se encuentra registrado en el sistema de turnos");
        }

        // Buscamos en la vista usando el 'rutSinDv' para que haga match
        ViewPersonalEntity p = viewPersonalRepository.findByRut(rutSinDv)
                .orElseThrow(() -> new EntityNotFoundException("Personal no encontrado"));

        RolSistemaEntity rolSistema = rolSistemaRepository.getReferenceById(2L);

        // Mantiene getEstado() y va sin profesión por ahora
        FuncionarioEntity funcionario = new FuncionarioEntity(
                p.getNombre(),
                p.getApel_pat(),
                p.getApel_mat(),
                p.getRut(),
                p.getDv(),
                p.getEstado(),
                rolSistema
        );

        FuncionarioEntity f = funcionarioRepository.save(funcionario);
        return f.getIdFuncionario();
    }
}
