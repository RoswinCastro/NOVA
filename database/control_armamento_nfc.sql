-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generacion: 07-07-2026 a las 17:18:08
-- Version del servidor: 10.4.32-MariaDB
-- Version de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `control_armamento_nfc`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `armas`
--

CREATE TABLE `armas` (
  `SERIAL_ARMA` varchar(20) NOT NULL,
  `TAG_NFC` varchar(50) NOT NULL,
  `MODELO` varchar(50) NOT NULL,
  `TIPO` varchar(30) NOT NULL,
  `CALIBRE` varchar(20) NOT NULL,
  `CAPACIDAD_CARGA` int(11) NOT NULL,
  `ESTADO_DISPONIBILIDAD` enum('DISPONIBLE','ASIGNADO','MANTENIMIENTO') NOT NULL DEFAULT 'DISPONIBLE',
  `URL_IMAGEN_ACCION` varchar(250) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `armas`
--

INSERT INTO `armas` (`SERIAL_ARMA`, `TAG_NFC`, `MODELO`, `TIPO`, `CALIBRE`, `CAPACIDAD_CARGA`, `ESTADO_DISPONIBILIDAD`, `URL_IMAGEN_ACCION`) VALUES
('AK103-998822', 'NFC_TAG_XYZ_777', 'AK-103', 'Fusil de Asalto', '7.62x39mm', 30, 'DISPONIBLE', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `companias`
--

CREATE TABLE `companias` (
  `ID_COMPANIA` int(11) NOT NULL,
  `NOMBRE_COMPANIA` varchar(50) NOT NULL,
  `NUM_REGIMIENTO` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `companias`
--

INSERT INTO `companias` (`ID_COMPANIA`, `NOMBRE_COMPANIA`, `NUM_REGIMIENTO`) VALUES
(1, 'Primera Compania', 'Regimiento Tactico 1');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cargadores`
--

CREATE TABLE `cargadores` (
  `ID_CARGADOR` bigint(20) NOT NULL,
  `NOMBRE` varchar(80) NOT NULL,
  `CAPACIDAD` int(11) NOT NULL,
  `CANTIDAD_DISPONIBLE` int(11) NOT NULL DEFAULT 0,
  `ESTADO` enum('DISPONIBLE','RESERVA','MANTENIMIENTO') NOT NULL DEFAULT 'DISPONIBLE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `cargadores`
--

INSERT INTO `cargadores` (`ID_CARGADOR`, `NOMBRE`, `CAPACIDAD`, `CANTIDAD_DISPONIBLE`, `ESTADO`) VALUES
(1, 'Cargador AK-103', 30, 12, 'DISPONIBLE');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `parques`
--

CREATE TABLE `parques` (
  `ID_PARQUE` bigint(20) NOT NULL,
  `NOMBRE` varchar(80) NOT NULL,
  `DESCRIPCION` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `parque_armas`
--

CREATE TABLE `parque_armas` (
  `ID_PARQUE` bigint(20) NOT NULL,
  `SERIAL_ARMA` varchar(20) NOT NULL,
  `ASIGNADO_EN` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `folio_revistas`
--

CREATE TABLE `folio_revistas` (
  `ID_FOLIO` bigint(20) NOT NULL,
  `GRUPO_FECHA_HORA` datetime NOT NULL,
  `ID_CEDULA_PERSONAL` varchar(20) NOT NULL,
  `PUESTO_SERVICIO` varchar(40) NOT NULL,
  `REVISTA_GRUPO` varchar(40) NOT NULL,
  `CEDULA_INSPECTOR` varchar(20) NOT NULL,
  `OBSERVACION` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `folio_revistas`
--

INSERT INTO `folio_revistas` (`ID_FOLIO`, `GRUPO_FECHA_HORA`, `ID_CEDULA_PERSONAL`, `PUESTO_SERVICIO`, `REVISTA_GRUPO`, `CEDULA_INSPECTOR`, `OBSERVACION`) VALUES
(1, '2026-07-07 11:15:03', 'V-87654321', 'Garita Principal', 'Grupo de Reaccion', 'V-12345678', 'Armamento limpio, sin novedades mecanicas.');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `jerarquias`
--

CREATE TABLE `jerarquias` (
  `ID_JERARQUIA` int(11) NOT NULL,
  `NOMBRE_JERARQUIA` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `jerarquias`
--

INSERT INTO `jerarquias` (`ID_JERARQUIA`, `NOMBRE_JERARQUIA`) VALUES
(1, 'Sargento Segundo'),
(2, 'Teniente');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos`
--

CREATE TABLE `movimientos` (
  `ID_MOVIMIENTO` bigint(20) NOT NULL,
  `TIPO_MOVIMIENTO` enum('ENTRADA','SALIDA') NOT NULL,
  `ID_CEDULA_PERSONAL` varchar(20) NOT NULL,
  `SERIAL_ARMA` varchar(20) NOT NULL,
  `CANTIDAD_CARGADORES` int(11) NOT NULL DEFAULT 0,
  `CANTIDAD_MUNICION` int(11) NOT NULL DEFAULT 0,
  `GRUPO_FECHA_HORA` datetime NOT NULL,
  `MOTIVO` varchar(200) NOT NULL,
  `UID_LECTOR_NFC` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `movimientos`
--

INSERT INTO `movimientos` (`ID_MOVIMIENTO`, `TIPO_MOVIMIENTO`, `ID_CEDULA_PERSONAL`, `SERIAL_ARMA`, `CANTIDAD_CARGADORES`, `CANTIDAD_MUNICION`, `GRUPO_FECHA_HORA`, `MOTIVO`, `UID_LECTOR_NFC`) VALUES
(1, 'SALIDA', 'V-87654321', 'AK103-998822', 3, 90, '2026-07-07 11:15:02', 'Servicio de Guardia', 'LECTOR_PUERTA_ALFA');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `personal_militar`
--

CREATE TABLE `personal_militar` (
  `CEDULA` varchar(20) NOT NULL,
  `ID_JERARQUIA` int(11) NOT NULL,
  `NOMBRE` varchar(50) NOT NULL,
  `APELLIDO` varchar(50) NOT NULL,
  `CONTINGENTE` varchar(50) NOT NULL,
  `ID_COMPANIA` int(11) NOT NULL,
  `TELEFONO` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `personal_militar`
--

INSERT INTO `personal_militar` (`CEDULA`, `ID_JERARQUIA`, `NOMBRE`, `APELLIDO`, `CONTINGENTE`, `ID_COMPANIA`, `TELEFONO`) VALUES
('V-12345678', 2, 'Carlos', 'Mendoza', 'Fijo', 1, '0412-1111111'),
('V-87654321', 1, 'Luis', 'Gomez', 'Mayo 2026', 1, '0414-2222222');

--
-- Indices para tablas volcadas
--

--
-- Indices de la tabla `armas`
--

ALTER TABLE `armas`
  ADD PRIMARY KEY (`SERIAL_ARMA`),
  ADD UNIQUE KEY `UQ_TAG_NFC` (`TAG_NFC`),
  ADD KEY `IDX_ARMAS_NFC` (`TAG_NFC`);

--
-- Indices de la tabla `companias`
--

ALTER TABLE `companias`
  ADD PRIMARY KEY (`ID_COMPANIA`);

--
-- Indices de la tabla `cargadores`
--

ALTER TABLE `cargadores`
  ADD PRIMARY KEY (`ID_CARGADOR`);

--
-- Indices de la tabla `parques`
--

ALTER TABLE `parques`
  ADD PRIMARY KEY (`ID_PARQUE`),
  ADD UNIQUE KEY `UQ_PARQUES_NOMBRE` (`NOMBRE`);

--
-- Indices de la tabla `parque_armas`
--

ALTER TABLE `parque_armas`
  ADD PRIMARY KEY (`ID_PARQUE`,`SERIAL_ARMA`),
  ADD KEY `FK_PARQUE_ARMAS_ARMA` (`SERIAL_ARMA`);

--
-- Indices de la tabla `folio_revistas`
--

ALTER TABLE `folio_revistas`
  ADD PRIMARY KEY (`ID_FOLIO`),
  ADD KEY `FK_REVISTAS_PERSONAL` (`ID_CEDULA_PERSONAL`),
  ADD KEY `FK_REVISTAS_INSPECTOR` (`CEDULA_INSPECTOR`);

--
-- Indices de la tabla `jerarquias`
--

ALTER TABLE `jerarquias`
  ADD PRIMARY KEY (`ID_JERARQUIA`);

--
-- Indices de la tabla `movimientos`
--

ALTER TABLE `movimientos`
  ADD PRIMARY KEY (`ID_MOVIMIENTO`),
  ADD KEY `FK_MOVIMIENTOS_PERSONAL` (`ID_CEDULA_PERSONAL`),
  ADD KEY `FK_MOVIMIENTOS_ARMA` (`SERIAL_ARMA`),
  ADD KEY `IDX_MOVIMIENTOS_FECHA` (`GRUPO_FECHA_HORA`);

--
-- Indices de la tabla `personal_militar`
--

ALTER TABLE `personal_militar`
  ADD PRIMARY KEY (`CEDULA`),
  ADD KEY `FK_PERSONAL_JERARQUIA` (`ID_JERARQUIA`),
  ADD KEY `FK_PERSONAL_COMPANIA` (`ID_COMPANIA`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

ALTER TABLE `companias`
  MODIFY `ID_COMPANIA` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

ALTER TABLE `cargadores`
  MODIFY `ID_CARGADOR` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

ALTER TABLE `parques`
  MODIFY `ID_PARQUE` bigint(20) NOT NULL AUTO_INCREMENT;

ALTER TABLE `folio_revistas`
  MODIFY `ID_FOLIO` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

ALTER TABLE `jerarquias`
  MODIFY `ID_JERARQUIA` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

ALTER TABLE `movimientos`
  MODIFY `ID_MOVIMIENTO` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Restricciones para tablas volcadas
--

ALTER TABLE `folio_revistas`
  ADD CONSTRAINT `FK_REVISTAS_INSPECTOR` FOREIGN KEY (`CEDULA_INSPECTOR`) REFERENCES `personal_militar` (`CEDULA`) ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_REVISTAS_PERSONAL` FOREIGN KEY (`ID_CEDULA_PERSONAL`) REFERENCES `personal_militar` (`CEDULA`) ON UPDATE CASCADE;

ALTER TABLE `movimientos`
  ADD CONSTRAINT `FK_MOVIMIENTOS_ARMA` FOREIGN KEY (`SERIAL_ARMA`) REFERENCES `armas` (`SERIAL_ARMA`) ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_MOVIMIENTOS_PERSONAL` FOREIGN KEY (`ID_CEDULA_PERSONAL`) REFERENCES `personal_militar` (`CEDULA`) ON UPDATE CASCADE;

ALTER TABLE `parque_armas`
  ADD CONSTRAINT `FK_PARQUE_ARMAS_ARMA` FOREIGN KEY (`SERIAL_ARMA`) REFERENCES `armas` (`SERIAL_ARMA`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_PARQUE_ARMAS_PARQUE` FOREIGN KEY (`ID_PARQUE`) REFERENCES `parques` (`ID_PARQUE`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `personal_militar`
  ADD CONSTRAINT `FK_PERSONAL_COMPANIA` FOREIGN KEY (`ID_COMPANIA`) REFERENCES `companias` (`ID_COMPANIA`) ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_PERSONAL_JERARQUIA` FOREIGN KEY (`ID_JERARQUIA`) REFERENCES `jerarquias` (`ID_JERARQUIA`) ON UPDATE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
