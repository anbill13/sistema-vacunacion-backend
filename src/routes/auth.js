const express = require('express');
const { body, validationResult } = require('express-validator');
const { poolPromise, sql } = require('../config/db');
const winston = require('winston');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const router = express.Router();

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Authenticate a user and generate a JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: anbill13
 *               password:
 *                 type: string
 *                 example: 123
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token and user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id_usuario:
 *                       type: string
 *                       example: 3031019A-8658-4567-B284-D610A8AC7766
 *                     username:
 *                       type: string
 *                       example: anbill13
 *                     email:
 *                       type: string
 *                       example: usuario@example.com
 *                     rol:
 *                       type: string
 *                       example: user
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Validation failed
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *       401:
 *         description: Invalid username or password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid credentials
 *       403:
 *         description: User account is inactive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User account is inactive
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error during login
 */
router.post(
  '/login',
  [
    body('username').isString().trim().notEmpty().withMessage('Username is required'),
    body('password').isString().trim().notEmpty().withMessage('Password is required')
  ],
  async (req, res, next) => {
    try {
      logger.info('Attempting user login', { username: req.body.username, ip: req.ip });

      // Validate request body
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed', { errors: errors.array(), ip: req.ip });
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { username, password } = req.body;

      // Query database using stored procedure (without password comparison in SP)
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('username', sql.NVarChar(50), username)
        .input('password', sql.NVarChar(100), password) // Still pass for compatibility
        .execute('sp_LoginUsuario');

      const user = result.recordset[0];

      // Verify password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        logger.warn('Invalid password', { username, ip: req.ip });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      if (!process.env.JWT_SECRET) {
        logger.error('JWT_SECRET not configured', { ip: req.ip });
        throw new Error('JWT_SECRET not configured');
      }

      const token = jwt.sign(
        { id_usuario: user.id_usuario, username: user.username, rol: user.rol },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      logger.info('Login successful', { username, ip: req.ip });
      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id_usuario: user.id_usuario,
          username: user.username,
          email: user.email,
          rol: user.rol
        }
      });
    } catch (err) {
      logger.error('Error during login', { error: err.message, ip: req.ip });
      
      // Handle specific stored procedure errors
      if (err.message && err.message.includes('Usuario no encontrado')) {
        logger.warn('User not found', { username: req.body.username, ip: req.ip });
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      if (err.message && err.message.includes('Usuario inactivo')) {
        logger.warn('User account is inactive', { username: req.body.username, ip: req.ip });
        return res.status(403).json({ error: 'User account is inactive' });
      }
      
      // Generic server error
      res.status(500).json({ error: 'Error during login' });
    }
  }
);

module.exports = router;