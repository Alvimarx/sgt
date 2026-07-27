-- ==============================================================
-- GENERADO automáticamente — NO editar a mano.
-- Fuente: las piezas de desarrollo/. Regenerar: bash BaseDatosMySQL/generar_despliegue.sh
-- ==============================================================

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
-- ============================================================== 
-- POBLAR PERSONAL AUXILIAR - datos de prueba para viewPersonal
-- ============================================================== 
-- Objetivo:
--   Cargar 10 registros sintéticos en personalAux para probar la
--   vista viewPersonal en desarrollo.
-- 
-- Importante:
--   Este script NO usa la tabla Funcionario como fuente.
--   Los datos son inventados para pruebas y usan la misma clave
--   por defecto de desarrollo.
-- 
-- Ejecución:
--   mysql -u root -p < BaseDatosMySQL/poblar_personal_aux_dev.sql
-- 
-- Requisito:
--   Ejecutar primero BaseDatosMySQL/setup_personal_aux.sql
--   para crear la tabla personalAux y la vista viewPersonal.
-- ============================================================== 

USE innhosp;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE personalAux;

-- ============================================================== 
-- PERSONALAUX (registros de prueba)
-- Clave de desarrollo: "huap2025"
-- SHA-512("huap2025") =
--   560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa6
--   9542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48
-- usuario no registrado en el sgt 12345687-2
SET @dev_password_hash = SHA2('huap2025', 512);
-- ============================================================== 
INSERT INTO personalAux (
    id_personal,
    rol,
    rut,
    dv,
    nombre,
    apel_pat,
    apel_mat,
    rrhh,
    telefono,
    emailProfesional,
    emailPersonal,
    profesion,
    id_estamento,
    estamento,
    clave,
    estado,
    date_added
) VALUES
(1,  'JEFATURA',        '12345678', '9', 'Álvaro',    'López',      'Araya',      1, '912345001', 'alvaro.lopez@huap.cl',    'alvaro.dev@gmail.com',    31, NULL, 'Médico',          @dev_password_hash, 1, NOW()),
(2,  'MEDICO',          '12345677', '0', 'Fernando',  'Rojas',      'Mena',       0, '912345002', 'fernando.rojas@huap.cl',  'fernando.dev@gmail.com',  31, NULL, 'Médico',          @dev_password_hash, 1, NOW()),
(3,  'MEDICO',          '12345688', 'K', 'Sergio',    'González',   'Paredes',    0, '912345003', 'sergio.gonzalez@huap.cl', 'sergio.dev@gmail.com',    31, NULL, 'Médico',          @dev_password_hash, 1, NOW()),
(4,  'MEDICO',          '12345681', '8', 'Andrés',    'Tigre',      'Soto',       0, '912345004', 'andres.tigre@huap.cl',    'andres.dev@gmail.com',    31, NULL, 'Médico',          @dev_password_hash, 1, NOW()),
(5,  'ENFERMERIA',      '12345682', '7', 'María Paz', 'Torres',     'Vera',       0, '912345005', 'maria.torres@huap.cl',    'maria.dev@gmail.com',     42, NULL, 'Enfermería',      @dev_password_hash, 1, NOW()),
(6,  'ENFERMERIA',      '12345683', '6', 'Patricia',  'Vargas',     'Mora',       0, '912345006', 'patricia.vargas@huap.cl', 'patricia.dev@gmail.com',  42, NULL, 'Enfermería',      @dev_password_hash, 1, NOW()),
(7,  'KINESIOLOGIA',    '12345684', '5', 'Roberto',   'Herrera',    'Lagos',      0, '912345007', 'roberto.herrera@huap.cl', 'roberto.dev@gmail.com',   53, NULL, 'Kinesiología',    @dev_password_hash, 1, NOW()),
(8,  'FONOAUDIOLOGIA',  '12345685', '4', 'Camila',    'Espinoza',   'Díaz',       0, '912345008', 'camila.espinoza@huap.cl','camila.dev@gmail.com',    54, NULL, 'Fonoaudiología',  @dev_password_hash, 1, NOW()),
(9,  'NUTRICION',       '12345686', '3', 'Javier',    'Fuentes',    'Silva',      0, '912345009', 'javier.fuentes@huap.cl',  'javier.dev@gmail.com',    55, NULL, 'Nutrición',       @dev_password_hash, 1, NOW()),
(10, 'ADMINISTRATIVO',  '12345687', '2', 'Karla',     'Rojas',      'Toledo',     0, '912345010', 'karla.rojas@huap.cl',     'karla.dev@gmail.com',     60, NULL, 'Administrativo',  @dev_password_hash, 1, NOW());

INSERT INTO personalAux (
    id_personal, rol, rut, dv, nombre, apel_pat, apel_mat, 
    rrhh, telefono, emailProfesional, emailPersonal, 
    profesion, id_estamento, estamento, clave, estado, date_added
) VALUES
-- === Medicina Interna ===
-- Jefatura (ID_ROL_SISTEMA 1)
(11,  'JEFATURA', '22222222', '2', 'Álvaro',     'López',       '',         1, '912345001', 'alvaro.lopez@huap.cl',        'alvaro.lopez@gmail.com',        31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
-- Médicos (ID_ROL_SISTEMA 2)
(12,  'USUARIO',  '22222223', '3', 'Fernando',   'Roman',       '',         1, '912345002', 'fernando.roman@huap.cl',      'fernando.roman@gmail.com',      31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(13,  'USUARIO',  '22222224', '4', 'Sergio',     'González',    '',         1, '912345003', 'sergio.gonzalez@huap.cl',     'sergio.gonzalez@gmail.com',     31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(14,  'USUARIO',  '18155637', '4', 'Andrés',     'Tigre',       '',         1, '912345004', 'andres.tigre@huap.cl',        'andres.tigre@gmail.com',        31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(15,  'USUARIO',  '19091609', 'k', 'Francisca',  'Álvarez',     '',         1, '912345005', 'francisca.alvarez@huap.cl',   'francisca.alvarez@gmail.com',   31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(16,  'USUARIO',  '19178519', '3', 'Tania',      'Bustos',      'Jorge',    1, '912345006', 'tania.bustos@huap.cl',        'tania.bustos@gmail.com',        31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(17,  'USUARIO',  '21554320', 'k', 'Fabián',     'Díaz',        'Terrazas', 1, '912345007', 'fabian.diaz@huap.cl',         'fabian.diaz@gmail.com',         31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(18,  'USUARIO',  '19184336', '3', 'María José', 'Espinoza',    'Tilleria', 1, '912345008', 'maria.espinoza@huap.cl',      'maria.espinoza@gmail.com',      31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(19,  'USUARIO',  '19127805', '4', 'Javier',     'González',    'Lucero',   1, '912345009', 'javier.gonzalez@huap.cl',     'javier.gonzalez@gmail.com',     31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(20, 'USUARIO',  '19036885', '8', 'Karla',      'Rojas',       'Toledo',   1, '912345010', 'karla.rojas@huap.cl',         'karla.rojas@gmail.com',         31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(21, 'USUARIO',  '18211062', '0', 'Javiera',    'Steenbecker', 'Jara',     1, '912345011', 'javiera.steenbecker@huap.cl', 'javiera.steenbecker@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(22, 'USUARIO',  '18461922', '9', 'Juan',       'Fuentes',     'Haddad',   1, '912345012', 'juan.fuentes@huap.cl',        'juan.fuentes@gmail.com',        31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(23, 'USUARIO',  '16875278', '4', 'Gonzalo',    'Hinojosa',    'Cerda',    1, '912345013', 'gonzalo.hinojosa@huap.cl',    'gonzalo.hinojosa@gmail.com',    31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(24, 'USUARIO',  '16864458', '2', 'Carlos',     'Saa',         'Chong',    1, '912345014', 'carlos.saa@huap.cl',          'carlos.saa@gmail.com',          31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(25, 'USUARIO',  '19646316', 'K', 'Consuelo',   'Vilches',     'Alvarado', 1, '912345015', 'consuelo.vilches@huap.cl',    'consuelo.vilches@gmail.com',    31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(26, 'USUARIO',  '19644996', '5', 'Constanza',  'Peña',        'Pozo',     1, '912345016', 'constanza.pena@huap.cl',      'constanza.pena@gmail.com',      31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(27, 'USUARIO',  '19594566', '7', 'Tomás',      'Ide',         'Guiñez',   1, '912345017', 'tomas.ide@huap.cl',           'tomas.ide@gmail.com',           31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(28, 'USUARIO',  '19639491', '5', 'Rocío',      'López',       'Núñez',    1, '912345018', 'rocio.lopez@huap.cl',         'rocio.lopez@gmail.com',         31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(29, 'USUARIO',  '19079052', '5', 'Antonia',    'Alliende',    'Page',     1, '912345019', 'antonia.alliende@huap.cl',    'antonia.alliende@gmail.com',    31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(30, 'USUARIO',  '19687654', '5', 'Flavia',     'Paratori',    'Slinger',  1, '912345020', 'flavia.paratori@huap.cl',     'flavia.paratori@gmail.com',     31, NULL, 'Médico', @dev_password_hash, 1, NOW()),

-- === Enfermería ===
-- Jefaturas / Subrogantes (ID_ROL_SISTEMA 1)
(100, 'JEFATURA', '99999999', '9', 'María Elena', 'Torres',   'Pérez',     1, '912345100', 'maria.torres@huap.cl',   'maria.torres@gmail.com',   32, NULL, 'Enfermera(o)', @dev_password_hash, 1, NOW()),
(101, 'JEFATURA', '12345678', '9', 'Ana María',   'González', 'Rojas',     1, '912345101', 'ana.gonzalez@huap.cl',   'ana.gonzalez@gmail.com',   32, NULL, 'Enfermera(o)', @dev_password_hash, 1, NOW()),
-- Enfermeros/as (ID_ROL_SISTEMA 2)
(102, 'USUARIO',  '10000001', '1', 'Carlos',      'Silva',    'Mendoza',   1, '912345102', 'carlos.silva@huap.cl',   'carlos.silva@gmail.com',   32, NULL, 'Enfermera(o)', @dev_password_hash, 1, NOW()),
(103, 'USUARIO',  '10000002', '2', 'Patricia',    'Vargas',   'Ríos',      1, '912345103', 'patricia.vargas@huap.cl','patricia.vargas@gmail.com',32, NULL, 'Enfermera(o)', @dev_password_hash, 1, NOW()),
(104, 'USUARIO',  '10000003', '3', 'Roberto',     'Herrera',  'Díaz',      1, '912345104', 'roberto.herrera@huap.cl','roberto.herrera@gmail.com',32, NULL, 'Enfermera(o)', @dev_password_hash, 1, NOW()),
(105, 'USUARIO',  '10000004', '4', 'Fernanda',    'Castillo', 'Muñoz',     1, '912345105', 'fernanda.castillo@huap.cl','fernanda.castillo@gmail.com',32, NULL, 'Enfermera(o)', @dev_password_hash, 1, NOW()),
(106, 'USUARIO',  '10000005', '5', 'Miguel',      'Soto',     'Contreras', 1, '912345106', 'miguel.soto@huap.cl',    'miguel.soto@gmail.com',    32, NULL, 'Enfermera(o)', @dev_password_hash, 1, NOW()),
(107, 'USUARIO',  '10000006', '6', 'Cristina',    'Flores',   'Navarrete', 1, '912345107', 'cristina.flores@huap.cl','cristina.flores@gmail.com',32, NULL, 'Enfermera(o)', @dev_password_hash, 1, NOW()),

-- === Cirugía ===
-- Jefaturas / Subrogantes (ID_ROL_SISTEMA 1)
(200, 'JEFATURA', '11111111', '1', 'Ricardo',   'Morales',  'Vega',    1, '912345200', 'ricardo.morales@huap.cl', 'ricardo.morales@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(201, 'JEFATURA', '11111112', '2', 'Isabel',    'Parra',    'Cáceres', 1, '912345201', 'isabel.parra@huap.cl',    'isabel.parra@gmail.com',    31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
-- Médicos (ID_ROL_SISTEMA 2)
(202, 'USUARIO',  '11111113', '3', 'Felipe',    'Castillo', 'Arenas',  1, '912345202', 'felipe.castillo@huap.cl', 'felipe.castillo@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(203, 'USUARIO',  '11111114', '4', 'Valentina', 'Ríos',     'Fuentes', 1, '912345203', 'valentina.rios@huap.cl',  'valentina.rios@gmail.com',  31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(204, 'USUARIO',  '11111115', '5', 'Sebastián', 'Muñoz',    'Lagos',   1, '912345204', 'sebastian.munoz@huap.cl', 'sebastian.munoz@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(205, 'USUARIO',  '11111116', '6', 'Camila',    'Vega',     'Soto',    1, '912345205', 'camila.vega@huap.cl',     'camila.vega@gmail.com',     31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(206, 'USUARIO',  '11111117', '7', 'Diego',     'Rojas',    'Mora',    1, '912345206', 'diego.rojas@huap.cl',     'diego.rojas@gmail.com',     31, NULL, 'Médico', @dev_password_hash, 1, NOW()),

-- === Urgencias ===
-- Coordinación (ID_ROL_SISTEMA 1)
(300, 'JEFATURA', '30000001', '1', 'Ruben', 'Nissin', '', 1, '912345300', 'ruben.nissin@huap.cl', 'ruben.nissin@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(301, 'JEFATURA', '30000002', '2', 'Eulin', 'Klein', '', 1, '912345301', 'eulin.klein@huap.cl', 'eulin.klein@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(302, 'JEFATURA', '30000003', '3', 'Mauricio', 'Muñoz', '', 1, '912345302', 'mauricio.munoz@huap.cl', 'mauricio.munoz@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(303, 'JEFATURA', '30000004', '4', 'Eugenio', 'Donaire', '', 1, '912345303', 'eugenio.donaire@huap.cl', 'eugenio.donaire@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(304, 'JEFATURA', '30000005', '5', 'Mario', 'Galarce', '', 1, '912345304', 'mario.galarce@huap.cl', 'mario.galarce@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(305, 'JEFATURA', '30000006', '6', 'Flavio', 'Ayala', '', 1, '912345305', 'flavio.ayala@huap.cl', 'flavio.ayala@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
-- Urgenciólogos y Médicos Generales (ID_ROL_SISTEMA 2)
(306, 'USUARIO', '30000007', '7', 'Carolina', 'Millacura', '', 1, '912345306', 'carolina.millacura@huap.cl', 'carolina.millacura@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(307, 'USUARIO', '30000008', '8', 'Augusto', 'Araya', '', 1, '912345307', 'augusto.araya@huap.cl', 'augusto.araya@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(308, 'USUARIO', '30000009', '9', 'Miguel', 'Morales', '', 1, '912345308', 'miguel.morales@huap.cl', 'miguel.morales@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(309, 'USUARIO', '30000010', '0', 'Sandra', 'Flores', '', 1, '912345309', 'sandra.flores@huap.cl', 'sandra.flores@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(310, 'USUARIO', '30000011', '1', 'Macarena', 'Marín', '', 1, '912345310', 'macarena.marin@huap.cl', 'macarena.marin@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(311, 'USUARIO', '30000012', '2', 'David', 'Diaz', '', 1, '912345311', 'david.diaz@huap.cl', 'david.diaz@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(312, 'USUARIO', '30000013', '3', 'Camila', 'Alegria', '', 1, '912345312', 'camila.alegria@huap.cl', 'camila.alegria@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(313, 'USUARIO', '30000014', '4', 'Nicolás', 'Benedetti', '', 1, '912345313', 'nicolas.benedetti@huap.cl', 'nicolas.benedetti@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(314, 'USUARIO', '30000015', '5', 'Carla', 'Rey', '', 1, '912345314', 'carla.rey@huap.cl', 'carla.rey@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(315, 'USUARIO', '30000016', '6', 'Alvaro', 'Fredricksen', '', 1, '912345315', 'alvaro.fredricksen@huap.cl', 'alvaro.fredricksen@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(316, 'USUARIO', '30000017', '7', 'Marco', 'Montero', '', 1, '912345316', 'marco.montero@huap.cl', 'marco.montero@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(317, 'USUARIO', '30000018', '8', 'Gabriela', 'Toro', '', 1, '912345317', 'gabriela.toro@huap.cl', 'gabriela.toro@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(318, 'USUARIO', '30000019', '9', 'Catalina', 'Espinal', '', 1, '912345318', 'catalina.espinal@huap.cl', 'catalina.espinal@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(319, 'USUARIO', '30000020', '0', 'Ricardo', 'Rojas', '', 1, '912345319', 'ricardo.rojas@huap.cl', 'ricardo.rojas@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(320, 'USUARIO', '30000021', '1', 'Jose', 'Mayorga', '', 1, '912345320', 'jose.mayorga@huap.cl', 'jose.mayorga@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(321, 'USUARIO', '30000022', '2', 'Pilar', 'Farias', '', 1, '912345321', 'pilar.farias@huap.cl', 'pilar.farias@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(322, 'USUARIO', '30000023', '3', 'Antonia', 'Sanchez', '', 1, '912345322', 'antonia.sanchez@huap.cl', 'antonia.sanchez@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(323, 'USUARIO', '30000024', '4', 'Rose', 'Herrera', '', 1, '912345323', 'rose.herrera@huap.cl', 'rose.herrera@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(324, 'USUARIO', '30000025', '5', 'Joaquin', 'Collao', '', 1, '912345324', 'joaquin.collao@huap.cl', 'joaquin.collao@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(325, 'USUARIO', '30000026', '6', 'Claudio', 'Ojeda', '', 1, '912345325', 'claudio.ojeda@huap.cl', 'claudio.ojeda@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(326, 'USUARIO', '30000027', '7', 'Matias', 'López', '', 1, '912345326', 'matias.lopez@huap.cl', 'matias.lopez@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(327, 'USUARIO', '30000028', '8', 'Grace', 'Slater', '', 1, '912345327', 'grace.slater@huap.cl', 'grace.slater@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(328, 'USUARIO', '30000029', '9', 'Cristian', 'Gandara', '', 1, '912345328', 'cristian.gandara@huap.cl', 'cristian.gandara@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(329, 'USUARIO', '30000030', '0', 'Catalina', 'Astudillo', '', 1, '912345329', 'catalina.astudillo@huap.cl', 'catalina.astudillo@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(330, 'USUARIO', '30000031', '1', 'Álvaro', 'Grupe', '', 1, '912345330', 'alvaro.grupe@huap.cl', 'alvaro.grupe@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(331, 'USUARIO', '30000032', '2', 'Cristina', 'Rauchfuss', '', 1, '912345331', 'cristina.rauchfuss@huap.cl', 'cristina.rauchfuss@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(332, 'USUARIO', '30000033', '3', 'Ambar', 'Zuñiga', '', 1, '912345332', 'ambar.zuniga@huap.cl', 'ambar.zuniga@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(333, 'USUARIO', '30000034', '4', 'Regina', 'Piñero', '', 1, '912345333', 'regina.pinero@huap.cl', 'regina.pinero@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(334, 'USUARIO', '30000035', '5', 'Andrés', 'Vargas', '', 1, '912345334', 'andres.vargas@huap.cl', 'andres.vargas@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(335, 'USUARIO', '30000036', '6', 'Hernán', 'Correa', '', 1, '912345335', 'hernan.correa@huap.cl', 'hernan.correa@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(336, 'USUARIO', '30000037', '7', 'Sindy', 'Lamothe', '', 1, '912345336', 'sindy.lamothe@huap.cl', 'sindy.lamothe@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(337, 'USUARIO', '30000038', '8', 'Jose', 'Molero', '', 1, '912345337', 'jose.molero@huap.cl', 'jose.molero@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(338, 'USUARIO', '30000039', '9', 'Ismael', 'Laing', '', 1, '912345338', 'ismael.laing@huap.cl', 'ismael.laing@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(339, 'USUARIO', '30000040', '0', 'Pedro', 'Marín', '', 1, '912345339', 'pedro.marin@huap.cl', 'pedro.marin@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(340, 'USUARIO', '30000041', '1', 'Claudia', 'Díaz', '', 1, '912345340', 'claudia.diaz@huap.cl', 'claudia.diaz@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(341, 'USUARIO', '30000042', '2', 'Joaquin', 'Galvez', '', 1, '912345341', 'joaquin.galvez@huap.cl', 'joaquin.galvez@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(342, 'USUARIO', '30000043', '3', 'Rolando', 'Sanchez', '', 1, '912345342', 'rolando.sanchez@huap.cl', 'rolando.sanchez@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(343, 'USUARIO', '30000044', '4', 'Paula', 'Escobar', '', 1, '912345343', 'paula.escobar@huap.cl', 'paula.escobar@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(344, 'USUARIO', '30000045', '5', 'Karla', 'Schweitzer', '', 1, '912345344', 'karla.schweitzer@huap.cl', 'karla.schweitzer@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(345, 'USUARIO', '30000046', '6', 'Tomas', 'Gatica', '', 1, '912345345', 'tomas.gatica@huap.cl', 'tomas.gatica@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(346, 'USUARIO', '30000047', '7', 'Andrea', 'Carroza', '', 1, '912345346', 'andrea.carroza@huap.cl', 'andrea.carroza@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(347, 'USUARIO', '30000048', '8', 'Fiorella', 'Alfieri', '', 1, '912345347', 'fiorella.alfieri@huap.cl', 'fiorella.alfieri@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(348, 'USUARIO', '30000049', '9', 'Victor', 'Linares', '', 1, '912345348', 'victor.linares@huap.cl', 'victor.linares@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(349, 'USUARIO', '30000050', '0', 'Johnny', 'Arias', '', 1, '912345349', 'johnny.arias@huap.cl', 'johnny.arias@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(350, 'USUARIO', '30000051', '1', 'Melanie', 'Jarpa', '', 1, '912345350', 'melanie.jarpa@huap.cl', 'melanie.jarpa@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(351, 'USUARIO', '30000052', '2', 'Camila', 'Bozan', '', 1, '912345351', 'camila.bozan@huap.cl', 'camila.bozan@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(352, 'USUARIO', '30000053', '3', 'Joanna', 'Vilchez', '', 1, '912345352', 'joanna.vilchez@huap.cl', 'joanna.vilchez@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(353, 'USUARIO', '30000054', '4', 'Tania', 'Machado', '', 1, '912345353', 'tania.machado@huap.cl', 'tania.machado@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(354, 'USUARIO', '30000055', '5', 'Marcela', 'Valenzuela', '', 1, '912345354', 'marcela.valenzuela@huap.cl', 'marcela.valenzuela@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(355, 'USUARIO', '30000056', '6', 'Maria Jose', 'Inostroza', '', 1, '912345355', 'maria.inostroza@huap.cl', 'maria.inostroza@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(356, 'USUARIO', '30000057', '7', 'Scarlet', 'Burgos', '', 1, '912345356', 'scarlet.burgos@huap.cl', 'scarlet.burgos@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(357, 'USUARIO', '30000058', '8', 'Carolina', 'Arcoverde', '', 1, '912345357', 'carolina.arcoverde@huap.cl', 'carolina.arcoverde@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(358, 'USUARIO', '30000059', '9', 'Rodrigo', 'Rios', '', 1, '912345358', 'rodrigo.rios@huap.cl', 'rodrigo.rios@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(359, 'USUARIO', '30000060', '0', 'Montserrat', 'Cunill', '', 1, '912345359', 'montserrat.cunill@huap.cl', 'montserrat.cunill@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(360, 'USUARIO', '30000061', '1', 'Belen', 'Jorquera', '', 1, '912345360', 'belen.jorquera@huap.cl', 'belen.jorquera@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(361, 'USUARIO', '30000062', '2', 'Camila', 'Corvalán', '', 1, '912345361', 'camila.corvalan@huap.cl', 'camila.corvalan@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(362, 'USUARIO', '30000063', '3', 'Domingo', 'Andreani', '', 1, '912345362', 'domingo.andreani@huap.cl', 'domingo.andreani@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(363, 'USUARIO', '30000064', '4', 'Macarena', 'Hipp', '', 1, '912345363', 'macarena.hipp@huap.cl', 'macarena.hipp@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(364, 'USUARIO', '30000065', '5', 'Alejandro', 'Núñez', '', 1, '912345364', 'alejandro.nunez@huap.cl', 'alejandro.nunez@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(365, 'USUARIO', '30000066', '6', 'Maria', 'Houston', '', 1, '912345365', 'maria.houston@huap.cl', 'maria.houston@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(366, 'USUARIO', '30000067', '7', 'Maria Ignacia', 'Horta', '', 1, '912345366', 'maria.horta@huap.cl', 'maria.horta@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(367, 'USUARIO', '30000068', '8', 'Bruno', 'Di Cosmo', '', 1, '912345367', 'bruno.dicosmo@huap.cl', 'bruno.dicosmo@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(368, 'USUARIO', '30000069', '9', 'Daniela', 'García', '', 1, '912345368', 'daniela.garcia@huap.cl', 'daniela.garcia@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(369, 'USUARIO', '30000070', '0', 'Pablo', 'Garrido', '', 1, '912345369', 'pablo.garrido@huap.cl', 'pablo.garrido@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(370, 'USUARIO', '30000071', '1', 'Manuel', 'Candia', '', 1, '912345370', 'manuel.candia@huap.cl', 'manuel.candia@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(371, 'USUARIO', '30000072', '2', 'Jose', 'Castañeda', '', 1, '912345371', 'jose.castaneda@huap.cl', 'jose.castaneda@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(372, 'USUARIO', '30000073', '3', 'Valery', 'Gallardo', '', 1, '912345372', 'valery.gallardo@huap.cl', 'valery.gallardo@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(373, 'USUARIO', '30000074', '4', 'Macarena', 'Briones', '', 1, '912345373', 'macarena.briones@huap.cl', 'macarena.briones@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(374, 'USUARIO', '30000075', '5', 'Diego', 'Torres', '', 1, '912345374', 'diego.torres@huap.cl', 'diego.torres@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(375, 'USUARIO', '30000076', '6', 'Nicolas', 'Cid', '', 1, '912345375', 'nicolas.cid@huap.cl', 'nicolas.cid@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(376, 'USUARIO', '30000077', '7', 'Francisco', 'Echeverria', '', 1, '912345376', 'francisco.echeverria@huap.cl', 'francisco.echeverria@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(377, 'USUARIO', '30000078', '8', 'Alvaro', 'Lopez', '', 1, '912345377', 'alvaro.lopez@huap.cl', 'alvaro.lopez@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(378, 'USUARIO', '30000079', '9', 'Alexandra', 'Metcalfe', '', 1, '912345378', 'alexandra.metcalfe@huap.cl', 'alexandra.metcalfe@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW()),
(379, 'USUARIO', '30000080', '0', 'Pailla', 'Gatiga', '', 1, '912345379', 'pailla.gatiga@huap.cl', 'pailla.gatiga@gmail.com', 31, NULL, 'Médico', @dev_password_hash, 1, NOW());

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================== 
-- VERIFICACIÓN
-- ============================================================== 
SELECT 'personalAux' AS tabla, COUNT(*) AS filas FROM personalAux;
SELECT * FROM viewPersonal ORDER BY id_personal;
