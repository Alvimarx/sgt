-- ==============================================================
-- Personal de URGENCIAS en innhosp (stand-in del hospital)
-- Generado desde la exportación de turnos del servicio 4 (Urgencias).
--
-- Para qué sirve: el login del SGT se valida contra innhosp.viewPersonal.
-- Un funcionario que existe en gestionturnos pero NO en viewPersonal no puede
-- iniciar sesión. Este script deja a las 80 personas del poblado de urgencias
-- con acceso, todas con la clave de desarrollo huap2025.
--
-- REPARA además nombres doble-codificados: el UPDATE reescribe nombre y
-- apellidos con el valor correcto, así que re-ejecutarlo corrige cargas
-- hechas por error sin utf8mb4 (mojibake tipo "NicolÃ¡s").
--
-- IMPORTANTE: cargar SIEMPRE vía el wrapper (fija utf8mb4):
--   bash scripts/mysql.sh innhosp < BaseDatosMySQL/despliegue/personal_urgencias_innhosp.sql
--
-- Clave: huap2025 -> SHA-512 hex minúsculas (formato heredado que valida el
-- DelegatingPasswordEncoder de la app; verificado contra el encoder real).
-- Idempotente. SOLO datos ficticios: nunca agregar RUTs reales (queda en git).
-- ==============================================================

USE innhosp;

SET NAMES utf8mb4;
SET @clave_dev = SHA2('huap2025', 512);

INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000001', '1', 'Ruben', 'Nissin', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000001');
UPDATE personalAux SET nombre = 'Ruben', apel_pat = 'Nissin', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000001';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000002', '2', 'Eulin', 'Klein', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000002');
UPDATE personalAux SET nombre = 'Eulin', apel_pat = 'Klein', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000002';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000003', '3', 'Mauricio', 'Muñoz', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000003');
UPDATE personalAux SET nombre = 'Mauricio', apel_pat = 'Muñoz', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000003';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000004', '4', 'Eugenio', 'Donaire', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000004');
UPDATE personalAux SET nombre = 'Eugenio', apel_pat = 'Donaire', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000004';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000005', '5', 'Mario', 'Galarce', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000005');
UPDATE personalAux SET nombre = 'Mario', apel_pat = 'Galarce', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000005';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000006', '6', 'Flavio', 'Ayala', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000006');
UPDATE personalAux SET nombre = 'Flavio', apel_pat = 'Ayala', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000006';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000007', '7', 'Carolina', 'Millacura', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000007');
UPDATE personalAux SET nombre = 'Carolina', apel_pat = 'Millacura', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000007';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000008', '8', 'Augusto', 'Araya', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000008');
UPDATE personalAux SET nombre = 'Augusto', apel_pat = 'Araya', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000008';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000009', '9', 'Miguel', 'Morales', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000009');
UPDATE personalAux SET nombre = 'Miguel', apel_pat = 'Morales', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000009';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000010', '0', 'Sandra', 'Flores', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000010');
UPDATE personalAux SET nombre = 'Sandra', apel_pat = 'Flores', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000010';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000011', '1', 'Macarena', 'Marín', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000011');
UPDATE personalAux SET nombre = 'Macarena', apel_pat = 'Marín', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000011';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000012', '2', 'David', 'Diaz', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000012');
UPDATE personalAux SET nombre = 'David', apel_pat = 'Diaz', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000012';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000013', '3', 'Camila', 'Alegria', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000013');
UPDATE personalAux SET nombre = 'Camila', apel_pat = 'Alegria', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000013';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000014', '4', 'Nicolás', 'Benedetti', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000014');
UPDATE personalAux SET nombre = 'Nicolás', apel_pat = 'Benedetti', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000014';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000015', '5', 'Carla', 'Rey', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000015');
UPDATE personalAux SET nombre = 'Carla', apel_pat = 'Rey', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000015';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000016', '6', 'Alvaro', 'Fredricksen', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000016');
UPDATE personalAux SET nombre = 'Alvaro', apel_pat = 'Fredricksen', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000016';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000017', '7', 'Marco', 'Montero', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000017');
UPDATE personalAux SET nombre = 'Marco', apel_pat = 'Montero', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000017';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000018', '8', 'Gabriela', 'Toro', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000018');
UPDATE personalAux SET nombre = 'Gabriela', apel_pat = 'Toro', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000018';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000019', '9', 'Catalina', 'Espinal', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000019');
UPDATE personalAux SET nombre = 'Catalina', apel_pat = 'Espinal', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000019';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000020', '0', 'Ricardo', 'Rojas', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000020');
UPDATE personalAux SET nombre = 'Ricardo', apel_pat = 'Rojas', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000020';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000021', '1', 'Jose', 'Mayorga', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000021');
UPDATE personalAux SET nombre = 'Jose', apel_pat = 'Mayorga', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000021';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000022', '2', 'Pilar', 'Farias', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000022');
UPDATE personalAux SET nombre = 'Pilar', apel_pat = 'Farias', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000022';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000023', '3', 'Antonia', 'Sanchez', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000023');
UPDATE personalAux SET nombre = 'Antonia', apel_pat = 'Sanchez', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000023';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000024', '4', 'Rose', 'Herrera', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000024');
UPDATE personalAux SET nombre = 'Rose', apel_pat = 'Herrera', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000024';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000025', '5', 'Joaquin', 'Collao', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000025');
UPDATE personalAux SET nombre = 'Joaquin', apel_pat = 'Collao', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000025';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000026', '6', 'Claudio', 'Ojeda', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000026');
UPDATE personalAux SET nombre = 'Claudio', apel_pat = 'Ojeda', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000026';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000027', '7', 'Matias', 'López', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000027');
UPDATE personalAux SET nombre = 'Matias', apel_pat = 'López', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000027';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000028', '8', 'Grace', 'Slater', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000028');
UPDATE personalAux SET nombre = 'Grace', apel_pat = 'Slater', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000028';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000029', '9', 'Cristian', 'Gandara', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico Urgenciólogo', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000029');
UPDATE personalAux SET nombre = 'Cristian', apel_pat = 'Gandara', apel_mat = '', estamento = 'Médico Urgenciólogo', clave = @clave_dev, estado = 1
WHERE rut = '30000029';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000030', '0', 'Catalina', 'Astudillo', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000030');
UPDATE personalAux SET nombre = 'Catalina', apel_pat = 'Astudillo', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000030';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000031', '1', 'Álvaro', 'Grupe', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000031');
UPDATE personalAux SET nombre = 'Álvaro', apel_pat = 'Grupe', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000031';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000032', '2', 'Cristina', 'Rauchfuss', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000032');
UPDATE personalAux SET nombre = 'Cristina', apel_pat = 'Rauchfuss', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000032';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000033', '3', 'Ambar', 'Zuñiga', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000033');
UPDATE personalAux SET nombre = 'Ambar', apel_pat = 'Zuñiga', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000033';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000034', '4', 'Regina', 'Piñero', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000034');
UPDATE personalAux SET nombre = 'Regina', apel_pat = 'Piñero', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000034';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000035', '5', 'Andrés', 'Vargas', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000035');
UPDATE personalAux SET nombre = 'Andrés', apel_pat = 'Vargas', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000035';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000036', '6', 'Hernán', 'Correa', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000036');
UPDATE personalAux SET nombre = 'Hernán', apel_pat = 'Correa', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000036';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000037', '7', 'Sindy', 'Lamothe', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000037');
UPDATE personalAux SET nombre = 'Sindy', apel_pat = 'Lamothe', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000037';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000038', '8', 'Jose', 'Molero', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000038');
UPDATE personalAux SET nombre = 'Jose', apel_pat = 'Molero', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000038';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000039', '9', 'Ismael', 'Laing', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000039');
UPDATE personalAux SET nombre = 'Ismael', apel_pat = 'Laing', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000039';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000040', '0', 'Pedro', 'Marín', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000040');
UPDATE personalAux SET nombre = 'Pedro', apel_pat = 'Marín', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000040';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000041', '1', 'Claudia', 'Díaz', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000041');
UPDATE personalAux SET nombre = 'Claudia', apel_pat = 'Díaz', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000041';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000042', '2', 'Joaquin', 'Galvez', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000042');
UPDATE personalAux SET nombre = 'Joaquin', apel_pat = 'Galvez', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000042';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000043', '3', 'Rolando', 'Sanchez', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000043');
UPDATE personalAux SET nombre = 'Rolando', apel_pat = 'Sanchez', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000043';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000044', '4', 'Paula', 'Escobar', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000044');
UPDATE personalAux SET nombre = 'Paula', apel_pat = 'Escobar', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000044';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000045', '5', 'Karla', 'Schweitzer', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000045');
UPDATE personalAux SET nombre = 'Karla', apel_pat = 'Schweitzer', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000045';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000046', '6', 'Tomas', 'Gatica', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000046');
UPDATE personalAux SET nombre = 'Tomas', apel_pat = 'Gatica', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000046';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000047', '7', 'Andrea', 'Carroza', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000047');
UPDATE personalAux SET nombre = 'Andrea', apel_pat = 'Carroza', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000047';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000048', '8', 'Fiorella', 'Alfieri', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000048');
UPDATE personalAux SET nombre = 'Fiorella', apel_pat = 'Alfieri', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000048';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000049', '9', 'Victor', 'Linares', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000049');
UPDATE personalAux SET nombre = 'Victor', apel_pat = 'Linares', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000049';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000050', '0', 'Johnny', 'Arias', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000050');
UPDATE personalAux SET nombre = 'Johnny', apel_pat = 'Arias', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000050';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000051', '1', 'Melanie', 'Jarpa', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000051');
UPDATE personalAux SET nombre = 'Melanie', apel_pat = 'Jarpa', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000051';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000052', '2', 'Camila', 'Bozan', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000052');
UPDATE personalAux SET nombre = 'Camila', apel_pat = 'Bozan', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000052';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000053', '3', 'Joanna', 'Vilchez', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000053');
UPDATE personalAux SET nombre = 'Joanna', apel_pat = 'Vilchez', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000053';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000054', '4', 'Tania', 'Machado', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000054');
UPDATE personalAux SET nombre = 'Tania', apel_pat = 'Machado', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000054';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000055', '5', 'Marcela', 'Valenzuela', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000055');
UPDATE personalAux SET nombre = 'Marcela', apel_pat = 'Valenzuela', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000055';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000056', '6', 'Maria Jose', 'Inostroza', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000056');
UPDATE personalAux SET nombre = 'Maria Jose', apel_pat = 'Inostroza', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000056';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000057', '7', 'Scarlet', 'Burgos', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000057');
UPDATE personalAux SET nombre = 'Scarlet', apel_pat = 'Burgos', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000057';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000058', '8', 'Carolina', 'Arcoverde', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000058');
UPDATE personalAux SET nombre = 'Carolina', apel_pat = 'Arcoverde', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000058';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000059', '9', 'Rodrigo', 'Rios', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000059');
UPDATE personalAux SET nombre = 'Rodrigo', apel_pat = 'Rios', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000059';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000060', '0', 'Montserrat', 'Cunill', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000060');
UPDATE personalAux SET nombre = 'Montserrat', apel_pat = 'Cunill', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000060';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000061', '1', 'Belen', 'Jorquera', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000061');
UPDATE personalAux SET nombre = 'Belen', apel_pat = 'Jorquera', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000061';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000062', '2', 'Camila', 'Corvalán', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000062');
UPDATE personalAux SET nombre = 'Camila', apel_pat = 'Corvalán', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000062';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000063', '3', 'Domingo', 'Andreani', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000063');
UPDATE personalAux SET nombre = 'Domingo', apel_pat = 'Andreani', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000063';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000064', '4', 'Macarena', 'Hipp', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000064');
UPDATE personalAux SET nombre = 'Macarena', apel_pat = 'Hipp', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000064';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000065', '5', 'Alejandro', 'Núñez', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000065');
UPDATE personalAux SET nombre = 'Alejandro', apel_pat = 'Núñez', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000065';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000066', '6', 'Maria', 'Houston', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000066');
UPDATE personalAux SET nombre = 'Maria', apel_pat = 'Houston', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000066';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000067', '7', 'Maria Ignacia', 'Horta', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000067');
UPDATE personalAux SET nombre = 'Maria Ignacia', apel_pat = 'Horta', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000067';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000068', '8', 'Bruno', 'Di Cosmo', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000068');
UPDATE personalAux SET nombre = 'Bruno', apel_pat = 'Di Cosmo', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000068';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000069', '9', 'Daniela', 'García', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000069');
UPDATE personalAux SET nombre = 'Daniela', apel_pat = 'García', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000069';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000070', '0', 'Pablo', 'Garrido', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000070');
UPDATE personalAux SET nombre = 'Pablo', apel_pat = 'Garrido', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000070';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000071', '1', 'Manuel', 'Candia', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000071');
UPDATE personalAux SET nombre = 'Manuel', apel_pat = 'Candia', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000071';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000072', '2', 'Jose', 'Castañeda', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000072');
UPDATE personalAux SET nombre = 'Jose', apel_pat = 'Castañeda', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000072';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000073', '3', 'Valery', 'Gallardo', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000073');
UPDATE personalAux SET nombre = 'Valery', apel_pat = 'Gallardo', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000073';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000074', '4', 'Macarena', 'Briones', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000074');
UPDATE personalAux SET nombre = 'Macarena', apel_pat = 'Briones', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000074';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000075', '5', 'Diego', 'Torres', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000075');
UPDATE personalAux SET nombre = 'Diego', apel_pat = 'Torres', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000075';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000076', '6', 'Nicolas', 'Cid', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000076');
UPDATE personalAux SET nombre = 'Nicolas', apel_pat = 'Cid', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000076';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000077', '7', 'Francisco', 'Echeverria', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000077');
UPDATE personalAux SET nombre = 'Francisco', apel_pat = 'Echeverria', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000077';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000078', '8', 'Alvaro', 'Lopez', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000078');
UPDATE personalAux SET nombre = 'Alvaro', apel_pat = 'Lopez', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000078';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000079', '9', 'Alexandra', 'Metcalfe', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000079');
UPDATE personalAux SET nombre = 'Alexandra', apel_pat = 'Metcalfe', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000079';
INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, telefono, emailProfesional, emailPersonal, profesion, id_estamento, estamento, clave, estado, date_added)
SELECT 'USUARIO', '30000080', '0', 'Pailla', 'Gatiga', '', 0, NULL, NULL, NULL, NULL, NULL, 'Médico General', @clave_dev, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM personalAux WHERE rut = '30000080');
UPDATE personalAux SET nombre = 'Pailla', apel_pat = 'Gatiga', apel_mat = '', estamento = 'Médico General', clave = @clave_dev, estado = 1
WHERE rut = '30000080';

-- Verificación 1: deben ser 80 con la clave correcta y estado activo.
SELECT COUNT(*) AS con_acceso FROM viewPersonal
WHERE estado = 1 AND clave = @clave_dev AND rut IN ('30000001', '30000002', '30000003', '30000004', '30000005', '30000006', '30000007', '30000008', '30000009', '30000010', '30000011', '30000012', '30000013', '30000014', '30000015', '30000016', '30000017', '30000018', '30000019', '30000020', '30000021', '30000022', '30000023', '30000024', '30000025', '30000026', '30000027', '30000028', '30000029', '30000030', '30000031', '30000032', '30000033', '30000034', '30000035', '30000036', '30000037', '30000038', '30000039', '30000040', '30000041', '30000042', '30000043', '30000044', '30000045', '30000046', '30000047', '30000048', '30000049', '30000050', '30000051', '30000052', '30000053', '30000054', '30000055', '30000056', '30000057', '30000058', '30000059', '30000060', '30000061', '30000062', '30000063', '30000064', '30000065', '30000066', '30000067', '30000068', '30000069', '30000070', '30000071', '30000072', '30000073', '30000074', '30000075', '30000076', '30000077', '30000078', '30000079', '30000080');

-- Verificación 2: no debe quedar ningún nombre doble-codificado.
SELECT COUNT(*) AS nombres_corruptos FROM personalAux
WHERE CONCAT(nombre,' ',apel_pat) LIKE CONCAT('%',CHAR(0xC383 USING binary),'%')
   OR CONCAT(nombre,' ',apel_pat) LIKE CONCAT('%',CHAR(0xC382 USING binary),'%');
