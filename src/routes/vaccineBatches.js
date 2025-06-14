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
 *   name: Vaccine Batches
 *   description: Gestión de lotes de vacunas
 */

/**
 * @swagger
 * /api/vaccine-batches:
 *   post:
 *     summary: Crea un nuevo lote de vacunas
 *     tags: [Vaccine Batches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_vacuna:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440002"
 *               numero_lote:
 *                 type: string
 *                 example: "LOT001"
 *               cantidad_total:
 *                 type: integer
 *                 example: 500
 *               cantidad_disponible:
 *                 type: integer
 *                 example: 450
 *               fecha_fabricacion:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-01"
 *               fecha_vencimiento:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-01"
 *               id_centro:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               condiciones_almacenamiento:
 *                 type: string
 *                 example: "2-8°C"
 *     responses:
 *       201:
 *         description: Lote de vacunas creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vaccine batch created"
 *                 id_lote:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440010"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('id_vacuna').isUUID().withMessage('Invalid UUID for id_vacuna'),
    body('numero_lote').isString().trim().notEmpty().withMessage('numero_lote is required'),
    body('cantidad_total').isInt({ min: 0 }).withMessage('Invalid cantidad_total'),
    body('cantidad_disponible').isInt({ min: 0 }).withMessage('Invalid cantidad_disponible'),
    body('fecha_fabricacion').isDate().withMessage('Invalid fecha_fabricacion'),
    body('fecha_vencimiento').isDate().withMessage('Invalid fecha_vencimiento'),
    body('id_centro').isUUID().withMessage('Invalid UUID for id_centro'),
    body('condiciones_almacenamiento').optional().isString().trim().withMessage('Invalid condiciones_almacenamiento'),
  ],
  validate,
  async (req, res, next) => {
    const {
      id_vacuna,
      numero_lote,
      cantidad_total,
      cantidad_disponible,
      fecha_fabricacion,
      fecha_vencimiento,
      id_centro,
      condiciones_almacenamiento,
    } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
        .input('numero_lote', sql.NVarChar, numero_lote)
        .input('cantidad_total', sql.Int, cantidad_total)
        .input('cantidad_disponible', sql.Int, cantidad_disponible)
        .input('fecha_fabricacion', sql.Date, fecha_fabricacion)
        .input('fecha_vencimiento', sql.Date, fecha_vencimiento)
        .input('id_centro', sql.UniqueIdentifier, id_centro)
        .input('condiciones_almacenamiento', sql.NVarChar, condiciones_almacenamiento || null)
        .execute('sp_CrearLoteVacuna');

      res.status(201).json({ message: 'Vaccine batch created', id_lote: result.recordset[0].id_lote });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/vaccine-batches/{id}:
 *   get:
 *     summary: Obtiene un lote de vacunas por ID
 *     tags: [Vaccine Batches]
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
 *         description: Lote de vacunas encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_lote:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440010"
 *                 id_vacuna:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440002"
 *                 numero_lote:
 *                   type: string
 *                   example: "LOT001"
 *                 cantidad_total:
 *                   type: integer
 *                   example: 500
 *                 cantidad_disponible:
 *                   type: integer
 *                   example: 450
 *                 fecha_fabricacion:
 *                   type: string
 *                   format: date
 *                   example: "2025-01-01"
 *                 fecha_vencimiento:
 *                   type: string
 *                   format: date
 *                   example: "2026-01-01"
 *                 id_centro:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440001"
 *                 condiciones_almacenamiento:
 *                   type: string
 *                   example: "2-8°C"
 *       404:
 *         description: Lote de vacunas no encontrado
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
        .input('id_lote', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerLoteVacuna');

      if (result.recordset.length === 0) {
        const error = new Error('Vaccine batch not found');
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
 * /api/vaccine-batches/{id}:
 *   put:
 *     summary: Actualiza un lote de vacunas
 *     tags: [Vaccine Batches]
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
 *               id_vacuna:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440002"
 *               numero_lote:
 *                 type: string
 *                 example: "LOT001"
 *               cantidad_total:
 *                 type: integer
 *                 example: 500
 *               cantidad_disponible:
 *                 type: integer
 *                 example: 450
 *               fecha_fabricacion:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-01"
 *               fecha_vencimiento:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-01"
 *               id_centro:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               condiciones_almacenamiento:
 *                 type: string
 *                 example: "2-8°C"
 *     responses:
 *       200:
 *         description: Lote de vacunas actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vaccine batch updated"
 *       400:
 *         description: Validación fallida
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid UUID'),
    body('id_vacuna').isUUID().withMessage('Invalid UUID for id_vacuna'),
    body('numero_lote').isString().trim().notEmpty().withMessage('numero_lote is required'),
    body('cantidad_total').isInt({ min: 0 }).withMessage('Invalid cantidad_total'),
    body('cantidad_disponible').isInt({ min: 0 }).withMessage('Invalid cantidad_disponible'),
    body('fecha_fabricacion').isDate().withMessage('Invalid fecha_fabricacion'),
    body('fecha_vencimiento').isDate().withMessage('Invalid fecha_vencimiento'),
    body('id_centro').isUUID().withMessage('Invalid UUID for id_centro'),
    body('condiciones_almacenamiento').optional().isString().trim().withMessage('Invalid condiciones_almacenamiento'),
  ],
  validate,
  async (req, res, next) => {
    const {
      id_vacuna,
      numero_lote,
      cantidad_total,
      cantidad_disponible,
      fecha_fabricacion,
      fecha_vencimiento,
      id_centro,
      condiciones_almacenamiento,
    } = req.body;

    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_lote', sql.UniqueIdentifier, req.params.id)
        .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
        .input('numero_lote', sql.NVarChar, numero_lote)
        .input('cantidad_total', sql.Int, cantidad_total)
        .input('cantidad_disponible', sql.Int, cantidad_disponible)
        .input('fecha_fabricacion', sql.Date, fecha_fabricacion)
        .input('fecha_vencimiento', sql.Date, fecha_vencimiento)
        .input('id_centro', sql.UniqueIdentifier, id_centro)
        .input('condiciones_almacenamiento', sql.NVarChar, condiciones_almacenamiento || null)
        .execute('sp_ActualizarLoteVacuna');

      res.json({ message: 'Vaccine batch updated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/vaccine-batches/{id}:
 *   delete:
 *     summary: Elimina un lote de vacunas
 *     tags: [Vaccine Batches]
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
 *         description: Lote de vacunas eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vaccine batch deleted"
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
        .input('id_lote', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarLoteVacuna');

      res.json({ message: 'Vaccine batch deleted' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;