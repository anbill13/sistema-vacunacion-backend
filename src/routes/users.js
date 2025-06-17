const express = require('express');
const { body, param, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { poolPromise, sql } = require('../config/db');
const authenticate = require('../middleware/auth');
const checkRole = require('../middleware/role');
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
 * /api/users:
 *   post:
 *     summary: Crea un nuevo usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Juan Pérez"
 *               rol:
 *                 type: string
 *                 enum: [doctor, director, responsable, administrador]
 *                 example: "doctor"
 *               id_centro:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               username:
 *                 type: string
 *                 example: "juanperez"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "juan@example.com"
 *               telefono:
 *                 type: string
 *                 example: "8091234567"
 *               estado:
 *                 type: string
 *                 enum: [Activo, Inactivo]
 *                 example: "Activo"
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User created"
 *                 id_usuario:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *       400:
 *         description: Validación fallida
 *       403:
 *         description: No autorizado (solo administradores pueden crear usuarios)
 */
router.post(
  '/',
  [
    authenticate,
    checkRole(['administrador']), // Solo administradores pueden crear usuarios
    body('nombre').isString().trim().notEmpty().withMessage('nombre is required'),
    body('rol')
      .isIn(['doctor', 'director', 'responsable', 'administrador'])
      .withMessage('Invalid rol'),
    body('id_centro').optional().isUUID().withMessage('Invalid UUID for id_centro'),
    body('username').isString().trim().notEmpty().withMessage('username is required'),
    body('password').isString().trim().notEmpty().withMessage('password is required'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('telefono').optional().isString().trim().withMessage('Invalid telefono'),
    body('estado').isIn(['Activo', 'Inactivo']).withMessage('Invalid estado'),
  ],
  validate,
  async (req, res, next) => {
    const { nombre, rol, id_centro, username, password, email, telefono, estado } = req.body;

    try {
      const password_hash = await bcrypt.hash(password, 10);

      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('nombre', sql.NVarChar, nombre)
        .input('rol', sql.NVarChar, rol)
        .input('id_centro', sql.UniqueIdentifier, id_centro || null)
        .input('username', sql.NVarChar, username)
        .input('password_hash', sql.NVarChar, password_hash)
        .input('email', sql.NVarChar, email || null)
        .input('telefono', sql.NVarChar, telefono || null)
        .input('estado', sql.NVarChar, estado)
        .execute('sp_CrearUsuario');

      res.status(201).json({ message: 'User created', id_usuario: result.recordset[0].id_usuario });
    } catch (error) {
      next(error);
    }
  }
);

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
  async (req, res, next) => { // Fixed: Removed the '25' typo
    const { username, password } = req.body;

    try {
      const pool = await poolPromise;
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
 *     summary: Obtiene un usuario por ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_usuario:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 nombre:
 *                   type: string
 *                   example: "Juan Pérez"
 *                 rol:
 *                   type: string
 *                   example: "doctor"
 *                 id_centro:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440001"
 *                 username:
 *                   type: string
 *                   example: "juanperez"
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: "juan@example.com"
 *                 telefono:
 *                   type: string
 *                   example: "8091234567"
 *                 estado:
 *                   type: string
 *                   enum: [Activo, Inactivo]
 *                   example: "Activo"
 *       404:
 *         description: Usuario no encontrado
 */
router.get(
  '/:id',
  [authenticate, checkRole(['administrador', 'director', 'doctor', 'responsable'])], // Todos los roles pueden consultar usuarios
  [param('id').isUUID().withMessage('Invalid UUID')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_usuario', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerUsuario');

      if (result.recordset.length === 0) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }
      const { password_hash, ...user } = result.recordset[0];
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Actualiza un usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Juan Pérez"
 *               rol:
 *                 type: string
 *                 enum: [doctor, director, responsable, administrador]
 *                 example: "doctor"
 *               id_centro:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               username:
 *                 type: string
 *                 example: "juanperez"
 *               password:
 *                 type: string
 *                 example: "newpassword123"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "juan@example.com"
 *               telefono:
 *                 type: string
 *                 example: "8091234567"
 *               estado:
 *                 type: string
 *                 enum: [Activo, Inactivo]
 *                 example: "Activo"
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
 *                   example: "User updated"
 *       400:
 *         description: Validación fallida
 *       403:
 *         description: No autorizado (solo administradores pueden actualizar usuarios)
 *       404:
 *         description: Usuario no encontrado
 */
router.put(
  '/:id',
  [
    authenticate,
    checkRole(['administrador']), // Solo administradores pueden actualizar usuarios
    param('id').isUUID().withMessage('Invalid UUID'),
    body('nombre').isString().trim().notEmpty().withMessage('nombre is required'),
    body('rol')
      .isIn(['doctor', 'director', 'responsable', 'administrador'])
      .withMessage('Invalid rol'),
    body('id_centro').optional().isUUID().withMessage('Invalid UUID for id_centro'),
    body('username').isString().trim().notEmpty().withMessage('username is required'),
    body('password').optional().isString().trim().withMessage('Invalid password'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('telefono').optional().isString().trim().withMessage('Invalid telefono'),
    body('estado').isIn(['Activo', 'Inactivo']).withMessage('Invalid estado'),
  ],
  validate,
  async (req, res, next) => {
    const { nombre, rol, id_centro, username, password, email, telefono, estado } = req.body;

    try {
      const pool = await poolPromise;

      let password_hash = null;
      if (password) {
        password_hash = await bcrypt.hash(password, 10);
      } else {
        const existingUser = await pool
          .request()
          .input('id_usuario', sql.UniqueIdentifier, req.params.id)
          .query('SELECT password_hash FROM Usuarios WHERE id_usuario = @id_usuario');

        if (existingUser.recordset.length === 0) {
          const error = new Error('User not found');
          error.statusCode = 404;
          throw error;
        }
        password_hash = existingUser.recordset[0].password_hash;
      }

      await pool
        .request()
        .input('id_usuario', sql.UniqueIdentifier, req.params.id)
        .input('nombre', sql.NVarChar, nombre)
        .input('rol', sql.NVarChar, rol)
        .input('id_centro', sql.UniqueIdentifier, id_centro || null)
        .input('username', sql.NVarChar, username)
        .input('password_hash', sql.NVarChar, password_hash)
        .input('email', sql.NVarChar, email || null)
        .input('telefono', sql.NVarChar, telefono || null)
        .input('estado', sql.NVarChar, estado)
        .execute('sp_ActualizarUsuario');

      res.json({ message: 'User updated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Elimina un usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Usuario eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User deleted"
 *       400:
 *         description: Validación fallida
 *       403:
 *         description: No autorizado (solo administradores pueden eliminar usuarios)
 */
router.delete(
  '/:id',
  [authenticate, checkRole(['administrador'])], // Solo administradores pueden eliminar usuarios
  [param('id').isUUID().withMessage('Invalid UUID')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_usuario', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarUsuario');

      res.json({ message: 'User deleted' });
    } catch (error) {
      next(error);
    }
  }
);
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtiene todos los usuarios
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_usuario:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440000"
 *                   nombre:
 *                     type: string
 *                     example: "Juan Pérez"
 *                   rol:
 *                     type: string
 *                     enum: [doctor, director, responsable, administrador]
 *                     example: "doctor"
 *                   id_centro:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440001"
 *                   username:
 *                     type: string
 *                     example: "juanperez"
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: "juan@example.com"
 *                   telefono:
 *                     type: string
 *                     example: "8091234567"
 *                   estado:
 *                     type: string
 *                     enum: [Activo, Inactivo]
 *                     example: "Activo"
 */
router.get(
  '/',
  [authenticate, checkRole(['administrador'])], // Solo administradores pueden listar usuarios
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .execute('sp_ObtenerTodosUsuarios');

      const users = result.recordset.map(({ password_hash, ...user }) => user);
      res.json(users);
    } catch (error) {
      next(error);
    }
  }
);
module.exports = router;