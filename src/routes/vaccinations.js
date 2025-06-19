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
 * /api/vaccinations:
 *   get:
 *     summary: Obtiene todos los registros de vacunación
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de vacunaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_historial:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440012"
 *                   id_niño:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440000"
 *                   id_lote:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440010"
 *                   id_personal:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440009"
 *                   id_centro:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440011"
 *                   fecha_vacunacion:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-06-10T20:00:00Z"
 *                   dosis_aplicada:
 *                     type: integer
 *                     example: 1
 *                   sitio_aplicacion:
 *                     type: string
 *                     example: "Brazo izquierdo"
 *                   observaciones:
 *                     type: string
 *                     example: "Vacuna aplicada sin complicaciones"
 */
router.get(
  '/',
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .execute('sp_ObtenerTodasVacunaciones');

      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * tags:
 *   name: Vaccinations
 *   description: Gestión de vacunaciones
 */

/**
 * @swagger
 * /api/vaccinations:
 *   post:
 *     summary: Registra una nueva vacunación
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_niño:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               id_lote:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440010"
 *               id_personal:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440009"
 *               id_centro:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440011"
 *               fecha_vacunacion:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-10T20:00:00Z"
 *               dosis_aplicada:
 *                 type: integer
 *                 example: 1
 *               sitio_aplicacion:
 *                 type: string
 *                 example: "Brazo izquierdo"
 *               observaciones:
 *                 type: string
 *                 example: "Vacuna aplicada sin complicaciones"
 *     responses:
 *       201:
 *         description: Vacunación registrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vaccination recorded"
 *                 id_historial:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440012"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('id_niño').isUUID().withMessage('Invalid UUID for id_niño'),
    body('id_lote').isUUID().withMessage('Invalid UUID for id_lote'),
    body('id_personal').isUUID().withMessage('Invalid UUID for id_personal'),
    body('id_centro').optional().isUUID().withMessage('Invalid UUID for id_centro'),
    body('fecha_vacunacion').isISO8601().toDate().withMessage('Invalid fecha_vacunacion'),
    body('dosis_aplicada').isInt({ min: 1 }).withMessage('Invalid dosis_aplicada'),
    body('sitio_aplicacion').optional().isString().trim().withMessage('Invalid sitio_aplicacion'),
    body('observaciones').optional().isString().trim().withMessage('Invalid observaciones'),
  ],
  validate,
  async (req, res, next) => {
    const { id_niño, id_lote, id_personal, id_centro, fecha_vacunacion, dosis_aplicada, sitio_aplicacion, observaciones } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, id_niño)
        .input('id_lote', sql.UniqueIdentifier, id_lote)
        .input('id_personal', sql.UniqueIdentifier, id_personal)
        .input('id_centro', sql.UniqueIdentifier, id_centro || null)
        .input('fecha_vacunacion', sql.DateTime2, fecha_vacunacion)
        .input('dosis_aplicada', sql.Int, dosis_aplicada)
        .input('sitio_aplicacion', sql.NVarChar, sitio_aplicacion || null)
        .input('observaciones', sql.NVarChar, observaciones || null)
        .execute('sp_RegistrarVacunacion');

      res.status(201).json({ message: 'Vaccination recorded', id_historial: result.recordset[0].id_historial });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/vaccinations/{id}:
 *   get:
 *     summary: Obtiene un registro de vacunación por ID
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440012"
 *     responses:
 *       200:
 *         description: Registro de vacunación encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_historial:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440012"
 *                 id_niño:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 id_lote:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440010"
 *                 id_personal:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440009"
 *                 id_centro:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440011"
 *                 fecha_vacunacion:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-06-10T20:00:00Z"
 *                 dosis_aplicada:
 *                   type: integer
 *                   example: 1
 *                 sitio_aplicacion:
 *                   type: string
 *                   example: "Brazo izquierdo"
 *                 observaciones:
 *                   type: string
 *                   example: "Vacuna aplicada sin complicaciones"
 *       404:
 *         description: Registro de vacunación no encontrado
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
        .input('id_historial', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerVacunacion');

      if (result.recordset.length === 0) {
        const error = new Error('Vaccination record not found');
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
 * /api/vaccinations/{id}:
 *   put:
 *     summary: Actualiza un registro de vacunación
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440012"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_niño:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               id_lote:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440010"
 *               id_personal:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440009"
 *               id_centro:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440011"
 *               fecha_vacunacion:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-10T20:00:00Z"
 *               dosis_aplicada:
 *                 type: integer
 *                 example: 1
 *               sitio_aplicacion:
 *                 type: string
 *                 example: "Brazo izquierdo"
 *               observaciones:
 *                 type: string
 *                 example: "Vacuna aplicada sin complicaciones"
 *     responses:
 *       200:
 *         description: Registro de vacunación actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vaccination updated"
 *       400:
 *         description: Validación fallida
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid UUID'),
    body('id_niño').isUUID().withMessage('Invalid UUID for id_niño'),
    body('id_lote').isUUID().withMessage('Invalid UUID for id_lote'),
    body('id_personal').isUUID().withMessage('Invalid UUID for id_personal'),
    body('id_centro').optional().isUUID().withMessage('Invalid UUID for id_centro'),
    body('fecha_vacunacion').isISO8601().toDate().withMessage('Invalid fecha_vacunacion'),
    body('dosis_aplicada').isInt({ min: 1 }).withMessage('Invalid dosis_aplicada'),
    body('sitio_aplicacion').optional().isString().trim().withMessage('Invalid sitio_aplicacion'),
    body('observaciones').optional().isString().trim().withMessage('Invalid observaciones'),
  ],
  validate,
  async (req, res, next) => {
    const { id_niño, id_lote, id_personal, id_centro, fecha_vacunacion, dosis_aplicada, sitio_aplicacion, observaciones } = req.body;

    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, id_niño)
        .input('id_lote', sql.UniqueIdentifier, id_lote)
        .input('id_personal', sql.UniqueIdentifier, id_personal)
        .input('id_centro', sql.UniqueIdentifier, id_centro || null)
        .input('fecha_vacunacion', sql.DateTime2, fecha_vacunacion)
        .input('dosis_aplicada', sql.Int, dosis_aplicada)
        .input('sitio_aplicacion', sql.NVarChar, sitio_aplicacion || null)
        .input('observaciones', sql.NVarChar, observaciones || null)
        .execute('sp_ActualizarVacunacion');

      res.json({ message: 'Vaccination updated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/vaccinations/{id}:
 *   delete:
 *     summary: Elimina un registro de vacunación
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440012"
 *     responses:
 *       200:
 *         description: Registro de vacunación eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vaccination deleted"
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
        .input('id_historial', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarVacunacion');

      res.json({ message: 'Vaccination deleted' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;