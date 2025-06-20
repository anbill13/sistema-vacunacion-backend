const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: Guardians
 *   description: Gestión de tutores legales de los niños
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Guardian:
 *       type: object
 *       required:
 *         - id_niño
 *         - nombre
 *         - relacion
 *         - nacionalidad
 *       properties:
 *         id_tutor:
 *           type: string
 *           format: uuid
 *           description: Identificador único del tutor
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: ID del niño asociado
 *         nombre:
 *           type: string
 *           description: Nombre del tutor
 *         relacion:
 *           type: string
 *           enum: [Madre, Padre, Tutor Legal]
 *           description: Relación con el niño
 *         nacionalidad:
 *           type: string
 *           enum: [Dominicano, Extranjero]
 *           description: Nacionalidad del tutor
 *         identificacion:
 *           type: string
 *           nullable: true
 *           description: Identificación del tutor
 *         telefono:
 *           type: string
 *           nullable: true
 *           description: Teléfono del tutor
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *           description: Correo electrónico del tutor
 *         direccion:
 *           type: string
 *           nullable: true
 *           description: Dirección del tutor
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del registro
 *       example:
 *         id_tutor: "123e4567-e89b-12d3-a456-426614174001"
 *         id_niño: "123e4567-e89b-12d3-a456-426614174000"
 *         nombre: "María López"
 *         relacion: "Madre"
 *         nacionalidad: "Dominicano"
 *         estado: "Activo"
 *     GuardianInput:
 *       type: object
 *       required:
 *         - id_niño
 *         - nombre
 *         - relacion
 *         - nacionalidad
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *         nombre:
 *           type: string
 *         relacion:
 *           type: string
 *           enum: [Madre, Padre, Tutor Legal]
 *         nacionalidad:
 *           type: string
 *           enum: [Dominicano, Extranjero]
 *         identificacion:
 *           type: string
 *           nullable: true
 *         telefono:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         direccion:
 *           type: string
 *           nullable: true
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateGuardian = [
  body('id_niño').isUUID().withMessage('ID de niño inválido'),
  body('nombre').notEmpty().isString().withMessage('Nombre es requerido'),
  body('relacion').isIn(['Madre', 'Padre', 'Tutor Legal']).withMessage('Relación inválida'),
  body('nacionalidad').isIn(['Dominicano', 'Extranjero']).withMessage('Nacionalidad inválida'),
  body('identificacion').optional().isString(),
  body('telefono').optional().isString(),
  body('email').optional().isEmail(),
  body('direccion').optional().isString(),
];

/**
 * @swagger
 * /api/guardians:
 *   get:
 *     summary: Obtener todos los tutores activos
 *     tags: [Guardians]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tutores activos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Guardian'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_tutor, id_niño, nombre, relacion, nacionalidad, identificacion, telefono, email, direccion, estado
      FROM Tutores WHERE estado = 'Activo'
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tutores' });
  }
});

/**
 * @swagger
 * /api/guardians:
 *   post:
 *     summary: Crear un nuevo tutor
 *     tags: [Guardians]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GuardianInput'
 *     responses:
 *       201:
 *         description: Tutor creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_tutor:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados o límite de tutores principales alcanzado
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, validateGuardian, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_niño, nombre, relacion, nacionalidad, identificacion, telefono, email, direccion } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_niño', sql.UniqueIdentifier, id_niño)
      .input('nombre', sql.NVarChar, nombre)
      .input('relacion', sql.NVarChar, relacion)
      .input('nacionalidad', sql.NVarChar, nacionalidad)
      .input('identificacion', sql.NVarChar, identificacion)
      .input('telefono', sql.NVarChar, telefono)
      .input('email', sql.NVarChar, email)
      .input('direccion', sql.NVarChar, direccion)
      .execute('sp_CrearTutor');

    res.status(201).json({ id_tutor: result.recordset[0].id_tutor });
  } catch (err) {
    if (err.number === 50001 || err.number === 50002) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear tutor' });
  }
});

/**
 * @swagger
 * /api/guardians/{id}:
 *   get:
 *     summary: Obtener un tutor por ID
 *     tags: [Guardians]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del tutor
 *     responses:
 *       200:
 *         description: Tutor encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Guardian'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Tutor no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_tutor', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerTutor');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Tutor no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tutor' });
  }
});

/**
 * @swagger
 * /api/guardians/{id}:
 *   put:
 *     summary: Actualizar un tutor
 *     tags: [Guardians]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del tutor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GuardianInput'
 *     responses:
 *       200:
 *         description: Tutor actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tutor actualizado
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Tutor no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, validateUUID, validateGuardian, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id_niño, nombre, relacion, nacionalidad, identificacion, telefono, email, direccion } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_tutor', sql.UniqueIdentifier, req.params.id)
      .input('id_niño', sql.UniqueIdentifier, id_niño)
      .input('nombre', sql.NVarChar, nombre)
      .input('relacion', sql.NVarChar, relacion)
      .input('nacionalidad', sql.NVarChar, nacionalidad)
      .input('identificacion', sql.NVarChar, identificacion)
      .input('telefono', sql.NVarChar, telefono)
      .input('email', sql.NVarChar, email)
      .input('direccion', sql.NVarChar, direccion)
      .execute('sp_ActualizarTutor');

    res.json({ message: 'Tutor actualizado' });
  } catch (err) {
    if (err.number === 50001 || err.number === 50002) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar tutor' });
  }
});

/**
 * @swagger
 * /api/guardians/{id}:
 *   delete:
 *     summary: Desactivar un tutor
 *     tags: [Guardians]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del tutor
 *     responses:
 *       200:
 *         description: Tutor desactivado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tutor desactivado
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Tutor no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_tutor', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarTutor');

    res.json({ message: 'Tutor desactivado' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al desactivar tutor' });
  }
});

module.exports = router;