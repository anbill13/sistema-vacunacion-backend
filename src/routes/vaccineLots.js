const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, checkRole } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: VaccineBatches
 *   description: Gestión de lotes de vacunas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     VaccineBatch:
 *       type: object
 *       required:
 *         - id_vacuna
 *         - numero_lote
 *         - cantidad_total
 *         - cantidad_disponible
 *         - fecha_fabricacion
 *         - fecha_vencimiento
 *         - id_centro
 *       properties:
 *         id_lote:
 *           type: string
 *           format: uuid
 *           description: Identificador único del lote
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *           description: ID de la vacuna
 *         numero_lote:
 *           type: string
 *           description: Número de lote
 *         cantidad_total:
 *           type: integer
 *           description: Cantidad total de dosis
 *         cantidad_disponible:
 *           type: integer
 *           description: Cantidad disponible de dosis
 *         fecha_fabricacion:
 *           type: string
 *           format: date
 *           description: Fecha de fabricación
 *         fecha_vencimiento:
 *           type: string
 *           format: date
 *           description: Fecha de vencimiento
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro
 *         condiciones_almacenamiento:
 *           type: string
 *           description: Condiciones de almacenamiento (opcional)
 *     VaccineBatchInput:
 *       type: object
 *       required:
 *         - id_vacuna
 *         - numero_lote
 *         - cantidad_total
 *         - cantidad_disponible
 *         - fecha_fabricacion
 *         - fecha_vencimiento
 *         - id_centro
 *       properties:
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *         numero_lote:
 *           type: string
 *         cantidad_total:
 *           type: integer
 *         cantidad_disponible:
 *           type: integer
 *         fecha_fabricacion:
 *           type: string
 *           format: date
 *         fecha_vencimiento:
 *           type: string
 *           format: date
 *         id_centro:
 *           type: string
 *           format: uuid
 *         condiciones_almacenamiento:
 *           type: string
 *           nullable: true
 */

const validateVaccineBatch = [
  body('id_vacuna').isUUID().withMessage('ID de vacuna inválido'),
  body('numero_lote').notEmpty().isString().withMessage('Número de lote es requerido'),
  body('cantidad_total').isInt({ min: 1 }).withMessage('Cantidad total debe ser un número positivo'),
  body('cantidad_disponible').isInt({ min: 0 }).withMessage('Cantidad disponible debe ser un número no negativo'),
  body('fecha_fabricacion').isDate().withMessage('Fecha de fabricación inválida'),
  body('fecha_vencimiento').isDate().withMessage('Fecha de vencimiento inválida'),
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('condiciones_almacenamiento').optional().isString(),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * /api/vaccine-lots:
 *   get:
 *     summary: Listar todos los lotes de vacunas
 *     tags: [VaccineBatches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de lotes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VaccineBatch'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', [authenticate, checkRole(['director', 'administrador'])], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Lotes_Vacunas');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/vaccine-lots/{id}:
 *   get:
 *     summary: Obtener un lote de vacunas por ID
 *     tags: [VaccineBatches]
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
 *         description: Lote obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VaccineBatch'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Lote no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [authenticate, checkRole(['director', 'administrador']), validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_lote', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Lotes_Vacunas WHERE id_lote = @id_lote');
    if (result.recordset.length === 0) {
      const error = new Error('Lote no encontrado');
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
 * /api/vaccine-lots:
 *   post:
 *     summary: Crear un nuevo lote de vacunas
 *     tags: [VaccineBatches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccineBatchInput'
 *     responses:
 *       201:
 *         description: Lote creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_lote:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/',
  [authenticate, checkRole(['director', 'administrador']), validateVaccineBatch],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_vacuna', sql.UniqueIdentifier, req.body.id_vacuna)
        .input('numero_lote', sql.NVarChar, req.body.numero_lote)
        .input('cantidad_total', sql.Int, req.body.cantidad_total)
        .input('cantidad_disponible', sql.Int, req.body.cantidad_disponible)
        .input('fecha_fabricacion', sql.Date, req.body.fecha_fabricacion)
        .input('fecha_vencimiento', sql.Date, req.body.fecha_vencimiento)
        .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
        .input('condiciones_almacenamiento', sql.NVarChar, req.body.condiciones_almacenamiento)
        .execute('sp_CrearLoteVacuna');
      res.status(201).json({ id_lote: result.recordset[0].id_lote });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/vaccine-lots/{id}:
 *   put:
 *     summary: Actualizar un lote de vacunas
 *     tags: [VaccineBatches]
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
 *             $ref: '#/components/schemas/VaccineBatchInput'
 *     responses:
 *       204:
 *         description: Lote actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Lote no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id',
  [authenticate, checkRole(['director', 'administrador']), validateUUID, validateVaccineBatch],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_lote', sql.UniqueIdentifier, req.params.id)
        .input('id_vacuna', sql.UniqueIdentifier, req.body.id_vacuna)
        .input('numero_lote', sql.NVarChar, req.body.numero_lote)
        .input('cantidad_total', sql.Int, req.body.cantidad_total)
        .input('cantidad_disponible', sql.Int, req.body.cantidad_disponible)
        .input('fecha_fabricacion', sql.Date, req.body.fecha_fabricacion)
        .input('fecha_vencimiento', sql.Date, req.body.fecha_vencimiento)
        .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
        .input('condiciones_almacenamiento', sql.NVarChar, req.body.condiciones_almacenamiento)
        .execute('sp_ActualizarLoteVacuna');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/vaccine-lots/{id}:
 *   delete:
 *     summary: Eliminar un lote de vacunas
 *     tags: [VaccineBatches]
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
 *         description: Lote eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Lote no encontrado
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
        .input('id_lote', sql.UniqueIdentifier, req.params.id)
        .query('DELETE FROM Lotes_Vacunas WHERE id_lote = @id_lote'); // Nota: No hay stored procedure, usar DELETE directo
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;