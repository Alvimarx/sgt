package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Repository.TipoSolicitudRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TipoSolicitudService {

    @Autowired
    private TipoSolicitudRepository tipoSolicitudRepository;


}
