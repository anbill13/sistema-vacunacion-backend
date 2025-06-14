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
 *   name: Supply Usage
 *   description: Registro de uso de suministros
 */

/**
 * @swagger
 * /api/supply-usage:
 *   post:
 *     summary: Registra el uso de un suministro
 *     tags: [Supply Usage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_suministro:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440010"
 *               cantidad_usada:
 *                 type: integer
 *                 example: 50
 *               fecha_uso:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-10T20:00:00Z"
 *               id_personal:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440009"
 *               observaciones:
 *                 type: string
 *                 example: "Uso en vacunación rutinaria"
 *     responses:
 *       201:
 *         description: Uso de suministro registrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Supply usage recorded"
 *                 id_uso:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440011"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('id_suministro').isUUID().withMessage('Invalid UUID for id_suministro'),
    body('cantidad_usada').isInt({ min: 1 }).withMessage('Invalid cantidad_usada'),
    body('fecha_uso').isISO8601().toDate().withMessage('Invalid fecha_uso'),
    body('id_personal').isUUID().withMessage('Invalid UUID for id_personal'),
    body('observaciones').optional().isString().trim().withMessage('Invalid observaciones'),
  ],
  validate,
  async (req, res, next) => {
    const { id_suministro, cantidad_usada, fecha_uso, id_personal, observaciones } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_suministro', sql.UniqueIdentifier, id_suministro)
        .input('cantidad_usada', sql.Int, cantidad_usada)
        .input('fecha_uso', sql.DateTime2, fecha_uso)
        .input('id_personal', sql.UniqueIdentifier, id_personal)
        .input('observaciones', sql.NVarChar, observaciones || null)
        .execute('sp_RegistrarUsoSuministro');

      res.status(201).json({ message: 'Supply usage recorded', id_uso: result.recordset[0].id_uso });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/supply-usage/{id}:
 *   get:
 *     summary: Obtiene un registro de uso de suministro por ID
 *     tags: [Supply Usage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440011"
 *     responses:
 *       200:
 *         description: Registro de uso encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_uso:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440011"
 *                 id_suministro:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440010"
 *                 cantidad_usada:
 *                   type: integer
 *                   example: 50
 *                 fecha_uso:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-06-10T20:00:00Z"
 *                 id_personal:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440009"
 *                 observaciones:
 *                   type: string
 *                   example: "Uso en vacunación rutinaria"
 *       404:
 *         description: Registro de uso no encontrado
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
        .input('id_uso', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerUsoSuministro');

      if (result.recordset.length === 0) {
        const error = new Error('Supply usage not found');
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
 * /api/supply-usage/{id}:
 *   delete:
 *     summary: Elimina un registro de uso de suministro
 *     tags: [Supply Usage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440011"
 *     responses:
 *       200:
 *         description: Registro de uso eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Supply usage deleted"
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
        .input('id_uso', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarUsoSuministro');

      res.json({ message: 'Supply usage deleted' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;