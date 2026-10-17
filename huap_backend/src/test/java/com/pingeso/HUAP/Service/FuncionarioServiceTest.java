package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.FuncionarioSummaryDTO;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.RolServicioEntity;
import com.pingeso.HUAP.Entity.RolSistemaEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.ServiciosFuncionarioEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.RolServicioRepository;
import com.pingeso.HUAP.Repository.RolSistemaRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.hospital.ViewPersonalEntity;
import com.pingeso.HUAP.hospital.ViewPersonalRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Pruebas de {@link FuncionarioService}.
 *
 * <p>Se enfoca en los flujos principales del servicio: autenticación, transformación de
 * resúmenes, métricas de disponibilidad y registro de personal nuevo.</p>
 */
@ExtendWith(MockitoExtension.class)
class FuncionarioServiceTest {

    @Mock private PasswordEncoder passwordEncoder;
    @Mock private FuncionarioRepository funcionarioRepository;
    @Mock private ViewPersonalRepository viewPersonalRepository;
    @Mock private RolServicioRepository rolServicioRepository;
    @Mock private ServicioRepository servicioRepository;
    @Mock private RolSistemaRepository rolSistemaRepository;
    @Mock private BitacoraService bitacoraService;

    @InjectMocks private FuncionarioService funcionarioService;

    private static FuncionarioEntity funcionario(long id) {
        return FuncionarioEntity.builder()
                .idFuncionario(id)
                .nombre("Juan")
                .apelPat("Pérez")
                .apelMat("García")
                .rut("12345678")
                .dv("9")
                .estado(1)
                .build();
    }

    private static ViewPersonalEntity viewPersonal(String rut, int estado, byte[] clave) {
        ViewPersonalEntity vp = mock(ViewPersonalEntity.class);
        lenient().when(vp.getRut()).thenReturn(rut);
        lenient().when(vp.getDv()).thenReturn("9");
        lenient().when(vp.getNombre()).thenReturn("Juan");
        lenient().when(vp.getApel_pat()).thenReturn("Pérez");
        lenient().when(vp.getApel_mat()).thenReturn("García");
        lenient().when(vp.getEstado()).thenReturn(estado);
        lenient().when(vp.getClave()).thenReturn(clave);
        return vp;
    }

    @Test
    void authenticateWithPassword_activoYPasswordCorrecta_devuelveFuncionario() {
        String rut = "12.345.678-9";
        FuncionarioEntity esperado = funcionario(1L);
        ViewPersonalEntity personal = viewPersonal("12345678", 1, new byte[64]);

        when(viewPersonalRepository.findByRut("12345678")).thenReturn(Optional.of(personal));
        when(funcionarioRepository.findByRut("12345678")).thenReturn(esperado);
        when(passwordEncoder.matches(eq("secret"), anyString())).thenReturn(true);

        FuncionarioEntity resultado = funcionarioService.authenticateWithPassword(rut, "secret");

        assertSame(esperado, resultado);
        verify(viewPersonalRepository).findByRut("12345678");
        verify(funcionarioRepository).findByRut("12345678");
    }

    @Test
    void authenticateWithPassword_rutNoExiste_igualInvocaPasswordEncoder_paraEvitarEnumeracionPorTiempo() {
        // SEC-013: si el RUT no existe, el servicio debe igual invocar passwordEncoder.matches()
        // contra un hash señuelo antes de lanzar la excepción, para que esta rama no responda
        // notablemente más rápido que la de "RUT existe, contraseña incorrecta" (lo que
        // permitiría enumerar RUTs válidos midiendo el tiempo de respuesta).
        String rut = "99.999.999-9";

        when(viewPersonalRepository.findByRut(anyString())).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> funcionarioService.authenticateWithPassword(rut, "cualquierPassword"));

        assertEquals("Credenciales incorrectas", ex.getMessage());
        verify(passwordEncoder).matches(eq("cualquierPassword"), anyString());
    }

    @Test
    void authenticateWithPassword_inactivo_lanzaExcepcion() {
        String rut = "12.345.678-9";
        ViewPersonalEntity personal = viewPersonal("12345678", 5, new byte[64]);

        when(viewPersonalRepository.findByRut("12345678")).thenReturn(Optional.of(personal));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> funcionarioService.authenticateWithPassword(rut, "secret"));

        assertEquals("El usuario se encuentra inactivo en el sistema", ex.getMessage());
    }

    @Test
    void getAllUserSummaryByServicio_filtraServiciosEliminadosYMapeaDatos() {
        FuncionarioEntity funcionario = funcionario(2L);
        ServicioEntity activo = new ServicioEntity();
        activo.setIdServicio(10L);
        activo.setNombre("Urgencias");
        activo.setEliminado(false);

        ServicioEntity eliminado = new ServicioEntity();
        eliminado.setIdServicio(11L);
        eliminado.setNombre("Eliminado");
        eliminado.setEliminado(true);

        RolServicioEntity rol = new RolServicioEntity();
        rol.setIdRolServicio(5L);
        rol.setNombreRol("MEDICO");

        ServiciosFuncionarioEntity sfActivo = new ServiciosFuncionarioEntity();
        sfActivo.setServicio(activo);
        sfActivo.setRolServicio(rol);

        ServiciosFuncionarioEntity sfEliminado = new ServiciosFuncionarioEntity();
        sfEliminado.setServicio(eliminado);
        sfEliminado.setRolServicio(rol);

        funcionario.setServiciosFuncionario(List.of(sfActivo, sfEliminado));
        funcionario.setRolSistema(new RolSistemaEntity());
        funcionario.getRolSistema().setIdRolSistema(1L);

        when(funcionarioRepository.findAllByServicioId(10L)).thenReturn(List.of(funcionario));

        List<FuncionarioSummaryDTO> resumen = funcionarioService.getAllUserSummaryByServicio(10L);

        assertEquals(1, resumen.size());
        assertEquals(10L, resumen.get(0).getServicios().get(0).getIdServicio());
        assertEquals("Urgencias", resumen.get(0).getServicios().get(0).getNombreServicio());
        assertEquals(5L, resumen.get(0).getServicios().get(0).getIdRolServicio());
    }

    @Test
    void getAvailabilityByServicio_devuelveMetricas() {
        when(funcionarioRepository.countByEstadoAndServicioId(1, 7L)).thenReturn(2L);
        when(funcionarioRepository.findAllByServicioId(7L)).thenReturn(List.of(funcionario(1L), funcionario(2L), funcionario(3L), funcionario(4L)));

        Map<String, Object> resultado = funcionarioService.getAvailabilityByServicio(7L);

        assertEquals(2L, resultado.get("activos"));
        assertEquals(2L, resultado.get("inactivos"));
        assertEquals(4L, resultado.get("total"));
        assertEquals(50L, resultado.get("porcentajeActivos"));
    }

    @Test
    void registerPersonal_personalNoRegistrado_guardaFuncionario() {
        String rut = "12.345.678-9";
        ViewPersonalEntity personal = viewPersonal("12345678", 1, new byte[64]);
        RolSistemaEntity rolSistema = new RolSistemaEntity();
        rolSistema.setIdRolSistema(2L);
        FuncionarioEntity guardado = funcionario(100L);

        when(funcionarioRepository.existsByRut("12345678")).thenReturn(false);
        when(viewPersonalRepository.findByRut("12345678")).thenReturn(Optional.of(personal));
        when(rolSistemaRepository.getReferenceById(2L)).thenReturn(rolSistema);
        when(funcionarioRepository.save(any(FuncionarioEntity.class))).thenReturn(guardado);

        Long id = funcionarioService.registerPersonal(rut);

        assertEquals(100L, id);
        verify(funcionarioRepository).save(any(FuncionarioEntity.class));
    }

    // ============================ C-19 y C-23: sumar a una persona a un servicio ============================

    private static RolServicioEntity rol(long id, String nombre) {
        RolServicioEntity r = new RolServicioEntity(nombre);
        r.setIdRolServicio(id);
        return r;
    }

    private static final ServicioEntity URGENCIAS = ServicioEntity.builder().idServicio(4L).nombre("Urgencias").build();
    private static final ServicioEntity CIRUGIA = ServicioEntity.builder().idServicio(3L).nombre("Cirugía").build();

    private static FuncionarioEntity conRelacion(long id, ServicioEntity servicio, RolServicioEntity rol) {
        FuncionarioEntity f = funcionario(id);
        f.getServiciosFuncionario().add(new ServiciosFuncionarioEntity(f, servicio, rol));
        return f;
    }

    @Test
    void updateUser_sumarComoMedicoAQuienYaPertenece_409YNoCambiaSuRol() {
        RolServicioEntity subrogante = rol(2L, "SUBROGANTE");
        FuncionarioEntity f = conRelacion(50L, URGENCIAS, subrogante);
        when(funcionarioRepository.findById(50L)).thenReturn(Optional.of(f));
        when(rolServicioRepository.findById(3L)).thenReturn(Optional.of(rol(3L, "MEDICO")));

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> funcionarioService.updateUser(50L, Map.of("servicioId", 4L, "rol", 3)));
        assertEquals(409, ex.getStatusCode().value());
        assertEquals("La persona ya pertenece a este servicio; no se cambió su rol", ex.getReason());
        assertSame(subrogante, f.getServiciosFuncionario().get(0).getRolServicio());
        verify(funcionarioRepository, never()).save(any());
    }

    @Test
    void updateUser_designarSubroganteAQuienYaPertenece_cambiaSuRol() {
        RolServicioEntity subrogante = rol(2L, "SUBROGANTE");
        FuncionarioEntity f = conRelacion(50L, URGENCIAS, rol(3L, "MEDICO"));
        when(funcionarioRepository.findById(50L)).thenReturn(Optional.of(f));
        when(rolServicioRepository.findById(2L)).thenReturn(Optional.of(subrogante));

        funcionarioService.updateUser(50L, Map.of("servicioId", 4L, "rol", 2));

        assertSame(subrogante, f.getServiciosFuncionario().get(0).getRolServicio());
        verify(funcionarioRepository).save(f);
    }

    @Test
    void updateUser_sumarComoMedicoAQuienNoEsDelServicio_creaSoloEsaRelacionSinTocarLasOtras() {
        RolServicioEntity subroganteEnCirugia = rol(2L, "SUBROGANTE");
        RolServicioEntity medico = rol(3L, "MEDICO");
        FuncionarioEntity f = conRelacion(50L, CIRUGIA, subroganteEnCirugia);
        when(funcionarioRepository.findById(50L)).thenReturn(Optional.of(f));
        when(servicioRepository.findById(4L)).thenReturn(Optional.of(URGENCIAS));
        when(rolServicioRepository.findById(3L)).thenReturn(Optional.of(medico));

        funcionarioService.updateUser(50L, Map.of("servicioId", 4L, "rol", 3));

        assertEquals(2, f.getServiciosFuncionario().size());
        assertSame(subroganteEnCirugia, f.getServiciosFuncionario().get(0).getRolServicio(), "no toca otros roles");
        assertSame(URGENCIAS, f.getServiciosFuncionario().get(1).getServicio());
        assertSame(medico, f.getServiciosFuncionario().get(1).getRolServicio());
        verify(funcionarioRepository).save(f);
    }

    @Test
    void nombreRolServicio_resuelvePorIdOPorNombre() {
        when(rolServicioRepository.findById(1L)).thenReturn(Optional.of(rol(1L, "JEFATURA")));

        assertEquals("JEFATURA", funcionarioService.nombreRolServicio(1));
        assertEquals("JEFATURA", funcionarioService.nombreRolServicio("1"));
        assertEquals("SUBROGANTE", funcionarioService.nombreRolServicio("subrogante"));
        assertNull(funcionarioService.nombreRolServicio(null));
    }

    @Test
    void rolEnServicio_leeElRolDeLaRelacionConEseServicio_oNullSiNoPertenece() {
        FuncionarioEntity f = conRelacion(50L, URGENCIAS, rol(1L, "JEFATURA"));
        f.getServiciosFuncionario().add(new ServiciosFuncionarioEntity(f, CIRUGIA, rol(3L, "MEDICO")));
        when(funcionarioRepository.findById(50L)).thenReturn(Optional.of(f));
        when(funcionarioRepository.findById(99L)).thenReturn(Optional.empty());

        assertEquals("JEFATURA", funcionarioService.rolEnServicio(50L, 4L));
        assertEquals("MEDICO", funcionarioService.rolEnServicio(50L, 3L));
        assertNull(funcionarioService.rolEnServicio(50L, 2L));
        assertNull(funcionarioService.rolEnServicio(99L, 4L));
    }

    // ============================ Quitar la subrogancia (17 oct) ============================

    @Test
    void quitarSubrogancia_quedaMedicoEnEseServicio_sinTocarLosOtros_yDejaElEvento() {
        RolServicioEntity subrogante = rol(2L, "SUBROGANTE");
        RolServicioEntity medico = rol(3L, "MEDICO");
        FuncionarioEntity f = conRelacion(50L, URGENCIAS, subrogante);
        f.getServiciosFuncionario().add(new ServiciosFuncionarioEntity(f, CIRUGIA, subrogante));
        FuncionarioEntity jefatura = funcionario(305L);
        when(funcionarioRepository.findById(50L)).thenReturn(Optional.of(f));
        when(funcionarioRepository.findById(305L)).thenReturn(Optional.of(jefatura));
        when(funcionarioRepository.findByIdFuncionario(50L)).thenReturn(f);
        when(rolServicioRepository.findAll()).thenReturn(List.of(rol(1L, "JEFATURA"), subrogante, medico));

        FuncionarioSummaryDTO dto = funcionarioService.quitarSubrogancia(50L, 4L, 305L);

        assertEquals(50L, dto.getIdFuncionario());
        assertSame(medico, f.getServiciosFuncionario().get(0).getRolServicio(), "en Urgencias queda Médico");
        assertSame(subrogante, f.getServiciosFuncionario().get(1).getRolServicio(), "en Cirugía no cambia");
        verify(funcionarioRepository).save(f);
        verify(bitacoraService).registrarEventoDeServicio("SUBROGANCIA_QUITADA", 4L, jefatura,
                "Juan Pérez deja de ser subrogante de Urgencias y queda como Médico");
    }

    @Test
    void quitarSubrogancia_aQuienNoEsSubroganteDeEseServicio_409() {
        FuncionarioEntity f = conRelacion(50L, URGENCIAS, rol(3L, "MEDICO"));
        f.getServiciosFuncionario().add(new ServiciosFuncionarioEntity(f, CIRUGIA, rol(2L, "SUBROGANTE")));
        when(funcionarioRepository.findById(50L)).thenReturn(Optional.of(f));

        for (long servicio : new long[]{4L, 9L}) { // Médico en Urgencias; sin relación con el 9
            org.springframework.web.server.ResponseStatusException ex = assertThrows(
                    org.springframework.web.server.ResponseStatusException.class,
                    () -> funcionarioService.quitarSubrogancia(50L, servicio, 305L));
            assertEquals(409, ex.getStatusCode().value());
            assertEquals("Esa persona no es subrogante de este servicio", ex.getReason());
        }
        verify(funcionarioRepository, never()).save(any());
        verifyNoInteractions(bitacoraService);
    }

    @Test
    void quitarSubrogancia_aQuienNoExiste_404() {
        when(funcionarioRepository.findById(99L)).thenReturn(Optional.empty());

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> funcionarioService.quitarSubrogancia(99L, 4L, 305L));
        assertEquals(404, ex.getStatusCode().value());
    }
}
