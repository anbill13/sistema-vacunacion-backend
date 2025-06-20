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

const validateAlert = [
  body('id_niño').isUUID().withMessage('ID de niño inválido'),
  body('tipo_alerta').notEmpty().isString().withMessage('Tipo de alerta es requerido'),
  body('fecha_alerta').isISO8601().withMessage('Fecha de alerta inválida'),
  body('descripcion').optional().isString().withMessage('Descripción debe ser una cadena válida'),
  body('estado').isIn(['Pendiente', 'Resuelta']).withMessage('Estado inválido'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Gestión de alertas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Alert:
 *       type: object
 *       required:
 *         - id_niño
 *         - tipo_alerta
 *         - fecha_alerta
 *         - estado
 *       properties:
 *         id_alerta:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la alerta
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: ID del niño
 *         tipo_alerta:
 *           type: string
 *           description: Tipo de alerta
 *         fecha_alerta:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la alerta
 *         descripcion:
 *           type: string
 *           description: Descripción de la alerta (opcional)
 *         estado:
 *           type: string
 *           enum: [Pendiente, Resuelta]
 *           description: Estado de la alerta
 *       example:
 *         id_alerta: "123e4567-e89b-12d3-a456-426614174012"
 *         id_niño: "123e4567-e89b-12d3-a456-426614174006"
 *         tipo_alerta: "Falta de vacunación"
 *         fecha_alerta: "2025-06-20T14:00:00Z"
 *         descripcion: "Niño requiere dosis de refuerzo"
 *         estado: "Pendiente"
 *     AlertInput:
 *       type: object
 *       required:
 *         - id_niño
 *         - tipo_alerta
 *         - fecha_alerta
 *         - estado
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *         tipo_alerta:
 *           type: string
 *         fecha_alerta:
 *           type: string
 *           format: date-time
 *         descripcion:
 *           type: string
 *           nullable: true
 *         estado:
 *           type: string
 *           enum: [Pendiente, Resuelta]
 */

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Listar todas las alertas
 *     tags: [Alerts]
 *     responses:
 *       200:
 *         description: Lista de alertas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Alert'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo alertas', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Alertas');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener alertas', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener alertas');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/alerts/{id}:
 *   get:
 *     summary: Obtener una alerta por ID
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Alerta obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Alert'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Alerta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo alerta por ID', { id: req.params.id, ip: req.ip });
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
      .input('id_alerta', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Alertas WHERE id_alerta = @id_alerta');
    if (result.recordset.length === 0) {
      logger.warn('Alerta no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Alerta no encontrada');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener alerta', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/alerts:
 *   post:
 *     summary: Crear una nueva alerta
 *     tags: [Alerts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlertInput'
 *     responses:
 *       201:
 *         description: Alerta creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_alerta:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateAlert, async (req, res, next) => {
  try {
    logger.info('Creando alerta', { tipo: req.body.tipo_alerta, id_niño: req.body.id_niño, ip: req.ip });
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
      .input('tipo_alerta', sql.NVarChar, req.body.tipo_alerta)
      .input('fecha_alerta', sql.DateTime2, req.body.fecha_alerta)
      .input('descripcion', sql.NVarChar, req.body.descripcion)
      .input('estado', sql.NVarChar, req.body.estado)
      .execute('sp_CrearAlerta');
    res.status(201).json({ id_alerta: result.recordset[0].id_alerta });
  } catch (err) {
    logger.error('Error al crear alerta', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear alerta');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/alerts/{id}:
 *   put:
 *     summary: Actualizar una alerta
 *     tags: [Alerts]
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
 *             $ref: '#/components/schemas/AlertInput'
 *     responses:
 *       204:
 *         description: Alerta actualizada exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Alerta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [validateUUID, validateAlert], async (req, res, next) => {
  try {
    logger.info('Actualizando alerta', { id: req.params.id, tipo: req.body.tipo_alerta, ip: req.ip });
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
      .input('id_alerta', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Alertas WHERE id_alerta = @id_alerta');
    if (exists.recordset.length === 0) {
      logger.warn('Alerta no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Alerta no encontrada');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_alerta', sql.UniqueIdentifier, req.params.id)
      .input('id_niño', sql.UniqueIdentifier, req.body.id_niño)
      .input('tipo_alerta', sql.NVarChar, req.body.tipo_alerta)
      .input('fecha_alerta', sql.DateTime2, req.body.fecha_alerta)
      .input('descripcion', sql.NVarChar, req.body.descripcion)
      .input('estado', sql.NVarChar, req.body.estado)
      .execute('sp_ActualizarAlerta');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar alerta', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/alerts/{id}:
 *   delete:
 *     summary: Eliminar una alerta
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Alerta eliminada exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Alerta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando alerta', { id: req.params.id, ip: req.ip });
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
      .input('id_alerta', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Alertas WHERE id_alerta = @id_alerta');
    if (exists.recordset.length === 0) {
      logger.warn('Alerta no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Alerta no encontrada');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_alerta', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarAlerta');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar alerta', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;