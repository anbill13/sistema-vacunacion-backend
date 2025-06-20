const express = require('express');
const { body, validationResult } = require('express-validator');
const { poolPromise, sql } = require('../config/db');
const winston = require('winston');
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For generating JWT tokens

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

const validateLogin = [
  body('username').notEmpty().isString().withMessage('Nombre de usuario es requerido'),
  body('password').notEmpty().isString().withMessage('Contraseña es requerida'),
];

const validateUser = [
  body('nombre').notEmpty().isString().withMessage('Nombre es requerido'),
  body('username').notEmpty().isString().withMessage('Nombre de usuario es requerido'),
  body('password').notEmpty().isString().withMessage('Contraseña es requerida'),
  body('rol').isIn(['director', 'administrador', 'doctor']).withMessage('Rol inválido'),
];

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestión de usuarios
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - id_usuario
 *         - nombre
 *         - username
 *         - rol
 *       properties:
 *         id_usuario:
 *           type: string
 *           format: uuid
 *           description: Identificador único del usuario
 *         nombre:
 *           type: string
 *           description: Nombre completo del usuario
 *         username:
 *           type: string
 *           description: Nombre de usuario
 *         rol:
 *           type: string
 *           enum: [director, administrador, doctor]
 *           description: Rol del usuario
 *       example:
 *         id_usuario: "123e4567-e89b-12d3-a456-426614174010"
 *         nombre: "Juan Pérez"
 *         username: "juanperez"
 *         rol: "doctor"
 *     UserInput:
 *       type: object
 *       required:
 *         - nombre
 *         - username
 *         - password
 *         - rol
 *       properties:
 *         nombre:
 *           type: string
 *         username:
 *           type: string
 *         password:
 *           type: string
 *         rol:
 *           type: string
 *           enum: [director, administrador, doctor]
 *     LoginInput:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *         password:
 *           type: string
 *       example:
 *         username: "juanperez"
 *         password: "juanperez123"
 */

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Iniciar sesión de usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token para autenticación
 *                 user:
 *                   $ref: '#/components/schemas/User'
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
 *       401:
 *         description: Credenciales inválidas
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
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    logger.info('Iniciando sesión de usuario', { username: req.body.username, ip: req.ip });
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
      .input('username', sql.NVarChar, req.body.username)
      .query('SELECT id_usuario, nombre, username, password_hash, rol FROM Usuarios WHERE username = @username');

    if (result.recordset.length === 0) {
      logger.warn('Usuario no encontrado', { username: req.body.username, ip: req.ip });
      const error = new Error('Credenciales inválidas');
      error.statusCode = 401;
      throw error;
    }

    const user = result.recordset[0];
    const isPasswordValid = await bcrypt.compare(req.body.password, user.password_hash);

    if (!isPasswordValid) {
      logger.warn('Contraseña incorrecta', { username: req.body.username, ip: req.ip });
      const error = new Error('Credenciales inválidas');
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      { id_usuario: user.id_usuario, username: user.username, rol: user.rol },
      process.env.JWT_SECRET || 'your_jwt_secret', // Replace with your actual secret
      { expiresIn: '1h' }
    );

    res.status(200).json({
      token,
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        username: user.username,
        rol: user.rol,
      },
    });
  } catch (err) {
    logger.error('Error al iniciar sesión', { username: req.body.username, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
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

    const pool = await poolPromise;
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    const result = await pool
      .request()
      .input('nombre', sql.NVarChar, req.body.nombre)
      .input('username', sql.NVarChar, req.body.username)
      .input('password_hash', sql.NVarChar, passwordHash)
      .input('rol', sql.NVarChar, req.body.rol)
      .execute('sp_CrearUsuario');

    res.status(201).json({ id_usuario: result.recordset[0].id_usuario });
  } catch (err) {
    logger.error('Error al crear usuario', { username: req.body.username, error: err.message, ip: req.ip });
    const error = new Error('Error al crear usuario');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

module.exports = router;