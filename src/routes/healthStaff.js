const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { poolPromise, sql } = require('../config/db');
const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.data = errors.array();
    return next(error);
  }
  next();
};

/**
 * @swagger
 * tags:
 *   name: Health Staff
 *   description: Gestión de personal de salud
 */

/**
 * @swagger
 * /api/health-staff:
 *   post:
 *     summary: Crea un nuevo miembro del personal de salud
 *     tags: [Health Staff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Ana Rodríguez"
 *               cedula:
 *                 type: string
 *                 example: "001-9876543-2"
 *               telefono:
 *                 type: string
 *                 example: "8095551234"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "ana@example.com"
 *               id_centro:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               especialidad:
 *                 type: string
 *                 example: "Enfermería"
 *     responses:
 *       201:
 *         description: Personal de salud creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Health staff created"
 *                 id_personal:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440009"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('nombre').isString().trim().notEmpty().withMessage('nombre is required'),
    body('cedula').isString().trim().notEmpty().withMessage('cedula is required'),
    body('telefono').optional().isString().trim().withMessage('Invalid telefono'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('id_centro').isUUID().withMessage('Invalid UUID for id_centro'),
    body('especialidad').optional().isString().trim().withMessage('Invalid especialidad'),
  ],
  validate,
  async (req, res, next) => {
    const { nombre, cedula, telefono, email, id_centro, especialidad } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('nombre', sql.NVarChar, nombre)
        .input('cedula', sql.NVarChar, cedula)
        .input('telefono', sql.NVarChar, telefono || null)
        .input('email', sql.NVarChar, email || null)
        .input('id_centro', sql.UniqueIdentifier, id_centro)
        .input('especialidad', sql.NVarChar, especialidad || null)
        .execute('sp_CrearPersonalSalud');

      res.status(201).json({ message: 'Health staff created', id_personal: result.recordset[0].id_personal });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/health-staff/{id}:
 *   get:
 *     summary: Obtiene un miembro del personal de salud por ID
 *     tags: [Health Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440009"
 *     responses:
 *       200:
 *         description: Personal de salud encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_personal:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440009"
 *                 nombre:
 *                   type: string
 *                   example: "Ana Rodríguez"
 *                 cedula:
 *                   type: string
 *                   example: "001-9876543-2"
 *                 telefono:
 *                   type: string
 *                   example: "8095551234"
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: "ana@example.com"
 *                 id_centro:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440001"
 *                 especialidad:
 *                   type: string
 *                   example: "Enfermería"
 *       404:
 *         description: Personal de salud no encontrado
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid UUID')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_personal', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerPersonalSalud');

      if (result.recordset.length === 0) {
        const error = new Error('Health staff not found');
        error.statusCode = 404;
        throw error;
      }
      res.json(result.recordset[0]);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/health-staff/{id}:
 *   put:
 *     summary: Actualiza un miembro del personal de salud
 *     tags: [Health Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440009"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Ana Rodríguez Actualizada"
 *               cedula:
 *                 type: string
 *                 example: "001-9876543-2"
 *               telefono:
 *                 type: string
 *                 example: "8095551234"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "ana@example.com"
 *               id_centro:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               especialidad:
 *                 type: string
 *                 example: "Enfermería"
 *     responses:
 *       200:
 *         description: Personal de salud actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Health staff updated"
 *       400:
 *         description: Validación fallida
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid UUID'),
    body('nombre').isString().trim().notEmpty().withMessage('nombre is required'),
    body('cedula').isString().trim().notEmpty().withMessage('cedula is required'),
    body('telefono').optional().isString().trim().withMessage('Invalid telefono'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('id_centro').isUUID().withMessage('Invalid UUID for id_centro'),
    body('especialidad').optional().isString().trim().withMessage('Invalid especialidad'),
  ],
  validate,
  async (req, res, next) => {
    const { nombre, cedula, telefono, email, id_centro, especialidad } = req.body;

    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_personal', sql.UniqueIdentifier, req.params.id)
        .input('nombre', sql.NVarChar, nombre)
        .input('cedula', sql.NVarChar, cedula)
        .input('telefono', sql.NVarChar, telefono || null)
        .input('email', sql.NVarChar, email || null)
        .input('id_centro', sql.UniqueIdentifier, id_centro)
        .input('especialidad', sql.NVarChar, especialidad || null)
        .execute('sp_ActualizarPersonalSalud');

      res.json({ message: 'Health staff updated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/health-staff/{id}:
 *   delete:
 *     summary: Elimina un miembro del personal de salud
 *     tags: [Health Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440009"
 *     responses:
 *       200:
 *         description: Personal de salud eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Health staff deleted"
 *       400:
 *         description: Validación fallida
 */
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid UUID')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_personal', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarPersonalSalud');

      res.json({ message: 'Health staff deleted' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;