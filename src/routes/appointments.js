const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, checkRole } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Gestión de citas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       required:
 *         - id_niño
 *         - id_centro
 *         - fecha_cita
 *         - estado
 *       properties:
 *         id_cita:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la cita
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: ID del niño
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro
 *         fecha_cita:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la cita
 *         estado:
 *           type: string
 *           enum: [Pendiente, Confirmada, Cancelada, Completada]
 *           description: Estado de la cita
 *         nombre_niño:
 *           type: string
 *           description: Nombre del niño (en reportes)
 *     AppointmentInput:
 *       type: object
 *       required:
 *         - id_niño
 *         - id_centro
 *         - fecha_cita
 *         - estado
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *         id_centro:
 *           type: string
 *           format: uuid
 *         fecha_cita:
 *           type: string
 *           format: date-time
 *         estado:
 *           type: string
 *           enum: [Pendiente, Confirmada, Cancelada, Completada]
 */

const validateAppointment = [
  body('id_niño').isUUID().withMessage('ID de niño inválido'),
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('fecha_cita').isISO8601().withMessage('Fecha de cita inválida'),
  body('estado').isIn(['Pendiente', 'Confirmada', 'Cancelada', 'Completada']).withMessage('Estado inválido'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Listar todas las citas
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de citas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Appointment'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', [authenticate, checkRole(['doctor', 'administrador'])], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Citas');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Obtener una cita por ID
 *     tags: [Appointments]
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
 *         description: Cita obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [authenticate, checkRole(['doctor', 'administrador']), validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_cita', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Citas WHERE id_cita = @id_cita');
    if (result.recordset.length === 0) {
      const error = new Error('Cita no encontrada');
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
 * /api/appointments:
 *   post:
 *     summary: Crear una nueva cita
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppointmentInput'
 *     responses:
 *       201:
 *         description: Cita creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_cita:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/',
  [authenticate, checkRole(['doctor', 'administrador']), validateAppointment],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, req.body.id_niño)
        .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
        .input('fecha_cita', sql.DateTime2, req.body.fecha_cita)
        .input('estado', sql.NVarChar, req.body.estado)
        .execute('sp_CrearCita');
      res.status(201).json({ id_cita: result.recordset[0].id_cita });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/appointments/{id}:
 *   put:
 *     summary: Actualizar una cita
 *     tags: [Appointments]
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
 *             $ref: '#/components/schemas/AppointmentInput'
 *     responses:
 *       204:
 *         description: Cita actualizada exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id',
  [authenticate, checkRole(['doctor', 'administrador']), validateUUID, validateAppointment],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_cita', sql.UniqueIdentifier, req.params.id)
        .input('id_niño', sql.UniqueIdentifier, req.body.id_niño)
        .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
        .input('fecha_cita', sql.DateTime2, req.body.fecha_cita)
        .input('estado', sql.NVarChar, req.body.estado)
        .execute('sp_ActualizarCita');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/appointments/{id}:
 *   delete:
 *     summary: Eliminar una cita
 *     tags: [Appointments]
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
 *         description: Cita eliminada exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete(
  '/:id',
  [authenticate, checkRole(['doctor', 'administrador']), validateUUID],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_cita', sql.UniqueIdentifier, req.params.id)
        .query('DELETE FROM Citas WHERE id_cita = @id_cita'); // Nota: No hay stored procedure, usar DELETE directo
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/appointments/center/{id}:
 *   get:
 *     summary: Obtener citas por centro y rango de fechas
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro
 *       - in: query
 *         name: fecha_inicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio
 *       - in: query
 *         name: fecha_fin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Citas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  '/center/:id',
  [
    authenticate,
    checkRole(['doctor', 'administrador']),
    validateUUID,
    query('fecha_inicio').isDate().withMessage('Fecha de inicio inválida'),
    query('fecha_fin').isDate().withMessage('Fecha de fin inválida'),
  ],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_centro', sql.UniqueIdentifier, req.params.id)
        .input('fecha_inicio', sql.Date, req.query.fecha_inicio)
        .input('fecha_fin', sql.Date, req.query.fecha_fin)
        .execute('sp_ObtenerCitasPorCentro');
      res.status(200).json(result.recordset);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;