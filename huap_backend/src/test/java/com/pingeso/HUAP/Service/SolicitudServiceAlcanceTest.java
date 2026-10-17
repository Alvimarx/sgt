package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.ServiciosFuncionarioEntity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import com.pingeso.HUAP.Repository.TipoSolicitudRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import com.pingeso.HUAP.Security.SeguridadServicio;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * C-17 (BUG-002): alcance de lectura de {@link SolicitudService}. El ADMINISTRADOR ve todas;
 * la gestión, las de su servicio (por el servicio de sus turnos o, en un permiso sin turno, por
 * el del emisor); el médico, solo aquellas en las que es emisor o receptor.
 */
class SolicitudServiceAlcanceTest {

    private static final long URGENCIAS = 4L;
    private static final long ENFERMERIA = 2L;

    private final SolicitudRepository solicitudRepository = mock(SolicitudRepository.class);
    private final SeguridadServicio seguridadServicio = mock(SeguridadServicio.class);

    private final SolicitudService service = new SolicitudService(
            solicitudRepository, mock(FuncionarioRepository.class), mock(TipoSolicitudRepository.class),
            mock(TurnoRepository.class), mock(BitacoraService.class), new ValidadorAsignacionTurnoService(),
            seguridadServicio);

    private static ServicioEntity servicio(long id) {
        return ServicioEntity.builder().idServicio(id).nombre("Servicio " + id).build();
    }

    private static FuncionarioEntity funcionario(long id, long... servicios) {
        FuncionarioEntity f = FuncionarioEntity.builder().idFuncionario(id).nombre("F" + id)
                .serviciosFuncionario(new ArrayList<>()).build();
        for (long s : servicios) f.getServiciosFuncionario().add(new ServiciosFuncionarioEntity(f, servicio(s), null));
        return f;
    }

    private static TurnoEntity turnoDe(long id, long idServicio) {
        return TurnoEntity.builder().idTurno(id).servicio(servicio(idServicio)).build();
    }

    // Urgencias: una cobertura del 10 y un permiso sin turno del 11. Enfermería: una cobertura del 20
    // y un permiso del 21. El médico 10 es además el receptor de un intercambio de Enfermería.
    private final SolicitudEntity coberturaUrgencias = SolicitudEntity.builder().idSolicitud(1L)
            .funcionario(funcionario(10L, URGENCIAS)).turno(turnoDe(100L, URGENCIAS)).build();
    private final SolicitudEntity permisoUrgencias = SolicitudEntity.builder().idSolicitud(2L)
            .funcionario(funcionario(11L, URGENCIAS)).build();
    private final SolicitudEntity coberturaEnfermeria = SolicitudEntity.builder().idSolicitud(3L)
            .funcionario(funcionario(20L, ENFERMERIA)).turno(turnoDe(200L, ENFERMERIA)).build();
    private final SolicitudEntity permisoEnfermeria = SolicitudEntity.builder().idSolicitud(4L)
            .funcionario(funcionario(21L, ENFERMERIA)).build();
    private final SolicitudEntity intercambioRecibido = SolicitudEntity.builder().idSolicitud(5L)
            .funcionario(funcionario(22L, ENFERMERIA)).funcionarioReceptor(funcionario(10L, URGENCIAS))
            .turno(turnoDe(201L, ENFERMERIA)).turnoReceptor(turnoDe(202L, ENFERMERIA)).build();

    private final List<SolicitudEntity> todas = List.of(
            coberturaUrgencias, permisoUrgencias, coberturaEnfermeria, permisoEnfermeria, intercambioRecibido);

    private void sesion(long id, String rol, boolean admin, Long servicio) {
        when(seguridadServicio.idUsuarioActual()).thenReturn(id);
        when(seguridadServicio.esAdministrador()).thenReturn(admin);
        when(seguridadServicio.esGestionDelServicio()).thenReturn("JEFATURA".equals(rol) || "SUBROGANTE".equals(rol));
        when(seguridadServicio.idServicioActual()).thenReturn(servicio);
    }

    @Test
    void getSolicitudes_administrador_veTodas() {
        sesion(1L, null, true, null);
        when(solicitudRepository.findAll()).thenReturn(todas);

        assertEquals(todas, service.findAllSolicitudes());
    }

    @Test
    void getSolicitudes_jefatura_veSoloLasDeSuServicio_incluidoElPermisoSinTurnoDeSuServicio() {
        sesion(305L, "JEFATURA", false, URGENCIAS);
        when(solicitudRepository.findAll()).thenReturn(todas);

        assertEquals(List.of(coberturaUrgencias, permisoUrgencias), service.findAllSolicitudes());
    }

    @Test
    void getSolicitudes_subrogante_veSoloLasDeSuServicio() {
        sesion(101L, "SUBROGANTE", false, ENFERMERIA);
        when(solicitudRepository.findAll()).thenReturn(todas);

        assertEquals(List.of(coberturaEnfermeria, permisoEnfermeria, intercambioRecibido), service.findAllSolicitudes());
    }

    @Test
    void getSolicitudes_medico_veSoloAquellasEnLasQueParticipa() {
        sesion(10L, "MEDICO", false, URGENCIAS);
        when(solicitudRepository.findAll()).thenReturn(todas);

        assertEquals(List.of(coberturaUrgencias, intercambioRecibido), service.findAllSolicitudes());
    }

    @Test
    void porTipoYPorTurno_aplicanElMismoAlcance() {
        sesion(10L, "MEDICO", false, URGENCIAS);
        when(solicitudRepository.findByTipoSolicitud_IdTipoSolicitud(3L))
                .thenReturn(List.of(coberturaUrgencias, coberturaEnfermeria));
        when(solicitudRepository.findByTurno_IdTurno(200L)).thenReturn(List.of(coberturaEnfermeria));

        assertEquals(List.of(coberturaUrgencias), service.findByTipoSolicitud(3L));
        assertTrue(service.findByTurno(200L).isEmpty());
    }

    @Test
    void porFuncionario_lasPropiasSeVenCompletas() {
        sesion(10L, "MEDICO", false, URGENCIAS);
        when(solicitudRepository.findByFuncionario_IdFuncionario(10L)).thenReturn(List.of(coberturaUrgencias));
        when(solicitudRepository.findByFuncionarioReceptor_IdFuncionario(10L)).thenReturn(List.of(intercambioRecibido));

        assertEquals(List.of(coberturaUrgencias), service.findByFuncionario(10L));
        assertEquals(List.of(intercambioRecibido), service.findByFuncionarioReceptor(10L));
    }

    @Test
    void porFuncionario_elMedicoNoLeeLasDeOtraPersona_403() {
        sesion(10L, "MEDICO", false, URGENCIAS);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () -> service.findByFuncionario(11L));
        assertEquals("No puedes consultar las solicitudes de otro funcionario", ex.getMessage());
        assertThrows(AccessDeniedException.class, () -> service.findByFuncionarioReceptor(11L));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void porFuncionario_laGestionLeeLasDeOtraPersonaSoloDeSuServicio() {
        sesion(305L, "JEFATURA", false, URGENCIAS);
        when(solicitudRepository.findByFuncionario_IdFuncionario(22L)).thenReturn(List.of(intercambioRecibido));
        when(solicitudRepository.findByFuncionario_IdFuncionario(11L)).thenReturn(List.of(permisoUrgencias));

        assertTrue(service.findByFuncionario(22L).isEmpty(), "el intercambio es de Enfermería");
        assertEquals(List.of(permisoUrgencias), service.findByFuncionario(11L));
    }
}
