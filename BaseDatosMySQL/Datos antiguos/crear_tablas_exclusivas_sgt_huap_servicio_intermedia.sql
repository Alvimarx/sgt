-- ============================================
-- SCRIPT DE INTEGRACIÓN V5.1 (Sistema Turnos + Tabla Intermedia)
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================
-- 1. LIMPIEZA DE COMPONENTES DEL SISTEMA NUEVO
-- =========================================
DROP TRIGGER IF EXISTS trigger_crear_notificacion_por_solicitud;
DROP TRIGGER IF EXISTS trg_turno_base_set_servicio;
DROP TRIGGER IF EXISTS trg_notificar_respuesta_solicitud; 

DROP PROCEDURE IF EXISTS registrar_consulta_turnos_dia;
DROP PROCEDURE IF EXISTS obtener_turnos_calendario;
DROP FUNCTION IF EXISTS crear_notificacion_por_solicitud;

-- Borrar solo tablas del sistema de turnos
DROP TABLE IF EXISTS bitacora_de_eventos;
DROP TABLE IF EXISTS turnos_solicitados;
DROP TABLE IF EXISTS notificacion;
DROP TABLE IF EXISTS solicitudes;
DROP TABLE IF EXISTS vinculo_turno_rotativa;
DROP TABLE IF EXISTS turnos;
DROP TABLE IF EXISTS plantilla_piso_linea;
DROP TABLE IF EXISTS turno_base;
DROP TABLE IF EXISTS tipo_turno;
DROP TABLE IF EXISTS categoria_tipo_turno;
DROP TABLE IF EXISTS pisos;
DROP TABLE IF EXISTS plantilla_piso;
DROP TABLE IF EXISTS servicio_sgt_huap; -- Nuestra nueva tabla intermedia

-- ============================================
-- 2. CREACIÓN DE TABLAS DE EXTENSIÓN Y APOYO
-- ============================================

-- Tabla intermedia para no modificar la tabla 'servicio' original
CREATE TABLE servicio_sgt_huap (
    id_servicio_ext INT NOT NULL,
    id_responsable INT NULL,
    id_subrogante INT NULL,
    PRIMARY KEY (id_servicio_ext),
    CONSTRAINT fk_ext_servicio_maestro 
        FOREIGN KEY (id_servicio_ext) REFERENCES servicio(id_servicio) 
        ON DELETE CASCADE,
    CONSTRAINT fk_ext_responsable 
        FOREIGN KEY (id_responsable) REFERENCES viewPersonal(id_personal) 
        ON DELETE SET NULL,
    CONSTRAINT fk_ext_subrogante 
        FOREIGN KEY (id_subrogante) REFERENCES viewPersonal(id_personal) 
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- 3. CREACIÓN DE TABLAS DEL SISTEMA DE TURNOS
-- ============================================

CREATE TABLE plantilla_piso (
    id_plantilla_piso INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    id_creador INT DEFAULT NULL,
    PRIMARY KEY (id_plantilla_piso),
    CONSTRAINT fk_plantilla_piso_creador
        FOREIGN KEY (id_creador) REFERENCES viewPersonal(id_personal)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE pisos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    color_hexa VARCHAR(7) DEFAULT NULL,
    nombre VARCHAR(100) DEFAULT NULL,
    servicio_id INT DEFAULT NULL,
    id_plantilla_piso INT DEFAULT NULL,
    CONSTRAINT fk_pisos_servicio FOREIGN KEY (servicio_id) REFERENCES servicio (id_servicio),
    CONSTRAINT fk_pisos_plantilla FOREIGN KEY (id_plantilla_piso) REFERENCES plantilla_piso (id_plantilla_piso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE categoria_tipo_turno (
    id_categoria_tipo_turno INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    prioridad INT NOT NULL DEFAULT 0,
    id_servicio INT DEFAULT NULL,
    CONSTRAINT fk_cat_tipo_turno_servicio FOREIGN KEY (id_servicio) REFERENCES servicio(id_servicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tipo_turno (
    id_tipo_turno INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    id_categoria_tipo_turno INT NOT NULL,
    prioridad_interna INT NOT NULL DEFAULT 0,
    matriz_patron JSON DEFAULT NULL,
    id_creador INT DEFAULT NULL,
    CONSTRAINT fk_tipo_turno_categoria FOREIGN KEY (id_categoria_tipo_turno) REFERENCES categoria_tipo_turno(id_categoria_tipo_turno),
    CONSTRAINT fk_tipo_turno_creador FOREIGN KEY (id_creador) REFERENCES viewPersonal(id_personal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE turno_base (
    id_turno_base INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) DEFAULT NULL,
    id_tipo_turno INT DEFAULT NULL,
    hora_inicio TIME DEFAULT NULL,
    hora_fin TIME DEFAULT NULL,
    id_servicio INT DEFAULT NULL,
    id_creador INT DEFAULT NULL,
    CONSTRAINT fk_turno_base_tipo_turno FOREIGN KEY (id_tipo_turno) REFERENCES tipo_turno(id_tipo_turno),
    CONSTRAINT fk_turno_base_servicio FOREIGN KEY (id_servicio) REFERENCES servicio(id_servicio),
    CONSTRAINT fk_turno_base_personal FOREIGN KEY (id_creador) REFERENCES viewPersonal(id_personal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE turnos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) DEFAULT NULL,
    dia_final_turno DATE NOT NULL,
    dia_inicio_turno DATE NOT NULL,
    estado VARCHAR(20) NOT NULL,
    hora_fin TIME NOT NULL,
    hora_inicio TIME NOT NULL,
    id_medico INT NULL,
    id_piso VARCHAR(255) NOT NULL,
    tipo_turno VARCHAR(100) NOT NULL,
    id_creador INT NULL,
    id_asignador INT NULL,
    CONSTRAINT fk_turnos_creador FOREIGN KEY (id_creador) REFERENCES viewPersonal (id_personal),
    CONSTRAINT fk_turnos_asignador FOREIGN KEY (id_asignador) REFERENCES viewPersonal (id_personal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE solicitudes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    estado VARCHAR(50) DEFAULT NULL,
    fecha_creacion DATETIME DEFAULT NULL,
    fecha_inicio_permiso DATETIME DEFAULT NULL,
    fecha_termino_permiso DATETIME DEFAULT NULL,
    tipo VARCHAR(50) DEFAULT NULL,
    medico_receptor_id INT DEFAULT NULL,
    medico_solicitante_id INT DEFAULT NULL,
    turno_id INT DEFAULT NULL,
    CONSTRAINT fk_solicitudes_turno FOREIGN KEY (turno_id) REFERENCES turnos (id),
    CONSTRAINT fk_solicitudes_medico_receptor FOREIGN KEY (medico_receptor_id) REFERENCES viewPersonal (id_personal),
    CONSTRAINT fk_solicitudes_medico_solicitante FOREIGN KEY (medico_solicitante_id) REFERENCES viewPersonal (id_personal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE notificacion (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    mensaje TEXT,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_emisor INT,
    id_receptor INT,
    leido TINYINT(1) DEFAULT 0,
    CONSTRAINT fk_notif_emisor FOREIGN KEY (id_emisor) REFERENCES viewPersonal(id_personal),
    CONSTRAINT fk_notif_receptor FOREIGN KEY (id_receptor) REFERENCES viewPersonal(id_personal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 4. TRIGGERS Y PROCEDIMIENTOS (ADAPTADOS)
-- ============================================

DELIMITER $$

-- Trigger adaptado para buscar jefe en la tabla INTERMEDIA
CREATE TRIGGER trg_turno_base_set_servicio
BEFORE INSERT ON turno_base
FOR EACH ROW
BEGIN
    DECLARE v_id_servicio INT;
    IF NEW.id_creador IS NOT NULL THEN
        -- Buscamos el servicio donde el creador es responsable en nuestra tabla de extensión
        SELECT id_servicio_ext INTO v_id_servicio
        FROM servicio_sgt_huap
        WHERE id_responsable = NEW.id_creador
        LIMIT 1;

        IF v_id_servicio IS NOT NULL THEN
            SET NEW.id_servicio = v_id_servicio;
        END IF;
    END IF;
END$$

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================