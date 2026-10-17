package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.PuestoRequestDTO;
import com.pingeso.HUAP.DTO.RotativaDTO;
import com.pingeso.HUAP.DTO.TipoTurnoDTO;
import com.pingeso.HUAP.Entity.PlanificacionEntity;
import com.pingeso.HUAP.Entity.PuestoEntity;
import com.pingeso.HUAP.Entity.RotativaEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Repository.PlanificacionEjecucionRepository;
import com.pingeso.HUAP.Security.SeguridadServicio;
import com.pingeso.HUAP.Service.PlanificacionService;
import com.pingeso.HUAP.Service.PuestoService;
import com.pingeso.HUAP.Service.ReglaServicioService;
import com.pingeso.HUAP.Service.RotativaService;
import com.pingeso.HUAP.Service.TipoTurnoService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * C-17 en la configuración por servicio (puestos, rotativas, tipos de turno, reglas y
 * planificaciones): las lecturas, y las escrituras de puestos (HU-PUE-01), exigen el servicio
 * de la sesión. El ADMINISTRADOR queda exento dentro de {@code exigirMismoServicio}; aquí la
 * sesión es la gestión de Enfermería y los datos son de Urgencias.
 */
class ConfiguracionServicioAlcanceTest {

    private static final long URGENCIAS = 4L;
    private static final long ENFERMERIA = 2L;

    private final SeguridadServicio seguridadServicio = mock(SeguridadServicio.class);
    private final ServicioEntity urgencias = ServicioEntity.builder().idServicio(URGENCIAS).nombre("Urgencias").build();
    private final ServicioEntity enfermeria = ServicioEntity.builder().idServicio(ENFERMERIA).nombre("Enfermería").build();

    {
        when(seguridadServicio.esAdministrador()).thenReturn(false);
        when(seguridadServicio.idServicioActual()).thenReturn(ENFERMERIA);
        doAnswer(inv -> {
            Long pedido = inv.getArgument(0);
            if (pedido == null || pedido != ENFERMERIA) throw new AccessDeniedException("No tienes acceso a datos de otro servicio");
            return null;
        }).when(seguridadServicio).exigirMismoServicio(any());
    }

    // ============================ Puestos ============================

    private final PuestoService puestoService = mock(PuestoService.class);
    private final PuestoController puestoController = new PuestoController();

    {
        ReflectionTestUtils.setField(puestoController, "puestoService", puestoService);
        ReflectionTestUtils.setField(puestoController, "seguridadServicio", seguridadServicio);
    }

    private PuestoEntity puesto(long id, ServicioEntity servicio) {
        PuestoEntity p = new PuestoEntity();
        p.setIdPuesto(id);
        p.setNombre("Puesto " + id);
        p.setServicio(servicio);
        when(puestoService.obtenerPuesto(id)).thenReturn(p);
        return p;
    }

    @Test
    void puestos_escriturasEnOtroServicio_403SinTocarNada() {
        puesto(7L, urgencias);
        PuestoRequestDTO nuevo = new PuestoRequestDTO();
        nuevo.setIdServicio(URGENCIAS);
        nuevo.setNombre("Box 9");

        assertThrows(AccessDeniedException.class, () -> puestoController.crearPuesto(nuevo));
        assertThrows(AccessDeniedException.class, () -> puestoController.actualizarPuesto(7L, "Otro nombre"));
        assertThrows(AccessDeniedException.class, () -> puestoController.eliminarPuesto(7L));
        verify(puestoService, never()).crearPuesto(any(), any());
        verify(puestoService, never()).actualizarPuesto(any(), any());
        verify(puestoService, never()).eliminarPuesto(any());
    }

    @Test
    void puestos_lecturasDeOtroServicio_403_yElListadoGeneralSeAcota() {
        PuestoEntity ajeno = puesto(7L, urgencias);
        PuestoEntity propio = puesto(8L, enfermeria);
        when(puestoService.obtenerTodosPuestos()).thenReturn(List.of(ajeno, propio));

        assertThrows(AccessDeniedException.class, () -> puestoController.obtenerPuesto(7L));
        assertThrows(AccessDeniedException.class, () -> puestoController.contarTurnosAsociados(7L));
        assertThrows(AccessDeniedException.class, () -> puestoController.obtenerPorServicio(URGENCIAS));
        assertEquals(List.of(propio), puestoController.obtenerTodosPuestos().getBody());
        assertSame(propio, puestoController.obtenerPuesto(8L).getBody());
    }

    @Test
    void puestos_crearEnElServicioPropio_permitido() {
        PuestoRequestDTO nuevo = new PuestoRequestDTO();
        nuevo.setIdServicio(ENFERMERIA);
        nuevo.setNombre("Box 1");

        puestoController.crearPuesto(nuevo);
        verify(puestoService).crearPuesto(ENFERMERIA, "Box 1");
    }

    // ============================ Rotativas y tipos de turno ============================

    private final RotativaService rotativaService = mock(RotativaService.class);
    private final RotativaController rotativaController = new RotativaController(rotativaService, seguridadServicio);
    private final TipoTurnoService tipoTurnoService = mock(TipoTurnoService.class);
    private final TipoTurnoController tipoTurnoController = new TipoTurnoController(tipoTurnoService, seguridadServicio);

    @Test
    void rotativas_deOtroServicio_403_yElListadoGeneralSeAcota() {
        RotativaEntity ajena = new RotativaEntity(urgencias, "Volante", (byte) 1);
        RotativaEntity propia = new RotativaEntity(enfermeria, "Diurna", (byte) 1);
        when(rotativaService.obtenerRotativa(1L)).thenReturn(ajena);
        when(rotativaService.obtenerRotativas()).thenReturn(List.of(ajena, propia));

        assertThrows(AccessDeniedException.class, () -> rotativaController.obtenerRotativa(1L));
        assertThrows(AccessDeniedException.class, () -> rotativaController.obtenerSecuencia(1L));
        assertThrows(AccessDeniedException.class, () -> rotativaController.validarRotativa(1L));
        assertThrows(AccessDeniedException.class, () -> rotativaController.obtenerPorServicio(URGENCIAS));
        List<RotativaDTO> visibles = rotativaController.obtenerRotativas().getBody();
        assertEquals(List.of("Diurna"), visibles.stream().map(RotativaDTO::getNombre).toList());
        verify(rotativaService, never()).obtenerSecuencia(any());
    }

    @Test
    void tiposDeTurno_deOtroServicio_403_yElCatalogoSeAcota() {
        TipoTurnoEntity ajeno = new TipoTurnoEntity("Noche", urgencias, LocalTime.of(20, 0), LocalTime.of(8, 0));
        TipoTurnoEntity propio = new TipoTurnoEntity("Día", enfermeria, LocalTime.of(8, 0), LocalTime.of(20, 0));
        when(tipoTurnoService.obtenerTipoDeTurno(1L)).thenReturn(ajeno);
        when(tipoTurnoService.obtenerCatalogo()).thenReturn(List.of(ajeno, propio));

        assertThrows(AccessDeniedException.class, () -> tipoTurnoController.obtenerTipoDeTurno(1L));
        assertThrows(AccessDeniedException.class, () -> tipoTurnoController.obtenerRotativasAfectadas(1L));
        assertThrows(AccessDeniedException.class, () -> tipoTurnoController.obtenerTiposDeTurnoPorServicio(URGENCIAS));
        List<TipoTurnoDTO> visibles = tipoTurnoController.obtenerCatalogo().getBody();
        assertEquals(List.of("Día"), visibles.stream().map(TipoTurnoDTO::getNombre).toList());
        verify(tipoTurnoService, never()).obtenerRotativasAfectadas(any());
    }

    @Test
    void elAdministradorVeLosCatalogosCompletos() {
        when(seguridadServicio.esAdministrador()).thenReturn(true);
        RotativaEntity ajena = new RotativaEntity(urgencias, "Volante", (byte) 1);
        when(rotativaService.obtenerRotativas()).thenReturn(List.of(ajena));
        TipoTurnoEntity ajeno = new TipoTurnoEntity("Noche", urgencias, LocalTime.of(20, 0), LocalTime.of(8, 0));
        when(tipoTurnoService.obtenerCatalogo()).thenReturn(List.of(ajeno));

        assertEquals(1, rotativaController.obtenerRotativas().getBody().size());
        assertEquals(1, tipoTurnoController.obtenerCatalogo().getBody().size());
    }

    // ============================ Reglas y planificaciones ============================

    @Test
    void reglas_deOtroServicio_403() {
        ReglaServicioService reglaService = mock(ReglaServicioService.class);
        ReglaServicioController reglaController = new ReglaServicioController(reglaService, seguridadServicio);

        assertThrows(AccessDeniedException.class, () -> reglaController.obtenerPorServicio(URGENCIAS));
        verifyNoInteractions(reglaService);
    }

    @Test
    void planificaciones_deOtroServicio_403() {
        PlanificacionService planificacionService = mock(PlanificacionService.class);
        PlanificacionEjecucionRepository ejecucionRepository = mock(PlanificacionEjecucionRepository.class);
        PlanificacionController controller = new PlanificacionController(planificacionService, ejecucionRepository, seguridadServicio);
        when(planificacionService.obtenerPlanificacion(1L)).thenReturn(new PlanificacionEntity(urgencias, "Rotativa 2026"));

        assertThrows(AccessDeniedException.class, () -> controller.obtenerPorServicio(URGENCIAS));
        assertThrows(AccessDeniedException.class, () -> controller.ejecucionesPorServicio(URGENCIAS));
        assertThrows(AccessDeniedException.class, () -> controller.obtener(1L));
        assertThrows(AccessDeniedException.class, () -> controller.ejecuciones(1L));
        verify(planificacionService, never()).obtenerPlanificacionesPorServicio(any());
        verifyNoInteractions(ejecucionRepository);
    }
}
