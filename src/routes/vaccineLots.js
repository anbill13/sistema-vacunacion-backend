const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: VaccineLots
 *   description: Gestión de lotes de vacunas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     VaccineLot:
 *       type: object
 *       required:
 *         - id_vacuna
 *         - numero_lote
 *         - fecha_fabricacion
 *         - fecha_expiracion
 *         - cantidad
 *       properties:
 *         id_lote:
 *           type: string
 *           format: uuid
 *           description: Identificador único del lote
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *           description: ID de la vacuna
 *         numero_lote:
 *           type: string
 *           description: Número del lote
 *         fecha_fabricacion:
 *           type: string
 *           format: date
 *           description: Fecha de fabricación
 *         fecha_expiracion:
 *           type: string
 *           format: date
 *           description: Fecha de expiración
 *         cantidad:
 *           type: integer
 *           description: Cantidad de vacunas en el lote
 *       example:
 *         id_lote: "123e4567-e89b-12d3-a456-426614174014"
 *         id_vacuna: "123e4567-e89b-12d3-a456-426614174003"
 *         numero_lote: "LOT12345"
 *         fecha_fabricacion: "2025-01-01"
 *         fecha_expiracion: "2026-01-01"
 *         cantidad: 1000
 *     VaccineLotInput:
 *       type: object
 *       required:
 *         - id_vacuna
 *         - numero_lote
 *         - fecha_fabricacion
 *         - fecha_expiracion
 *         - cantidad
 *       properties:
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *         numero_lote:
 *           type: string
 *         fecha_fabricacion:
 *           type: string
 *           format: date
 *         fecha_expiracion:
 *           type: string
 *           format: date
 *         cantidad:
 *           type: integer
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateVaccineLot = [
  body('id_vacuna').isUUID().withMessage('ID de vacuna inválido'),
  body('numero_lote').notEmpty().isString().withMessage('Número de lote es requerido'),
  body('fecha_fabricacion').isDate().withMessage('Fecha de fabricación inválida'),
  body('fecha_expiracion').isDate().withMessage('Fecha de expiración inválida'),
  body('cantidad').isInt({ min: 1 }).withMessage('Cantidad debe ser un entero positivo'),
];

/**
 * @swagger
 * /api/vaccine-lots:
 *   get:
 *     summary: Obtener todos los lotes de vacunas
 *     tags: [VaccineLots]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de lotes de vacunas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VaccineLot'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_lote, id_vacuna, numero_lote, fecha_fabricacion, fecha_expiracion, cantidad
      FROM Lotes_Vacunas
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener lotes de vacunas' });
  }
});

/**
 * @swagger
 * /api/vaccine-lots:
 *   post:
 *     summary: Crear un nuevo lote de vacunas
 *     tags: [VaccineLots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccineLotInput'
 *     responses:
 *       201:
 *         description: Lote creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_lote:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, validateVaccineLot, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_vacuna, numero_lote, fecha_fabricacion, fecha_expiracion, cantidad } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
      .input('numero_lote', sql.NVarChar, numero_lote)
      .input('fecha_fabricacion', sql.Date, fecha_fabricacion)
      .input('fecha_expiracion', sql.Date, fecha_expiracion)
      .input('cantidad', sql.Int, cantidad)
      .execute('sp_CrearLoteVacuna');

    res.status(201).json({ id_lote: result.recordset[0].id_lote });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50003) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear lote de vacunas' });
  }
});

/**
 * @swagger
 * /api/vaccine-lots/{id}:
 *   get:
 *     summary: Obtener un lote de vacunas por ID
 *     tags: [VaccineLots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del lote de vacunas
 *     responses:
 *       200:
 *         description: Lote encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VaccineLot'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Lote no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_lote', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerLoteVacuna');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Lote no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener lote de vacunas' });
  }
});

/**
 * @swagger
 * /api/vaccine-lots/{id}:
 *   put:
 *     summary: Actualizar un lote de vacunas
 *     tags: [VaccineLots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del lote de vacunas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccineLotInput'
 *     responses:
 *       200:
 *         description: Lote actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lote actualizado
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Lote no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, validateUUID, validateVaccineLot, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_vacuna, numero_lote, fecha_fabricacion, fecha_expiracion, cantidad } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_lote', sql.UniqueIdentifier, req.params.id)
      .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
      .input('numero_lote', sql.NVarChar, numero_lote)
      .input('fecha_fabricacion', sql.Date, fecha_fabricacion)
      .input('fecha_expiracion', sql.Date, fecha_expiracion)
      .input('cantidad', sql.Int, cantidad)
      .execute('sp_ActualizarLoteVacuna');

    res.json({ message: 'Lote actualizado' });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50004) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar lote de vacunas' });
  }
});

/**
 * @swagger
 * /api/vaccine-lots/{id}:
 *   delete:
 *     summary: Eliminar un lote de vacunas
 *     tags: [VaccineLots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del lote de vacunas
 *     responses:
 *       200:
 *         description: Lote eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lote eliminado
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Lote no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_lote', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarLoteVacuna');

    res.json({ message: 'Lote eliminado' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al eliminar lote de vacunas' });
  }
});

module.exports = router;