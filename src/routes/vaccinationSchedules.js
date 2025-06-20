const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate, checkRole } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: VaccinationSchedules
 *   description: Gestión de esquemas de vacunación
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     VaccinationSchedule:
 *       type: object
 *       required:
 *         - id_vacuna
 *         - edad_meses
 *         - dosis_numero
 *       properties:
 *         id_calendario:
 *           type: string
 *           format: uuid
 *           description: Identificador único del esquema de vacunación
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
 *           description: Descripción del esquema (opcional)
 *       example:
 *         id_calendario: "123e4567-e89b-12d3-a456-426614174015"
 *         id_vacuna: "123e4567-e89b-12d3-a456-426614174003"
 *         edad_meses: 2
 *         dosis_numero: 1
 *         descripcion: "Primera dosis de BCG"
 *     VaccinationScheduleInput:
 *       type: object
 *       required:
 *         - id_vacuna
 *         - edad_meses
 *         - dosis_numero
 *       properties:
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
const validateVaccinationSchedule = [
  body('id_vacuna').isUUID().withMessage('ID de vacuna inválido'),
  body('edad_meses').isInt({ min: 0 }).withMessage('Edad en meses debe ser un entero no negativo'),
  body('dosis_numero').isInt({ min: 1 }).withMessage('Número de dosis debe ser un entero positivo'),
  body('descripcion').optional().isString(),
];

/**
 * @swagger
 * /api/vaccination-schedules:
 *   get:
 *     summary: Obtener todos los esquemas de vacunación
 *     tags: [VaccinationSchedules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de esquemas de vacunación
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VaccinationSchedule'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_calendario, id_vacuna, edad_meses, dosis_numero, descripcion
      FROM Esquema_Vacunacion
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener esquemas de vacunación' });
  }
});

/**
 * @swagger
 * /api/vaccination-schedules:
 *   post:
 *     summary: Crear un nuevo esquema de vacunación
 *     tags: [VaccinationSchedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccinationScheduleInput'
 *     responses:
 *       201:
 *         description: Esquema creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_calendario:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, checkRole(['administrador']), validateVaccinationSchedule, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_vacuna, edad_meses, dosis_numero, descripcion } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
      .input('edad_meses', sql.Int, edad_meses)
      .input('dosis_numero', sql.Int, dosis_numero)
      .input('descripcion', sql.NVarChar, descripcion)
      .execute('sp_CrearEsquemaVacunacion');

    res.status(201).json({ id_calendario: result.recordset[0].id_calendario });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50003) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear esquema de vacunación' });
  }
});

/**
 * @swagger
 * /api/vaccination-schedules/{id}:
 *   get:
 *     summary: Obtener un esquema de vacunación por ID
 *     tags: [VaccinationSchedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del esquema de vacunación
 *     responses:
 *       200:
 *         description: Esquema encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VaccinationSchedule'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Esquema no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_calendario', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerEsquemaVacunacion');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Esquema no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener esquema de vacunación' });
  }
});

/**
 * @swagger
 * /api/vaccination-schedules/{id}:
 *   put:
 *     summary: Actualizar un esquema de vacunación
 *     tags: [VaccinationSchedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del esquema de vacunación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccinationScheduleInput'
 *     responses:
 *       200:
 *         description: Esquema actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Esquema actualizado
 *       400:
 *         description: Error en los datos enviados
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       404:
 *         description: Esquema no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, checkRole(['administrador']), validateUUID, validateVaccinationSchedule, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_vacuna, edad_meses, dosis_numero, descripcion } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_calendario', sql.UniqueIdentifier, req.params.id)
      .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
      .input('edad_meses', sql.Int, edad_meses)
      .input('dosis_numero', sql.Int, dosis_numero)
      .input('descripcion', sql.NVarChar, descripcion)
      .execute('sp_ActualizarEsquemaVacunacion');

    res.json({ message: 'Esquema actualizado' });
  } catch (err) {
    if (err.number >= 50001 && err.number <= 50004) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar esquema de vacunación' });
  }
});

/**
 * @swagger
 * /api/vaccination-schedules/{id}:
 *   delete:
 *     summary: Eliminar un esquema de vacunación
 *     tags: [VaccinationSchedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del esquema de vacunación
 *     responses:
 *       200:
 *         description: Esquema eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Esquema eliminado
 *       400:
 *         description: ID inválido
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       404:
 *         description: Esquema no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, checkRole(['administrador']), validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_calendario', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarEsquemaVacunacion');

    res.json({ message: 'Esquema eliminado' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al eliminar esquema de vacunación' });
  }
});

module.exports = router;