const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Gestión de citas de vacunación
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
 *       properties:
 *         id_cita:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la cita
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: ID del niño asociado
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro de vacunación
 *         fecha_cita:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la cita
 *         estado:
 *           type: string
 *           enum: [Pendiente, Confirmada, Cancelada, Completada]
 *           description: Estado de la cita
 *       example:
 *         id_cita: "123e4567-e89b-12d3-a456-426614174011"
 *         id_niño: "123e4567-e89b-12d3-a456-426614174000"
 *         id_centro: "123e4567-e89b-12d3-a456-426614174002"
 *         fecha_cita: "2025-07-01T09:00:00Z"
 *         estado: "Pendiente"
 *     AppointmentInput:
 *       type: object
 *       required:
 *         - id_niño
 *         - id_centro
 *         - fecha_cita
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
 *           nullable: true
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AppointmentByCenter:
 *       type: object
 *       properties:
 *         id_cita:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la cita
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: ID del niño asociado
 *         nombre_niño:
 *           type: string
 *           description: Nombre completo del niño
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro de vacunación
 *         fecha_cita:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la cita
 *         estado:
 *           type: string
 *           enum: [Pendiente, Confirmada, Cancelada, Completada]
 *           description: Estado de la cita
 *       example:
 *         id_cita: "123e4567-e89b-12d3-a456-426614174011"
 *         id_niño: "123e4567-e89b-12d3-a456-426614174000"
 *         nombre_niño: "Juan Pérez"
 *         id_centro: "123e4567-e89b-12d3-a456-426614174002"
 *         fecha_cita: "2025-07-01T09:00:00Z"
 *         estado: "Pendiente"
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateAppointment = [
  body('id_niño').isUUID().withMessage('ID de niño inválido'),
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('fecha_cita').isISO8601().withMessage('Fecha de cita inválida'),
  body('estado').optional().isIn(['Pendiente', 'Confirmada', 'Cancelada', 'Completada']).withMessage('Estado inválido'),
];

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Obtener todas las citas
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
 *                 $ref: '#/components/schemas/Appointment'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_cita, id_niño, id_centro, fecha_cita, estado
      FROM Citas
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener citas' });
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
 *         description: Error del servidor
 */
router.post('/', authenticate, validateAppointment, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_niño, id_centro, fecha_cita, estado } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_niño', sql.UniqueIdentifier, id_niño)
      .input('id_centro', sql.UniqueIdentifier, id_centro)
      .input('fecha_cita', sql.DateTime2, fecha_cita)
      .input('estado', sql.NVarChar, estado || 'Pendiente')
      .execute('sp_CrearCita');

    res.status(201).json({ id_cita: result.recordset[0].id_cita });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50003) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear cita' });
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
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Cita encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_cita', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerCita');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cita' });
  }
});

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
 *         description: ID de la cita
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppointmentInput'
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
 *                   example: Cita actualizada
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, validateUUID, validateAppointment, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_niño, id_centro, fecha_cita, estado } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_cita', sql.UniqueIdentifier, req.params.id)
      .input('id_niño', sql.UniqueIdentifier, id_niño)
      .input('id_centro', sql.UniqueIdentifier, id_centro)
      .input('fecha_cita', sql.DateTime2, fecha_cita)
      .input('estado', sql.NVarChar, estado || 'Pendiente')
      .execute('sp_ActualizarCita');

    res.json({ message: 'Cita actualizada' });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50006) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
});

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
 *         description: ID de la cita
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
 *                   example: Cita eliminada
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_cita', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarCita');

    res.json({ message: 'Cita eliminada' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al eliminar cita' });
  }
});

/**
 * @swagger
 * /api/appointments/center/{id}:
 *   get:
 *     summary: Obtener citas por centro de vacunación
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
 *         description: ID del centro de vacunación
 *     responses:
 *       200:
 *         description: Lista de citas del centro
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AppointmentByCenter'
 *       400:
 *         description: ID de centro inválido
 *       500:
 *         description: Error del servidor
 */
router.get('/center/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .query(`
        SELECT C.id_cita, C.id_niño, N.nombre_completo AS nombre_niño, C.id_centro, C.fecha_cita, C.estado
        FROM Citas C
        INNER JOIN Niños N ON C.id_niño = N.id_niño
        WHERE C.id_centro = @id_centro
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener citas por centro' });
  }
});

module.exports = router;