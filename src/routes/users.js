const express = require('express');
const { body, validationResult } = require('express-validator');
const { poolPromise, sql } = require('../config/db');
const winston = require('winston');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

// Validation middleware for creating a user
const validateUser = [
  body('nombre').notEmpty().isString().withMessage('Nombre es requerido'),
  body('rol').notEmpty().isString().withMessage('Rol es requerido'),
  body('id_centro').optional().isUUID().withMessage('ID del centro debe ser un UUID válido'),
  body('username').notEmpty().isString().withMessage('Nombre de usuario es requerido'),
  body('password').notEmpty().isString().withMessage('Contraseña es requerida'),
  body('email').optional().isEmail().withMessage('Email debe ser válido'),
  body('telefono')
    .optional()
    .isString()
    .matches(/^\+?[\d\s\-()]{7,15}$/)
    .withMessage('Teléfono debe ser un número válido (e.g., +1-809-123-4567)'),
  body('estado')
    .optional()
    .isString()
    .isIn(['Activo', 'Inactivo'])
    .withMessage('Estado debe ser Activo o Inactivo'),
];

// Validation middleware for login
const validateLogin = [
  body('username').notEmpty().isString().withMessage('Nombre de usuario es requerido'),
  body('password').notEmpty().isString().withMessage('Contraseña es requerida'),
];

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
 *             nombre: "bill perez"
 *             rol: "administrador"
 *             id_centro: "f83458f3-1162-4bb4-8749-17bda5ff4c0c"
 *             username: "admin"
 *             password: "123"
 *             email: "user@example.com"
 *             telefono: "+1-809-123-4567"
 *             estado: "Activo"
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *             example:
 *               id_usuario: "123e4567-e89b-12d3-a456-426614174000"
 *               nombre: "bill perez"
 *               rol: "administrador"
 *               id_centro: "f83458f3-1162-4bb4-8749-17bda5ff4c0c"
 *               username: "admin"
 *               email: "user@example.com"
 *               telefono: "+1-809-123-4567"
 *               estado: "Activo"
 *       400:
 *         description: Error en los datos enviados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       msg:
 *                         type: string
 *                       path:
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
      return res.status(400).json({ errors: errors.array() });
    }

    const pool = await poolPromise;
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const result = await pool
      .request()
      .input('id_usuario', sql.UniqueIdentifier, sql.UniqueIdentifier.NEWID())
      .input('nombre', sql.NVarChar, req.body.nombre)
      .input('rol', sql.NVarChar, req.body.rol)
      .input('id_centro', sql.UniqueIdentifier, req.body.id_centro || null)
      .input('username', sql.NVarChar, req.body.username)
      .input('password_hash', sql.NVarChar, hashedPassword)
      .input('email', sql.NVarChar, req.body.email || null)
      .input('telefono', sql.NVarChar, req.body.telefono || null)
      .input('estado', sql.NVarChar, req.body.estado || 'Activo')
      .query(`
        INSERT INTO Usuarios (id_usuario, nombre, rol, id_centro, username, password_hash, email, telefono, estado)
        OUTPUT INSERTED.id_usuario, INSERTED.nombre, INSERTED.rol, INSERTED.id_centro, INSERTED.username, INSERTED.email, INSERTED.telefono, INSERTED.estado
        VALUES (@id_usuario, @nombre, @rol, @id_centro, @username, @password_hash, @email, @telefono, @estado)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al crear usuario', { error: err.message, stack: err.stack, ip: req.ip });
    const error = new Error('Error al crear usuario');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Inicia sesión de usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *           example:
 *             username: "admin"
 *             password: "123"
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             example:
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               user:
 *                 id_usuario: "123e4567-e89b-12d3-a456-426614174000"
 *                 username: "admin"
 *                 rol: "administrador"
 *       400:
 *         description: Error en los datos enviados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       msg:
 *                         type: string
 *                       path:
 *                         type: string
 *                       location:
 *                         type: string
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Credenciales inválidas
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al iniciar sesión
 */
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    logger.info('Intentando iniciar sesión', { username: req.body.username, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { errors: errors.array(), ip: req.ip });
      return res.status(400).json({ errors: errors.array() });
    }

    const pool = await poolPromise;
    const request = await pool.request();
    request.input('username', sql.NVarChar, req.body.username);
    request.output('password', sql.NVarChar, null); // Output parameter for password_hash
    request.output('id_usuario', sql.UniqueIdentifier, null);
    request.output('rol', sql.NVarChar, null);

    await request.execute('sp_LoginUsuario');

    const passwordHash = request.parameters.password.value;
    const idUsuario = request.parameters.id_usuario.value;
    const rol = request.parameters.rol.value;

    if (!passwordHash) {
      logger.warn('Usuario no encontrado', { username: req.body.username, ip: req.ip });
      const error = new Error('Credenciales inválidas');
      error.statusCode = 401;
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(req.body.password, passwordHash);
    if (!isPasswordValid) {
      logger.warn('Contraseña incorrecta', { username: req.body.username, ip: req.ip });
      const error = new Error('Credenciales inválidas');
      error.statusCode = 401;
      throw error;
    }

    // Generate JWT
    const token = jwt.sign(
      { id_usuario: idUsuario, username: req.body.username, rol },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    res.status(200).json({
      token,
      user: {
        id_usuario: idUsuario,
        username: req.body.username,
        rol,
      },
    });
  } catch (err) {
    logger.error('Error al iniciar sesión', { error: err.message, stack: err.stack, ip: req.ip });
    const error = new Error('Error al iniciar sesión');
    error.statusCode = 500;
    next(error);
  }
});

module.exports = router;