const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { poolPromise, sql } = require('../config/db');
const winston = require('winston');

const router = express.Router();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

const validateUUID = param('id').isUUID().withMessage('ID inválido');

const validateCountry = [
  body('nombre_pais').notEmpty().isString().withMessage('Nombre del país es requerido'),
  body('codigo_iso').notEmpty().isString().withMessage('Código ISO es requerido'),
  body('estado').isIn(['Activo', 'Inactivo']).withMessage('Estado inválido'),
];

/**
 * @swagger
 * tags:
 *   name: Countries
 *   description: API endpoints for managing countries
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Country:
 *       type: object
 *       properties:
 *         id_pais:
 *           type: string
 *           format: uuid
 *         nombre_pais:
 *           type: string
 *         codigo_iso:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *       required:
 *         - id_pais
 *         - nombre_pais
 *         - codigo_iso
 *         - estado
 *       example:
 *         id_pais: "123e4567-e89b-12d3-a456-426614174020"
 *         nombre_pais: "España"
 *         codigo_iso: "ESP"
 *         estado: "Activo"
 *     CountryInput:
 *       type: object
 *       properties:
 *         nombre_pais:
 *           type: string
 *         codigo_iso:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *       required:
 *         - nombre_pais
 *         - codigo_iso
 *         - estado
 */

/**
 * @swagger
 * /api/countries:
 *   get:
 *     summary: Retrieve all countries
 *     tags: [Countries]
 *     responses:
 *       200:
 *         description: A list of countries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Country'
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo países', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().execute('sp_ListarPaises');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener países', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener países');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/countries/{id}:
 *   get:
 *     summary: Retrieve a country by ID
 *     tags: [Countries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the country
 *     responses:
 *       200:
 *         description: Country details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Country'
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Country not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo país por ID', { id: req.params.id, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { id: req.params.id, errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = errors.array();
      throw error;
    }
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_pais', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerPaisPorId');
    if (result.recordset.length === 0) {
      logger.warn('País no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('País no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener país', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/countries:
 *   post:
 *     summary: Create a new country
 *     tags: [Countries]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CountryInput'
 *     responses:
 *       201:
 *         description: Country created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_pais:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Bad request (e.g., missing required fields)
 *       500:
 *         description: Internal server error
 */
router.post('/', validateCountry, async (req, res, next) => {
  try {
    logger.info('Creando país', { nombre: req.body.nombre_pais, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = errors.array();
      throw error;
    }
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('nombre_pais', sql.NVarChar, req.body.nombre_pais)
      .input('codigo_iso', sql.NVarChar, req.body.codigo_iso)
      .input('estado', sql.NVarChar, req.body.estado)
      .execute('sp_CrearPais');
    res.status(201).json({ id_pais: result.recordset[0].id_pais });
  } catch (err) {
    logger.error('Error al crear país', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear país');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/countries/{id}:
 *   put:
 *     summary: Update an existing country
 *     tags: [Countries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the country to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CountryInput'
 *     responses:
 *       204:
 *         description: Country updated successfully
 *       400:
 *         description: Bad request (e.g., missing required fields)
 *       404:
 *         description: Country not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', [validateUUID, validateCountry], async (req, res, next) => {
  try {
    logger.info('Actualizando país', { id: req.params.id, nombre: req.body.nombre_pais, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { id: req.params.id, errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = errors.array();
      throw error;
    }
    const pool = await poolPromise;
    const exists = await pool
      .request()
      .input('id_pais', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Paises WHERE id_pais = @id_pais');
    if (exists.recordset.length === 0) {
      logger.warn('País no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('País no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_pais', sql.UniqueIdentifier, req.params.id)
      .input('nombre_pais', sql.NVarChar, req.body.nombre_pais)
      .input('codigo_iso', sql.NVarChar, req.body.codigo_iso)
      .input('estado', sql.NVarChar, req.body.estado)
      .execute('sp_ActualizarPais');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar país', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/countries/{id}:
 *   delete:
 *     summary: Delete a country
 *     tags: [Countries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the country to delete
 *     responses:
 *       204:
 *         description: Country deleted successfully
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Country not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando país', { id: req.params.id, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { id: req.params.id, errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = errors.array();
      throw error;
    }
    const pool = await poolPromise;
    const exists = await pool
      .request()
      .input('id_pais', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Paises WHERE id_pais = @id_pais');
    if (exists.recordset.length === 0) {
      logger.warn('País no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('País no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_pais', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarPais');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar país', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;