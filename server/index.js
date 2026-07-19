const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'control_armamento_nfc',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const PERSONAL_SELECT = `
  SELECT p.*,
         j.NOMBRE_JERARQUIA AS JERARQUIA_NOMBRE,
         c.NOMBRE_COMPANIA AS COMPANIA_NOMBRE,
         c.NUM_REGIMIENTO
  FROM personal_militar p
  JOIN jerarquias j ON p.ID_JERARQUIA = j.ID_JERARQUIA
  JOIN companias c ON p.ID_COMPANIA = c.ID_COMPANIA
`;

const MOVIMIENTOS_SELECT = `
  SELECT m.*,
         CONCAT(p.NOMBRE, ' ', p.APELLIDO) AS NOMBRE_COMPLETO,
         p.NOMBRE,
         p.APELLIDO,
         j.NOMBRE_JERARQUIA AS JERARQUIA_NOMBRE,
         c.NOMBRE_COMPANIA AS COMPANIA_NOMBRE,
         a.MODELO AS MODELO_ARMA,
         a.TAG_NFC,
         a.ESTADO_DISPONIBILIDAD
  FROM movimientos m
  JOIN personal_militar p ON m.ID_CEDULA_PERSONAL = p.CEDULA
  JOIN jerarquias j ON p.ID_JERARQUIA = j.ID_JERARQUIA
  JOIN companias c ON p.ID_COMPANIA = c.ID_COMPANIA
  JOIN armas a ON m.SERIAL_ARMA = a.SERIAL_ARMA
`;

const FOLIOS_SELECT = `
  SELECT f.*,
         CONCAT(p.NOMBRE, ' ', p.APELLIDO) AS NOMBRE_PERSONAL,
         CONCAT(i.NOMBRE, ' ', i.APELLIDO) AS NOMBRE_INSPECTOR
  FROM folio_revistas f
  JOIN personal_militar p ON f.ID_CEDULA_PERSONAL = p.CEDULA
  JOIN personal_militar i ON f.CEDULA_INSPECTOR = i.CEDULA
`;

const VALID_WEAPON_STATES = new Set(['DISPONIBLE', 'ASIGNADO', 'MANTENIMIENTO']);
const VALID_MAGAZINE_STATES = new Set(['DISPONIBLE', 'RESERVA', 'MANTENIMIENTO']);
const VALID_MOVEMENT_TYPES = new Set(['ENTRADA', 'SALIDA']);

function isFilled(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function toNullableString(value) {
  if (!isFilled(value)) {
    return null;
  }

  return String(value).trim();
}

function toInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function normalizeDateTime(value) {
  if (!isFilled(value)) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function sendInternalError(res, context, error) {
  console.error(context, error);
  res.status(500).json({ error: 'Error interno del servidor' });
}

function isForeignKeyRestrictionError(error) {
  return error && (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED');
}

async function ensureCargadoresTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cargadores (
      ID_CARGADOR BIGINT NOT NULL AUTO_INCREMENT,
      NOMBRE VARCHAR(80) NOT NULL,
      CAPACIDAD INT NOT NULL,
      CANTIDAD_DISPONIBLE INT NOT NULL DEFAULT 0,
      ESTADO ENUM('DISPONIBLE', 'RESERVA', 'MANTENIMIENTO') NOT NULL DEFAULT 'DISPONIBLE',
      PRIMARY KEY (ID_CARGADOR)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
}

async function ensureParquesTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS parques (
      ID_PARQUE BIGINT NOT NULL AUTO_INCREMENT,
      NOMBRE VARCHAR(80) NOT NULL,
      DESCRIPCION VARCHAR(200) DEFAULT NULL,
      PRIMARY KEY (ID_PARQUE),
      UNIQUE KEY UQ_PARQUES_NOMBRE (NOMBRE)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS parque_armas (
      ID_PARQUE BIGINT NOT NULL,
      SERIAL_ARMA VARCHAR(20) NOT NULL,
      ASIGNADO_EN DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (ID_PARQUE, SERIAL_ARMA),
      CONSTRAINT FK_PARQUE_ARMAS_PARQUE
        FOREIGN KEY (ID_PARQUE) REFERENCES parques (ID_PARQUE)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
      CONSTRAINT FK_PARQUE_ARMAS_ARMA
        FOREIGN KEY (SERIAL_ARMA) REFERENCES armas (SERIAL_ARMA)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
}

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Conectado a MySQL/MariaDB correctamente');
    connection.release();
    await ensureCargadoresTable();
    await ensureParquesTables();
  } catch (error) {
    console.error('Error conectando a MySQL/MariaDB:', error.message);
    console.log('Verifica que el servicio este levantado y que server/.env sea correcto');
  }
}

testConnection();

app.get('/api/personal', async (req, res) => {
  try {
    const { q } = req.query;
    const filters = [];
    const params = [];

    if (isFilled(q)) {
      filters.push('(p.CEDULA LIKE ? OR p.NOMBRE LIKE ? OR p.APELLIDO LIKE ? OR c.NOMBRE_COMPANIA LIKE ? OR j.NOMBRE_JERARQUIA LIKE ?)');
      const pattern = `%${String(q).trim()}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    const query = `
      ${PERSONAL_SELECT}
      ${filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY p.CEDULA ASC
    `;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    sendInternalError(res, 'Error en GET /api/personal:', error);
  }
});

app.get('/api/personal/:cedula', async (req, res) => {
  try {
    const { cedula } = req.params;
    const [rows] = await pool.query(
      `
        ${PERSONAL_SELECT}
        WHERE p.CEDULA = ?
      `,
      [cedula]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Personal no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en GET /api/personal/:cedula:', error);
  }
});

app.post('/api/personal', async (req, res) => {
  try {
    const { CEDULA, ID_JERARQUIA, NOMBRE, APELLIDO, CONTINGENTE, ID_COMPANIA, TELEFONO } = req.body;

    if (!isFilled(CEDULA) || !isFilled(ID_JERARQUIA) || !isFilled(NOMBRE) || !isFilled(APELLIDO) || !isFilled(CONTINGENTE) || !isFilled(ID_COMPANIA)) {
      return res.status(400).json({ error: 'Faltan campos obligatorios del personal' });
    }

    const [existingRows] = await pool.query('SELECT CEDULA FROM personal_militar WHERE CEDULA = ?', [String(CEDULA).trim()]);
    if (existingRows.length > 0) {
      return res.status(409).json({ error: 'La cedula ya existe' });
    }

    await pool.query(
      `
        INSERT INTO personal_militar
          (CEDULA, ID_JERARQUIA, NOMBRE, APELLIDO, CONTINGENTE, ID_COMPANIA, TELEFONO)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        String(CEDULA).trim(),
        toInteger(ID_JERARQUIA),
        String(NOMBRE).trim(),
        String(APELLIDO).trim(),
        String(CONTINGENTE).trim(),
        toInteger(ID_COMPANIA),
        toNullableString(TELEFONO),
      ]
    );

    const [createdRows] = await pool.query(
      `
        ${PERSONAL_SELECT}
        WHERE p.CEDULA = ?
      `,
      [String(CEDULA).trim()]
    );

    res.status(201).json(createdRows[0]);
  } catch (error) {
    if (error && error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Jerarquia o compania invalida' });
    }

    sendInternalError(res, 'Error en POST /api/personal:', error);
  }
});

app.put('/api/personal/:cedula', async (req, res) => {
  try {
    const { cedula } = req.params;
    const { ID_JERARQUIA, NOMBRE, APELLIDO, CONTINGENTE, ID_COMPANIA, TELEFONO } = req.body;

    if (!isFilled(ID_JERARQUIA) || !isFilled(NOMBRE) || !isFilled(APELLIDO) || !isFilled(CONTINGENTE) || !isFilled(ID_COMPANIA)) {
      return res.status(400).json({ error: 'Faltan campos obligatorios del personal' });
    }

    const [result] = await pool.query(
      `
        UPDATE personal_militar
        SET ID_JERARQUIA = ?,
            NOMBRE = ?,
            APELLIDO = ?,
            CONTINGENTE = ?,
            ID_COMPANIA = ?,
            TELEFONO = ?
        WHERE CEDULA = ?
      `,
      [
        toInteger(ID_JERARQUIA),
        String(NOMBRE).trim(),
        String(APELLIDO).trim(),
        String(CONTINGENTE).trim(),
        toInteger(ID_COMPANIA),
        toNullableString(TELEFONO),
        cedula,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Personal no encontrado' });
    }

    const [updatedRows] = await pool.query(
      `
        ${PERSONAL_SELECT}
        WHERE p.CEDULA = ?
      `,
      [cedula]
    );

    res.json(updatedRows[0]);
  } catch (error) {
    if (error && error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Jerarquia o compania invalida' });
    }

    sendInternalError(res, 'Error en PUT /api/personal/:cedula:', error);
  }
});

app.delete('/api/personal/:cedula', async (req, res) => {
  try {
    const { cedula } = req.params;
    const [result] = await pool.query('DELETE FROM personal_militar WHERE CEDULA = ?', [cedula]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Personal no encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    if (isForeignKeyRestrictionError(error)) {
      return res.status(409).json({ error: 'No se puede eliminar el personal porque tiene registros asociados' });
    }

    sendInternalError(res, 'Error en DELETE /api/personal/:cedula:', error);
  }
});

app.get('/api/armas', async (req, res) => {
  try {
    const { estado } = req.query;
    const params = [];
    let query = 'SELECT * FROM armas';

    if (isFilled(estado)) {
      query += ' WHERE ESTADO_DISPONIBILIDAD = ?';
      params.push(String(estado).trim());
    }

    query += ' ORDER BY MODELO ASC, SERIAL_ARMA ASC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    sendInternalError(res, 'Error en GET /api/armas:', error);
  }
});

app.post('/api/armas', async (req, res) => {
  try {
    const {
      SERIAL_ARMA,
      TAG_NFC,
      MODELO,
      TIPO,
      CALIBRE,
      CAPACIDAD_CARGA,
      ESTADO_DISPONIBILIDAD,
      URL_IMAGEN_ACCION,
    } = req.body;

    if (!isFilled(SERIAL_ARMA) || !isFilled(TAG_NFC) || !isFilled(MODELO) || !isFilled(TIPO) || !isFilled(CALIBRE) || !isFilled(CAPACIDAD_CARGA)) {
      return res.status(400).json({ error: 'Faltan campos obligatorios del arma' });
    }

    const estado = isFilled(ESTADO_DISPONIBILIDAD) ? String(ESTADO_DISPONIBILIDAD).trim() : 'DISPONIBLE';
    if (!VALID_WEAPON_STATES.has(estado)) {
      return res.status(400).json({ error: 'Estado de disponibilidad invalido' });
    }

    const [serialRows] = await pool.query('SELECT SERIAL_ARMA FROM armas WHERE SERIAL_ARMA = ?', [String(SERIAL_ARMA).trim()]);
    if (serialRows.length > 0) {
      return res.status(409).json({ error: 'El serial del arma ya existe' });
    }

    const [tagRows] = await pool.query('SELECT TAG_NFC FROM armas WHERE TAG_NFC = ?', [String(TAG_NFC).trim()]);
    if (tagRows.length > 0) {
      return res.status(409).json({ error: 'El TAG NFC ya existe' });
    }

    await pool.query(
      `
        INSERT INTO armas
          (SERIAL_ARMA, TAG_NFC, MODELO, TIPO, CALIBRE, CAPACIDAD_CARGA, ESTADO_DISPONIBILIDAD, URL_IMAGEN_ACCION)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        String(SERIAL_ARMA).trim(),
        String(TAG_NFC).trim(),
        String(MODELO).trim(),
        String(TIPO).trim(),
        String(CALIBRE).trim(),
        toInteger(CAPACIDAD_CARGA),
        estado,
        toNullableString(URL_IMAGEN_ACCION),
      ]
    );

    const [createdRows] = await pool.query('SELECT * FROM armas WHERE SERIAL_ARMA = ?', [String(SERIAL_ARMA).trim()]);
    res.status(201).json(createdRows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en POST /api/armas:', error);
  }
});

app.get('/api/armas/nfc/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    const [rows] = await pool.query('SELECT * FROM armas WHERE TAG_NFC = ?', [tag]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Arma no encontrada' });
    }

    res.json(rows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en GET /api/armas/nfc/:tag:', error);
  }
});

app.get('/api/armas/:serial', async (req, res) => {
  try {
    const { serial } = req.params;
    const [rows] = await pool.query('SELECT * FROM armas WHERE SERIAL_ARMA = ?', [serial]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Arma no encontrada' });
    }

    res.json(rows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en GET /api/armas/:serial:', error);
  }
});

app.put('/api/armas/:serial', async (req, res) => {
  try {
    const { serial } = req.params;
    const {
      TAG_NFC,
      MODELO,
      TIPO,
      CALIBRE,
      CAPACIDAD_CARGA,
      ESTADO_DISPONIBILIDAD,
      URL_IMAGEN_ACCION,
    } = req.body;

    if (!isFilled(TAG_NFC) || !isFilled(MODELO) || !isFilled(TIPO) || !isFilled(CALIBRE) || !isFilled(CAPACIDAD_CARGA) || !isFilled(ESTADO_DISPONIBILIDAD)) {
      return res.status(400).json({ error: 'Faltan campos obligatorios del arma' });
    }

    const estado = String(ESTADO_DISPONIBILIDAD).trim();
    if (!VALID_WEAPON_STATES.has(estado)) {
      return res.status(400).json({ error: 'Estado de disponibilidad invalido' });
    }

    const [tagRows] = await pool.query(
      'SELECT SERIAL_ARMA FROM armas WHERE TAG_NFC = ? AND SERIAL_ARMA <> ?',
      [String(TAG_NFC).trim(), serial]
    );
    if (tagRows.length > 0) {
      return res.status(409).json({ error: 'El TAG NFC ya existe en otra arma' });
    }

    const [result] = await pool.query(
      `
        UPDATE armas
        SET TAG_NFC = ?,
            MODELO = ?,
            TIPO = ?,
            CALIBRE = ?,
            CAPACIDAD_CARGA = ?,
            ESTADO_DISPONIBILIDAD = ?,
            URL_IMAGEN_ACCION = ?
        WHERE SERIAL_ARMA = ?
      `,
      [
        String(TAG_NFC).trim(),
        String(MODELO).trim(),
        String(TIPO).trim(),
        String(CALIBRE).trim(),
        toInteger(CAPACIDAD_CARGA),
        estado,
        toNullableString(URL_IMAGEN_ACCION),
        serial,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Arma no encontrada' });
    }

    const [updatedRows] = await pool.query('SELECT * FROM armas WHERE SERIAL_ARMA = ?', [serial]);
    res.json(updatedRows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en PUT /api/armas/:serial:', error);
  }
});

app.patch('/api/armas/:serial/estado', async (req, res) => {
  try {
    const { serial } = req.params;
    const { estado } = req.body;

    if (!isFilled(estado) || !VALID_WEAPON_STATES.has(String(estado).trim())) {
      return res.status(400).json({ error: 'Estado de disponibilidad invalido' });
    }

    const [result] = await pool.query(
      'UPDATE armas SET ESTADO_DISPONIBILIDAD = ? WHERE SERIAL_ARMA = ?',
      [String(estado).trim(), serial]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Arma no encontrada' });
    }

    const [updatedRows] = await pool.query('SELECT * FROM armas WHERE SERIAL_ARMA = ?', [serial]);
    res.json(updatedRows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en PATCH /api/armas/:serial/estado:', error);
  }
});

app.delete('/api/armas/:serial', async (req, res) => {
  try {
    const { serial } = req.params;
    const [result] = await pool.query('DELETE FROM armas WHERE SERIAL_ARMA = ?', [serial]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Arma no encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    if (isForeignKeyRestrictionError(error)) {
      return res.status(409).json({ error: 'No se puede eliminar el arma porque tiene registros asociados' });
    }

    sendInternalError(res, 'Error en DELETE /api/armas/:serial:', error);
  }
});

app.get('/api/cargadores', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cargadores ORDER BY NOMBRE ASC, CAPACIDAD ASC, ID_CARGADOR ASC');
    res.json(rows);
  } catch (error) {
    sendInternalError(res, 'Error en GET /api/cargadores:', error);
  }
});

app.post('/api/cargadores', async (req, res) => {
  try {
    const { NOMBRE, CAPACIDAD, CANTIDAD_DISPONIBLE, ESTADO } = req.body;

    if (!isFilled(NOMBRE) || !isFilled(CAPACIDAD) || !isFilled(CANTIDAD_DISPONIBLE)) {
      return res.status(400).json({ error: 'Faltan campos obligatorios del cargador' });
    }

    const estadoNormalizado = isFilled(ESTADO) ? String(ESTADO).trim() : 'DISPONIBLE';
    if (!VALID_MAGAZINE_STATES.has(estadoNormalizado)) {
      return res.status(400).json({ error: 'Estado del cargador invalido' });
    }

    const capacidad = toInteger(CAPACIDAD, -1);
    const cantidad = toInteger(CANTIDAD_DISPONIBLE, -1);
    if (capacidad < 0 || cantidad < 0) {
      return res.status(400).json({ error: 'Capacidad y cantidad deben ser valores positivos o cero' });
    }

    const [result] = await pool.query(
      `
        INSERT INTO cargadores
          (NOMBRE, CAPACIDAD, CANTIDAD_DISPONIBLE, ESTADO)
        VALUES (?, ?, ?, ?)
      `,
      [String(NOMBRE).trim(), capacidad, cantidad, estadoNormalizado]
    );

    const [createdRows] = await pool.query('SELECT * FROM cargadores WHERE ID_CARGADOR = ?', [result.insertId]);
    res.status(201).json(createdRows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en POST /api/cargadores:', error);
  }
});

app.put('/api/cargadores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { NOMBRE, CAPACIDAD, CANTIDAD_DISPONIBLE, ESTADO } = req.body;

    if (!isFilled(NOMBRE) || !isFilled(CAPACIDAD) || !isFilled(CANTIDAD_DISPONIBLE) || !isFilled(ESTADO)) {
      return res.status(400).json({ error: 'Faltan campos obligatorios del cargador' });
    }

    const estadoNormalizado = String(ESTADO).trim();
    if (!VALID_MAGAZINE_STATES.has(estadoNormalizado)) {
      return res.status(400).json({ error: 'Estado del cargador invalido' });
    }

    const capacidad = toInteger(CAPACIDAD, -1);
    const cantidad = toInteger(CANTIDAD_DISPONIBLE, -1);
    if (capacidad < 0 || cantidad < 0) {
      return res.status(400).json({ error: 'Capacidad y cantidad deben ser valores positivos o cero' });
    }

    const [result] = await pool.query(
      `
        UPDATE cargadores
        SET NOMBRE = ?,
            CAPACIDAD = ?,
            CANTIDAD_DISPONIBLE = ?,
            ESTADO = ?
        WHERE ID_CARGADOR = ?
      `,
      [String(NOMBRE).trim(), capacidad, cantidad, estadoNormalizado, toInteger(id)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cargador no encontrado' });
    }

    const [updatedRows] = await pool.query('SELECT * FROM cargadores WHERE ID_CARGADOR = ?', [toInteger(id)]);
    res.json(updatedRows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en PUT /api/cargadores/:id:', error);
  }
});

app.delete('/api/cargadores/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM cargadores WHERE ID_CARGADOR = ?', [toInteger(req.params.id)]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cargador no encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    sendInternalError(res, 'Error en DELETE /api/cargadores/:id:', error);
  }
});

app.get('/api/parques', async (req, res) => {
  try {
    const serial = isFilled(req.query.serial) ? String(req.query.serial).trim() : null;

    const query = serial
      ? `
          SELECT p.ID_PARQUE,
                 p.NOMBRE,
                 p.DESCRIPCION,
                 COUNT(pa_all.SERIAL_ARMA) AS CANTIDAD_ARMAS,
                 MAX(CASE WHEN pa_serial.SERIAL_ARMA IS NULL THEN 0 ELSE 1 END) AS TIENE_ARMA
          FROM parques p
          LEFT JOIN parque_armas pa_all ON pa_all.ID_PARQUE = p.ID_PARQUE
          LEFT JOIN parque_armas pa_serial
            ON pa_serial.ID_PARQUE = p.ID_PARQUE
           AND pa_serial.SERIAL_ARMA = ?
          GROUP BY p.ID_PARQUE, p.NOMBRE, p.DESCRIPCION
          ORDER BY p.NOMBRE ASC, p.ID_PARQUE ASC
        `
      : `
          SELECT p.ID_PARQUE,
                 p.NOMBRE,
                 p.DESCRIPCION,
                 COUNT(pa.SERIAL_ARMA) AS CANTIDAD_ARMAS
          FROM parques p
          LEFT JOIN parque_armas pa ON pa.ID_PARQUE = p.ID_PARQUE
          GROUP BY p.ID_PARQUE, p.NOMBRE, p.DESCRIPCION
          ORDER BY p.NOMBRE ASC, p.ID_PARQUE ASC
        `;

    const [rows] = await pool.query(query, serial ? [serial] : []);
    res.json(rows);
  } catch (error) {
    sendInternalError(res, 'Error en GET /api/parques:', error);
  }
});

app.post('/api/parques', async (req, res) => {
  try {
    const { NOMBRE, DESCRIPCION } = req.body;

    if (!isFilled(NOMBRE)) {
      return res.status(400).json({ error: 'El nombre del parque es obligatorio' });
    }

    const nombre = String(NOMBRE).trim();
    const [duplicateRows] = await pool.query('SELECT ID_PARQUE FROM parques WHERE NOMBRE = ?', [nombre]);
    if (duplicateRows.length > 0) {
      return res.status(409).json({ error: 'Ya existe un parque con ese nombre' });
    }

    const [result] = await pool.query(
      `
        INSERT INTO parques
          (NOMBRE, DESCRIPCION)
        VALUES (?, ?)
      `,
      [nombre, toNullableString(DESCRIPCION)]
    );

    const [createdRows] = await pool.query(
      `
        SELECT p.ID_PARQUE,
               p.NOMBRE,
               p.DESCRIPCION,
               COUNT(pa.SERIAL_ARMA) AS CANTIDAD_ARMAS
        FROM parques p
        LEFT JOIN parque_armas pa ON pa.ID_PARQUE = p.ID_PARQUE
        WHERE p.ID_PARQUE = ?
        GROUP BY p.ID_PARQUE, p.NOMBRE, p.DESCRIPCION
      `,
      [result.insertId]
    );

    res.status(201).json(createdRows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en POST /api/parques:', error);
  }
});

app.put('/api/parques/:id', async (req, res) => {
  try {
    const id = toInteger(req.params.id);
    const { NOMBRE, DESCRIPCION } = req.body;

    if (!isFilled(NOMBRE)) {
      return res.status(400).json({ error: 'El nombre del parque es obligatorio' });
    }

    const nombre = String(NOMBRE).trim();
    const [duplicateRows] = await pool.query(
      'SELECT ID_PARQUE FROM parques WHERE NOMBRE = ? AND ID_PARQUE <> ?',
      [nombre, id]
    );
    if (duplicateRows.length > 0) {
      return res.status(409).json({ error: 'Ya existe un parque con ese nombre' });
    }

    const [result] = await pool.query(
      `
        UPDATE parques
        SET NOMBRE = ?,
            DESCRIPCION = ?
        WHERE ID_PARQUE = ?
      `,
      [nombre, toNullableString(DESCRIPCION), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Parque no encontrado' });
    }

    const [updatedRows] = await pool.query(
      `
        SELECT p.ID_PARQUE,
               p.NOMBRE,
               p.DESCRIPCION,
               COUNT(pa.SERIAL_ARMA) AS CANTIDAD_ARMAS
        FROM parques p
        LEFT JOIN parque_armas pa ON pa.ID_PARQUE = p.ID_PARQUE
        WHERE p.ID_PARQUE = ?
        GROUP BY p.ID_PARQUE, p.NOMBRE, p.DESCRIPCION
      `,
      [id]
    );

    res.json(updatedRows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en PUT /api/parques/:id:', error);
  }
});

app.delete('/api/parques/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM parques WHERE ID_PARQUE = ?', [toInteger(req.params.id)]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Parque no encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    sendInternalError(res, 'Error en DELETE /api/parques/:id:', error);
  }
});

app.post('/api/parques/:id/armas', async (req, res) => {
  try {
    const idParque = toInteger(req.params.id);
    const { SERIAL_ARMA } = req.body;

    if (!isFilled(SERIAL_ARMA)) {
      return res.status(400).json({ error: 'El serial del arma es obligatorio' });
    }

    const serial = String(SERIAL_ARMA).trim();

    const [parqueRows] = await pool.query('SELECT ID_PARQUE FROM parques WHERE ID_PARQUE = ?', [idParque]);
    if (parqueRows.length === 0) {
      return res.status(404).json({ error: 'Parque no encontrado' });
    }

    const [armaRows] = await pool.query('SELECT SERIAL_ARMA FROM armas WHERE SERIAL_ARMA = ?', [serial]);
    if (armaRows.length === 0) {
      return res.status(404).json({ error: 'Arma no encontrada' });
    }

    const [existingRows] = await pool.query(
      'SELECT ID_PARQUE FROM parque_armas WHERE ID_PARQUE = ? AND SERIAL_ARMA = ?',
      [idParque, serial]
    );
    if (existingRows.length > 0) {
      return res.status(409).json({ error: 'El arma ya esta asignada a este parque' });
    }

    await pool.query(
      `
        INSERT INTO parque_armas
          (ID_PARQUE, SERIAL_ARMA)
        VALUES (?, ?)
      `,
      [idParque, serial]
    );

    res.status(204).send();
  } catch (error) {
    sendInternalError(res, 'Error en POST /api/parques/:id/armas:', error);
  }
});

app.delete('/api/parques/:id/armas/:serial', async (req, res) => {
  try {
    const idParque = toInteger(req.params.id);
    const serial = String(req.params.serial).trim();
    const [result] = await pool.query(
      'DELETE FROM parque_armas WHERE ID_PARQUE = ? AND SERIAL_ARMA = ?',
      [idParque, serial]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'La asignacion del arma en el parque no existe' });
    }

    res.status(204).send();
  } catch (error) {
    sendInternalError(res, 'Error en DELETE /api/parques/:id/armas/:serial:', error);
  }
});

app.get('/api/movimientos', async (req, res) => {
  try {
    const { cedula, serial, fechaInicio, fechaFin, limite } = req.query;
    const filters = [];
    const params = [];

    if (isFilled(cedula)) {
      filters.push('m.ID_CEDULA_PERSONAL = ?');
      params.push(String(cedula).trim());
    }

    if (isFilled(serial)) {
      filters.push('m.SERIAL_ARMA = ?');
      params.push(String(serial).trim());
    }

    if (isFilled(fechaInicio)) {
      filters.push('m.GRUPO_FECHA_HORA >= ?');
      params.push(normalizeDateTime(fechaInicio));
    }

    if (isFilled(fechaFin)) {
      filters.push('m.GRUPO_FECHA_HORA <= ?');
      params.push(normalizeDateTime(fechaFin));
    }

    const maxRows = Math.max(1, Math.min(toInteger(limite, 200), 500));
    const query = `
      ${MOVIMIENTOS_SELECT}
      ${filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY m.GRUPO_FECHA_HORA DESC, m.ID_MOVIMIENTO DESC
      LIMIT ?
    `;

    params.push(maxRows);
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    sendInternalError(res, 'Error en GET /api/movimientos:', error);
  }
});

app.get('/api/movimientos/ultimos', async (req, res) => {
  try {
    const limite = Math.max(1, Math.min(toInteger(req.query.limite, 50), 200));
    const [rows] = await pool.query(
      `
        ${MOVIMIENTOS_SELECT}
        ORDER BY m.GRUPO_FECHA_HORA DESC, m.ID_MOVIMIENTO DESC
        LIMIT ?
      `,
      [limite]
    );

    res.json(rows);
  } catch (error) {
    sendInternalError(res, 'Error en GET /api/movimientos/ultimos:', error);
  }
});

app.post('/api/movimientos', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      TIPO_MOVIMIENTO,
      ID_CEDULA_PERSONAL,
      SERIAL_ARMA,
      CANTIDAD_CARGADORES,
      CANTIDAD_MUNICION,
      MOTIVO,
      UID_LECTOR_NFC,
    } = req.body;

    if (!isFilled(TIPO_MOVIMIENTO) || !isFilled(ID_CEDULA_PERSONAL) || !isFilled(SERIAL_ARMA)) {
      return res.status(400).json({ error: 'Faltan campos obligatorios del movimiento' });
    }

    const tipoMovimiento = String(TIPO_MOVIMIENTO).trim().toUpperCase();
    if (!VALID_MOVEMENT_TYPES.has(tipoMovimiento)) {
      return res.status(400).json({ error: 'Tipo de movimiento invalido' });
    }

    await connection.beginTransaction();

    const [personalRows] = await connection.query('SELECT CEDULA FROM personal_militar WHERE CEDULA = ?', [String(ID_CEDULA_PERSONAL).trim()]);
    if (personalRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Personal no encontrado' });
    }

    const [armaRows] = await connection.query('SELECT * FROM armas WHERE SERIAL_ARMA = ?', [String(SERIAL_ARMA).trim()]);
    if (armaRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Arma no encontrada' });
    }

    const arma = armaRows[0];
    if (tipoMovimiento === 'SALIDA' && arma.ESTADO_DISPONIBILIDAD !== 'DISPONIBLE') {
      await connection.rollback();
      return res.status(409).json({ error: 'El arma no esta disponible para salida' });
    }

    if (tipoMovimiento === 'ENTRADA' && arma.ESTADO_DISPONIBILIDAD !== 'ASIGNADO') {
      await connection.rollback();
      return res.status(409).json({ error: 'El arma no esta asignada para registrar entrada' });
    }

    const [result] = await connection.query(
      `
        INSERT INTO movimientos
          (TIPO_MOVIMIENTO, ID_CEDULA_PERSONAL, SERIAL_ARMA, CANTIDAD_CARGADORES, CANTIDAD_MUNICION, GRUPO_FECHA_HORA, MOTIVO, UID_LECTOR_NFC)
        VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)
      `,
      [
        tipoMovimiento,
        String(ID_CEDULA_PERSONAL).trim(),
        String(SERIAL_ARMA).trim(),
        toInteger(CANTIDAD_CARGADORES, 0),
        toInteger(CANTIDAD_MUNICION, 0),
        toNullableString(MOTIVO) || '',
        toNullableString(UID_LECTOR_NFC) || 'WEB_APP',
      ]
    );

    const nuevoEstado = tipoMovimiento === 'SALIDA' ? 'ASIGNADO' : 'DISPONIBLE';
    await connection.query('UPDATE armas SET ESTADO_DISPONIBILIDAD = ? WHERE SERIAL_ARMA = ?', [nuevoEstado, String(SERIAL_ARMA).trim()]);

    const [createdRows] = await connection.query(
      `
        ${MOVIMIENTOS_SELECT}
        WHERE m.ID_MOVIMIENTO = ?
      `,
      [result.insertId]
    );

    await connection.commit();
    res.status(201).json(createdRows[0]);
  } catch (error) {
    await connection.rollback();
    sendInternalError(res, 'Error en POST /api/movimientos:', error);
  } finally {
    connection.release();
  }
});

app.post('/api/lectores/procesar', async (req, res) => {
  try {
    const { tagNFC, tipoMovimiento, uidLector } = req.body;

    if (!isFilled(tagNFC) || !isFilled(tipoMovimiento)) {
      return res.status(400).json({ error: 'Faltan datos para procesar la lectura NFC' });
    }

    const [armaRows] = await pool.query(
      'SELECT * FROM armas WHERE TAG_NFC = ? OR SERIAL_ARMA = ?',
      [String(tagNFC).trim(), String(tagNFC).trim()]
    );

    if (armaRows.length === 0) {
      return res.status(404).json({ error: 'Arma no encontrada' });
    }

    const arma = armaRows[0];
    let personalCedula = null;

    if (String(tipoMovimiento).trim().toUpperCase() === 'ENTRADA') {
      const [ultimoMovimientoRows] = await pool.query(
        `
          SELECT ID_CEDULA_PERSONAL
          FROM movimientos
          WHERE SERIAL_ARMA = ? AND TIPO_MOVIMIENTO = 'SALIDA'
          ORDER BY GRUPO_FECHA_HORA DESC, ID_MOVIMIENTO DESC
          LIMIT 1
        `,
        [arma.SERIAL_ARMA]
      );

      if (ultimoMovimientoRows.length > 0) {
        personalCedula = ultimoMovimientoRows[0].ID_CEDULA_PERSONAL;
      }
    }

    res.json({
      arma,
      personalCedula,
      uidLector: toNullableString(uidLector),
      message: 'Lectura NFC procesada exitosamente',
    });
  } catch (error) {
    sendInternalError(res, 'Error en POST /api/lectores/procesar:', error);
  }
});

app.get('/api/folio-revistas', async (req, res) => {
  try {
    const { cedula, fechaInicio, fechaFin, limite } = req.query;
    const filters = [];
    const params = [];

    if (isFilled(cedula)) {
      filters.push('(f.ID_CEDULA_PERSONAL = ? OR f.CEDULA_INSPECTOR = ?)');
      params.push(String(cedula).trim(), String(cedula).trim());
    }

    if (isFilled(fechaInicio)) {
      filters.push('f.GRUPO_FECHA_HORA >= ?');
      params.push(normalizeDateTime(fechaInicio));
    }

    if (isFilled(fechaFin)) {
      filters.push('f.GRUPO_FECHA_HORA <= ?');
      params.push(normalizeDateTime(fechaFin));
    }

    const maxRows = Math.max(1, Math.min(toInteger(limite, 200), 500));
    const query = `
      ${FOLIOS_SELECT}
      ${filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY f.GRUPO_FECHA_HORA DESC, f.ID_FOLIO DESC
      LIMIT ?
    `;

    params.push(maxRows);
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    sendInternalError(res, 'Error en GET /api/folio-revistas:', error);
  }
});

app.get('/api/folio-revistas/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        ${FOLIOS_SELECT}
        WHERE f.ID_FOLIO = ?
      `,
      [toInteger(req.params.id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Folio no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en GET /api/folio-revistas/:id:', error);
  }
});

app.post('/api/folio-revistas', async (req, res) => {
  try {
    const {
      GRUPO_FECHA_HORA,
      ID_CEDULA_PERSONAL,
      PUESTO_SERVICIO,
      REVISTA_GRUPO,
      CEDULA_INSPECTOR,
      OBSERVACION,
    } = req.body;

    if (!isFilled(ID_CEDULA_PERSONAL) || !isFilled(PUESTO_SERVICIO) || !isFilled(REVISTA_GRUPO) || !isFilled(CEDULA_INSPECTOR)) {
      return res.status(400).json({ error: 'Faltan campos obligatorios del folio' });
    }

    const fecha = normalizeDateTime(GRUPO_FECHA_HORA) || normalizeDateTime(new Date()) || new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.query(
      `
        INSERT INTO folio_revistas
          (GRUPO_FECHA_HORA, ID_CEDULA_PERSONAL, PUESTO_SERVICIO, REVISTA_GRUPO, CEDULA_INSPECTOR, OBSERVACION)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        fecha,
        String(ID_CEDULA_PERSONAL).trim(),
        String(PUESTO_SERVICIO).trim(),
        String(REVISTA_GRUPO).trim(),
        String(CEDULA_INSPECTOR).trim(),
        toNullableString(OBSERVACION),
      ]
    );

    const [createdRows] = await pool.query(
      `
        ${FOLIOS_SELECT}
        WHERE f.ID_FOLIO = ?
      `,
      [result.insertId]
    );

    res.status(201).json(createdRows[0]);
  } catch (error) {
    if (error && error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'El personal o el inspector no existen' });
    }

    sendInternalError(res, 'Error en POST /api/folio-revistas:', error);
  }
});

app.get('/api/catalogos/jerarquias', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM jerarquias ORDER BY ID_JERARQUIA ASC');
    res.json(rows);
  } catch (error) {
    sendInternalError(res, 'Error en GET /api/catalogos/jerarquias:', error);
  }
});

app.post('/api/catalogos/jerarquias', async (req, res) => {
  try {
    const { NOMBRE_JERARQUIA } = req.body;

    if (!isFilled(NOMBRE_JERARQUIA)) {
      return res.status(400).json({ error: 'El nombre de la jerarquia es obligatorio' });
    }

    const [result] = await pool.query(
      'INSERT INTO jerarquias (NOMBRE_JERARQUIA) VALUES (?)',
      [String(NOMBRE_JERARQUIA).trim()]
    );

    const [createdRows] = await pool.query('SELECT * FROM jerarquias WHERE ID_JERARQUIA = ?', [result.insertId]);
    res.status(201).json(createdRows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en POST /api/catalogos/jerarquias:', error);
  }
});

app.put('/api/catalogos/jerarquias/:id', async (req, res) => {
  try {
    const { NOMBRE_JERARQUIA } = req.body;

    if (!isFilled(NOMBRE_JERARQUIA)) {
      return res.status(400).json({ error: 'El nombre de la jerarquia es obligatorio' });
    }

    const [result] = await pool.query(
      'UPDATE jerarquias SET NOMBRE_JERARQUIA = ? WHERE ID_JERARQUIA = ?',
      [String(NOMBRE_JERARQUIA).trim(), toInteger(req.params.id)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Jerarquia no encontrada' });
    }

    const [updatedRows] = await pool.query('SELECT * FROM jerarquias WHERE ID_JERARQUIA = ?', [toInteger(req.params.id)]);
    res.json(updatedRows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en PUT /api/catalogos/jerarquias/:id:', error);
  }
});

app.delete('/api/catalogos/jerarquias/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM jerarquias WHERE ID_JERARQUIA = ?', [toInteger(req.params.id)]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Jerarquia no encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    if (isForeignKeyRestrictionError(error)) {
      return res.status(409).json({ error: 'No se puede eliminar la jerarquia porque esta en uso' });
    }

    sendInternalError(res, 'Error en DELETE /api/catalogos/jerarquias/:id:', error);
  }
});

app.get('/api/catalogos/companias', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM companias ORDER BY ID_COMPANIA ASC');
    res.json(rows);
  } catch (error) {
    sendInternalError(res, 'Error en GET /api/catalogos/companias:', error);
  }
});

app.post('/api/catalogos/companias', async (req, res) => {
  try {
    const { NOMBRE_COMPANIA, NUM_REGIMIENTO } = req.body;

    if (!isFilled(NOMBRE_COMPANIA) || !isFilled(NUM_REGIMIENTO)) {
      return res.status(400).json({ error: 'Nombre de compania y regimiento son obligatorios' });
    }

    const [result] = await pool.query(
      'INSERT INTO companias (NOMBRE_COMPANIA, NUM_REGIMIENTO) VALUES (?, ?)',
      [String(NOMBRE_COMPANIA).trim(), String(NUM_REGIMIENTO).trim()]
    );

    const [createdRows] = await pool.query('SELECT * FROM companias WHERE ID_COMPANIA = ?', [result.insertId]);
    res.status(201).json(createdRows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en POST /api/catalogos/companias:', error);
  }
});

app.put('/api/catalogos/companias/:id', async (req, res) => {
  try {
    const { NOMBRE_COMPANIA, NUM_REGIMIENTO } = req.body;

    if (!isFilled(NOMBRE_COMPANIA) || !isFilled(NUM_REGIMIENTO)) {
      return res.status(400).json({ error: 'Nombre de compania y regimiento son obligatorios' });
    }

    const [result] = await pool.query(
      'UPDATE companias SET NOMBRE_COMPANIA = ?, NUM_REGIMIENTO = ? WHERE ID_COMPANIA = ?',
      [String(NOMBRE_COMPANIA).trim(), String(NUM_REGIMIENTO).trim(), toInteger(req.params.id)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Compania no encontrada' });
    }

    const [updatedRows] = await pool.query('SELECT * FROM companias WHERE ID_COMPANIA = ?', [toInteger(req.params.id)]);
    res.json(updatedRows[0]);
  } catch (error) {
    sendInternalError(res, 'Error en PUT /api/catalogos/companias/:id:', error);
  }
});

app.delete('/api/catalogos/companias/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM companias WHERE ID_COMPANIA = ?', [toInteger(req.params.id)]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Compania no encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    if (isForeignKeyRestrictionError(error)) {
      return res.status(409).json({ error: 'No se puede eliminar la compania porque esta en uso' });
    }

    sendInternalError(res, 'Error en DELETE /api/catalogos/companias/:id:', error);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Base de datos: ${process.env.DB_NAME || 'control_armamento_nfc'}`);
});
