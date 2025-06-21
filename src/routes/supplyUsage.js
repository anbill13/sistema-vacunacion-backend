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

const validateSupplyUsage = [
  body('id_suministro').isUUID().withMessage('ID de suministro inválido'),
  body('id_personal').isUUID().withMessage('ID de personal inválido'),
  body('fecha_uso').isISO8601().withMessage('Fecha de uso inválida'),
  body('cantidad').isFloat({ min: 0 }).withMessage('Cantidad debe ser un número positivo'),
  body('descripcion').optional().isString().withMessage('Descripción debe ser una cadena válida'),
  body('estado').isIn(['Registrado', 'Anulado']).withMessage('Estado inválido'),
];

/**
 * @swagger
 * tags:
 *   name: SupplyUsage
 *   description: API endpoints for managing supply usage
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SupplyUsage:
 *       type: object
 *       properties:
 *         id_uso:
 *           type: string
 *           format: uuid
 *         id_suministro:
 *           type: string
 *           format: uuid
 *         id_personal:
 *           type: string
 *           format: uuid
 *         fecha_uso:
 *           type: string
 *           format: date-time
 *         cantidad:
 *           type: number
 *         descripcion:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [Registrado, Anulado]
 *       required:
 *         - id_uso
 *         - id_suministro
 *         - id_personal
 *         - fecha_uso
 *         - cantidad
 *         - estado
 *       example:
 *         id_uso: "123e4567-e89b-12d3-a456-426614174021"
 *         id_suministro: "123e4567-e89b-12d3-a456-426614174015"
 *         id_personal: "123e4567-e89b-12d3-a456-426614174005"
 *         fecha_uso: "2025-06-20T14:00:00Z"
 *         cantidad: 10
 *         descripcion: "Uso de jeringas para campaña de vacunación"
 *         estado: "Registrado"
 *     SupplyUsageInput:
 *       type: object
 *       properties:
 *         id_suministro:
 *           type: string
 *           format: uuid
 *         id_personal:
 *           type: string
 *           format: uuid
 *         fecha_uso:
 *           type: string
 *           format: date-time
 *         cantidad:
 *           type: number
 *         descripcion:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [Registrado, Anulado]
 *       required:
 *         - id_suministro
 *         - id_personal
 *         - fecha_uso
 *         - cantidad
 *         - estado
 */

/**
 * @swagger
 * /api/supply-usage:
 *   get:
 *     summary: Retrieve all supply usage records
 *     tags: [SupplyUsage]
 *     responses:
 *       200:
 *         description: A list of supply usage records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SupplyUsage'
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo usos de suministros', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().execute('sp_ListarUsosSuministros');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener usos de suministros', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener usos de suministros');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/supply-usage/{id}:
 *   get:
 *     summary: Retrieve a supply usage record by ID
 *     tags: [SupplyUsage]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the supply usage record
 *     responses:
 *       200:
 *         description: Supply usage record details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupplyUsage'
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Supply usage record not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo uso de suministro por ID', { id: req.params.id, ip: req.ip });
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
      .input('id_uso', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerUsoSuministroPorId');
    if (result.recordset.length === 0) {
      logger.warn('Uso de suministro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Uso de suministro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener uso de suministro', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/supply-usage:
 *   post:
 *     summary: Create a new supply usage record
 *     tags: [SupplyUsage]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SupplyUsageInput'
 *     responses:
 *       201:
 *         description: Supply usage record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_uso:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Bad request (e.g., missing required fields)
 *       500:
 *         description: Internal server error
 */
router.post('/', validateSupplyUsage, async (req, res, next) => {
  try {
    logger.info('Creando uso de suministro', { id_suministro: req.body.id_suministro, cantidad: req.body.cantidad, ip: req.ip });
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
      .input('id_suministro', sql.UniqueIdentifier, req.body.id_suministro)
      .input('id_personal', sql.UniqueIdentifier, req.body.id_personal)
      .input('fecha_uso', sql.DateTime2, req.body.fecha_uso)
      .input('cantidad', sql.Float, req.body.cantidad)
      .input('descripcion', sql.NVarChar, req.body.descripcion)
      .input('estado', sql.NVarChar, req.body.estado)
      .execute('sp_CrearUsoSuministro');
    res.status(201).json({ id_uso: result.recordset[0].id_uso });
  } catch (err) {
    logger.error('Error al crear uso de suministro', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear uso de suministro');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/supply-usage/{id}:
 *   put:
 *     summary: Update an existing supply usage record
 *     tags: [SupplyUsage]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the supply usage record to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SupplyUsageInput'
 *     responses:
 *       204:
 *         description: Supply usage record updated successfully
 *       400:
 *         description: Bad request (e.g., missing required fields)
 *       404:
 *         description: Supply usage record not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', [validateUUID, validateSupplyUsage], async (req, res, next) => {
  try {
    logger.info('Actualizando uso de suministro', { id: req.params.id, id_suministro: req.body.id_suministro, ip: req.ip });
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
      .input('id_uso', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Uso_Suministros WHERE id_uso = @id_uso');
    if (exists.recordset.length === 0) {
      logger.warn('Uso de suministro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Uso de suministro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_uso', sql.UniqueIdentifier, req.params.id)
      .input('id_suministro', sql.UniqueIdentifier, req.body.id_suministro)
      .input('id_personal', sql.UniqueIdentifier, req.body.id_personal)
      .input('fecha_uso', sql.DateTime2, req.body.fecha_uso)
      .input('cantidad', sql.Float, req.body.cantidad)
      .input('descripcion', sql.NVarChar, req.body.descripcion)
      .input('estado', sql.NVarChar, req.body.estado)
      .execute('sp_ActualizarUsoSuministro');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar uso de suministro', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/supply-usage/{id}:
 *   delete:
 *     summary: Delete a supply usage record
 *     tags: [SupplyUsage]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the supply usage record to delete
 *     responses:
 *       204:
 *         description: Supply usage record deleted successfully
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Supply usage record not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando uso de suministro', { id: req.params.id, ip: req.ip });
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
      .input('id_uso', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Uso_Suministros WHERE id_uso = @id_uso');
    if (exists.recordset.length === 0) {
      logger.warn('Uso de suministro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Uso de suministro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_uso', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarUsoSuministro');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar uso de suministro', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;