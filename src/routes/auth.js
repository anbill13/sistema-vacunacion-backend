const express = require('express');
const { body, validationResult } = require('express-validator');
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

/**
 * @swagger
 * openapi: 3.0.3
 * info:
 *   title: Authentication API
 *   description: API para autenticación de usuarios en el sistema de vacunación
 *   version: 1.0.0
 * servers:
 *   - url: /api
 *     description: Base URL for the API
 * components:
 *   schemas:
 *     LoginResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Login successful"
 *         token:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         user:
 *           type: object
 *           properties:
 *             id_usuario:
 *               type: string
 *               format: uuid
 *               example: "3031019A-8658-4567-B284-D610A8AC7766"
 *             username:
 *               type: string
 *               example: "juanperez"
 *             rol:
 *               type: string
 *               example: "doctor"
 * tags:
 *   - name: Authentication
 *     description: Gestión de autenticación
 */

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Inicia sesión de usuario
 *     tags: [Authentication]
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
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validación fallida
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
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid credentials
 *       403:
 *         description: Cuenta de usuario inactiva
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User account is inactive
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
router.post(
  '/login',
  [
    body('username').isString().trim().notEmpty().withMessage('username is required'),
    body('password').isString().trim().notEmpty().withMessage('password is required'),
  ],
  async (req, res, next) => {
    try {
      logger.info('Intentando iniciar sesión', { username: req.body.username, ip: req.ip });
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validación fallida', { errors: errors.array(), ip: req.ip });
        const error = new Error('Validación fallida');
        error.statusCode = 400;
        error.data = errors.array();
        throw error;
      }
      const { username, password } = req.body;

      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('username', sql.NVarChar(50), username) // Match the parameter type in the stored procedure
        .input('password', sql.NVarChar(50), password) // Assuming password is also a parameter
        .execute('sp_LoginUsuario');

      if (result.recordset.length === 0) {
        logger.warn('Credenciales inválidas', { username: username, ip: req.ip });
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }

      const user = result.recordset[0];
      if (user.estado !== 'Activo') {
        logger.warn('Cuenta de usuario inactiva', { username: username, ip: req.ip });
        const error = new Error('User account is inactive');
        error.statusCode = 403;
        throw error;
      }

      const jwt = require('jsonwebtoken');
      if (!process.env.JWT_SECRET) {
        logger.error('JWT_SECRET no está configurado', { ip: req.ip });
        throw new Error('JWT_SECRET no está configurado');
      }

      const token = jwt.sign(
        { id_usuario: user.id_usuario, username: user.username, rol: user.rol },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      logger.info('Inicio de sesión exitoso', { username: username, ip: req.ip });
      res.json({
        message: 'Login successful',
        token,
        user: { id_usuario: user.id_usuario, username: user.username, rol: user.rol },
      });
    } catch (err) {
      logger.error('Error al iniciar sesión', { error: err.message, ip: req.ip });
      err.statusCode = err.statusCode || 500;
      next(err);
    }
  }
);

module.exports = router;