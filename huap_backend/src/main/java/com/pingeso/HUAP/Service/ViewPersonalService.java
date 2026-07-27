package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.ViewPersonalSummaryDTO;
import com.pingeso.HUAP.hospital.ViewPersonalEntity;
import com.pingeso.HUAP.hospital.ViewPersonalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ViewPersonalService {

    private final ViewPersonalRepository viewPersonalRepository;


    private ViewPersonalSummaryDTO mapToDTOPersonal(ViewPersonalEntity p){
        if (p == null) return null;

        ViewPersonalSummaryDTO dto = new ViewPersonalSummaryDTO();

        dto.setRut(p.getRut());
        dto.setNombre(p.getNombre());
        dto.setApellidoMaterno(p.getApel_mat());
        dto.setApellidoPaterno(p.getApel_pat());
        dto.setRutCompleto((p.getDv() != null) ? (p.getRut() + "-"+ p.getDv()):p.getRut());

        return dto;
    }

    public List<ViewPersonalSummaryDTO> getAllPersonal(){
        List<ViewPersonalEntity> Personal = viewPersonalRepository.findAll();

        Personal = Personal.stream()
                .filter(p -> p.getEstado() == 1)
                .collect(Collectors.toList());

        return  Personal.stream()
                .map(this::mapToDTOPersonal)
                .collect(Collectors.toList());
    }
}
