const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, checkRole } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Vaccinations
 *   description: Gestión de vacunaciones
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     VaccinationHistory:
 *       type: object
 *       required:
 *         - id_niño
 *         - id_lote
 *         - id_personal
 *         - fecha_vacunacion
 *         - dosis_aplicada
 *       properties:
 *         id_historial:
 *           type: string
 *           format: uuid
 *           description: Identificador único del historial
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: ID del niño
 *         id_lote:
 *           type: string
 *           format: uuid
 *           description: ID del lote de vacuna
 *         id_personal:
 *           type: string
 *           format: uuid
 *           description: ID del personal de salud
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro de vacunación (opcional)
 *         fecha_vacunacion:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la vacunación
 *         dosis_aplicada:
 *           type: integer
 *           description: Número de dosis aplicada
 *         sitio_aplicacion:
 *           type: string
 *           description: Sitio de aplicación (opcional)
 *         observaciones:
 *           type: string
 *           description: Observaciones (opcional)
 *         nombre_vacuna:
 *           type: string
 *           description: Nombre de la vacuna
 *         nombre_centro:
 *           type: string
 *           description: Nombre del centro
 *         personal_responsable:
 *           type: string
 *           description: Nombre del personal responsable
 *     VaccinationHistoryInput:
 *       type: object
 *       required:
 *         - id_niño
 *         - id_lote
 *         - id_personal
 *         - fecha_vacunacion
 *         - dosis_aplicada
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *         id_lote:
 *           type: string
 *           format: uuid
 *         id_personal:
 *           type: string
 *           format: uuid
 *         id_centro:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         fecha_vacunacion:
 *           type: string
 *           format: date-time
 *         dosis_aplicada:
 *           type: integer
 *         sitio_aplicacion:
 *           type: string
 *           nullable: true
 *         observaciones:
 *           type: string
 *           nullable: true
 */

const validateVaccination = [
  body('id_niño').isUUID().withMessage('ID de niño inválido'),
  body('id_lote').isUUID().withMessage('ID de lote inválido'),
  body('id_personal').isUUID().withMessage('ID de personal inválido'),
  body('id_centro').optional().isUUID().withMessage('ID de centro inválido'),
  body('fecha_vacunacion').isISO8601().withMessage('Fecha de vacunación inválida'),
  body('dosis_aplicada').isInt({ min: 1 }).withMessage('Dosis aplicada debe ser un número positivo'),
  body('sitio_aplicacion').optional().isString(),
  body('observaciones').optional().isString(),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * /api/vaccination-history:
 *   get:
 *     summary: Listar todos los historiales de vacunación
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de historiales obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VaccinationHistory'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', [authenticate, checkRole(['doctor', 'administrador'])], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Historial_Vacunacion');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/vaccination-history/{id}:
 *   get:
 *     summary: Obtener un historial de vacunación por ID
 *     tags: [Vaccinations]
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
 *         description: Historial obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VaccinationHistory'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Historial no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [authenticate, checkRole(['doctor', 'administrador']), validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_historial', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Historial_Vacunacion WHERE id_historial = @id_historial');
    if (result.recordset.length === 0) {
      const error = new Error('Historial no encontrado');
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
 * /api/vaccination-history:
 *   post:
 *     summary: Registrar una nueva vacunación
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccinationHistoryInput'
 *     responses:
 *       201:
 *         description: Vacunación registrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_historial:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/',
  [authenticate, checkRole(['doctor', 'administrador']), validateVaccination],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, req.body.id_niño)
        .input('id_lote', sql.UniqueIdentifier, req.body.id_lote)
        .input('id_personal', sql.UniqueIdentifier, req.body.id_personal)
        .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
        .input('fecha_vacunacion', sql.DateTime2, req.body.fecha_vacunacion)
        .input('dosis_aplicada', sql.Int, req.body.dosis_aplicada)
        .input('sitio_aplicacion', sql.NVarChar, req.body.sitio_aplicacion)
        .input('observaciones', sql.NVarChar, req.body.observaciones)
        .execute('sp_RegistrarVacunacion');
      res.status(201).json({ id_historial: result.recordset[0].id_historial });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/vaccination-history/{id}:
 *   put:
 *     summary: Actualizar un historial de vacunación
 *     tags: [Vaccinations]
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
 *             $ref: '#/components/schemas/VaccinationHistoryInput'
 *     responses:
 *       204:
 *         description: Historial actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Historial no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id',
  [authenticate, checkRole(['doctor', 'administrador']), validateUUID, validateVaccination],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_historial', sql.UniqueIdentifier, req.params.id)
        .input('id_niño', sql.UniqueIdentifier, req.body.id_niño)
        .input('id_lote', sql.UniqueIdentifier, req.body.id_lote)
        .input('id_personal', sql.UniqueIdentifier, req.body.id_personal)
        .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
        .input('fecha_vacunacion', sql.DateTime2, req.body.fecha_vacunacion)
        .input('dosis_aplicada', sql.Int, req.body.dosis_aplicada)
        .input('sitio_aplicacion', sql.NVarChar, req.body.sitio_aplicacion)
        .input('observaciones', sql.NVarChar, req.body.observaciones)
        .query('UPDATE Historial_Vacunacion SET id_niño = @id_niño, id_lote = @id_lote, id_personal = @id_personal, id_centro = @id_centro, fecha_vacunacion = @fecha_vacunacion, dosis_aplicada = @dosis_aplicada, sitio_aplicacion = @sitio_aplicacion, observaciones = @observaciones WHERE id_historial = @id_historial'); // Nota: No hay stored procedure, usar UPDATE directo
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/vaccination-history/{id}:
 *   delete:
 *     summary: Eliminar un historial de vacunación
 *     tags: [Vaccinations]
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
 *         description: Historial eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Historial no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete(
  '/:id',
  [authenticate, checkRole(['doctor', 'administrador']), validateUUID],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_historial', sql.UniqueIdentifier, req.params.id)
        .query('DELETE FROM Historial_Vacunacion WHERE id_historial = @id_historial'); // Nota: No hay stored procedure, usar DELETE directo
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/vaccination-history/{id}:
 *   get:
 *     summary: Obtener el historial de vacunación por ID de niño
 *     tags: [Vaccinations]
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
 *         description: Historial obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VaccinationHistory'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Historial no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [authenticate, checkRole(['doctor', 'administrador']), validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_niño', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerHistorialVacunacion');
    if (result.recordset.length === 0) {
      const error = new Error('Historial no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

module.exports = router;