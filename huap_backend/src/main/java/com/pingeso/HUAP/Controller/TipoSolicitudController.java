package com.pingeso.HUAP.Controller;


import com.pingeso.HUAP.Service.TipoSolicitudService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/tipos-solicitud")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TipoSolicitudController {

    private final TipoSolicitudService tipoSolicitudService;
}
