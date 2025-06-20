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

const validateVaccinationSchedule = [
  body('id_vacuna').isUUID().withMessage('ID de vacuna inválido'),
  body('orden_dosis').isInt({ min: 1 }).withMessage('Orden de dosis debe ser un número positivo'),
  body('edad_recomendada').notEmpty().isString().withMessage('Edad recomendada es requerida'),
  body('descripcion').optional().isString().withMessage('Descripción debe ser una cadena válida'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * tags:
 *   name: VaccinationSchedules
 *   description: Gestión de esquemas de vacunación
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     VaccinationSchedule:
 *       type: object
 *       required:
 *         - id_vacuna
 *         - orden_dosis
 *         - edad_recomendada
 *       properties:
 *         id_esquema:
 *           type: string
 *           format: uuid
 *           description: Identificador único del esquema
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *           description: ID de la vacuna
 *         orden_dosis:
 *           type: integer
 *           description: Orden de la dosis
 *         edad_recomendada:
 *           type: string
 *           description: Edad recomendada
 *         descripcion:
 *           type: string
 *           description: Descripción del esquema (opcional)
 *       example:
 *         id_esquema: "123e4567-e89b-12d3-a456-426614174016"
 *         id_vacuna: "123e4567-e89b-12d3-a456-426614174008"
 *         orden_dosis: 1
 *         edad_recomendada: "2 meses"
 *         descripcion: "Primera dosis de la vacuna contra la hepatitis B"
 *     VaccinationScheduleInput:
 *       type: object
 *       required:
 *         - id_vacuna
 *         - orden_dosis
 *         - edad_recomendada
 *       properties:
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *         orden_dosis:
 *           type: integer
 *         edad_recomendada:
 *           type: string
 *         descripcion:
 *           type: string
 *           nullable: true
 */

/**
 * @swagger
 * /api/vaccination-schedules:
 *   get:
 *     summary: Listar todos los esquemas de vacunación
 *     tags: [VaccinationSchedules]
 *     responses:
 *       200:
 *         description: Lista de esquemas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VaccinationSchedule'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo esquemas de vacunación', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Esquema_Vacunacion');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener esquemas de vacunación', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener esquemas de vacunación');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/vaccination-schedules/{id}:
 *   get:
 *     summary: Obtener un esquema de vacunación por ID
 *     tags: [VaccinationSchedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Esquema obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VaccinationSchedule'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Esquema no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo esquema de vacunación por ID', { id: req.params.id, ip: req.ip });
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
      .input('id_esquema', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Esquema_Vacunacion WHERE id_esquema = @id_esquema');
    if (result.recordset.length === 0) {
      logger.warn('Esquema no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Esquema no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener esquema de vacunación', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/vaccination-schedules:
 *   post:
 *     summary: Crear un nuevo esquema de vacunación
 *     tags: [VaccinationSchedules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccinationScheduleInput'
 *     responses:
 *       201:
 *         description: Esquema creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_esquema:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateVaccinationSchedule, async (req, res, next) => {
  try {
    logger.info('Creando esquema de vacunación', { id_vacuna: req.body.id_vacuna, orden_dosis: req.body.orden_dosis, ip: req.ip });
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
      .input('id_vacuna', sql.UniqueIdentifier, req.body.id_vacuna)
      .input('orden_dosis', sql.Int, req.body.orden_dosis)
      .input('edad_recomendada', sql.NVarChar, req.body.edad_recomendada)
      .input('descripcion', sql.NVarChar, req.body.descripcion)
      .execute('sp_CrearEsquemaVacunacion');
    res.status(201).json({ id_esquema: result.recordset[0].id_esquema });
  } catch (err) {
    logger.error('Error al crear esquema de vacunación', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear esquema de vacunación');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/vaccination-schedules/{id}:
 *   put:
 *     summary: Actualizar un esquema de vacunación
 *     tags: [VaccinationSchedules]
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
 *             $ref: '#/components/schemas/VaccinationScheduleInput'
 *     responses:
 *       204:
 *         description: Esquema actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Esquema no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [validateUUID, validateVaccinationSchedule], async (req, res, next) => {
  try {
    logger.info('Actualizando esquema de vacunación', { id: req.params.id, id_vacuna: req.body.id_vacuna, ip: req.ip });
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
      .input('id_esquema', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Esquema_Vacunacion WHERE id_esquema = @id_esquema');
    if (exists.recordset.length === 0) {
      logger.warn('Esquema no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Esquema no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_esquema', sql.UniqueIdentifier, req.params.id)
      .input('id_vacuna', sql.UniqueIdentifier, req.body.id_vacuna)
      .input('orden_dosis', sql.Int, req.body.orden_dosis)
      .input('edad_recomendada', sql.NVarChar, req.body.edad_recomendada)
      .input('descripcion', sql.NVarChar, req.body.descripcion)
      .execute('sp_ActualizarEsquemaVacunacion');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar esquema de vacunación', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/vaccination-schedules/{id}:
 *   delete:
 *     summary: Eliminar un esquema de vacunación
 *     tags: [VaccinationSchedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Esquema eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Esquema no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando esquema de vacunación', { id: req.params.id, ip: req.ip });
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
      .input('id_esquema', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Esquema_Vacunacion WHERE id_esquema = @id_esquema');
    if (exists.recordset.length === 0) {
      logger.warn('Esquema no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Esquema no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_esquema', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarEsquemaVacunacion');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar esquema de vacunación', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;