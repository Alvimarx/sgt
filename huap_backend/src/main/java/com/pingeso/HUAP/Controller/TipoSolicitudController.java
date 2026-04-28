package com.pingeso.HUAP.Controller;


import com.pingeso.HUAP.Service.TipoSolicitudService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tiposolicitud")
@CrossOrigin(origins = "*")
public class TipoSolicitudController {

    @Autowired
    private TipoSolicitudService tipoSolicitudService;
}
