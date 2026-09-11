USE gestionturnos;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- LIMPIEZA: TRUNCATE resetea datos y auto-increment en una sola sentencia por tabla.
-- Orden: hijos antes que padres (aunque FK_CHECKS=0 lo permite en cualquier orden).
TRUNCATE TABLE Postulacion_Oferta;
TRUNCATE TABLE Oferta_General;
TRUNCATE TABLE Notificacion;
TRUNCATE TABLE Bitacora_eventos;
TRUNCATE TABLE Solicitudes;
TRUNCATE TABLE Turnos;
TRUNCATE TABLE planificacion_asignacion;
TRUNCATE TABLE planificacion;
TRUNCATE TABLE reglas_horarios_turnos_servicio;
TRUNCATE TABLE rotativa_secuencia_dias;
TRUNCATE TABLE tipo_turno;
TRUNCATE TABLE rotativa;
TRUNCATE TABLE Servicios_Funcionario;
TRUNCATE TABLE puestos;
TRUNCATE TABLE Funcionario;
TRUNCATE TABLE servicios;
TRUNCATE TABLE Rol_Servicio;
TRUNCATE TABLE Rol_Sistema;
TRUNCATE TABLE Tipo_Solicitud;
TRUNCATE TABLE feriados;

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

INSERT INTO servicios (id_servicio, nombre, eliminado) VALUES
(1, 'Medicina Interna', 0),
(2, 'Enfermería', 0),
(3, 'Cirugía', 0);

-- Urgencias (MVP)
INSERT INTO servicios (id_servicio, nombre, eliminado) VALUES
(4, 'Urgencias', 0);

-- ==============================================================
-- 3b. FERIADOS  →  tabla: feriados
-- Días feriados de Chile (2025–2026). El motor de ajuste de horarios
-- los consulta por fecha; el front los usa para colorear el preview.
-- ==============================================================
INSERT INTO feriados (fecha, descripcion) VALUES
('2025-01-01', 'Año Nuevo'),
('2025-04-18', 'Viernes Santo'),
('2025-04-19', 'Sábado Santo'),
('2025-05-01', 'Día del Trabajo'),
('2025-05-21', 'Día de las Glorias Navales'),
('2025-06-20', 'Día Nacional de los Pueblos Indígenas'),
('2025-06-29', 'San Pedro y San Pablo'),
('2025-07-16', 'Virgen del Carmen'),
('2025-08-15', 'Asunción de la Virgen'),
('2025-09-18', 'Fiestas Patrias'),
('2025-09-19', 'Día de las Glorias del Ejército'),
('2025-10-12', 'Encuentro de Dos Mundos'),
('2025-10-31', 'Día de las Iglesias Evangélicas'),
('2025-11-01', 'Día de Todos los Santos'),
('2025-12-08', 'Inmaculada Concepción'),
('2025-12-25', 'Navidad'),
('2026-01-01', 'Año Nuevo'),
('2026-04-03', 'Viernes Santo'),
('2026-04-04', 'Sábado Santo'),
('2026-05-01', 'Día del Trabajo'),
('2026-05-21', 'Día de las Glorias Navales'),
('2026-06-21', 'Día Nacional de los Pueblos Indígenas'),
('2026-06-29', 'San Pedro y San Pablo'),
('2026-07-16', 'Virgen del Carmen'),
('2026-08-15', 'Asunción de la Virgen'),
('2026-09-18', 'Fiestas Patrias'),
('2026-09-19', 'Día de las Glorias del Ejército'),
('2026-10-12', 'Encuentro de Dos Mundos'),
('2026-10-31', 'Día de las Iglesias Evangélicas'),
('2026-11-01', 'Día de Todos los Santos'),
('2026-12-08', 'Inmaculada Concepción'),
('2026-12-25', 'Navidad');

-- ==============================================================
-- 4. FUNCIONARIO  →  tabla: Funcionario
-- Columnas: ID_FUNCIONARIO, Nombre, Apel_pat, Apel_mat,
--           Rut, DV, Estado, eliminado, Profesion, ID_ROL_SISTEMA
-- ID_ROL_SISTEMA: 1=ADMINISTRADOR (jefes/subrogantes)  2=USUARIO (médicos/enfermeros)
-- ==============================================================
-- Contraseña "huap2025" hasheada en SHA-512 (inlinea para compatibilidad con DBeaver)
-- OJO: RUT único. El funcionario 200 tenía '11111111','1', el MISMO que el
-- funcionario 1 (Admin Bootstrap): la clave única uk_funcionario_rut_dv abortaba
-- este INSERT completo y, como el cliente mysql corta al primer error, el resto
-- del archivo (puestos, rotativas, planificación, turnos) nunca se cargaba.
-- Se le asignó 20000200-6. El INSERT queda estricto a propósito: si vuelve a
-- haber un RUT repetido, tiene que fallar a la vista y no tragarse la fila.
INSERT INTO Funcionario (ID_FUNCIONARIO, Nombre, Apel_pat, Apel_mat, Rut, DV, Estado, eliminado, Profesion, ID_ROL_SISTEMA) VALUES
-- === Medicina Interna ===
-- Jefatura → ADMINISTRADOR (1)
(1,  'Admin',      'Bootstrap',   '',           '11111111', '1', 1, 0, 'Administrador de Sistema',  1),
-- Médicos → USUARIO (2)
(2,  'Fernando',   'Roman',       '',           '22222223', '3', 1, 0, 'Médico Internista',    2),
(3,  'Sergio',     'González',    '',           '22222224', '4', 1, 0, 'Médico Internista',    2),
(4,  'Andrés',     'Tigre',       '',           '18155637', '4', 1, 0, 'Médico Internista',    2),
(5,  'Francisca',  'Álvarez',     '',           '19091609', 'k', 1, 0, 'Médico Internista',    2),
(6,  'Tania',      'Bustos',      'Jorge',      '19178519', '3', 1, 0, 'Médico Internista',    2),
(7,  'Fabián',     'Díaz',        'Terrazas',   '21554320', 'k', 1, 0, 'Médico Internista',    2),
(8,  'María José', 'Espinoza',    'Tilleria',   '19184336', '3', 1, 0, 'Médico Internista',    2),
(9,  'Javier',     'González',    'Lucero',     '19127805', '4', 1, 0, 'Médico Internista',    2),
(10, 'Karla',      'Rojas',       'Toledo',     '19036885', '8', 1, 0, 'Médico Internista',    2),
(11, 'Javiera',    'Steenbecker', 'Jara',       '18211062', '0', 1, 0, 'Médico Internista',    2),
(12, 'Juan',       'Fuentes',     'Haddad',     '18461922', '9', 1, 0, 'Médico Internista',    2),
(13, 'Gonzalo',    'Hinojosa',    'Cerda',      '16875278', '4', 1, 0, 'Médico Internista',    2),
(14, 'Carlos',     'Saa',         'Chong',      '16864458', '2', 1, 0, 'Médico Internista',    2),
(15, 'Consuelo',   'Vilches',     'Alvarado',   '19646316', 'K', 1, 0, 'Médico Internista',    2),
(16, 'Constanza',  'Peña',        'Pozo',       '19644996', '5', 1, 0, 'Médico Internista',    2),
(17, 'Tomás',      'Ide',         'Guiñez',     '19594566', '7', 1, 0, 'Médico Internista',    2),
(18, 'Rocío',      'López',       'Núñez',      '19639491', '5', 1, 0, 'Médico Internista',    2),
(19, 'Antonia',    'Alliende',    'Page',       '19079052', '5', 1, 0, 'Médico Internista',    2),
(20, 'Flavia',     'Paratori',    'Slinger',    '19687654', '5', 1, 0, 'Médico Internista',    2),
-- === Enfermería ===
-- Jefatura → ADMINISTRADOR (1)
(100, 'María Elena', 'Torres',   'Pérez',     '99999999', '9', 1, 0, 'Enfermera Supervisora',  2),
-- Subrogante → ADMINISTRADOR (1)
(101, 'Ana María',   'González', 'Rojas',     '12345678', '9', 1, 0, 'Enfermera Coordinadora', 2),
-- Enfermeros/as → USUARIO (2)
(102, 'Carlos',      'Silva',    'Mendoza',   '10000001', '1', 1, 0, 'Enfermera(o)',            2),
(103, 'Patricia',    'Vargas',   'Ríos',      '10000002', '2', 1, 0, 'Enfermera(o)',            2),
(104, 'Roberto',     'Herrera',  'Díaz',      '10000003', '3', 1, 0, 'Enfermera(o)',            2),
(105, 'Fernanda',    'Castillo', 'Muñoz',     '10000004', '4', 1, 0, 'Enfermera(o)',            2),
(106, 'Miguel',      'Soto',     'Contreras', '10000005', '5', 1, 0, 'Enfermera(o)',            2),
(107, 'Cristina',    'Flores',   'Navarrete', '10000006', '6', 1, 0, 'Enfermera(o)',            2),
-- === Cirugía ===
-- Jefatura → ADMINISTRADOR (1)
(200, 'Ricardo',     'Morales',  'Vega',      '20000200', '6', 1, 0, 'Médico Cirujano',         2),
-- Subrogante → ADMINISTRADOR (1)
(201, 'Isabel',      'Parra',    'Cáceres',   '11111112', '2', 1, 0, 'Médico Cirujano',         2),
-- Médicos → USUARIO (2)
(202, 'Felipe',      'Castillo', 'Arenas',    '11111113', '3', 1, 0, 'Médico Cirujano',         2),
(203, 'Valentina',   'Ríos',     'Fuentes',   '11111114', '4', 1, 0, 'Médico Cirujano',         2),
(204, 'Sebastián',   'Muñoz',    'Lagos',     '11111115', '5', 1, 0, 'Médico Cirujano',         2),
(205, 'Camila',      'Vega',     'Soto',      '11111116', '6', 1, 0, 'Médico Cirujano',         2),
(206, 'Diego',       'Rojas',    'Mora',      '11111117', '7', 1, 0, 'Médico Cirujano',         2);

-- Urgencias (id_servicio = 4)
INSERT INTO Funcionario (ID_FUNCIONARIO, Nombre, Apel_pat, Apel_mat, Rut, DV, Estado, eliminado, Profesion, ID_ROL_SISTEMA) VALUES
-- Coordinador → JEFATURA (rol_sistema=1 ADMINISTRADOR)
(300, 'Ruben', 'Nissin', '', '30000001', '1', 1, 0, 'Médico Urgenciólogo', 1),
(301, 'Eulin', 'Klein', '', '30000002', '2', 1, 0, 'Médico Urgenciólogo', 1),
(302, 'Mauricio', 'Muñoz', '', '30000003', '3', 1, 0, 'Médico Urgenciólogo', 1),
(303, 'Eugenio', 'Donaire', '', '30000004', '4', 1, 0, 'Médico Urgenciólogo', 1),
(304, 'Mario', 'Galarce', '', '30000005', '5', 1, 0, 'Médico Urgenciólogo', 1),
(305, 'Flavio', 'Ayala', '', '30000006', '6', 1, 0, 'Médico Urgenciólogo', 2), -- Flavio: solo JEFATURA de servicio; ya NO es ADMINISTRADOR de sistema
-- Urgenciólogos y Médicos Generales → USUARIO (rol_sistema=2)
(306, 'Carolina', 'Millacura', '', '30000007', '7', 1, 0, 'Médico Urgenciólogo', 2),
(307, 'Augusto', 'Araya', '', '30000008', '8', 1, 0, 'Médico Urgenciólogo', 2),
(308, 'Miguel', 'Morales', '', '30000009', '9', 1, 0, 'Médico Urgenciólogo', 2),
(309, 'Sandra', 'Flores', '', '30000010', '0', 1, 0, 'Médico Urgenciólogo', 2),
(310, 'Macarena', 'Marín', '', '30000011', '1', 1, 0, 'Médico Urgenciólogo', 2),
(311, 'David', 'Diaz', '', '30000012', '2', 1, 0, 'Médico Urgenciólogo', 2),
(312, 'Camila', 'Alegria', '', '30000013', '3', 1, 0, 'Médico Urgenciólogo', 2),
(313, 'Nicolás', 'Benedetti', '', '30000014', '4', 1, 0, 'Médico Urgenciólogo', 2),
(314, 'Carla', 'Rey', '', '30000015', '5', 1, 0, 'Médico Urgenciólogo', 2),
(315, 'Alvaro', 'Fredricksen', '', '30000016', '6', 1, 0, 'Médico Urgenciólogo', 2),
(316, 'Marco', 'Montero', '', '30000017', '7', 1, 0, 'Médico Urgenciólogo', 2),
(317, 'Gabriela', 'Toro', '', '30000018', '8', 1, 0, 'Médico Urgenciólogo', 2),
(318, 'Catalina', 'Espinal', '', '30000019', '9', 1, 0, 'Médico Urgenciólogo', 2),
(319, 'Ricardo', 'Rojas', '', '30000020', '0', 1, 0, 'Médico Urgenciólogo', 2),
(320, 'Jose', 'Mayorga', '', '30000021', '1', 1, 0, 'Médico Urgenciólogo', 2),
(321, 'Pilar', 'Farias', '', '30000022', '2', 1, 0, 'Médico Urgenciólogo', 2),
(322, 'Antonia', 'Sanchez', '', '30000023', '3', 1, 0, 'Médico Urgenciólogo', 2),
(323, 'Rose', 'Herrera', '', '30000024', '4', 1, 0, 'Médico Urgenciólogo', 2),
(324, 'Joaquin', 'Collao', '', '30000025', '5', 1, 0, 'Médico Urgenciólogo', 2),
(325, 'Claudio', 'Ojeda', '', '30000026', '6', 1, 0, 'Médico Urgenciólogo', 2),
(326, 'Matias', 'López', '', '30000027', '7', 1, 0, 'Médico Urgenciólogo', 2),
(327, 'Grace', 'Slater', '', '30000028', '8', 1, 0, 'Médico Urgenciólogo', 2),
(328, 'Cristian', 'Gandara', '', '30000029', '9', 1, 0, 'Médico Urgenciólogo', 2),
(329, 'Catalina', 'Astudillo', '', '30000030', '0', 1, 0, 'Médico General', 2),
(330, 'Álvaro', 'Grupe', '', '30000031', '1', 1, 0, 'Médico General', 2),
(331, 'Cristina', 'Rauchfuss', '', '30000032', '2', 1, 0, 'Médico General', 2),
(332, 'Ambar', 'Zuñiga', '', '30000033', '3', 1, 0, 'Médico General', 2),
(333, 'Regina', 'Piñero', '', '30000034', '4', 1, 0, 'Médico General', 2),
(334, 'Andrés', 'Vargas', '', '30000035', '5', 1, 0, 'Médico General', 2),
(335, 'Hernán', 'Correa', '', '30000036', '6', 1, 0, 'Médico General', 2),
(336, 'Sindy', 'Lamothe', '', '30000037', '7', 1, 0, 'Médico General', 2),
(337, 'Jose', 'Molero', '', '30000038', '8', 1, 0, 'Médico General', 2),
(338, 'Ismael', 'Laing', '', '30000039', '9', 1, 0, 'Médico General', 2),
(339, 'Pedro', 'Marín', '', '30000040', '0', 1, 0, 'Médico General', 2),
(340, 'Claudia', 'Díaz', '', '30000041', '1', 1, 0, 'Médico General', 2),
(341, 'Joaquin', 'Galvez', '', '30000042', '2', 1, 0, 'Médico General', 2),
(342, 'Rolando', 'Sanchez', '', '30000043', '3', 1, 0, 'Médico General', 2),
(343, 'Paula', 'Escobar', '', '30000044', '4', 1, 0, 'Médico General', 2),
(344, 'Karla', 'Schweitzer', '', '30000045', '5', 1, 0, 'Médico General', 2),
(345, 'Tomas', 'Gatica', '', '30000046', '6', 1, 0, 'Médico General', 2),
(346, 'Andrea', 'Carroza', '', '30000047', '7', 1, 0, 'Médico General', 2),
(347, 'Fiorella', 'Alfieri', '', '30000048', '8', 1, 0, 'Médico General', 2),
(348, 'Victor', 'Linares', '', '30000049', '9', 1, 0, 'Médico General', 2),
(349, 'Johnny', 'Arias', '', '30000050', '0', 1, 0, 'Médico General', 2),
(350, 'Melanie', 'Jarpa', '', '30000051', '1', 1, 0, 'Médico General', 2),
(351, 'Camila', 'Bozan', '', '30000052', '2', 1, 0, 'Médico General', 2),
(352, 'Joanna', 'Vilchez', '', '30000053', '3', 1, 0, 'Médico General', 2),
(353, 'Tania', 'Machado', '', '30000054', '4', 1, 0, 'Médico General', 2),
(354, 'Marcela', 'Valenzuela', '', '30000055', '5', 1, 0, 'Médico General', 2),
(355, 'Maria Jose', 'Inostroza', '', '30000056', '6', 1, 0, 'Médico General', 2),
(356, 'Scarlet', 'Burgos', '', '30000057', '7', 1, 0, 'Médico General', 2),
(357, 'Carolina', 'Arcoverde', '', '30000058', '8', 1, 0, 'Médico General', 2),
(358, 'Rodrigo', 'Rios', '', '30000059', '9', 1, 0, 'Médico General', 2),
(359, 'Montserrat', 'Cunill', '', '30000060', '0', 1, 0, 'Médico General', 2),
(360, 'Belen', 'Jorquera', '', '30000061', '1', 1, 0, 'Médico General', 2),
(361, 'Camila', 'Corvalán', '', '30000062', '2', 1, 0, 'Médico General', 2),
(362, 'Domingo', 'Andreani', '', '30000063', '3', 1, 0, 'Médico General', 2),
(363, 'Macarena', 'Hipp', '', '30000064', '4', 1, 0, 'Médico General', 2),
(364, 'Alejandro', 'Núñez', '', '30000065', '5', 1, 0, 'Médico General', 2),
(365, 'Maria', 'Houston', '', '30000066', '6', 1, 0, 'Médico General', 2),
(366, 'Maria Ignacia', 'Horta', '', '30000067', '7', 1, 0, 'Médico General', 2),
(367, 'Bruno', 'Di Cosmo', '', '30000068', '8', 1, 0, 'Médico General', 2),
(368, 'Daniela', 'García', '', '30000069', '9', 1, 0, 'Médico General', 2),
(369, 'Pablo', 'Garrido', '', '30000070', '0', 1, 0, 'Médico General', 2),
(370, 'Manuel', 'Candia', '', '30000071', '1', 1, 0, 'Médico General', 2),
(371, 'Jose', 'Castañeda', '', '30000072', '2', 1, 0, 'Médico General', 2),
(372, 'Valery', 'Gallardo', '', '30000073', '3', 1, 0, 'Médico General', 2),
(373, 'Macarena', 'Briones', '', '30000074', '4', 1, 0, 'Médico General', 2),
(374, 'Diego', 'Torres', '', '30000075', '5', 1, 0, 'Médico General', 2),
(375, 'Nicolas', 'Cid', '', '30000076', '6', 1, 0, 'Médico General', 2),
(376, 'Francisco', 'Echeverria', '', '30000077', '7', 1, 0, 'Médico General', 2),
(377, 'Alvaro', 'Lopez', '', '30000078', '8', 1, 0, 'Médico General', 2),
(378, 'Alexandra', 'Metcalfe', '', '30000079', '9', 1, 0, 'Médico General', 2),
(379, 'Pailla', 'Gatiga', '', '30000080', '0', 1, 0, 'Médico General', 2);

-- ==============================================================
-- 5. SERVICIOS_FUNCIONARIO  →  tabla: Servicios_Funcionario
-- Columnas FK: ID_FUNCIONARIO, id_servicio, id_rol_servicio
-- id_rol_servicio: 1=JEFATURA  2=SUBROGANTE  3=MEDICO
-- ==============================================================
INSERT INTO Servicios_Funcionario (ID_FUNCIONARIO, id_servicio, id_rol_servicio) VALUES
-- Medicina Interna (id_servicio = 1)
(1,  1, 1),  -- Admin Bootstrap        → JEFATURA (ADMINISTRADOR: accede al resto de servicios por código, sin membresía)
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

-- Urgencias (id_servicio = 4)
INSERT INTO Servicios_Funcionario (ID_FUNCIONARIO, id_servicio, id_rol_servicio) VALUES
(300, 4, 1),
(301, 4, 1),
(302, 4, 1),
(303, 4, 1),
(304, 4, 1),
(305, 4, 1),
(306, 4, 3),
(307, 4, 3),
(308, 4, 3),
(309, 4, 3),
(310, 4, 3),
(311, 4, 3),
(312, 4, 3),
(313, 4, 3),
(314, 4, 3),
(315, 4, 3),
(316, 4, 3),
(317, 4, 3),
(318, 4, 3),
(319, 4, 3),
(320, 4, 3),
(321, 4, 3),
(322, 4, 3),
(323, 4, 3),
(324, 4, 3),
(325, 4, 3),
(326, 4, 3),
(327, 4, 3),
(328, 4, 3),
(329, 4, 3),
(330, 4, 3),
(331, 4, 3),
(332, 4, 3),
(333, 4, 3),
(334, 4, 3),
(335, 4, 3),
(336, 4, 3),
(337, 4, 3),
(338, 4, 3),
(339, 4, 3),
(340, 4, 3),
(341, 4, 3),
(342, 4, 3),
(343, 4, 3),
(344, 4, 3),
(345, 4, 3),
(346, 4, 3),
(347, 4, 3),
(348, 4, 3),
(349, 4, 3),
(350, 4, 3),
(351, 4, 3),
(352, 4, 3),
(353, 4, 3),
(354, 4, 3),
(355, 4, 3),
(356, 4, 3),
(357, 4, 3),
(358, 4, 3),
(359, 4, 3),
(360, 4, 3),
(361, 4, 3),
(362, 4, 3),
(363, 4, 3),
(364, 4, 3),
(365, 4, 3),
(366, 4, 3),
(367, 4, 3),
(368, 4, 3),
(369, 4, 3),
(370, 4, 3),
(371, 4, 3),
(372, 4, 3),
(373, 4, 3),
(374, 4, 3),
(375, 4, 3),
(376, 4, 3),
(377, 4, 3),
(378, 4, 3),
(379, 4, 3);

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

-- Urgencias (id_servicio = 4)
INSERT INTO puestos (nombre, id_servicio) VALUES
('Coordinador', 4),
('Urgenciólogo 1', 4),
('Urgenciólogo 2', 4),
('Urgenciólogo 3', 4),
('Urgenciólogo 4', 4),
('Médico General 1', 4),
('Médico General 2', 4),
('Médico General 3', 4),
('Médico General 4', 4),
('Médico General 5', 4),
('Médico General 6', 4),
('Médico General 7', 4),
('Médico General 8', 4),
('Médico General 9', 4),
('Médico General 10', 4);

-- ==============================================================
-- 7. TIPO_SOLICITUD  →  tabla: Tipo_Solicitud
-- Columnas: ID_TIPO_SOLICITUD, Tipo
-- 1=Permiso  2=Botar turno  3=Cobertura  4=Intercambio  5=Oferta Particular
-- ==============================================================
INSERT INTO Tipo_Solicitud (ID_TIPO_SOLICITUD, Tipo) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 4),
(5, 5);

-- ==============================================================
-- 8. ROTATIVA  →  tabla: rotativa
-- Columnas: id_servicio, nombre, semanas (ciclo de rotación)
-- La secuencia de días se define en rotativa_secuencia_dias.
-- ==============================================================
INSERT INTO rotativa (id_servicio, nombre, semanas) VALUES
(1, 'Plantilla Estándar - Medicina Interna', 4),  -- id auto = 1
(2, 'Plantilla Estándar - Enfermería',        4),  -- id auto = 2
(3, 'Plantilla Estándar - Cirugía',           2);  -- id auto = 3

-- Urgencias (id_servicio=4) — 6 rotativas de 6 semanas cada una
INSERT INTO rotativa (id_servicio, nombre, semanas) VALUES
(4, 'Miercoles Turno (T I)', 6),  -- id auto = 4
(4, 'Martes Turno (T II)',    6),  -- id auto = 5
(4, 'Lunes Turno (T III)',     6),  -- id auto = 6
(4, 'Viernes Turno (T IV)',   6),  -- id auto = 7
(4, 'Jueves Turno (T V)',    6),  -- id auto = 8
(4, 'Volante (T VOL)',      6);  -- id auto = 9

-- ==============================================================
-- 9. TIPO_TURNO  →  tabla: tipo_turno
-- Catálogo de tipos de turno POR SERVICIO (no por rotativa).
-- Cada tipo pertenece a un servicio; el nombre es globalmente
-- único en toda la tabla (constraint UNIQUE en columna nombre).
-- Columnas: id_servicio, hora_inicio, hora_termino, nombre
-- ==============================================================
INSERT INTO tipo_turno (id_servicio, hora_inicio, hora_termino, nombre) VALUES
-- Medicina Interna (id_servicio=1)
(1, '08:00:00', '20:00:00', 'Diurno MI'),     -- id auto = 1
(1, '20:00:00', '08:00:00', 'Nocturno MI'),   -- id auto = 2
-- Enfermería (id_servicio=2)
(2, '08:00:00', '20:00:00', 'Diurno ENF'),    -- id auto = 3
(2, '20:00:00', '08:00:00', 'Nocturno ENF'),  -- id auto = 4
-- Cirugía (id_servicio=3)
(3, '08:00:00', '20:00:00', 'Diurno CIR'),    -- id auto = 5
(3, '20:00:00', '08:00:00', 'Nocturno CIR');  -- id auto = 6

-- Urgencias (id_servicio=4) — mismos rangos horarios que Diurno/Nocturno MI
INSERT INTO tipo_turno (id_servicio, hora_inicio, hora_termino, nombre) VALUES
(4, '08:00:00', '20:00:00', 'Día'),     -- id auto = 7
(4, '20:00:00', '08:00:00', 'Noche');   -- id auto = 8

-- ==============================================================
-- 10. ROTATIVA_SECUENCIA_DIAS  →  tabla: rotativa_secuencia_dias
-- Patrón de días ordenado para cada rotativa.
-- id_tipo_turno NULL = día libre (no genera TurnoEntity).
-- Unique constraint: (id_rotativa, dia_index).
--
-- Referencia de IDs usados:
--   id_tipo_turno: 1=DiurnoMI  2=NocturnoMI
--                       3=DiurnoENF 4=NocturnoENF
--                       5=DiurnoCIR 6=NocturnoCIR
--
-- Patrones:
--   Medicina Interna (id=1, 4 sem=28 días): 2D,2N,3L × 4
--   Enfermería       (id=2, 4 sem=28 días): D,N,2L    × 7
--   Cirugía          (id=3, 2 sem=14 días): 2D,N,4L   × 2
-- ==============================================================
INSERT INTO rotativa_secuencia_dias (id_rotativa, dia_index, id_tipo_turno) VALUES
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

-- Urgencias — secuencias de 6 semanas (42 días) por rotativa.
-- id_tipo_turno: 7=Dia  8=Noche  NULL=día libre.
INSERT INTO rotativa_secuencia_dias (id_rotativa, dia_index, id_tipo_turno) VALUES
-- Rotativa 4: Miercoles Turno (T1)
(4,0,NULL),(4,1,NULL),(4,2,7),(4,3,NULL),(4,4,NULL),(4,5,8),(4,6,NULL),
(4,7,NULL),(4,8,NULL),(4,9,7),(4,10,8),(4,11,NULL),(4,12,NULL),(4,13,NULL),
(4,14,NULL),(4,15,NULL),(4,16,7),(4,17,8),(4,18,NULL),(4,19,NULL),(4,20,NULL),
(4,21,NULL),(4,22,NULL),(4,23,7),(4,24,8),(4,25,NULL),(4,26,NULL),(4,27,NULL),
(4,28,NULL),(4,29,NULL),(4,30,7),(4,31,8),(4,32,NULL),(4,33,7),(4,34,8),
(4,35,NULL),(4,36,NULL),(4,37,NULL),(4,38,NULL),(4,39,8),(4,40,NULL),(4,41,7),
-- Rotativa 5: Martes Turno (T2)
(5,0,NULL),(5,1,NULL),(5,2,NULL),(5,3,NULL),(5,4,8),(5,5,NULL),(5,6,7),
(5,7,NULL),(5,8,7),(5,9,NULL),(5,10,NULL),(5,11,NULL),(5,12,8),(5,13,NULL),
(5,14,NULL),(5,15,7),(5,16,8),(5,17,NULL),(5,18,NULL),(5,19,NULL),(5,20,NULL),
(5,21,NULL),(5,22,7),(5,23,8),(5,24,NULL),(5,25,NULL),(5,26,NULL),(5,27,NULL),
(5,28,NULL),(5,29,7),(5,30,8),(5,31,NULL),(5,32,NULL),(5,33,NULL),(5,34,NULL),
(5,35,NULL),(5,36,7),(5,37,8),(5,38,NULL),(5,39,NULL),(5,40,7),(5,41,8),
-- Rotativa 6: Lunes Turno (T3)
(6,0,7),(6,1,8),(6,2,NULL),(6,3,NULL),(6,4,NULL),(6,5,7),(6,6,8),
(6,7,NULL),(6,8,NULL),(6,9,NULL),(6,10,NULL),(6,11,8),(6,12,NULL),(6,13,7),
(6,14,7),(6,15,NULL),(6,16,NULL),(6,17,NULL),(6,18,NULL),(6,19,8),(6,20,NULL),
(6,21,7),(6,22,8),(6,23,NULL),(6,24,NULL),(6,25,NULL),(6,26,NULL),(6,27,NULL),
(6,28,7),(6,29,8),(6,30,NULL),(6,31,NULL),(6,32,NULL),(6,33,NULL),(6,34,NULL),
(6,35,7),(6,36,8),(6,37,NULL),(6,38,NULL),(6,39,NULL),(6,40,NULL),(6,41,NULL),
-- Rotativa 7: Viernes Turno (T4)
(7,0,NULL),(7,1,NULL),(7,2,8),(7,3,NULL),(7,4,7),(7,5,NULL),(7,6,NULL),
(7,7,NULL),(7,8,NULL),(7,9,8),(7,10,NULL),(7,11,7),(7,12,NULL),(7,13,NULL),
(7,14,NULL),(7,15,8),(7,16,NULL),(7,17,NULL),(7,18,7),(7,19,7),(7,20,8),
(7,21,NULL),(7,22,NULL),(7,23,NULL),(7,24,NULL),(7,25,8),(7,26,NULL),(7,27,7),
(7,28,NULL),(7,29,NULL),(7,30,NULL),(7,31,NULL),(7,32,7),(7,33,8),(7,34,NULL),
(7,35,8),(7,36,NULL),(7,37,NULL),(7,38,NULL),(7,39,7),(7,40,NULL),(7,41,NULL),
-- Rotativa 8: Jueves Turno (T5)
(8,0,8),(8,1,NULL),(8,2,NULL),(8,3,7),(8,4,NULL),(8,5,NULL),(8,6,NULL),
(8,7,8),(8,8,NULL),(8,9,NULL),(8,10,7),(8,11,NULL),(8,12,NULL),(8,13,NULL),
(8,14,8),(8,15,NULL),(8,16,NULL),(8,17,7),(8,18,NULL),(8,19,NULL),(8,20,NULL),
(8,21,8),(8,22,NULL),(8,23,NULL),(8,24,7),(8,25,NULL),(8,26,7),(8,27,8),
(8,28,NULL),(8,29,NULL),(8,30,NULL),(8,31,NULL),(8,32,8),(8,33,NULL),(8,34,7),
(8,35,NULL),(8,36,NULL),(8,37,NULL),(8,38,7),(8,39,NULL),(8,40,8),(8,41,NULL),
-- Rotativa 9: Volante (T VOL)
(9,0,NULL),(9,1,7),(9,2,NULL),(9,3,8),(9,4,NULL),(9,5,NULL),(9,6,NULL),
(9,7,7),(9,8,8),(9,9,NULL),(9,10,NULL),(9,11,NULL),(9,12,7),(9,13,8),
(9,14,NULL),(9,15,NULL),(9,16,NULL),(9,17,NULL),(9,18,8),(9,19,NULL),(9,20,7),
(9,21,NULL),(9,22,NULL),(9,23,NULL),(9,24,NULL),(9,25,7),(9,26,8),(9,27,NULL),
(9,28,8),(9,29,NULL),(9,30,NULL),(9,31,7),(9,32,NULL),(9,33,NULL),(9,34,NULL),
(9,35,NULL),(9,36,NULL),(9,37,7),(9,38,8),(9,39,NULL),(9,40,NULL),(9,41,NULL);

-- ==============================================================
-- 10b. REGLAS_HORARIOS_TURNOS_SERVICIO  →  tabla: reglas_horarios_turnos_servicio
-- Urgencias (id_servicio = 4). id_tipo_turno_inicio=7(Dia) id_tipo_turno_fin=8(Noche).
-- ==============================================================
INSERT INTO reglas_horarios_turnos_servicio
    (nombre, id_servicio, eliminado, aplica_fin_de_semana, aplica_feriado, id_tipo_turno_inicio, id_tipo_turno_fin, tiempo_minutos)
VALUES
    ('Regla urgencias', 4, 0, 1, 1, 7, 8, 60);

-- ==============================================================
-- 10c. PLANIFICACION  →  tabla: planificacion
-- Molde de rotativas de Urgencias (id_servicio = 4). Sin asignaciones aún
-- (planificacion_asignacion queda para cuando se definan los funcionarios).
-- ==============================================================
INSERT INTO planificacion (nombre, id_servicio) VALUES
('Rotativa 2026', 4);

-- Urgencias — asignaciones de "Rotativa 2026" (id_planificacion = 1)
INSERT INTO planificacion_asignacion (id_planificacion, id_rotativa, id_funcionario, id_puesto) VALUES
(1, 6, 300, 17), (1, 5, 301, 17), (1, 4, 302, 17), (1, 8, 303, 17), (1, 7, 304, 17), (1, 9, 305, 17),  -- Coordinador
(1, 6, 306, 18), (1, 5, 307, 18), (1, 4, 308, 18), (1, 8, 309, 18), (1, 7, 310, 18), (1, 9, 311, 18),  -- Urgenciólogo 1
(1, 6, 312, 19), (1, 5, 313, 19), (1, 4, 314, 19), (1, 8, 315, 19), (1, 7, 316, 19), (1, 9, 317, 19),  -- Urgenciólogo 2
(1, 6, 318, 20), (1, 5, 319, 20), (1, 4, 320, 20), (1, 8, 321, 20), (1, 7, 322, 20), (1, 9, 323, 20),  -- Urgenciólogo 3
(1, 6, 324, 21), (1, 5, 325, 21), (1, 4, NULL, 21), (1, 8, 326, 21), (1, 7, 327, 21), (1, 9, 328, 21),  -- Urgenciólogo 4
(1, 6, 329, 22), (1, 5, 330, 22), (1, 4, 331, 22), (1, 8, 332, 22), (1, 7, 333, 22), (1, 9, 334, 22),  -- Médico General 1
(1, 6, 335, 23), (1, 5, 336, 23), (1, 4, 337, 23), (1, 8, 338, 23), (1, 7, 339, 23), (1, 9, 340, 23),  -- Médico General 2
(1, 6, 341, 24), (1, 5, 342, 24), (1, 4, 343, 24), (1, 8, 344, 24), (1, 7, 345, 24), (1, 9, 346, 24),  -- Médico General 3
(1, 6, 347, 25), (1, 5, 348, 25), (1, 4, 349, 25), (1, 8, 350, 25), (1, 7, 351, 25), (1, 9, 352, 25),  -- Médico General 4
(1, 6, 353, 26), (1, 5, 354, 26), (1, 4, 355, 26), (1, 8, 356, 26), (1, 7, 357, 26), (1, 9, 358, 26),  -- Médico General 5
(1, 6, 359, 27), (1, 5, 360, 27), (1, 4, 361, 27), (1, 8, 362, 27), (1, 7, 363, 27), (1, 9, 364, 27),  -- Médico General 6
(1, 6, 365, 28), (1, 5, 333, 28), (1, 4, 366, 28), (1, 8, 367, 28), (1, 7, 368, 28), (1, 9, 369, 28),  -- Médico General 7
(1, 6, 370, 29), (1, 5, 371, 29), (1, 4, 372, 29), (1, 8, 373, 29), (1, 7, 354, 29), (1, 9, NULL, 29),  -- Médico General 8
(1, 6, 374, 30), (1, 5, 339, 30), (1, 4, 339, 30), (1, 8, 375, 30), (1, 7, 358, 30), (1, 9, 376, 30),  -- Médico General 9
(1, 6, 377, 31), (1, 5, 337, 31), (1, 4, NULL, 31), (1, 8, 378, 31), (1, 7, 379, 31), (1, 9, NULL, 31);  -- Médico General 10

-- ==============================================================
-- 11. TURNOS  →  tabla: Turnos
-- Turnos concretos para mayo 2026, generados desde rotativa.
-- Puestos (auto-increment tras TRUNCATE+INSERT ordenado):
--   1=Sala Hombres(MI)  2=Sala Mujeres(MI)  3=Pabellón(MI)
--   4=Puesto A(ENF)      5=Puesto B(ENF)
--   6=Pabellón Central(CIR) 7=Recuperación(CIR) 8=Pre-Quirúrgico(CIR)
-- ID_FUNCIONARIO NULL = turno libre disponible para cobertura.
-- ==============================================================
INSERT INTO Turnos (id_turno, dia_inicio_turno, dia_final_turno, hora_inicio, hora_fin, ID_FUNCIONARIO, id_servicio, id_puesto, id_rotativa, id_tipo_turno) VALUES
-- === Medicina Interna (id_servicio=1, id_rotativa=1) ===
(1,  '2026-05-05', '2026-05-05', '08:00:00', '20:00:00',  2,    1, 1, 1, 1),
(2,  '2026-05-06', '2026-05-06', '08:00:00', '20:00:00',  3,    1, 2, 1, 1),
(3,  '2026-05-07', '2026-05-07', '08:00:00', '20:00:00',  4,    1, 1, 1, 1),
(4,  '2026-05-08', '2026-05-08', '08:00:00', '20:00:00',  5,    1, 2, 1, 1),
(5,  '2026-05-09', '2026-05-09', '08:00:00', '20:00:00',  6,    1, 3, 1, 1),
(6,  '2026-05-12', '2026-05-12', '08:00:00', '20:00:00',  7,    1, 1, 1, 1),
(7,  '2026-05-13', '2026-05-13', '08:00:00', '20:00:00',  8,    1, 2, 1, 1),
(8,  '2026-05-14', '2026-05-14', '08:00:00', '20:00:00',  9,    1, 3, 1, 1),
(9,  '2026-05-05', '2026-05-06', '20:00:00', '08:00:00', 10,    1, 3, 1, 2),
(10, '2026-05-07', '2026-05-08', '20:00:00', '08:00:00', 11,    1, 1, 1, 2),
(11, '2026-05-12', '2026-05-13', '20:00:00', '08:00:00', 12,    1, 2, 1, 2),
(12, '2026-05-15', '2026-05-15', '08:00:00', '20:00:00', 13,    1, 1, 1, 1),
(13, '2026-05-16', '2026-05-16', '08:00:00', '20:00:00', 14,    1, 2, 1, 1),
(14, '2026-05-19', '2026-05-19', '08:00:00', '20:00:00', 15,    1, 3, 1, 1),
(15, '2026-05-20', '2026-05-20', '08:00:00', '20:00:00', 16,    1, 1, 1, 1),
(16, '2026-05-22', '2026-05-22', '08:00:00', '20:00:00', NULL,  1, 2, 1, 1),
(17, '2026-05-19', '2026-05-20', '20:00:00', '08:00:00', NULL,  1, 3, 1, 2),
-- === Enfermería (id_servicio=2, id_rotativa=2) ===
(18, '2026-05-05', '2026-05-05', '08:00:00', '20:00:00', 102,   2, 4, 2, 3),
(19, '2026-05-06', '2026-05-06', '08:00:00', '20:00:00', 103,   2, 5, 2, 3),
(20, '2026-05-05', '2026-05-06', '20:00:00', '08:00:00', 104,   2, 4, 2, 4),
(21, '2026-05-07', '2026-05-07', '08:00:00', '20:00:00', 105,   2, 5, 2, 3),
(22, '2026-05-08', '2026-05-08', '08:00:00', '20:00:00', 106,   2, 4, 2, 3),
(23, '2026-05-07', '2026-05-08', '20:00:00', '08:00:00', 107,   2, 5, 2, 4),
(24, '2026-05-12', '2026-05-12', '08:00:00', '20:00:00', 102,   2, 4, 2, 3),
(25, '2026-05-13', '2026-05-13', '08:00:00', '20:00:00', 103,   2, 5, 2, 3),
(26, '2026-05-20', '2026-05-20', '08:00:00', '20:00:00', NULL,  2, 4, 2, 3),
-- === Cirugía (id_servicio=3, id_rotativa=3) ===
(27, '2026-05-05', '2026-05-05', '08:00:00', '20:00:00', 202,   3, 6, 3, 5),
(28, '2026-05-06', '2026-05-06', '08:00:00', '20:00:00', 203,   3, 7, 3, 5),
(29, '2026-05-07', '2026-05-07', '08:00:00', '20:00:00', 204,   3, 8, 3, 5),
(30, '2026-05-05', '2026-05-06', '20:00:00', '08:00:00', 205,   3, 6, 3, 6),
(31, '2026-05-08', '2026-05-08', '08:00:00', '20:00:00', 206,   3, 7, 3, 5),
(32, '2026-05-12', '2026-05-12', '08:00:00', '20:00:00', 202,   3, 8, 3, 5),
(33, '2026-05-13', '2026-05-13', '08:00:00', '20:00:00', 203,   3, 6, 3, 5),
(34, '2026-05-12', '2026-05-13', '20:00:00', '08:00:00', 204,   3, 7, 3, 6),
(35, '2026-05-21', '2026-05-21', '08:00:00', '20:00:00', NULL,  3, 8, 3, 5);

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
-- 13. NOTIFICACION  →  tabla: Notificacion
-- ID_SOLICITUD es @OneToOne → un registro por solicitud.
-- ==============================================================
INSERT INTO Notificacion (ID_NOTIFICACION, Estado, Fecha_envio, Mensaje, ID_SOLICITUD) VALUES
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
-- DEMO: Turnos de Admin Bootstrap (ID_FUNCIONARIO=1) + relleno mayo
-- ==============================================================
INSERT INTO Turnos (id_turno, dia_inicio_turno, dia_final_turno, hora_inicio, hora_fin, ID_FUNCIONARIO, id_servicio, id_puesto, id_rotativa, id_tipo_turno) VALUES
-- Admin Bootstrap – 10 turnos distribuidos en mayo 2026
(36, '2026-05-05', '2026-05-05', '08:00:00', '20:00:00',  1, 1, 3, 1, 1),
(37, '2026-05-06', '2026-05-07', '20:00:00', '08:00:00',  1, 1, 1, 1, 2),
(38, '2026-05-09', '2026-05-09', '08:00:00', '20:00:00',  1, 1, 2, 1, 1),
(39, '2026-05-13', '2026-05-14', '20:00:00', '08:00:00',  1, 1, 3, 1, 2),
(40, '2026-05-15', '2026-05-15', '08:00:00', '20:00:00',  1, 1, 1, 1, 1),
(41, '2026-05-19', '2026-05-20', '20:00:00', '08:00:00',  1, 1, 2, 1, 2),
(42, '2026-05-21', '2026-05-21', '08:00:00', '20:00:00',  1, 1, 3, 1, 1),
(43, '2026-05-23', '2026-05-23', '08:00:00', '20:00:00',  1, 1, 1, 1, 1),
(44, '2026-05-26', '2026-05-27', '20:00:00', '08:00:00',  1, 1, 2, 1, 2),
(45, '2026-05-29', '2026-05-29', '08:00:00', '20:00:00',  1, 1, 3, 1, 1),
-- Turnos libres adicionales Medicina Interna
(46, '2026-05-24', '2026-05-24', '08:00:00', '20:00:00', NULL, 1, 1, 1, 1),
(47, '2026-05-27', '2026-05-28', '20:00:00', '08:00:00', NULL, 1, 2, 1, 2),
-- Turnos resto de equipo – última quincena de mayo
(48, '2026-05-21', '2026-05-21', '08:00:00', '20:00:00', 17, 1, 1, 1, 1),
(49, '2026-05-22', '2026-05-22', '08:00:00', '20:00:00', 18, 1, 2, 1, 1),
(50, '2026-05-22', '2026-05-23', '20:00:00', '08:00:00', 19, 1, 3, 1, 2),
(51, '2026-05-26', '2026-05-26', '08:00:00', '20:00:00', 20, 1, 1, 1, 1),
(52, '2026-05-23', '2026-05-24', '20:00:00', '08:00:00',  2, 1, 3, 1, 2),
(53, '2026-05-27', '2026-05-27', '08:00:00', '20:00:00',  3, 1, 2, 1, 1),
(54, '2026-05-28', '2026-05-28', '08:00:00', '20:00:00',  4, 1, 1, 1, 1),
(55, '2026-05-28', '2026-05-29', '20:00:00', '08:00:00',  5, 1, 3, 1, 2);

-- ==============================================================
-- DEMO: Solicitudes adicionales (IDs 5-12)
-- Tipo: 1=Permiso  2=Botar turno  3=Cobertura  4=Intercambio
-- ==============================================================
INSERT INTO Solicitudes (ID_SOLICITUD, ID_FUNCIONARIO, ID_TIPO_SOLICITUD, ID_TURNO, ID_TURNO_RECEPTOR, ID_FUNCIONARIO_RECEPTOR, Aceptado_Receptor, Estado, Fecha_creacion, Fecha_inicio_permiso, Fecha_termino_permiso, Motivo) VALUES
-- (5) Admin pide permiso para su propio turno 36 (05-May diurno) — PENDIENTE
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
-- (8) Andrés Tigre (func 4) propone intercambio: ofrece turno 3 (07-May) por turno 40 (Admin, 15-May); Admin aceptó — PENDIENTE jefatura
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
-- (12) María José Espinoza (func 8) propone intercambio: ofrece turno 7 (13-May) por turno 43 (Admin, 23-May); Admin aún no responde — PENDIENTE
(12, 8, 4, 7, 43, 1, NULL, 'PENDIENTE',
 '2026-05-12 17:30:00', NULL, NULL,
 'Me conviene más el turno del 23-May, ofrezco mi turno del 13-May');

-- ==============================================================
-- DEMO: Notificaciones adicionales (IDs 5-12)
-- ==============================================================
INSERT INTO Notificacion (ID_NOTIFICACION, Estado, Fecha_envio, Mensaje, ID_SOLICITUD) VALUES
(5, 'NO_LEIDA', '2026-05-02 08:30:01',
 'Su solicitud de permiso para el 05-May (Congreso SOCHINMI) ha sido recibida y está pendiente de aprobación.', 5),
(6, 'NO_LEIDA', '2026-05-03 11:00:01',
 'Su solicitud de permiso para el 06-May ha sido recibida y está pendiente de aprobación.', 6),
(7, 'NO_LEIDA', '2026-05-10 16:00:01',
 'Su solicitud para liberar el turno del 14-May ha sido recibida y está en revisión.', 7),
(8, 'NO_LEIDA', '2026-05-05 09:00:01',
 'El funcionario receptor (Admin Bootstrap) ha aceptado el intercambio de turnos. Pendiente de aprobación por jefatura.', 8),
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
 'Admin Bootstrap — turno diurno 05-May (id=36), Pabellón MI. Solicita permiso como jefe de servicio.',
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
 'Func 4 (Andrés Tigre) ↔ Func 1 (Admin Bootstrap): turno 07-May ↔ turno 15-May. Pendiente aprobación jefatura.',
 '2026-05-05 09:30:00', NULL, '2026-05-05 09:30:00', TRUE),
(9, 7,  NULL, 9,  'SOLICITUD_CREADA',
 'Solicitud cobertura voluntaria',
 'Fabián Díaz — turno libre diurno 24-May (id=46), Sala Hombres MI. Se postula para cubrir.',
 '2026-05-20 10:30:00', NULL, '2026-05-20 10:30:00', TRUE),
(10, 1, NULL, 10, 'CAMBIO_ESTADO_APROBADA',
 'Permiso aprobado por jefatura',
 'Tomás Ide — turno diurno 21-May (id=48). Aprobado por Admin Bootstrap.',
 '2026-05-14 15:00:00', '2026-05-21 20:00:00', '2026-05-14 15:00:00', TRUE),
(11, 1, NULL, 11, 'CAMBIO_ESTADO_RECHAZADA',
 'Cobertura rechazada por jefatura',
 'Karla Rojas — turno libre nocturno 27-May (id=47). Rechazado: cobertura ya asignada internamente.',
 '2026-05-22 10:00:00', NULL, '2026-05-22 10:00:00', TRUE),
(12, 8, NULL, 12, 'SOLICITUD_CREADA',
 'Propuesta de intercambio enviada a Admin Bootstrap',
 'María José Espinoza ofrece turno 13-May (id=7) por turno 23-May de Admin (id=43). Pendiente respuesta receptor.',
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
--   tipo_turno CIR: 5=Diurno CIR  6=Nocturno CIR · puestos CIR: 6,7,8
-- ==============================================================
INSERT INTO Turnos (id_turno, dia_inicio_turno, dia_final_turno, hora_inicio, hora_fin, ID_FUNCIONARIO, id_servicio, id_puesto, id_rotativa, id_tipo_turno) VALUES
(56, '2026-06-01', '2026-06-01', '08:00:00', '20:00:00',   2, 3, 6, 3, 5),  -- Fernando, Cirugía → choca con MI-gen Jun 1 diurno
(57, '2026-06-02', '2026-06-02', '08:00:00', '20:00:00',   3, 3, 7, 3, 5),  -- Sergio,   Cirugía → choca con MI-gen Jun 2 diurno
(58, '2026-06-03', '2026-06-04', '20:00:00', '08:00:00',   4, 3, 8, 3, 6),  -- Andrés,   Cirugía → choca con MI-gen Jun 3 nocturno
(59, '2026-06-02', '2026-06-02', '08:00:00', '20:00:00', 202, 1, 1, 1, 1);  -- Felipe (CIR) en MI → choca con un molde de Cirugía generado desde Jun 1

-- ==============================================================
-- 17. TURNOS DE HOY (05-06-2026) — datos para "hoy" en cada servicio
-- Viernes 05-Jun-2026. Mezcla de asignados y libres, sin conflictos
-- (ninguna persona queda con dos turnos solapados ese día).
-- ==============================================================
INSERT INTO Turnos (id_turno, dia_inicio_turno, dia_final_turno, hora_inicio, hora_fin, ID_FUNCIONARIO, id_servicio, id_puesto, id_rotativa, id_tipo_turno) VALUES
-- Medicina Interna (servicio 1)
(60, '2026-06-05', '2026-06-05', '08:00:00', '20:00:00',   1, 1, 3, 1, 1),  -- Admin Bootstrap
(61, '2026-06-05', '2026-06-05', '08:00:00', '20:00:00',   6, 1, 1, 1, 1),  -- Tania Bustos
(62, '2026-06-05', '2026-06-06', '20:00:00', '08:00:00',   7, 1, 2, 1, 2),  -- Fabián Díaz
(63, '2026-06-05', '2026-06-05', '08:00:00', '20:00:00', NULL, 1, 2, 1, 1),  -- libre
-- Enfermería (servicio 2)
(64, '2026-06-05', '2026-06-05', '08:00:00', '20:00:00', 102, 2, 4, 2, 3),  -- Carlos Silva
(65, '2026-06-05', '2026-06-06', '20:00:00', '08:00:00', 104, 2, 5, 2, 4),  -- Roberto Herrera
(66, '2026-06-05', '2026-06-05', '08:00:00', '20:00:00', NULL, 2, 4, 2, 3),  -- libre
-- Cirugía (servicio 3)
(67, '2026-06-05', '2026-06-05', '08:00:00', '20:00:00', 205, 3, 6, 3, 5),  -- Camila Vega
(68, '2026-06-05', '2026-06-06', '20:00:00', '08:00:00', 206, 3, 7, 3, 6),  -- Diego Rojas
(69, '2026-06-05', '2026-06-05', '08:00:00', '20:00:00', NULL, 3, 8, 3, 5);  -- libre

-- ==============================================================
-- 18. TURNOS — URGENCIAS (servicio 4)
-- Lunes 04-May-2026: Dia=roster "Lunes Turno T III", Noche=roster "Volante".
-- Miercoles 06-May-2026 y Martes 05-May-2026: subconjunto de puestos.
-- Los 2 vacantes de Miercoles (puesto 21 y 31) ya eran huecos reales en
-- planificacion_asignacion (columna rotativa 4); los 2 vacantes de Lunes Noche
-- (puesto 29 y 31) son huecos reales del roster "Volante" (rotativa 9).
-- ID_FUNCIONARIO NULL = turno libre disponible para cobertura.
-- ==============================================================
INSERT INTO Turnos (id_turno, dia_inicio_turno, dia_final_turno, hora_inicio, hora_fin, ID_FUNCIONARIO, id_servicio, id_puesto, id_rotativa, id_tipo_turno) VALUES
(70, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 300, 4, 17, 6, 7),  -- Lunes Dia — Coordinador
(71, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 306, 4, 18, 6, 7),  -- Lunes Dia — Urgenciólogo 1
(72, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 312, 4, 19, 6, 7),  -- Lunes Dia — Urgenciólogo 2
(73, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 318, 4, 20, 6, 7),  -- Lunes Dia — Urgenciólogo 3
(74, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 324, 4, 21, 6, 7),  -- Lunes Dia — Urgenciólogo 4
(75, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 329, 4, 22, 6, 7),  -- Lunes Dia — Médico General 1
(76, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 335, 4, 23, 6, 7),  -- Lunes Dia — Médico General 2
(77, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 341, 4, 24, 6, 7),  -- Lunes Dia — Médico General 3
(78, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 347, 4, 25, 6, 7),  -- Lunes Dia — Médico General 4
(79, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 353, 4, 26, 6, 7),  -- Lunes Dia — Médico General 5
(80, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 359, 4, 27, 6, 7),  -- Lunes Dia — Médico General 6
(81, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 360, 4, 28, 6, 7),  -- Lunes Dia — Médico General 7
(82, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 370, 4, 29, 6, 7),  -- Lunes Dia — Médico General 8
(83, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 374, 4, 30, 6, 7),  -- Lunes Dia — Médico General 9
(84, '2026-05-04', '2026-05-04', '08:00:00', '20:00:00', 377, 4, 31, 6, 7),  -- Lunes Dia — Médico General 10
(85, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', 305, 4, 17, 9, 8),  -- Lunes Noche (Volante) — Coordinador
(86, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', 311, 4, 18, 9, 8),  -- Lunes Noche (Volante) — Urgenciólogo 1
(87, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', 317, 4, 19, 9, 8),  -- Lunes Noche (Volante) — Urgenciólogo 2
(88, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', 323, 4, 20, 9, 8),  -- Lunes Noche (Volante) — Urgenciólogo 3
(89, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', 328, 4, 21, 9, 8),  -- Lunes Noche (Volante) — Urgenciólogo 4
(90, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', 334, 4, 22, 9, 8),  -- Lunes Noche (Volante) — Médico General 1
(91, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', 340, 4, 23, 9, 8),  -- Lunes Noche (Volante) — Médico General 2
(92, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', 346, 4, 24, 9, 8),  -- Lunes Noche (Volante) — Médico General 3
(93, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', 352, 4, 25, 9, 8),  -- Lunes Noche (Volante) — Médico General 4
(94, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', 358, 4, 26, 9, 8),  -- Lunes Noche (Volante) — Médico General 5
(95, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', 364, 4, 27, 9, 8),  -- Lunes Noche (Volante) — Médico General 6
(96, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', 369, 4, 28, 9, 8),  -- Lunes Noche (Volante) — Médico General 7
(97, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', NULL, 4, 29, 9, 8),  -- Lunes Noche (Volante) — Médico General 8
(98, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', 376, 4, 30, 9, 8),  -- Lunes Noche (Volante) — Médico General 9
(99, '2026-05-04', '2026-05-05', '20:00:00', '08:00:00', NULL, 4, 31, 9, 8),  -- Lunes Noche (Volante) — Médico General 10
(100, '2026-05-06', '2026-05-06', '08:00:00', '20:00:00', 302, 4, 17, 4, 7),  -- Miercoles Dia — Coordinador
(101, '2026-05-06', '2026-05-06', '08:00:00', '20:00:00', 320, 4, 20, 4, 7),  -- Miercoles Dia — Urgenciólogo 3
(102, '2026-05-06', '2026-05-06', '08:00:00', '20:00:00', NULL, 4, 21, 4, 7),  -- Miercoles Dia — Urgenciólogo 4
(103, '2026-05-06', '2026-05-06', '08:00:00', '20:00:00', 331, 4, 22, 4, 7),  -- Miercoles Dia — Médico General 1
(104, '2026-05-06', '2026-05-06', '08:00:00', '20:00:00', 366, 4, 28, 4, 7),  -- Miercoles Dia — Médico General 7
(105, '2026-05-06', '2026-05-06', '08:00:00', '20:00:00', 339, 4, 30, 4, 7),  -- Miercoles Dia — Médico General 9
(106, '2026-05-06', '2026-05-06', '08:00:00', '20:00:00', NULL, 4, 31, 4, 7),  -- Miercoles Dia — Médico General 10
(107, '2026-05-05', '2026-05-05', '08:00:00', '20:00:00', 307, 4, 18, 5, 7),  -- Martes Dia — Urgenciólogo 1
(108, '2026-05-05', '2026-05-05', '08:00:00', '20:00:00', 313, 4, 19, 5, 7),  -- Martes Dia — Urgenciólogo 2
(109, '2026-05-05', '2026-05-05', '08:00:00', '20:00:00', 336, 4, 23, 5, 7),  -- Martes Dia — Médico General 2
(110, '2026-05-05', '2026-05-05', '08:00:00', '20:00:00', 348, 4, 25, 5, 7),  -- Martes Dia — Médico General 4
(111, '2026-05-05', '2026-05-05', '08:00:00', '20:00:00', 371, 4, 29, 5, 7);  -- Martes Dia — Médico General 8

-- ==============================================================
-- 19. SOLICITUDES — URGENCIAS
-- Tipo: 1=Permiso  2=Botar turno  3=Cobertura  4=Intercambio  5=Oferta particular
-- ==============================================================
INSERT INTO Solicitudes (ID_SOLICITUD, ID_FUNCIONARIO, ID_TIPO_SOLICITUD, ID_TURNO, ID_TURNO_RECEPTOR, ID_FUNCIONARIO_RECEPTOR, Aceptado_Receptor, Estado, Fecha_creacion, Fecha_inicio_permiso, Fecha_termino_permiso, Motivo) VALUES
(13, 300, 1, 70, NULL, NULL, NULL, 'PENDIENTE',
 '2026-04-30 09:00:00', '2026-05-04 08:00:00', '2026-05-04 20:00:00',
 'Control médico preventivo'),
(14, 311, 2, 86, NULL, NULL, NULL, 'APROBADA',
 '2026-04-25 10:00:00', NULL, NULL,
 'Acumulación de horas extra'),
(15, 359, 3, 102, NULL, NULL, NULL, 'PENDIENTE',
 '2026-05-01 11:00:00', NULL, NULL,
 'Disponible para cubrir el turno vacante del miércoles (Urgenciólogo 4)'),
(16, 312, 4, 72, 73, 318, TRUE, 'PENDIENTE',
 '2026-05-02 09:30:00', NULL, NULL,
 'Prefiero el puesto de Urgenciólogo 3 por cercanía con mi área de especialidad'),
(17, 307, 5, 107, 108, 313, TRUE, 'APROBADA',
 '2026-04-27 14:00:00', NULL, NULL,
 'Prefiero el puesto de Urgenciólogo 2, ya conversado con el receptor'),
(18, 336, 5, 109, 110, 348, FALSE, 'RECHAZADA',
 '2026-04-29 16:00:00', NULL, NULL,
 'Buscaba cambiar de puesto por comodidad de horario');

-- ==============================================================
-- 20. NOTIFICACION — URGENCIAS (una por solicitud, ID_SOLICITUD OneToOne)
-- ==============================================================
INSERT INTO Notificacion (ID_NOTIFICACION, Estado, Fecha_envio, Mensaje, ID_SOLICITUD) VALUES
(13, 'NO_LEIDO', '2026-04-30 09:01:00',
 'Su solicitud de permiso para el 04-May ha sido recibida y está pendiente de aprobación.', 13),
(14, 'LEIDO', '2026-04-25 10:01:00',
 'Su solicitud de botar turno del 04-May (noche) ha sido aprobada.', 14),
(15, 'NO_LEIDO', '2026-05-01 11:01:00',
 'Su solicitud de cobertura del turno vacante del 06-May ha sido recibida.', 15),
(16, 'NO_LEIDO', '2026-05-02 09:30:01',
 'El funcionario receptor ha aceptado el intercambio. Pendiente de aprobación por jefatura.', 16),
(17, 'LEIDO', '2026-04-27 14:01:00',
 'Su oferta de intercambio de turno ha sido aprobada por jefatura.', 17),
(18, 'LEIDO', '2026-04-29 16:01:00',
 'Su oferta de intercambio de turno ha sido rechazada por el receptor.', 18);

-- ==============================================================
-- 21. BITACORA_EVENTOS — URGENCIAS (una por solicitud, ID_TURNO NULL)
-- ==============================================================
INSERT INTO Bitacora_eventos (ID_EVENTO, ID_FUNCIONARIO, ID_TURNO, ID_SOLICITUD, Tipo_evento, Motivo, Observaciones, Fecha_inicio_afectada, Fecha_fin_afectada, Fecha_modificacion, Activo) VALUES
(13, 300, NULL, 13, 'SOLICITUD_CREADA',
 'Control médico preventivo',
 'Turno diurno 04-May (id=70), Coordinador.',
 '2026-04-30 09:00:00', NULL, '2026-04-30 09:00:00', TRUE),
(14, 311, NULL, 14, 'CAMBIO_ESTADO_APROBADA',
 'Acumulación de horas extra',
 'Turno nocturno 04-May (id=86), Urgenciólogo 1. Turno queda disponible para cobertura.',
 '2026-04-25 10:00:00', NULL, '2026-04-25 10:00:00', TRUE),
(15, 359, NULL, 15, 'SOLICITUD_CREADA',
 'Disponible para cubrir el turno vacante del miércoles (Urgenciólogo 4)',
 'Turno diurno 06-May (id=102), Urgenciólogo 4 — sin asignar.',
 '2026-05-01 11:00:00', NULL, '2026-05-01 11:00:00', TRUE),
(16, 312, NULL, 16, 'OFERTA_ACEPTADA_POR_RECEPTOR',
 'Prefiero el puesto de Urgenciólogo 3 por cercanía con mi área de especialidad',
 'Func 312 <-> Func 318: turno 04-May puesto Urg.2 <-> puesto Urg.3. Pendiente jefatura.',
 '2026-05-02 09:30:00', NULL, '2026-05-02 09:30:00', TRUE),
(17, 307, NULL, 17, 'CAMBIO_ESTADO_APROBADA',
 'Prefiero el puesto de Urgenciólogo 2, ya conversado con el receptor',
 'Func 307 <-> Func 313 (via receptor): turno 05-May puesto Urg.1 <-> puesto Urg.2. Aprobado.',
 '2026-04-27 14:00:00', NULL, '2026-04-27 14:00:00', TRUE),
(18, 336, NULL, 18, 'CAMBIO_ESTADO_RECHAZADA',
 'Buscaba cambiar de puesto por comodidad de horario',
 'Func 336 ofrece turno 05-May (puesto Medico General 2) a Func 348 (puesto Medico General 4). Rechazado.',
 '2026-04-29 16:00:00', NULL, '2026-04-29 16:00:00', TRUE);

-- ==============================================================
-- 22. OFERTA_GENERAL + POSTULACION_OFERTA — URGENCIAS (primer ejemplo del sistema)
-- ==============================================================
INSERT INTO Oferta_General (ID_OFERTA_GENERAL, ID_TURNO, ID_OFERTOR, Estado, Motivo, Fecha_creacion) VALUES
(1, 77, 341, 'ABIERTA', 'Cambio de turno por estudios de posgrado', '2026-04-26 09:00:00'),
(2, 81, 365, 'CERRADA', 'Cambio de turno por compromiso familiar', '2026-04-20 10:00:00'),
(3, 70, 300, 'RECHAZADA', 'Jefatura rechaza: el puesto de Coordinador no puede ofertarse públicamente', '2026-04-24 08:00:00');

INSERT INTO Postulacion_Oferta (ID_POSTULACION, ID_OFERTA_GENERAL, ID_POSTULANTE, Fecha_postulacion, Seleccionado) VALUES
(1, 1, 348, '2026-04-26 15:00:00', FALSE),
(2, 1, 352, '2026-04-27 08:30:00', FALSE),
(3, 2, 360, '2026-04-21 09:00:00', TRUE),
(4, 2, 367, '2026-04-21 11:00:00', FALSE);

SET FOREIGN_KEY_CHECKS = 1;
