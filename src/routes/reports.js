const express = require('express');
const { param, query, validationResult } = require('express-validator');
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
 *   name: Reports
 *   description: Generación de informes
 */

/**
 * @swagger
 * /api/reports/coverage/{id_centro}:
 *   get:
 *     summary: Obtiene la cobertura de vacunación por centro
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id_centro
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440001"
 *       - name: fecha_inicio
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-06-01"
 *       - name: fecha_fin
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-06-30"
 *     responses:
 *       200:
 *         description: Lista de cobertura de vacunación
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_centro:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440001"
 *                   total_vacunados:
 *                     type: integer
 *                     example: 150
 *                   total_poblacion:
 *                     type: integer
 *                     example: 200
 *                   porcentaje_cobertura:
 *                     type: number
 *                     format: float
 *                     example: 75.0
 */
router.get(
  '/coverage/:id_centro',
  [
    param('id_centro').isUUID().withMessage('Invalid UUID for id_centro'),
    query('fecha_inicio').isDate().withMessage('Invalid date for fecha_inicio'),
    query('fecha_fin').isDate().withMessage('Invalid date for fecha_fin'),
  ],
  validate,
  async (req, res, next) => {
    const { fecha_inicio, fecha_fin } = req.query;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_centro', sql.UniqueIdentifier, req.params.id_centro)
        .input('fecha_inicio', sql.Date, fecha_inicio)
        .input('fecha_fin', sql.Date, fecha_fin)
        .execute('sp_ObtenerCoberturaVacunacion');

      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/reports/pending-appointments/{id_niño}:
 *   get:
 *     summary: Obtiene citas pendientes por niño
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id_niño
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Lista de citas pendientes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_cita:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440005"
 *                   id_niño:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440000"
 *                   id_centro:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440001"
 *                   fecha_cita:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-06-11T10:00:00Z"
 *                   estado:
 *                     type: string
 *                     enum: [Pendiente, Confirmada, Cancelada, Completada]
 *                     example: "Pendiente"
 */
router.get(
  '/pending-appointments/:id_niño',
  [param('id_niño').isUUID().withMessage('Invalid UUID for id_niño')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, req.params.id_niño)
        .execute('sp_ObtenerCitasPendientesNino');

      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/reports/expired-batches/{id_centro}:
 *   get:
 *     summary: Obtiene lotes de vacunas vencidos por centro
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id_centro
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440001"
 *     responses:
 *       200:
 *         description: Lista de lotes vencidos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_lote:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440010"
 *                   id_vacuna:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440002"
 *                   numero_lote:
 *                     type: string
 *                     example: "LOT001"
 *                   fecha_vencimiento:
 *                     type: string
 *                     format: date
 *                     example: "2024-12-31"
 */
router.get(
  '/expired-batches/:id_centro',
  [param('id_centro').isUUID().withMessage('Invalid UUID for id_centro')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_centro', sql.UniqueIdentifier, req.params.id_centro)
        .execute('sp_ObtenerLotesVencidos');

      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/reports/incomplete-schedules/{id_niño}:
 *   get:
 *     summary: Obtiene esquemas de vacunación incompletos por niño
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id_niño
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Lista de esquemas incompletos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_esquema:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440011"
 *                   id_vacuna:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440002"
 *                   orden_dosis:
 *                     type: integer
 *                     example: 2
 *                   edad_recomendada:
 *                     type: string
 *                     example: "12 meses"
 */
router.get(
  '/incomplete-schedules/:id_niño',
  [param('id_niño').isUUID().withMessage('Invalid UUID for id_niño')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, req.params.id_niño)
        .execute('sp_ObtenerEsquemasIncompletos');

      res.json(result.recordset);
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