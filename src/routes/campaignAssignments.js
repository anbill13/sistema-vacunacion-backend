const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: CampaignAssignments
 *   description: Gestión de asignaciones de campañas a centros
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CampaignAssignment:
 *       type: object
 *       required:
 *         - id_campaña
 *         - id_centro
 *         - fecha_asignacion
 *       properties:
 *         id_campaña_centro:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la asignación
 *         id_campaña:
 *           type: string
 *           format: uuid
 *           description: ID de la campaña
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro
 *         fecha_asignacion:
 *           type: string
 *           format: date
 *           description: Fecha de asignación
 *       example:
 *         id_campaña_centro: "123e4567-e89b-12d3-a456-426614174005"
 *         id_campaña: "123e4567-e89b-12d3-a456-426614174004"
 *         id_centro: "123e4567-e89b-12d3-a456-426614174002"
 *         fecha_asignacion: "2025-06-20"
 *     CampaignAssignmentInput:
 *       type: object
 *       required:
 *         - id_campaña
 *         - id_centro
 *         - fecha_asignacion
 *       properties:
 *         id_campaña:
 *           type: string
 *           format: uuid
 *         id_centro:
 *           type: string
 *           format: uuid
 *         fecha_asignacion:
 *           type: string
 *           format: date
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateCampaignAssignment = [
  body('id_campaña').isUUID().withMessage('ID de campaña inválido'),
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('fecha_asignacion').isDate().withMessage('Fecha de asignación inválida'),
];

/**
 * @swagger
 * /api/campaign-assignments:
 *   get:
 *     summary: Obtener todas las asignaciones de campañas
 *     tags: [CampaignAssignments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de asignaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CampaignAssignment'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_campaña_centro, id_campaña, id_centro, fecha_asignacion
      FROM Campaña_Centros
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener asignaciones de campañas' });
  }
});

/**
 * @swagger
 * /api/campaign-assignments:
 *   post:
 *     summary: Crear una nueva asignación de campaña
 *     tags: [CampaignAssignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignAssignmentInput'
 *     responses:
 *       201:
 *         description: Asignación creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_campaña_centro:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, validateCampaignAssignment, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_campaña, id_centro, fecha_asignacion } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_campaña', sql.UniqueIdentifier, id_campaña)
      .input('id_centro', sql.UniqueIdentifier, id_centro)
      .input('fecha_asignacion', sql.Date, fecha_asignacion)
      .execute('sp_CrearAsignacionCampaña');

    res.status(201).json({ id_campaña_centro: result.recordset[0].id_campaña_centro });
  } catch (err) {
    if (err.number === 50001 || err.number === 50002) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear asignación de campaña' });
  }
});

/**
 * @swagger
 * /api/campaign-assignments/{id}:
 *   get:
 *     summary: Obtener una asignación de campaña por ID
 *     tags: [CampaignAssignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la asignación
 *     responses:
 *       200:
 *         description: Asignación encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignAssignment'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Asignación no encontrada
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_campaña_centro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerAsignacionCampaña');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Asignación no encontrada' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener asignación de campaña' });
  }
});

/**
 * @swagger
 * /api/campaign-assignments/{id}:
 *   delete:
 *     summary: Eliminar una asignación de campaña
 *     tags: [CampaignAssignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la asignación
 *     responses:
 *       200:
 *         description: Asignación eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Asignación eliminada
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Asignación no encontrada
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_campaña_centro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarAsignacionCampaña');

    res.json({ message: 'Asignación eliminada' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al eliminar asignación de campaña' });
  }
});

module.exports = router;