const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: Vaccines
 *   description: Gestión de vacunas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Vaccine:
 *       type: object
 *       required:
 *         - nombre
 *         - fabricante
 *         - tipo
 *         - dosis_requeridas
 *       properties:
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la vacuna
 *         nombre:
 *           type: string
 *           description: Nombre de la vacuna
 *         fabricante:
 *           type: string
 *           description: Fabricante de la vacuna
 *         tipo:
 *           type: string
 *           description: Tipo de vacuna
 *         dosis_requeridas:
 *           type: integer
 *           description: Número de dosis requeridas
 *       example:
 *         id_vacuna: "123e4567-e89b-12d3-a456-426614174003"
 *         nombre: "Pfizer-BioNTech"
 *         fabricante: "Pfizer"
 *         tipo: "ARNm"
 *         dosis_requeridas: 2
 *     VaccineInput:
 *       type: object
 *       required:
 *         - nombre
 *         - fabricante
 *         - tipo
 *         - dosis_requeridas
 *       properties:
 *         nombre:
 *           type: string
 *         fabricante:
 *           type: string
 *         tipo:
 *           type: string
 *         dosis_requeridas:
 *           type: integer
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateVaccine = [
  body('nombre').notEmpty().isString().withMessage('Nombre es requerido'),
  body('fabricante').notEmpty().isString().withMessage('Fabricante es requerido'),
  body('tipo').notEmpty().isString().withMessage('Tipo es requerido'),
  body('dosis_requeridas').isInt({ min: 1 }).withMessage('Dosis requeridas debe ser un entero positivo'),
];

/**
 * @swagger
 * /api/vaccines:
 *   get:
 *     summary: Obtener todas las vacunas
 *     tags: [Vaccines]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de vacunas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Vaccine'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_vacuna, nombre, fabricante, tipo, dosis_requeridas
      FROM Vacunas
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener vacunas' });
  }
});

/**
 * @swagger
 * /api/vaccines:
 *   post:
 *     summary: Crear una nueva vacuna
 *     tags: [Vaccines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccineInput'
 *     responses:
 *       201:
 *         description: Vacuna creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_vacuna:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, validateVaccine, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre, fabricante, tipo, dosis_requeridas } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('nombre', sql.NVarChar, nombre)
      .input('fabricante', sql.NVarChar, fabricante)
      .input('tipo', sql.NVarChar, tipo)
      .input('dosis_requeridas', sql.Int, dosis_requeridas)
      .execute('sp_CrearVacuna');

    res.status(201).json({ id_vacuna: result.recordset[0].id_vacuna });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear vacuna' });
  }
});

/**
 * @swagger
 * /api/vaccines/{id}:
 *   get:
 *     summary: Obtener una vacuna por ID
 *     tags: [Vaccines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la vacuna
 *     responses:
 *       200:
 *         description: Vacuna encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vaccine'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Vacuna no encontrada
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_vacuna', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerVacuna');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Vacuna no encontrada' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener vacuna' });
  }
});

/**
 * @swagger
 * /api/vaccines/{id}:
 *   put:
 *     summary: Actualizar una vacuna
 *     tags: [Vaccines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la vacuna
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccineInput'
 *     responses:
 *       200:
 *         description: Vacuna actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Vacuna actualizada
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Vacuna no encontrada
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, validateUUID, validateVaccine, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre, fabricante, tipo, dosis_requeridas } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_vacuna', sql.UniqueIdentifier, req.params.id)
      .input('nombre', sql.NVarChar, nombre)
      .input('fabricante', sql.NVarChar, fabricante)
      .input('tipo', sql.NVarChar, tipo)
      .input('dosis_requeridas', sql.Int, dosis_requeridas)
      .execute('sp_ActualizarVacuna');

    res.json({ message: 'Vacuna actualizada' });
  } catch (err) {
    if (err.number === 50001 || err.number === 50002) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar vacuna' });
  }
});

/**
 * @swagger
 * /api/vaccines/{id}:
 *   delete:
 *     summary: Eliminar una vacuna
 *     tags: [Vaccines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la vacuna
 *     responses:
 *       200:
 *         description: Vacuna eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Vacuna eliminada
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Vacuna no encontrada
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_vacuna', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarVacuna');

    res.json({ message: 'Vacuna eliminada' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al eliminar vacuna' });
  }
});

module.exports = router;