const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, checkRole } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: CampaignAssignments
 *   description: Asignación de campañas a centros
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CampaignAssignment:
 *       type: object
 *       required:
 *         - id_campaña
 *         - id_centro
 *         - fecha_asignacion
 *       properties:
 *         id_campaña_centro:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la asignación
 *         id_campaña:
 *           type: string
 *           format: uuid
 *           description: ID de la campaña
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro
 *         fecha_asignacion:
 *           type: string
 *           format: date
 *           description: Fecha de asignación
 *         nombre_campaña:
 *           type: string
 *           description: Nombre de la campaña (en reportes)
 *         nombre_centro:
 *           type: string
 *           description: Nombre del centro (en reportes)
 *     CampaignAssignmentInput:
 *       type: object
 *       required:
 *         - id_campaña
 *         - id_centro
 *         - fecha_asignacion
 *       properties:
 *         id_campaña:
 *           type: string
 *           format: uuid
 *         id_centro:
 *           type: string
 *           format: uuid
 *         fecha_asignacion:
 *           type: string
 *           format: date
 */

const validateCampaignAssignment = [
  body('id_campaña').isUUID().withMessage('ID de campaña inválido'),
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('fecha_asignacion').isDate().withMessage('Fecha de asignación inválida'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * /api/campaign-assignments:
 *   get:
 *     summary: Listar todas las asignaciones de campañas
 *     tags: [CampaignAssignments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de asignaciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CampaignAssignment'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', [authenticate, checkRole(['director', 'administrador'])], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Campana_Centro');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/campaign-assignments/{id}:
 *   get:
 *     summary: Obtener una asignación de campaña por ID
 *     tags: [CampaignAssignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Asignación obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignAssignment'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Asignación no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [authenticate, checkRole(['director', 'administrador']), validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_campaña_centro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Campana_Centro WHERE id_campaña_centro = @id_campaña_centro');
    if (result.recordset.length === 0) {
      const error = new Error('Asignación no encontrada');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/campaign-assignments:
 *   post:
 *     summary: Asignar una campaña a un centro
 *     tags: [CampaignAssignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignAssignmentInput'
 *     responses:
 *       201:
 *         description: Asignación creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_campaña_centro:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/',
  [authenticate, checkRole(['director', 'administrador']), validateCampaignAssignment],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_campaña', sql.UniqueIdentifier, req.body.id_campaña)
        .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
        .input('fecha_asignacion', sql.Date, req.body.fecha_asignacion)
        .execute('sp_CrearCampanaCentro');
      res.status(201).json({ id_campaña_centro: result.recordset[0].id_campaña_centro });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/campaign-assignments/{id}:
 *   put:
 *     summary: Actualizar una asignación de campaña
 *     tags: [CampaignAssignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignAssignmentInput'
 *     responses:
 *       204:
 *         description: Asignación actualizada exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Asignación no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id',
  [authenticate, checkRole(['director', 'administrador']), validateUUID, validateCampaignAssignment],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_campaña_centro', sql.UniqueIdentifier, req.params.id)
        .input('id_campaña', sql.UniqueIdentifier, req.body.id_campaña)
        .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
        .input('fecha_asignacion', sql.Date, req.body.fecha_asignacion)
        .query('UPDATE Campana_Centro SET id_campaña = @id_campaña, id_centro = @id_centro, fecha_asignacion = @fecha_asignacion WHERE id_campaña_centro = @id_campaña_centro'); // Nota: No hay stored procedure, usar UPDATE directo
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/campaign-assignments/{id}:
 *   delete:
 *     summary: Eliminar una asignación de campaña
 *     tags: [CampaignAssignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Asignación eliminada exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Asignación no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete(
  '/:id',
  [authenticate, checkRole(['director', 'administrador']), validateUUID],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_campaña_centro', sql.UniqueIdentifier, req.params.id)
        .query('DELETE FROM Campana_Centro WHERE id_campaña_centro = @id_campaña_centro'); // Nota: No hay stored procedure, usar DELETE directo
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;