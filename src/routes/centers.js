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

const validateCenter = [
  body('nombre_centro').notEmpty().isString().withMessage('Nombre del centro es requerido'),
  body('nombre_corto').optional().isString().withMessage('Nombre corto debe ser una cadena válida'),
  body('direccion').optional().isString().withMessage('Dirección debe ser una cadena válida'),
  body('latitud').optional().isFloat().withMessage('Latitud inválida'),
  body('longitud').optional().isFloat().withMessage('Longitud inválida'),
  body('telefono')
    .optional()
    .isString()
    .matches(/^\+?[\d\s\-()]{7,15}$/)
    .withMessage('Teléfono debe ser un número válido (e.g., +1-809-532-0001)'),
  body('director').optional().isString().withMessage('Director debe ser una cadena válida'),
  body('sitio_web').optional().isURL().withMessage('Sitio web inválido'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * tags:
 *   name: Centers
 *   description: Gestión de centros de vacunación
 */

/**
 * @swagger
 * /api/centers:
 *   get:
 *     summary: Listar todos los centros de vacunación
 *     tags: [Centers]
 *     responses:
 *       200:
 *         description: Lista de centros obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Center'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo centros de vacunación', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Centros_Vacunacion WHERE estado = \'Activo\'');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener centros', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener centros');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/centers/{id}:
 *   get:
 *     summary: Obtener un centro de vacunación por ID
 *     tags: [Centers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro de vacunación
 *     responses:
 *       200:
 *         description: Centro obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Center'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Centro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo centro por ID', { id: req.params.id, ip: req.ip });
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
      .query('SELECT * FROM Centros_Vacunacion WHERE id_centro = @id_centro');
    if (result.recordset.length === 0) {
      logger.warn('Centro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Centro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener centro', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/centers:
 *   post:
 *     summary: Crear un nuevo centro de vacunación
 *     tags: [Centers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CenterInput'
 *     responses:
 *       201:
 *         description: Centro creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_centro:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/', validateCenter, async (req, res, next) => {
  try {
    logger.info('Creando centro de vacunación', { nombre: req.body.nombre_centro, ip: req.ip });
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
      .input('nombre_centro', sql.NVarChar, req.body.nombre_centro)
      .input('nombre_corto', sql.NVarChar, req.body.nombre_corto || null)
      .input('direccion', sql.NVarChar, req.body.direccion || null)
      .input('latitud', sql.Decimal(9, 6), req.body.latitud ?? null)
      .input('longitud', sql.Decimal(9, 6), req.body.longitud ?? null)
      .input('telefono', sql.NVarChar, req.body.telefono || null)
      .input('director', sql.NVarChar, req.body.director || null)
      .input('sitio_web', sql.NVarChar, req.body.sitio_web || null)
      .execute('sp_CrearCentroVacunacion');
    res.status(201).json({ id_centro: result.recordset[0].id_centro });
  } catch (err) {
    logger.error('Error al crear centro', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear centro');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/centers/{id}:
 *   put:
 *     summary: Actualizar un centro de vacunación
 *     tags: [Centers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro de vacunación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CenterInput'
 *     responses:
 *       204:
 *         description: Centro actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Centro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.put('/:id', [validateUUID, validateCenter], async (req, res, next) => {
  try {
    logger.info('Actualizando centro', { id: req.params.id, nombre: req.body.nombre_centro, ip: req.ip });
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
      .query('SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro');
    if (exists.recordset.length === 0) {
      logger.warn('Centro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Centro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .input('nombre_centro', sql.NVarChar, req.body.nombre_centro)
      .input('nombre_corto', sql.NVarChar, req.body.nombre_corto || null)
      .input('direccion', sql.NVarChar, req.body.direccion || null)
      .input('latitud', sql.Decimal(9, 6), req.body.latitud ?? null)
      .input('longitud', sql.Decimal(9, 6), req.body.longitud ?? null)
      .input('telefono', sql.NVarChar, req.body.telefono || null)
      .input('director', sql.NVarChar, req.body.director || null)
      .input('sitio_web', sql.NVarChar, req.body.sitio_web || null)
      .execute('sp_ActualizarCentroVacunacion');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar centro', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/centers/{id}:
 *   delete:
 *     summary: Eliminar un centro de vacunación
 *     tags: [Centers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro de vacunación
 *     responses:
 *       204:
 *         description: Centro eliminado exitosamente
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Centro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando centro', { id: req.params.id, ip: req.ip });
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
      .query('SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro');
    if (exists.recordset.length === 0) {
      logger.warn('Centro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Centro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarCentroVacunacion');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar centro', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/centers/{id}/children:
 *   get:
 *     summary: Obtener todos los niños asociados a un centro de vacunación
 *     tags: [Centers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro de vacunación
 *     responses:
 *       200:
 *         description: Lista de niños obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Child'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Centro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/:id/children', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo niños por centro', { id: req.params.id, ip: req.ip });
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
      .query('SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro');
    if (exists.recordset.length === 0) {
      logger.warn('Centro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Centro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    const result = await pool
      .request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerNinosPorCentro');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener niños', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;