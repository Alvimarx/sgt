package com.pingeso.HUAP.Config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.validation.ConstraintViolationException;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * Manejo centralizado de errores.
 * - Las excepciones de negocio (RuntimeException con mensaje escrito por la app) se
 *   devuelven como 400 con su mensaje (las vistas dependen de ellos).
 * - Los errores internos (BD, nulls, de persistencia, etc.) se registran en el servidor
 *   y se devuelven genéricos, sin filtrar stack traces ni detalles de implementación
 *   (CWE-209): se capturan ANTES que el catch-all de RuntimeException porque Spring
 *   resuelve el @ExceptionHandler más específico según la jerarquía de la excepción.
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

    /**
     * Errores de programación (NPE, cast, índice, formato) filtran nombres de clases/campos
     * internos en su mensaje (los "helpful NPE messages" de Java 14+) — nunca reenviarlos.
     */
    @ExceptionHandler({ NullPointerException.class, ClassCastException.class,
            IndexOutOfBoundsException.class, NumberFormatException.class,
            jakarta.persistence.PersistenceException.class })
    public ResponseEntity<Map<String, String>> handleProgramming(RuntimeException ex) {
        logger.error("Error interno no controlado ({})", ex.getClass().getSimpleName(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error interno del servidor"));
    }

    /** Autorización: el recurso existe pero el usuario autenticado no tiene acceso a él. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        logger.warn("Acceso denegado: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage() != null ? ex.getMessage() : "No tienes permiso para esta operación"));
    }

    /** Bean Validation (@Valid) sobre el body de la petición. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest()
                .body(Map.of("error", msg.isEmpty() ? "Datos inválidos" : msg));
    }

    /** Bean Validation (@Validated) sobre parámetros de método (@PathVariable/@RequestParam). */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, String>> handleConstraintViolation(ConstraintViolationException ex) {
        String msg = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest()
                .body(Map.of("error", msg.isEmpty() ? "Datos inválidos" : msg));
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
