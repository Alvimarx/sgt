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
