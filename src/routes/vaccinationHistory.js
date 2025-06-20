const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: VaccinationHistory
 *   description: Gestión del historial de vacunación
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     VaccinationHistory:
 *       type: object
 *       required:
 *         - id_niño
 *         - id_vacuna
 *         - id_centro
 *         - id_lote
 *         - fecha_vacunacion
 *         - dosis_numero
 *         - id_personal
 *       properties:
 *         id_historial:
 *           type: string
 *           format: uuid
 *           description: Identificador único del historial
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: ID del niño
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *           description: ID de la vacuna
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro de vacunación
 *         id_lote:
 *           type: string
 *           format: uuid
 *           description: ID del lote de vacunas
 *         fecha_vacunacion:
 *           type: string
 *           format: date
 *           description: Fecha de vacunación
 *         dosis_numero:
 *           type: integer
 *           description: Número de la dosis
 *         id_personal:
 *           type: string
 *           format: uuid
 *           description: ID del personal que aplicó la vacuna
 *       example:
 *         id_historial: "123e4567-e89b-12d3-a456-426614174009"
 *         id_niño: "123e4567-e89b-12d3-a456-426614174000"
 *         id_vacuna: "123e4567-e89b-12d3-a456-426614174003"
 *         id_centro: "123e4567-e89b-12d3-a456-426614174002"
 *         id_lote: "123e4567-e89b-12d3-a456-426614174014"
 *         fecha_vacunacion: "2025-06-20"
 *         dosis_numero: 1
 *         id_personal: "123e4567-e89b-12d3-a456-426614174006"
 *     VaccinationHistoryInput:
 *       type: object
 *       required:
 *         - id_niño
 *         - id_vacuna
 *         - id_centro
 *         - id_lote
 *         - fecha_vacunacion
 *         - dosis_numero
 *         - id_personal
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *         id_centro:
 *           type: string
 *           format: uuid
 *         id_lote:
 *           type: string
 *           format: uuid
 *         fecha_vacunacion:
 *           type: string
 *           format: date
 *         dosis_numero:
 *           type: integer
 *         id_personal:
 *           type: string
 *           format: uuid
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateVaccinationHistory = [
  body('id_niño').isUUID().withMessage('ID de niño inválido'),
  body('id_vacuna').isUUID().withMessage('ID de vacuna inválido'),
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('id_lote').isUUID().withMessage('ID de lote inválido'),
  body('fecha_vacunacion').isDate().withMessage('Fecha de vacunación inválida'),
  body('dosis_numero').isInt({ min: 1 }).withMessage('Número de dosis debe ser un entero positivo'),
  body('id_personal').isUUID().withMessage('ID de personal inválido'),
];

/**
 * @swagger
 * /api/vaccination-history:
 *   get:
 *     summary: Obtener todo el historial de vacunación
 *     tags: [VaccinationHistory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de historial de vacunación
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VaccinationHistory'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_historial, id_niño, id_vacuna, id_centro, id_lote, fecha_vacunacion, dosis_numero, id_personal
      FROM Historial_Vacunacion
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial de vacunación' });
  }
});

/**
 * @swagger
 * /api/vaccination-history:
 *   post:
 *     summary: Crear un nuevo registro de vacunación
 *     tags: [VaccinationHistory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccinationHistoryInput'
 *     responses:
 *       201:
 *         description: Registro creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_historial:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, validateVaccinationHistory, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_niño, id_vacuna, id_centro, id_lote, fecha_vacunacion, dosis_numero, id_personal } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_niño', sql.UniqueIdentifier, id_niño)
      .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
      .input('id_centro', sql.UniqueIdentifier, id_centro)
      .input('id_lote', sql.UniqueIdentifier, id_lote)
      .input('fecha_vacunacion', sql.Date, fecha_vacunacion)
      .input('dosis_numero', sql.Int, dosis_numero)
      .input('id_personal', sql.UniqueIdentifier, id_personal)
      .execute('sp_CrearHistorialVacunacion');

    res.status(201).json({ id_historial: result.recordset[0].id_historial });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50005) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear historial de vacunación' });
  }
});

/**
 * @swagger
 * /api/vaccination-history/{id}:
 *   get:
 *     summary: Obtener un registro de vacunación por ID
 *     tags: [VaccinationHistory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del historial de vacunación
 *     responses:
 *       200:
 *         description: Registro encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VaccinationHistory'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Registro no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_historial', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerHistorialVacunacion');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Historial no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial de vacunación' });
  }
});

/**
 * @swagger
 * /api/vaccination-history/{id}:
 *   put:
 *     summary: Actualizar un registro de vacunación
 *     tags: [VaccinationHistory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del historial de vacunación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccinationHistoryInput'
 *     responses:
 *       200:
 *         description: Registro actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Historial actualizado
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Registro no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, validateUUID, validateVaccinationHistory, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_niño, id_vacuna, id_centro, id_lote, fecha_vacunacion, dosis_numero, id_personal } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_historial', sql.UniqueIdentifier, req.params.id)
      .input('id_niño', sql.UniqueIdentifier, id_niño)
      .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
      .input('id_centro', sql.UniqueIdentifier, id_centro)
      .input('id_lote', sql.UniqueIdentifier, id_lote)
      .input('fecha_vacunacion', sql.Date, fecha_vacunacion)
      .input('dosis_numero', sql.Int, dosis_numero)
      .input('id_personal', sql.UniqueIdentifier, id_personal)
      .execute('sp_ActualizarHistorialVacunacion');

    res.json({ message: 'Historial actualizado' });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50006) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar historial de vacunación' });
  }
});

/**
 * @swagger
 * /api/vaccination-history/{id}:
 *   delete:
 *     summary: Eliminar un registro de vacunación
 *     tags: [VaccinationHistory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del historial de vacunación
 *     responses:
 *       200:
 *         description: Registro eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Historial eliminado
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Registro no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_historial', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarHistorialVacunacion');

    res.json({ message: 'Historial eliminado' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al eliminar historial de vacunación' });
  }
});

module.exports = router;