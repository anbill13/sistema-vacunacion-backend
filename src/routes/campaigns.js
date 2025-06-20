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

const validateCampaign = [
  body('nombre_campaña').notEmpty().isString().withMessage('Nombre de campaña es requerido'),
  body('fecha_inicio').isDate().withMessage('Fecha de inicio inválida'),
  body('fecha_fin').optional().isDate().withMessage('Fecha de fin inválida'),
  body('objetivo').optional().isString(),
  body('id_vacuna').isUUID().withMessage('ID de vacuna inválido'),
  body('estado').isIn(['Planificada', 'En Curso', 'Finalizada']).withMessage('Estado inválido'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * tags:
 *   name: Campaigns
 *   description: Gestión de campañas de vacunación
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Campaign:
 *       type: object
 *       required:
 *         - nombre_campaña
 *         - fecha_inicio
 *         - id_vacuna
 *         - estado
 *       properties:
 *         id_campaña:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la campaña
 *         nombre_campaña:
 *           type: string
 *           description: Nombre de la campaña
 *         fecha_inicio:
 *           type: string
 *           format: date
 *           description: Fecha de inicio
 *         fecha_fin:
 *           type: string
 *           format: date
 *           description: Fecha de fin (opcional)
 *         objetivo:
 *           type: string
 *           description: Objetivo de la campaña (opcional)
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *           description: ID de la vacuna
 *         estado:
 *           type: string
 *           enum: [Planificada, En Curso, Finalizada]
 *           description: Estado de la campaña
 *       example:
 *         id_campaña: "123e4567-e89b-12d3-a456-426614174009"
 *         nombre_campaña: "Campaña COVID-19 2025"
 *         fecha_inicio: "2025-01-01"
 *         fecha_fin: "2025-12-31"
 *         objetivo: "Vacunar al 80% de la población"
 *         id_vacuna: "123e4567-e89b-12d3-a456-426614174008"
 *         estado: "Planificada"
 *     CampaignInput:
 *       type: object
 *       required:
 *         - nombre_campaña
 *         - fecha_inicio
 *         - id_vacuna
 *         - estado
 *       properties:
 *         nombre_campaña:
 *           type: string
 *         fecha_inicio:
 *           type: string
 *           format: date
 *         fecha_fin:
 *           type: string
 *           format: date
 *           nullable: true
 *         objetivo:
 *           type: string
 *           nullable: true
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *         estado:
 *           type: string
 *           enum: [Planificada, En Curso, Finalizada]
 */

/**
 * @swagger
 * /api/campaigns:
 *   get:
 *     summary: Listar todas las campañas
 *     tags: [Campaigns]
 *     responses:
 *       200:
 *         description: Lista de campañas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Campaign'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo campañas', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Campanas_Vacunacion');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener campañas', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener campañas');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/campaigns/{id}:
 *   get:
 *     summary: Obtener una campaña por ID
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Campaña obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Campaña no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo campaña por ID', { id: req.params.id, ip: req.ip });
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
      .input('id_campaña', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Campanas_Vacunacion WHERE id_campaña = @id_campaña');
    if (result.recordset.length === 0) {
      logger.warn('Campaña no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Campaña no encontrada');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener campaña', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/campaigns:
 *   post:
 *     summary: Crear una nueva campaña de vacunación
 *     tags: [Campaigns]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignInput'
 *     responses:
 *       201:
 *         description: Campaña creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_campaña:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateCampaign, async (req, res, next) => {
  try {
    logger.info('Creando campaña', { nombre: req.body.nombre_campaña, ip: req.ip });
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
      .input('nombre_campaña', sql.NVarChar, req.body.nombre_campaña)
      .input('fecha_inicio', sql.Date, req.body.fecha_inicio)
      .input('fecha_fin', sql.Date, req.body.fecha_fin)
      .input('objetivo', sql.NVarChar, req.body.objetivo)
      .input('id_vacuna', sql.UniqueIdentifier, req.body.id_vacuna)
      .input('estado', sql.NVarChar, req.body.estado)
      .execute('sp_CrearCampanaVacunacion');
    res.status(201).json({ id_campaña: result.recordset[0].id_campaña });
  } catch (err) {
    logger.error('Error al crear campaña', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear campaña');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/campaigns/{id}:
 *   put:
 *     summary: Actualizar una campaña de vacunación
 *     tags: [Campaigns]
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
 *             $ref: '#/components/schemas/CampaignInput'
 *     responses:
 *       204:
 *         description: Campaña actualizada exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Campaña no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [validateUUID, validateCampaign], async (req, res, next) => {
  try {
    logger.info('Actualizando campaña', { id: req.params.id, nombre: req.body.nombre_campaña, ip: req.ip });
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
      .input('id_campaña', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Campanas_Vacunacion WHERE id_campaña = @id_campaña');
    if (exists.recordset.length === 0) {
      logger.warn('Campaña no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Campaña no encontrada');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_campaña', sql.UniqueIdentifier, req.params.id)
      .input('nombre_campaña', sql.NVarChar, req.body.nombre_campaña)
      .input('fecha_inicio', sql.Date, req.body.fecha_inicio)
      .input('fecha_fin', sql.Date, req.body.fecha_fin)
      .input('objetivo', sql.NVarChar, req.body.objetivo)
      .input('id_vacuna', sql.UniqueIdentifier, req.body.id_vacuna)
      .input('estado', sql.NVarChar, req.body.estado)
      .execute('sp_ActualizarCampanaVacunacion');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar campaña', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/campaigns/{id}:
 *   delete:
 *     summary: Eliminar una campaña de vacunación
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Campaña eliminada exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Campaña no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando campaña', { id: req.params.id, ip: req.ip });
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
      .input('id_campaña', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Campanas_Vacunacion WHERE id_campaña = @id_campaña');
    if (exists.recordset.length === 0) {
      logger.warn('Campaña no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Campaña no encontrada');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_campaña', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarCampanaVacunacion');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar campaña', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;