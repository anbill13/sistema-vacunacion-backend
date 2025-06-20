const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: HealthStaff
 *   description: Gestión de personal de salud
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     HealthStaff:
 *       type: object
 *       required:
 *         - nombre
 *         - cedula
 *         - id_centro
 *       properties:
 *         id_personal:
 *           type: string
 *           format: uuid
 *           description: Identificador único del personal
 *         nombre:
 *           type: string
 *           description: Nombre del personal
 *         cedula:
 *           type: string
 *           description: Cédula del personal
 *         telefono:
 *           type: string
 *           description: Teléfono del personal (opcional)
 *         email:
 *           type: string
 *           format: email
 *           description: Email del personal (opcional)
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro asociado
 *         especialidad:
 *           type: string
 *           description: Especialidad del personal (opcional)
 *       example:
 *         id_personal: "123e4567-e89b-12d3-a456-426614174006"
 *         nombre: "Dr. Ana López"
 *         cedula: "12345678901"
 *         telefono: "809-555-1234"
 *         email: "ana.lopez@example.com"
 *         id_centro: "123e4567-e89b-12d3-a456-426614174002"
 *         especialidad: "Pediatría"
 *     HealthStaffInput:
 *       type: object
 *       required:
 *         - nombre
 *         - cedula
 *         - id_centro
 *       properties:
 *         nombre:
 *           type: string
 *         cedula:
 *           type: string
 *         telefono:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         id_centro:
 *           type: string
 *           format: uuid
 *         especialidad:
 *           type: string
 *           nullable: true
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateHealthStaff = [
  body('nombre').notEmpty().isString().withMessage('Nombre es requerido'),
  body('cedula').notEmpty().isString().withMessage('Cédula es requerida'),
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('telefono').optional().isString(),
  body('email').optional().isEmail(),
  body('especialidad').optional().isString(),
];

/**
 * @swagger
 * /api/health-staff:
 *   get:
 *     summary: Obtener todo el personal de salud
 *     tags: [HealthStaff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de personal de salud
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/HealthStaff'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_personal, nombre, cedula, telefono, email, id_centro, especialidad
      FROM Personal_Salud
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener personal de salud' });
  }
});

/**
 * @swagger
 * /api/health-staff:
 *   post:
 *     summary: Crear un nuevo personal de salud
 *     tags: [HealthStaff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HealthStaffInput'
 *     responses:
 *       201:
 *         description: Personal creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_personal:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, validateHealthStaff, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre, cedula, telefono, email, id_centro, especialidad } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('nombre', sql.NVarChar, nombre)
      .input('cedula', sql.NVarChar, cedula)
      .input('telefono', sql.NVarChar, telefono)
      .input('email', sql.NVarChar, email)
      .input('id_centro', sql.UniqueIdentifier, id_centro)
      .input('especialidad', sql.NVarChar, especialidad)
      .execute('sp_CrearPersonalSalud');

    res.status(201).json({ id_personal: result.recordset[0].id_personal });
  } catch (err) {
    if (err.number === 50001 || err.number === 50002) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear personal de salud' });
  }
});

/**
 * @swagger
 * /api/health-staff/{id}:
 *   get:
 *     summary: Obtener personal de salud por ID
 *     tags: [HealthStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del personal
 *     responses:
 *       200:
 *         description: Personal encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStaff'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Personal no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_personal', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerPersonalSalud');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Personal no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener personal de salud' });
  }
});

/**
 * @swagger
 * /api/health-staff/{id}:
 *   put:
 *     summary: Actualizar personal de salud
 *     tags: [HealthStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del personal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HealthStaffInput'
 *     responses:
 *       200:
 *         description: Personal actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Personal actualizado
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Personal no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, validateUUID, validateHealthStaff, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre, cedula, telefono, email, id_centro, especialidad } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_personal', sql.UniqueIdentifier, req.params.id)
      .input('nombre', sql.NVarChar, nombre)
      .input('cedula', sql.NVarChar, cedula)
      .input('telefono', sql.NVarChar, telefono)
      .input('email', sql.NVarChar, email)
      .input('id_centro', sql.UniqueIdentifier, id_centro)
      .input('especialidad', sql.NVarChar, especialidad)
      .execute('sp_ActualizarPersonalSalud');

    res.json({ message: 'Personal actualizado' });
  } catch (err) {
    if (err.number === 50001 || err.number === 50002 || err.number === 50003) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar personal de salud' });
  }
});

/**
 * @swagger
 * /api/health-staff/{id}:
 *   delete:
 *     summary: Eliminar personal de salud
 *     tags: [HealthStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del personal
 *     responses:
 *       200:
 *         description: Personal eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Personal eliminado
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Personal no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_personal', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarPersonalSalud');

    res.json({ message: 'Personal eliminado' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al eliminar personal de salud' });
  }
});

module.exports = router;