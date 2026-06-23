package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.ViewPersonalSummaryDTO;
import com.pingeso.HUAP.Service.ViewPersonalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v2/Personal")
public class ViewPersonalController {

    private final ViewPersonalService viewPersonalService;

    @Autowired
    public ViewPersonalController(ViewPersonalService viewPersonalService){this.viewPersonalService = viewPersonalService;}
    
    @GetMapping("/summary")
    public ResponseEntity<List<ViewPersonalSummaryDTO>> getAllPersonal(){
        return ResponseEntity.ok(viewPersonalService.getAllPersonal());
    }

}
