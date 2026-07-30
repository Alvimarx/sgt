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
}
