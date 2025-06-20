const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, checkRole } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');

const router = express.Router();

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
 *         - nombre_completo
 *         - identificacion
 *         - especialidad
 *         - id_centro
 *       properties:
 *         id_personal:
 *           type: string
 *           format: uuid
 *           description: Identificador único del personal
 *         nombre_completo:
 *           type: string
 *           description: Nombre completo del personal
 *         identificacion:
 *           type: string
 *           description: Identificación del personal
 *         especialidad:
 *           type: string
 *           description: Especialidad del personal
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro
 *         telefono:
 *           type: string
 *           description: Teléfono del personal (opcional)
 *         email:
 *           type: string
 *           description: Email del personal (opcional)
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del personal
 *     HealthStaffInput:
 *       type: object
 *       required:
 *         - nombre_completo
 *         - identificacion
 *         - especialidad
 *         - id_centro
 *       properties:
 *         nombre_completo:
 *           type: string
 *         identificacion:
 *           type: string
 *         especialidad:
 *           type: string
 *         id_centro:
 *           type: string
 *           format: uuid
 *         telefono:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           nullable: true
 */

const validateHealthStaff = [
  body('nombre_completo').notEmpty().isString().withMessage('Nombre completo es requerido'),
  body('identificacion').notEmpty().isString().withMessage('Identificación es requerida'),
  body('especialidad').notEmpty().isString().withMessage('Especialidad es requerida'),
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('telefono').optional().isString(),
  body('email').optional().isEmail().withMessage('Email inválido'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * /api/health-staff:
 *   get:
 *     summary: Listar todo el personal de salud
 *     tags: [HealthStaff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de personal obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/HealthStaff'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', [authenticate, checkRole(['director', 'administrador'])], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Personal_Salud');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/health-staff/{id}:
 *   get:
 *     summary: Obtener un miembro del personal de salud por ID
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
 *     responses:
 *       200:
 *         description: Personal obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStaff'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Personal no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [authenticate, checkRole(['director', 'administrador']), validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_personal', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Personal_Salud WHERE id_personal = @id_personal');
    if (result.recordset.length === 0) {
      const error = new Error('Personal no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/health-staff:
 *   post:
 *     summary: Crear un nuevo miembro del personal de salud
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
 *         description: Error interno del servidor
 */
router.post(
  '/',
  [authenticate, checkRole(['director', 'administrador']), validateHealthStaff],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('nombre_completo', sql.NVarChar, req.body.nombre_completo)
        .input('identificacion', sql.NVarChar, req.body.identificacion)
        .input('especialidad', sql.NVarChar, req.body.especialidad)
        .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
        .input('telefono', sql.NVarChar, req.body.telefono)
        .input('email', sql.NVarChar, req.body.email)
        .query('INSERT INTO Personal_Salud (nombre_completo, identificacion, especialidad, id_centro, telefono, email) VALUES (@nombre_completo, @identificacion, @especialidad, @id_centro, @telefono, @email); SELECT SCOPE_IDENTITY() AS id_personal'); // Nota: No hay stored procedure, usar INSERT directo
      res.status(201).json({ id_personal: result.recordset[0].id_personal });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/health-staff/{id}:
 *   put:
 *     summary: Actualizar un miembro del personal de salud
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HealthStaffInput'
 *     responses:
 *       204:
 *         description: Personal actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Personal no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id',
  [authenticate, checkRole(['director', 'administrador']), validateUUID, validateHealthStaff],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_personal', sql.UniqueIdentifier, req.params.id)
        .input('nombre_completo', sql.NVarChar, req.body.nombre_completo)
        .input('identificacion', sql.NVarChar, req.body.identificacion)
        .input('especialidad', sql.NVarChar, req.body.especialidad)
        .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
        .input('telefono', sql.NVarChar, req.body.telefono)
        .input('email', sql.NVarChar, req.body.email)
        .query('UPDATE Personal_Salud SET nombre_completo = @nombre_completo, identificacion = @identificacion, especialidad = @especialidad, id_centro = @id_centro, telefono = @telefono, email = @email WHERE id_personal = @id_personal'); // Nota: No hay stored procedure, usar UPDATE directo
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/health-staff/{id}:
 *   delete:
 *     summary: Eliminar un miembro del personal de salud
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
 *     responses:
 *       204:
 *         description: Personal eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Personal no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete(
  '/:id',
  [authenticate, checkRole(['director', 'administrador']), validateUUID],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_personal', sql.UniqueIdentifier, req.params.id)
        .query('DELETE FROM Personal_Salud WHERE id_personal = @id_personal'); // Nota: No hay stored procedure, usar DELETE directo
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;