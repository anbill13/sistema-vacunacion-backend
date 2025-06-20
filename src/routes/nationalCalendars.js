const express = require('express');
const { body, param, validationResult } = require('express-validator');
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

const validateUUID = param('id').isUUID().withMessage('ID inválido');

const validateCalendar = [
  body('nombre_calendario').notEmpty().isString().withMessage('Nombre del calendario es requerido'),
  body('pais').notEmpty().isString().withMessage('País es requerido'),
  body('descripcion').optional().isString().withMessage('Descripción debe ser una cadena válida'),
  body('estado').isIn(['Activo', 'Inactivo']).withMessage('Estado inválido'),
];

/**
 * @swagger
 * tags:
 *   name: NationalCalendars
 *   description: API endpoints for managing national vaccination calendars
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     NationalCalendar:
 *       type: object
 *       properties:
 *         id_calendario:
 *           type: string
 *           format: uuid
 *         nombre_calendario:
 *           type: string
 *         pais:
 *           type: string
 *         descripcion:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *       required:
 *         - id_calendario
 *         - nombre_calendario
 *         - pais
 *         - estado
 *       example:
 *         id_calendario: "123e4567-e89b-12d3-a456-426614174017"
 *         nombre_calendario: "Calendario Nacional 2025"
 *         pais: "España"
 *         descripcion: "Esquema de vacunación nacional para 2025"
 *         estado: "Activo"
 *     NationalCalendarInput:
 *       type: object
 *       properties:
 *         nombre_calendario:
 *           type: string
 *         pais:
 *           type: string
 *         descripcion:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *       required:
 *         - nombre_calendario
 *         - pais
 *         - estado
 */

/**
 * @swagger
 * /api/national-calendars:
 *   get:
 *     summary: Retrieve all national calendars
 *     tags: [NationalCalendars]
 *     responses:
 *       200:
 *         description: A list of national calendars
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NationalCalendar'
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo calendarios nacionales', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().execute('sp_ListarCalendariosNacionales');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener calendarios nacionales', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener calendarios nacionales');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/national-calendars/{id}:
 *   get:
 *     summary: Retrieve a national calendar by ID
 *     tags: [NationalCalendars]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the national calendar
 *     responses:
 *       200:
 *         description: National calendar details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NationalCalendar'
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: National calendar not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo calendario nacional por ID', { id: req.params.id, ip: req.ip });
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
      .input('id_calendario', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerCalendarioNacionalPorId');
    if (result.recordset.length === 0) {
      logger.warn('Calendario nacional no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Calendario nacional no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener calendario nacional', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/national-calendars:
 *   post:
 *     summary: Create a new national calendar
 *     tags: [NationalCalendars]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NationalCalendarInput'
 *     responses:
 *       201:
 *         description: National calendar created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_calendario:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Bad request (e.g., missing required fields)
 *       500:
 *         description: Internal server error
 */
router.post('/', validateCalendar, async (req, res, next) => {
  try {
    logger.info('Creando calendario nacional', { nombre: req.body.nombre_calendario, ip: req.ip });
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
      .input('nombre_calendario', sql.NVarChar, req.body.nombre_calendario)
      .input('pais', sql.NVarChar, req.body.pais)
      .input('descripcion', sql.NVarChar, req.body.descripcion)
      .input('estado', sql.NVarChar, req.body.estado)
      .execute('sp_CrearCalendarioNacional');
    res.status(201).json({ id_calendario: result.recordset[0].id_calendario });
  } catch (err) {
    logger.error('Error al crear calendario nacional', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear calendario nacional');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/national-calendars/{id}:
 *   put:
 *     summary: Update an existing national calendar
 *     tags: [NationalCalendars]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the national calendar to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NationalCalendarInput'
 *     responses:
 *       204:
 *         description: National calendar updated successfully
 *       400:
 *         description: Bad request (e.g., missing required fields)
 *       404:
 *         description: National calendar not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', [validateUUID, validateCalendar], async (req, res, next) => {
  try {
    logger.info('Actualizando calendario nacional', { id: req.params.id, nombre: req.body.nombre_calendario, ip: req.ip });
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
      .input('id_calendario', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Calendarios_Nacionales WHERE id_calendario = @id_calendario');
    if (exists.recordset.length === 0) {
      logger.warn('Calendario nacional no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Calendario nacional no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_calendario', sql.UniqueIdentifier, req.params.id)
      .input('nombre_calendario', sql.NVarChar, req.body.nombre_calendario)
      .input('pais', sql.NVarChar, req.body.pais)
      .input('descripcion', sql.NVarChar, req.body.descripcion)
      .input('estado', sql.NVarChar, req.body.estado)
      .execute('sp_ActualizarCalendarioNacional');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar calendario nacional', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/national-calendars/{id}:
 *   delete:
 *     summary: Delete a national calendar
 *     tags: [NationalCalendars]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the national calendar to delete
 *     responses:
 *       204:
 *         description: National calendar deleted successfully
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: National calendar not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando calendario nacional', { id: req.params.id, ip: req.ip });
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
      .input('id_calendario', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Calendarios_Nacionales WHERE id_calendario = @id_calendario');
    if (exists.recordset.length === 0) {
      logger.warn('Calendario nacional no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Calendario nacional no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_calendario', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarCalendarioNacional');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar calendario nacional', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;