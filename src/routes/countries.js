const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate, checkRole } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: Countries
 *   description: Gestión de países
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Country:
 *       type: object
 *       required:
 *         - nombre_pais
 *       properties:
 *         id_pais:
 *           type: string
 *           format: uuid
 *           description: Identificador único del país
 *         nombre_pais:
 *           type: string
 *           description: Nombre del país
 *         codigo_iso:
 *           type: string
 *           description: Código ISO del país (opcional)
 *       example:
 *         id_pais: "123e4567-e89b-12d3-a456-426614174017"
 *         nombre_pais: "República Dominicana"
 *         codigo_iso: "DO"
 *     CountryInput:
 *       type: object
 *       required:
 *         - nombre_pais
 *       properties:
 *         nombre_pais:
 *           type: string
 *         codigo_iso:
 *           type: string
 *           nullable: true
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateCountry = [
  body('nombre_pais').notEmpty().isString().withMessage('Nombre del país es requerido'),
  body('codigo_iso').optional().isString().isLength({ min: 2, max: 3 }).withMessage('Código ISO debe tener 2 o 3 caracteres'),
];

/**
 * @swagger
 * /api/countries:
 *   get:
 *     summary: Obtener todos los países
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de países
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Country'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_pais, nombre_pais, codigo_iso
      FROM Paises
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener países' });
  }
});

/**
 * @swagger
 * /api/countries:
 *   post:
 *     summary: Crear un nuevo país
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CountryInput'
 *     responses:
 *       201:
 *         description: País creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_pais:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, checkRole(['administrador']), validateCountry, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre_pais, codigo_iso } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('nombre_pais', sql.NVarChar, nombre_pais)
      .input('codigo_iso', sql.NVarChar, codigo_iso)
      .execute('sp_CrearPais');

    res.status(201).json({ id_pais: result.recordset[0].id_pais });
  } catch (err) {
    if (err.number === 50001 || err.number === 50002) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear país' });
  }
});

/**
 * @swagger
 * /api/countries/{id}:
 *   get:
 *     summary: Obtener un país por ID
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del país
 *     responses:
 *       200:
 *         description: País encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Country'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: País no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_pais', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerPais');

    if (!result.recordset[0]) return res.status(404).json({ error: 'País no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener país' });
  }
});

/**
 * @swagger
 * /api/countries/{id}:
 *   put:
 *     summary: Actualizar un país
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del país
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CountryInput'
 *     responses:
 *       200:
 *         description: País actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: País actualizado
 *       400:
 *         description: Error en los datos enviados
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       404:
 *         description: País no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, checkRole(['administrador']), validateUUID, validateCountry, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre_pais, codigo_iso } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_pais', sql.UniqueIdentifier, req.params.id)
      .input('nombre_pais', sql.NVarChar, nombre_pais)
      .input('codigo_iso', sql.NVarChar, codigo_iso)
      .execute('sp_ActualizarPais');

    res.json({ message: 'País actualizado' });
  } catch (err) {
    if (err.number === 50001 || err.number === 50002 || err.number === 50003) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar país' });
  }
});

/**
 * @swagger
 * /api/countries/{id}:
 *   delete:
 *     summary: Eliminar un país
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del país
 *     responses:
 *       200:
 *         description: País eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: País eliminado
 *       400:
 *         description: ID inválido
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       404:
 *         description: País no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, checkRole(['administrador']), validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_pais', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarPais');

    res.json({ message: 'País eliminado' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al eliminar país' });
  }
});

module.exports = router;