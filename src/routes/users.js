const express = require('express');
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/db.js');
const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.data = errors.array();
    return next(error);
  }
  next();
};

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Operaciones relacionadas con usuarios
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - nombre
 *         - rol
 *         - username
 *         - password
 *       properties:
 *         id_usuario:
 *           type: string
 *           format: uuid
 *           description: Identificador único del usuario
 *         nombre:
 *           type: string
 *           description: Nombre del usuario
 *         rol:
 *           type: string
 *           enum: [doctor, director, responsable, administrador]
 *           description: Rol del usuario
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro asociado (opcional)
 *         username:
 *           type: string
 *           description: Nombre de usuario
 *         password:
 *           type: string
 *           description: Contraseña hasheada
 *         email:
 *           type: string
 *           format: email
 *           description: Email del usuario (opcional)
 *         telefono:
 *           type: string
 *           description: Teléfono del usuario (opcional)
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del usuario
 *       example:
 *         id_usuario: "123e4567-e89b-12d3-a456-426614174007"
 *         nombre: "Carlos Ramírez"
 *         rol: "administrador"
 *         id_centro: "123e4567-e89b-12d3-a456-426614174002"
 *         username: "carlosr"
 *         email: "carlos@example.com"
 *         telefono: "809-555-3456"
 *         estado: "Activo"
 *     UserInput:
 *       type: object
 *       required:
 *         - nombre
 *         - rol
 *         - username
 *         - password
 *       properties:
 *         nombre:
 *           type: string
 *         rol:
 *           type: string
 *           enum: [doctor, director, responsable, administrador]
 *         id_centro:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         username:
 *           type: string
 *         password:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         telefono:
 *           type: string
 *           nullable: true
 *     LoginResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: Token JWT
 *         user:
 *           $ref: '#/components/schemas/User'
 *       example:
 *         token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         user:
 *           id_usuario: "123e4567-e89b-12d3-a456-426614174007"
 *           nombre: "Carlos Ramírez"
 *           rol: "administrador"
 *           id_centro: "123e4567-e89b-12d3-a456-426614174002"
 *           username: "carlosr"
 *           email: "carlos@example.com"
 *           telefono: "809-555-3456"
 *           estado: "Activo"
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateUser = [
  body('nombre').notEmpty().isString().withMessage('Nombre es requerido'),
  body('rol').isIn(['doctor', 'director', 'responsable', 'administrador']).withMessage('Rol inválido'),
  body('id_centro').optional().isUUID().withMessage('ID de centro inválido'),
  body('username').notEmpty().isString().withMessage('Nombre de usuario es requerido'),
  body('password').notEmpty().isString().withMessage('Contraseña es requerida'),
  body('email').optional().isEmail(),
  body('telefono').optional().isString(),
];

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtener todos los usuarios activos
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios activos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Error del servidor
 */
router.get('/', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_usuario, nombre, rol, id_centro, username, email, telefono, estado
      FROM Usuarios WHERE estado = 'Activo'
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crear un nuevo usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       500:
 *         description: Error del servidor
 */
router.post('/', validateUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre, rol, id_centro, username, password, email, telefono } = req.body;

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('nombre', sql.NVarChar, nombre)
      .input('rol', sql.NVarChar, rol)
      .input('id_centro', sql.UniqueIdentifier, id_centro)
      .input('username', sql.NVarChar, username)
      .input('password_hash', sql.NVarChar, password_hash)
      .input('email', sql.NVarChar, email)
      .input('telefono', sql.NVarChar, telefono)
      .execute('sp_CrearUsuario');

    res.status(201).json({ id_usuario: result.recordset[0].id_usuario });
  } catch (err) {
    if (err.number === 50001 || err.number === 50002) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Inicia sesión de usuario
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "juanperez"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id_usuario:
 *                       type: string
 *                       format: uuid
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     username:
 *                       type: string
 *                       example: "juanperez"
 *                     rol:
 *                       type: string
 *                       example: "doctor"
 *       401:
 *         description: Credenciales inválidas
 *       403:
 *         description: Cuenta de usuario inactiva
 */
router.post(
  '/login',
  [
    body('username').isString().trim().notEmpty().withMessage('username is required'),
    body('password').isString().trim().notEmpty().withMessage('password is required'),
  ],
  validate,
  async (req, res, next) => {
    const { username, password } = req.body;

    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .input('username', sql.NVarChar, username)
        .query('SELECT id_usuario, username, password_hash, rol, estado FROM Usuarios WHERE username = @username');

      if (result.recordset.length === 0) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }

      const user = result.recordset[0];

      if (user.estado !== 'Activo') {
        const error = new Error('User account is inactive');
        error.statusCode = 403;
        throw error;
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }

      const token = jwt.sign(
        { id_usuario: user.id_usuario, username: user.username, rol: user.rol },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: { id_usuario: user.id_usuario, username: user.username, rol: user.rol },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_usuario', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerUsuario');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Actualizar un usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuario actualizado
 *       400:
 *         description: Error en los datos enviados
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', validateUUID, validateUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre, rol, id_centro, username, password, email, telefono } = req.body;

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_usuario', sql.UniqueIdentifier, req.params.id)
      .input('nombre', sql.NVarChar, nombre)
      .input('rol', sql.NVarChar, rol)
      .input('id_centro', sql.UniqueIdentifier, id_centro)
      .input('username', sql.NVarChar, username)
      .input('password_hash', sql.NVarChar, password_hash)
      .input('email', sql.NVarChar, email)
      .input('telefono', sql.NVarChar, telefono)
      .execute('sp_ActualizarUsuario');

    res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    if (err.number === 50001 || err.number === 50002) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Desactivar un usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *         description: Usuario desactivado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuario desactivado
 *       400:
 *         description: ID inválido
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_usuario', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarUsuario');

    res.json({ message: 'Usuario desactivado' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al desactivar usuario' });
  }
});

module.exports = router;