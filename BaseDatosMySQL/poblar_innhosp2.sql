-- ==============================================================
-- POBLAR LÓGICA DE NEGOCIO - Base de datos innhosp2
-- ==============================================================
-- PRE-REQUISITO:
--   Iniciar el backend Spring Boot AL MENOS UNA VEZ antes de
--   ejecutar este script. Hibernate (ddl-auto=update) crea las
--   tablas automáticamente a partir de las entidades JPA.
--
-- Tablas gestionadas por Hibernate en innhosp2:
--   Rol_Sistema, Rol_Servicio, servicios, Funcionario,
--   Servicios_Funcionario, puestos, Tipo_Solicitud,
--   Turnos, plantilla, planti--   plantilla_secuencia_dias,
--   Solicitudes, Notificacion2, Bitacora_eventos
--
-- Encoder: MessageDigestPasswordEncoder("SHA-512") — sin salt
-- Contraseña por defecto: "huap2025"
-- SHA-512("huap2025") =
--   560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa6
--   9542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48
--
-- Ejecución:
--   mysql -u root -p < BaseDatosMySQL/poblar_innhosp2.sql
--
-- OPCIONAL para infraestructura de personal hospitalario (dev):
--   mysql -u root -p < BaseDatosMySQL/setup_personal_aux.sql
--
-- ==============================================================

USE innhosp2;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- LIMPIEZA: TRUNCATE resetea datos y auto-increment en una sola sentencia por tabla.
-- Orden: hijos antes que padres (aunque FK_CHECKS=0 lo permite en cualquier orden).
TRUNCATE TABLE Notificacion2;
TRUNCATE TABLE Bitacora_eventos;
TRUNCATE TABLE Solicitudes;
TRUNCATE TABLE Turnos;
TRUNCATE TABLE plantilla_secuencia_dias;
TRUNCATE TABLE plantilla_turno;
TRUNCATE TABLE plantilla;
TRUNCATE TABLE Servicios_Funcionario;
TRUNCATE TABLE puestos;
TRUNCATE TABLE Funcionario;
TRUNCATE TABLE servicios;
TRUNCATE TABLE Rol_Servicio;
TRUNCATE TABLE Rol_Sistema;
TRUNCATE TABLE Tipo_Solicitud;

-- ==============================================================
-- 1. ROL_SISTEMA  →  tabla: Rol_Sistema
-- Rol global del funcionario (no va al JWT).
-- ==============================================================
INSERT INTO Rol_Sistema (id_rol_sistema, nombre_rol) VALUES
(1, 'ADMINISTRADOR'),
(2, 'USUARIO');

-- ==============================================================
-- 2. ROL_SERVICIO  →  tabla: Rol_Servicio
-- Rol del funcionario dentro de un servicio concreto.
-- Este nombre_rol va al JWT como claim 'rol' y Spring Security
-- lo evalúa como ROLE_<nombre_rol>.
-- Valores válidos según SecurityConfig: JEFATURA, SUBROGANTE, MEDICO
-- ==============================================================
INSERT INTO Rol_Servicio (id_rol_servicio, nombre_rol) VALUES
(1, 'JEFATURA'),
(2, 'SUBROGANTE'),
(3, 'MEDICO');

-- ==============================================================
-- 3. SERVICIOS  →  tabla: servicios
-- Unidades activas del hospital en el sistema.
-- El id_servicio se incluye en el JWT tras seleccionar servicio.
-- ==============================================================
INSERT INTO servicios (id_servicio, nombre) VALUES
(1, 'Medicina Interna'),
(2, 'Enfermería'),
(3, 'Cirugía');

-- ==============================================================
-- 4. FUNCIONARIO  →  tabla: Funcionario
-- Columnas: ID_FUNCIONARIO, Nombre, Apel_pat, Apel_mat,
--           Rut, DV, Clave, Estado, Profesion, ID_ROL_SISTEMA
-- ID_ROL_SISTEMA: 1=ADMINISTRADOR (jefes/subrogantes)  2=USUARIO (médicos/enfermeros)
-- ==============================================================
-- Contraseña "huap2025" hasheada en SHA-512 (inlinea para compatibilidad con DBeaver)
INSERT INTO Funcionario (ID_FUNCIONARIO, Nombre, Apel_pat, Apel_mat, Rut, DV, Clave, Estado, Profesion, ID_ROL_SISTEMA) VALUES
-- === Medicina Interna ===
-- Jefatura → ADMINISTRADOR (1)
(1,  'Álvaro',     'López',       '',           '17599096', '8', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Urgenciólogo',  1),
-- Médicos → USUARIO (2)
(2,  'Fernando',   'Roman',       '',           '16881827', '0', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(3,  'Sergio',     'González',    '',           '18730747', '3', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(4,  'Andrés',     'Tigre',       '',           '18155637', '4', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(5,  'Francisca',  'Álvarez',     '',           '19091609', 'k', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(6,  'Tania',      'Bustos',      'Jorge',      '19178519', '3', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(7,  'Fabián',     'Díaz',        'Terrazas',   '21554320', 'k', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(8,  'María José', 'Espinoza',    'Tilleria',   '19184336', '3', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(9,  'Javier',     'González',    'Lucero',     '19127805', '4', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(10, 'Karla',      'Rojas',       'Toledo',     '19036885', '8', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(11, 'Javiera',    'Steenbecker', 'Jara',       '18211062', '0', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(12, 'Juan',       'Fuentes',     'Haddad',     '18461922', '9', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(13, 'Gonzalo',    'Hinojosa',    'Cerda',      '16875278', '4', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(14, 'Carlos',     'Saa',         'Chong',      '16864458', '2', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(15, 'Consuelo',   'Vilches',     'Alvarado',   '19646316', 'K', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(16, 'Constanza',  'Peña',        'Pozo',       '19644996', '5', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(17, 'Tomás',      'Ide',         'Guiñez',     '19594566', '7', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(18, 'Rocío',      'López',       'Núñez',      '19639491', '5', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(19, 'Antonia',    'Alliende',    'Page',       '19079052', '5', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
(20, 'Flavia',     'Paratori',    'Slinger',    '19687654', '5', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Internista',    2),
-- === Enfermería ===
-- Jefatura → ADMINISTRADOR (1)
(100, 'María Elena', 'Torres',   'Pérez',     '99999999', '9', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Enfermera Supervisora',  1),
-- Subrogante → ADMINISTRADOR (1)
(101, 'Ana María',   'González', 'Rojas',     '12345678', '9', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Enfermera Coordinadora', 1),
-- Enfermeros/as → USUARIO (2)
(102, 'Carlos',      'Silva',    'Mendoza',   '10000001', '1', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Enfermera(o)',            2),
(103, 'Patricia',    'Vargas',   'Ríos',      '10000002', '2', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Enfermera(o)',            2),
(104, 'Roberto',     'Herrera',  'Díaz',      '10000003', '3', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Enfermera(o)',            2),
(105, 'Fernanda',    'Castillo', 'Muñoz',     '10000004', '4', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Enfermera(o)',            2),
(106, 'Miguel',      'Soto',     'Contreras', '10000005', '5', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Enfermera(o)',            2),
(107, 'Cristina',    'Flores',   'Navarrete', '10000006', '6', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Enfermera(o)',            2),
-- === Cirugía ===
-- Jefatura → ADMINISTRADOR (1)
(200, 'Ricardo',     'Morales',  'Vega',      '11111111', '1', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Cirujano',         1),
-- Subrogante → ADMINISTRADOR (1)
(201, 'Isabel',      'Parra',    'Cáceres',   '11111112', '2', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Cirujano',         1),
-- Médicos → USUARIO (2)
(202, 'Felipe',      'Castillo', 'Arenas',    '11111113', '3', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Cirujano',         2),
(203, 'Valentina',   'Ríos',     'Fuentes',   '11111114', '4', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Cirujano',         2),
(204, 'Sebastián',   'Muñoz',    'Lagos',     '11111115', '5', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Cirujano',         2),
(205, 'Camila',      'Vega',     'Soto',      '11111116', '6', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Cirujano',         2),
(206, 'Diego',       'Rojas',    'Mora',      '11111117', '7', '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', 1, 'Médico Cirujano',         2);

-- ==============================================================
-- 5. SERVICIOS_FUNCIONARIO  →  tabla: Servicios_Funcionario
-- Columnas FK: ID_FUNCIONARIO, id_servicio, id_rol_servicio
-- id_rol_servicio: 1=JEFATURA  2=SUBROGANTE  3=MEDICO
-- ==============================================================
INSERT INTO Servicios_Funcionario (ID_FUNCIONARIO, id_servicio, id_rol_servicio) VALUES
-- Medicina Interna (id_servicio = 1)
(1,  1, 1),  -- Álvaro López        → JEFATURA
(2,  1, 3),
(3,  1, 3),
(4,  1, 3),
(5,  1, 3),
(6,  1, 3),
(7,  1, 3),
(8,  1, 3),
(9,  1, 3),
(10, 1, 3),
(11, 1, 3),
(12, 1, 3),
(13, 1, 3),
(14, 1, 3),
(15, 1, 3),
(16, 1, 3),
(17, 1, 3),
(18, 1, 3),
(19, 1, 3),
(20, 1, 3),
-- Enfermería (id_servicio = 2)
(100, 2, 1),  -- María Elena Torres → JEFATURA
(101, 2, 2),  -- Ana María González → SUBROGANTE
(102, 2, 3),
(103, 2, 3),
(104, 2, 3),
(105, 2, 3),
(106, 2, 3),
(107, 2, 3),
-- Cirugía (id_servicio = 3)
(200, 3, 1),  -- Ricardo Morales    → JEFATURA
(201, 3, 2),  -- Isabel Parra       → SUBROGANTE
(202, 3, 3),
(203, 3, 3),
(204, 3, 3),
(205, 3, 3),
(206, 3, 3);

-- ==============================================================
-- 6. PUESTOS  →  tabla: puestos
-- Columnas: nombre, id_servicio
-- AdminOnboardingGuard redirige a /onboarding si no hay puestos
-- para el servicio activo. Estos datos permiten acceder
-- directamente al panel de administración.
-- ==============================================================
INSERT INTO puestos (nombre, id_servicio) VALUES
-- === Medicina Interna (id_servicio = 1) ===
('Médico Internista Residente', 1),
('Médico Urgenciólogo de Turno', 1),
('Médico Tratante de Sala / Piso', 1),
('Médico Interconsultor Residente', 1),
('Médico de Continuidad y Altas', 1),

-- === Enfermería (id_servicio = 2) ===
('Enfermero/a Clínico de Turno', 2),
('Enfermero/a Supervisor / Gestión de Camas', 2),
('Enfermero/a de Triage y Categorización', 2),
('TENS Clínico de Turno', 2),
('TENS de Procedimientos y Medicación', 2),

-- === Cirugía (id_servicio = 3) ===
('Médico Cirujano Residente Pabellón', 3),
('Médico Anestesiólogo Residente', 3),
('Médico Cirujano de Llamada / Retén', 3),
('Enfermero/a Pabellonero / Circulante', 3),
('Enfermero/a de Recuperación Post-Anestésica', 3),
('TENS Arsenalero/a', 3);

-- ==============================================================
-- 7. TIPO_SOLICITUD  →  tabla: Tipo_Solicitud
-- Columnas: ID_TIPO_SOLICITUD, Tipo
-- 1=Permiso  2=Botar turno  3=Cobertura  4=Intercambio
-- ==============================================================
INSERT INTO Tipo_Solicitud (ID_TIPO_SOLICITUD, Tipo) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 4);

-- ==============================================================
-- 8. PLANTILLA  →  tabla: plantilla
-- Columnas: id_servicio, nombre, semanas (ciclo de rotación)
-- La secuencia de días se define en plantilla_secuencia_dias.
-- ==============================================================
INSERT INTO plantilla (id_servicio, nombre, semanas) VALUES
(1, 'Plantilla Estándar - Medicina Interna', 4),  -- id auto = 1
(2, 'Plantilla Estándar - Enfermería',        4),  -- id auto = 2
(3, 'Plantilla Estándar - Cirugía',           2);  -- id auto = 3

-- ==============================================================
-- 9. PLANTILLA_TURNO  →  tabla: plantilla_turno
-- Catálogo de tipos de turno POR SERVICIO (no por plantilla).
-- Cada tipo pertenece a un servicio; el nombre es globalmente
-- único en toda la tabla (constraint UNIQUE en columna nombre).
-- Columnas: id_servicio, hora_inicio, hora_termino, nombre
-- ==============================================================
INSERT INTO plantilla_turno (id_servicio, hora_inicio, hora_termino, nombre) VALUES
-- Medicina Interna (id_servicio=1)
(1, '08:00:00', '20:00:00', 'Diurno MI'),     -- id auto = 1
(1, '20:00:00', '08:00:00', 'Nocturno MI'),   -- id auto = 2
-- Enfermería (id_servicio=2)
(2, '08:00:00', '20:00:00', 'Diurno ENF'),    -- id auto = 3
(2, '20:00:00', '08:00:00', 'Nocturno ENF'),  -- id auto = 4
-- Cirugía (id_servicio=3)
(3, '08:00:00', '20:00:00', 'Diurno CIR'),    -- id auto = 5
(3, '20:00:00', '08:00:00', 'Nocturno CIR');  -- id auto = 6

-- ==============================================================
-- 10. PLANTILLA_SECUENCIA_DIAS  →  tabla: plantilla_secuencia_dias
-- Patrón de días ordenado para cada plantilla.
-- id_plantilla_turno NULL = día libre (no genera TurnoEntity).
-- Unique constraint: (id_plantilla, dia_index).
--
-- Referencia de IDs usados:
--   id_plantilla_turno: 1=DiurnoMI  2=NocturnoMI
--                       3=DiurnoENF 4=NocturnoENF
--                       5=DiurnoCIR 6=NocturnoCIR
--
-- Patrones:
--   Medicina Interna (id=1, 4 sem=28 días): 2D,2N,3L × 4
--   Enfermería       (id=2, 4 sem=28 días): D,N,2L    × 7
--   Cirugía          (id=3, 2 sem=14 días): 2D,N,4L   × 2
-- ==============================================================
INSERT INTO plantilla_secuencia_dias (id_plantilla, dia_index, id_plantilla_turno) VALUES
-- Medicina Interna — Semana 1 (índices 0–6)
(1,  0, 1), (1,  1, 1), (1,  2, 2), (1,  3, 2), (1,  4, NULL), (1,  5, NULL), (1,  6, NULL),
-- Medicina Interna — Semana 2 (índices 7–13)
(1,  7, 1), (1,  8, 1), (1,  9, 2), (1, 10, 2), (1, 11, NULL), (1, 12, NULL), (1, 13, NULL),
-- Medicina Interna — Semana 3 (índices 14–20)
(1, 14, 1), (1, 15, 1), (1, 16, 2), (1, 17, 2), (1, 18, NULL), (1, 19, NULL), (1, 20, NULL),
-- Medicina Interna — Semana 4 (índices 21–27)
(1, 21, 1), (1, 22, 1), (1, 23, 2), (1, 24, 2), (1, 25, NULL), (1, 26, NULL), (1, 27, NULL),

-- Enfermería — Semanas 1–7 (índices 0–27, patrón D,N,L,L × 7)
(2,  0, 3), (2,  1, 4), (2,  2, NULL), (2,  3, NULL),
(2,  4, 3), (2,  5, 4), (2,  6, NULL), (2,  7, NULL),
(2,  8, 3), (2,  9, 4), (2, 10, NULL), (2, 11, NULL),
(2, 12, 3), (2, 13, 4), (2, 14, NULL), (2, 15, NULL),
(2, 16, 3), (2, 17, 4), (2, 18, NULL), (2, 19, NULL),
(2, 20, 3), (2, 21, 4), (2, 22, NULL), (2, 23, NULL),
(2, 24, 3), (2, 25, 4), (2, 26, NULL), (2, 27, NULL),

-- Cirugía — Semana 1 (índices 0–6, patrón D,D,N,L,L,L,L)
(3,  0, 5), (3,  1, 5), (3,  2, 6), (3,  3, NULL), (3,  4, NULL), (3,  5, NULL), (3,  6, NULL),
-- Cirugía — Semana 2 (índices 7–13)
(3,  7, 5), (3,  8, 5), (3,  9, 6), (3, 10, NULL), (3, 11, NULL), (3, 12, NULL), (3, 13, NULL);

-- ==============================================================
-- 11. TURNOS  →  tabla: Turnos
-- Turnos concretos para mayo 2026, generados desde plantilla.
-- Puestos (auto-increment tras TRUNCATE+INSERT ordenado):
--   1=Sala Hombres(MI)  2=Sala Mujeres(MI)  3=Pabellón(MI)
--   4=Puesto A(ENF)      5=Puesto B(ENF)
--   6=Pabellón Central(CIR) 7=Recuperación(CIR) 8=Pre-Quirúrgico(CIR)
-- ID_FUNCIONARIO NULL = turno libre disponible para cobertura.
-- ==============================================================
INSERT INTO Turnos (id_turno, nombre, dia_inicio_turno, dia_final_turno, hora_inicio, hora_fin, ID_FUNCIONARIO, id_servicio, id_puesto, id_plantilla) VALUES
-- === Medicina Interna (id_servicio=1, id_plantilla=1) ===
(1,  'Diurno 05-May',   '2026-05-05', '2026-05-05', '08:00:00', '20:00:00',  2,    1, 1, 1),
(2,  'Diurno 06-May',   '2026-05-06', '2026-05-06', '08:00:00', '20:00:00',  3,    1, 2, 1),
(3,  'Diurno 07-May',   '2026-05-07', '2026-05-07', '08:00:00', '20:00:00',  4,    1, 1, 1),
(4,  'Diurno 08-May',   '2026-05-08', '2026-05-08', '08:00:00', '20:00:00',  5,    1, 2, 1),
(5,  'Diurno 09-May',   '2026-05-09', '2026-05-09', '08:00:00', '20:00:00',  6,    1, 3, 1),
(6,  'Diurno 12-May',   '2026-05-12', '2026-05-12', '08:00:00', '20:00:00',  7,    1, 1, 1),
(7,  'Diurno 13-May',   '2026-05-13', '2026-05-13', '08:00:00', '20:00:00',  8,    1, 2, 1),
(8,  'Diurno 14-May',   '2026-05-14', '2026-05-14', '08:00:00', '20:00:00',  9,    1, 3, 1),
(9,  'Nocturno 05-May', '2026-05-05', '2026-05-06', '20:00:00', '08:00:00', 10,    1, 3, 1),
(10, 'Nocturno 07-May', '2026-05-07', '2026-05-08', '20:00:00', '08:00:00', 11,    1, 1, 1),
(11, 'Nocturno 12-May', '2026-05-12', '2026-05-13', '20:00:00', '08:00:00', 12,    1, 2, 1),
(12, 'Diurno 15-May',   '2026-05-15', '2026-05-15', '08:00:00', '20:00:00', 13,    1, 1, 1),
(13, 'Diurno 16-May',   '2026-05-16', '2026-05-16', '08:00:00', '20:00:00', 14,    1, 2, 1),
(14, 'Diurno 19-May',   '2026-05-19', '2026-05-19', '08:00:00', '20:00:00', 15,    1, 3, 1),
(15, 'Diurno 20-May',   '2026-05-20', '2026-05-20', '08:00:00', '20:00:00', 16,    1, 1, 1),
(16, 'Diurno 22-May',   '2026-05-22', '2026-05-22', '08:00:00', '20:00:00', NULL,  1, 2, 1),
(17, 'Nocturno 19-May', '2026-05-19', '2026-05-20', '20:00:00', '08:00:00', NULL,  1, 3, 1),
-- === Enfermería (id_servicio=2, id_plantilla=2) ===
(18, 'Diurno 05-May',   '2026-05-05', '2026-05-05', '08:00:00', '20:00:00', 102,   2, 4, 2),
(19, 'Diurno 06-May',   '2026-05-06', '2026-05-06', '08:00:00', '20:00:00', 103,   2, 5, 2),
(20, 'Nocturno 05-May', '2026-05-05', '2026-05-06', '20:00:00', '08:00:00', 104,   2, 4, 2),
(21, 'Diurno 07-May',   '2026-05-07', '2026-05-07', '08:00:00', '20:00:00', 105,   2, 5, 2),
(22, 'Diurno 08-May',   '2026-05-08', '2026-05-08', '08:00:00', '20:00:00', 106,   2, 4, 2),
(23, 'Nocturno 07-May', '2026-05-07', '2026-05-08', '20:00:00', '08:00:00', 107,   2, 5, 2),
(24, 'Diurno 12-May',   '2026-05-12', '2026-05-12', '08:00:00', '20:00:00', 102,   2, 4, 2),
(25, 'Diurno 13-May',   '2026-05-13', '2026-05-13', '08:00:00', '20:00:00', 103,   2, 5, 2),
(26, 'Diurno 20-May',   '2026-05-20', '2026-05-20', '08:00:00', '20:00:00', NULL,  2, 4, 2),
-- === Cirugía (id_servicio=3, id_plantilla=3) ===
(27, 'Diurno 05-May',   '2026-05-05', '2026-05-05', '08:00:00', '20:00:00', 202,   3, 6, 3),
(28, 'Diurno 06-May',   '2026-05-06', '2026-05-06', '08:00:00', '20:00:00', 203,   3, 7, 3),
(29, 'Diurno 07-May',   '2026-05-07', '2026-05-07', '08:00:00', '20:00:00', 204,   3, 8, 3),
(30, 'Nocturno 05-May', '2026-05-05', '2026-05-06', '20:00:00', '08:00:00', 205,   3, 6, 3),
(31, 'Diurno 08-May',   '2026-05-08', '2026-05-08', '08:00:00', '20:00:00', 206,   3, 7, 3),
(32, 'Diurno 12-May',   '2026-05-12', '2026-05-12', '08:00:00', '20:00:00', 202,   3, 8, 3),
(33, 'Diurno 13-May',   '2026-05-13', '2026-05-13', '08:00:00', '20:00:00', 203,   3, 6, 3),
(34, 'Nocturno 12-May', '2026-05-12', '2026-05-13', '20:00:00', '08:00:00', 204,   3, 7, 3),
(35, 'Diurno 21-May',   '2026-05-21', '2026-05-21', '08:00:00', '20:00:00', NULL,  3, 8, 3);

-- ==============================================================
-- 12. SOLICITUDES  →  tabla: Solicitudes
-- Casos de prueba del flujo completo de solicitudes.
-- Tipo: 1=Permiso  2=Botar turno  3=Cobertura  4=Intercambio
-- ==============================================================
INSERT INTO Solicitudes (ID_SOLICITUD, ID_FUNCIONARIO, ID_TIPO_SOLICITUD, ID_TURNO, ID_TURNO_RECEPTOR, ID_FUNCIONARIO_RECEPTOR, Aceptado_Receptor, Estado, Fecha_creacion, Fecha_inicio_permiso, Fecha_termino_permiso, Motivo) VALUES
-- Permiso (tipo 1): func 2 pide permiso en su turno 1 → PENDIENTE
(1, 2, 1, 1, NULL, NULL, NULL, 'PENDIENTE',
 '2026-05-01 09:00:00', '2026-05-05 08:00:00', '2026-05-05 20:00:00',
 'Consulta médica personal'),
-- Cobertura (tipo 3): func 17 solicita cubrir turno libre 16 (May 22) → PENDIENTE
(2, 17, 3, 16, NULL, NULL, NULL, 'PENDIENTE',
 '2026-05-10 14:00:00', NULL, NULL,
 'Disponible para cubrir turno desocupado el 22-May'),
-- Intercambio (tipo 4): func 4 quiere turno 8 (de func 9), ofrece su turno 3; receptor aceptó → PENDIENTE jefatura
(3, 4, 4, 8, 3, 9, TRUE, 'PENDIENTE',
 '2026-05-08 11:30:00', NULL, NULL,
 'Necesito cambiar al turno 14-May por compromisos familiares'),
-- Botar turno (tipo 2): func 6 libera turno 5 (May 9) → APROBADA
(4, 6, 2, 5, NULL, NULL, NULL, 'APROBADA',
 '2026-04-28 10:00:00', NULL, NULL,
 'Acumulación de horas extra, aprobado por jefatura');

-- ==============================================================
-- 13. NOTIFICACION2  →  tabla: Notificacion2
-- ID_SOLICITUD es @OneToOne → un registro por solicitud.
-- ==============================================================
INSERT INTO Notificacion2 (ID_NOTIFICACION, Estado, Fecha_envio, Mensaje, ID_SOLICITUD) VALUES
(1, 'NO_LEIDO', '2026-05-01 09:00:01',
 'Su solicitud de permiso para el 05-May ha sido recibida y está pendiente de aprobación.', 1),
(2, 'NO_LEIDO', '2026-05-10 14:00:01',
 'Su solicitud de cobertura del turno 22-May ha sido recibida.', 2),
(3, 'NO_LEIDO', '2026-05-08 11:30:01',
 'El funcionario receptor ha aceptado el intercambio. Pendiente de aprobación por jefatura.', 3),
(4, 'LEIDO',    '2026-04-28 10:00:01',
 'Su solicitud de botar turno del 09-May ha sido aprobada.', 4);

-- ==============================================================
-- 14. BITACORA_EVENTOS  →  tabla: Bitacora_eventos
-- ID_SOLICITUD es @OneToOne (unique) → una entrada por solicitud.
-- ID_TURNO se deja NULL para evitar conflicto de unicidad.
-- ==============================================================
INSERT INTO Bitacora_eventos (ID_EVENTO, ID_FUNCIONARIO, ID_TURNO, ID_SOLICITUD, Tipo_evento, Motivo, Observaciones, Fecha_inicio_afectada, Fecha_fin_afectada, Fecha_modificacion, Activo) VALUES
(1, 2,  NULL, 1, 'SOLICITUD_CREADA',
 'Consulta médica personal',
 'Turno diurno 05-May (id=1), Sala Hombres',
 '2026-05-01 09:00:00', NULL, '2026-05-01 09:00:00', TRUE),
(2, 17, NULL, 2, 'SOLICITUD_CREADA',
 'Solicitud de cobertura voluntaria',
 'Turno diurno 22-May (id=16), Sala Mujeres — sin asignar',
 '2026-05-10 14:00:00', NULL, '2026-05-10 14:00:00', TRUE),
(3, 9,  NULL, 3, 'OFERTA_ACEPTADA_POR_RECEPTOR',
 'Receptor acepta el intercambio de turnos',
 'Func 4 ↔ Func 9: turno 14-May ↔ turno 07-May. Pendiente jefatura.',
 '2026-05-08 12:00:00', NULL, '2026-05-08 12:00:00', TRUE),
(4, 1,  NULL, 4, 'CAMBIO_ESTADO_APROBADA',
 'Aprobado por jefatura',
 'Func 6 libera turno 09-May (id=5). Turno queda disponible para cobertura.',
 '2026-04-28 10:30:00', '2026-05-09 20:00:00', '2026-04-28 10:30:00', TRUE);

-- ==============================================================
-- DEMO: Turnos de Álvaro López (ID_FUNCIONARIO=1) + relleno mayo
-- ==============================================================
INSERT INTO Turnos (id_turno, nombre, dia_inicio_turno, dia_final_turno, hora_inicio, hora_fin, ID_FUNCIONARIO, id_servicio, id_puesto, id_plantilla) VALUES
-- Álvaro López – 10 turnos distribuidos en mayo 2026
(36, 'Diurno 05-May',    '2026-05-05', '2026-05-05', '08:00:00', '20:00:00',  1, 1, 3, 1),
(37, 'Nocturno 06-May',  '2026-05-06', '2026-05-07', '20:00:00', '08:00:00',  1, 1, 1, 1),
(38, 'Diurno 09-May',    '2026-05-09', '2026-05-09', '08:00:00', '20:00:00',  1, 1, 2, 1),
(39, 'Nocturno 13-May',  '2026-05-13', '2026-05-14', '20:00:00', '08:00:00',  1, 1, 3, 1),
(40, 'Diurno 15-May',    '2026-05-15', '2026-05-15', '08:00:00', '20:00:00',  1, 1, 1, 1),
(41, 'Nocturno 19-May',  '2026-05-19', '2026-05-20', '20:00:00', '08:00:00',  1, 1, 2, 1),
(42, 'Diurno 21-May',    '2026-05-21', '2026-05-21', '08:00:00', '20:00:00',  1, 1, 3, 1),
(43, 'Diurno 23-May',    '2026-05-23', '2026-05-23', '08:00:00', '20:00:00',  1, 1, 1, 1),
(44, 'Nocturno 26-May',  '2026-05-26', '2026-05-27', '20:00:00', '08:00:00',  1, 1, 2, 1),
(45, 'Diurno 29-May',    '2026-05-29', '2026-05-29', '08:00:00', '20:00:00',  1, 1, 3, 1),
-- Turnos libres adicionales Medicina Interna
(46, 'Diurno 24-May',    '2026-05-24', '2026-05-24', '08:00:00', '20:00:00', NULL, 1, 1, 1),
(47, 'Nocturno 27-May',  '2026-05-27', '2026-05-28', '20:00:00', '08:00:00', NULL, 1, 2, 1),
-- Turnos resto de equipo – última quincena de mayo
(48, 'Diurno 21-May',    '2026-05-21', '2026-05-21', '08:00:00', '20:00:00', 17, 1, 1, 1),
(49, 'Diurno 22-May',    '2026-05-22', '2026-05-22', '08:00:00', '20:00:00', 18, 1, 2, 1),
(50, 'Nocturno 22-May',  '2026-05-22', '2026-05-23', '20:00:00', '08:00:00', 19, 1, 3, 1),
(51, 'Diurno 26-May',    '2026-05-26', '2026-05-26', '08:00:00', '20:00:00', 20, 1, 1, 1),
(52, 'Nocturno 23-May',  '2026-05-23', '2026-05-24', '20:00:00', '08:00:00',  2, 1, 3, 1),
(53, 'Diurno 27-May',    '2026-05-27', '2026-05-27', '08:00:00', '20:00:00',  3, 1, 2, 1),
(54, 'Diurno 28-May',    '2026-05-28', '2026-05-28', '08:00:00', '20:00:00',  4, 1, 1, 1),
(55, 'Nocturno 28-May',  '2026-05-28', '2026-05-29', '20:00:00', '08:00:00',  5, 1, 3, 1);

-- ==============================================================
-- DEMO: Solicitudes adicionales (IDs 5-12)
-- Tipo: 1=Permiso  2=Botar turno  3=Cobertura  4=Intercambio
-- ==============================================================
INSERT INTO Solicitudes (ID_SOLICITUD, ID_FUNCIONARIO, ID_TIPO_SOLICITUD, ID_TURNO, ID_TURNO_RECEPTOR, ID_FUNCIONARIO_RECEPTOR, Aceptado_Receptor, Estado, Fecha_creacion, Fecha_inicio_permiso, Fecha_termino_permiso, Motivo) VALUES
-- (5) Álvaro pide permiso para su propio turno 36 (05-May diurno) — PENDIENTE
(5, 1, 1, 36, NULL, NULL, NULL, 'PENDIENTE',
 '2026-05-02 08:30:00', '2026-05-05 08:00:00', '2026-05-05 20:00:00',
 'Congreso médico SOCHINMI — asistencia obligatoria como jefe de servicio'),
-- (6) Sergio González (func 3) pide permiso para turno 2 (06-May diurno) — PENDIENTE
(6, 3, 1, 2, NULL, NULL, NULL, 'PENDIENTE',
 '2026-05-03 11:00:00', '2026-05-06 08:00:00', '2026-05-06 20:00:00',
 'Reunión académica universitaria con alumnos en práctica'),
-- (7) Javier González (func 9) quiere botar turno 8 (14-May diurno) — PENDIENTE
(7, 9, 2, 8, NULL, NULL, NULL, 'PENDIENTE',
 '2026-05-10 16:00:00', NULL, NULL,
 'Acumulación de horas extra — solicito liberar el turno del 14-May'),
-- (8) Andrés Tigre (func 4) propone intercambio: ofrece turno 3 (07-May) por turno 40 (Álvaro, 15-May); Álvaro aceptó — PENDIENTE jefatura
(8, 4, 4, 3, 40, 1, TRUE, 'PENDIENTE',
 '2026-05-05 09:00:00', NULL, NULL,
 'Necesito moverme al 15-May por asistencia a parto familiar'),
-- (9) Fabián Díaz (func 7) solicita cubrir turno libre 46 (24-May diurno) — PENDIENTE
(9, 7, 3, 46, NULL, NULL, NULL, 'PENDIENTE',
 '2026-05-20 10:30:00', NULL, NULL,
 'Disponible para cubrir el diurno desocupado del 24-May'),
-- (10) Tomás Ide (func 17) pide permiso para turno 48 (21-May diurno) — APROBADA
(10, 17, 1, 48, NULL, NULL, NULL, 'APROBADA',
 '2026-05-14 14:00:00', '2026-05-21 08:00:00', '2026-05-21 20:00:00',
 'Cita médica con especialista cardiólogo'),
-- (11) Karla Rojas (func 10) pide cobertura del turno libre 47 (27-May nocturno) — RECHAZADA
(11, 10, 3, 47, NULL, NULL, NULL, 'RECHAZADA',
 '2026-05-22 09:00:00', NULL, NULL,
 'Me ofrezco voluntariamente para cubrir el nocturno del 27-May'),
-- (12) María José Espinoza (func 8) propone intercambio: ofrece turno 7 (13-May) por turno 43 (Álvaro, 23-May); Álvaro aún no responde — PENDIENTE
(12, 8, 4, 7, 43, 1, NULL, 'PENDIENTE',
 '2026-05-12 17:30:00', NULL, NULL,
 'Me conviene más el turno del 23-May, ofrezco mi turno del 13-May');

-- ==============================================================
-- DEMO: Notificaciones adicionales (IDs 5-12)
-- ==============================================================
INSERT INTO Notificacion2 (ID_NOTIFICACION, Estado, Fecha_envio, Mensaje, ID_SOLICITUD) VALUES
(5, 'NO_LEIDA', '2026-05-02 08:30:01',
 'Su solicitud de permiso para el 05-May (Congreso SOCHINMI) ha sido recibida y está pendiente de aprobación.', 5),
(6, 'NO_LEIDA', '2026-05-03 11:00:01',
 'Su solicitud de permiso para el 06-May ha sido recibida y está pendiente de aprobación.', 6),
(7, 'NO_LEIDA', '2026-05-10 16:00:01',
 'Su solicitud para liberar el turno del 14-May ha sido recibida y está en revisión.', 7),
(8, 'NO_LEIDA', '2026-05-05 09:00:01',
 'El funcionario receptor (Álvaro López) ha aceptado el intercambio de turnos. Pendiente de aprobación por jefatura.', 8),
(9, 'NO_LEIDA', '2026-05-20 10:30:01',
 'Su solicitud de cobertura del turno diurno 24-May ha sido recibida y está pendiente de asignación.', 9),
(10, 'LEIDA',   '2026-05-14 14:00:01',
 'Su solicitud de permiso para el 21-May ha sido aprobada por jefatura.', 10),
(11, 'LEIDA',   '2026-05-22 09:00:01',
 'Su solicitud de cobertura del nocturno 27-May ha sido rechazada. Contacte a su jefe de servicio para más información.', 11),
(12, 'NO_LEIDA', '2026-05-12 17:30:01',
 'Ha recibido una propuesta de intercambio de turno del 13-May por el 23-May de parte de María José Espinoza. Revise su bandeja de solicitudes.', 12);

-- ==============================================================
-- DEMO: Bitácora adicional (IDs 5-12)
-- ==============================================================
INSERT INTO Bitacora_eventos (ID_EVENTO, ID_FUNCIONARIO, ID_TURNO, ID_SOLICITUD, Tipo_evento, Motivo, Observaciones, Fecha_inicio_afectada, Fecha_fin_afectada, Fecha_modificacion, Activo) VALUES
(5, 1,  NULL, 5,  'SOLICITUD_CREADA',
 'Permiso por congreso médico',
 'Álvaro López — turno diurno 05-May (id=36), Pabellón MI. Solicita permiso como jefe de servicio.',
 '2026-05-02 08:30:00', NULL, '2026-05-02 08:30:00', TRUE),
(6, 3,  NULL, 6,  'SOLICITUD_CREADA',
 'Permiso por reunión académica',
 'Sergio González — turno diurno 06-May (id=2), Sala Mujeres.',
 '2026-05-03 11:00:00', NULL, '2026-05-03 11:00:00', TRUE),
(7, 9,  NULL, 7,  'SOLICITUD_CREADA',
 'Solicitud botar turno — horas extra',
 'Javier González — turno diurno 14-May (id=8), Pabellón MI. Solicita liberar por acumulación de horas.',
 '2026-05-10 16:00:00', NULL, '2026-05-10 16:00:00', TRUE),
(8, 4,  NULL, 8,  'OFERTA_ACEPTADA_POR_RECEPTOR',
 'Receptor acepta intercambio de turno',
 'Func 4 (Andrés Tigre) ↔ Func 1 (Álvaro López): turno 07-May ↔ turno 15-May. Pendiente aprobación jefatura.',
 '2026-05-05 09:30:00', NULL, '2026-05-05 09:30:00', TRUE),
(9, 7,  NULL, 9,  'SOLICITUD_CREADA',
 'Solicitud cobertura voluntaria',
 'Fabián Díaz — turno libre diurno 24-May (id=46), Sala Hombres MI. Se postula para cubrir.',
 '2026-05-20 10:30:00', NULL, '2026-05-20 10:30:00', TRUE),
(10, 1, NULL, 10, 'CAMBIO_ESTADO_APROBADA',
 'Permiso aprobado por jefatura',
 'Tomás Ide — turno diurno 21-May (id=48). Aprobado por Álvaro López.',
 '2026-05-14 15:00:00', '2026-05-21 20:00:00', '2026-05-14 15:00:00', TRUE),
(11, 1, NULL, 11, 'CAMBIO_ESTADO_RECHAZADA',
 'Cobertura rechazada por jefatura',
 'Karla Rojas — turno libre nocturno 27-May (id=47). Rechazado: cobertura ya asignada internamente.',
 '2026-05-22 10:00:00', NULL, '2026-05-22 10:00:00', TRUE),
(12, 8, NULL, 12, 'SOLICITUD_CREADA',
 'Propuesta de intercambio enviada a Álvaro López',
 'María José Espinoza ofrece turno 13-May (id=7) por turno 23-May de Álvaro (id=43). Pendiente respuesta receptor.',
 '2026-05-12 17:30:00', NULL, '2026-05-12 17:30:00', TRUE);

-- ==============================================================
-- 15. MULTI-SERVICIO  →  tabla: Servicios_Funcionario
-- Personas asociadas a MÁS de un servicio. Médicos de Medicina
-- Interna que también cubren Cirugía (y viceversa). Habilita
-- probar choques de horario CROSS-SERVICIO al generar.
-- id_rol_servicio: 3 = MEDICO
-- ==============================================================
INSERT INTO Servicios_Funcionario (ID_FUNCIONARIO, id_servicio, id_rol_servicio) VALUES
(2,   3, 3),   -- Fernando Roman  (MI) → también Cirugía
(3,   3, 3),   -- Sergio González (MI) → también Cirugía
(4,   3, 3),   -- Andrés Tigre    (MI) → también Cirugía
(202, 1, 3);   -- Felipe Castillo (Cirugía) → también Medicina Interna

-- ==============================================================
-- 16. TURNOS EXISTENTES EN OTRO SERVICIO (semana del lun 01-Jun-2026)
-- Estos turnos están en un servicio DISTINTO al que la persona usaría
-- al generar su molde, y caen en la semana Mon 01-Jun … Sun 07-Jun.
-- Patrón Medicina Interna desde el lunes 01-Jun genera:
--   Jun 1 Diurno · Jun 2 Diurno · Jun 3 Nocturno · Jun 4 Nocturno · Jun 5-7 libre
-- Por lo tanto, al asignar a estos médicos en un molde de Medicina Interna
-- y generar desde el 01-Jun, esos turnos saldrán VACANTES por conflicto
-- con su turno ya existente en Cirugía (cross-servicio).
-- (La inyección es libre de conflictos: cada persona tiene UN solo turno en junio.)
--   plantilla_turno CIR: 5=Diurno CIR  6=Nocturno CIR · puestos CIR: 6,7,8
-- ==============================================================
INSERT INTO Turnos (id_turno, nombre, dia_inicio_turno, dia_final_turno, hora_inicio, hora_fin, ID_FUNCIONARIO, id_servicio, id_puesto, id_plantilla) VALUES
(56, 'Diurno 01-Jun (CIR)',   '2026-06-01', '2026-06-01', '08:00:00', '20:00:00',   2, 3, 6, 3),  -- Fernando, Cirugía → choca con MI-gen Jun 1 diurno
(57, 'Diurno 02-Jun (CIR)',   '2026-06-02', '2026-06-02', '08:00:00', '20:00:00',   3, 3, 7, 3),  -- Sergio,   Cirugía → choca con MI-gen Jun 2 diurno
(58, 'Nocturno 03-Jun (CIR)', '2026-06-03', '2026-06-04', '20:00:00', '08:00:00',   4, 3, 8, 3),  -- Andrés,   Cirugía → choca con MI-gen Jun 3 nocturno
(59, 'Diurno 02-Jun (MI)',    '2026-06-02', '2026-06-02', '08:00:00', '20:00:00', 202, 1, 1, 1);  -- Felipe (CIR) en MI → choca con un molde de Cirugía generado desde Jun 1

-- ==============================================================
-- 17. TURNOS DE HOY (05-06-2026) — datos para "hoy" en cada servicio
-- Viernes 05-Jun-2026. Mezcla de asignados y libres, sin conflictos
-- (ninguna persona queda con dos turnos solapados ese día).
-- ==============================================================
INSERT INTO Turnos (id_turno, nombre, dia_inicio_turno, dia_final_turno, hora_inicio, hora_fin, ID_FUNCIONARIO, id_servicio, id_puesto, id_plantilla) VALUES
-- Medicina Interna (servicio 1)
(60, 'Diurno 05-Jun',   '2026-06-05', '2026-06-05', '08:00:00', '20:00:00',   1, 1, 3, 1),  -- Álvaro López
(61, 'Diurno 05-Jun',   '2026-06-05', '2026-06-05', '08:00:00', '20:00:00',   6, 1, 1, 1),  -- Tania Bustos
(62, 'Nocturno 05-Jun', '2026-06-05', '2026-06-06', '20:00:00', '08:00:00',   7, 1, 2, 1),  -- Fabián Díaz
(63, 'Diurno 05-Jun',   '2026-06-05', '2026-06-05', '08:00:00', '20:00:00', NULL, 1, 2, 1),  -- libre
-- Enfermería (servicio 2)
(64, 'Diurno 05-Jun',   '2026-06-05', '2026-06-05', '08:00:00', '20:00:00', 102, 2, 4, 2),  -- Carlos Silva
(65, 'Nocturno 05-Jun', '2026-06-05', '2026-06-06', '20:00:00', '08:00:00', 104, 2, 5, 2),  -- Roberto Herrera
(66, 'Diurno 05-Jun',   '2026-06-05', '2026-06-05', '08:00:00', '20:00:00', NULL, 2, 4, 2),  -- libre
-- Cirugía (servicio 3)
(67, 'Diurno 05-Jun',   '2026-06-05', '2026-06-05', '08:00:00', '20:00:00', 205, 3, 6, 3),  -- Camila Vega
(68, 'Nocturno 05-Jun', '2026-06-05', '2026-06-06', '20:00:00', '08:00:00', 206, 3, 7, 3),  -- Diego Rojas
(69, 'Diurno 05-Jun',   '2026-06-05', '2026-06-05', '08:00:00', '20:00:00', NULL, 3, 8, 3);  -- libre

SET FOREIGN_KEY_CHECKS = 1;
