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

const validateHealthStaff = [
  body('nombre_completo').notEmpty().isString().withMessage('Nombre completo es requerido'),
  body('identificacion').notEmpty().isString().withMessage('Identificación es requerida'),
  body('especialidad').notEmpty().isString().withMessage('Especialidad es requerida'),
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('telefono').optional().isString().withMessage('Teléfono debe ser una cadena válida'),
  body('email').optional().isEmail().withMessage('Email inválido'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * tags:
 *   name: HealthStaff
 *   description: Gestión de personal de salud
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     HealthStaff:
 *       type: object
 *       required:
 *         - nombre_completo
 *         - identificacion
 *         - especialidad
 *         - id_centro
 *       properties:
 *         id_personal:
 *           type: string
 *           format: uuid
 *           description: Identificador único del personal
 *         nombre_completo:
 *           type: string
 *           description: Nombre completo del personal
 *         identificacion:
 *           type: string
 *           description: Identificación del personal
 *         especialidad:
 *           type: string
 *           description: Especialidad del personal
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro
 *         telefono:
 *           type: string
 *           description: Teléfono del personal (opcional)
 *         email:
 *           type: string
 *           description: Email del personal (opcional)
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del personal
 *       example:
 *         id_personal: "123e4567-e89b-12d3-a456-426614174011"
 *         nombre_completo: "Juan Pérez"
 *         identificacion: "123456789"
 *         especialidad: "Enfermero"
 *         id_centro: "123e4567-e89b-12d3-a456-426614174007"
 *         telefono: "123-456-7890"
 *         email: "juan.perez@example.com"
 *         estado: "Activo"
 *     HealthStaffInput:
 *       type: object
 *       required:
 *         - nombre_completo
 *         - identificacion
 *         - especialidad
 *         - id_centro
 *       properties:
 *         nombre_completo:
 *           type: string
 *         identificacion:
 *           type: string
 *         especialidad:
 *           type: string
 *         id_centro:
 *           type: string
 *           format: uuid
 *         telefono:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           nullable: true
 */

/**
 * @swagger
 * /api/health-staff:
 *   get:
 *     summary: Listar todo el personal de salud
 *     tags: [HealthStaff]
 *     responses:
 *       200:
 *         description: Lista de personal obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/HealthStaff'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo personal de salud', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Personal_Salud');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener personal de salud', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener personal de salud');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/health-staff/{id}:
 *   get:
 *     summary: Obtener un miembro del personal de salud por ID
 *     tags: [HealthStaff]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Personal obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStaff'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Personal no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo personal de salud por ID', { id: req.params.id, ip: req.ip });
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
      .input('id_personal', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Personal_Salud WHERE id_personal = @id_personal');
    if (result.recordset.length === 0) {
      logger.warn('Personal no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Personal no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener personal de salud', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/health-staff:
 *   post:
 *     summary: Crear un nuevo miembro del personal de salud
 *     tags: [HealthStaff]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HealthStaffInput'
 *     responses:
 *       201:
 *         description: Personal creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_personal:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateHealthStaff, async (req, res, next) => {
  try {
    logger.info('Creando personal de salud', { nombre: req.body.nombre_completo, ip: req.ip });
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
      .input('nombre_completo', sql.NVarChar, req.body.nombre_completo)
      .input('identificacion', sql.NVarChar, req.body.identificacion)
      .input('especialidad', sql.NVarChar, req.body.especialidad)
      .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
      .input('telefono', sql.NVarChar, req.body.telefono)
      .input('email', sql.NVarChar, req.body.email)
      .query('INSERT INTO Personal_Salud (nombre_completo, identificacion, especialidad, id_centro, telefono, email) OUTPUT INSERTED.id_personal VALUES (@nombre_completo, @identificacion, @especialidad, @id_centro, @telefono, @email)');
    res.status(201).json({ id_personal: result.recordset[0].id_personal });
  } catch (err) {
    logger.error('Error al crear personal de salud', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear personal de salud');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/health-staff/{id}:
 *   put:
 *     summary: Actualizar un miembro del personal de salud
 *     tags: [HealthStaff]
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
 *             $ref: '#/components/schemas/HealthStaffInput'
 *     responses:
 *       204:
 *         description: Personal actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Personal no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [validateUUID, validateHealthStaff], async (req, res, next) => {
  try {
    logger.info('Actualizando personal de salud', { id: req.params.id, nombre: req.body.nombre_completo, ip: req.ip });
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
      .input('id_personal', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Personal_Salud WHERE id_personal = @id_personal');
    if (exists.recordset.length === 0) {
      logger.warn('Personal no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Personal no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_personal', sql.UniqueIdentifier, req.params.id)
      .input('nombre_completo', sql.NVarChar, req.body.nombre_completo)
      .input('identificacion', sql.NVarChar, req.body.identificacion)
      .input('especialidad', sql.NVarChar, req.body.especialidad)
      .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
      .input('telefono', sql.NVarChar, req.body.telefono)
      .input('email', sql.NVarChar, req.body.email)
      .query('UPDATE Personal_Salud SET nombre_completo = @nombre_completo, identificacion = @identificacion, especialidad = @especialidad, id_centro = @id_centro, telefono = @telefono, email = @email WHERE id_personal = @id_personal');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar personal de salud', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/health-staff/{id}:
 *   delete:
 *     summary: Eliminar un miembro del personal de salud
 *     tags: [HealthStaff]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Personal eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Personal no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando personal de salud', { id: req.params.id, ip: req.ip });
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
      .input('id_personal', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Personal_Salud WHERE id_personal = @id_personal');
    if (exists.recordset.length === 0) {
      logger.warn('Personal no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Personal no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_personal', sql.UniqueIdentifier, req.params.id)
      .query('DELETE FROM Personal_Salud WHERE id_personal = @id_personal');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar personal de salud', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;