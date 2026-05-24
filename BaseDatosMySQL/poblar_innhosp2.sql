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
--   Servicios_Funcionario, pisos, Tipo_Solicitud,
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
TRUNCATE TABLE pisos;
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
-- 6. PISOS  →  tabla: pisos
-- Columnas: nombre, id_servicio
-- AdminOnboardingGuard redirige a /onboarding si no hay pisos
-- para el servicio activo. Estos datos permiten acceder
-- directamente al panel de administración.
-- ==============================================================
INSERT INTO pisos (nombre, id_servicio) VALUES
-- Medicina Interna (id_servicio = 1)
('Sala Hombres', 1),
('Sala Mujeres', 1),
('Pabellón',     1),
-- Enfermería (id_servicio = 2)
('Piso A',       2),
('Piso B',       2),
-- Cirugía (id_servicio = 3)
('Pabellón Central', 3),
('Recuperación',     3),
('Pre-Quirúrgico',   3);

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
-- Pisos (auto-increment tras TRUNCATE+INSERT ordenado):
--   1=Sala Hombres(MI)  2=Sala Mujeres(MI)  3=Pabellón(MI)
--   4=Piso A(ENF)        5=Piso B(ENF)
--   6=Pabellón Central(CIR) 7=Recuperación(CIR) 8=Pre-Quirúrgico(CIR)
-- ID_FUNCIONARIO NULL = turno libre disponible para cobertura.
-- ==============================================================
INSERT INTO Turnos (id_turno, nombre, dia_inicio_turno, dia_final_turno, hora_inicio, hora_fin, ID_FUNCIONARIO, id_servicio, id_piso, id_plantilla) VALUES
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
(1, 'NO_LEIDA', '2026-05-01 09:00:01',
 'Su solicitud de permiso para el 05-May ha sido recibida y está pendiente de aprobación.', 1),
(2, 'NO_LEIDA', '2026-05-10 14:00:01',
 'Su solicitud de cobertura del turno 22-May ha sido recibida.', 2),
(3, 'NO_LEIDA', '2026-05-08 11:30:01',
 'El funcionario receptor ha aceptado el intercambio. Pendiente de aprobación por jefatura.', 3),
(4, 'LEIDA',    '2026-04-28 10:00:01',
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

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================
-- VERIFICACIÓN
-- ==============================================================
SELECT 'Roles Sistema'      AS tabla, COUNT(*) AS filas FROM Rol_Sistema              UNION ALL
SELECT 'Roles Servicio'     AS tabla, COUNT(*) AS filas FROM Rol_Servicio             UNION ALL
SELECT 'Servicios'          AS tabla, COUNT(*) AS filas FROM servicios                UNION ALL
SELECT 'Pisos'              AS tabla, COUNT(*) AS filas FROM pisos                    UNION ALL
SELECT 'Tipo_Solicitud'     AS tabla, COUNT(*) AS filas FROM Tipo_Solicitud           UNION ALL
SELECT 'Funcionarios'       AS tabla, COUNT(*) AS filas FROM Funcionario              UNION ALL
SELECT 'Srv_Func'           AS tabla, COUNT(*) AS filas FROM Servicios_Funcionario    UNION ALL
SELECT 'Plantillas'         AS tabla, COUNT(*) AS filas FROM plantilla                UNION ALL
SELECT 'Plantilla_turno'    AS tabla, COUNT(*) AS filas FROM plantilla_turno          UNION ALL
SELECT 'Plantilla_dias'     AS tabla, COUNT(*) AS filas FROM plantilla_secuencia_dias UNION ALL
SELECT 'Turnos'             AS tabla, COUNT(*) AS filas FROM Turnos                   UNION ALL
SELECT 'Solicitudes'        AS tabla, COUNT(*) AS filas FROM Solicitudes              UNION ALL
SELECT 'Notificacion2'      AS tabla, COUNT(*) AS filas FROM Notificacion2            UNION ALL
SELECT 'Bitacora_eventos'   AS tabla, COUNT(*) AS filas FROM Bitacora_eventos;

SELECT 'Funcionarios con servicio y rol' AS detalle;
SELECT
    f.ID_FUNCIONARIO                              AS id,
    CONCAT(f.Nombre, ' ', f.Apel_pat)             AS nombre,
    CONCAT(f.Rut, '-', f.DV)                      AS rut,
    rs.nombre_rol                                  AS rol_sistema,
    s.nombre                                       AS servicio,
    rv.nombre_rol                                  AS rol_en_servicio
FROM Funcionario f
JOIN Rol_Sistema           rs ON f.ID_ROL_SISTEMA   = rs.id_rol_sistema
JOIN Servicios_Funcionario sf ON f.ID_FUNCIONARIO   = sf.ID_FUNCIONARIO
JOIN servicios             s  ON sf.id_servicio      = s.id_servicio
JOIN Rol_Servicio          rv ON sf.id_rol_servicio  = rv.id_rol_servicio
ORDER BY s.nombre, rv.id_rol_servicio, f.Apel_pat;

SELECT 'Tipos de turno por servicio' AS detalle;
SELECT
    s.nombre        AS servicio,
    pt.nombre       AS tipo_turno,
    pt.hora_inicio,
    pt.hora_termino
FROM plantilla_turno pt
JOIN servicios s ON pt.id_servicio = s.id_servicio
ORDER BY s.id_servicio, pt.id_plantilla_turno;

SELECT 'Secuencia de días por plantilla (primeros 14 de cada una)' AS detalle;
SELECT
    p.nombre                                          AS plantilla,
    psd.dia_index,
    COALESCE(pt.nombre, 'LIBRE')                      AS tipo_turno
FROM plantilla_secuencia_dias psd
JOIN plantilla       p  ON psd.id_plantilla      = p.id_plantilla
LEFT JOIN plantilla_turno pt ON psd.id_plantilla_turno = pt.id_plantilla_turno
WHERE psd.dia_index < 14
ORDER BY p.id_plantilla, psd.dia_index;
en_servicio
FROM Funcionario f
JOIN Rol_Sistema           rs ON f.ID_ROL_SISTEMA   = rs.id_rol_sistema
JOIN Servicios_Funcionario sf ON f.ID_FUNCIONARIO   = sf.ID_FUNCIONARIO
JOIN servicios             s  ON sf.id_servicio      = s.id_servicio
JOIN Rol_Servicio          rv ON sf.id_rol_servicio  = rv.id_rol_servicio
ORDER BY s.nombre, rv.id_rol_servicio, f.Apel_pat;
