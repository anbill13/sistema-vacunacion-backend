const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { poolPromise, sql } = require('../config/db');
const winston = require('winston');

const router = express.Router();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

const validateAppointment = [
  body('id_niño').isUUID().withMessage('ID de niño inválido'),
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('fecha_cita').isISO8601().withMessage('Fecha de cita inválida'),
  body('estado').isIn(['Pendiente', 'Confirmada', 'Cancelada', 'Completada']).withMessage('Estado inválido'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

const validateDateRange = [
  query('fecha_inicio').isDate().withMessage('Fecha de inicio inválida'),
  query('fecha_fin').isDate().withMessage('Fecha de fin inválida'),
];

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Gestión de citas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       required:
 *         - id_niño
 *         - id_centro
 *         - fecha_cita
 *         - estado
 *       properties:
 *         id_cita:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la cita
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: ID del niño
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro
 *         fecha_cita:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la cita
 *         estado:
 *           type: string
 *           enum: [Pendiente, Confirmada, Cancelada, Completada]
 *           description: Estado de la cita
 *         nombre_niño:
 *           type: string
 *           description: Nombre del niño (en reportes)
 *       example:
 *         id_cita: "123e4567-e89b-12d3-a456-426614174013"
 *         id_niño: "123e4567-e89b-12d3-a456-426614174006"
 *         id_centro: "123e4567-e89b-12d3-a456-426614174007"
 *         fecha_cita: "2025-06-25T10:00:00Z"
 *         estado: "Pendiente"
 *         nombre_niño: "Ana López"
 *     AppointmentInput:
 *       type: object
 *       required:
 *         - id_niño
 *         - id_centro
 *         - fecha_cita
 *         - estado
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *         id_centro:
 *           type: string
 *           format: uuid
 *         fecha_cita:
 *           type: string
 *           format: date-time
 *         estado:
 *           type: string
 *           enum: [Pendiente, Confirmada, Cancelada, Completada]
 */

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Listar todas las citas
 *     tags: [Appointments]
 *     responses:
 *       200:
 *         description: Lista de citas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Appointment'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo citas', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Citas');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener citas', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener citas');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Obtener una cita por ID
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cita obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo cita por ID', { id: req.params.id, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { id: req.params.id, errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida0100');
      error.statusCode = 400;
      error.data = errors.array();
      throw error;
    }
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_cita', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Citas WHERE id_cita = @id_cita');
    if (result.recordset.length === 0) {
      logger.warn('Cita no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Cita no encontrada');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener cita', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Crear una nueva cita
 *     tags: [Appointments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppointmentInput'
 *     responses:
 *       201:
 *         description: Cita creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_cita:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateAppointment, async (req, res, next) => {
  try {
    logger.info('Creando cita', { id_niño: req.body.id_niño, id_centro: req.body.id_centro, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = errors.array();
      throw error;
    }
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_niño', sql.UniqueIdentifier, req.body.id_niño)
      .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
      .input('fecha_cita', sql.DateTime2, req.body.fecha_cita)
      .input('estado', sql.NVarChar, req.body.estado)
      .execute('sp_CrearCita');
    res.status(201).json({ id_cita: result.recordset[0].id_cita });
  } catch (err) {
    logger.error('Error al crear cita', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear cita');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/appointments/{id}:
 *   put:
 *     summary: Actualizar una cita
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppointmentInput'
 *     responses:
 *       204:
 *         description: Cita actualizada exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [validateUUID, validateAppointment], async (req, res, next) => {
  try {
    logger.info('Actualizando cita', { id: req.params.id, id_niño: req.body.id_niño, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { id: req.params.id, errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = errors.array();
      throw error;
    }
    const pool = await poolPromise;
    const exists = await pool
      .request()
      .input('id_cita', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Citas WHERE id_cita = @id_cita');
    if (exists.recordset.length === 0) {
      logger.warn('Cita no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Cita no encontrada');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_cita', sql.UniqueIdentifier, req.params.id)
      .input('id_niño', sql.UniqueIdentifier, req.body.id_niño)
      .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
      .input('fecha_cita', sql.DateTime2, req.body.fecha_cita)
      .input('estado', sql.NVarChar, req.body.estado)
      .execute('sp_ActualizarCita');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar cita', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/appointments/{id}:
 *   delete:
 *     summary: Eliminar una cita
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Cita eliminada exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando cita', { id: req.params.id, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { id: req.params.id, errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = errors.array();
      throw error;
    }
    const pool = await poolPromise;
    const exists = await pool
      .request()
      .input('id_cita', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Citas WHERE id_cita = @id_cita');
    if (exists.recordset.length === 0) {
      logger.warn('Cita no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Cita no encontrada');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_cita', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarCita');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar cita', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/appointments/center/{id}:
 *   get:
 *     summary: Obtener citas por centro y rango de fechas
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro
 *       - in: query
 *         name: fecha_inicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio
 *       - in: query
 *         name: fecha_fin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Citas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.get('/center/:id', [validateUUID, validateDateRange], async (req, res, next) => {
  try {
    logger.info('Obteniendo citas por centro y rango de fechas', { id_centro: req.params.id, fecha_inicio: req.query.fecha_inicio, fecha_fin: req.query.fecha_fin, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { id: req.params.id, errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = errors.array();
      throw error;
    }
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .input('fecha_inicio', sql.Date, req.query.fecha_inicio)
      .input('fecha_fin', sql.Date, req.query.fecha_fin)
      .execute('sp_ObtenerCitasPorCentro');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener citas por centro', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;