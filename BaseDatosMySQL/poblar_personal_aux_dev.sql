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

USE innhosp2;

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
(206, 'USUARIO',  '11111117', '7', 'Diego',     'Rojas',    'Mora',    1, '912345206', 'diego.rojas@huap.cl',     'diego.rojas@gmail.com',     31, NULL, 'Médico', @dev_password_hash, 1, NOW());

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================== 
-- VERIFICACIÓN
-- ============================================================== 
SELECT 'personalAux' AS tabla, COUNT(*) AS filas FROM personalAux;
SELECT * FROM viewPersonal ORDER BY id_personal;
