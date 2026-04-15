-- ============================================
-- SCRIPT DE POBLACIÓN DE DATOS v5.1
-- SE AGREGA POBLADO PARA TABLA servicio_sgt_huap
-- CON LIMPIEZA PREVIA DE DATOS
-- ============================================

USE innhosp;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- LIMPIAR TABLAS ANTES DE POBLAR
-- ============================================
-- Limpiar tablas en orden inverso a dependencias
TRUNCATE TABLE servicio_sgt_huap;
TRUNCATE TABLE viewPersonal;
TRUNCATE TABLE servicio;
TRUNCATE TABLE conf_tipofuncionario;
TRUNCATE TABLE conf_tipocontrato;
TRUNCATE TABLE conf_tipocargo;
TRUNCATE TABLE conf_profesion;
TRUNCATE TABLE conf_estados;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 1. POBLAR conf_estados
-- ============================================
INSERT INTO `conf_estados` (`id_estado`, `nombre`, `date_added`, `modified`, `estado`) VALUES
(1, 'Activo', '2022-03-23 11:54:32', '2025-07-15 10:00:14', 1),
(2, 'Temporal', '2022-03-23 11:55:57', '2022-03-23 08:55:59', 1),
(3, 'Vencido', '2022-03-23 11:55:59', '2022-03-23 08:56:01', 1),
(4, 'Nulo', '2022-03-23 11:56:02', '2022-03-23 08:56:04', 1),
(5, 'No Activo', '2022-03-23 11:55:55', '2022-03-24 06:10:59', 1),
(6, 'Termino Anticipado / Desvinculado', '2023-07-03 12:53:07', '2025-10-20 12:01:30', 1),
(7, 'Renunciado', '2023-07-03 12:53:13', NULL, 1),
(8, 'Sin Renovacion', '2023-10-02 16:15:43', '2025-10-20 12:02:48', 1),
(9, 'Banned', '2023-10-10 16:44:30', NULL, 1),
(10, 'Traspaso a contrata', '2023-10-11 17:40:06', NULL, 1),
(11, 'Notificada(o)', '2025-04-10 08:54:53', '2025-10-20 12:02:48', 1);

-- ============================================
-- 2. POBLAR conf_profesion
-- ============================================
INSERT INTO `conf_profesion` (`id_profesion`, `nombre`, `date_added`, `modified`, `estado`) VALUES
(1, 'Abogada(o)', '2022-01-04 12:18:45', NULL, 1),
(2, 'Administrador(a) Publico', '2022-01-04 12:18:55', NULL, 1),
(3, 'Administrativa(o)', '2022-01-04 12:19:01', NULL, 1),
(4, 'Analista de Sistema', '2022-01-04 12:19:07', NULL, 1),
(5, 'Asistente Social', '2022-01-04 12:19:22', NULL, 1),
(6, 'Auxiliar', '2022-01-04 12:19:30', NULL, 1),
(7, 'Auxiliar de Enfermeria', '2022-01-04 12:19:43', NULL, 1),
(8, 'Auxiliar Paramedico de Enfermeria', '2022-01-04 12:19:51', NULL, 1),
(9, 'Contador Auditor', '2022-01-04 12:20:02', NULL, 1),
(10, 'Dibujante Tecnico', '2022-01-04 12:20:07', NULL, 1),
(11, 'Enfermera(o)', '2022-01-04 12:20:16', NULL, 1),
(12, 'Estadistica(o)', '2022-01-04 12:20:21', NULL, 1),
(13, 'Fonoaudiologo(a)', '2022-01-04 12:20:27', NULL, 1),
(14, 'Gasfiter', '2022-01-04 12:20:34', NULL, 1),
(15, 'Ingeniero(a) (Otros)', '2022-01-04 12:20:56', NULL, 1),
(16, 'Ingeniero(a) Biomedico', '2022-01-04 12:21:02', NULL, 1),
(17, 'Ingeniero(a) Civil Industrial', '2022-01-04 12:21:15', NULL, 1),
(18, 'Ingeniero(a) Civil Informatico', '2022-01-04 12:21:21', NULL, 1),
(19, 'Ingeniero(a) Comercial', '2022-01-04 12:21:29', NULL, 1),
(20, 'Ingeniero(a) Electrico', '2022-01-04 12:21:34', NULL, 1),
(21, 'Ingeniero(a) en Administracion de Empresas', '2022-01-04 12:21:40', NULL, 1),
(22, 'Ingeniero(a) en Agronegocios', '2022-01-04 12:21:49', NULL, 1),
(23, 'Ingeniero(a) en Ejec. en Aministracion', '2022-01-04 12:21:57', NULL, 1),
(24, 'Ingeniero(a) Matematico', '2022-01-04 12:22:10', NULL, 1),
(25, 'Ingeniero(a) Mecanico', '2022-01-04 12:22:15', NULL, 1),
(26, 'Interna(o) de Enfermeria', '2022-01-04 12:24:13', NULL, 1),
(27, 'Interna(o) de Medicina', '2022-01-04 12:24:18', NULL, 1),
(28, 'Kinesiologa(o)', '2022-01-04 12:24:28', NULL, 1),
(29, 'Masoterapeuta', '2022-01-04 12:25:10', NULL, 1),
(30, 'Matron(a)', '2022-01-04 12:25:24', NULL, 1),
(31, 'Medico', '2022-01-04 12:30:58', NULL, 1),
(32, 'Medico Anestesiologo(a)', '2022-01-04 12:31:05', NULL, 1),
(33, 'Medico Cirujana(o)', '2022-01-04 12:31:11', NULL, 1),
(34, 'Medico Enfermedades Respiratorias', '2022-01-04 12:31:18', NULL, 1),
(35, 'Medico Geriatra', '2022-01-04 12:31:23', NULL, 1),
(36, 'Medico Imagenologia', '2022-01-04 12:31:29', NULL, 1),
(37, 'Medico Infectologo(a)', '2022-01-04 12:31:33', NULL, 1),
(38, 'Medico Intensiva Adulto', '2022-01-04 12:31:38', NULL, 1),
(39, 'Medico Internista', '2022-01-04 12:31:44', NULL, 1),
(40, 'Medico Medicina Legal', '2022-01-04 12:31:50', NULL, 1),
(41, 'Medico Neurocirujana(o)', '2022-01-04 12:31:56', NULL, 1),
(42, 'Medico Neurologa(o)', '2022-01-04 12:32:02', NULL, 1),
(43, 'Medico Otorrinolaringologa(o)', '2022-01-04 12:32:08', NULL, 1),
(44, 'Medico Otras Especialidades', '2022-01-04 12:32:14', NULL, 1),
(45, 'Medico Patologa(o)', '2022-01-04 12:32:19', NULL, 1),
(46, 'Medico Psiquiatra', '2022-01-04 12:32:26', NULL, 1),
(47, 'Medico Radiologa(a)', '2022-01-04 12:32:31', NULL, 1),
(48, 'Medico Traumatologa(o)', '2022-01-04 12:32:36', NULL, 1),
(49, 'Medico Traumatologia y Ortopedia', '2022-01-04 12:32:41', NULL, 1),
(50, 'Medico Urgenciologa(o)', '2022-01-04 12:32:47', NULL, 1),
(51, 'Medico Urologa(o)', '2022-01-04 12:32:52', NULL, 1),
(52, 'Nutricionista', '2022-01-04 12:32:58', NULL, 1),
(53, 'Planificador Social', '2022-01-04 12:33:03', NULL, 1),
(54, 'Profesional (Otros)', '2022-01-04 12:33:10', NULL, 1),
(55, 'Psicologo(a)', '2022-01-04 12:33:17', NULL, 1),
(56, 'Quimica(o) Farmaceutico', '2022-01-04 12:33:33', NULL, 1),
(57, 'Quimico Laboratista', '2022-01-04 12:33:39', NULL, 1),
(58, 'Realizador(a) Audiovisual', '2022-01-04 12:33:45', NULL, 1),
(59, 'Secretaria Administrativa', '2022-01-04 12:33:50', NULL, 1),
(60, 'Soldador', '2022-01-04 12:33:55', NULL, 1),
(61, 'Tecnico de Nivel Medio en Enfermeria', '2022-01-04 12:34:00', NULL, 1),
(63, 'Tecnico en Alimentacion', '2022-01-04 12:35:49', NULL, 1),
(64, 'Tecnico en Carpinteria', '2022-01-04 12:35:54', NULL, 1),
(65, 'Tecnico en Electricidad y Automatizacion Industrial', '2022-01-04 12:36:05', NULL, 1),
(66, 'Tecnico en Odontologia', '2022-01-04 12:36:11', NULL, 1),
(67, 'Tecnico en Refrigeracion y Climatizacion', '2022-01-04 12:36:16', NULL, 1),
(68, 'Tecnico en Turismo', '2022-01-04 12:36:22', NULL, 1),
(69, 'Tecnico Nivel Superior Higienista Dental', '2022-01-04 12:36:27', NULL, 1),
(70, 'Tecnico Paramedico', '2022-01-04 12:36:33', NULL, 1),
(71, 'Tecnico Sup. en Enfermeria', '2022-01-04 12:36:39', NULL, 1),
(72, 'Tecnico Superior (otros)', '2022-01-04 12:36:48', NULL, 1),
(73, 'Tecnico Superior Contabilidad y Finanzas', '2022-01-04 12:36:54', NULL, 1),
(74, 'Tecnico (Otros)', '2022-01-04 12:37:02', NULL, 1),
(75, 'Tecnologa(a) Medico', '2022-01-04 12:37:10', NULL, 1),
(76, 'Terapeuta Ocupacional', '2022-01-04 12:37:15', NULL, 1),
(77, 'Trabajador Social', '2022-01-04 12:37:21', NULL, 1),
(78, 'Técnico en Administración de Recursos Humanos', '2023-01-11 11:53:15', NULL, 1),
(79, 'Licenciado (a) Comunicacion Social', '2023-01-11 12:17:16', NULL, 1),
(80, 'Qumico Farmaceutica(o)', '2024-07-12 11:20:38', NULL, 1);

-- ============================================
-- 3. POBLAR conf_tipocargo
-- ============================================
INSERT INTO `conf_tipocargo` (`id_tipocargo`, `nombre`, `clinico`, `date_added`, `modified`, `estado`) VALUES
(32, 'Administrativa(o)', NULL, '2022-01-03 17:52:10', '2022-01-04 09:14:41', 1),
(33, 'Administrativa(o) Asignacion Profesional', NULL, '2022-01-03 17:52:55', '2022-01-04 09:14:49', 1),
(34, 'Auxiliar  (hrs)', 1, '2022-01-03 18:01:40', '2025-11-05 09:41:32', 1),
(37, 'Interna(o) Enfermeria', 1, '2022-01-03 18:02:32', NULL, 1),
(40, 'Profesional de Salud', 1, '2022-01-03 18:03:28', '2023-01-05 15:38:14', 1),
(44, 'Quimica(o) Farmaceutico', 1, '2022-01-03 18:04:18', NULL, 1),
(45, 'Tecnica(o)  Salud', 1, '2022-01-03 18:04:25', NULL, 1),
(46, 'Tecnica(o) (No Salud)', NULL, '2022-01-03 18:04:35', '2022-01-04 09:16:07', 1),
(50, 'Tecnico Salud (pabellon)', 1, '2022-01-26 10:55:52', NULL, 1),
(51, 'Auxiliar (pabellon)', 1, '2022-01-30 21:57:59', NULL, 1),
(56, 'Medico Psiquiatra UST', 1, '2022-10-12 16:50:34', '2023-03-31 15:56:36', 1),
(59, 'PROFESIONAL', 1, '2022-11-14 13:51:30', NULL, 1),
(60, 'PROFESIONAL CON EXPERIENCIA', 1, '2022-11-14 13:51:44', NULL, 1),
(64, 'Tecnica (o) No SALUD CON EXPERIENCIA', 0, '2022-11-14 14:09:07', '2025-11-05 09:41:32', 1),
(65, 'QUIMICO FARMACIA BODEGA', 0, '2022-11-14 14:24:43', '2023-03-31 15:58:00', 1),
(66, 'PROFESIONAL (PSICOLOGA UST)', 1, '2022-11-14 14:25:13', '2025-11-05 09:41:32', 1),
(69, 'MEDICO ESPECIALISTA', 1, '2023-03-31 15:59:17', NULL, 1),
(70, 'MEDICO GENERAL', 1, '2023-03-31 15:59:25', NULL, 1),
(71, 'Medico Especialista U. Criticas CON VINCULO', 0, '2023-03-31 15:59:56', '2025-11-05 09:41:32', 1),
(72, 'Medico Especialista U. Criticas SIN VINCULO', 1, '2023-03-31 16:00:04', '2025-11-05 09:41:32', 1),
(73, 'Medico General U. Critica CON VINCULO', 1, '2023-03-31 16:00:30', '2025-11-05 09:41:32', 1),
(74, 'Medico General U. Critica SIN VINCULO', 1, '2023-03-31 16:00:46', '2025-11-05 09:41:32', 1),
(75, 'Medico General Cuidados Medios CON VINCULO', 1, '2023-03-31 16:01:28', NULL, 1),
(76, 'Medico General Cuidados Medios SIN VINCULO', 1, '2023-03-31 16:01:36', NULL, 1),
(77, 'Medico Especialista Cuidados Medios CON VINCULO', 1, '2023-03-31 16:08:12', NULL, 1),
(78, 'Medico Especialista Cuidados Medios SIN VINCULO', 1, '2023-03-31 16:08:20', NULL, 1),
(79, 'MEDICOS R1', 1, '2023-03-31 16:08:30', NULL, 1),
(80, 'MEDICO SUBESPECIALISTA', 1, '2024-03-20 15:04:43', NULL, 1);

-- ============================================
-- 4. POBLAR conf_tipocontrato
-- ============================================
INSERT INTO `conf_tipocontrato` (`id_tipocontrato`, `nombre`, `date_added`, `modified`, `estado`) VALUES
(1, 'CONTRATADOS', '2021-07-20 08:58:57', NULL, 1),
(2, 'HSA', '2021-07-20 08:59:10', NULL, 1),
(3, 'SUPLENTE', '2021-07-20 08:59:23', NULL, 1),
(4, 'TITULARES', '2021-07-20 08:59:37', NULL, 1);

-- ============================================
-- 5. POBLAR conf_tipofuncionario
-- ============================================
INSERT INTO `conf_tipofuncionario` (`id_tipofuncionario`, `nombre`, `date_added`, `modified`, `estado`, `tipo_persona`) VALUES
(1, 'CONTRATO', '2022-07-29 13:23:22', '2024-02-07 12:33:45', 1, 0),
(2, 'Becado', '2023-12-05 12:00:44', '2024-02-07 12:28:50', 1, 0),
(3, 'Estudiante', '2023-12-05 12:00:44', '2024-02-26 16:29:51', 1, 1),
(4, 'Visitante Externo', '2023-12-05 12:00:44', '2024-02-07 12:35:12', 1, 0),
(5, 'Carabinero', '2023-12-05 12:00:44', '2024-02-07 12:35:15', 1, 0),
(6, 'Gendarmería', '2024-02-07 12:46:59', '2025-11-05 10:44:39', 1, 0),
(9, 'Tutor externo', '2024-02-26 15:58:06', NULL, 1, 0),
(10, 'TUTOR CLINICO', '2024-02-26 16:16:15', '2024-02-26 16:29:33', 1, 1),
(12, 'Supervisor de Práctica', '2024-03-04 09:21:43', '2025-11-05 10:44:39', 1, 1),
(13, 'Alumno en pratica no médica', '2024-04-08 16:16:35', '2025-11-05 10:44:39', 1, 0),
(14, 'Pasantia', '2025-03-31 08:09:29', NULL, 1, 1);

-- ============================================
-- 6. POBLAR servicio
-- ============================================
-- Nota: Se asignan los IDs de responsables preliminares, se actualizan al final
INSERT INTO `servicio` (`id_servicio`, `nombre`, `id_responsable`, `id_subrogante`, `estado`) VALUES
(722, 'Medicina Interna', 20, 20, 1),
(850, 'Enfermería', 1000, 1000, 1);

-- ============================================
-- 7. POBLAR personal
-- ============================================
-- Clave para todos: "huap2025"

-- --------------------------------------------------------
-- B. ANTIGUOS MED. INTERNA -> MOVIDOS A ENFERMERÍA (850)
-- --------------------------------------------------------
-- Nota: Se cambió id_servicio a 850 para todos (IDs 1-7)

INSERT INTO `viewPersonal` (`id_personal`, `nombre`, `apel_pat`, `apel_mat`, `rut`, `dv`, `estado`, `rol`, `id_tipocargo`, `id_tipocontrato`, `profesion`, `jefatura`, `rrhh`, `clave`, `date_added`, `id_servicio`) VALUES
(1, 'Ana María', 'González', 'Rojas', '12345678', '9', 1, 'JEFATURA', 69, 1, 31, 1, 1, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 850),
(2, 'Álvaro', 'López', 'Gutiérrez', '11111111', '1', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 850),
(3, 'Bastian', 'Olea', 'Sepúlveda', '22222222', '2', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 850),
(4, 'Omar', 'Sáez', 'Rodríguez', '33333333', '3', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 850),
(5, 'Ricardo', 'Mendoza', 'Castro', '44444444', '4', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 850),
(6, 'Felipe', 'Baeza', 'Silva', '55555555', '5', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 850),
(7, 'Pedro', 'Plaza', 'Muñoz', '66666666', '6', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 850);


-- --------------------------------------------------------
-- A. DATOS REALES -> MEDICINA INTERNA (722)
-- --------------------------------------------------------

-- Álvaro López (JEFATURA 722)
INSERT INTO `viewPersonal` (`id_personal`, `nombre`, `apel_pat`, `apel_mat`, `rut`, `dv`, `estado`, `rol`, `id_tipocargo`, `id_tipocontrato`, `profesion`, `jefatura`, `rrhh`, `clave`, `date_added`, `id_servicio`) VALUES
(20, 'Álvaro', 'López', '', '17599096', '8', 1, 'JEFATURA', 69, 1, 31, 1, 1, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 722);

-- Médicos Reales (722)
INSERT INTO `viewPersonal` (`id_personal`, `nombre`, `apel_pat`, `apel_mat`, `rut`, `dv`, `estado`, `rol`, `id_tipocargo`, `id_tipocontrato`, `profesion`, `jefatura`, `rrhh`, `clave`, `date_added`, `id_servicio`) VALUES
(21, 'Fernando', 'Roman', '', '16881827', '0', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 722),
(22, 'Sergio', 'González', '', '18730747', '3', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 722),
(23, 'Andrés', 'Tigre', '', '18155637', '4', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 722),
(24, 'Francisca', 'Álvarez', '', '19091609', 'k', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 722);

INSERT INTO `viewPersonal` (`nombre`, `apel_pat`, `apel_mat`, `rut`, `dv`, `estado`, `rol`, `id_tipocargo`, `id_tipocontrato`, `profesion`, `jefatura`, `rrhh`, `clave`, `date_added`, `id_servicio`) VALUES
('Tania', 'Bustos', 'Jorge', '19178519', '3', 1, 'MEDICO', 70, 2, 31, 0, 0, '921299f3f4769b2c7c86f6d6f11c3f17a5f8f3ccc6ebf410be5d027249739665ebfd422964d4459dbdf77e75f8f3687f2a6f8cf2394085ff37a9664bd84828d2', NOW(), 722),
('Fabian', 'Diaz', 'Terrazas', '21554320', 'k', 1, 'MEDICO', 70, 2, 31, 0, 0, '11c673eddc0d57ce6aa5209160a77683011417fb30caafdd3896a833b66a049ba251927be9975c7c9fcbfa6a82daddac7072ea2293f7f222b8e31b4919e9ad69', NOW(), 722),
('María José', 'Espinoza', 'Tilleria', '19184336', '3', 1, 'MEDICO', 70, 2, 31, 0, 0, '0203a207f139761cef8de23d802cd27d1ce62e5b449e7aef5cc9a03154cf4d3af8700fd9b76bcc2a4b12aa48bfb3601783b1e63a4d06d9ebd707d54b2897b519', NOW(), 722);


-- --------------------------------------------------------
-- C. DATOS ORIGINALES ENFERMERÍA (850)
-- --------------------------------------------------------
-- Jefatura Original 850
INSERT INTO `viewPersonal` (`id_personal`, `nombre`, `apel_pat`, `apel_mat`, `rut`, `dv`, `estado`, `rol`, `id_tipocargo`, `id_tipocontrato`, `profesion`, `jefatura`, `rrhh`, `clave`, `date_added`, `id_servicio`) VALUES
(1000, 'María Elena', 'Torres', 'Pérez', '99999999', '9', 1, 'JEFATURA', 69, 1, 31, 1, 1, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 850);

-- Personal Original 850
INSERT INTO `viewPersonal` (`id_personal`, `nombre`, `apel_pat`, `apel_mat`, `rut`, `dv`, `estado`, `rol`, `id_tipocargo`, `id_tipocontrato`, `profesion`, `jefatura`, `rrhh`, `clave`, `date_added`, `id_servicio`) VALUES
(1001, 'Carlos Andrés', 'Silva', 'Mendoza', '10000001', '1', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 850),
(1002, 'Patricia Alejandra', 'Vargas', 'Ríos', '10000002', '2', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 850),
(1003, 'Roberto Antonio', 'Herrera', 'Díaz', '10000003', '3', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 850),
(1004, 'Fernanda Isabel', 'Castillo', 'Muñoz', '10000004', '4', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 850),
(1005, 'Miguel Ángel', 'Soto', 'Contreras', '10000005', '5', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 850),
(1006, 'Cristina Andrea', 'Flores', 'Navarrete', '10000006', '6', 1, 'MEDICO', 70, 2, 31, 0, 0, '560c4bda6fb495087a5b01a914db50999ad7310d09788c1611af41c15f820fa69542434a0164e5bce8ebcc63ce6cc3bea034d6639f16463e37e29ba3a6344e48', NOW(), 850);

-- ============================================
-- ACTUALIZAR servicio con los id_responsable correctos
-- ============================================
-- ID 20 = Álvaro López (Real) en Med. Interna
-- ID 1000 = María Elena en Enfermería
UPDATE `servicio` SET `id_responsable` = 20, `id_subrogante` = 20 WHERE `id_servicio` = 722;
UPDATE `servicio` SET `id_responsable` = 1000, `id_subrogante` = 1000 WHERE `id_servicio` = 850;

-- ============================================
-- 8. POBLAR servicio_sgt_huap
-- ============================================
-- Solo poblar para servicios que existen en la tabla servicio
-- Ejemplo: Para servicio 722 (Medicina Interna) y 850 (Enfermería)

INSERT INTO `servicio_sgt_huap` (`id_servicio_ext`, `id_responsable`, `id_subrogante`, `piso_principal`) VALUES
(722, 20, 20, 'Piso 3 - Bloque A'),
(850, 1000, 1000, 'Piso 2 - Bloque C');

-- ============================================
-- VERIFICACIÓN DE DATOS
-- ============================================
SELECT 'Servicios creados:' as info;
SELECT id_servicio, nombre, id_responsable, estado FROM servicio ORDER BY id_servicio;

SELECT 'Servicios SGT HUAP:' as info;
SELECT 
    ssh.id_servicio_ext,
    s.nombre as servicio_nombre,
    ssh.piso_principal,
    CONCAT(p_resp.nombre, ' ', p_resp.apel_pat) as responsable,
    CONCAT(p_sub.nombre, ' ', p_sub.apel_pat) as subrogante
FROM servicio_sgt_huap ssh
INNER JOIN servicio s ON ssh.id_servicio_ext = s.id_servicio
LEFT JOIN viewPersonal p_resp ON ssh.id_responsable = p_resp.id_personal
LEFT JOIN viewPersonal p_sub ON ssh.id_subrogante = p_sub.id_personal
ORDER BY ssh.id_servicio_ext;

SELECT 'Personal por servicio:' as info;
SELECT 
    s.id_servicio,
    s.nombre as servicio_nombre,
    p.id_personal,
    p.nombre,
    CONCAT(p.rut, '-', p.dv) as rut,
    p.rol
FROM servicio s
LEFT JOIN viewPersonal p ON s.id_servicio = p.id_servicio
ORDER BY s.id_servicio, p.rol DESC, p.id_personal;

SELECT 'Conteo final:' as info;
SELECT 
    (SELECT COUNT(*) FROM servicio) as total_servicios,
    (SELECT COUNT(*) FROM viewPersonal) as total_personal,
    (SELECT COUNT(*) FROM servicio_sgt_huap) as total_sgt_huap,
    (SELECT COUNT(*) FROM viewPersonal WHERE id_servicio = 722) as personal_medicina_interna,
    (SELECT COUNT(*) FROM viewPersonal WHERE id_servicio = 850) as personal_enfermeria;

-- ============================================
-- FIN DEL SCRIPT DE POBLACIÓN v5.1
-- ============================================