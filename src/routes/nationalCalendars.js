const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: NationalCalendars
 *   description: Gestión de calendarios nacionales de vacunación
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     NationalCalendar:
 *       type: object
 *       required:
 *         - id_pais
 *         - id_vacuna
 *         - edad_meses
 *         - dosis_numero
 *       properties:
 *         id_calendario_nacional:
 *           type: string
 *           format: uuid
 *           description: Identificador único del calendario nacional
 *         id_pais:
 *           type: string
 *           format: uuid
 *           description: ID del país
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *           description: ID de la vacuna
 *         edad_meses:
 *           type: integer
 *           description: Edad en meses para la aplicación de la dosis
 *         dosis_numero:
 *           type: integer
 *           description: Número de la dosis
 *         descripcion:
 *           type: string
 *           description: Descripción del calendario (opcional)
 *       example:
 *         id_calendario_nacional: "123e4567-e89b-12d3-a456-426614174016"
 *         id_pais: "123e4567-e89b-12d3-a456-426614174017"
 *         id_vacuna: "123e4567-e89b-12d3-a456-426614174003"
 *         edad_meses: 6
 *         dosis_numero: 2
 *         descripcion: "Segunda dosis de DTP"
 *     NationalCalendarInput:
 *       type: object
 *       required:
 *         - id_pais
 *         - id_vacuna
 *         - edad_meses
 *         - dosis_numero
 *       properties:
 *         id_pais:
 *           type: string
 *           format: uuid
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *         edad_meses:
 *           type: integer
 *         dosis_numero:
 *           type: integer
 *         descripcion:
 *           type: string
 *           nullable: true
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateNationalCalendar = [
  body('id_pais').isUUID().withMessage('ID de país inválido'),
  body('id_vacuna').isUUID().withMessage('ID de vacuna inválido'),
  body('edad_meses').isInt({ min: 0 }).withMessage('Edad en meses debe ser un entero no negativo'),
  body('dosis_numero').isInt({ min: 1 }).withMessage('Número de dosis debe ser un entero positivo'),
  body('descripcion').optional().isString(),
];

/**
 * @swagger
 * /api/national-calendars:
 *   get:
 *     summary: Obtener todos los calendarios nacionales
 *     tags: [NationalCalendars]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de calendarios nacionales
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NationalCalendar'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_calendario_nacional, id_pais, id_vacuna, edad_meses, dosis_numero, descripcion
      FROM Calendario_Nacional
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener calendarios nacionales' });
  }
});

/**
 * @swagger
 * /api/national-calendars:
 *   post:
 *     summary: Crear un nuevo calendario nacional
 *     tags: [NationalCalendars]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NationalCalendarInput'
 *     responses:
 *       201:
 *         description: Calendario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_calendario_nacional:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, validateNationalCalendar, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_pais, id_vacuna, edad_meses, dosis_numero, descripcion } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_pais', sql.UniqueIdentifier, id_pais)
      .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
      .input('edad_meses', sql.Int, edad_meses)
      .input('dosis_numero', sql.Int, dosis_numero)
      .input('descripcion', sql.NVarChar, descripcion)
      .execute('sp_CrearCalendarioNacional');

    res.status(201).json({ id_calendario_nacional: result.recordset[0].id_calendario_nacional });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50003) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear calendario nacional' });
  }
});

/**
 * @swagger
 * /api/national-calendars/{id}:
 *   get:
 *     summary: Obtener un calendario nacional por ID
 *     tags: [NationalCalendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del calendario nacional
 *     responses:
 *       200:
 *         description: Calendario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NationalCalendar'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Calendario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_calendario_nacional', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerCalendarioNacional');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Calendario no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener calendario nacional' });
  }
});

/**
 * @swagger
 * /api/national-calendars/{id}:
 *   put:
 *     summary: Actualizar un calendario nacional
 *     tags: [NationalCalendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del calendario nacional
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NationalCalendarInput'
 *     responses:
 *       200:
 *         description: Calendario actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Calendario actualizado
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Calendario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, validateUUID, validateNationalCalendar, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_pais, id_vacuna, edad_meses, dosis_numero, descripcion } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_calendario_nacional', sql.UniqueIdentifier, req.params.id)
      .input('id_pais', sql.UniqueIdentifier, id_pais)
      .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
      .input('edad_meses', sql.Int, edad_meses)
      .input('dosis_numero', sql.Int, dosis_numero)
      .input('descripcion', sql.NVarChar, descripcion)
      .execute('sp_ActualizarCalendarioNacional');

    res.json({ message: 'Calendario actualizado' });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50004) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar calendario nacional' });
  }
});

/**
 * @swagger
 * /api/national-calendars/{id}:
 *   delete:
 *     summary: Eliminar un calendario nacional
 *     tags: [NationalCalendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del calendario nacional
 *     responses:
 *       200:
 *         description: Calendario eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Calendario eliminado
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Calendario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_calendario_nacional', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarCalendarioNacional');

    res.json({ message: 'Calendario eliminado' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al eliminar calendario nacional' });
  }
});

module.exports = router;