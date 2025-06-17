const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
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
 * /api/appointments:
 *   get:
 *     summary: Obtiene todas las citas
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de citas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_cita:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440005"
 *                   id_niño:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440000"
 *                   id_centro:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440001"
 *                   id_campaña:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440002"
 *                   fecha_cita:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-06-11T10:00:00Z"
 *                   estado:
 *                     type: string
 *                     enum: ["Pendiente", "Confirmada", "Cancelada", "Completada"]
 *                     example: "Pendiente"
 *                   vacuna_programada:
 *                     type: string
 *                     example: "Vacuna MMR"
 *                   observaciones:
 *                     type: string
 *                     example: "Cita de seguimiento"
 */
router.get(
  '/',
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .execute('sp_ObtenerTodasCitas');

      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * tags:
 *   - name: Appointments
 *     description: Gestión de citas
 */

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Crea una nueva cita
 *     tags: [Appointments]
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
 *               id_centro:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               id_campaña:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440002"
 *               fecha_cita:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-11T10:00:00Z"
 *               estado:
 *                 type: string
 *                 enum: ["Pendiente", "Confirmada", "Cancelada", "Completada"]
 *                 example: "Pendiente"
 *               vacuna_programada:
 *                 type: string
 *                 example: "Vacuna MMR"
 *               observaciones:
 *                 type: string
 *                 example: "Cita de seguimiento"
 *     responses:
 *       201:
 *         description: Cita creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Appointment created"
 *                 id_cita:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440005"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('id_niño').isUUID().withMessage('Invalid UUID for id_niño'),
    body('id_centro').isUUID().withMessage('Invalid UUID for id_centro'),
    body('id_campaña').optional().isUUID().withMessage('Invalid UUID for id_campaña'),
    body('fecha_cita').isISO8601().toDate().withMessage('Invalid datetime for fecha_cita'),
    body('estado')
      .isIn(['Pendiente', 'Confirmada', 'Cancelada', 'Completada'])
      .withMessage('Invalid estado'),
    body('vacuna_programada').optional().isString().trim().withMessage('Invalid vacuna_programada'),
    body('observaciones').optional().isString().trim().withMessage('Invalid observaciones'),
  ],
  validate,
  async (req, res, next) => {
    const { id_niño, id_centro, id_campaña, fecha_cita, estado, vacuna_programada, observaciones } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, id_niño)
        .input('id_centro', sql.UniqueIdentifier, id_centro)
        .input('id_campaña', sql.UniqueIdentifier, id_campaña || null)
        .input('fecha_cita', sql.DateTime2, fecha_cita)
        .input('estado', sql.NVarChar, estado)
        .input('vacuna_programada', sql.NVarChar, vacuna_programada || null)
        .input('observaciones', sql.NVarChar, observaciones || null)
        .execute('sp_CrearCita');

      res.status(201).json({ message: 'Appointment created', id_cita: result.recordset[0].id_cita });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Obtiene una cita por ID
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cita encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_cita:
 *                   type: string
 *                   format: uuid
 *                 id_niño:
 *                   type: string
 *                   format: uuid
 *                 id_centro:
 *                   type: string
 *                   format: uuid
 *                 id_campaña:
 *                   type: string
 *                   format: uuid
 *                 fecha_cita:
 *                   type: string
 *                   format: date-time
 *                 estado:
 *                   type: string
 *                   enum: ["Pendiente", "Confirmada", "Cancelada", "Completada"]
 *                 vacuna_programada:
 *                   type: string
 *                 observaciones:
 *                   type: string
 *       404:
 *         description: Cita no encontrada
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
        .input('id_cita', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerCita');

      if (result.recordset.length === 0) {
        const error = new Error('Appointment not found');
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
 * /api/appointments/{id}:
 *   put:
 *     summary: Actualiza una cita
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *               id_centro:
 *                 type: string
 *                 format: uuid
 *               id_campaña:
 *                 type: string
 *                 format: uuid
 *               fecha_cita:
 *                 type: string
 *                 format: date-time
 *               estado:
 *                 type: string
 *                 enum: ["Pendiente", "Confirmada", "Cancelada", "Completada"]
 *               vacuna_programada:
 *                 type: string
 *               observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cita actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Appointment updated"
 *       400:
 *         description: Validación fallida
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid UUID for id_cita'),
    body('id_niño').isUUID().withMessage('Invalid UUID for id_niño'),
    body('id_centro').isUUID().withMessage('Invalid UUID for id_centro'),
    body('id_campaña').optional().isUUID().withMessage('Invalid UUID for id_campaña'),
    body('fecha_cita').isISO8601().toDate().withMessage('Invalid datetime for fecha_cita'),
    body('estado')
      .isIn(['Pendiente', 'Confirmada', 'Cancelada', 'Completada'])
      .withMessage('Invalid estado'),
    body('vacuna_programada').optional().isString().trim().withMessage('Invalid vacuna_programada'),
    body('observaciones').optional().isString().trim().withMessage('Invalid observaciones'),
  ],
  validate,
  async (req, res, next) => {
    const { id_niño, id_centro, id_campaña, fecha_cita, estado, vacuna_programada, observaciones } = req.body;

    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_cita', sql.UniqueIdentifier, req.params.id)
        .input('id_niño', sql.UniqueIdentifier, id_niño)
        .input('id_centro', sql.UniqueIdentifier, id_centro)
        .input('id_campaña', sql.UniqueIdentifier, id_campaña || null)
        .input('fecha_cita', sql.DateTime2, fecha_cita)
        .input('estado', sql.NVarChar, estado)
        .input('vacuna_programada', sql.NVarChar, vacuna_programada || null)
        .input('observaciones', sql.NVarChar, observaciones || null)
        .execute('sp_ActualizarCita');

      res.json({ message: 'Appointment updated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/appointments/{id}:
 *   delete:
 *     summary: Elimina una cita
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cita eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Appointment deleted"
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
        .input('id_cita', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarCita');

      res.json({ message: 'Appointment deleted' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/appointments/center/{id}:
 *   get:
 *     summary: Obtiene citas por centro
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: fecha_inicio
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - name: fecha_fin
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Lista de citas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_cita:
 *                     type: string
 *                     format: uuid
 *                   id_niño:
 *                     type: string
 *                     format: uuid
 *                   id_centro:
 *                     type: string
 *                     format: uuid
 *                   id_campaña:
 *                     type: string
 *                     format: uuid
 *                   fecha_cita:
 *                     type: string
 *                     format: date-time
 *                   estado:
 *                     type: string
 *                     enum: ["Pendiente", "Confirmada", "Cancelada", "Completada"]
 *                   vacuna_programada:
 *                     type: string
 *                   observaciones:
 *                     type: string
 */
router.get(
  '/center/:id',
  [
    param('id').isUUID().withMessage('Invalid UUID for id_centro'),
    query('fecha_inicio').isDate().withMessage('Invalid date for fecha_inicio'),
    query('fecha_fin').isDate().withMessage('Invalid date for fecha_fin'),
  ],
  validate,
  async (req, res, next) => {
    const { fecha_inicio, fecha_fin } = req.query;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_centro', sql.UniqueIdentifier, req.params.id)
        .input('fecha_inicio', sql.Date, fecha_inicio)
        .input('fecha_fin', sql.Date, fecha_fin)
        .execute('sp_ObtenerCitasPorCentro');

      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;