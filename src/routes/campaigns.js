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
 * /api/campaigns:
 *   get:
 *     summary: Obtiene todas las campañas
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de campañas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_campaña:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440002"
 *                   nombre_campaña:
 *                     type: string
 *                     example: "Campaña de Vacunación 2025"
 *                   fecha_inicio:
 *                     type: string
 *                     format: date
 *                     example: "2025-06-01"
 *                   fecha_fin:
 *                     type: string
 *                     format: date
 *                     example: "2025-06-30"
 *                   objetivo:
 *                     type: string
 *                     example: "Vacunar al 90% de la población infantil"
 *                   id_vacuna:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440003"
 *                   estado:
 *                     type: string
 *                     enum: [Planificada, En Curso, Finalizada]
 *                     example: "Planificada"
 */
router.get(
  '/',
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .execute('sp_ObtenerTodasCampanasVacunacion');

      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * tags:
 *   name: Campaigns
 *   description: Gestión de campañas de vacunación
 */

/**
 * @swagger
 * /api/campaigns:
 *   post:
 *     summary: Crea una nueva campaña
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_campaña:
 *                 type: string
 *                 example: "Campaña de Vacunación 2025"
 *               fecha_inicio:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-01"
 *               fecha_fin:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-30"
 *               objetivo:
 *                 type: string
 *                 example: "Vacunar al 90% de la población infantil"
 *               id_vacuna:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440002"
 *               estado:
 *                 type: string
 *                 enum: [Planificada, En Curso, Finalizada]
 *                 example: "Planificada"
 *     responses:
 *       201:
 *         description: Campaña creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Campaign created"
 *                 id_campaña:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440002"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('nombre_campaña').isString().trim().notEmpty().withMessage('nombre_campaña is required'),
    body('fecha_inicio').isDate().withMessage('Invalid fecha_inicio'),
    body('fecha_fin').optional().isDate().withMessage('Invalid fecha_fin'),
    body('objetivo').optional().isString().trim().withMessage('Invalid objetivo'),
    body('id_vacuna').isUUID().withMessage('Invalid UUID for id_vacuna'),
    body('estado')
      .isIn(['Planificada', 'En Curso', 'Finalizada'])
      .withMessage('Invalid estado'),
  ],
  validate,
  async (req, res, next) => {
    const { nombre_campaña, fecha_inicio, fecha_fin, objetivo, id_vacuna, estado } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('nombre_campaña', sql.NVarChar, nombre_campaña)
        .input('fecha_inicio', sql.Date, fecha_inicio)
        .input('fecha_fin', sql.Date, fecha_fin || null)
        .input('objetivo', sql.NVarChar, objetivo || null)
        .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
        .input('estado', sql.NVarChar, estado)
        .execute('sp_CrearCampanaVacunacion');

      res.status(201).json({ message: 'Campaign created', id_campaña: result.recordset[0].id_campaña });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   get:
 *     summary: Obtiene una campaña por ID
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440002"
 *     responses:
 *       200:
 *         description: Campaña encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_campaña:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440002"
 *                 nombre_campaña:
 *                   type: string
 *                   example: "Campaña de Vacunación 2025"
 *                 fecha_inicio:
 *                   type: string
 *                   format: date
 *                   example: "2025-06-01"
 *                 fecha_fin:
 *                   type: string
 *                   format: date
 *                   example: "2025-06-30"
 *                 objetivo:
 *                   type: string
 *                   example: "Vacunar al 90% de la población infantil"
 *                 id_vacuna:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440003"
 *                 estado:
 *                   type: string
 *                   enum: [Planificada, En Curso, Finalizada]
 *                   example: "Planificada"
 *       404:
 *         description: Campaña no encontrada
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
        .input('id_campaña', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerCampanaVacunacion');

      if (result.recordset.length === 0) {
        const error = new Error('Campaign not found');
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
 * /api/campaigns/{id}:
 *   put:
 *     summary: Actualiza una campaña
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440002"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_campaña:
 *                 type: string
 *                 example: "Campaña de Vacunación 2025 Actualizada"
 *               fecha_inicio:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-01"
 *               fecha_fin:
 *                 type: string
 *                 format: date
 *                 example: "2025-07-01"
 *               objetivo:
 *                 type: string
 *                 example: "Vacunar al 95% de la población infantil"
 *               id_vacuna:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440003"
 *               estado:
 *                 type: string
 *                 enum: [Planificada, En Curso, Finalizada]
 *                 example: "En Curso"
 *     responses:
 *       200:
 *         description: Campaña actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Campaign updated"
 *       400:
 *         description: Validación fallida
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid UUID'),
    body('nombre_campaña').isString().trim().notEmpty().withMessage('nombre_campaña is required'),
    body('fecha_inicio').isDate().withMessage('Invalid fecha_inicio'),
    body('fecha_fin').optional().isDate().withMessage('Invalid fecha_fin'),
    body('objetivo').optional().isString().trim().withMessage('Invalid objetivo'),
    body('id_vacuna').isUUID().withMessage('Invalid UUID for id_vacuna'),
    body('estado')
      .isIn(['Planificada', 'En Curso', 'Finalizada'])
      .withMessage('Invalid estado'),
  ],
  validate,
  async (req, res, next) => {
    const { nombre_campaña, fecha_inicio, fecha_fin, objetivo, id_vacuna, estado } = req.body;

    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_campaña', sql.UniqueIdentifier, req.params.id)
        .input('nombre_campaña', sql.NVarChar, nombre_campaña)
        .input('fecha_inicio', sql.Date, fecha_inicio)
        .input('fecha_fin', sql.Date, fecha_fin || null)
        .input('objetivo', sql.NVarChar, objetivo || null)
        .input('id_vacuna', sql.UniqueIdentifier, id_vacuna)
        .input('estado', sql.NVarChar, estado)
        .execute('sp_ActualizarCampanaVacunacion');

      res.json({ message: 'Campaign updated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   delete:
 *     summary: Elimina una campaña
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440002"
 *     responses:
 *       200:
 *         description: Campaña eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Campaign deleted"
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
        .input('id_campaña', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarCampanaVacunacion');

      res.json({ message: 'Campaign deleted' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;