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

const validateUser = [
  body('nombre').notEmpty().isString().withMessage('Nombre es requerido'),
  body('rol').isIn(['doctor', 'director', 'responsable', 'administrador']).withMessage('Rol inválido'),
  body('id_centro').optional().isUUID().withMessage('ID de centro inválido'),
  body('username').notEmpty().isString().withMessage('Nombre de usuario es requerido'),
  body('password').notEmpty().isString().withMessage('Contraseña es requerida'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('telefono').optional().isString().matches(/^\+?[\d\s\-()]{7,15}$/).withMessage('Teléfono debe ser un número válido (e.g., +1-809-532-0001)'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * openapi: 3.0.3
 * info:
 *   title: User Management API
 *   description: API para la gestión de usuarios en el sistema de vacunación
 *   version: 1.0.0
 * servers:
 *   - url: /api
 *     description: Base URL for the API
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id_usuario:
 *           type: string
 *           format: uuid
 *           description: Identificador único del usuario
 *           example: "3031019A-8658-4567-B284-D610A8AC7766"
 *         nombre:
 *           type: string
 *           description: Nombre del usuario
 *           example: "Juan Pérez"
 *         rol:
 *           type: string
 *           enum: [doctor, director, responsable, administrador]
 *           description: Rol del usuario
 *           example: "doctor"
 *         id_centro:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: ID del centro asociado
 *           example: "3031019A-8658-4567-B284-D610A8AC7767"
 *         username:
 *           type: string
 *           description: Nombre de usuario
 *           example: "juanperez"
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *           description: Email del usuario
 *           example: "juan@example.com"
 *         telefono:
 *           type: string
 *           nullable: true
 *           description: Teléfono del usuario
 *           example: "+1-809-532-0001"
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del usuario
 *           example: "Activo"
 *       required:
 *         - id_usuario
 *         - nombre
 *         - rol
 *         - username
 *         - estado
 *     UserInput:
 *       type: object
 *       properties:
 *         nombre:
 *           type: string
 *           description: Nombre del usuario
 *           example: "Juan Pérez"
 *         rol:
 *           type: string
 *           enum: [doctor, director, responsable, administrador]
 *           description: Rol del usuario
 *           example: "doctor"
 *         id_centro:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: ID del centro asociado
 *           example: "3031019A-8658-4567-B284-D610A8AC7767"
 *         username:
 *           type: string
 *           description: Nombre de usuario
 *           example: "juanperez"
 *         password:
 *           type: string
 *           description: Contraseña (se hashéa antes de guardar)
 *           example: "password123"
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *           description: Email del usuario
 *           example: "juan@example.com"
 *         telefono:
 *           type: string
 *           nullable: true
 *           description: Teléfono del usuario
 *           example: "+1-809-532-0001"
 *       required:
 *         - nombre
 *         - rol
 *         - username
 *         - password
 * tags:
 *   - name: Users
 *     description: Gestión de usuarios
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Listar todos los usuarios (activos e inactivos)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al obtener usuarios
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo todos los usuarios', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Usuarios');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener usuarios', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener usuarios');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Validación fallida
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *                       location:
 *                         type: string
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al obtener usuario
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo usuario por ID', { id: req.params.id, ip: req.ip });
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
      .input('id_usuario', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerUsuario');
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener usuario', { id: req.params.id, error: err.message, ip: req.ip });
    if (err.number === 50001) { // Custom error from stored procedure
      err.statusCode = 404;
      err.message = 'Usuario no encontrado';
    } else {
      err.statusCode = err.statusCode || 500;
    }
    next(err);
  }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crear un nuevo usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *           example:
 *             nombre: "Juan Pérez"
 *             rol: "doctor"
 *             id_centro: "3031019A-8658-4567-B284-D610A8AC7767"
 *             username: "juanperez"
 *             password: "password123"
 *             email: "juan@example.com"
 *             telefono: "+1-809-532-0001"
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_usuario:
 *                   type: string
 *                   format: uuid
 *                   example: "3031019A-8658-4567-B284-D610A8AC7766"
 *       400:
 *         description: Error en los datos enviados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Validación fallida
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *                       location:
 *                         type: string
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al crear usuario
 */
router.post('/', validateUser, async (req, res, next) => {
  try {
    logger.info('Creando usuario', { username: req.body.username, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = errors.array();
      throw error;
    }
    const { nombre, rol, id_centro, username, password, email, telefono } = req.body;
    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 10);
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('nombre', sql.NVarChar, nombre)
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email || null)
      .input('password_hash', sql.NVarChar, password_hash)
      .input('rol', sql.NVarChar, rol)
      .input('id_centro', sql.UniqueIdentifier, id_centro || null)
      .input('telefono', sql.NVarChar, telefono || null)
      .query(
        'INSERT INTO Usuarios (nombre, username, email, password_hash, rol, id_centro, telefono, estado) VALUES (@nombre, @username, @email, @password_hash, @rol, @id_centro, @telefono, \'Activo\'); SELECT SCOPE_IDENTITY() AS id_usuario'
      );
    res.status(201).json({ id_usuario: result.recordset[0].id_usuario });
  } catch (err) {
    logger.error('Error al crear usuario', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear usuario');
    error.statusCode = err.number === 2627 ? 400 : 500; // 2627 is SQL Server's duplicate key error
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Actualizar un usuario
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *           example:
 *             nombre: "Juan Pérez"
 *             rol: "doctor"
 *             id_centro: "3031019A-8658-4567-B284-D610A8AC7767"
 *             username: "juanperez"
 *             password: "newpassword123"
 *             email: "juan@example.com"
 *             telefono: "+1-809-532-0001"
 *     responses:
 *       204:
 *         description: Usuario actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Validación fallida
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *                       location:
 *                         type: string
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al actualizar usuario
 */
router.put('/:id', [validateUUID, validateUser], async (req, res, next) => {
  try {
    logger.info('Actualizando usuario', { id: req.params.id, username: req.body.username, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { id: req.params.id, errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = errors.array();
      throw error;
    }
    const { nombre, rol, id_centro, username, password, email, telefono } = req.body;
    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 10);
    const pool = await poolPromise;
    const exists = await pool
      .request()
      .input('id_usuario', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Usuarios WHERE id_usuario = @id_usuario');
    if (exists.recordset.length === 0) {
      logger.warn('Usuario no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_usuario', sql.UniqueIdentifier, req.params.id)
      .input('nombre', sql.NVarChar, nombre)
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email || null)
      .input('password_hash', sql.NVarChar, password_hash)
      .input('rol', sql.NVarChar, rol)
      .input('id_centro', sql.UniqueIdentifier, id_centro || null)
      .input('telefono', sql.NVarChar, telefono || null)
      .query(
        'UPDATE Usuarios SET nombre = @nombre, username = @username, email = @email, password_hash = @password_hash, rol = @rol, id_centro = @id_centro, telefono = @telefono WHERE id_usuario = @id_usuario'
      );
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar usuario', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Desactivar un usuario
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario
 *     responses:
 *       204:
 *         description: Usuario desactivado exitosamente
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Validación fallida
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *                       location:
 *                         type: string
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al desactivar usuario
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Desactivando usuario', { id: req.params.id, ip: req.ip });
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
      .input('id_usuario', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Usuarios WHERE id_usuario = @id_usuario');
    if (exists.recordset.length === 0) {
      logger.warn('Usuario no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_usuario', sql.UniqueIdentifier, req.params.id)
      .query('UPDATE Usuarios SET estado = \'Inactivo\' WHERE id_usuario = @id_usuario');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al desactivar usuario', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/users/{id}/activate:
 *   put:
 *     summary: Activar un usuario
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario
 *     responses:
 *       204:
 *         description: Usuario activado exitosamente
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Validación fallida
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *                       location:
 *                         type: string
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al activar usuario
 */
router.put('/:id/activate', validateUUID, async (req, res, next) => {
  try {
    logger.info('Activando usuario', { id: req.params.id, ip: req.ip });
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
      .input('id_usuario', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Usuarios WHERE id_usuario = @id_usuario');
    if (exists.recordset.length === 0) {
      logger.warn('Usuario no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_usuario', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ActivarUsuario');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al activar usuario', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/users/{userId}/patients:
 *   get:
 *     summary: Obtener los pacientes asociados a un usuario
 *     tags: [Users]
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