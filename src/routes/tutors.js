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

const validateTutor = [
  body('id_niño').isUUID().withMessage('ID de niño inválido'),
  body('nombre').notEmpty().isString().withMessage('Nombre es requerido'),
  body('relacion').isIn(['Madre', 'Padre', 'Tutor Legal']).withMessage('Relación inválida'),
  body('nacionalidad').notEmpty().isString().withMessage('Nacionalidad es requerida'),
  body('identificacion').optional().isString().withMessage('Identificación debe ser una cadena válida'),
  body('telefono').optional().isString().withMessage('Teléfono debe ser una cadena válida'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('direccion').optional().isString().withMessage('Dirección debe ser una cadena válida'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * tags:
 *   name: Tutors
 *   description: Gestión de tutores (responsables)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Tutor:
 *       type: object
 *       required:
 *         - id_niño
 *         - nombre
 *         - relacion
 *         - nacionalidad
 *       properties:
 *         id_tutor:
 *           type: string
 *           format: uuid
 *           description: Identificador único del tutor
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: ID del niño asociado
 *         nombre:
 *           type: string
 *           description: Nombre completo del tutor
 *         relacion:
 *           type: string
 *           enum: [Madre, Padre, Tutor Legal]
 *           description: Relación con el niño
 *         nacionalidad:
 *           type: string
 *           description: Gentilicio del país de nacionalidad
 *         identificacion:
 *           type: string
 *           description: Identificación del tutor (opcional)
 *         telefono:
 *           type: string
 *           description: Teléfono de contacto (opcional)
 *         email:
 *           type: string
 *           description: Email de contacto (opcional)
 *         direccion:
 *           type: string
 *           description: Dirección del tutor (opcional)
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del tutor
 *       example:
 *         id_tutor: "123e4567-e89b-12d3-a456-426614174020"
 *         id_niño: "EF835A71-2B1D-4280-87B3-289606482EC7"
 *         nombre: "María Rodríguez"
 *         relacion: "Madre"
 *         nacionalidad: "Dominicano"
 *         identificacion: "001-1234567-8"
 *         telefono: "809-555-1234"
 *         email: "maria.rodriguez@example.com"
 *         direccion: "Calle 1, La Romana"
 *         estado: "Activo"
 *     TutorInput:
 *       type: object
 *       required:
 *         - id_niño
 *         - nombre
 *         - relacion
 *         - nacionalidad
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *         nombre:
 *           type: string
 *         relacion:
 *           type: string
 *           enum: [Madre, Padre, Tutor Legal]
 *         nacionalidad:
 *           type: string
 *           description: Gentilicio del país de nacionalidad
 *         identificacion:
 *           type: string
 *           nullable: true
 *         telefono:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           nullable: true
 *         direccion:
 *           type: string
 *           nullable: true
 */

/**
 * @swagger
 * /api/tutors:
 *   get:
 *     summary: Listar todos los tutores
 *     tags: [Tutors]
 *     responses:
 *       200:
 *         description: Lista de tutores obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tutor'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo todos los tutores', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Tutores');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener tutores', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener tutores');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/tutors/{id}:
 *   get:
 *     summary: Obtener un tutor por ID
 *     tags: [Tutors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del tutor
 *     responses:
 *       200:
 *         description: Tutor obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tutor'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Tutor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo tutor por ID', { id: req.params.id, ip: req.ip });
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
      .input('id_tutor', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Tutores WHERE id_tutor = @id_tutor');
    if (result.recordset.length === 0) {
      logger.warn('Tutor no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Tutor no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener tutor', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/tutors:
 *   post:
 *     summary: Crear un nuevo tutor
 *     tags: [Tutors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TutorInput'
 *     responses:
 *       201:
 *         description: Tutor creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_tutor:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateTutor, async (req, res, next) => {
  try {
    logger.info('Creando tutor', { id_niño: req.body.id_niño, nombre: req.body.nombre, ip: req.ip });
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
      .input('nombre', sql.NVarChar, req.body.nombre)
      .input('relacion', sql.NVarChar, req.body.relacion)
      .input('nacionalidad', sql.NVarChar, req.body.nacionalidad)
      .input('identificacion', sql.NVarChar, req.body.identificacion)
      .input('telefono', sql.NVarChar, req.body.telefono)
      .input('email', sql.NVarChar, req.body.email)
      .input('direccion', sql.NVarChar, req.body.direccion)
      .execute('sp_CrearTutor');
    res.status(201).json({ id_tutor: result.recordset[0].id_tutor });
  } catch (err) {
    logger.error('Error al crear tutor', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear tutor');
    error.statusCode = err.number === 50000 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/tutors/{id}:
 *   put:
 *     summary: Actualizar un tutor
 *     tags: [Tutors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del tutor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TutorInput'
 *     responses:
 *       204:
 *         description: Tutor actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Tutor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [validateUUID, validateTutor], async (req, res, next) => {
  try {
    logger.info('Actualizando tutor', { id: req.params.id, id_niño: req.body.id_niño, ip: req.ip });
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
      .input('id_tutor', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Tutores WHERE id_tutor = @id_tutor');
    if (exists.recordset.length === 0) {
      logger.warn('Tutor no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Tutor no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_tutor', sql.UniqueIdentifier, req.params.id)
      .input('id_niño', sql.UniqueIdentifier, req.body.id_niño)
      .input('nombre', sql.NVarChar, req.body.nombre)
      .input('relacion', sql.NVarChar, req.body.relacion)
      .input('nacionalidad', sql.NVarChar, req.body.nacionalidad)
      .input('identificacion', sql.NVarChar, req.body.identificacion)
      .input('telefono', sql.NVarChar, req.body.telefono)
      .input('email', sql.NVarChar, req.body.email)
      .input('direccion', sql.NVarChar, req.body.direccion)
      .execute('sp_ActualizarTutor');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar tutor', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/tutors/{id}:
 *   delete:
 *     summary: Eliminar un tutor
 *     tags: [Tutors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del tutor
 *     responses:
 *       204:
 *         description: Tutor eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Tutor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando tutor', { id: req.params.id, ip: req.ip });
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
      .input('id_tutor', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Tutores WHERE id_tutor = @id_tutor');
    if (exists.recordset.length === 0) {
      logger.warn('Tutor no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Tutor no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_tutor', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarTutor');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar tutor', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;