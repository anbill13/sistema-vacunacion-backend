const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate, checkRole } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: Campaigns
 *   description: Gestión de campañas de vacunación
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Campaign:
 *       type: object
 *       required:
 *         - nombre_campaña
 *         - fecha_inicio
 *         - id_vacuna
 *       properties:
 *         id_campaña:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la campaña
 *         nombre_campaña:
 *           type: string
 *           description: Nombre de la campaña
 *         fecha_inicio:
 *           type: string
 *           format: date
 *           description: Fecha de inicio de la campaña
 *         fecha_fin:
 *           type: string
 *           format: date
 *           description: Fecha de fin de la campaña (opcional)
 *         objetivo:
 *           type: string
 *           description: Objetivo de la campaña (opcional)
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *           description: ID de la vacuna asociada
 *         estado:
 *           type: string
 *           enum: [Planificada, En Curso, Finalizada]
 *           description: Estado de la campaña
 *       example:
 *         id_campaña: "123e4567-e89b-12d3-a456-426614174004"
 *         nombre_campaña: "Campaña Sarampión 2025"
 *         fecha_inicio: "2025-07-01"
 *         fecha_fin: "2025-12-31"
 *         objetivo: "Vacunar al 95% de los niños"
 *         id_vacuna: "123e4567-e89b-12d3-a456-426614174003"
 *         estado: "Planificada"
 *     CampaignInput:
 *       type: object
 *       required:
 *         - nombre_campaña
 *         - fecha_inicio
 *         - id_vacuna
 *       properties:
 *         nombre_campaña:
 *           type: string
 *         fecha_inicio:
 *           type: string
 *           format: date
 *         fecha_fin:
 *           type: string
 *           format: date
 *           nullable: true
 *         objetivo:
 *           type: string
 *           nullable: true
 *         id_vacuna:
 *           type: string
 *           format: uuid
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateCampaign = [
  body('nombre_campaña').notEmpty().isString().withMessage('Nombre de la campaña es requerido'),
  body('fecha_inicio').isDate().withMessage('Fecha de inicio inválida'),
  body('fecha_fin').optional().isDate().withMessage('Fecha de fin inválida'),
  body('objetivo').optional().isString(),
  body('id_vacuna').isUUID().withMessage('ID de vacuna inválido'),
];

/**
 * @swagger
 * /api/campaigns:
 *   get:
 *     summary: Obtener todas las campañas
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de campañas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Campaign'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_campaña, nombre_campaña, fecha_inicio, fecha_fin, objetivo, id_vacuna, estado
      FROM Campañas
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener campañas' });
  }
});

/**
 * @swagger
 * /api/campaigns:
 *   post:
 *     summary: Crear una nueva campaña
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignInput'
 *     responses:
 *       201:
 *         description: Campaña creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_campaña:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, checkRole(['administrador']), validateCampaign, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre_campaña, fecha_inicio, fecha_fin, objetivo, id_vacuna } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('nombre_campaña', sql.NVarChar, nombre_campaña)
      .input('fecha_inicio', sql.Date, fecha_inicio)
      .input('fecha_fin', sql.Date, fecha_fin)
      .input('objetivo', sql.NVarChar, objetivo)
      .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
      .execute('sp_CrearCampaña');

    res.status(201).json({ id_campaña: result.recordset[0].id_campaña });
  } catch (err) {
    if (err.number === 50001 || err.number === 50002) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear campaña' });
  }
});

/**
 * @swagger
 * /api/campaigns/{id}:
 *   get:
 *     summary: Obtener una campaña por ID
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la campaña
 *     responses:
 *       200:
 *         description: Campaña encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Campaña no encontrada
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_campaña', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerCampaña');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Campaña no encontrada' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener campaña' });
  }
});

/**
 * @swagger
 * /api/campaigns/{id}:
 *   put:
 *     summary: Actualizar una campaña
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la campaña
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignInput'
 *     responses:
 *       200:
 *         description: Campaña actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Campaña actualizada
 *       400:
 *         description: Error en los datos enviados
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       404:
 *         description: Campaña no encontrada
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, checkRole(['administrador']), validateUUID, validateCampaign, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre_campaña, fecha_inicio, fecha_fin, objetivo, id_vacuna } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_campaña', sql.UniqueIdentifier, req.params.id)
      .input('nombre_campaña', sql.NVarChar, nombre_campaña)
      .input('fecha_inicio', sql.Date, fecha_inicio)
      .input('fecha_fin', sql.Date, fecha_fin)
      .input('objetivo', sql.NVarChar, objetivo)
      .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
      .execute('sp_ActualizarCampaña');

    res.json({ message: 'Campaña actualizada' });
  } catch (err) {
    if (err.number === 50001 || err.number === 50002 || err.number === 50003) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar campaña' });
  }
});

/**
 * @swagger
 * /api/campaigns/{id}:
 *   delete:
 *     summary: Eliminar una campaña
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la campaña
 *     responses:
 *       200:
 *         description: Campaña eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Campaña eliminada
 *       400:
 *         description: ID inválido
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       404:
 *         description: Campaña no encontrada
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, checkRole(['administrador']), validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_campaña', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarCampaña');

    res.json({ message: 'Campaña eliminada' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al eliminar campaña' });
  }
});

module.exports = router;