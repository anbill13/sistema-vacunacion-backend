// src/routes/vaccines.js
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

const validateVaccine = [
  body('nombre').notEmpty().isString().withMessage('Nombre es requerido'),
  body('fabricante').notEmpty().isString().withMessage('Fabricante es requerido'),
  body('tipo').notEmpty().isString().withMessage('Tipo es requerido'),
  body('dosis_requeridas').isInt({ min: 1 }).withMessage('Dosis requeridas debe ser un número positivo'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * tags:
 *   name: Vaccines
 *   description: Gestión de vacunas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Vaccine:
 *       type: object
 *       required:
 *         - nombre
 *         - fabricante
 *         - tipo
 *         - dosis_requeridas
 *       properties:
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la vacuna
 *         nombre:
 *           type: string
 *           description: Nombre de la vacuna
 *         fabricante:
 *           type: string
 *           description: Fabricante de la vacuna
 *         tipo:
 *           type: string
 *           description: Tipo de vacuna
 *         dosis_requeridas:
 *           type: integer
 *           description: Número de dosis requeridas
 *       example:
 *         id_vacuna: "123e4567-e89b-12d3-a456-426614174008"
 *         nombre: "Pfizer-BioNTech"
 *         fabricante: "Pfizer"
 *         tipo: "ARNm"
 *         dosis_requeridas: 2
 *     VaccineInput:
 *       type: object
 *       required:
 *         - nombre
 *         - fabricante
 *         - tipo
 *         - dosis_requeridas
 *       properties:
 *         nombre:
 *           type: string
 *         fabricante:
 *           type: string
 *         tipo:
 *           type: string
 *         dosis_requeridas:
 *           type: integer
 */

/**
 * @swagger
 * /api/vaccines:
 *   get:
 *     summary: Listar todas las vacunas
 *     tags: [Vaccines]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de vacunas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Vaccine'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: No autorizado (requiere rol director o administrador)
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo vacunas', { ip: req.ip, user: req.user?.username });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Vacunas');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener vacunas', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener vacunas');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/vaccines/{id}:
 *   get:
 *     summary: Obtener una vacuna por ID
 *     tags: [Vaccines]
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
 *         description: Vacuna obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vaccine'
 *       400:
 *         description: ID inválido
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: No autorizado (requiere rol director o administrador)
 *       404:
 *         description: Vacuna no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo vacuna por ID', { id: req.params.id, ip: req.ip, user: req.user?.username });
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
      .input('id_vacuna', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Vacunas WHERE id_vacuna = @id_vacuna');
    if (result.recordset.length === 0) {
      logger.warn('Vacuna no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Vacuna no encontrada');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener vacuna', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/vaccines:
 *   post:
 *     summary: Crear una nueva vacuna
 *     tags: [Vaccines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccineInput'
 *     responses:
 *       201:
 *         description: Vacuna creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_vacuna:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: No autorizado (requiere rol director o administrador)
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateVaccine, async (req, res, next) => {
  try {
    logger.info('Creando vacuna', { nombre: req.body.nombre, ip: req.ip, user: req.user?.username });
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
      .input('nombre', sql.NVarChar, req.body.nombre)
      .input('fabricante', sql.NVarChar, req.body.fabricante)
      .input('tipo', sql.NVarChar, req.body.tipo)
      .input('dosis_requeridas', sql.Int, req.body.dosis_requeridas)
      .execute('sp_CrearVacuna');
    res.status(201).json({ id_vacuna: result.recordset[0].id_vacuna });
  } catch (err) {
    logger.error('Error al crear vacuna', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear vacuna');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/vaccines/{id}:
 *   put:
 *     summary: Actualizar una vacuna
 *     tags: [Vaccines]
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
 *             $ref: '#/components/schemas/VaccineInput'
 *     responses:
 *       204:
 *         description: Vacuna actualizada exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: No autorizado (requiere rol director o administrador)
 *       404:
 *         description: Vacuna no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [validateUUID, validateVaccine], async (req, res, next) => {
  try {
    logger.info('Actualizando vacuna', { id: req.params.id, nombre: req.body.nombre, ip: req.ip, user: req.user?.username });
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
      .input('id_vacuna', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Vacunas WHERE id_vacuna = @id_vacuna');
    if (exists.recordset.length === 0) {
      logger.warn('Vacuna no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Vacuna no encontrada');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_vacuna', sql.UniqueIdentifier, req.params.id)
      .input('nombre', sql.NVarChar, req.body.nombre)
      .input('fabricante', sql.NVarChar, req.body.fabricante)
      .input('tipo', sql.NVarChar, req.body.tipo)
      .input('dosis_requeridas', sql.Int, req.body.dosis_requeridas)
      .execute('sp_ActualizarVacuna');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar vacuna', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/vaccines/{id}:
 *   delete:
 *     summary: Eliminar una vacuna
 *     tags: [Vaccines]
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
 *         description: Vacuna eliminada exitosamente
 *       400:
 *         description: ID inválido
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: No autorizado (requiere rol director o administrador)
 *       404:
 *         description: Vacuna no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando vacuna', { id: req.params.id, ip: req.ip, user: req.user?.username });
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
      .input('id_vacuna', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Vacunas WHERE id_vacuna = @id_vacuna');
    if (exists.recordset.length === 0) {
      logger.warn('Vacuna no encontrada', { id: req.params.id, ip: req.ip });
      const error = new Error('Vacuna no encontrada');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_vacuna', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarVacuna');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar vacuna', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;