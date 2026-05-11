package com.pingeso.HUAP.Service;


import com.pingeso.HUAP.DTO.CrearNotificacionDTO;
import com.pingeso.HUAP.DTO.NotificacionRespuestaDTO;
import com.pingeso.HUAP.Entity.Notificacion2Entity;
import com.pingeso.HUAP.Entity.Solicitud2Entity;
import com.pingeso.HUAP.Repository.Notificacion2Repository;
import com.pingeso.HUAP.Repository.Solicitud2Repository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class Notificacion2Service {

    private final Notificacion2Repository notificacion2Repository;
    private final Solicitud2Repository solicitud2Repository;

    @Transactional
    public Notificacion2Entity crearNotificacion(CrearNotificacionDTO dto) {
        Solicitud2Entity solicitud = solicitud2Repository.findById(dto.getIdSolicitud())
                .orElseThrow(() -> new RuntimeException("Solicitud no existe"));

        Notificacion2Entity notificacion2 = Notificacion2Entity.builder()
                .estado("NO_LEIDO")
                .fechaEnvio(LocalDateTime.now())
                .mensaje(dto.getMensaje())
                .solicitud(solicitud)
                .build();

        return notificacion2Repository.save(notificacion2);
    }

    @Transactional
    public boolean marcarLeido(Long idNotificacion) {
        return notificacion2Repository.findById(idNotificacion).map(notificacion -> {
            notificacion.setEstado("LEIDO");
            notificacion2Repository.save(notificacion);
            return true;
        }).orElse(false);
    }

    @Transactional
    public boolean marcarComoEliminado(Long idNotificacion) {
        return notificacion2Repository.findById(idNotificacion).map(notificacion -> {
            notificacion.setEstado("ELIMINADO"); // O "ARCHIVADO"
            notificacion2Repository.save(notificacion);
            return true;
        }).orElse(false);
    }


    /*
        Modificadores y utilidades
    */

    public List<NotificacionRespuestaDTO> obtenerNotificacionesFuncionario(Long idFuncionario) {
        List<Notificacion2Entity> entidades = notificacion2Repository.findByFuncionarioId(idFuncionario);

        return entidades.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public long contarNoLeidasPorUsuario(Long idFuncionario) {
        return obtenerNotificacionesFuncionario(idFuncionario).stream()
                .filter(dto -> dto.getEstado().equals("NO_LEIDO"))
                .count();
    }
    /*
        Getters
     */

    public Notificacion2Entity findNotificacion2ById(Long id) {
        return notificacion2Repository.findById(id).orElseThrow(() -> new RuntimeException("Notificacion no encontrada"));
    }


    //Todas las notificaciones sin considerar el servicio
    public List<Notificacion2Entity> findAllNotificacion(){
        return notificacion2Repository.findAll();
    }

    public Notificacion2Entity findByIdSolicitud(Long idSolicitud) {
        return notificacion2Repository
                .findBySolicitud_IdSolicitud(idSolicitud)
                .orElseThrow(() -> new RuntimeException(
                        "No existe notificación para la solicitud con ID: " + idSolicitud
                ));
    }

    private NotificacionRespuestaDTO mapToDTO(Notificacion2Entity entity) {
        return NotificacionRespuestaDTO.builder()
                .idNotificacion(entity.getIdNotificacion()) // Asegúrate de que el getter coincida con tu entity
                .mensaje(entity.getMensaje())
                .estado(entity.getEstado())
                .fechaEnvio(entity.getFechaEnvio())
                .idSolicitud(entity.getSolicitud().getIdSolicitud())
                .build();
    }



}
