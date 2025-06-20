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

const validateVaccineBatch = [
  body('id_vacuna').isUUID().withMessage('ID de vacuna inválido'),
  body('numero_lote').notEmpty().isString().withMessage('Número de lote es requerido'),
  body('cantidad_total').isInt({ min: 1 }).withMessage('Cantidad total debe ser un número positivo'),
  body('cantidad_disponible').isInt({ min: 0 }).withMessage('Cantidad disponible debe ser un número no negativo'),
  body('fecha_fabricacion').isDate().withMessage('Fecha de fabricación inválida'),
  body('fecha_vencimiento').isDate().withMessage('Fecha de vencimiento inválida'),
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('condiciones_almacenamiento').optional().isString().withMessage('Condiciones de almacenamiento debe ser una cadena válida'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * tags:
 *   name: VaccineBatches
 *   description: Gestión de lotes de vacunas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     VaccineBatch:
 *       type: object
 *       required:
 *         - id_vacuna
 *         - numero_lote
 *         - cantidad_total
 *         - cantidad_disponible
 *         - fecha_fabricacion
 *         - fecha_vencimiento
 *         - id_centro
 *       properties:
 *         id_lote:
 *           type: string
 *           format: uuid
 *           description: Identificador único del lote
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *           description: ID de la vacuna
 *         numero_lote:
 *           type: string
 *           description: Número de lote
 *         cantidad_total:
 *           type: integer
 *           description: Cantidad total de dosis
 *         cantidad_disponible:
 *           type: integer
 *           description: Cantidad disponible de dosis
 *         fecha_fabricacion:
 *           type: string
 *           format: date
 *           description: Fecha de fabricación
 *         fecha_vencimiento:
 *           type: string
 *           format: date
 *           description: Fecha de vencimiento
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro
 *         condiciones_almacenamiento:
 *           type: string
 *           description: Condiciones de almacenamiento (opcional)
 *       example:
 *         id_lote: "123e4567-e89b-12d3-a456-426614174018"
 *         id_vacuna: "123e4567-e89b-12d3-a456-426614174008"
 *         numero_lote: "LOT2025-001"
 *         cantidad_total: 1000
 *         cantidad_disponible: 800
 *         fecha_fabricacion: "2025-01-01"
 *         fecha_vencimiento: "2026-01-01"
 *         id_centro: "123e4567-e89b-12d3-a456-426614174007"
 *         condiciones_almacenamiento: "Refrigerar entre 2-8°C"
 *     VaccineBatchInput:
 *       type: object
 *       required:
 *         - id_vacuna
 *         - numero_lote
 *         - cantidad_total
 *         - cantidad_disponible
 *         - fecha_fabricacion
 *         - fecha_vencimiento
 *         - id_centro
 *       properties:
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *         numero_lote:
 *           type: string
 *         cantidad_total:
 *           type: integer
 *         cantidad_disponible:
 *           type: integer
 *         fecha_fabricacion:
 *           type: string
 *           format: date
 *         fecha_vencimiento:
 *           type: string
 *           format: date
 *         id_centro:
 *           type: string
 *           format: uuid
 *         condiciones_almacenamiento:
 *           type: string
 *           nullable: true
 */

/**
 * @swagger
 * /api/vaccine-lots:
 *   get:
 *     summary: Listar todos los lotes de vacunas
 *     tags: [VaccineBatches]
 *     responses:
 *       200:
 *         description: Lista de lotes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VaccineBatch'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo lotes de vacunas', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Lotes_Vacunas');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener lotes de vacunas', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener lotes de vacunas');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/vaccine-lots/{id}:
 *   get:
 *     summary: Obtener un lote de vacunas por ID
 *     tags: [VaccineBatches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lote obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VaccineBatch'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Lote no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo lote de vacunas por ID', { id: req.params.id, ip: req.ip });
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
      .input('id_lote', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Lotes_Vacunas WHERE id_lote = @id_lote');
    if (result.recordset.length === 0) {
      logger.warn('Lote no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Lote no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener lote de vacunas', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/vaccine-lots:
 *   post:
 *     summary: Crear un nuevo lote de vacunas
 *     tags: [VaccineBatches]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccineBatchInput'
 *     responses:
 *       201:
 *         description: Lote creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_lote:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateVaccineBatch, async (req, res, next) => {
  try {
    logger.info('Creando lote de vacunas', { numero_lote: req.body.numero_lote, id_vacuna: req.body.id_vacuna, ip: req.ip });
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
      .input('numero_lote', sql.NVarChar, req.body.numero_lote)
      .input('cantidad_total', sql.Int, req.body.cantidad_total)
      .input('cantidad_disponible', sql.Int, req.body.cantidad_disponible)
      .input('fecha_fabricacion', sql.Date, req.body.fecha_fabricacion)
      .input('fecha_vencimiento', sql.Date, req.body.fecha_vencimiento)
      .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
      .input('condiciones_almacenamiento', sql.NVarChar, req.body.condiciones_almacenamiento)
      .execute('sp_CrearLoteVacuna');
    res.status(201).json({ id_lote: result.recordset[0].id_lote });
  } catch (err) {
    logger.error('Error al crear lote de vacunas', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear lote de vacunas');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/vaccine-lots/{id}:
 *   put:
 *     summary: Actualizar un lote de vacunas
 *     tags: [VaccineBatches]
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
 *             $ref: '#/components/schemas/VaccineBatchInput'
 *     responses:
 *       204:
 *         description: Lote actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Lote no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [validateUUID, validateVaccineBatch], async (req, res, next) => {
  try {
    logger.info('Actualizando lote de vacunas', { id: req.params.id, numero_lote: req.body.numero_lote, ip: req.ip });
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
      .input('id_lote', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Lotes_Vacunas WHERE id_lote = @id_lote');
    if (exists.recordset.length === 0) {
      logger.warn('Lote no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Lote no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_lote', sql.UniqueIdentifier, req.params.id)
      .input('id_vacuna', sql.UniqueIdentifier, req.body.id_vacuna)
      .input('numero_lote', sql.NVarChar, req.body.numero_lote)
      .input('cantidad_total', sql.Int, req.body.cantidad_total)
      .input('cantidad_disponible', sql.Int, req.body.cantidad_disponible)
      .input('fecha_fabricacion', sql.Date, req.body.fecha_fabricacion)
      .input('fecha_vencimiento', sql.Date, req.body.fecha_vencimiento)
      .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
      .input('condiciones_almacenamiento', sql.NVarChar, req.body.condiciones_almacenamiento)
      .execute('sp_ActualizarLoteVacuna');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar lote de vacunas', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/vaccine-lots/{id}:
 *   delete:
 *     summary: Eliminar un lote de vacunas
 *     tags: [VaccineBatches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Lote eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Lote no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando lote de vacunas', { id: req.params.id, ip: req.ip });
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
      .input('id_lote', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Lotes_Vacunas WHERE id_lote = @id_lote');
    if (exists.recordset.length === 0) {
      logger.warn('Lote no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Lote no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_lote', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarLoteVacuna');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar lote de vacunas', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;