-- ============================================
-- SCRIPT DE POBLACIÓN DE DATOS v5
-- SOLO POBLAREMOS HASTA "SERVICIO"
-- USO DE DATOS REALES PARA PRUEBA 5 
-- ============================================

USE innhosp;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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
('María José', 'Espinoza', 'Tilleria', '19184336', '3', 1, 'MEDICO', 70, 2, 31, 0, 0, '0203a207f139761cef8de23d802cd27d1ce62e5b449e7aef5cc9a03154cf4d3af8700fd9b76bcc2a4b12aa48bfb3601783b1e63a4d06d9ebd707d54b2897b519', NOW(), 722),
('Sergio', 'Gonzalez', 'Lizana', '18730747', '3', 1, 'MEDICO', 70, 2, 31, 0, 0, 'c1e4971e99a767fae132cc25b53934932a2e65ce5b2f372b0c30ee39e0d85ac8224456d524e45813551f4faf3a0e324a9dd8b1f5264fdddd7429b7e764257637', NOW(), 722),
('Javier', 'Gonzalez', 'Lucero', '19127805', '4', 1, 'MEDICO', 70, 2, 31, 0, 0, 'd5a6037c2bc20c6dd9377c7a41fd25abac9a67c506f2c6f04be79eccebfe883652fcad0def0beb88c5c185e4b8d6de3a3c87df5b15b06007e2de298b3bfb343e', NOW(), 722),
('Karla', 'Rojas', 'Toledo', '19036885', '8', 1, 'MEDICO', 70, 2, 31, 0, 0, 'afff6cc10ff404d16475f2200c4b9a417e816ad400c552c05a6784becce49663b5e00436606ca89325b33d0295ae87368f986eaf0b39ef12967a4513a45de675', NOW(), 722),
('Javiera', 'Steembecker', 'Jara', '18211062', '0', 1, 'MEDICO', 70, 2, 31, 0, 0, '769fcafcd2d88d71cb80fc98af1d59366b4028e6d22aedd6ecba1947bcb9558ef1f17bbfcd066353d7a850068b1bc6b234db4b312da7a7cdd658e6763bb8af08', NOW(), 722),
('Fernanda', 'Bahamonde', 'Goldberg', '18637160', '7', 1, 'MEDICO', 70, 2, 31, 0, 0, 'ad93a857a92f5cf9baaf6cec3e2433b7e2b7ee69f95838ffce93da7d42bcffe2c0b517ba36073a25e88ad0b97c5dee9947e05a0dfb88c7112275cb148a618f6c', NOW(), 722),
('Juan', 'Fuentes', 'Haddad', '18461922', '9', 1, 'MEDICO', 70, 2, 31, 0, 0, 'b22a4a3313f6ed70025cd87c6c97d1bccc9733939ca59fc094a3a6f04a82f216ea20e9b94e220e2f0efc59add18b32684203b334b11a33523fc587dbb064931f', NOW(), 722),
('Gonzalo', 'Hinojosa', 'Cerda', '16875278', '4', 1, 'MEDICO', 70, 2, 31, 0, 0, 'f5397b64265d4e6802a7cff20c59c8975cc9181151bde8880c046910b5233626fbcba081e72ec0ceb02fc3c6bdcdf33aac741a42cc15f8fda1ccac8602c4431e', NOW(), 722),
('Fernando', 'Roman', 'Ortega', '16881827', '0', 1, 'MEDICO', 70, 2, 31, 0, 0, '7e6a851c4aa3181825c2ba93fae253584820bf25d9f53bc8f4081812f64836cc8ce23ef1b8d62b9eec78867ccc333c23c4c3e3037a0602721764b681faed4346', NOW(), 722),
('Carlos', 'Saa', 'Chong', '16864458', '2', 1, 'MEDICO', 70, 2, 31, 0, 0, '4ec29a50130d537868b7eba0d6dc5e09bbd22a435c4647463b2bde46c416f8cc118d4ec38c6f7dfd25cfb69d0d74012c1b934c181309cd8d1351ab95c3a37a1c', NOW(), 722),
('Andres', 'Tigre', 'Espinoza', '18155637', '4', 1, 'MEDICO', 70, 2, 31, 0, 0, 'fc6a662f7fe60ef8694be5c3d4411602a264c2e3795499ca5173909235a58a871eca0ea1743932e7f1b444a0bd5e2fef7f7baa9d938ed821bc19ecec9e606503', NOW(), 722),
('Consuelo', 'Vilches', 'Alvarado', '19646316', 'K', 1, 'MEDICO', 70, 2, 31, 0, 0, '757f95f9ea29a1b69e9d6a8b96737285169e93d7d682cca483c5e934220b3f0e243c96a6ad6dc67e214ff4a27294363ed32316c01073cabe74b4775a53fa195b', NOW(), 722),
('Constanza', 'Peña', 'Pozo', '19644996', '5', 1, 'MEDICO', 70, 2, 31, 0, 0, '6777d11c5370d1f768379a03e137a28d5a2540c252b1c452e598bf120ac162a55a9469bd5adb1775150e068e2153ed2853533891476371b26e25c5dfb20a202d', NOW(), 722),
('Tomas', 'Ide', 'Guiñez', '19594566', '7', 1, 'MEDICO', 70, 2, 31, 0, 0, '6a610b4164e01a217374e2490c45e368f48964f94339d5c50fc3c0b831653185aaa4939ad74b7126023731bc5bb7702b06335cc917313160fddd826aad3b06a8', NOW(), 722),
('Rocio', 'Lopez', 'Nuñez', '19639491', '5', 1, 'MEDICO', 70, 2, 31, 0, 0, 'be059aaac878cb33b17e5c5ff505799deb5f8293ff85f756297e0a380cfd65876476314e6209a86f7357d6468a7009cee2bbc82774f7108c2a6d24bc16d3b587', NOW(), 722),
('Antonia', 'Alliende', 'Page', '19079052', '5', 1, 'MEDICO', 70, 2, 31, 0, 0, 'bfc77559e8452b909ddc6dd379ce30217662d2a721821ea812965d7ce12b14eba7d69d98805927bf769179ff29867f5fa4140754d3f45fa3596e4f0a469671fc', NOW(), 722),
('Francisca', 'Alvarez', 'Riffo', '19091609', 'k', 1, 'MEDICO', 70, 2, 31, 0, 0, '5363aa8fa21adfe18d88900529e2c80f09243b2f6ea63d6e21f87c80bf1431b08ffa06cb3d893ef325baf7ea8ea44d0e128554c9ffb5f93317c0ae1160f03339', NOW(), 722),
('Flavia', 'Paratori', 'Slinger', '19687654', '5', 1, 'MEDICO', 70, 2, 31, 0, 0, 'a87d9c3f4d06bb8f07b1e5ccdacbe3f24f855aac40153ad7ab205328d6552f79cfaf44b5837cfe8d0d8cfa74f95e5c7f4d4e1d91a4d2674edab234944a2a2d9d', NOW(), 722),
('Daniel', 'Weaver', 'Rodriguez', '18742532', '8', 1, 'MEDICO', 70, 2, 31, 0, 0, 'd8dcdb4bb92a4f00605852a11b7cb8b85bff14012aaf2b4871b384f95589d8b844666b73e06df8afb04e65909f8d0540becc5dd38fa8ea8940cafae1d4509315', NOW(), 722),
('Panagiotis', 'Karoussis', 'Santibañez', '18848171', 'k', 1, 'MEDICO', 70, 2, 31, 0, 0, '7ddf8cd7986fccd2fb104f3e2f3e8c8305f5127dc8cad1336833d69a554ac4efc5521547fb02006ceeea7443171312804c37d03f1e04107743f7b28ad0bbce08', NOW(), 722),
('Javier', 'Cardemil', 'Ossa', '19522181', '2', 1, 'MEDICO', 70, 2, 31, 0, 0, 'b5911b274ac818f71040e23ce4dce0f425e50d2ab3cc111fb98b973cd22197296a02ca6913731f70c16d7d62810d837e55d1299dcb289a5a7ea17c4d13b1f39b', NOW(), 722),
('Carla', 'Silva', 'Madrid', '19696397', '9', 1, 'MEDICO', 70, 2, 31, 0, 0, 'f3ba3592b26453c98123e551fed4d3bdca32ff6a3d45360644047b0ac7e08886c261d0a354fddfb0ba18fb879659a38b9a9a2beeacecaa6e44d2ed5fab6be32d', NOW(), 722),
('Amalia', 'Aviles', 'Astudillo', '19245307', '0', 1, 'MEDICO', 70, 2, 31, 0, 0, 'fabcf3b269632b357546e8b611571f9e151fd7098a61ac1a233c27bae0e56bcb67314b1786299d630656175d008fc5062bc38c3d061b53f893363aedc444ba31', NOW(), 722),
('Natalie', 'Rosales', 'Zamudio', '18642044', '6', 1, 'MEDICO', 70, 2, 31, 0, 0, 'c929bc70dc39a4d558c0e755625e16e067ddc6184dadf29d883ab360015e8c8afa98678ce7d6078c8fbe6343f4e76ab2cf7ef1169e66eb7ca0334c842fbee87f', NOW(), 722),
('Vicente', 'Madrid', 'Deischler', '19830820', 'K', 1, 'MEDICO', 70, 2, 31, 0, 0, '7bb3b90dfabad44596679da3ca49f7566ea6523da93be58f93962e0735f6692e8a0680a41afbeb6bd9d72e36fd7a90982a1f46f66d7ec617d7d83665b34f4ead', NOW(), 722),
('Paulette', 'Binder', 'Omegna', '18461924', '5', 1, 'MEDICO', 70, 2, 31, 0, 0, 'fd643d17d246c2560c4d6623d2bc8a593f8d6898fafa23e8811d8dc8f9aea554cf1f9275fcd489f31facf090ff28a81d04907ff08a29c172cc8dcc2f94e9eaf7', NOW(), 722),
('Nicolas', 'Rivas', 'Maureira', '19816660', 'k', 1, 'MEDICO', 70, 2, 31, 0, 0, '44ae4bae5464f611dd643f5828d4fcb0f6515beef297e25178b967e1701867f9247788478af2d429bb5f0a797f9e80abc93bac7af03bb1880ebb41f54f0a57e1', NOW(), 722),
('Antonia', 'Arriagada', 'Cruzat', '17961393', 'K', 1, 'MEDICO', 70, 2, 31, 0, 0, 'db211f7e8f1bf8da473712ff9fecafa2f91d10ac839a3d1c77c352ebd430e78bb1782389ef8fce8df2086d61d165f1dcc8e9773968ae1ee09ee1e3bed30fea48', NOW(), 722),
('Luisana', 'Varela', 'Alvarez', '25512579', '6', 1, 'MEDICO', 70, 2, 31, 0, 0, '5daf3d69bb0d3cc4336c69ec46aaf69e235f4fee0db006bfdde078e44b229de453fd7e3a2175d186dd8b3a9a3d433ba94c7806ec08dd098ec257add1d605078e', NOW(), 722),
('Maria', 'Parraguez', 'Pacheco', '19605566', '5', 1, 'MEDICO', 70, 2, 31, 0, 0, 'ce0b784e8779a6f098144f9cbd64c2328babcb5d1cf1ab2bea1dc04700c81f48c6891ff13f7bccf7710efa1e9ca67ea5021b12ad93c54aac59cb20e4815162eb', NOW(), 722),
('Hans', 'Stappung', 'Quintana', '19808713', '0', 1, 'MEDICO', 70, 2, 31, 0, 0, '32cf04417361492cbe7bdc11a9b42f367a25ac689d4e289b68f74476db4e14d58abf0e8076279a260bf5e1df54ceee49d9dbd5c5ac362d9d279f7de19a058833', NOW(), 722),
('Agustin', 'Giglio', 'Hernandez', '20072374', '0', 1, 'MEDICO', 70, 2, 31, 0, 0, '2d2028e0227611b049141920fa3a27576a785ff86d8736e0152cd2298a00c704e5fc5e22c1e12f96d69cb8c36d0af6d438f6533975dea8fb218af12426d775da', NOW(), 722),
('Dominique', 'Hadad', 'Plate', '19322949', '2', 1, 'MEDICO', 70, 2, 31, 0, 0, 'a2545d0329226dd08a1005cfe3d130185c469ad1d3d74df63e09a453d75a789c8c28169742690621b4ab1f1792e29d4d6c720099cf569fe56433684c9ce04219', NOW(), 722),
('Rafael', 'Jara', 'Lopez', '7440771', '4', 1, 'MEDICO', 70, 2, 31, 0, 0, 'f857f734f4fbf9fbab08f559f86d4d6fcce49473c36eab479bd208c7f759df82b837b54c9982f05841dc452786770e5955b4d14504481958e9875fe1beed885a', NOW(), 722),
('Patricio', 'Gonzalez', 'Valenzuela', '10085853', '3', 1, 'MEDICO', 70, 2, 31, 0, 0, '4975a1e5c23d9ec16da2824f5c670d5f74ed6193a936532a6bd3c960d828f7386a0006b5ca30cb142443a663ff197b56bbc0e2f019a2ef9f006c6a1805dbb788', NOW(), 722),
('Paloma', 'Contreras', 'Serrano', '19649254', '2', 1, 'MEDICO', 70, 2, 31, 0, 0, '0fac5f305b7a593c0b6bcc5784ba15c187a78eac9a4ff9afe1bff9c623e02937de9058efe04aeb3d7c6f6bf07c5ef67da399e95445d5c60b64749cba49b6819a', NOW(), 722),
('Joaquin', 'Carreño', 'Nicolas', '19523959', '2', 1, 'MEDICO', 70, 2, 31, 0, 0, '25614be32eb2c3c7b1914986e7fe58309d5310ea9981ff4a58ade4a43fcc95ac33c5474e3d912cd5e2ae5aca96fa93671453247733fedbb2642fea0dab79c8f4', NOW(), 722),
('Pilar', 'Barraza', 'Dubo', '18317004', 'k', 1, 'MEDICO', 70, 2, 31, 0, 0, '88f30cfb22f5661a0859930787c4f5203181d4c1277bcc066dfa7dcbc2a148a2378f1ef5f458c4994f483cb36d5f9a0ca57abe7de6fa6fd37b79b55a03e5fcaf', NOW(), 722),
('Maria', 'Ahumada', 'Ly', '18013352', '6', 1, 'MEDICO', 70, 2, 31, 0, 0, '658b6c5e00ec440407696682ad1f800b7b2eb5b555c9a1f599b1ea1965e99d36410509fbd8003a7d15798f5bad53d23ba446885efe19e2c8924d4b001e62756d', NOW(), 722),
('Alexandra', 'Metcalfe', 'Romo', '19670582', '1', 1, 'MEDICO', 70, 2, 31, 0, 0, '6b660a57992b949b7f1d79d73b2ecb94915738f46f3748c4e0ca477bea0b15b15b14210d3197dd16390c93e0f145e0faa2a1fb26c1e35a7adc2f31a8467db646', NOW(), 722),
('Rodolfo', 'Valenzuela', 'Caceres', '16478779', '6', 1, 'MEDICO', 70, 2, 31, 0, 0, '57d11ed23576fb3bac0f19588b8ecfb4881dc297dfe7953abebe3f7e4a86851a1a8778b938802f9c9b7bbe53b5590c63984aaba46594b04042fe8f528877d54b', NOW(), 722),
('Vicente', 'Nardini', 'Palma', '19889782', '5', 1, 'MEDICO', 70, 2, 31, 0, 0, '6c0eb6ad6031ed713d5d83c70891142d5f735f6d423b8cf5777946f33be9bb32f149a48bd07c0c3927d54988a2701867b17c52d19ea04d4d6bb18975ba571f6f', NOW(), 722),
('Rosario', 'Quinteros', 'Arevalo', '19719325', '5', 1, 'MEDICO', 70, 2, 31, 0, 0, '383870101e9c8dda79a10b69c5e268055e68f10b485c7c0902404fac55e647065c337d78c74a79faa1fe571b9d8bcd0b66a0b19901589e176e18a167c01c390b', NOW(), 722),
('Felipe', 'Carbonell', 'Bellolio', '17614919', '1', 1, 'MEDICO', 70, 2, 31, 0, 0, '6127a168a6a55f4c29cb144dcda96b44728f415a28b02b8d9f27cbd5822b34a27f59369365764dff85ef61ae17b88c2cb2955a04ef325bad5735867134632a0c', NOW(), 722),
('Diego', 'Juri', 'Yamal', '19889917', '8', 1, 'MEDICO', 70, 2, 31, 0, 0, 'aa6875c4d6fbdc517215f1c9641dc8adad5710958f3675123630c2f017a69884372c47071fbc892df01b476f9cfd40e477da99a390678f558e93ce92cfbde772', NOW(), 722),
('Michelle', 'Inciarte', 'Caraballo', '26407952', '7', 1, 'MEDICO', 70, 2, 31, 0, 0, '6c65a3b47308ab6551b645108b1983a72052d156123333f89200676bec404b6185eb385b44211679603ce19efc2026f1449353e6b44fcbc70a3e5db85135f682', NOW(), 722),
('Valentina', 'Alarcon', 'Garrido', '18661227', '2', 1, 'MEDICO', 70, 2, 31, 0, 0, 'c17e83bc9f0bc7a8768fae4856e6e0bdd16a00443e0a9eea6bf4e70d8b85ec44291013aaff41168e276b8442b8bbe0751105d28cc982ad3522f3c713bde56964', NOW(), 722),
('Mirko', 'Yurgevic', 'Martes', '22845120', '7', 1, 'MEDICO', 70, 2, 31, 0, 0, '57bff70fa82865e30c552cde4df4a29fba39edbe2c3d8d964a703e284faf44a03366588a6eeff1fe2a47cb788e5a5efc415bc270fcee75bf6e62e8c76e4c255b', NOW(), 722),
('Josefa', 'Valenzuela', 'Sarrazin', '19605199', '6', 1, 'MEDICO', 70, 2, 31, 0, 0, '666b6c041949655734d29b90ca8c42b7af89ef5a6e9791e084abe6b125867570375d1b705b78f33bbeab427f82932a17995c025d28d6868f6901cc6707194e70', NOW(), 722),
('Ignacio', 'Cruz', 'Torres', '19838580', '9', 1, 'MEDICO', 70, 2, 31, 0, 0, '23356d61d9cec103b3519bd9f46c0efd3d5ff8429e20fbfa3f931cea433318ee9c8c436e3134d2b4d1f3bed23b549695c3ae587b42e6e6e9cbe9bf4abc602c6b', NOW(), 722),
('Carlos', 'Gonzalez', 'Rojo', '14347598', '0', 1, 'MEDICO', 70, 2, 31, 0, 0, 'bfcc4a658be9d55ac8736abe1cea203ac446eb4bbbbcb581d2ec94fe1cfe39eb35f8c404470b8ce8f85abd3d054ad8084dbaa4e3e169a3b8da698f707a50f63b', NOW(), 722),
('Francisco', 'Valdivieso', 'Perez', '18681809', '1', 1, 'MEDICO', 70, 2, 31, 0, 0, '17e0af192a6afa686b6eb60dac7d4323729ed29920f0ca9a8ff093ab8b6caab03fd15745f068ecf892e4c521cc6cbc14c9899d1924e1a5da3875d270d9973ac8', NOW(), 722),
('Hernan', 'Correa', 'Vergara', '16911169', '2', 1, 'MEDICO', 70, 2, 31, 0, 0, 'fc6d664d61a85e73abb38bd1148bf0ad158fdef8e3f6d507d0e8682698438820ddb5bd7f4a3104a38c583d7ac8b57de6ee2920507786b8d7e0612a7fb0fcb45e', NOW(), 722),
('Nicolas', 'Venegas', 'Mora', '18268149', '0', 1, 'MEDICO', 70, 2, 31, 0, 0, '25bcc2e7ff8a3b825095a271cc960c7411f2f1c6180acd2b81882de0ade07a9b694b1626b7065cd728ad4e96e0d21f330a0ba1522f9e717e3378a012e55ed0cd', NOW(), 722),
('Cristian', 'Rojas', 'Bascuñan', '9993935', '4', 1, 'MEDICO', 70, 2, 31, 0, 0, '3d965c0c62758785f09e9832bb0a26ae8e0f90bf18886c154b8482330945cb1544d43b896040bf6cae7fdf43772edde215b84cf95459e48245d38cce43e6d14f', NOW(), 722),
('Benjamin', 'Panatt', 'Yates', '19687463', '1', 1, 'MEDICO', 70, 2, 31, 0, 0, '28031ccea85a6dd0787dc15be27bddf8a7ab9492bda38b998f304e6910b5bdd55d90e998d435c0162c703b7362c51bf479058a3198bd089e91cd672cc11409dd', NOW(), 722),
('Carolina', 'Herrera', 'Quiroz', '19097540', '1', 1, 'MEDICO', 70, 2, 31, 0, 0, 'bea0eb551b49373759f9d72129cad1e60388f0f5e1826ae9e873a50d16b5e68c50e2424499190079a7230b864ce410b56bea840c08822fb679b03709fa9a7c11', NOW(), 722),
('Rocio', 'Gonzalez', 'Cobos', '19421051', '5', 1, 'MEDICO', 70, 2, 31, 0, 0, '92dc6d024f8fb2cd00d5df86ccdc7c9d58413a121aa0411656cc8ca89da0cfbb00ccfa66752eb0455dd51fced556b8bd436a93b9ffc19ea6768e30ce0a0d1701', NOW(), 722),
('Francisca', 'Gallegos', 'Hernandez', '18657202', '5', 1, 'MEDICO', 70, 2, 31, 0, 0, '8d999c05d0efdfcc75ad5de049cd37d7d2e2287fed32cb984ebe3042990d20d57cfa695d6f0b6734fb1cd1f23a412b1cccc433d70631affbf1dbf40a12944537', NOW(), 722),
('Felipe', 'Vasquez', 'Walter', '17347754', '6', 1, 'MEDICO', 70, 2, 31, 0, 0, 'f69cd2ad172117393aefb51e4239dcdb8778c461730b72e3946b1ed5f85f98218fe88070abe3a4f1f299276db83a28b9910f27450ebf94ed7cd2b2934225d623', NOW(), 722),
('Daniela', 'Bruzzone', 'John', '19077982', '3', 1, 'MEDICO', 70, 2, 31, 0, 0, '49424c2a66a26a0b23ec333b127d504b6eb2c8723e9c73feaaf047773073b64a4cab6de7870fb08107d8ff6a42768313b125481a6058b8a12c6fdec06b191d77', NOW(), 722),
('Trejo', 'Diego', 'Araya', '19893895', '5', 1, 'MEDICO', 70, 2, 31, 0, 0, 'fa1b6e875b3bf9905ecf705473ca805987880411b03e7c11e4666d0d445ac4ddd8a7bb53b5163256b3bc025ca93dd8a56a2dd540a1c1875e207b7c4cc0856b80', NOW(), 722),
('Sofía', 'Barnett', 'Rose', '18637593', '9', 1, 'MEDICO', 70, 2, 31, 0, 0, '75027eaacd02963cd7c2447898abd87fd4130cddedba4b7d00b805ef3d976c646a742c93832200a4d06fd6e01575d8ce5d6bbd8d0db15480c686d2409e80e40a', NOW(), 722),
('Sebastían', 'León', 'Galaz', '16114009', '0', 1, 'MEDICO', 70, 2, 31, 0, 0, '2c81598fc9aaca9032c5ea0af09fb525029c51c40ba86e73619de60976a93d13e425aa0e61d7b1dbe695f54d5bf60f0c9b5bc4544aeede3f756f5c34600d59ad', NOW(), 722),
('Marlen', 'Ponce', 'Hernánde', '20109015', '6', 1, 'MEDICO', 70, 2, 31, 0, 0, 'c8698531353a0a071431852caa793cff04e251ddd010eb79be62d3affea88a8e091a999092591795e9648541262c763f221794cedc53621d00907b0872495165', NOW(), 722),
('Valentina', 'Holzapfel', 'San Martín', '18641622', '8', 1, 'MEDICO', 70, 2, 31, 0, 0, '99739327f11817a2f1f32ca7bf84e4450607beaccc3d9a23bb60f7edd06a0ae4323705134dd59f3d07437e0fe8534e385b5002f5016466c16af74c262828ab61', NOW(), 722),
('Camila', 'Cuevas', 'Contreras', '19091765', '7', 1, 'MEDICO', 70, 2, 31, 0, 0, 'e941f7dd8fe334a38692fd44591336990d259dcddcbdb9bf1b6466b6167b36b5eb2000c17080cb77f88e644edd763da27d23af741ce87611401d08512c61480c', NOW(), 722),
('Catalina Sofia', 'Valdés', 'Valdés', '19035277', '3', 1, 'MEDICO', 70, 2, 31, 0, 0, 'fddfda41abf514819905b123eb1e97625f02ec82936385857d6c0de11657bda9bcabe427f9e852957fd89d75537d7c5084664b06abae738764fac164b279a53f', NOW(), 722);


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
-- VERIFICACIÓN DE DATOS
-- ============================================
SELECT 'Servicios creados:' as info;
SELECT id_servicio, nombre, id_responsable, estado FROM servicio ORDER BY id_servicio;

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

-- ============================================
-- FIN DEL SCRIPT DE POBLACIÓN v5
-- ============================================