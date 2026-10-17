package com.pingeso.HUAP.Security;

import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.ServiciosFuncionarioEntity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pruebas de las reglas de pertenencia de {@link AlcanceServicio} (C-17): de qué servicio es
 * una solicitud y quién participa en ella. Sin Spring ni mocks.
 */
class AlcanceServicioTest {

    private static final long URGENCIAS = 4L;
    private static final long ENFERMERIA = 2L;

    private static ServicioEntity servicio(long id) {
        return ServicioEntity.builder().idServicio(id).nombre("Servicio " + id).build();
    }

    private static TurnoEntity turnoDe(long idServicio) {
        return TurnoEntity.builder().idTurno(idServicio * 10).servicio(servicio(idServicio)).build();
    }

    private static FuncionarioEntity funcionarioDe(long id, long... servicios) {
        FuncionarioEntity f = FuncionarioEntity.builder().idFuncionario(id).nombre("F" + id)
                .serviciosFuncionario(new ArrayList<>()).build();
        for (long s : servicios) {
            f.getServiciosFuncionario().add(new ServiciosFuncionarioEntity(f, servicio(s), null));
        }
        return f;
    }

    @Test
    void servicioDe_turnoSinServicio_esNull() {
        assertNull(AlcanceServicio.servicioDe(null));
        assertNull(AlcanceServicio.servicioDe(TurnoEntity.builder().idTurno(1L).build()));
        assertEquals(URGENCIAS, AlcanceServicio.servicioDe(turnoDe(URGENCIAS)));
    }

    @Test
    void perteneceAServicio_soloSiTieneLaRelacionVigente() {
        FuncionarioEntity f = funcionarioDe(1L, URGENCIAS);
        assertTrue(AlcanceServicio.perteneceAServicio(f, URGENCIAS));
        assertFalse(AlcanceServicio.perteneceAServicio(f, ENFERMERIA));
        assertFalse(AlcanceServicio.perteneceAServicio(f, null));
        assertFalse(AlcanceServicio.perteneceAServicio(null, URGENCIAS));

        // Una relación con un servicio eliminado no cuenta.
        f.getServiciosFuncionario().get(0).getServicio().setEliminado(true);
        assertFalse(AlcanceServicio.perteneceAServicio(f, URGENCIAS));
    }

    @Test
    void solicitudConTurno_esDelServicioDelTurno_aunqueElEmisorSeaDeOtro() {
        SolicitudEntity s = SolicitudEntity.builder()
                .funcionario(funcionarioDe(1L, ENFERMERIA)).turno(turnoDe(URGENCIAS)).build();

        assertTrue(AlcanceServicio.solicitudEsDelServicio(s, URGENCIAS));
        assertFalse(AlcanceServicio.solicitudEsDelServicio(s, ENFERMERIA));
    }

    @Test
    void intercambio_esDeLosServiciosDeSusDosTurnos() {
        SolicitudEntity s = SolicitudEntity.builder()
                .turno(turnoDe(URGENCIAS)).turnoReceptor(turnoDe(ENFERMERIA)).build();

        assertTrue(AlcanceServicio.solicitudEsDelServicio(s, URGENCIAS));
        assertTrue(AlcanceServicio.solicitudEsDelServicio(s, ENFERMERIA));
        assertFalse(AlcanceServicio.solicitudEsDelServicio(s, 99L));
    }

    @Test
    void permisoSinTurno_esDelServicioDelEmisor() {
        SolicitudEntity permiso = SolicitudEntity.builder().funcionario(funcionarioDe(1L, URGENCIAS)).build();

        assertTrue(AlcanceServicio.solicitudEsDelServicio(permiso, URGENCIAS));
        assertFalse(AlcanceServicio.solicitudEsDelServicio(permiso, ENFERMERIA));
        assertFalse(AlcanceServicio.solicitudEsDelServicio(null, URGENCIAS));
    }

    @Test
    void participaEnSolicitud_soloEmisorOReceptor() {
        SolicitudEntity s = SolicitudEntity.builder()
                .funcionario(funcionarioDe(1L)).funcionarioReceptor(funcionarioDe(2L))
                .turno(TurnoEntity.builder().idTurno(5L).funcionario(funcionarioDe(3L)).build())
                .build();

        assertTrue(AlcanceServicio.participaEnSolicitud(s, 1L));
        assertTrue(AlcanceServicio.participaEnSolicitud(s, 2L));
        assertFalse(AlcanceServicio.participaEnSolicitud(s, 3L), "el dueño del turno no es emisor ni receptor");
        assertFalse(AlcanceServicio.participaEnSolicitud(s, null));
        assertFalse(AlcanceServicio.participaEnSolicitud(null, 1L));
        assertFalse(AlcanceServicio.participaEnSolicitud(SolicitudEntity.builder().build(), 1L));
    }
}
