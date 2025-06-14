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
 *   name: Adverse Events
 *   description: Gestión de eventos adversos
 */

/**
 * @swagger
 * /api/adverse-events:
 *   post:
 *     summary: Registra un nuevo evento adverso
 *     tags: [Adverse Events]
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
 *               id_historial:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               descripcion_evento:
 *                 type: string
 *                 example: "Reacción alérgica leve"
 *               fecha_evento:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-10"
 *               gravedad:
 *                 type: string
 *                 enum: [Leve, Moderado, Grave]
 *                 example: "Leve"
 *               id_personal_reportante:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440002"
 *               acciones_tomadas:
 *                 type: string
 *                 example: "Administración de antihistamínico"
 *               estado:
 *                 type: string
 *                 enum: [Reportado, En Investigación, Resuelto]
 *                 example: "Reportado"
 *     responses:
 *       201:
 *         description: Evento adverso registrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Adverse event registered"
 *                 id_evento:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440003"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('id_niño').isUUID().withMessage('Invalid UUID for id_niño'),
    body('id_historial').isUUID().withMessage('Invalid UUID for id_historial'),
    body('descripcion_evento').isString().trim().notEmpty().withMessage('descripcion_evento is required'),
    body('fecha_evento').isDate().withMessage('Invalid date for fecha_evento'),
    body('gravedad').isIn(['Leve', 'Moderado', 'Grave']).withMessage('Invalid gravedad'),
    body('id_personal_reportante').isUUID().withMessage('Invalid UUID for id_personal_reportante'),
    body('acciones_tomadas').optional().isString().trim().withMessage('Invalid acciones_tomadas'),
    body('estado')
      .isIn(['Reportado', 'En Investigación', 'Resuelto'])
      .withMessage('Invalid estado'),
  ],
  validate,
  async (req, res, next) => {
    const {
      id_niño,
      id_historial,
      descripcion_evento,
      fecha_evento,
      gravedad,
      id_personal_reportante,
      acciones_tomadas,
      estado,
    } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, id_niño)
        .input('id_historial', sql.UniqueIdentifier, id_historial)
        .input('descripcion_evento', sql.NVarChar, descripcion_evento)
        .input('fecha_evento', sql.Date, fecha_evento)
        .input('gravedad', sql.NVarChar, gravedad)
        .input('id_personal_reportante', sql.UniqueIdentifier, id_personal_reportante)
        .input('acciones_tomadas', sql.NVarChar, acciones_tomadas || null)
        .input('estado', sql.NVarChar, estado)
        .execute('sp_RegistrarEventoAdverso');

      res.status(201).json({ message: 'Adverse event registered', id_evento: result.recordset[0].id_evento });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/adverse-events/{id}:
 *   get:
 *     summary: Obtiene un evento adverso por ID
 *     tags: [Adverse Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440003"
 *     responses:
 *       200:
 *         description: Evento adverso encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_evento:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440003"
 *                 id_niño:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 id_historial:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440001"
 *                 descripcion_evento:
 *                   type: string
 *                   example: "Reacción alérgica leve"
 *                 fecha_evento:
 *                   type: string
 *                   format: date
 *                   example: "2025-06-10"
 *                 gravedad:
 *                   type: string
 *                   enum: [Leve, Moderado, Grave]
 *                   example: "Leve"
 *                 id_personal_reportante:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440002"
 *                 acciones_tomadas:
 *                   type: string
 *                   example: "Administración de antihistamínico"
 *                 estado:
 *                   type: string
 *                   enum: [Reportado, En Investigación, Resuelto]
 *                   example: "Reportado"
 *       404:
 *         description: Evento adverso no encontrado
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
        .input('id_evento', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerEventoAdverso');

      if (result.recordset.length === 0) {
        const error = new Error('Adverse event not found');
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
 * /api/adverse-events/{id}:
 *   put:
 *     summary: Actualiza un evento adverso
 *     tags: [Adverse Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440003"
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
 *               id_historial:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               descripcion_evento:
 *                 type: string
 *                 example: "Reacción alérgica leve actualizada"
 *               fecha_evento:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-10"
 *               gravedad:
 *                 type: string
 *                 enum: [Leve, Moderado, Grave]
 *                 example: "Moderado"
 *               id_personal_reportante:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440002"
 *               acciones_tomadas:
 *                 type: string
 *                 example: "Administración de antihistamínico y monitoreo"
 *               estado:
 *                 type: string
 *                 enum: [Reportado, En Investigación, Resuelto]
 *                 example: "En Investigación"
 *     responses:
 *       200:
 *         description: Evento adverso actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Adverse event updated"
 *       400:
 *         description: Validación fallida
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid UUID for id_evento'),
    body('id_niño').isUUID().withMessage('Invalid UUID for id_niño'),
    body('id_historial').isUUID().withMessage('Invalid UUID for id_historial'),
    body('descripcion_evento').isString().trim().notEmpty().withMessage('descripcion_evento is required'),
    body('fecha_evento').isDate().withMessage('Invalid date for fecha_evento'),
    body('gravedad').isIn(['Leve', 'Moderado', 'Grave']).withMessage('Invalid gravedad'),
    body('id_personal_reportante').isUUID().withMessage('Invalid UUID for id_personal_reportante'),
    body('acciones_tomadas').optional().isString().trim().withMessage('Invalid acciones_tomadas'),
    body('estado')
      .isIn(['Reportado', 'En Investigación', 'Resuelto'])
      .withMessage('Invalid estado'),
  ],
  validate,
  async (req, res, next) => {
    const {
      id_niño,
      id_historial,
      descripcion_evento,
      fecha_evento,
      gravedad,
      id_personal_reportante,
      acciones_tomadas,
      estado,
    } = req.body;

    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_evento', sql.UniqueIdentifier, req.params.id)
        .input('id_niño', sql.UniqueIdentifier, id_niño)
        .input('id_historial', sql.UniqueIdentifier, id_historial)
        .input('descripcion_evento', sql.NVarChar, descripcion_evento)
        .input('fecha_evento', sql.Date, fecha_evento)
        .input('gravedad', sql.NVarChar, gravedad)
        .input('id_personal_reportante', sql.UniqueIdentifier, id_personal_reportante)
        .input('acciones_tomadas', sql.NVarChar, acciones_tomadas || null)
        .input('estado', sql.NVarChar, estado)
        .execute('sp_ActualizarEventoAdverso');

      res.json({ message: 'Adverse event updated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/adverse-events/{id}:
 *   delete:
 *     summary: Elimina un evento adverso
 *     tags: [Adverse Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440003"
 *     responses:
 *       200:
 *         description: Evento adverso eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Adverse event deleted"
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
        .input('id_evento', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarEventoAdverso');

      res.json({ message: 'Adverse event deleted' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;