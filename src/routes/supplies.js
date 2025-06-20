const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: Supplies
 *   description: Gestión de suministros
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Supply:
 *       type: object
 *       required:
 *         - id_centro
 *         - id_lote
 *         - cantidad
 *         - fecha_registro
 *       properties:
 *         id_suministro:
 *           type: string
 *           format: uuid
 *           description: Identificador único del suministro
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro de vacunación
 *         id_lote:
 *           type: string
 *           format: uuid
 *           description: ID del lote de vacunas
 *         cantidad:
 *           type: integer
 *           description: Cantidad de vacunas en el suministro
 *         fecha_registro:
 *           type: string
 *           format: date
 *           description: Fecha de registro del suministro
 *       example:
 *         id_suministro: "123e4567-e89b-12d3-a456-426614174013"
 *         id_centro: "123e4567-e89b-12d3-a456-426614174002"
 *         id_lote: "123e4567-e89b-12d3-a456-426614174014"
 *         cantidad: 100
 *         fecha_registro: "2025-06-20"
 *     SupplyInput:
 *       type: object
 *       required:
 *         - id_centro
 *         - id_lote
 *         - cantidad
 *         - fecha_registro
 *       properties:
 *         id_centro:
 *           type: string
 *           format: uuid
 *         id_lote:
 *           type: string
 *           format: uuid
 *         cantidad:
 *           type: integer
 *         fecha_registro:
 *           type: string
 *           format: date
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateSupply = [
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('id_lote').isUUID().withMessage('ID de lote inválido'),
  body('cantidad').isInt({ min: 1 }).withMessage('Cantidad debe ser un entero positivo'),
  body('fecha_registro').isDate().withMessage('Fecha de registro inválida'),
];

/**
 * @swagger
 * /api/supplies:
 *   get:
 *     summary: Obtener todos los suministros
 *     tags: [Supplies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de suministros
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Supply'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_suministro, id_centro, id_lote, cantidad, fecha_registro
      FROM Suministros
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener suministros' });
  }
});

/**
 * @swagger
 * /api/supplies:
 *   post:
 *     summary: Crear un nuevo suministro
 *     tags: [Supplies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SupplyInput'
 *     responses:
 *       201:
 *         description: Suministro creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_suministro:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, validateSupply, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_centro, id_lote, cantidad, fecha_registro } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_centro', sql.UniqueIdentifier, id_centro)
      .input('id_lote', sql.UniqueIdentifier, id_lote)
      .input('cantidad', sql.Int, cantidad)
      .input('fecha_registro', sql.Date, fecha_registro)
      .execute('sp_CrearSuministro');

    res.status(201).json({ id_suministro: result.recordset[0].id_suministro });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50003) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear suministro' });
  }
});

/**
 * @swagger
 * /api/supplies/{id}:
 *   get:
 *     summary: Obtener un suministro por ID
 *     tags: [Supplies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del suministro
 *     responses:
 *       200:
 *         description: Suministro encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Supply'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Suministro no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_suministro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerSuministro');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Suministro no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener suministro' });
  }
});

/**
 * @swagger
 * /api/supplies/{id}:
 *   put:
 *     summary: Actualizar un suministro
 *     tags: [Supplies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del suministro
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SupplyInput'
 *     responses:
 *       200:
 *         description: Suministro actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Suministro actualizado
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Suministro no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, validateUUID, validateSupply, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_centro, id_lote, cantidad, fecha_registro } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_suministro', sql.UniqueIdentifier, req.params.id)
      .input('id_centro', sql.UniqueIdentifier, id_centro)
      .input('id_lote', sql.UniqueIdentifier, id_lote)
      .input('cantidad', sql.Int, cantidad)
      .input('fecha_registro', sql.Date, fecha_registro)
      .execute('sp_ActualizarSuministro');

    res.json({ message: 'Suministro actualizado' });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50004) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar suministro' });
  }
});

/**
 * @swagger
 * /api/supplies/{id}:
 *   delete:
 *     summary: Eliminar un suministro
 *     tags: [Supplies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del suministro
 *     responses:
 *       200:
 *         description: Suministro eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Suministro eliminado
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Suministro no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_suministro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarSuministro');

    res.json({ message: 'Suministro eliminado' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al eliminar suministro' });
  }
});

module.exports = router;