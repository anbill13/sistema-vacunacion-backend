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

const validateSupply = [
  body('nombre_suministro').notEmpty().isString().withMessage('Nombre del suministro es requerido'),
  body('tipo_suministro').optional().isString().withMessage('Tipo de suministro debe ser una cadena válida'),
  body('cantidad_total').isInt({ min: 1 }).withMessage('Cantidad total debe ser un número positivo'),
  body('cantidad_disponible').isInt({ min: 0 }).withMessage('Cantidad disponible debe ser un número no negativo'),
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('fecha_entrada').isDate().withMessage('Fecha de entrada inválida'),
  body('fecha_vencimiento').optional().isDate().withMessage('Fecha de vencimiento inválida'),
  body('proveedor').optional().isString().withMessage('Proveedor debe ser una cadena válida'),
  body('condiciones_almacenamiento').optional().isString().withMessage('Condiciones de almacenamiento debe ser una cadena válida'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * tags:
 *   name: Supplies
 *   description: Gestión de suministros
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Supply:
 *       type: object
 *       required:
 *         - nombre_suministro
 *         - cantidad_total
 *         - cantidad_disponible
 *         - id_centro
 *         - fecha_entrada
 *       properties:
 *         id_suministro:
 *           type: string
 *           format: uuid
 *           description: Identificador único del suministro
 *         nombre_suministro:
 *           type: string
 *           description: Nombre del suministro
 *         tipo_suministro:
 *           type: string
 *           description: Tipo de suministro (opcional)
 *         cantidad_total:
 *           type: integer
 *           description: Cantidad total
 *         cantidad_disponible:
 *           type: integer
 *           description: Cantidad disponible
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro
 *         fecha_entrada:
 *           type: string
 *           format: date
 *           description: Fecha de entrada
 *         fecha_vencimiento Borne * tipo_suministro:
 *          type: string
 *          description: Tipo de suministro (opcional)
 *       example:
 *         id_suministro: "123e4567-e89b-12d3-a456-426614174015"
 *         nombre_suministro: "Vacuna contra el sarampión"
 *         tipo_suministro: "Vacuna"
 *         cantidad_total: 100
 *         cantidad_disponible: 80
 *         id_centro: "123e4567-e89b-12d3-a456-426614174007"
 *         fecha_entrada: "2025-06-01"
 *         fecha_vencimiento: "2026-06-01"
 *         proveedor: "Farmacéutica XYZ"
 *         condiciones_almacenamiento: "Refrigerar entre 2-8°C"
 *     SupplyInput:
 *       type: object
 *       required:
 *         - nombre_suministro
 *         - cantidad_total
 *         - cantidad_disponible
 *         - id_centro
 *         - fecha_entrada
 *       properties:
 *         nombre_suministro:
 *           type: string
 *         tipo_suministro:
 *           type: string
 *           nullable: true
 *         cantidad_total:
 *           type: integer
 *         cantidad_disponible:
 *           type: integer
 *         id_centro:
 *           type: string
 *           format: uuid
 *         fecha_entrada:
 *           type: string
 *           format: date
 *         fecha_vencimiento:
 *           type: string
 *           format: date
 *           nullable: true
 *         proveedor:
 *           type: string
 *           nullable: true
 *         condiciones_almacenamiento:
 *           type: string
 *           nullable: true
 */

/**
 * @swagger
 * /api/supplies:
 *   get:
 *     summary: Listar todos los suministros
 *     tags: [Supplies]
 *     responses:
 *       200:
 *         description: Lista de suministros obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Supply'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo suministros', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Inventario_Suministros');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener suministros', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener suministros');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/supplies/{id}:
 *   get:
 *     summary: Obtener un suministro por ID
 *     tags: [Supplies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Suministro obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Supply'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Suministro no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo suministro por ID', { id: req.params.id, ip: req.ip });
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
      .input('id_suministro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Inventario_Suministros WHERE id_suministro = @id_suministro');
    if (result.recordset.length === 0) {
      logger.warn('Suministro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Suministro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener suministro', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/supplies:
 *   post:
 *     summary: Crear un nuevo suministro
 *     tags: [Supplies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SupplyInput'
 *     responses:
 *       201:
 *         description: Suministro creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_suministro:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateSupply, async (req, res, next) => {
  try {
    logger.info('Creando suministro', { nombre: req.body.nombre_suministro, ip: req.ip });
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
      .input('nombre_suministro', sql.NVarChar, req.body.nombre_suministro)
      .input('tipo_suministro', sql.NVarChar, req.body.tipo_suministro)
      .input('cantidad_total', sql.Int, req.body.cantidad_total)
      .input('cantidad_disponible', sql.Int, req.body.cantidad_disponible)
      .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
      .input('fecha_entrada', sql.Date, req.body.fecha_entrada)
      .input('fecha_vencimiento', sql.Date, req.body.fecha_vencimiento)
      .input('proveedor', sql.NVarChar, req.body.proveedor)
      .input('condiciones_almacenamiento', sql.NVarChar, req.body.condiciones_almacenamiento)
      .execute('sp_CrearSuministro');
    res.status(201).json({ id_suministro: result.recordset[0].id_suministro });
  } catch (err) {
    logger.error('Error al crear suministro', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear suministro');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/supplies/{id}:
 *   put:
 *     summary: Actualizar un suministro
 *     tags: [Supplies]
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
 *             $ref: '#/components/schemas/SupplyInput'
 *     responses:
 *       204:
 *         description: Suministro actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Suministro no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [validateUUID, validateSupply], async (req, res, next) => {
  try {
    logger.info('Actualizando suministro', { id: req.params.id, nombre: req.body.nombre_suministro, ip: req.ip });
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
      .input('id_suministro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Inventario_Suministros WHERE id_suministro = @id_suministro');
    if (exists.recordset.length === 0) {
      logger.warn('Suministro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Suministro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_suministro', sql.UniqueIdentifier, req.params.id)
      .input('nombre_suministro', sql.NVarChar, req.body.nombre_suministro)
      .input('tipo_suministro', sql.NVarChar, req.body.tipo_suministro)
      .input('cantidad_total', sql.Int, req.body.cantidad_total)
      .input('cantidad_disponible', sql.Int, req.body.cantidad_disponible)
      .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
      .input('fecha_entrada', sql.Date, req.body.fecha_entrada)
      .input('fecha_vencimiento', sql.Date, req.body.fecha_vencimiento)
      .input('proveedor', sql.NVarChar, req.body.proveedor)
      .input('condiciones_almacenamiento', sql.NVarChar, req.body.condiciones_almacenamiento)
      .execute('sp_ActualizarSuministro');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar suministro', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/supplies/{id}:
 *   delete:
 *     summary: Eliminar un suministro
 *     tags: [Supplies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Suministro eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Suministro no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando suministro', { id: req.params.id, ip: req.ip });
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
      .input('id_suministro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Inventario_Suministros WHERE id_suministro = @id_suministro');
    if (exists.recordset.length === 0) {
      logger.warn('Suministro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Suministro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_suministro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarSuministro');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar suministro', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;