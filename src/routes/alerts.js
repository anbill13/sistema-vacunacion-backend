const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Gestión de alertas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Alert:
 *       type: object
 *       required:
 *         - id_niño
 *         - tipo_alerta
 *         - fecha_alerta
 *       properties:
 *         id_alerta:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la alerta
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: ID del niño asociado
 *         tipo_alerta:
 *           type: string
 *           description: Tipo de alerta
 *         fecha_alerta:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la alerta
 *         descripcion:
 *           type: string
 *           description: Descripción de la alerta (opcional)
 *         estado:
 *           type: string
 *           enum: [Pendiente, Resuelta]
 *           description: Estado de la alerta
 *       example:
 *         id_alerta: "123e4567-e89b-12d3-a456-426614174010"
 *         id_niño: "123e4567-e89b-12d3-a456-426614174000"
 *         tipo_alerta: "Dosis Pendiente"
 *         fecha_alerta: "2025-06-20T10:00:00Z"
 *         descripcion: "Falta segunda dosis de sarampión"
 *         estado: "Pendiente"
 *     AlertInput:
 *       type: object
 *       required:
 *         - id_niño
 *         - tipo_alerta
 *         - fecha_alerta
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *         tipo_alerta:
 *           type: string
 *         fecha_alerta:
 *           type: string
 *           format: date-time
 *         descripcion:
 *           type: string
 *           nullable: true
 *         estado:
 *           type: string
 *           enum: [Pendiente, Resuelta]
 *           nullable: true
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateAlert = [
  body('id_niño').isUUID().withMessage('ID de niño inválido'),
  body('tipo_alerta').notEmpty().isString().withMessage('Tipo de alerta es requerido'),
  body('fecha_alerta').isISO8601().withMessage('Fecha de alerta inválida'),
  body('descripcion').optional().isString(),
  body('estado').optional().isIn(['Pendiente', 'Resuelta']).withMessage('Estado inválido'),
];

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Obtener todas las alertas
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de alertas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Alert'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_alerta, id_niño, tipo_alerta, fecha_alerta, descripcion, estado
      FROM Alertas
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
});

/**
 * @swagger
 * /api/alerts:
 *   post:
 *     summary: Crear una nueva alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlertInput'
 *     responses:
 *       201:
 *         description: Alerta creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_alerta:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, validateAlert, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_niño, tipo_alerta, fecha_alerta, descripcion, estado } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_niño', sql.UniqueIdentifier, id_niño)
      .input('tipo_alerta', sql.NVarChar, tipo_alerta)
      .input('fecha_alerta', sql.DateTime2, fecha_alerta)
      .input('descripcion', sql.NVarChar, descripcion)
      .input('estado', sql.NVarChar, estado || 'Pendiente')
      .execute('sp_CrearAlerta');

    res.status(201).json({ id_alerta: result.recordset[0].id_alerta });
  } catch (err) {
    if (err.number === 50001) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear alerta' });
  }
});

/**
 * @swagger
 * /api/alerts/{id}:
 *   get:
 *     summary: Obtener una alerta por ID
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la alerta
 *     responses:
 *       200:
 *         description: Alerta encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Alert'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Alerta no encontrada
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_alerta', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerAlerta');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Alerta no encontrada' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener alerta' });
  }
});

/**
 * @swagger
 * /api/alerts/{id}:
 *   put:
 *     summary: Actualizar una alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la alerta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlertInput'
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
 *                   example: Alerta actualizada
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Alerta no encontrada
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, validateUUID, validateAlert, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_niño, tipo_alerta, fecha_alerta, descripcion, estado } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_alerta', sql.UniqueIdentifier, req.params.id)
      .input('id_niño', sql.UniqueIdentifier, id_niño)
      .input('tipo_alerta', sql.NVarChar, tipo_alerta)
      .input('fecha_alerta', sql.DateTime2, fecha_alerta)
      .input('descripcion', sql.NVarChar, descripcion)
      .input('estado', sql.NVarChar, estado || 'Pendiente')
      .execute('sp_ActualizarAlerta');

    res.json({ message: 'Alerta actualizada' });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50004) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar alerta' });
  }
});

/**
 * @swagger
 * /api/alerts/{id}:
 *   delete:
 *     summary: Eliminar una alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la alerta
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
 *                   example: Alerta eliminada
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Alerta no encontrada
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_alerta', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarAlerta');

    res.json({ message: 'Alerta eliminada' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al eliminar alerta' });
  }
});

module.exports = router;