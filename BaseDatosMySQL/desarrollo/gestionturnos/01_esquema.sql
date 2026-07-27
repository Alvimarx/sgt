-- gestionturnos · 01 · ESQUEMA (crea la base y las tablas)
CREATE DATABASE IF NOT EXISTS gestionturnos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gestionturnos;



/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `Bitacora_eventos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Bitacora_eventos` (
  `ID_EVENTO` bigint NOT NULL AUTO_INCREMENT,
  `Activo` bit(1) DEFAULT NULL,
  `Fecha_fin_afectada` datetime(6) DEFAULT NULL,
  `Fecha_inicio_afectada` datetime(6) DEFAULT NULL,
  `Fecha_modificacion` datetime(6) DEFAULT NULL,
  `Motivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Observaciones` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Tipo_evento` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ID_FUNCIONARIO` bigint DEFAULT NULL,
  `ID_SOLICITUD` bigint DEFAULT NULL,
  `ID_TURNO` bigint DEFAULT NULL,
  PRIMARY KEY (`ID_EVENTO`),
  KEY `FK3d8k6xj39fs4a3co4dfgk6hg1` (`ID_FUNCIONARIO`),
  KEY `FK4tiw7fp8y1kwbcbpqbyha6vmj` (`ID_SOLICITUD`),
  KEY `FK25juthdpgd81aevyh83fw0xyk` (`ID_TURNO`),
  CONSTRAINT `FK25juthdpgd81aevyh83fw0xyk` FOREIGN KEY (`ID_TURNO`) REFERENCES `Turnos` (`id_turno`),
  CONSTRAINT `FK3d8k6xj39fs4a3co4dfgk6hg1` FOREIGN KEY (`ID_FUNCIONARIO`) REFERENCES `Funcionario` (`ID_FUNCIONARIO`),
  CONSTRAINT `FK4tiw7fp8y1kwbcbpqbyha6vmj` FOREIGN KEY (`ID_SOLICITUD`) REFERENCES `Solicitudes` (`ID_SOLICITUD`)
) ENGINE=InnoDB AUTO_INCREMENT=1279 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Funcionario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Funcionario` (
  `ID_FUNCIONARIO` bigint NOT NULL AUTO_INCREMENT,
  `Apel_mat` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Apel_pat` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `DV` varchar(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eliminado` bit(1) NOT NULL DEFAULT b'0',
  `Estado` int NOT NULL,
  `Nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Profesion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Rut` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ID_ROL_SISTEMA` bigint NOT NULL,
  PRIMARY KEY (`ID_FUNCIONARIO`),
  UNIQUE KEY `uk_funcionario_rut_dv` (`Rut`,`DV`),
  KEY `FKsyi3if5330m8nuowocxyv7ejh` (`ID_ROL_SISTEMA`),
  CONSTRAINT `FKsyi3if5330m8nuowocxyv7ejh` FOREIGN KEY (`ID_ROL_SISTEMA`) REFERENCES `Rol_Sistema` (`id_rol_sistema`)
) ENGINE=InnoDB AUTO_INCREMENT=381 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Notificacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Notificacion` (
  `ID_NOTIFICACION` bigint NOT NULL AUTO_INCREMENT,
  `Estado` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Fecha_envio` datetime(6) DEFAULT NULL,
  `Mensaje` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ID_SOLICITUD` bigint DEFAULT NULL,
  PRIMARY KEY (`ID_NOTIFICACION`),
  UNIQUE KEY `UKjoa61bkbr5grkypgd3qg8upot` (`ID_SOLICITUD`),
  CONSTRAINT `FKjsko8ct32wgfoiif8y0c1apfa` FOREIGN KEY (`ID_SOLICITUD`) REFERENCES `Solicitudes` (`ID_SOLICITUD`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Oferta_General`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Oferta_General` (
  `ID_OFERTA_GENERAL` bigint NOT NULL AUTO_INCREMENT,
  `Estado` enum('ABIERTA','CERRADA','PENDIENTE_APROBACION','RECHAZADA') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Fecha_creacion` datetime(6) DEFAULT NULL,
  `Motivo` text COLLATE utf8mb4_unicode_ci,
  `ID_OFERTOR` bigint DEFAULT NULL,
  `ID_TURNO` bigint DEFAULT NULL,
  PRIMARY KEY (`ID_OFERTA_GENERAL`),
  KEY `FK1igkl0bi7ulfkod4rgeyg7x8b` (`ID_OFERTOR`),
  KEY `FK5v8arjmj8owpf18msyugrdjlu` (`ID_TURNO`),
  CONSTRAINT `FK1igkl0bi7ulfkod4rgeyg7x8b` FOREIGN KEY (`ID_OFERTOR`) REFERENCES `Funcionario` (`ID_FUNCIONARIO`),
  CONSTRAINT `FK5v8arjmj8owpf18msyugrdjlu` FOREIGN KEY (`ID_TURNO`) REFERENCES `Turnos` (`id_turno`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Postulacion_Oferta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Postulacion_Oferta` (
  `ID_POSTULACION` bigint NOT NULL AUTO_INCREMENT,
  `Fecha_postulacion` datetime(6) DEFAULT NULL,
  `Seleccionado` bit(1) DEFAULT NULL,
  `ID_OFERTA_GENERAL` bigint DEFAULT NULL,
  `ID_POSTULANTE` bigint DEFAULT NULL,
  PRIMARY KEY (`ID_POSTULACION`),
  KEY `FKfu3osrsrllia5gf1ivjrnnseb` (`ID_OFERTA_GENERAL`),
  KEY `FK9xq8vxm16axhk8wlpy4ogfw3p` (`ID_POSTULANTE`),
  CONSTRAINT `FK9xq8vxm16axhk8wlpy4ogfw3p` FOREIGN KEY (`ID_POSTULANTE`) REFERENCES `Funcionario` (`ID_FUNCIONARIO`),
  CONSTRAINT `FKfu3osrsrllia5gf1ivjrnnseb` FOREIGN KEY (`ID_OFERTA_GENERAL`) REFERENCES `Oferta_General` (`ID_OFERTA_GENERAL`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Rol_Servicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Rol_Servicio` (
  `id_rol_servicio` bigint NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_rol_servicio`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Rol_Sistema`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Rol_Sistema` (
  `id_rol_sistema` bigint NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_rol_sistema`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Servicios_Funcionario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Servicios_Funcionario` (
  `id_servicios_funcionario` bigint NOT NULL AUTO_INCREMENT,
  `ID_FUNCIONARIO` bigint NOT NULL,
  `id_rol_servicio` bigint NOT NULL,
  `id_servicio` bigint NOT NULL,
  PRIMARY KEY (`id_servicios_funcionario`),
  KEY `FK8psi9x900ehrbu546ihgdj786` (`ID_FUNCIONARIO`),
  KEY `FKad0esyhbb7j9i8oh4s0ius4hv` (`id_rol_servicio`),
  KEY `FKfe2nkwtb6r8mjwo5x08iprjyo` (`id_servicio`),
  CONSTRAINT `FK8psi9x900ehrbu546ihgdj786` FOREIGN KEY (`ID_FUNCIONARIO`) REFERENCES `Funcionario` (`ID_FUNCIONARIO`),
  CONSTRAINT `FKad0esyhbb7j9i8oh4s0ius4hv` FOREIGN KEY (`id_rol_servicio`) REFERENCES `Rol_Servicio` (`id_rol_servicio`),
  CONSTRAINT `FKfe2nkwtb6r8mjwo5x08iprjyo` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id_servicio`)
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Solicitudes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Solicitudes` (
  `ID_SOLICITUD` bigint NOT NULL AUTO_INCREMENT,
  `Aceptado_Receptor` bit(1) DEFAULT NULL,
  `Estado` enum('APROBADA','PENDIENTE','RECHAZADA') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Fecha_creacion` datetime(6) DEFAULT NULL,
  `Fecha_inicio_permiso` datetime(6) DEFAULT NULL,
  `Fecha_termino_permiso` datetime(6) DEFAULT NULL,
  `Motivo` text COLLATE utf8mb4_unicode_ci,
  `ID_FUNCIONARIO` bigint DEFAULT NULL,
  `ID_FUNCIONARIO_RECEPTOR` bigint DEFAULT NULL,
  `ID_TIPO_SOLICITUD` bigint DEFAULT NULL,
  `ID_TURNO` bigint DEFAULT NULL,
  `ID_TURNO_RECEPTOR` bigint DEFAULT NULL,
  PRIMARY KEY (`ID_SOLICITUD`),
  KEY `FKl2f9rb8c2cqulaiyxmlbehoxf` (`ID_FUNCIONARIO`),
  KEY `FKoia055adq1sjra776y0y1mmd5` (`ID_FUNCIONARIO_RECEPTOR`),
  KEY `FKd5avpbo4g1km7v1b2se1ndrc` (`ID_TIPO_SOLICITUD`),
  KEY `FK1y06c7l1d9mdk9of03ave8gvo` (`ID_TURNO`),
  KEY `FK5pubbns94ss7ll7rsm7fdsjwc` (`ID_TURNO_RECEPTOR`),
  CONSTRAINT `FK1y06c7l1d9mdk9of03ave8gvo` FOREIGN KEY (`ID_TURNO`) REFERENCES `Turnos` (`id_turno`),
  CONSTRAINT `FK5pubbns94ss7ll7rsm7fdsjwc` FOREIGN KEY (`ID_TURNO_RECEPTOR`) REFERENCES `Turnos` (`id_turno`),
  CONSTRAINT `FKd5avpbo4g1km7v1b2se1ndrc` FOREIGN KEY (`ID_TIPO_SOLICITUD`) REFERENCES `Tipo_Solicitud` (`ID_TIPO_SOLICITUD`),
  CONSTRAINT `FKl2f9rb8c2cqulaiyxmlbehoxf` FOREIGN KEY (`ID_FUNCIONARIO`) REFERENCES `Funcionario` (`ID_FUNCIONARIO`),
  CONSTRAINT `FKoia055adq1sjra776y0y1mmd5` FOREIGN KEY (`ID_FUNCIONARIO_RECEPTOR`) REFERENCES `Funcionario` (`ID_FUNCIONARIO`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Tipo_Solicitud`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Tipo_Solicitud` (
  `ID_TIPO_SOLICITUD` bigint NOT NULL AUTO_INCREMENT,
  `Tipo` int DEFAULT NULL,
  PRIMARY KEY (`ID_TIPO_SOLICITUD`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Turnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Turnos` (
  `id_turno` bigint NOT NULL AUTO_INCREMENT,
  `dia_final_turno` date NOT NULL,
  `dia_inicio_turno` date NOT NULL,
  `eliminado` bit(1) NOT NULL DEFAULT b'0',
  `hora_fin` time NOT NULL,
  `hora_inicio` time NOT NULL,
  `ID_FUNCIONARIO` bigint DEFAULT NULL,
  `id_puesto` bigint DEFAULT NULL,
  `id_rotativa` bigint DEFAULT NULL,
  `id_servicio` bigint DEFAULT NULL,
  `id_tipo_turno` bigint DEFAULT NULL,
  PRIMARY KEY (`id_turno`),
  KEY `idx_servicio_fechas` (`id_servicio`,`dia_inicio_turno`,`dia_final_turno`),
  KEY `FKjuqya6p9su3qaduuiuaxveeoe` (`ID_FUNCIONARIO`),
  KEY `FKbvioeagy3t0oegqkoks2el7f3` (`id_puesto`),
  KEY `FKm6m7hv524i4wbqbb26viian1d` (`id_rotativa`),
  KEY `FKsslrcfasrx4ahdljwn8ivksq7` (`id_tipo_turno`),
  CONSTRAINT `FKbvioeagy3t0oegqkoks2el7f3` FOREIGN KEY (`id_puesto`) REFERENCES `puestos` (`id`),
  CONSTRAINT `FKgnmy0o3e61ql8l2y639g6n4cj` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id_servicio`),
  CONSTRAINT `FKjuqya6p9su3qaduuiuaxveeoe` FOREIGN KEY (`ID_FUNCIONARIO`) REFERENCES `Funcionario` (`ID_FUNCIONARIO`),
  CONSTRAINT `FKm6m7hv524i4wbqbb26viian1d` FOREIGN KEY (`id_rotativa`) REFERENCES `rotativa` (`id_rotativa`),
  CONSTRAINT `FKsslrcfasrx4ahdljwn8ivksq7` FOREIGN KEY (`id_tipo_turno`) REFERENCES `tipo_turno` (`id_tipo_turno`)
) ENGINE=InnoDB AUTO_INCREMENT=1372 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `feriados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feriados` (
  `id_feriado` bigint NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` date NOT NULL,
  PRIMARY KEY (`id_feriado`),
  UNIQUE KEY `UKaiqu1mrndveim9i5hfr5cxaot` (`fecha`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `planificacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `planificacion` (
  `id_planificacion` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_servicio` bigint NOT NULL,
  PRIMARY KEY (`id_planificacion`),
  UNIQUE KEY `UKrv15u8qd942ucxk4q3xffk2n7` (`id_servicio`,`nombre`),
  CONSTRAINT `FKi5p7isrwolu4r7bncpli6b3tk` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id_servicio`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `planificacion_asignacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `planificacion_asignacion` (
  `id_asignacion` bigint NOT NULL AUTO_INCREMENT,
  `id_funcionario` bigint DEFAULT NULL,
  `id_planificacion` bigint NOT NULL,
  `id_puesto` bigint DEFAULT NULL,
  `id_rotativa` bigint NOT NULL,
  PRIMARY KEY (`id_asignacion`),
  KEY `FKn3v9sj5k2barvshs653cckjpw` (`id_funcionario`),
  KEY `FKe3ksqeyr6c718ajcnnplmv9hm` (`id_planificacion`),
  KEY `FKlyj04ve055akv6gds3ja4w5xt` (`id_puesto`),
  KEY `FKjdeyg3ah69f8aaxmqp656ckns` (`id_rotativa`),
  CONSTRAINT `FKe3ksqeyr6c718ajcnnplmv9hm` FOREIGN KEY (`id_planificacion`) REFERENCES `planificacion` (`id_planificacion`),
  CONSTRAINT `FKjdeyg3ah69f8aaxmqp656ckns` FOREIGN KEY (`id_rotativa`) REFERENCES `rotativa` (`id_rotativa`),
  CONSTRAINT `FKlyj04ve055akv6gds3ja4w5xt` FOREIGN KEY (`id_puesto`) REFERENCES `puestos` (`id`),
  CONSTRAINT `FKn3v9sj5k2barvshs653cckjpw` FOREIGN KEY (`id_funcionario`) REFERENCES `Funcionario` (`ID_FUNCIONARIO`)
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `puestos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `puestos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `eliminado` bit(1) NOT NULL DEFAULT b'0',
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_servicio` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKfycc1r767pjpcug21bdsr1l2f` (`id_servicio`),
  CONSTRAINT `FKfycc1r767pjpcug21bdsr1l2f` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id_servicio`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reglas_horarios_turnos_servicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reglas_horarios_turnos_servicio` (
  `id_regla` bigint NOT NULL AUTO_INCREMENT,
  `aplica_feriado` bit(1) NOT NULL,
  `aplica_fin_de_semana` bit(1) NOT NULL,
  `eliminado` bit(1) NOT NULL DEFAULT b'0',
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tiempo_minutos` int NOT NULL,
  `id_servicio` bigint NOT NULL,
  `id_tipo_turno_fin` bigint DEFAULT NULL,
  `id_tipo_turno_inicio` bigint DEFAULT NULL,
  PRIMARY KEY (`id_regla`),
  KEY `FKkmvddw9a5cv60nwc0ugpe4ssr` (`id_servicio`),
  KEY `FK8wg14uhahpmkon6259n8scv0e` (`id_tipo_turno_fin`),
  KEY `FKh5teco4n7c9soo97sv4lqhlnh` (`id_tipo_turno_inicio`),
  CONSTRAINT `FK8wg14uhahpmkon6259n8scv0e` FOREIGN KEY (`id_tipo_turno_fin`) REFERENCES `tipo_turno` (`id_tipo_turno`),
  CONSTRAINT `FKh5teco4n7c9soo97sv4lqhlnh` FOREIGN KEY (`id_tipo_turno_inicio`) REFERENCES `tipo_turno` (`id_tipo_turno`),
  CONSTRAINT `FKkmvddw9a5cv60nwc0ugpe4ssr` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id_servicio`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rotativa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rotativa` (
  `id_rotativa` bigint NOT NULL AUTO_INCREMENT,
  `eliminado` bit(1) NOT NULL DEFAULT b'0',
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `semanas` tinyint NOT NULL,
  `id_servicio` bigint NOT NULL,
  PRIMARY KEY (`id_rotativa`),
  KEY `FKkep0y5t0ud0rhjbsmq6qrdm32` (`id_servicio`),
  CONSTRAINT `FKkep0y5t0ud0rhjbsmq6qrdm32` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id_servicio`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rotativa_secuencia_dias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rotativa_secuencia_dias` (
  `id_rotativa_dia` bigint NOT NULL AUTO_INCREMENT,
  `dia_index` int NOT NULL,
  `id_rotativa` bigint NOT NULL,
  `id_tipo_turno` bigint DEFAULT NULL,
  PRIMARY KEY (`id_rotativa_dia`),
  KEY `FKt1nuh5b3txp43vcvqr3g5fdtv` (`id_rotativa`),
  KEY `FKngxabdme6u5nil8sbxgyt3646` (`id_tipo_turno`),
  CONSTRAINT `FKngxabdme6u5nil8sbxgyt3646` FOREIGN KEY (`id_tipo_turno`) REFERENCES `tipo_turno` (`id_tipo_turno`),
  CONSTRAINT `FKt1nuh5b3txp43vcvqr3g5fdtv` FOREIGN KEY (`id_rotativa`) REFERENCES `rotativa` (`id_rotativa`)
) ENGINE=InnoDB AUTO_INCREMENT=323 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `servicios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicios` (
  `id_servicio` bigint NOT NULL AUTO_INCREMENT,
  `eliminado` bit(1) NOT NULL DEFAULT b'0',
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_servicio`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tipo_turno`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipo_turno` (
  `id_tipo_turno` bigint NOT NULL AUTO_INCREMENT,
  `eliminado` bit(1) NOT NULL DEFAULT b'0',
  `hora_inicio` time NOT NULL,
  `hora_termino` time NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_servicio` bigint NOT NULL,
  PRIMARY KEY (`id_tipo_turno`),
  UNIQUE KEY `UK80l5u3x4wxwhgws5tvpnge6uh` (`id_servicio`,`nombre`),
  CONSTRAINT `FK6cdmctpk3jpf662pwv2hj3ksc` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id_servicio`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

