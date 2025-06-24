const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { poolPromise, sql } = require('../config/db');
const winston = require('winston');
const bcrypt = require('bcrypt');

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
  body('id_niño')
    .optional({ nullable: true })
    .custom(value => {
      if (value === null) return true;
      if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error('ID de niño inválido');
      }
      return true;
    }).withMessage('ID de niño inválido'),
  body('nombre').notEmpty().isString().withMessage('Nombre es requerido'),
  body('relacion')
    .notEmpty().withMessage('Relación es requerida')
    .customSanitizer(value => {
      if (typeof value === 'string') {
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      }
      return value;
    })
    .isIn(['Madre', 'Padre', 'Tutor Legal']).withMessage('Relación inválida'),
  body('nacionalidad').notEmpty().isString().withMessage('Nacionalidad es requerida'),
  body('identificacion').optional().isString().withMessage('Identificación debe ser una cadena válida'),
  body('telefono').optional().isString().withMessage('Teléfono debe ser una cadena válida'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('direccion').optional().isString().withMessage('Dirección debe ser una cadena válida'),
  body('username').notEmpty().isString().withMessage('Nombre de usuario es requerido'),
  body('password').notEmpty().isString().withMessage('Contraseña es requerida')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
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
 *           description: ID del niño asociado (opcional)
 *           nullable: true
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
 *           description: Número de identificación del tutor (opcional)
 *           nullable: true
 *         telefono:
 *           type: string
 *           description: Número de teléfono de contacto (opcional)
 *           nullable: true
 *         email:
 *           type: string
 *           description: Correo electrónico de contacto (opcional)
 *           nullable: true
 *         direccion:
 *           type: string
 *           description: Dirección física del tutor (opcional)
 *           nullable: true
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del tutor
 *       example:
 *         id_tutor: "123e4567-e89b-12d3-a456-426614174020"
 *         id_niño: null
 *         nombre: "María Rodríguez"
 *         relacion: "Madre"
 *         nacionalidad: "Dominicano"
 *         identificacion: "001-1234567-8"
 *         telefono: "809-555-1234"
 *         email: "maria.rodriguez@example.com"
 *         direccion: "Calle Principal 123, La Romana"
 *         estado: "Activo"
 *     TutorInput:
 *       type: object
 *       required:
 *         - nombre
 *         - relacion
 *         - nacionalidad
 *         - username
 *         - password
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: Identificador único del niño asociado (opcional)
 *           nullable: true
 *         nombre:
 *           type: string
 *           description: Nombre completo del tutor
 *         relacion:
 *           type: string
 *           enum: [Madre, Padre, Tutor Legal]
 *           description: Relación del tutor con el niño
 *         nacionalidad:
 *           type: string
 *           description: Gentilicio del país de nacionalidad (debe existir en la tabla Paises)
 *         identificacion:
 *           type: string
 *           description: Número de identificación del tutor (opcional)
 *           nullable: true
 *         telefono:
 *           type: string
 *           description: Número de teléfono de contacto (opcional)
 *           nullable: true
 *         email:
 *           type: string
 *           description: Correo electrónico de contacto (opcional)
 *           nullable: true
 *         direccion:
 *           type: string
 *           description: Dirección física del tutor (opcional)
 *           nullable: true
 *         username:
 *           type: string
 *           description: Nombre de usuario único para el acceso al sistema
 *         password:
 *           type: string
 *           description: Contraseña para el acceso al sistema (mínimo 8 caracteres)
 *       example:
 *         id_niño: "550e8400-e29b-41d4-a716-446655440000"
 *         nombre: "María Rodríguez"
 *         relacion: "Madre"
 *         nacionalidad: "Dominicano"
 *         identificacion: "001-1234567-8"
 *         telefono: "809-555-1234"
 *         email: "maria.rodriguez@example.com"
 *         direccion: "Calle Principal 123, La Romana"
 *         username: "maria.rodriguez"
 *         password: "SecurePass123"
 *     Niño:
 *       type: object
 *       required:
 *         - nombre_completo
 *         - identificacion
 *         - nacionalidad
 *         - pais_nacimiento
 *         - fecha_nacimiento
 *         - genero
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: Identificador único del niño
 *         nombre_completo:
 *           type: string
 *           description: Nombre completo del niño
 *         identificacion:
 *           type: string
 *           description: Número de identificación del niño
 *         nacionalidad:
 *           type: string
 *           description: Gentilicio del país de nacionalidad
 *         pais_nacimiento:
 *           type: string
 *           description: Nombre del país de nacimiento
 *         fecha_nacimiento:
 *           type: string
 *           format: date
 *           description: Fecha de nacimiento del niño
 *         genero:
 *           type: string
 *           enum: [M, F, O]
 *           description: Género del niño (M, F, O)
 *         direccion_residencia:
 *           type: string
 *           description: Dirección de residencia del niño (opcional)
 *           nullable: true
 *         latitud:
 *           type: number
 *           description: Latitud de la dirección (opcional)
 *           nullable: true
 *         longitud:
 *           type: number
 *           description: Longitud de la dirección (opcional)
 *           nullable: true
 *         id_centro_salud:
 *           type: string
 *           format: uuid
 *           description: ID del centro de salud asociado (opcional)
 *           nullable: true
 *         contacto_principal:
 *           type: string
 *           description: Contacto principal del niño (opcional)
 *           nullable: true
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del niño
 *       example:
 *         id_niño: "550e8400-e29b-41d4-a716-446655440000"
 *         nombre_completo: "Juan Pérez"
 *         identificacion: "001-9876543-2"
 *         nacionalidad: "Dominicano"
 *         pais_nacimiento: "República Dominicana"
 *         fecha_nacimiento: "2015-06-15"
 *         genero: "M"
 *         direccion_residencia: "Calle Secundaria 456, Santo Domingo"
 *         latitud: 18.486057
 *         longitud: -69.931212
 *         id_centro_salud: "123e4567-e89b-12d3-a456-426614174000"
 *         contacto_principal: "María Rodríguez"
 *         estado: "Activo"
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
 *     summary: Crear un nuevo tutor y usuario asociado
 *     tags: [Tutors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TutorInput'
 *     responses:
 *       201:
 *         description: Tutor y usuario creados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_tutor:
 *                   type: string
 *                   format: uuid
 *                   description: Identificador único del tutor creado
 *                 id_usuario:
 *                   type: string
 *                   format: uuid
 *                   description: Identificador único del usuario creado
 *               example:
 *                 id_tutor: "123e4567-e89b-12d3-a456-426614174020"
 *                 id_usuario: "789a1234-b56c-78d9-e012-345678901234"
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateTutor, async (req, res, next) => {
  try {
    logger.info('Creando tutor y usuario', {
      id_niño: req.body.id_niño || 'No proporcionado',
      nombre: req.body.nombre,
      username: req.body.username,
      ip: req.ip
    });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = errors.array();
      throw error;
    }

    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(req.body.password, saltRounds);

    const pool = await poolPromise;
    const request = pool.request()
      .input('id_niño', sql.UniqueIdentifier, req.body.id_niño || null)
      .input('nombre', sql.NVarChar, req.body.nombre)
      .input('relacion', sql.NVarChar, req.body.relacion)
      .input('nacionalidad', sql.NVarChar, req.body.nacionalidad)
      .input('identificacion', sql.NVarChar, req.body.identificacion || null)
      .input('telefono', sql.NVarChar, req.body.telefono || null)
      .input('email', sql.NVarChar, req.body.email || null)
      .input('direccion', sql.NVarChar, req.body.direccion || null)
      .input('username', sql.NVarChar, req.body.username)
      .input('password_hash', sql.NVarChar, password_hash)
      .output('id_tutor_output', sql.UniqueIdentifier)
      .output('id_usuario_output', sql.UniqueIdentifier);

    const result = await request.execute('sp_CrearTutor');
    const id_tutor = result.output.id_tutor_output;
    const id_usuario = result.output.id_usuario_output;

    if (!id_tutor || !id_usuario) {
      logger.warn('No se obtuvo id_tutor o id_usuario del procedimiento almacenado', { ip: req.ip });
      throw new Error('No se pudo crear el tutor o el usuario');
    }

    res.status(201).json({ id_tutor, id_usuario });
  } catch (err) {
    logger.error('Error al crear tutor y usuario', { error: err.message, ip: req.ip });
    const error = new Error(err.message || 'Error al crear tutor y usuario');
    error.statusCode = 400;
    error.data = err.data || { message: err.message };
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
    logger.info('Actualizando tutor', {
      id: req.params.id,
      id_niño: req.body.id_niño || 'No proporcionado',
      nombre: req.body.nombre,
      ip: req.ip
    });
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
      .input('id_niño', sql.UniqueIdentifier, req.body.id_niño || null)
      .input('nombre', sql.NVarChar, req.body.nombre)
      .input('relacion', sql.NVarChar, req.body.relacion)
      .input('nacionalidad', sql.NVarChar, req.body.nacionalidad)
      .input('identificacion', sql.NVarChar, req.body.identificacion || null)
      .input('telefono', sql.NVarChar, req.body.telefono || null)
      .input('email', sql.NVarChar, req.body.email || null)
      .input('direccion', sql.NVarChar, req.body.direccion || null)
      .execute('sp_ActualizarTutor');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar tutor', { id: req.params.id, error: err.message, ip: req.ip });
    const error = new Error(err.message || 'Error al actualizar tutor');
    error.statusCode = err.statusCode || 500;
    error.data = err.message ? { message: err.message } : null;
    next(error);
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
 *         description: ID inválido o tutor vinculado a un niño
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
    const error = new Error(err.message || 'Error al eliminar tutor');
    error.statusCode = err.message.includes('vinculado a un niño') ? 400 : (err.statusCode || 500);
    error.data = err.message ? { message: err.message } : null;
    next(error);
  }
});

/**
 * @swagger
 * /api/tutors/{id}/children:
 *   get:
 *     summary: Obtener los niños asociados a un tutor
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
 *         description: Lista de niños obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Niño'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Tutor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id/children', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo niños por tutor', { id: req.params.id, ip: req.ip });
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
      .execute('sp_ObtenerNiñosPorTutor');

    if (result.recordset.length === 0) {
      logger.info('No se encontraron niños para el tutor', { id: req.params.id, ip: req.ip });
      return res.status(200).json([]);
    }

    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener niños por tutor', { id: req.params.id, error: err.message, ip: req.ip });
    const error = new Error(err.message || 'Error al obtener niños');
    error.statusCode = err.message.includes('no existe') ? 404 : (err.statusCode || 500);
    error.data = err.message ? { message: err.message } : null;
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{userId}/patients:
 *   get:
 *     summary: Obtener los pacientes asociados a un usuario
 *     tags: [Tutors]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario asociado al tutor
 *     responses:
 *       200:
 *         description: Lista de pacientes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Niño'
 *       400:
 *         description: ID de usuario inválido
 *       404:
 *         description: Usuario no encontrado o no asociado a un tutor
 *       500:
 *         description: Error interno del servidor
 */

router.get(
  '/users/:userId/patients',
  [param('userId').isUUID().withMessage('ID de usuario inválido')],
  async (req, res, next) => {
    try {
      logger.info('Obteniendo pacientes por usuario', {
        id_usuario: req.params.userId,
        ip: req.ip,
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validación fallida', {
          id_usuario: req.params.userId,
          errors: errors.array(),
          ip: req.ip,
        });
        return res.status(400).json({
          message: 'Validación fallida',
          errors: errors.array(),
        });
      }

      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_usuario', sql.UniqueIdentifier, req.params.userId)
        .execute('sp_ObtenerPacientesPorUsuario');

      const pacientes = result.recordset;

      if (pacientes.length === 0) {
        logger.info('No se encontraron pacientes para el usuario', {
          id_usuario: req.params.userId,
          ip: req.ip,
        });
        return res.status(200).json([]);
      }

      res.status(200).json(pacientes);
    } catch (err) {
      logger.error('Error al obtener pacientes por usuario', {
        id_usuario: req.params.userId,
        error: err.message,
        ip: req.ip,
      });

      const isUserError =
        err.message.includes('no existe') ||
        err.message.includes('no asociado');

      res.status(isUserError ? 404 : 500).json({
        message: err.message || 'Error al obtener pacientes',
      });
    }
  }
);

module.exports = router;


module.exports = router;