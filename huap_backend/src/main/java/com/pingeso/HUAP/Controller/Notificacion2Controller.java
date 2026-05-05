package com.pingeso.HUAP.Controller;


import com.pingeso.HUAP.Service.Notificacion2Service;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notificacion2")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class Notificacion2Controller {
    private final Notificacion2Service notificacion2Service;
}
