const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, checkRole } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Gestión de alertas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Alert:
 *       type: object
 *       required:
 *         - id_niño
 *         - tipo_alerta
 *         - fecha_alerta
 *         - estado
 *       properties:
 *         id_alerta:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la alerta
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: ID del niño
 *         tipo_alerta:
 *           type: string
 *           description: Tipo de alerta
 *         fecha_alerta:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la alerta
 *         descripcion:
 *           type: string
 *           description: Descripción de la alerta (opcional)
 *         estado:
 *           type: string
 *           enum: [Pendiente, Resuelta]
 *           description: Estado de la alerta
 *     AlertInput:
 *       type: object
 *       required:
 *         - id_niño
 *         - tipo_alerta
 *         - fecha_alerta
 *         - estado
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *         tipo_alerta:
 *           type: string
 *         fecha_alerta:
 *           type: string
 *           format: date-time
 *         descripcion:
 *           type: string
 *           nullable: true
 *         estado:
 *           type: string
 *           enum: [Pendiente, Resuelta]
 */

const validateAlert = [
  body('id_niño').isUUID().withMessage('ID de niño inválido'),
  body('tipo_alerta').notEmpty().isString().withMessage('Tipo de alerta es requerido'),
  body('fecha_alerta').isISO8601().withMessage('Fecha de alerta inválida'),
  body('descripcion').optional().isString(),
  body('estado').isIn(['Pendiente', 'Resuelta']).withMessage('Estado inválido'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Listar todas las alertas
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de alertas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Alert'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', [authenticate, checkRole(['doctor', 'director', 'administrador'])], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Alertas');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/alerts/{id}:
 *   get:
 *     summary: Obtener una alerta por ID
 *     tags: [Alerts]
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
 *         description: Alerta obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Alert'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Alerta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [authenticate, checkRole(['doctor', 'director', 'administrador']), validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_alerta', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Alertas WHERE id_alerta = @id_alerta');
    if (result.recordset.length === 0) {
      const error = new Error('Alerta no encontrada');
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
 * /api/alerts:
 *   post:
 *     summary: Crear una nueva alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlertInput'
 *     responses:
 *       201:
 *         description: Alerta creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_alerta:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/',
  [authenticate, checkRole(['doctor', 'director', 'administrador']), validateAlert],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, req.body.id_niño)
        .input('tipo_alerta', sql.NVarChar, req.body.tipo_alerta)
        .input('fecha_alerta', sql.DateTime2, req.body.fecha_alerta)
        .input('descripcion', sql.NVarChar, req.body.descripcion)
        .input('estado', sql.NVarChar, req.body.estado)
        .execute('sp_CrearAlerta');
      res.status(201).json({ id_alerta: result.recordset[0].id_alerta });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/alerts/{id}:
 *   put:
 *     summary: Actualizar una alerta
 *     tags: [Alerts]
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
 *             $ref: '#/components/schemas/AlertInput'
 *     responses:
 *       204:
 *         description: Alerta actualizada exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Alerta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id',
  [authenticate, checkRole(['doctor', 'director', 'administrador']), validateUUID, validateAlert],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_alerta', sql.UniqueIdentifier, req.params.id)
        .input('id_niño', sql.UniqueIdentifier, req.body.id_niño)
        .input('tipo_alerta', sql.NVarChar, req.body.tipo_alerta)
        .input('fecha_alerta', sql.DateTime2, req.body.fecha_alerta)
        .input('descripcion', sql.NVarChar, req.body.descripcion)
        .input('estado', sql.NVarChar, req.body.estado)
        .execute('sp_ActualizarAlerta');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/alerts/{id}:
 *   delete:
 *     summary: Eliminar una alerta
 *     tags: [Alerts]
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
 *         description: Alerta eliminada exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Alerta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete(
  '/:id',
  [authenticate, checkRole(['doctor', 'director', 'administrador']), validateUUID],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_alerta', sql.UniqueIdentifier, req.params.id)
        .query('DELETE FROM Alertas WHERE id_alerta = @id_alerta'); // Nota: No hay stored procedure, usar DELETE directo
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;