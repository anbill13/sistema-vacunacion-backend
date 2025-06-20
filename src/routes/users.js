const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, checkRole } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Initialize the router
const router = express.Router(); // Add this line

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
 *         - username
 *         - email
 *         - password
 *         - rol
 *       properties:
 *         id_usuario:
 *           type: string
 *           format: uuid
 *           description: Identificador único del usuario
 *         username:
 *           type: string
 *           description: Nombre de usuario
 *         email:
 *           type: string
 *           description: Correo electrónico
 *         password:
 *           type: string
 *           description: Contraseña (en texto plano para creación, cifrada en BD)
 *         rol:
 *           type: string
 *           enum: [administrador, director, doctor, digitador, supervisor]
 *           description: Rol del usuario
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del usuario
 *     UserInput:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - rol
 *       properties:
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         password:
 *           type: string
 *         rol:
 *           type: string
 *           enum: [administrador, director, doctor, digitador, supervisor]
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
 *     Token:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: Token JWT para autenticación
 */

const validateUser = [
  body('username').notEmpty().isString().withMessage('Nombre de usuario es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().isString().withMessage('Contraseña es requerida'),
  body('rol').isIn(['administrador', 'director', 'doctor', 'digitador', 'supervisor']).withMessage('Rol inválido'),
];

const validateLogin = [
  body('username').notEmpty().isString().withMessage('Nombre de usuario es requerido'),
  body('password').notEmpty().isString().withMessage('Contraseña es requerida'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

// Configuración del token (debe estar en un archivo de configuración en producción)
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_secreto'; // Cambiar por variable de entorno

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
 *               $ref: '#/components/schemas/Token'
 *       401:
 *         description: Credenciales inválidas
 *       500:
 *         description: Error interno del servidor
 */
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const { username, password } = req.body;

    const result = await pool
      .request()
      .input('username', sql.NVarChar, username)
      .query('SELECT id_usuario, username, password, rol FROM Usuarios WHERE username = @username AND estado = \'Activo\'');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.password); // Comparar contraseñas cifradas

    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id_usuario, username: user.username, rol: user.rol },
      JWT_SECRET,
      { expiresIn: '1h' } // Token válido por 1 hora
    );

    res.status(200).json({ token });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Listar todos los usuarios
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 */
router.get('/', [authenticate, checkRole(['administrador'])], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT id_usuario, username, email, rol, estado FROM Usuarios');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

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
 *     responses:
 *       200:
 *         description: Usuario obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [authenticate, checkRole(['administrador']), validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_usuario', sql.UniqueIdentifier, req.params.id)
      .query('SELECT id_usuario, username, email, rol, estado FROM Usuarios WHERE id_usuario = @id_usuario');
    if (result.recordset.length === 0) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    next(err);
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
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/',
  [authenticate, checkRole(['administrador']), validateUser],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const hashedPassword = await bcrypt.hash(req.body.password, 10); // Cifrar contraseña
      const result = await pool
        .request()
        .input('username', sql.NVarChar, req.body.username)
        .input('email', sql.NVarChar, req.body.email)
        .input('password', sql.NVarChar, hashedPassword)
        .input('rol', sql.NVarChar, req.body.rol)
        .query('INSERT INTO Usuarios (username, email, password, rol) VALUES (@username, @email, @password, @rol); SELECT SCOPE_IDENTITY() AS id_usuario');
      res.status(201).json({ id_usuario: result.recordset[0].id_usuario });
    } catch (err) {
      next(err);
    }
  }
);

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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       204:
 *         description: Usuario actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id',
  [authenticate, checkRole(['administrador']), validateUUID, validateUser],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const hashedPassword = req.body.password ? await bcrypt.hash(req.body.password, 10) : undefined;
      await pool
        .request()
        .input('id_usuario', sql.UniqueIdentifier, req.params.id)
        .input('username', sql.NVarChar, req.body.username)
        .input('email', sql.NVarChar, req.body.email)
        .input('password', sql.NVarChar, hashedPassword || null)
        .input('rol', sql.NVarChar, req.body.rol)
        .query('UPDATE Usuarios SET username = @username, email = @email, password = COALESCE(@password, password), rol = @rol WHERE id_usuario = @id_usuario');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Eliminar un usuario
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
 *     responses:
 *       204:
 *         description: Usuario eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete(
  '/:id',
  [authenticate, checkRole(['administrador']), validateUUID],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_usuario', sql.UniqueIdentifier, req.params.id)
        .query('DELETE FROM Usuarios WHERE id_usuario = @id_usuario');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;