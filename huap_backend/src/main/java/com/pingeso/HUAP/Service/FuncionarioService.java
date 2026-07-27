package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.*;
import jakarta.persistence.EntityExistsException;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.pingeso.HUAP.DTO.FuncionarioSummaryDTO;
import com.pingeso.HUAP.DTO.RolServicioDTO;

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

    public FuncionarioEntity authenticateWithPassword(String rut, String password){

        if (rut == null || rut.isBlank()) throw new IllegalArgumentException("El argumento rut es obligatorio");

        if (password == null || password.isBlank()) throw new IllegalArgumentException("El argumento password es obligatorio");

        logger.info("[AUTH] Inicio de autenticación. rutOriginal={}", rut);

        FuncionarioEntity funcionarioRetornado;

        // 1. Limpiar el RUT
        String cleanRut = rut.replaceAll("[^0-9Kk]", "").toUpperCase();
        String rutSinDv = cleanRut.length() > 1 ? cleanRut.substring(0, cleanRut.length() - 1) : cleanRut;
        logger.info("[AUTH] RUT normalizado. cleanRut={}, rutSinDv={}", cleanRut, rutSinDv);


        // Buscar al usuario con el rut
        Optional<ViewPersonalEntity> usuario = viewPersonalRepository.findByRut(rutSinDv);
        logger.info("[AUTH] Resultado búsqueda viewPersonal por rutSinDv. encontrado={}", usuario.isPresent());

        // Esto es traido directo de la version legacy, evaluar si se mantiene
        if (usuario.isEmpty()){
            usuario = viewPersonalRepository.findByRut(rut);
            funcionarioRetornado = funcionarioRepository.findByRut(rut);
            logger.info("[AUTH] Búsqueda alternativa por rut completo. encontrado={}, funcionarioEncontrado={}", usuario.isPresent(), funcionarioRetornado != null);
        } else {
            funcionarioRetornado = funcionarioRepository.findByRut(rutSinDv);
            logger.info("[AUTH] Funcionario asociado al rutSinDv encontrado={}", funcionarioRetornado != null);
        }
        
        if (usuario.isEmpty()){
            logger.warn("Intento de login fallido: No se encontró registro para el RUT: {}", rut);
            throw new RuntimeException("Credenciales incorrectas");
        }
        ViewPersonalEntity user = usuario.get();

        //Logica de AUTENTICACIÓN

        if (!Integer.valueOf(1).equals(user.getEstado())){ // 1 = Activo
            logger.warn("Intento de login fallido: Perfil inactivo para RUT: {}", rut);
            throw new RuntimeException("El usuario se encuentra inactivo en el sistema");
        }

    
        String encodedPassword = normalizeEncodedPassword(user.getClave());
        logger.info("[AUTH] Hash normalizado listo. rut={}, longitudEncoded={}", rut, encodedPassword != null ? encodedPassword.length() : null);
        boolean passwordMatches = passwordEncoder.matches(password, encodedPassword);
        logger.info("[AUTH] Resultado de passwordEncoder.matches para rut={}: {}", rut, passwordMatches);
        if (!passwordMatches){
            logger.warn("Intento de login fallido: Contraseña incorrecta para RUT: {}", rut);
            throw new RuntimeException("Credenciales incorrectas");
        }

        //
        return funcionarioRetornado;
    
    }

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
    public List<FuncionarioEntity> getAllUsersByServicio(Long servicioId) {
        if (servicioId == null) {
            return funcionarioRepository.findByEliminadoFalse();
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
            // Excluye los servicios eliminados (soft-delete) para que no aparezcan en la
            // selección/cambio de servicio del frontend.
            List<RolServicioDTO> serviciosList = f.getServiciosFuncionario().stream()
                .filter(sf -> sf.getServicio() != null && !sf.getServicio().isEliminado())
                .map(sf -> new RolServicioDTO(
                    sf.getServicio().getIdServicio(),
                    sf.getServicio().getNombre(),
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

    public FuncionarioEntity findById(Long idFuncionario){
        if (idFuncionario == null) throw new IllegalArgumentException("El id es un campo obligatorio");

        return funcionarioRepository.findByIdFuncionario(idFuncionario);
    }

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
