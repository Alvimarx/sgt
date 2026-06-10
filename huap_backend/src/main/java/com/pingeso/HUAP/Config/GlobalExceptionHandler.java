package com.pingeso.HUAP.Config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Manejo centralizado de errores.
 * - Las excepciones de negocio (RuntimeException con mensaje escrito por la app) se
 *   devuelven como 400 con su mensaje (las vistas dependen de ellos).
 * - Los errores internos (BD, nulls, etc.) se registran en el servidor y se devuelven
 *   genéricos, sin filtrar stack traces ni detalles de implementación.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Errores de acceso a datos: nunca exponer el detalle (puede contener SQL/columnas). */
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> handleDataAccess(DataAccessException ex) {
        logger.error("Error de acceso a datos", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error interno del servidor"));
    }

    /** Validaciones de negocio: el mensaje es intencional y orientado al usuario. */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        logger.warn("Regla de negocio rechazada: {}", ex.getMessage());
        return ResponseEntity.badRequest()
                .body(Map.of("error", ex.getMessage() != null ? ex.getMessage() : "Solicitud inválida"));
    }

    /** Cualquier otra excepción no controlada: respuesta genérica. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
        logger.error("Error no controlado", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error interno del servidor"));
    }
}
