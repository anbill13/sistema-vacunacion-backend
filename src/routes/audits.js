const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { poolPromise, sql } = require('../config/db');
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
 * /api/audits:
 *   get:
 *     summary: Obtiene todos los registros de auditoría
 *     tags: [Audits]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de auditorías
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_auditoria:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440006"
 *                   tabla_afectada:
 *                     type: string
 *                     example: "Usuarios"
 *                   id_registro:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440000"
 *                   id_usuario:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440002"
 *                   accion:
 *                     type: string
 *                     enum: [INSERT, UPDATE, DELETE, SELECT]
 *                     example: "INSERT"
 *                   detalles:
 *                     type: string
 *                     example: "Usuario creado"
 *                   ip_origen:
 *                     type: string
 *                     format: ipv4
 *                     example: "192.168.1.1"
 *                   fecha_registro:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-06-10T20:00:00Z"
 */
router.get(
  '/',
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .execute('sp_ObtenerTodasAuditorias');

      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * tags:
 *   name: Audits
 *   description: Registro de auditorías
 */

/**
 * @swagger
 * /api/audits:
 *   post:
 *     summary: Registra una entrada de auditoría
 *     tags: [Audits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tabla_afectada:
 *                 type: string
 *                 example: "Usuarios"
 *               id_registro:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               id_usuario:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440002"
 *               accion:
 *                 type: string
 *                 enum: [INSERT, UPDATE, DELETE, SELECT]
 *                 example: "INSERT"
 *               detalles:
 *                 type: string
 *                 example: "Usuario creado"
 *               ip_origen:
 *                 type: string
 *                 format: ipv4
 *                 example: "192.168.1.1"
 *     responses:
 *       201:
 *         description: Auditoría registrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Audit logged"
 *                 id_auditoria:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440006"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('tabla_afectada').isString().trim().notEmpty().withMessage('tabla_afectada is required'),
    body('id_registro').isUUID().withMessage('Invalid UUID for id_registro'),
    body('id_usuario').isUUID().withMessage('Invalid UUID for id_usuario'),
    body('accion').isIn(['INSERT', 'UPDATE', 'DELETE', 'SELECT']).withMessage('Invalid accion'),
    body('detalles').optional().isString().trim().withMessage('Invalid detalles'),
    body('ip_origen').optional().isIP().withMessage('Invalid ip_origen'),
  ],
  validate,
  async (req, res, next) => {
    const { tabla_afectada, id_registro, id_usuario, accion, detalles, ip_origen } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('tabla_afectada', sql.NVarChar, tabla_afectada)
        .input('id_registro', sql.UniqueIdentifier, id_registro)
        .input('id_usuario', sql.UniqueIdentifier, id_usuario)
        .input('accion', sql.NVarChar, accion)
        .input('detalles', sql.NVarChar, detalles || null)
        .input('ip_origen', sql.NVarChar, ip_origen || null)
        .execute('sp_RegistrarAuditoria');

      res.status(201).json({ message: 'Audit logged', id_auditoria: result.recordset[0].id_auditoria });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/audits:
 *   get:
 *     summary: Obtiene registros de auditoría por usuario o tabla
 *     tags: [Audits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id_usuario
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440002"
 *       - name: tabla_afectada
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           example: "Usuarios"
 *     responses:
 *       200:
 *         description: Lista de auditorías
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_auditoria:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440006"
 *                   tabla_afectada:
 *                     type: string
 *                     example: "Usuarios"
 *                   id_registro:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440000"
 *                   id_usuario:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440002"
 *                   accion:
 *                     type: string
 *                     enum: [INSERT, UPDATE, DELETE, SELECT]
 *                     example: "INSERT"
 *                   detalles:
 *                     type: string
 *                     example: "Usuario creado"
 *                   ip_origen:
 *                     type: string
 *                     format: ipv4
 *                     example: "192.168.1.1"
 *                   fecha_registro:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-06-10T20:00:00Z"
 */
router.get(
  '/',
  [
    query('id_usuario').optional().isUUID().withMessage('Invalid UUID for id_usuario'),
    query('tabla_afectada').optional().isString().trim().withMessage('Invalid tabla_afectada'),
  ],
  validate,
  async (req, res, next) => {
    const { id_usuario, tabla_afectada } = req.query;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_usuario', sql.UniqueIdentifier, id_usuario || null)
        .input('tabla_afectada', sql.NVarChar, tabla_afectada || null)
        .execute('sp_ObtenerAuditoria');

      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;