-- innhosp · 01 · ESQUEMA (crea la base, tablas de personal y la vista viewPersonal)
CREATE DATABASE IF NOT EXISTS innhosp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ==============================================================
-- SETUP PERSONAL AUXILIAR - innhosp (modo desarrollo)
-- ==============================================================
-- Propósito:
--   Crea en innhosp las tablas de catálogos del hospital
--   (conf_estados, conf_tipocargo, conf_tipocontrato,
--   conf_tipofuncionario, servicio) y la tabla personalAux,
--   luego crea la vista viewPersonal apuntando a personalAux.
--
-- Cuándo usar:
--   Solo en desarrollo cuando NO tienes acceso a la base
--   innhosp de producción. Si tienes acceso a innhosp real,
--   usa archivos_marcelo/create_view_personal.sql (Opción A)
--   directamente.
--
-- Cuándo NO usar:
--   En producción. Ahí la vista debe apuntar a innhosp.personal
--   mediante la Opción A de create_view_personal.sql.
--
-- Orden de ejecución:
--   Este script ya respeta el orden correcto de dependencias:
--   conf_* → servicio → personalAux → viewPersonal
--
-- Ejecución:
--   mysql -u root -p < BaseDatosMySQL/setup_personal_aux.sql
--
-- NOTA: personalAux se crea vacía. Para poblarla con datos reales
--   del hospital, solicitar a TI un dump de innhosp.personal
--   y cargarlo aquí antes de crear la vista.
-- ==============================================================

USE innhosp;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==============================================================
-- 1. CONF_ESTADOS
-- Fuente: archivos_marcelo/conf_estados.sql
-- Estados posibles de un funcionario en el sistema.
-- ==============================================================
DROP TABLE IF EXISTS `conf_estados`;
CREATE TABLE `conf_estados` (
  `id_estado`  int          NOT NULL AUTO_INCREMENT,
  `nombre`     varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `date_added` datetime     NULL DEFAULT NULL,
  `modified`   timestamp    NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `estado`     tinyint(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_estado`)
) ENGINE = InnoDB AUTO_INCREMENT = 12
  CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

INSERT INTO `conf_estados` VALUES
(1,  'Activo',                          '2022-03-23 11:54:32', '2025-07-15 10:00:14', 1),
(2,  'Temporal',                        '2022-03-23 11:55:57', '2022-03-23 08:55:59', 1),
(3,  'Vencido',                         '2022-03-23 11:55:59', '2022-03-23 08:56:01', 1),
(4,  'Nulo',                            '2022-03-23 11:56:02', '2022-03-23 08:56:04', 1),
(5,  'No Activo',                       '2022-03-23 11:55:55', '2022-03-24 06:10:59', 1),
(6,  'Termino Anticipado / Desvinculado','2023-07-03 12:53:07', '2025-10-20 12:01:30', 1),
(7,  'Renunciado',                      '2023-07-03 12:53:13', NULL,                  1),
(8,  'Sin Renovacion',                  '2023-10-02 16:15:43', '2025-10-20 12:02:48', 1),
(9,  'Banned',                          '2023-10-10 16:44:30', NULL,                  1),
(10, 'Traspaso a contrata',             '2023-10-11 17:40:06', NULL,                  1),
(11, 'Notificada(o)',                   '2025-04-10 08:54:53', '2025-10-20 12:02:48', 1);

-- ==============================================================
-- 2. CONF_TIPOCARGO
-- Fuente: archivos_marcelo/conf_tipocargo.sql
-- Tipos de cargo del personal hospitalario.
-- ==============================================================
DROP TABLE IF EXISTS `conf_tipocargo`;
CREATE TABLE `conf_tipocargo` (
  `id_tipocargo` int          NOT NULL AUTO_INCREMENT,
  `nombre`       varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `clinico`      tinyint(1)   NULL DEFAULT 0,
  `date_added`   datetime     NULL DEFAULT NULL,
  `modified`     timestamp    NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `estado`       tinyint(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_tipocargo`),
  INDEX `idx_tcg_pk` (`id_tipocargo` ASC)
) ENGINE = InnoDB AUTO_INCREMENT = 81
  CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

INSERT INTO `conf_tipocargo` VALUES
(1,  'ADMINISTRATIVOS',                                    0, '2021-07-19 17:07:26', '2022-01-04 06:39:20', 0),
(2,  'Enfermera(o)',                                       1, '2021-07-20 08:53:30', '2022-01-04 06:41:45', 0),
(3,  'Experto(a)',                                      NULL, '2021-07-20 08:53:49', '2022-09-30 09:00:16', 0),
(4,  'Fonoaudiologo(a)',                                   1, '2021-07-20 08:54:36', '2022-01-04 06:41:47', 0),
(5,  'Kinesiologo(a)',                                     1, '2021-07-20 08:54:46', '2022-01-04 06:41:48', 0),
(6,  'Matron(a)',                                          1, '2021-07-20 08:55:00', '2023-03-31 15:49:14', 0),
(7,  'Medicos',                                            1, '2021-07-20 08:55:08', '2022-01-04 07:48:29', 0),
(8,  'Nutricionista',                                      1, '2021-07-20 08:55:20', '2022-01-04 06:41:56', 0),
(9,  'Profesional (otros de la salud)',                    0, '2021-07-20 08:55:30', '2022-01-04 07:47:48', 0),
(10, 'Profesional (otros)',                                0, '2021-07-20 08:55:45', '2022-01-04 07:47:50', 0),
(11, 'Quimicos Farmaceuticos',                             1, '2021-07-20 08:56:03', '2022-01-04 07:48:01', 0),
(12, 'Tecnico (otros)',                                    0, '2021-07-20 08:56:12', '2022-01-04 07:48:02', 0),
(13, 'Tecnico en Alimentacion',                            0, '2021-07-20 08:56:27', '2022-01-04 06:42:02', 0),
(14, 'Tecnico Paramedico',                                 0, '2021-07-20 08:56:37', '2022-01-04 06:42:04', 0),
(15, 'Tecnico Sup. en Enfermeria',                         1, '2021-07-20 08:56:47', '2022-01-04 06:42:05', 0),
(16, 'Tecnico Superior',                                   0, '2021-07-20 08:57:31', '2022-01-04 07:48:02', 0),
(17, 'Tecnico Sup. en Odontologia',                        0, '2021-07-20 08:58:00', '2022-01-04 06:42:10', 0),
(18, 'Tecnologo Medico',                                   0, '2021-07-20 08:58:17', '2022-01-04 06:42:18', 0),
(19, 'AUXILIARES',                                         0, NULL,                  '2022-01-04 07:48:10', 0),
(20, 'CARGO EN EXTINCION',                                 0, NULL,                  '2022-01-04 07:48:11', 0),
(21, 'DIRECTIVOS',                                         0, NULL,                  '2022-01-04 07:48:13', 0),
(22, 'ODONTOLOGOS',                                        0, NULL,                  '2022-01-04 07:48:16', 0),
(23, 'PROFESIONALES',                                      0, NULL,                  '2022-01-04 07:48:18', 0),
(24, 'QUIMICOS',                                           0, NULL,                  '2022-01-04 07:48:19', 0),
(25, 'TECNICOS',                                           0, NULL,                  '2022-01-04 07:48:20', 0),
(32, 'Administrativa(o)',                               NULL, '2022-01-03 17:52:10', '2022-01-04 09:14:41', 1),
(33, 'Administrativa(o) Asignacion Profesional',        NULL, '2022-01-03 17:52:55', '2022-01-04 09:14:49', 1),
(34, 'Auxiliar  (hrs)',                                    1, '2022-01-03 18:01:40', '2025-11-05 09:41:32', 1),
(35, 'Experta(o) Junior',                              NULL, '2022-01-03 18:01:59', '2022-09-30 09:00:23', 0),
(36, 'Experta(o) Medio',                               NULL, '2022-01-03 18:02:12', '2022-09-30 11:03:45', 0),
(37, 'Interna(o) Enfermeria',                              1, '2022-01-03 18:02:32', NULL,                  1),
(38, 'Medico a Honorarios',                               1, '2022-01-03 18:03:05', '2023-01-03 17:06:18',  0),
(39, 'Medico Especialista a Honorarios',                   1, '2022-01-03 18:03:16', '2023-03-31 15:55:23', 0),
(40, 'Profesional de Salud',                               1, '2022-01-03 18:03:28', '2023-01-05 15:38:14', 1),
(41, 'Profesional Junior',                             NULL, '2022-01-03 18:03:50', '2022-09-30 09:00:37',  0),
(42, 'Profesional Medio',                              NULL, '2022-01-03 18:04:00', '2022-11-14 16:30:19',  0),
(43, 'Profesional Senior',                             NULL, '2022-01-03 18:04:10', '2022-11-14 16:30:22',  0),
(44, 'Quimica(o) Farmaceutico',                            1, '2022-01-03 18:04:18', NULL,                  1),
(45, 'Tecnica(o)  Salud',                                  1, '2022-01-03 18:04:25', NULL,                  1),
(46, 'Tecnica(o) (No Salud)',                          NULL, '2022-01-03 18:04:35', '2022-01-04 09:16:07',  1),
(47, 'Experta(o) Senior',                              NULL, '2022-01-04 10:20:12', '2022-09-30 09:04:20',  0),
(48, 'Tecnica(o) (No Salud) Medio',                   NULL, '2022-01-06 11:58:04', '2022-09-30 09:04:39',  0),
(49, 'Tecnica(o) (No Salud) Senior',                  NULL, '2022-01-06 11:58:55', '2022-09-30 09:05:31',  0),
(50, 'Tecnico Salud (pabellon)',                           1, '2022-01-26 10:55:52', NULL,                  1),
(51, 'Auxiliar (pabellon)',                                1, '2022-01-30 21:57:59', NULL,                  1),
(52, 'Medico a Honorarios Cuidados Medios SIN VINCULO',    1, '2022-10-12 15:16:58', '2023-03-31 15:56:12', 0),
(53, 'Medico a Honorarios Unidades Criticas',              1, '2022-10-12 15:17:14', '2023-03-31 15:56:16', 0),
(54, 'Medico Especialista Honorarios Cuidados Medios',     1, '2022-10-12 15:21:44', '2023-03-31 15:56:19', 0),
(55, 'Medico Especialista Honorarios Unidades Criticas',   1, '2022-10-12 15:22:14', '2023-03-31 15:56:21', 0),
(56, 'Medico Psiquiatra UST',                              1, '2022-10-12 16:50:34', '2023-03-31 15:56:36', 1),
(57, 'Medico a Honorarios Unidades Criticas SIN VINCULO',  0, '2022-11-14 13:41:02', '2023-03-31 15:56:41', 0),
(58, 'Medico Especialista Honorarios Unidades Criticas SIN VINCULO', 0, '2022-11-14 13:44:36', '2023-03-31 15:56:46', 0),
(59, 'PROFESIONAL',                                        1, '2022-11-14 13:51:30', NULL,                  1),
(60, 'PROFESIONAL CON EXPERIENCIA',                        1, '2022-11-14 13:51:44', NULL,                  1),
(61, 'PROFESIONAL',                                        0, '2022-11-14 13:51:52', '2023-03-31 15:57:05', 0),
(62, 'PROFESIONAL CON EXPERIENCIA',                        0, '2022-11-14 13:52:05', '2023-03-31 15:57:10', 0),
(63, 'TECNICO BODEGA',                                     0, '2022-11-14 14:06:04', '2023-03-31 15:57:25', 0),
(64, 'Tecnica (o) No SALUD CON EXPERIENCIA',               0, '2022-11-14 14:09:07', '2025-11-05 09:41:32', 1),
(65, 'QUIMICO FARMACIA BODEGA',                            0, '2022-11-14 14:24:43', '2023-03-31 15:58:00', 1),
(66, 'PROFESIONAL (PSICOLOGA UST)',                        1, '2022-11-14 14:25:13', '2025-11-05 09:41:32', 1),
(67, 'Medico a Honorarios Cuidados Medios',                1, '2023-01-03 17:09:05', '2023-03-31 15:58:17', 0),
(68, 'Medico Especialista Honorarios Cuidados Medios SIN VINCULO', 1, '2023-01-04 16:07:51', '2023-03-31 15:58:24', 0),
(69, 'MEDICO ESPECIALISTA',                                1, '2023-03-31 15:59:17', NULL,                  1),
(70, 'MEDICO GENERAL',                                     1, '2023-03-31 15:59:25', NULL,                  1),
(71, 'Medico Especialista U. Criticas CON VINCULO',        0, '2023-03-31 15:59:56', '2025-11-05 09:41:32', 1),
(72, 'Medico Especialista U. Criticas SIN VINCULO',        1, '2023-03-31 16:00:04', '2025-11-05 09:41:32', 1),
(73, 'Medico General U. Critica CON VINCULO',              1, '2023-03-31 16:00:30', '2025-11-05 09:41:32', 1),
(74, 'Medico General U. Critica SIN VINCULO',              1, '2023-03-31 16:00:46', '2025-11-05 09:41:32', 1),
(75, 'Medico General Cuidados Medios CON VINCULO',         1, '2023-03-31 16:01:28', NULL,                  1),
(76, 'Medico General Cuidados Medios SIN VINCULO',         1, '2023-03-31 16:01:36', NULL,                  1),
(77, 'Medico Especialista Cuidados Medios CON VINCULO',    1, '2023-03-31 16:08:12', NULL,                  1),
(78, 'Medico Especialista Cuidados Medios SIN VINCULO',    1, '2023-03-31 16:08:20', NULL,                  1),
(79, 'MEDICOS R1',                                         1, '2023-03-31 16:08:30', NULL,                  1),
(80, 'MEDICO SUBESPECIALISTA',                             1, '2024-03-20 15:04:43', NULL,                  1);

-- ==============================================================
-- 3. CONF_TIPOCONTRATO
-- Fuente: archivos_marcelo/conf_tipocontrato.sql
-- ==============================================================
DROP TABLE IF EXISTS `conf_tipocontrato`;
CREATE TABLE `conf_tipocontrato` (
  `id_tipocontrato` int          NOT NULL AUTO_INCREMENT,
  `nombre`          varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `date_added`      datetime     NULL DEFAULT NULL,
  `modified`        timestamp    NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `estado`          tinyint(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_tipocontrato`),
  INDEX `idx_tct_pk` (`id_tipocontrato` ASC)
) ENGINE = InnoDB AUTO_INCREMENT = 5
  CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

INSERT INTO `conf_tipocontrato` VALUES
(1, 'CONTRATADOS', '2021-07-20 08:58:57', NULL, 1),
(2, 'HSA',         '2021-07-20 08:59:10', NULL, 1),
(3, 'SUPLENTE',    '2021-07-20 08:59:23', NULL, 1),
(4, 'TITULARES',   '2021-07-20 08:59:37', NULL, 1);

-- ==============================================================
-- 4. CONF_TIPOFUNCIONARIO
-- Fuente: archivos_marcelo/conf_tipofuncionario.sql
-- ==============================================================
DROP TABLE IF EXISTS `conf_tipofuncionario`;
CREATE TABLE `conf_tipofuncionario` (
  `id_tipofuncionario` int          NOT NULL AUTO_INCREMENT,
  `nombre`             varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `date_added`         datetime     NULL DEFAULT NULL,
  `modified`           timestamp    NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `estado`             tinyint(1)   NOT NULL DEFAULT 1,
  `tipo_persona`       int          NULL DEFAULT 0,
  PRIMARY KEY (`id_tipofuncionario`)
) ENGINE = InnoDB AUTO_INCREMENT = 15
  CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

INSERT INTO `conf_tipofuncionario` VALUES
(1,  'CONTRATO',                  '2022-07-29 13:23:22', '2024-02-07 12:33:45', 1, 0),
(2,  'Becado',                    '2023-12-05 12:00:44', '2024-02-07 12:28:50', 1, 0),
(3,  'Estudiante',                '2023-12-05 12:00:44', '2024-02-26 16:29:51', 1, 1),
(4,  'Visitante Externo',         '2023-12-05 12:00:44', '2024-02-07 12:35:12', 1, 0),
(5,  'Carabinero',                '2023-12-05 12:00:44', '2024-02-07 12:35:15', 1, 0),
(6,  'Gendarmería',               '2024-02-07 12:46:59', '2025-11-05 10:44:39', 1, 0),
(9,  'Tutor externo',             '2024-02-26 15:58:06', NULL,                  1, 0),
(10, 'TUTOR CLINICO',             '2024-02-26 16:16:15', '2024-02-26 16:29:33', 1, 1),
(12, 'Supervisor de Práctica',    '2024-03-04 09:21:43', '2025-11-05 10:44:39', 1, 1),
(13, 'Alumno en pratica no médica','2024-04-08 16:16:35','2025-11-05 10:44:39', 1, 0),
(14, 'Pasantia',                  '2025-03-31 08:29:29', NULL,                  1, 1);

-- ==============================================================
-- 5. SERVICIO (tabla del hospital, distinta de 'servicios')
-- Fuente: archivos_marcelo/servicio.sql
-- Listado completo de servicios/unidades del hospital HUAP.
-- Nota: La PK se agrega aquí; el dump original de innhosp no la
--       incluía porque MySQL la manejaba implícitamente.
-- ==============================================================
DROP TABLE IF EXISTS `servicio`;
CREATE TABLE `servicio` (
  `id_servicio`    int          NOT NULL DEFAULT 0,
  `nombre`         varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `id_responsable` int          NULL DEFAULT NULL,
  `id_subrogante`  int          NULL DEFAULT NULL,
  `estado`         tinyint(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_servicio`)
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

INSERT INTO `servicio` VALUES
(511, 'UPC Quemados',                                          4545, 4123, 1),
(516, 'Coordinacion Apoyo Clinico y Diagnostico',               240,  240, 1),
(542, 'Gestión del Cuidado en Pabellón',                       NULL, NULL, 1),
(623, 'UPC MQ',                                                 328,  328, 1),
(701, 'Direccion',                                              347,  245, 1),
(702, 'Calidad y Seguridad del Paciente',                       157,  329, 1),
(703, 'IAAS',                                                  3194, 3107, 1),
(704, 'Asesoria Juridica',                                      187, 1424, 1),
(705, 'Secretaria y Oficina de Partes',                        2938, 2716, 1),
(706, 'Dpto.Planificacion y Control de Gestion',               2865, 1350, 1),
(707, 'Analisis Clinico GRD',                                  3389, 3455, 1),
(708, 'Subdireccion de Gestion del Cuidado',                   2860, 2900, 1),
(709, 'Gestion del Cuidado en Pabellon',                       2775, 1242, 1),
(710, 'Auditoria',                                             3500, 3038, 1),
(711, 'Dpto.Formacion, Investigacion y Docencia',               244, 2650, 1),
(712, 'Control de Gestion',                                    1847, 1350, 1),
(713, 'Estadistica Hospitalaria',                              2636,   71, 1),
(714, 'Calidad Percibida',                                     2678, 3765, 1),
(715, 'Proyectos',                                             2844, 2865, 1),
(716, 'Comunicaciones y Relaciones Publicas',                  3075, 3282, 1),
(717, 'Subdireccion de Gestion Clinica',                        245,  729, 1),
(718, 'Gestion de la Demanda',                                  729, 1170, 1),
(719, 'Clinica HUAP',                                           245,  729, 1),
(721, 'Traumatologia',                                         3471,  326, 1),
(722, 'Cuidados Medios 3°-4°-6° Piso',                         1035, 1170, 1),
(723, 'Cirugia',                                                443,  876, 1),
(724, 'Neurologia',                                             489, 2467, 1),
(725, 'UTI 5° piso',                                           1025,  931, 1),
(732, 'Emergencia Hospitalaria',                                220, 4596, 1),
(733, 'Dental',                                                3580, 3359, 1),
(734, 'Pabellon',                                              3366, 3471, 1),
(735, 'Anestesia',                                             3037, 3023, 1),
(736, 'Angiografia',                                            378,  312, 1),
(737, 'Endoscopia',                                            2847, 3522, 1),
(738, 'Rehabilitacion y Gestion Funcional',                    4690,  333, 1),
(739, 'Psicotrauma',                                           2975, 1652, 1),
(740, 'Procuramiento de Organos',                              3116, 1856, 1),
(742, 'Nutricion',                                             3001, 3041, 1),
(743, 'Imagenologia',                                            22, 2466, 1),
(744, 'Laboratorio Clinico',                                   1067, 2981, 1),
(745, 'Anatomia Patologica',                                    278,  290, 1),
(746, 'Farmacia',                                              2475, 1328, 1),
(747, 'Medicina Transfusional',                                 240,  317, 1),
(748, 'Servicio Social',                                       3008, 2960, 1),
(749, 'Alta Asistida',                                         1534, 1580, 1),
(752, 'Farmacia Clinica',                                       880, 6209, 1),
(753, 'Apoyo Clinico Logistico - Ref insumos',                 3576,  535, 1),
(754, 'Apoyo Clinico Asistencial - Jefe de Turno A',           2373, 2373, 1),
(755, 'Epidemiologia Clinica',                                 3435, 1236, 1),
(756, 'Subdireccion de Gestion Administrativa y Financiera',   7064, 3575, 1),
(757, 'Finanzas',                                              3575, 2487, 1),
(758, 'Tecnologia de la Informacion',                          2996, 2791, 1),
(761, 'Gestion del Cuidado en UPC Quemados',                   2896, 3048, 1),
(762, 'UPC 1° piso (SDGC)',                                    3053, 1038, 1),
(763, 'Gestion del Cuidado 3° piso',                           2900, 3044, 1),
(764, 'Gestion del Cuidado 6° piso',                           2740, 2752, 1),
(765, 'Gestion del Cuidado 4° piso',                           3044, 4982, 1),
(767, 'Gestion del Cuidado en Clinica HUAP',                   2862, 3068, 1),
(768, 'Abastecimiento',                                        4122, 4119, 1),
(771, 'Emergencia Hospitalaria (SDGC)',                        2756, 2977, 1),
(772, 'Dental (SDGC)',                                         3580, 3359, 1),
(773, 'Gestion del Cuidado en Angiografia',                    1251, 1061, 1),
(774, 'Gestion del Cuidado en Endoscopia',                      535, 2752, 1),
(775, 'Esterilizacion',                                        3524,  369, 1),
(776, 'Roperia y Aseo Hospitalario',                           3463, 3524, 1),
(777, 'Gestion del Cuidado en UTI 5° piso',                    2860,  458, 1),
(779, 'Subdireccion de Gestion y Desarrollo de las Personas',  5902, 2645, 1),
(780, 'Gestion de Personas',                                   2780, 6254, 1),
(781, 'Administracion de Personas',                            2780, 6254, 1),
(782, 'Remuneraciones',                                        2557, 3234, 1),
(783, 'Recursos Fisicos',                                      2751, 3100, 1),
(784, 'Calidad de Vida',                                       6254, 2823, 1),
(785, 'Prevencion de Riesgos',                                 2935, 2935, 1),
(786, 'Salud del Trabajador',                                  1057, 2742, 1),
(787, 'Sala Cuna y Cuidados Infantiles',                       2788, 1887, 1),
(788, 'Bienestar al Personal',                                 2823, 3554, 1),
(789, 'Desarrollo Organizacional',                             5902, 2645, 1),
(790, 'Reclutamiento y Seleccion',                             5902,  979, 1),
(791, 'Capacitacion',                                          2645, 3505, 1),
(792, 'Honorarios',                                            6971, 3213, 1),
(793, 'Gestion del Cuidado en UPC MQ',                         2860, 2860, 1),
(794, 'Apoyo Gestion Presupuestaria Financiera',               5571, 3575, 1),
(797, 'Contabilidad',                                          2487, 2773, 1),
(798, 'Cobranzas',                                             2853, 2691, 1),
(799, 'Tesoreria',                                             3178, 3196, 1),
(800, 'Admision',                                              3029, 2684, 1),
(801, 'Analisis Financiero',                                   3575, 7064, 1),
(802, 'Activo Fijo',                                           3417, 3575, 1),
(804, 'Operacion y Soporte',                                   2932, 2996, 1),
(805, 'Desarrollo Tecnologico',                                2791, 2996, 1),
(807, 'Licitaciones',                                           453, 4122, 1),
(808, 'Administracion por Gestion de Contrato',                5861, 2784, 1),
(809, 'Adquisicion',                                           4119, 4122, 1),
(810, 'Aprovisionamiento y Distribucion',                       561, 1744, 1),
(811, 'Mantenimiento de Infraestructura',                      2745, 2751, 1),
(812, 'Mantenimiento de Equipos Industriales',                 3162, 2751, 1),
(813, 'Mantenimiento de Equipos Medicos',                      3100, 2751, 1),
(830, 'Coordinacion Gestion Clinica Asistencial',               931, 1025, 1),
(831, 'Gestion de Pacientes',                                    76,  196, 1),
(832, 'GES',                                                   3108, 2561, 1),
(833, 'Area Cuidados Medios MQ',                               1035, 1170, 1),
(834, 'Area Quirurgica',                                        245,  729, 1),
(835, 'Coordinacion Especialidades MQ',                         834,  834, 1),
(836, 'Cardiologia',                                            549, 2992, 1),
(837, 'Fisiatria',                                             3235, 3235, 1),
(838, 'Psiquiatria',                                           6237, 6237, 1),
(839, 'Nutriologia',                                            177,  177, 1),
(840, 'Nefrologia',                                            3363, 3363, 1),
(841, 'Gastroenterologia',                                     2477, 2477, 1),
(842, 'Neurocirugia',                                          3352,  658, 1),
(843, 'Urologia',                                              3167, 2286, 1),
(844, 'Area Critica',                                           245,  729, 1),
(845, 'UCI VALECH',                                             328,  773, 1),
(846, 'UPC 1° piso',                                            773,  530, 1),
(847, 'Cirugia Plastica y Reconstructiva',                     1003, 1003, 1),
(848, 'Apoyo Clinico Asistencial - Jefe de Turno B',           2382, 2382, 1),
(849, 'Apoyo Clinico Asistencial - Jefe de Turno C',            243,  243, 1),
(850, 'Apoyo Clinico Asistencial - Jefe de Turno D',           2370, 2370, 1),
(851, 'Gestion Clinica Asistencial Enfermeria',                2860, 2896, 1),
(852, 'Area Cuidados Medios MQ (SDGC)',                        2860, 2860, 1),
(853, 'Area Quirurgica (SDGC)',                                2860, 2860, 1),
(854, 'GC en Procedimientos de Cardiologia',                   2739, 2860, 1),
(855, 'Area Critica (SDGC)',                                   2860, 2860, 1),
(856, 'UCI VALECH (SDGC)',                                     1102,  922, 1),
(857, 'Archivo',                                               2636,   71, 1),
(858, 'Apoyo en Control-Coordinacion y Soporte',               5902, 6254, 1),
(859, 'Induccion Institucional',                               3505, 2645, 1);

-- ==============================================================
-- 6. PERSONALAUX
-- Fuente: archivos_marcelo/personal.sql
-- Espejo de innhosp.personal para desarrollo local.
-- Se crea vacía; cargala con un dump de innhosp.personal cuando
-- necesites datos reales del hospital.
-- ==============================================================
DROP TABLE IF EXISTS `personalAux`;
CREATE TABLE `personalAux` (
  `id_personal`     int          NOT NULL AUTO_INCREMENT,
  `rol`             varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `rut`             varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `dv`              varchar(1)   CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `nombre`          varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `apel_pat`        varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `apel_mat`        varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `rrhh`            tinyint(1)   NOT NULL DEFAULT 0,
  `telefono`        varchar(20)  CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `emailProfesional` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `emailPersonal`   varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `profesion`       int          NULL DEFAULT NULL,
  `id_estamento`    int          NULL DEFAULT NULL,
  `estamento`       varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `clave`           varbinary(255) NULL DEFAULT NULL,
  `estado`          int          NULL DEFAULT NULL,
  `date_added`      datetime     NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_personal`) USING BTREE,
 
  INDEX `personalFk2`   (`estado`          ASC) USING BTREE,
  CONSTRAINT `personalAux_fk_estado`       FOREIGN KEY (`estado`)          REFERENCES `conf_estados`     (`id_estado`)       ON DELETE RESTRICT ON UPDATE RESTRICT
 ) ENGINE = InnoDB AUTO_INCREMENT = 1
  CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ==============================================================
-- 7. VISTA viewPersonal (Opción B — desarrollo)
-- Fuente: archivos_marcelo/create_view_personal.sql
-- Apunta a personalAux dentro de innhosp.
-- Para producción: reemplazar por Opción A que apunta a innhosp.personal
-- ==============================================================
DROP VIEW IF EXISTS viewPersonal;
DROP TABLE IF EXISTS viewPersonal;
CREATE OR REPLACE VIEW viewPersonal AS
SELECT
    p.id_personal,
    p.rol,
    p.rut,
    p.dv,
    p.nombre,
    p.apel_pat,
    p.apel_mat,
    p.rrhh,
    p.telefono,
    p.emailProfesional,
    p.emailPersonal,
    p.profesion,
    p.id_estamento,
    p.estamento,
    p.clave,
    p.estado,
    p.date_added
FROM innhosp.personalAux p;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================
-- VERIFICACIÓN
-- ==============================================================
SELECT 'conf_estados'       AS tabla, COUNT(*) AS filas FROM conf_estados;
SELECT 'conf_tipocargo'     AS tabla, COUNT(*) AS filas FROM conf_tipocargo;
SELECT 'conf_tipocontrato'  AS tabla, COUNT(*) AS filas FROM conf_tipocontrato;
SELECT 'conf_tipofuncionario' AS tabla, COUNT(*) AS filas FROM conf_tipofuncionario;
SELECT 'servicio (hospital)' AS tabla, COUNT(*) AS filas FROM servicio;
SELECT 'personalAux (vacía)' AS tabla, COUNT(*) AS filas FROM personalAux;
SELECT 'viewPersonal OK'     AS vista,  COUNT(*) AS filas FROM viewPersonal;
