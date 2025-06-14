const express = require('express');
const { body, param, validationResult } = require('express-validator');
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
 * tags:
 *   name: Alerts
 *   description: Gestión de alertas
 */

/**
 * @swagger
 * /api/alerts:
 *   post:
 *     summary: Crea una nueva alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_niño:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               id_evento:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440003"
 *               tipo_alerta:
 *                 type: string
 *                 enum: [Dosis Pendiente, Evento Adverso, Seguimiento]
 *                 example: "Dosis Pendiente"
 *               fecha_alerta:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-10"
 *               mensaje:
 *                 type: string
 *                 example: "Recordatorio de dosis pendiente"
 *               estado:
 *                 type: string
 *                 enum: [Pendiente, Resuelta]
 *                 example: "Pendiente"
 *               id_usuario_asignado:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440002"
 *     responses:
 *       201:
 *         description: Alerta creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Alert created"
 *                 id_alerta:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440004"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('id_niño').isUUID().withMessage('Invalid UUID for id_niño'),
    body('id_evento').optional().isUUID().withMessage('Invalid UUID for id_evento'),
    body('tipo_alerta')
      .isIn(['Dosis Pendiente', 'Evento Adverso', 'Seguimiento'])
      .withMessage('Invalid tipo_alerta'),
    body('fecha_alerta').isDate().withMessage('Invalid fecha_alerta'),
    body('mensaje').optional().isString().trim().withMessage('Invalid mensaje'),
    body('estado').isIn(['Pendiente', 'Resuelta']).withMessage('Invalid estado'),
    body('id_usuario_asignado').optional().isUUID().withMessage('Invalid UUID for id_usuario_asignado'),
  ],
  validate,
  async (req, res, next) => {
    const { id_niño, id_evento, tipo_alerta, fecha_alerta, mensaje, estado, id_usuario_asignado } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, id_niño)
        .input('id_evento', sql.UniqueIdentifier, id_evento || null)
        .input('tipo_alerta', sql.NVarChar, tipo_alerta)
        .input('fecha_alerta', sql.Date, fecha_alerta)
        .input('mensaje', sql.NVarChar, mensaje || null)
        .input('estado', sql.NVarChar, estado)
        .input('id_usuario_asignado', sql.UniqueIdentifier, id_usuario_asignado || null)
        .execute('sp_CrearAlerta');

      res.status(201).json({ message: 'Alert created', id_alerta: result.recordset[0].id_alerta });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/alerts/{id}:
 *   get:
 *     summary: Obtiene una alerta por ID
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440004"
 *     responses:
 *       200:
 *         description: Alerta encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_alerta:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440004"
 *                 id_niño:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 id_evento:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440003"
 *                 tipo_alerta:
 *                   type: string
 *                   enum: [Dosis Pendiente, Evento Adverso, Seguimiento]
 *                   example: "Dosis Pendiente"
 *                 fecha_alerta:
 *                   type: string
 *                   format: date
 *                   example: "2025-06-10"
 *                 mensaje:
 *                   type: string
 *                   example: "Recordatorio de dosis pendiente"
 *                 estado:
 *                   type: string
 *                   enum: [Pendiente, Resuelta]
 *                   example: "Pendiente"
 *                 id_usuario_asignado:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440002"
 *       404:
 *         description: Alerta no encontrada
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid UUID')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_alerta', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerAlerta');

      if (result.recordset.length === 0) {
        const error = new Error('Alert not found');
        error.statusCode = 404;
        throw error;
      }
      res.json(result.recordset[0]);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/alerts/{id}:
 *   put:
 *     summary: Actualiza una alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440004"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_niño:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               id_evento:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440003"
 *               tipo_alerta:
 *                 type: string
 *                 enum: [Dosis Pendiente, Evento Adverso, Seguimiento]
 *                 example: "Dosis Pendiente"
 *               fecha_alerta:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-10"
 *               mensaje:
 *                 type: string
 *                 example: "Recordatorio de dosis pendiente actualizado"
 *               estado:
 *                 type: string
 *                 enum: [Pendiente, Resuelta]
 *                 example: "Resuelta"
 *               id_usuario_asignado:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440002"
 *               fecha_resolucion:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-11T12:00:00Z"
 *     responses:
 *       200:
 *         description: Alerta actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Alert updated"
 *       400:
 *         description: Validación fallida
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid UUID'),
    body('id_niño').isUUID().withMessage('Invalid UUID for id_niño'),
    body('id_evento').optional().isUUID().withMessage('Invalid UUID for id_evento'),
    body('tipo_alerta')
      .isIn(['Dosis Pendiente', 'Evento Adverso', 'Seguimiento'])
      .withMessage('Invalid tipo_alerta'),
    body('fecha_alerta').isDate().withMessage('Invalid fecha_alerta'),
    body('mensaje').optional().isString().trim().withMessage('Invalid mensaje'),
    body('estado').isIn(['Pendiente', 'Resuelta']).withMessage('Invalid estado'),
    body('id_usuario_asignado').optional().isUUID().withMessage('Invalid UUID for id_usuario_asignado'),
    body('fecha_resolucion').optional().isISO8601().toDate().withMessage('Invalid fecha_resolucion'),
  ],
  validate,
  async (req, res, next) => {
    const {
      id_niño,
      id_evento,
      tipo_alerta,
      fecha_alerta,
      mensaje,
      estado,
      id_usuario_asignado,
      fecha_resolucion,
    } = req.body;

    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_alerta', sql.UniqueIdentifier, req.params.id)
        .input('id_niño', sql.UniqueIdentifier, id_niño)
        .input('id_evento', sql.UniqueIdentifier, id_evento || null)
        .input('tipo_alerta', sql.NVarChar, tipo_alerta)
        .input('fecha_alerta', sql.Date, fecha_alerta)
        .input('mensaje', sql.NVarChar, mensaje || null)
        .input('estado', sql.NVarChar, estado)
        .input('id_usuario_asignado', sql.UniqueIdentifier, id_usuario_asignado || null)
        .input('fecha_resolucion', sql.DateTime2, fecha_resolucion || null)
        .execute('sp_ActualizarAlerta');

      res.json({ message: 'Alert updated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/alerts/{id}:
 *   delete:
 *     summary: Elimina una alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440004"
 *     responses:
 *       200:
 *         description: Alerta eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Alert deleted"
 *       400:
 *         description: Validación fallida
 */
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid UUID')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_alerta', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarAlerta');

      res.json({ message: 'Alert deleted' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;