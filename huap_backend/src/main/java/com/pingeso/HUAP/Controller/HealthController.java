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
     * Endpoint de información del servidor
     * Útil para debugging y verificar qué instancia respondió
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> serverInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("serverId", serverId);
        info.put("application", applicationName);
        info.put("javaVersion", System.getProperty("java.version"));
        info.put("osName", System.getProperty("os.name"));
        info.put("availableProcessors", Runtime.getRuntime().availableProcessors());
        info.put("maxMemory", Runtime.getRuntime().maxMemory() / (1024 * 1024) + " MB");
        info.put("freeMemory", Runtime.getRuntime().freeMemory() / (1024 * 1024) + " MB");
        info.put("timestamp", Instant.now().toString());
        
        return ResponseEntity.ok(info);
    }
}
