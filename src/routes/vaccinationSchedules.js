const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, checkRole } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: VaccinationSchedules
 *   description: Gestión de esquemas de vacunación
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     VaccinationSchedule:
 *       type: object
 *       required:
 *         - id_vacuna
 *         - orden_dosis
 *         - edad_recomendada
 *       properties:
 *         id_esquema:
 *           type: string
 *           format: uuid
 *           description: Identificador único del esquema
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *           description: ID de la vacuna
 *         orden_dosis:
 *           type: integer
 *           description: Orden de la dosis
 *         edad_recomendada:
 *           type: string
 *           description: Edad recomendada
 *         descripcion:
 *           type: string
 *           description: Descripción del esquema (opcional)
 *     VaccinationScheduleInput:
 *       type: object
 *       required:
 *         - id_vacuna
 *         - orden_dosis
 *         - edad_recomendada
 *       properties:
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *         orden_dosis:
 *           type: integer
 *         edad_recomendada:
 *           type: string
 *         descripcion:
 *           type: string
 *           nullable: true
 */

const validateVaccinationSchedule = [
  body('id_vacuna').isUUID().withMessage('ID de vacuna inválido'),
  body('orden_dosis').isInt({ min: 1 }).withMessage('Orden de dosis debe ser un número positivo'),
  body('edad_recomendada').notEmpty().isString().withMessage('Edad recomendada es requerida'),
  body('descripcion').optional().isString(),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * /api/vaccination-schedules:
 *   get:
 *     summary: Listar todos los esquemas de vacunación
 *     tags: [VaccinationSchedules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de esquemas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VaccinationSchedule'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', [authenticate, checkRole(['director', 'administrador'])], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Esquema_Vacunacion');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/vaccination-schedules/{id}:
 *   get:
 *     summary: Obtener un esquema de vacunación por ID
 *     tags: [VaccinationSchedules]
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
 *         description: Esquema obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VaccinationSchedule'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Esquema no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [authenticate, checkRole(['director', 'administrador']), validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_esquema', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Esquema_Vacunacion WHERE id_esquema = @id_esquema');
    if (result.recordset.length === 0) {
      const error = new Error('Esquema no encontrado');
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
 * /api/vaccination-schedules:
 *   post:
 *     summary: Crear un nuevo esquema de vacunación
 *     tags: [VaccinationSchedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccinationScheduleInput'
 *     responses:
 *       201:
 *         description: Esquema creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_esquema:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/',
  [authenticate, checkRole(['director', 'administrador']), validateVaccinationSchedule],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_vacuna', sql.UniqueIdentifier, req.body.id_vacuna)
        .input('orden_dosis', sql.Int, req.body.orden_dosis)
        .input('edad_recomendada', sql.NVarChar, req.body.edad_recomendada)
        .input('descripcion', sql.NVarChar, req.body.descripcion)
        .execute('sp_CrearEsquemaVacunacion');
      res.status(201).json({ id_esquema: result.recordset[0].id_esquema });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/vaccination-schedules/{id}:
 *   put:
 *     summary: Actualizar un esquema de vacunación
 *     tags: [VaccinationSchedules]
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
 *             $ref: '#/components/schemas/VaccinationScheduleInput'
 *     responses:
 *       204:
 *         description: Esquema actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Esquema no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id',
  [authenticate, checkRole(['director', 'administrador']), validateUUID, validateVaccinationSchedule],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_esquema', sql.UniqueIdentifier, req.params.id)
        .input('id_vacuna', sql.UniqueIdentifier, req.body.id_vacuna)
        .input('orden_dosis', sql.Int, req.body.orden_dosis)
        .input('edad_recomendada', sql.NVarChar, req.body.edad_recomendada)
        .input('descripcion', sql.NVarChar, req.body.descripcion)
        .execute('sp_ActualizarEsquemaVacunacion');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/vaccination-schedules/{id}:
 *   delete:
 *     summary: Eliminar un esquema de vacunación
 *     tags: [VaccinationSchedules]
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
 *         description: Esquema eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Esquema no encontrado
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
        .input('id_esquema', sql.UniqueIdentifier, req.params.id)
        .query('DELETE FROM Esquema_Vacunacion WHERE id_esquema = @id_esquema'); // Nota: No hay stored procedure, usar DELETE directo
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;