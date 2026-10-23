package com.pingeso.HUAP.Service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Tarea programada del 23 oct 2026: las solicitudes y las ofertas generales pendientes cuyo turno ya
 * empezó dejan de estar vigentes y se cierran solas ({@link SolicitudService#vencerPendientesDeTurnosEmpezados},
 * {@link OfertaGeneralService#vencerOfertasDeTurnosEmpezados}). Corre cada pocos minutos, en la hora del
 * servidor (el backend corre con {@code TZ=America/Santiago}). Además de esta tarea, las listas y las
 * resoluciones cierran lo vencido al leerse, así que nunca se ve vigente algo vencido aunque la tarea
 * no haya corrido.
 *
 * <p>El intervalo se cambia con {@code huap.vencimiento.intervalo-ms} (por defecto 3 minutos).
 */
@Component
@RequiredArgsConstructor
public class VencimientoProgramado {

    private static final Logger logger = LoggerFactory.getLogger(VencimientoProgramado.class);

    private final SolicitudService solicitudService;
    private final OfertaGeneralService ofertaGeneralService;

    @Scheduled(fixedDelayString = "${huap.vencimiento.intervalo-ms:180000}",
               initialDelayString = "${huap.vencimiento.retraso-inicial-ms:60000}")
    public void vencerLoQueYaEmpezo() {
        ejecutar();
    }

    /** Una pasada; separada del {@code @Scheduled} para poder probarla. Un fallo no impide la otra mitad. */
    void ejecutar() {
        try {
            int n = solicitudService.vencerPendientesDeTurnosEmpezados();
            if (n > 0) logger.info("Vencimiento: {} solicitud(es) cerradas porque su turno ya comenzó", n);
        } catch (RuntimeException e) {
            logger.error("Vencimiento de solicitudes falló: {}", e.getMessage(), e);
        }
        try {
            int n = ofertaGeneralService.vencerOfertasDeTurnosEmpezados();
            if (n > 0) logger.info("Vencimiento: {} oferta(s) general(es) cerradas porque su turno ya comenzó", n);
        } catch (RuntimeException e) {
            logger.error("Vencimiento de ofertas falló: {}", e.getMessage(), e);
        }
    }
}
