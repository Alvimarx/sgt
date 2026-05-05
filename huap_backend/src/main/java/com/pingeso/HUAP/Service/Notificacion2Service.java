package com.pingeso.HUAP.Service;


import com.pingeso.HUAP.Entity.Notificacion2Entity;
import com.pingeso.HUAP.Entity.NotificacionEntity;
import com.pingeso.HUAP.Entity.Solicitud2Entity;
import com.pingeso.HUAP.Repository.Notificacion2Repository;
import com.pingeso.HUAP.Repository.NotificacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class Notificacion2Service {

    private final Notificacion2Repository notificacion2Repository;


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
}
