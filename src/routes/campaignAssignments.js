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

const validateCampaignAssignment = [
  body('id_campaña').isUUID().withMessage('ID de campaña inválido'),
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('fecha_asignacion').isDate().withMessage('Fecha de asignación inválida'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * tags:
 *   name: CampaignAssignments
 *   description: Asignación de campañas a centros
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CampaignAssignment:
 *       type: object
 *       required:
 *         - id_campaña
 *         - id_centro
 *         - fecha_asignacion
 *       properties:
 *         id_campaña_centro:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la asignación
 *         id_campaña:
 *           type: string
 *           format: uuid
 *           description: ID de la campaña
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro
 *         fecha_asignacion:
 *           type: string
 *           format: date
 *           description: Fecha de asignación
 *         nombre_campaña:
 *           type: string
 *           description: Nombre de la campaña (en reportes)
 *         nombre_centro:
 *           type: string
 *           description: Nombre del centro (en reportes)
 *       example:
 *         id_campaña_centro: "123e4567-e89b-12d3-a456-426614174010"
 *         id_campaña: "123e4567-e89b-12d3-a456-426614174009"
 *         id_centro: "123e4567-e89b-12d3-a456-426614174007"
 *         fecha_asignacion: "2025-01-01"
 *         nombre_campaña: "Campaña COVID-19 2025"
 *         nombre_centro: "Centro de Salud Central"
 *     CampaignAssignmentInput:
 *       type: object
 *       required:
 *         - id_campaña
 *         - id_centro
 *         - fecha_asignacion
 *       properties:
 *         id_campaña:
 *           type: string
 *           format: uuid
 *         id_centro:
 *           type: string
 *           format: uuid
 *         fecha_asignacion:
 *           type: string
 *           format: date
 */

/**
 * @swagger
 * /api/campaign-assignments:
 *   get:
 *     summary: Listar todas las asignaciones de campañas
 *     tags: [CampaignAssignments]
 *     responses:
 *       200:
 *         description: Lista de asignaciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CampaignAssignment'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo asignaciones de campañas', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Campana_Centro');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener asignaciones de campañas', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener asignaciones de campañas');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/campaign-assignments/{id}:
 *   get:
 *     summary: Obtener una asignación de campaña por ID
 *     tags: [CampaignAssignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Asignación obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignAssignment'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Asignación no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo asignación de campaña por ID', { id: req.params.id, ip: req.ip });
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
      .input('id_campaña_centro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Campana_Centro WHERE id_campaña_centro = @id_campaña_centro');
    if (result.recordset.length === 0) {
      logger.warn('Asignación no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Asignación no encontrada');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener asignación de campaña', { id: req.params.id, error: err.message, ip: req.ip });
    err    		// ... existing code ...
  }
});

/**
 * @swagger
 * /api/campaign-assignments:
 *   post:
 *     summary: Asignar una campaña a un centro
 *     tags: [CampaignAssignments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignAssignmentInput'
 *     responses:
 *       201:
 *         description: Asignación creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_campaña_centro:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateCampaignAssignment, async (req, res, next) => {
  try {
    logger.info('Creando asignación de campaña', { campaña: req.body.id_campaña, centro: req.body.id_centro, ip: req.ip });
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
      .input('id_campaña', sql.UniqueIdentifier, req.body.id_campaña)
      .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
      .input('fecha_asignacion', sql.Date, req.body.fecha_asignacion)
      .execute('sp_CrearCampanaCentro');
    res.status(201).json({ id_campaña_centro: result.recordset[0].id_campaña_centro });
  } catch (err) {
    logger.error('Error al crear asignación de campaña', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear asignación de campaña');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/campaign-assignments/{id}:
 *   put:
 *     summary: Actualizar una asignación de campaña
 *     tags: [CampaignAssignments]
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
 *             $ref: '#/components/schemas/CampaignAssignmentInput'
 *     responses:
 *       204:
 *         description: Asignación actualizada exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Asignación no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [validateUUID, validateCampaignAssignment], async (req, res, next) => {
  try {
    logger.info('Actualizando asignación de campaña', { id: req.params.id, campaña: req.body.id_campaña, ip: req.ip });
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
      .input('id_campaña_centro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Campana_Centro WHERE id_campaña_centro = @id_campaña_centro');
    if (exists.recordset.length === 0) {
      logger.warn('Asignación no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Asignación no encontrada');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_campaña_centro', sql.UniqueIdentifier, req.params.id)
      .input('id_campaña', sql.UniqueIdentifier, req.body.id_campaña)
      .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
      .input('fecha_asignacion', sql.Date, req.body.fecha_asignacion)
      .query('UPDATE Campana_Centro SET id_campaña = @id_campaña, id_centro = @id_centro, fecha_asignacion = @fecha_asignacion WHERE id_campaña_centro = @id_campaña_centro');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar asignación de campaña', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/campaign-assignments/{id}:
 *   delete:
 *     summary: Eliminar una asignación de campaña
 *     tags: [CampaignAssignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Asignación eliminada exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Asignación no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando asignación de campaña', { id: req.params.id, ip: req.ip });
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
      .input('id_campaña_centro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Campana_Centro WHERE id_campaña_centro = @id_campaña_centro');
    if (exists.recordset.length === 0) {
      logger.warn('Asignación no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Asignación no encontrada');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_campaña_centro', sql.UniqueIdentifier, req.params.id)
      .query('DELETE FROM Campana_Centro WHERE id_campaña_centro = @id_campaña_centro');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar asignación de campaña', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;