-- ============================================================
-- BOOTSTRAP DE ADMINISTRADOR (para una BD creada desde cero)
-- ============================================================
-- Problema que resuelve: en una BD nueva no hay servicios, y el
-- login obliga a elegir uno → el administrador no podría entrar.
-- Este script deja lo mínimo para que un ADMINISTRADOR inicie
-- sesión y, ya dentro, cree los servicios reales desde el panel.
--
-- Deja:
--   - Roles de sistema y de servicio (catálogos).
--   - Tipos de solicitud y feriados (datos base del sistema).
--   - Un servicio inicial "Administración" (landing de arranque).
--   - El administrador Álvaro López (RUT 17599096-8).
--   - Sus credenciales en el hospital (innhosp) → clave: huap2025.
--
-- Es idempotente: se puede ejecutar varias veces sin duplicar.
-- Requiere el ESQUEMA ya creado (schema_gestionturnos.sql + innhosp).
-- ============================================================

-- ---------- App (gestionturnos) ----------
USE gestionturnos;

-- Catálogo de roles de sistema (global). 1 = ADMINISTRADOR, 2 = USUARIO.
INSERT IGNORE INTO Rol_Sistema  (id_rol_sistema,  nombre_rol) VALUES (1, 'ADMINISTRADOR'), (2, 'USUARIO');

-- Catálogo de roles por servicio. 1 = JEFATURA, 2 = SUBROGANTE, 3 = MEDICO.
INSERT IGNORE INTO Rol_Servicio (id_rol_servicio, nombre_rol) VALUES (1, 'JEFATURA'), (2, 'SUBROGANTE'), (3, 'MEDICO');

-- Tipos de solicitud. 1=Permiso 2=Botar turno 3=Cobertura 4=Intercambio 5=Oferta Particular.
INSERT IGNORE INTO Tipo_Solicitud (ID_TIPO_SOLICITUD, Tipo) VALUES (1, 1), (2, 2), (3, 3), (4, 4), (5, 5);

-- Feriados de Chile 2025-2026 (el motor de horarios los consulta; el front colorea el preview).
INSERT IGNORE INTO feriados (fecha, descripcion) VALUES
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

-- Servicio inicial de arranque. El admin entra aquí y luego crea los servicios reales.
-- (Puedes eliminarlo/renombrarlo después, una vez existan otros servicios.)
INSERT INTO servicios (nombre, eliminado)
SELECT 'Administración', 0
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre = 'Administración');

-- Administrador del sistema (ID_ROL_SISTEMA = 1 = ADMINISTRADOR).
-- No requiere fila en Servicios_Funcionario: por ser ADMINISTRADOR ve todos los servicios.
INSERT INTO Funcionario (Nombre, Apel_pat, Apel_mat, Rut, DV, Estado, eliminado, Profesion, ID_ROL_SISTEMA)
SELECT 'Álvaro', 'López', '', '17599096', '8', 1, 0, 'Médico Urgenciólogo', 1
WHERE NOT EXISTS (SELECT 1 FROM Funcionario WHERE Rut = '17599096' AND DV = '8');
