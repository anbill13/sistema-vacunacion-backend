const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: AdverseEvents
 *   description: Gestión de eventos adversos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AdverseEvent:
 *       type: object
 *       required:
 *         - id_niño
 *         - id_historial
 *         - descripcion_evento
 *         - fecha_evento
 *         - gravedad
 *         - id_personal_reportante
 *       properties:
 *         id_evento:
 *           type: string
 *           format: uuid
 *           description: Identificador único del evento adverso
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: ID del niño asociado
 *         id_historial:
 *           type: string
 *           format: uuid
 *           description: ID del historial de vacunación
 *         descripcion_evento:
 *           type: string
 *           description: Descripción del evento adverso
 *         fecha_evento:
 *           type: string
 *           format: date
 *           description: Fecha del evento
 *         gravedad:
 *           type: string
 *           enum: [Leve, Moderado, Grave]
 *           description: Gravedad del evento
 *         id_personal_reportante:
 *           type: string
 *           format: uuid
 *           description: ID del personal que reporta
 *         acciones_tomadas:
 *           type: string
 *           description: Acciones tomadas (opcional)
 *         estado:
 *           type: string
 *           enum: [Reportado, En Investigación, Resuelto]
 *           description: Estado del evento
 *       example:
 *         id_evento: "123e4567-e89b-12d3-a456-426614174008"
 *         id_niño: "123e4567-e89b-12d3-a456-426614174000"
 *         id_historial: "123e4567-e89b-12d3-a456-426614174009"
 *         descripcion_evento: "Fiebre post-vacunación"
 *         fecha_evento: "2025-06-20"
 *         gravedad: "Leve"
 *         id_personal_reportante: "123e4567-e89b-12d3-a456-426614174006"
 *         acciones_tomadas: "Observación"
 *         estado: "Reportado"
 *     AdverseEventInput:
 *       type: object
 *       required:
 *         - id_niño
 *         - id_historial
 *         - descripcion_evento
 *         - fecha_evento
 *         - gravedad
 *         - id_personal_reportante
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *         id_historial:
 *           type: string
 *           format: uuid
 *         descripcion_evento:
 *           type: string
 *         fecha_evento:
 *           type: string
 *           format: date
 *         gravedad:
 *           type: string
 *           enum: [Leve, Moderado, Grave]
 *         id_personal_reportante:
 *           type: string
 *           format: uuid
 *         acciones_tomadas:
 *           type: string
 *           nullable: true
 *         estado:
 *           type: string
 *           enum: [Reportado, En Investigación, Resuelto]
 *           nullable: true
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateAdverseEvent = [
  body('id_niño').isUUID().withMessage('ID de niño inválido'),
  body('id_historial').isUUID().withMessage('ID de historial inválido'),
  body('descripcion_evento').notEmpty().isString().withMessage('Descripción es requerida'),
  body('fecha_evento').isDate().withMessage('Fecha de evento inválida'),
  body('gravedad').isIn(['Leve', 'Moderado', 'Grave']).withMessage('Gravedad inválida'),
  body('id_personal_reportante').isUUID().withMessage('ID de reportante inválido'),
  body('acciones_tomadas').optional().isString(),
  body('estado').optional().isIn(['Reportado', 'En Investigación', 'Resuelto']).withMessage('Estado inválido'),
];

/**
 * @swagger
 * /api/adverse-events:
 *   get:
 *     summary: Obtener todos los eventos adversos
 *     tags: [AdverseEvents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de eventos adversos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AdverseEvent'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_evento, id_niño, id_historial, descripcion_evento, fecha_evento, gravedad, id_personal_reportante, acciones_tomadas, estado
      FROM Eventos_Adversos
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener eventos adversos' });
  }
});

/**
 * @swagger
 * /api/adverse-events:
 *   post:
 *     summary: Crear un nuevo evento adverso
 *     tags: [AdverseEvents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdverseEventInput'
 *     responses:
 *       201:
 *         description: Evento adverso creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_evento:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, validateAdverseEvent, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_niño, id_historial, descripcion_evento, fecha_evento, gravedad, id_personal_reportante, acciones_tomadas, estado } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_niño', sql.UniqueIdentifier, id_niño)
      .input('id_historial', sql.UniqueIdentifier, id_historial)
      .input('descripcion_evento', sql.NVarChar, descripcion_evento)
      .input('fecha_evento', sql.Date, fecha_evento)
      .input('gravedad', sql.NVarChar, gravedad)
      .input('id_personal_reportante', sql.UniqueIdentifier, id_personal_reportante)
      .input('acciones_tomadas', sql.NVarChar, acciones_tomadas)
      .input('estado', sql.NVarChar, estado || 'Reportado')
      .execute('sp_CrearEventoAdverso');

    res.status(201).json({ id_evento: result.recordset[0].id_evento });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50004) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear evento adverso' });
  }
});

/**
 * @swagger
 * /api/adverse-events/{id}:
 *   get:
 *     summary: Obtener un evento adverso por ID
 *     tags: [AdverseEvents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del evento adverso
 *     responses:
 *       200:
 *         description: Evento adverso encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdverseEvent'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Evento adverso no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_evento', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerEventoAdverso');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Evento adverso no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener evento adverso' });
  }
});

/**
 * @swagger
 * /api/adverse-events/{id}:
 *   put:
 *     summary: Actualizar un evento adverso
 *     tags: [AdverseEvents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del evento adverso
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdverseEventInput'
 *     responses:
 *       200:
 *         description: Evento adverso actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Evento adverso actualizado
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Evento adverso no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, validateUUID, validateAdverseEvent, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_niño, id_historial, descripcion_evento, fecha_evento, gravedad, id_personal_reportante, acciones_tomadas, estado } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_evento', sql.UniqueIdentifier, req.params.id)
      .input('id_niño', sql.UniqueIdentifier, id_niño)
      .input('id_historial', sql.UniqueIdentifier, id_historial)
      .input('descripcion_evento', sql.NVarChar, descripcion_evento)
      .input('fecha_evento', sql.Date, fecha_evento)
      .input('gravedad', sql.NVarChar, gravedad)
      .input('id_personal_reportante', sql.UniqueIdentifier, id_personal_reportante)
      .input('acciones_tomadas', sql.NVarChar, acciones_tomadas)
      .input('estado', sql.NVarChar, estado || 'Reportado')
      .execute('sp_ActualizarEventoAdverso');

    res.json({ message: 'Evento adverso actualizado' });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50007) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar evento adverso' });
  }
});

/**
 * @swagger
 * /api/adverse-events/{id}:
 *   delete:
 *     summary: Eliminar un evento adverso
 *     tags: [AdverseEvents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del evento adverso
 *     responses:
 *       200:
 *         description: Evento adverso eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Evento adverso eliminado
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Evento adverso no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_evento', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarEventoAdverso');

    res.json({ message: 'Evento adverso eliminado' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al eliminar evento adverso' });
  }
});

module.exports = router;