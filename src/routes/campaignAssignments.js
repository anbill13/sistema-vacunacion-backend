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
 *   name: Campaign Assignments
 *   description: Asignación de campañas a centros
 */

/**
 * @swagger
 * /api/campaign-assignments:
 *   post:
 *     summary: Asigna una campaña a un centro
 *     tags: [Campaign Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_campaña:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440002"
 *               id_centro:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               fecha_asignacion:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-10"
 *     responses:
 *       201:
 *         description: Campaña asignada a centro
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Campaign assigned to center"
 *                 id_campaña_centro:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440007"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('id_campaña').isUUID().withMessage('Invalid UUID for id_campaña'),
    body('id_centro').isUUID().withMessage('Invalid UUID for id_centro'),
    body('fecha_asignacion').isDate().withMessage('Invalid fecha_asignacion'),
  ],
  validate,
  async (req, res, next) => {
    const { id_campaña, id_centro, fecha_asignacion } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_campaña', sql.UniqueIdentifier, id_campaña)
        .input('id_centro', sql.UniqueIdentifier, id_centro)
        .input('fecha_asignacion', sql.Date, fecha_asignacion)
        .execute('sp_CrearCampanaCentro');

      res.status(201).json({
        message: 'Campaign assigned to center',
        id_campaña_centro: result.recordset[0].id_campaña_centro,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/campaign-assignments/{id}:
 *   get:
 *     summary: Obtiene una asignación de campaña por ID
 *     tags: [Campaign Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440007"
 *     responses:
 *       200:
 *         description: Asignación de campaña encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_campaña_centro:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440007"
 *                 id_campaña:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440002"
 *                 id_centro:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440001"
 *                 fecha_asignacion:
 *                   type: string
 *                   format: date
 *                   example: "2025-06-10"
 *       404:
 *         description: Asignación de campaña no encontrada
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
        .input('id_campaña_centro', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerCampanaCentro');

      if (result.recordset.length === 0) {
        const error = new Error('Campaign assignment not found');
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
 * /api/campaign-assignments/{id}:
 *   delete:
 *     summary: Elimina una asignación de campaña
 *     tags: [Campaign Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440007"
 *     responses:
 *       200:
 *         description: Asignación de campaña eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Campaign assignment deleted"
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
        .input('id_campaña_centro', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarCampanaCentro');

      res.json({ message: 'Campaign assignment deleted' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;