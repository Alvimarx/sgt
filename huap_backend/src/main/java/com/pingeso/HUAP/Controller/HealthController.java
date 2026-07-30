package com.pingeso.HUAP.Controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * HealthController
 * Endpoint para verificar el estado del servidor backend.
 * Usado por Docker health checks y el load balancer nginx.
 */
@RestController
@RequestMapping("/api/v2")
public class HealthController {

    @Value("${SERVER_ID:backend-unknown}")
    private String serverId;

    @Value("${spring.application.name:SGTHUAP}")
    private String applicationName;

    /**
     * Health check básico
     * Retorna 200 OK si el servidor está funcionando
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("serverId", serverId);
        health.put("application", applicationName);
        health.put("timestamp", Instant.now().toString());
        
        return ResponseEntity.ok(health);
    }

    /**
     * Endpoint de información del servidor.
     * Útil para debugging y verificar qué instancia respondió el balanceador.
     *
     * <p>SEC-011: es público (sin autenticación) por diseño, para permitir verificar
     * el balanceo desde afuera; por eso NO debe incluir detalles del entorno de
     * ejecución (versión de Java, SO, memoria) que faciliten el fingerprinting del
     * servidor a un atacante anónimo. Esos detalles ya no se exponen aquí.
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> serverInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("serverId", serverId);
        info.put("application", applicationName);
        info.put("timestamp", Instant.now().toString());

        return ResponseEntity.ok(info);
    }
}
