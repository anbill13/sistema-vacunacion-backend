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
 *   name: Supplies
 *   description: Gestión de suministros
 */

/**
 * @swagger
 * /api/supplies:
 *   post:
 *     summary: Crea un nuevo suministro
 *     tags: [Supplies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_suministro:
 *                 type: string
 *                 example: "Jeringas desechables"
 *               tipo_suministro:
 *                 type: string
 *                 example: "Material médico"
 *               cantidad_total:
 *                 type: integer
 *                 example: 1000
 *               cantidad_disponible:
 *                 type: integer
 *                 example: 800
 *               id_centro:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               fecha_entrada:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-01"
 *               fecha_vencimiento:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-01"
 *               proveedor:
 *                 type: string
 *                 example: "Proveedor XYZ"
 *               condiciones_almacenamiento:
 *                 type: string
 *                 example: "2-8°C"
 *     responses:
 *       201:
 *         description: Suministro creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Supply created"
 *                 id_suministro:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440010"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('nombre_suministro').isString().trim().notEmpty().withMessage('nombre_suministro is required'),
    body('tipo_suministro').optional().isString().trim().withMessage('Invalid tipo_suministro'),
    body('cantidad_total').isInt({ min: 0 }).withMessage('Invalid cantidad_total'),
    body('cantidad_disponible').isInt({ min: 0 }).withMessage('Invalid cantidad_disponible'),
    body('id_centro').isUUID().withMessage('Invalid UUID for id_centro'),
    body('fecha_entrada').isDate().withMessage('Invalid fecha_entrada'),
    body('fecha_vencimiento').optional().isDate().withMessage('Invalid fecha_vencimiento'),
    body('proveedor').optional().isString().trim().withMessage('Invalid proveedor'),
    body('condiciones_almacenamiento').optional().isString().trim().withMessage('Invalid condiciones_almacenamiento'),
  ],
  validate,
  async (req, res, next) => {
    const {
      nombre_suministro,
      tipo_suministro,
      cantidad_total,
      cantidad_disponible,
      id_centro,
      fecha_entrada,
      fecha_vencimiento,
      proveedor,
      condiciones_almacenamiento,
    } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('nombre_suministro', sql.NVarChar, nombre_suministro)
        .input('tipo_suministro', sql.NVarChar, tipo_suministro || null)
        .input('cantidad_total', sql.Int, cantidad_total)
        .input('cantidad_disponible', sql.Int, cantidad_disponible)
        .input('id_centro', sql.UniqueIdentifier, id_centro)
        .input('fecha_entrada', sql.Date, fecha_entrada)
        .input('fecha_vencimiento', sql.Date, fecha_vencimiento || null)
        .input('proveedor', sql.NVarChar, proveedor || null)
        .input('condiciones_almacenamiento', sql.NVarChar, condiciones_almacenamiento || null)
        .execute('sp_CrearSuministro');

      res.status(201).json({ message: 'Supply created', id_suministro: result.recordset[0].id_suministro });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/supplies/{id}:
 *   get:
 *     summary: Obtiene un suministro por ID
 *     tags: [Supplies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440010"
 *     responses:
 *       200:
 *         description: Suministro encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_suministro:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440010"
 *                 nombre_suministro:
 *                   type: string
 *                   example: "Jeringas desechables"
 *                 tipo_suministro:
 *                   type: string
 *                   example: "Material médico"
 *                 cantidad_total:
 *                   type: integer
 *                   example: 1000
 *                 cantidad_disponible:
 *                   type: integer
 *                   example: 800
 *                 id_centro:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440001"
 *                 fecha_entrada:
 *                   type: string
 *                   format: date
 *                   example: "2025-06-01"
 *                 fecha_vencimiento:
 *                   type: string
 *                   format: date
 *                   example: "2026-06-01"
 *                 proveedor:
 *                   type: string
 *                   example: "Proveedor XYZ"
 *                 condiciones_almacenamiento:
 *                   type: string
 *                   example: "2-8°C"
 *       404:
 *         description: Suministro no encontrado
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
        .input('id_suministro', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerSuministro');

      if (result.recordset.length === 0) {
        const error = new Error('Supply not found');
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
 * /api/supplies/{id}:
 *   put:
 *     summary: Actualiza un suministro
 *     tags: [Supplies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440010"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_suministro:
 *                 type: string
 *                 example: "Jeringas desechables actualizadas"
 *               tipo_suministro:
 *                 type: string
 *                 example: "Material médico"
 *               cantidad_total:
 *                 type: integer
 *                 example: 1200
 *               cantidad_disponible:
 *                 type: integer
 *                 example: 1000
 *               id_centro:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               fecha_entrada:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-01"
 *               fecha_vencimiento:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-01"
 *               proveedor:
 *                 type: string
 *                 example: "Proveedor XYZ"
 *               condiciones_almacenamiento:
 *                 type: string
 *                 example: "2-8°C"
 *     responses:
 *       200:
 *         description: Suministro actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Supply updated"
 *       400:
 *         description: Validación fallida
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid UUID'),
    body('nombre_suministro').isString().trim().notEmpty().withMessage('nombre_suministro is required'),
    body('tipo_suministro').optional().isString().trim().withMessage('Invalid tipo_suministro'),
    body('cantidad_total').isInt({ min: 0 }).withMessage('Invalid cantidad_total'),
    body('cantidad_disponible').isInt({ min: 0 }).withMessage('Invalid cantidad_disponible'),
    body('id_centro').isUUID().withMessage('Invalid UUID for id_centro'),
    body('fecha_entrada').isDate().withMessage('Invalid fecha_entrada'),
    body('fecha_vencimiento').optional().isDate().withMessage('Invalid fecha_vencimiento'),
    body('proveedor').optional().isString().trim().withMessage('Invalid proveedor'),
    body('condiciones_almacenamiento').optional().isString().trim().withMessage('Invalid condiciones_almacenamiento'),
  ],
  validate,
  async (req, res, next) => {
    const {
      nombre_suministro,
      tipo_suministro,
      cantidad_total,
      cantidad_disponible,
      id_centro,
      fecha_entrada,
      fecha_vencimiento,
      proveedor,
      condiciones_almacenamiento,
    } = req.body;

    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_suministro', sql.UniqueIdentifier, req.params.id)
        .input('nombre_suministro', sql.NVarChar, nombre_suministro)
        .input('tipo_suministro', sql.NVarChar, tipo_suministro || null)
        .input('cantidad_total', sql.Int, cantidad_total)
        .input('cantidad_disponible', sql.Int, cantidad_disponible)
        .input('id_centro', sql.UniqueIdentifier, id_centro)
        .input('fecha_entrada', sql.Date, fecha_entrada)
        .input('fecha_vencimiento', sql.Date, fecha_vencimiento || null)
        .input('proveedor', sql.NVarChar, proveedor || null)
        .input('condiciones_almacenamiento', sql.NVarChar, condiciones_almacenamiento || null)
        .execute('sp_ActualizarSuministro');

      res.json({ message: 'Supply updated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/supplies/{id}:
 *   delete:
 *     summary: Elimina un suministro
 *     tags: [Supplies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440010"
 *     responses:
 *       200:
 *         description: Suministro eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Supply deleted"
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
        .input('id_suministro', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarSuministro');

      res.json({ message: 'Supply deleted' });
    } catch (error) {
      next(error);
    }
  }
);
/**
 * @swagger
 * /api/supplies:
 *   get:
 *     summary: Obtiene todos los suministros
 *     tags: [Supplies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de suministros
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_suministro:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440010"
 *                   nombre_suministro:
 *                     type: string
 *                     example: "Jeringas desechables"
 *                   tipo_suministro:
 *                     type: string
 *                     example: "Material médico"
 *                   cantidad_total:
 *                     type: integer
 *                     example: 1000
 *                   cantidad_disponible:
 *                     type: integer
 *                     example: 800
 *                   id_centro:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440001"
 *                   fecha_entrada:
 *                     type: string
 *                     format: date
 *                     example: "2025-06-01"
 *                   fecha_vencimiento:
 *                     type: string
 *                     format: date
 *                     example: "2026-06-01"
 *                   proveedor:
 *                     type: string
 *                     example: "Proveedor XYZ"
 *                   condiciones_almacenamiento:
 *                     type: string
 *                     example: "2-8°C"
 */
router.get(
  '/',
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .execute('sp_ObtenerTodosSuministros');

      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);
module.exports = router;