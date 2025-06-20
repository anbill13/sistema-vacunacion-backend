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

const validateAudit = [
  body('tabla_afectada').notEmpty().isString().withMessage('Tabla afectada es requerida'),
  body('id_registro').isUUID().withMessage('ID de registro inválido'),
  body('id_usuario').isUUID().withMessage('ID de usuario inválido'),
  body('accion').isIn(['INSERT', 'UPDATE', 'DELETE', 'SELECT']).withMessage('Acción inválida'),
  body('detalles').optional().isString().withMessage('Detalles debe ser una cadena válida'),
  body('ip_origen').optional().isIP().withMessage('IP de origen inválida'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * tags:
 *   name: Audits
 *   description: Registro de auditorías
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Audit:
 *       type: object
 *       required:
 *         - tabla_afectada
 *         - id_registro
 *         - id_usuario
 *         - accion
 *       properties:
 *         id_auditoria:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la auditoría
 *         tabla_afectada:
 *           type: string
 *           description: Tabla afectada
 *         id_registro:
 *           type: string
 *           format: uuid
 *           description: ID del registro afectado
 *         id_usuario:
 *           type: string
 *           format: uuid
 *           description: ID del usuario que realizó la acción
 *         accion:
 *           type: string
 *           enum: [INSERT, UPDATE, DELETE, SELECT]
 *           description: Acción realizada
 *         detalles:
 *           type: string
 *           description: Detalles de la acción (opcional)
 *         ip_origen:
 *           type: string
 *           description: IP de origen (opcional)
 *         fecha_registro:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora del registro
 *       example:
 *         id_auditoria: "123e4567-e89b-12d3-a456-426614174014"
 *         tabla_afectada: "Vacunas"
 *         id_registro: "123e4567-e89b-12d3-a456-426614174008"
 *         id_usuario: "123e4567-e89b-12d3-a456-426614174005"
 *         accion: "INSERT"
 *         detalles: "Nueva vacuna registrada"
 *         ip_origen: "192.168.1.1"
 *         fecha_registro: "2025-06-20T14:00:00Z"
 *     AuditInput:
 *       type: object
 *       required:
 *         - tabla_afectada
 *         - id_registro
 *         - id_usuario
 *         - accion
 *       properties:
 *         tabla_afectada:
 *           type: string
 *         id_registro:
 *           type: string
 *           format: uuid
 *         id_usuario:
 *           type: string
 *           format: uuid
 *         accion:
 *           type: string
 *           enum: [INSERT, UPDATE, DELETE, SELECT]
 *         detalles:
 *           type: string
 *           nullable: true
 *         ip_origen:
 *           type: string
 *           nullable: true
 */

/**
 * @swagger
 * /api/audits:
 *   get:
 *     summary: Listar todas las auditorías
 *     tags: [Audits]
 *     responses:
 *       200:
 *         description: Lista de auditorías obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Audit'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo auditorías', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Auditoria');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener auditorías', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener auditorías');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/audits/{id}:
 *   get:
 *     summary: Obtener una auditoría por ID
 *     tags: [Audits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Auditoría obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Audit'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Auditoría no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo auditoría por ID', { id: req.params.id, ip: req.ip });
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
      .input('id_auditoria', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Auditoria WHERE id_auditoria = @id_auditoria');
    if (result.recordset.length === 0) {
      logger.warn('Auditoría no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Auditoría no encontrada');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener auditoría', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/audits:
 *   post:
 *     summary: Registrar una entrada de auditoría
 *     tags: [Audits]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuditInput'
 *     responses:
 *       201:
 *         description: Auditoría registrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_auditoria:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateAudit, async (req, res, next) => {
  try {
    logger.info('Creando auditoría', { tabla: req.body.tabla_afectada, accion: req.body.accion, ip: req.ip });
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
      .input('tabla_afectada', sql.NVarChar, req.body.tabla_afectada)
      .input('id_registro', sql.UniqueIdentifier, req.body.id_registro)
      .input('id_usuario', sql.UniqueIdentifier, req.body.id_usuario)
      .input('accion', sql.NVarChar, req.body.accion)
      .input('detalles', sql.NVarChar, req.body.detalles)
      .input('ip_origen', sql.NVarChar, req.body.ip_origen)
      .execute('sp_RegistrarAuditoria');
    res.status(201).json({ id_auditoria: result.recordset[0].id_auditoria });
  } catch (err) {
    logger.error('Error al crear auditoría', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear auditoría');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/audits/{id}:
 *   put:
 *     summary: Actualizar una entrada de auditoría
 *     tags: [Audits]
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
 *             $ref: '#/components/schemas/AuditInput'
 *     responses:
 *       204:
 *         description: Auditoría actualizada exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Auditoría no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [validateUUID, validateAudit], async (req, res, next) => {
  try {
    logger.info('Actualizando auditoría', { id: req.params.id, tabla: req.body.tabla_afectada, ip: req.ip });
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
      .input('id_auditoria', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Auditoria WHERE id_auditoria = @id_auditoria');
    if (exists.recordset.length === 0) {
      logger.warn('Auditoría no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Auditoría no encontrada');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_auditoria', sql.UniqueIdentifier, req.params.id)
      .input('tabla_afectada', sql.NVarChar, req.body.tabla_afectada)
      .input('id_registro', sql.UniqueIdentifier, req.body.id_registro)
      .input('id_usuario', sql.UniqueIdentifier, req.body.id_usuario)
      .input('accion', sql.NVarChar, req.body.accion)
      .input('detalles', sql.NVarChar, req.body.detalles)
      .input('ip_origen', sql.NVarChar, req.body.ip_origen)
      .execute('sp_ActualizarAuditoria');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar auditoría', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/audits/{id}:
 *   delete:
 *     summary: Eliminar una entrada de auditoría
 *     tags: [Audits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Auditoría eliminada exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Auditoría no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando auditoría', { id: req.params.id, ip: req.ip });
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
      .input('id_auditoria', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Auditoria WHERE id_auditoria = @id_auditoria');
    if (exists.recordset.length === 0) {
      logger.warn('Auditoría no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Auditoría no encontrada');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_auditoria', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarAuditoria');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar auditoría', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;