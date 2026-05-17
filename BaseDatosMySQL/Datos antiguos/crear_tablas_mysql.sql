-- ============================================
-- SCRIPT DE CREACIÓN DE BASE DE DATOS, TABLAS y TRIGGERs V5 (sistema turnos)
-- Se mantiene todo lo de V4 y se agregan notificaciones de respuesta
-- ============================================

DROP DATABASE IF EXISTS innhosp;
CREATE DATABASE innhosp CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE innhosp;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================
-- SCRIPT PARA LIMPIADO - BASE DE DATOS: innhosp
-- =========================================

-- Eliminar triggers existentes
DROP TRIGGER IF EXISTS trigger_crear_notificacion_por_solicitud;
DROP TRIGGER IF EXISTS trg_turno_base_set_servicio;
-- AGREGADO: Limpieza del nuevo trigger
DROP TRIGGER IF EXISTS trg_notificar_respuesta_solicitud; 

-- Eliminar funciones y procedimientos existentes
DROP FUNCTION IF EXISTS crear_notificacion_por_solicitud;
DROP PROCEDURE IF EXISTS drop_all_triggers;
DROP PROCEDURE IF EXISTS drop_all_routines;
DROP PROCEDURE IF EXISTS truncate_all_tables;

-- Eliminar tablas existentes
DROP TABLE IF EXISTS bitacora_de_eventos;
DROP TABLE IF EXISTS turnos_solicitados;
DROP TABLE IF EXISTS notificacion;
DROP TABLE IF EXISTS solicitudes;
DROP TABLE IF EXISTS turnos;
DROP TABLE IF EXISTS pisos;
DROP TABLE IF EXISTS viewPersonal;
DROP TABLE IF EXISTS servicio;
DROP TABLE IF EXISTS conf_tipofuncionario;
DROP TABLE IF EXISTS conf_tipocontrato;
DROP TABLE IF EXISTS conf_tipocargo;
DROP TABLE IF EXISTS conf_profesion;
DROP TABLE IF EXISTS conf_estados;

-- ============================================
-- CREACIÓN DE TABLAS (Estructura V4 Intacta)
-- ============================================

-- ============================================
-- Tabla: conf_estados
-- ============================================
CREATE TABLE conf_estados (
    id_estado BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) DEFAULT NULL,
    date_added DATETIME DEFAULT NULL,
    modified TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    estado TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id_estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: conf_profesion
-- ============================================
CREATE TABLE conf_profesion (
    id_profesion BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) DEFAULT NULL,
    date_added DATETIME DEFAULT NULL,
    modified TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    estado TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id_profesion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: conf_tipocargo
-- ============================================
CREATE TABLE conf_tipocargo (
    id_tipocargo BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) DEFAULT NULL,
    clinico TINYINT(1) DEFAULT 0,
    date_added DATETIME DEFAULT NULL,
    modified TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    estado TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id_tipocargo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: conf_tipocontrato
-- ============================================
CREATE TABLE conf_tipocontrato (
    id_tipocontrato BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) DEFAULT NULL,
    date_added DATETIME DEFAULT NULL,
    modified TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    estado TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id_tipocontrato)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: conf_tipofuncionario
-- ============================================
CREATE TABLE conf_tipofuncionario (
    id_tipofuncionario BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) DEFAULT NULL,
    date_added DATETIME DEFAULT NULL,
    modified TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    estado TINYINT(1) NOT NULL DEFAULT 1,
    tipo_persona BIGINT DEFAULT 0,
    PRIMARY KEY (id_tipofuncionario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: servicio
-- ============================================
CREATE TABLE servicio (
    id_servicio BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) DEFAULT NULL,
    id_responsable BIGINT DEFAULT NULL,
    id_subrogante BIGINT DEFAULT NULL,
    estado TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: viewPersonal
-- ============================================
CREATE TABLE viewPersonal (
    id_personal BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    rol VARCHAR(100) DEFAULT NULL,
    rut VARCHAR(255) DEFAULT NULL,
    dv VARCHAR(255) DEFAULT NULL,
    nombre VARCHAR(255) DEFAULT NULL,
    apel_pat VARCHAR(255) DEFAULT NULL,
    apel_mat VARCHAR(255) DEFAULT NULL,
    rrhh TINYINT(1) DEFAULT 0,
    jefatura BIGINT DEFAULT NULL,
    id_servicio BIGINT DEFAULT NULL,
    id_tipocargo BIGINT DEFAULT NULL,
    id_tipocontrato BIGINT DEFAULT NULL,
    profesion BIGINT DEFAULT NULL,
    clave VARCHAR(255) DEFAULT NULL,
    estado BIGINT DEFAULT 1,
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX personalFk1 (id_servicio),
    INDEX personalFk2 (estado),
    INDEX personalFk3 (id_tipocargo),
    INDEX personalFk4 (id_tipocontrato),
    INDEX personalFk5 (profesion),

    CONSTRAINT personalFk1 FOREIGN KEY (id_servicio)
        REFERENCES servicio (id_servicio)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT personalFk2 FOREIGN KEY (estado)
        REFERENCES conf_estados (id_estado)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT personalFk3 FOREIGN KEY (id_tipocargo)
        REFERENCES conf_tipocargo (id_tipocargo)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT personalFk4 FOREIGN KEY (id_tipocontrato)
        REFERENCES conf_tipocontrato (id_tipocontrato)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT personalFk5 FOREIGN KEY (profesion)
        REFERENCES conf_profesion (id_profesion)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: plantilla_piso
-- ============================================
CREATE TABLE plantilla_piso (
    id_plantilla_piso BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    id_creador BIGINT DEFAULT NULL,
    PRIMARY KEY (id_plantilla_piso),
    INDEX idx_plantilla_piso_creador (id_creador),
    CONSTRAINT fk_plantilla_piso_creador
        FOREIGN KEY (id_creador) REFERENCES viewPersonal(id_personal)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: pisos
-- ============================================
CREATE TABLE pisos (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    color_hexa VARCHAR(7) DEFAULT NULL,
    nombre VARCHAR(100) DEFAULT NULL,
    servicio_id BIGINT DEFAULT NULL,
    id_plantilla_piso BIGINT DEFAULT NULL,

    INDEX fk_pisos_servicio (servicio_id),
    INDEX fk_pisos_plantilla (id_plantilla_piso),

    CONSTRAINT fk_pisos_servicio FOREIGN KEY (servicio_id)
        REFERENCES servicio (id_servicio)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_pisos_plantilla FOREIGN KEY (id_plantilla_piso)
        REFERENCES plantilla_piso (id_plantilla_piso)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: categoria_tipo_turno
-- ============================================
CREATE TABLE categoria_tipo_turno (
    id_categoria_tipo_turno BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    prioridad INT NOT NULL DEFAULT 0,
    id_servicio BIGINT DEFAULT NULL,
    PRIMARY KEY (id_categoria_tipo_turno),
    INDEX idx_cat_tipo_turno_servicio (id_servicio),
    CONSTRAINT fk_cat_tipo_turno_servicio
        FOREIGN KEY (id_servicio) REFERENCES servicio(id_servicio)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: tipo_turno
-- ============================================
CREATE TABLE tipo_turno (
    id_tipo_turno BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    id_categoria_tipo_turno BIGINT NOT NULL,
    prioridad_interna INT NOT NULL DEFAULT 0,
    matriz_patron JSON DEFAULT NULL,
    id_creador BIGINT DEFAULT NULL,
    PRIMARY KEY (id_tipo_turno),
    INDEX idx_tipo_turno_categoria (id_categoria_tipo_turno),
    INDEX idx_tipo_turno_creador (id_creador),
    CONSTRAINT fk_tipo_turno_categoria
        FOREIGN KEY (id_categoria_tipo_turno) REFERENCES categoria_tipo_turno(id_categoria_tipo_turno)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_tipo_turno_creador
        FOREIGN KEY (id_creador) REFERENCES viewPersonal(id_personal)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: turno_base
-- ============================================
CREATE TABLE turno_base (
    id_turno_base BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) DEFAULT NULL,
    id_tipo_turno BIGINT DEFAULT NULL,
    hora_inicio TIME DEFAULT NULL,
    hora_fin TIME DEFAULT NULL,
    id_servicio BIGINT DEFAULT NULL,
    id_creador BIGINT DEFAULT NULL,
    PRIMARY KEY (id_turno_base),
    INDEX fk_turno_base_servicio_idx (id_servicio),
    INDEX fk_turno_base_personal_idx (id_creador),
    CONSTRAINT fk_turno_base_tipo_turno
        FOREIGN KEY (id_tipo_turno) REFERENCES tipo_turno(id_tipo_turno)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_turno_base_servicio
        FOREIGN KEY (id_servicio) REFERENCES servicio(id_servicio)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_turno_base_personal
        FOREIGN KEY (id_creador) REFERENCES viewPersonal(id_personal)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: plantilla_piso_linea
-- ============================================
CREATE TABLE plantilla_piso_linea (
    id_plantilla_linea BIGINT NOT NULL AUTO_INCREMENT,
    id_plantilla_piso BIGINT NOT NULL,
    nombre_linea VARCHAR(255) NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    matriz_semana JSON,
    PRIMARY KEY (id_plantilla_linea),
    INDEX idx_plantilla_linea_plantilla (id_plantilla_piso),
    CONSTRAINT fk_plantilla_linea_plantilla
        FOREIGN KEY (id_plantilla_piso) REFERENCES plantilla_piso(id_plantilla_piso)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: turnos
-- ============================================
CREATE TABLE turnos (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) DEFAULT NULL,
    dia_final_turno DATE NOT NULL,
    dia_inicio_turno DATE NOT NULL,
    dia_semana VARCHAR(20) DEFAULT NULL,
    estado VARCHAR(20) NOT NULL,
    hora_fin TIME NOT NULL,
    hora_inicio TIME NOT NULL,
    id_medico BIGINT NULL,
    id_piso VARCHAR(255) NOT NULL,
    tipo_de_turno_cantidad VARCHAR(50) DEFAULT NULL,
    tipo_turno VARCHAR(100) NOT NULL,
    id_creador BIGINT NULL,
    id_asignador BIGINT NULL,

    INDEX fk_turnos_creador (id_creador),
    INDEX fk_turnos_asignador (id_asignador),
    INDEX idx_turnos_fecha_inicio (dia_inicio_turno),
    INDEX idx_turnos_fecha_fin (dia_final_turno),

    CONSTRAINT fk_turnos_creador FOREIGN KEY (id_creador)
        REFERENCES viewPersonal (id_personal)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_turnos_asignador FOREIGN KEY (id_asignador)
        REFERENCES viewPersonal (id_personal)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: notificacion
-- ============================================
CREATE TABLE notificacion (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    eliminado TINYINT(1) DEFAULT NULL,
    estado VARCHAR(255) DEFAULT NULL,
    fecha_envio DATETIME DEFAULT NULL,
    leido TINYINT(1) DEFAULT NULL,
    mensaje VARCHAR(255) DEFAULT NULL,
    mensaje_para_emisor VARCHAR(255) DEFAULT NULL,
    tipo_solicitud VARCHAR(255) DEFAULT NULL,
    id_emisor BIGINT DEFAULT NULL,
    id_receptor BIGINT DEFAULT NULL,

    INDEX fk_notificacion_emisor (id_emisor),
    INDEX fk_notificacion_receptor (id_receptor),

    CONSTRAINT fk_notificacion_emisor FOREIGN KEY (id_emisor)
        REFERENCES viewPersonal (id_personal)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_notificacion_receptor FOREIGN KEY (id_receptor)
        REFERENCES viewPersonal (id_personal)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: solicitudes
-- ============================================
CREATE TABLE solicitudes (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    aceptado_medico TINYINT(1) DEFAULT NULL,
    estado VARCHAR(50) DEFAULT NULL,
    fecha_creacion DATETIME DEFAULT NULL,
    
    -- CORRECCIÓN AQUÍ: "permiso" en singular (basado en tu input previo)
    fecha_inicio_permiso DATETIME DEFAULT NULL,
    fecha_termino_permiso DATETIME DEFAULT NULL,
    
    motivo TEXT DEFAULT NULL,
    tipo VARCHAR(50) DEFAULT NULL,
    turno_de_solicitante_id BIGINT DEFAULT NULL,
    medico_receptor_id BIGINT DEFAULT NULL,
    medico_solicitante_id BIGINT DEFAULT NULL,
    turno_id BIGINT DEFAULT NULL,
    tipo_autorizacion VARCHAR(100) DEFAULT NULL,

    INDEX fk_solicitudes_turno (turno_id),
    INDEX fk_solicitudes_medico_receptor (medico_receptor_id),
    INDEX fk_solicitudes_medico_solicitante (medico_solicitante_id),

    CONSTRAINT fk_solicitudes_turno FOREIGN KEY (turno_id)
        REFERENCES turnos (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_solicitudes_medico_receptor FOREIGN KEY (medico_receptor_id)
        REFERENCES viewPersonal (id_personal)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_solicitudes_medico_solicitante FOREIGN KEY (medico_solicitante_id)
        REFERENCES viewPersonal (id_personal)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: turnos_solicitados
-- ============================================
CREATE TABLE turnos_solicitados (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    dia_inicio DATE DEFAULT NULL,
    dia_fin DATE DEFAULT NULL,
    id_solicitud BIGINT DEFAULT NULL,

    INDEX fk_turnos_solicitados_solicitud (id_solicitud),
    CONSTRAINT fk_turnos_solicitados_solicitud FOREIGN KEY (id_solicitud)
        REFERENCES solicitudes (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Tabla: bitacora_de_eventos
-- ============================================
CREATE TABLE bitacora_de_eventos (
    id_evento BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tipo_evento VARCHAR(50) NOT NULL,
    fecha_evento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    descripcion TEXT DEFAULT NULL,

    id_personal BIGINT DEFAULT NULL,
    id_turno BIGINT DEFAULT NULL,
    id_solicitud BIGINT DEFAULT NULL,
    id_personal_secundario BIGINT DEFAULT NULL,

    estado_anterior VARCHAR(50) DEFAULT NULL,
    estado_nuevo VARCHAR(50) DEFAULT NULL,
    motivo TEXT DEFAULT NULL,
    observaciones TEXT DEFAULT NULL,

    fecha_inicio_afectada DATE DEFAULT NULL,
    fecha_fin_afectada DATE DEFAULT NULL,

    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_modificacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tipo_evento (tipo_evento),
    INDEX idx_fecha_evento (fecha_evento),
    INDEX idx_id_personal (id_personal),
    INDEX idx_id_turno (id_turno),
    INDEX idx_id_solicitud (id_solicitud),
    INDEX idx_estado_nuevo (estado_nuevo),
    INDEX idx_fecha_inicio_afectada (fecha_inicio_afectada),
    INDEX idx_id_personal_secundario (id_personal_secundario),

    CONSTRAINT fk_bitacora_personal FOREIGN KEY (id_personal)
        REFERENCES viewPersonal (id_personal)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_bitacora_personal_secundario FOREIGN KEY (id_personal_secundario)
        REFERENCES viewPersonal (id_personal)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_bitacora_turno FOREIGN KEY (id_turno)
        REFERENCES turnos (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_bitacora_solicitud FOREIGN KEY (id_solicitud)
        REFERENCES solicitudes (id)
        ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- ALTER TABLE para FK de servicio (después de crear personal)
-- ============================================
ALTER TABLE servicio
    ADD INDEX fk_servicio_responsable (id_responsable),
    ADD INDEX fk_servicio_subrogante (id_subrogante),
    ADD CONSTRAINT fk_servicio_responsable FOREIGN KEY (id_responsable)
        REFERENCES viewPersonal (id_personal)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    ADD CONSTRAINT fk_servicio_subrogante FOREIGN KEY (id_subrogante)
        REFERENCES viewPersonal (id_personal)
        ON DELETE SET NULL ON UPDATE RESTRICT;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- Tabla: vinculo_turno_rotativa (tipo de turno)
-- ============================================
CREATE TABLE vinculo_turno_rotativa (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_turno BIGINT NOT NULL,
    id_tipo_turno BIGINT NOT NULL,
    INDEX idx_vinculo_turno (id_turno),
    INDEX idx_vinculo_tipo (id_tipo_turno),
    CONSTRAINT fk_vinculo_turno 
        FOREIGN KEY (id_turno) REFERENCES turnos(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_vinculo_tipo 
        FOREIGN KEY (id_tipo_turno) REFERENCES tipo_turno(id_tipo_turno) 
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- 1.1 Función dummy
DELIMITER $$
CREATE FUNCTION crear_notificacion_por_solicitud()
RETURNS TEXT
DETERMINISTIC
BEGIN
    RETURN 'Función de placeholder para notificaciones';
END$$
DELIMITER ;

-- 1.2 Trigger para crear notificación al CREAR (INSERT) una solicitud
DELIMITER $$
CREATE TRIGGER trigger_crear_notificacion_por_solicitud
AFTER INSERT ON solicitudes
FOR EACH ROW
BEGIN
    DECLARE v_receptor_id BIGINT;
    DECLARE v_servicio_id BIGINT;
    DECLARE v_emisor_nombre TEXT;
    DECLARE v_emisor_apellido TEXT;
    
    SELECT nombre, apel_pat
    INTO v_emisor_nombre, v_emisor_apellido
    FROM viewPersonal
    WHERE id_personal = NEW.medico_solicitante_id
    LIMIT 1;

    IF NEW.medico_receptor_id IS NOT NULL THEN
        SET v_receptor_id = NEW.medico_receptor_id;
    ELSE
        SELECT id_servicio INTO v_servicio_id
        FROM viewPersonal
        WHERE id_personal = NEW.medico_solicitante_id
        LIMIT 1;

        SELECT id_personal INTO v_receptor_id
        FROM viewPersonal
        WHERE id_servicio = v_servicio_id
          AND (rol = 'JEFATURA' OR jefatura = 1)
        LIMIT 1;
    END IF;

    IF v_receptor_id IS NULL THEN
        SET v_receptor_id = NEW.medico_solicitante_id;
    END IF;

    INSERT INTO notificacion (
        tipo_solicitud,
        mensaje,
        mensaje_para_emisor,
        estado,
        fecha_envio,
        id_emisor,
        id_receptor,
        leido,
        eliminado
    ) VALUES (
        NEW.tipo,
        CONCAT('Nueva solicitud de tipo ', COALESCE(NEW.tipo, ''), ' registrada por ', 
               COALESCE(v_emisor_nombre, ''), ' ', COALESCE(v_emisor_apellido, '')),
        CONCAT('Tu solicitud ', COALESCE(NEW.tipo, ''), ' fue enviada con éxito'),
        COALESCE(NEW.estado, 'PENDIENTE'),
        NOW(),
        NEW.medico_solicitante_id,
        v_receptor_id,
        FALSE,
        FALSE
    );
END$$
DELIMITER ;

-- 1.3 Trigger para asignar servicio en turno_base
DELIMITER $$
CREATE TRIGGER trg_turno_base_set_servicio
BEFORE INSERT ON turno_base
FOR EACH ROW
BEGIN
    DECLARE v_id_servicio BIGINT;
    IF NEW.id_creador IS NOT NULL THEN
        SELECT id_servicio
        INTO v_id_servicio
        FROM servicio
        WHERE id_responsable = NEW.id_creador
        LIMIT 1;

        IF v_id_servicio IS NOT NULL THEN
            SET NEW.id_servicio = v_id_servicio;
        END IF;
    END IF;
END$$
DELIMITER ;

-- ==========================================================================
-- NUEVO TRIGGER: NOTIFICAR RESPUESTA (APROBADO/RECHAZADO) CON DETALLE DE TURNO
-- ==========================================================================
DELIMITER $$
CREATE TRIGGER trg_notificar_respuesta_solicitud
AFTER UPDATE ON solicitudes
FOR EACH ROW
BEGIN
    -- Declaración de variables para construir el mensaje dinámico
    DECLARE v_fecha_str VARCHAR(50);
    DECLARE v_tipo_turno_str VARCHAR(50);
    DECLARE v_mensaje_final TEXT;
    DECLARE v_estado_normalizado VARCHAR(50);

    -- Solo actuar si el estado cambió a 'Aprobado' o 'Rechazado' (o variantes)
    -- Usamos UPPER para comparar sin importar mayúsculas
    IF UPPER(NEW.estado) <> UPPER(OLD.estado) AND (UPPER(NEW.estado) IN ('APROBADO', 'APROBADA', 'RECHAZADO', 'RECHAZADA')) THEN
        
        -- Inicializamos variables
        SET v_fecha_str = 'fecha no especificada';
        SET v_tipo_turno_str = 'Turno';
        
        -- LÓGICA AÑADIDA: Forzar APROBADA / RECHAZADA
        IF UPPER(NEW.estado) LIKE 'APROBAD%' THEN
            SET v_estado_normalizado = 'APROBADA';
        ELSE
            SET v_estado_normalizado = 'RECHAZADA';
        END IF;

        -- 1. Intentar obtener datos del turno asociado (si existe turno_id)
        IF NEW.turno_id IS NOT NULL THEN
            SELECT DATE_FORMAT(dia_inicio_turno, '%d/%m/%Y'), tipo_turno
            INTO v_fecha_str, v_tipo_turno_str
            FROM turnos
            WHERE id = NEW.turno_id;
        
        -- 2. Si es Permiso, usar las fechas de permiso (en singular)
        ELSEIF NEW.fecha_inicio_permiso IS NOT NULL THEN
            SET v_fecha_str = DATE_FORMAT(NEW.fecha_inicio_permiso, '%d/%m/%Y');
            SET v_tipo_turno_str = 'Permiso';
        END IF;

        -- 3. Construir el mensaje personalizado
        SET v_mensaje_final = CONCAT(
            'Tu ', COALESCE(NEW.tipo, 'solicitud'), 
            ' para el día ', v_fecha_str, 
            ' fue ', v_estado_normalizado, '.'
        );

        -- 4. Insertar la notificación
        INSERT INTO notificacion (
            tipo_solicitud,
            mensaje,
            mensaje_para_emisor, 
            estado,
            fecha_envio,
            id_emisor,   
            id_receptor, 
            leido,
            eliminado
        ) VALUES (
            NEW.tipo,
            v_mensaje_final,
            v_mensaje_final,
            'ENVIADO',
            NOW(),
            NEW.medico_receptor_id, 
            NEW.medico_solicitante_id,
            0, 
            0 
        );
    END IF;
END$$
DELIMITER ;

-- ============================================
-- PROCEDIMIENTO PARA BITÁCORA
-- ============================================
DELIMITER $$
CREATE PROCEDURE registrar_consulta_turnos_dia(
    IN p_servicio_id BIGINT,
    IN p_fecha_consultada DATE,
    IN p_usuario_id BIGINT,
    IN p_ip_address VARCHAR(45)
)
BEGIN
    INSERT INTO bitacora_de_eventos (
        tipo_evento,
        descripcion,
        id_personal,
        fecha_inicio_afectada,
        fecha_fin_afectada,
        observaciones,
        activo
    ) VALUES (
        'CONSULTA_CALENDARIO',
        CONCAT('Consulta de turnos del día ', DATE_FORMAT(p_fecha_consultada, '%Y-%m-%d'), ' para servicio ID ', p_servicio_id),
        p_usuario_id,
        p_fecha_consultada,
        p_fecha_consultada,
        CONCAT('IP: ', COALESCE(p_ip_address, 'desconocida')),
        TRUE
    );
END$$
DELIMITER ;

-- ============================================
-- PROCEDIMIENTO PARA OBTENER TURNOS DEL CALENDARIO DE MANERA OPTIMIZADA
-- ============================================
DELIMITER $$
CREATE PROCEDURE obtener_turnos_calendario(
    IN p_servicio_id BIGINT,
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE
)
BEGIN
    SELECT 
        t.id,
        t.nombre,
        t.dia_semana,
        t.hora_inicio,
        t.hora_fin,
        t.dia_inicio_turno,
        t.dia_final_turno,
        t.tipo_turno,
        t.estado,
        t.tipo_de_turno_cantidad,
        t.id_piso,
        t.id_medico,
        t.id_creador,
        t.id_asignador,
        p.nombre AS medico_nombre,
        p.apellido_paterno AS medico_apellido_paterno,
        p.apellido_materno AS medico_apellido_materno
    FROM turnos t
    INNER JOIN viewPersonal u ON t.id_creador = u.id_personal
    LEFT JOIN viewPersonal p ON t.id_medico = p.id_personal
    WHERE u.id_servicio = p_servicio_id
      AND t.dia_final_turno >= p_fecha_inicio
      AND t.dia_inicio_turno <= p_fecha_fin
      AND t.estado = 'Activo'
    ORDER BY t.dia_inicio_turno, t.hora_inicio;
END$$
DELIMITER ;

-- ============================================
-- FIN DEL SCRIPT V5
-- ============================================