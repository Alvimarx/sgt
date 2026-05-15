package com.pingeso.HUAP.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SelectServiceRequest {
    private String preAuthToken;
    private Long servicioId;
}
