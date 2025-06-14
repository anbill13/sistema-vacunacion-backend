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
 *   name: Vaccination Schedules
 *   description: Gestión de esquemas de vacunación
 */

/**
 * @swagger
 * /api/vaccination-schedules:
 *   post:
 *     summary: Crea un nuevo esquema de vacunación
 *     tags: [Vaccination Schedules]
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
 *               orden_dosis:
 *                 type: integer
 *                 example: 1
 *               edad_recomendada:
 *                 type: string
 *                 example: "2 meses"
 *               descripcion:
 *                 type: string
 *                 example: "Primera dosis de vacuna MMR"
 *     responses:
 *       201:
 *         description: Esquema de vacunación creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vaccination schedule created"
 *                 id_esquema:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440011"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('id_vacuna').isUUID().withMessage('Invalid UUID for id_vacuna'),
    body('orden_dosis').isInt({ min: 1 }).withMessage('Invalid orden_dosis'),
    body('edad_recomendada').isString().trim().notEmpty().withMessage('edad_recomendada is required'),
    body('descripcion').optional().isString().trim().withMessage('Invalid descripcion'),
  ],
  validate,
  async (req, res, next) => {
    const { id_vacuna, orden_dosis, edad_recomendada, descripcion } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
        .input('orden_dosis', sql.Int, orden_dosis)
        .input('edad_recomendada', sql.NVarChar, edad_recomendada)
        .input('descripcion', sql.NVarChar, descripcion || null)
        .execute('sp_CrearEsquemaVacunacion');

      res.status(201).json({ message: 'Vaccination schedule created', id_esquema: result.recordset[0].id_esquema });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/vaccination-schedules/{id}:
 *   get:
 *     summary: Obtiene un esquema de vacunación por ID
 *     tags: [Vaccination Schedules]
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
 *         description: Esquema de vacunación encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_esquema:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440011"
 *                 id_vacuna:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440002"
 *                 orden_dosis:
 *                   type: integer
 *                   example: 1
 *                 edad_recomendada:
 *                   type: string
 *                   example: "2 meses"
 *                 descripcion:
 *                   type: string
 *                   example: "Primera dosis de vacuna MMR"
 *       404:
 *         description: Esquema de vacunación no encontrado
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
        .input('id_esquema', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerEsquemaVacunacion');

      if (result.recordset.length === 0) {
        const error = new Error('Vaccination schedule not found');
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
 * /api/vaccination-schedules/{id}:
 *   put:
 *     summary: Actualiza un esquema de vacunación
 *     tags: [Vaccination Schedules]
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
 *               orden_dosis:
 *                 type: integer
 *                 example: 1
 *               edad_recomendada:
 *                 type: string
 *                 example: "2 meses"
 *               descripcion:
 *                 type: string
 *                 example: "Primera dosis de vacuna MMR actualizada"
 *     responses:
 *       200:
 *         description: Esquema de vacunación actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vaccination schedule updated"
 *       400:
 *         description: Validación fallida
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid UUID'),
    body('id_vacuna').isUUID().withMessage('Invalid UUID for id_vacuna'),
    body('orden_dosis').isInt({ min: 1 }).withMessage('Invalid orden_dosis'),
    body('edad_recomendada').isString().trim().notEmpty().withMessage('edad_recomendada is required'),
    body('descripcion').optional().isString().trim().withMessage('Invalid descripcion'),
  ],
  validate,
  async (req, res, next) => {
    const { id_vacuna, orden_dosis, edad_recomendada, descripcion } = req.body;

    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_esquema', sql.UniqueIdentifier, req.params.id)
        .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
        .input('orden_dosis', sql.Int, orden_dosis)
        .input('edad_recomendada', sql.NVarChar, edad_recomendada)
        .input('descripcion', sql.NVarChar, descripcion || null)
        .execute('sp_ActualizarEsquemaVacunacion');

      res.json({ message: 'Vaccination schedule updated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/vaccination-schedules/{id}:
 *   delete:
 *     summary: Elimina un esquema de vacunación
 *     tags: [Vaccination Schedules]
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
 *         description: Esquema de vacunación eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vaccination schedule deleted"
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
        .input('id_esquema', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarEsquemaVacunacion');

      res.json({ message: 'Vaccination schedule deleted' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;