const express = require('express');
const { param, validationResult } = require('express-validator');
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

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Generación de reportes y estadísticas
 */

/**
 * @swagger
 * /api/reports/coverage/{id}:
 *   get:
 *     summary: Obtener cobertura de vacunación por centro
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro
 *     responses:
 *       200:
 *         description: Cobertura obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   centro:
 *                     type: string
 *                   vacunados:
 *                     type: integer
 *                   total:
 *                     type: integer
 *                   porcentaje:
 *                     type: number
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Centro no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/coverage/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo cobertura de vacunación por centro', { id_centro: req.params.id, ip: req.ip });
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
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Centros WHERE id_centro = @id_centro');
    if (exists.recordset.length === 0) {
      logger.warn('Centro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Centro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    const result = await pool
      .request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerCoberturaVacunacion');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener cobertura de vacunación', { id_centro: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/reports/incomplete-schedules/{id}:
 *   get:
 *     summary: Obtener niños con esquemas incompletos por centro
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro
 *     responses:
 *       200:
 *         description: Lista de niños con esquemas incompletos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_niño:
 *                     type: string
 *                     format: uuid
 *                   nombre_completo:
 *                     type: string
 *                   vacunas_faltantes:
 *                     type: integer
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Centro no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/incomplete-schedules/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo esquemas incompletos por centro', { id_centro: req.params.id, ip: req.ip });
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
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Centros WHERE id_centro = @id_centro');
    if (exists.recordset.length === 0) {
      logger.warn('Centro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Centro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    const result = await pool
      .request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerEsquemasIncompletos');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener esquemas incompletos', { id_centro: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Listar todos los reportes disponibles
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Lista de reportes disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   tipo:
 *                     type: string
 *                   descripcion:
 *                     type: string
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo reportes disponibles', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT DISTINCT tipo_reporte AS tipo, descripcion FROM Reportes_Disponibles');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener reportes disponibles', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener reportes disponibles');
    error.statusCode = 500;
    next(error);
  }
});

module.exports = router;