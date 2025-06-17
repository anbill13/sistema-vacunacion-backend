const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { poolPromise, sql } = require('../config/db');
const authenticate = require('../middleware/auth');
const checkRole = require('../middleware/role');

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
 *   name: Centers
 *   description: Gestión de centros de vacunación
 */

/**
 * @swagger
 * /api/centers:
 *   post:
 *     summary: Crea un nuevo centro de vacunación
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     ...
 */
router.post(
  '/',
  authenticate,
  checkRole(['director', 'administrador']),
  [
    body('nombre_centro').isString().trim().notEmpty().withMessage('nombre_centro is required'),
    body('nombre_corto').optional().isString().trim().withMessage('Invalid nombre_corto'),
    body('direccion').optional().isString().trim().withMessage('Invalid direccion'),
    body('latitud').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitud'),
    body('longitud').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitud'),
    body('telefono').optional().isString().trim().withMessage('Invalid telefono'),
    body('director').optional().isString().trim().withMessage('Invalid director'),
    body('sitio_web').optional().isURL().withMessage('Invalid sitio_web'),
  ],
  validate,
  async (req, res, next) => {
    const { nombre_centro, nombre_corto, direccion, latitud, longitud, telefono, director, sitio_web } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('nombre_centro', sql.NVarChar, nombre_centro)
        .input('nombre_corto', sql.NVarChar, nombre_corto || null)
        .input('direccion', sql.NVarChar, direccion || null)
        .input('latitud', sql.Decimal(9, 6), latitud || null)
        .input('longitud', sql.Decimal(9, 6), longitud || null)
        .input('telefono', sql.NVarChar, telefono || null)
        .input('director', sql.NVarChar, director || null)
        .input('sitio_web', sql.NVarChar, sitio_web || null)
        .execute('sp_CrearCentroVacunacion');

      res.status(201).json({ message: 'Center created', id_centro: result.recordset[0].id_centro });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/centers:
 *   get:
 *     summary: Obtiene todos los centros de vacunación
 *     tags: [Centers]
 *     responses:
 *       200:
 *         description: Lista de centros de vacunación
 *         ...
 */
router.get('/', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().execute('sp_ObtenerCentrosVacunacion');
    res.status(200).json(result.recordset);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/centers/{id}:
 *   get:
 *     summary: Obtiene un centro de vacunación por ID
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     ...
 */
router.get(
  '/:id',
  authenticate,
  checkRole(['director', 'administrador']),
  [param('id').isUUID().withMessage('Invalid UUID')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_centro', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerCentroVacunacion');

      if (result.recordset.length === 0) {
        const error = new Error('Center not found');
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
 * /api/centers/{id}:
 *   put:
 *     summary: Actualiza un centro de vacunación
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     ...
 */
router.put(
  '/:id',
  authenticate,
  checkRole(['director', 'administrador']),
  [
    param('id').isUUID().withMessage('Invalid UUID'),
    body('nombre_centro').isString().trim().notEmpty().withMessage('nombre_centro is required'),
    body('nombre_corto').optional().isString().trim().withMessage('Invalid nombre_corto'),
    body('direccion').optional().isString().trim().withMessage('Invalid direccion'),
    body('latitud').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitud'),
    body('longitud').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitud'),
    body('telefono').optional().isString().trim().withMessage('Invalid telefono'),
    body('director').optional().isString().trim().withMessage('Invalid director'),
    body('sitio_web').optional().isURL().withMessage('Invalid sitio_web'),
  ],
  validate,
  async (req, res, next) => {
    const { nombre_centro, nombre_corto, direccion, latitud, longitud, telefono, director, sitio_web } = req.body;

    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_centro', sql.UniqueIdentifier, req.params.id)
        .input('nombre_centro', sql.NVarChar, nombre_centro)
        .input('nombre_corto', sql.NVarChar, nombre_corto || null)
        .input('direccion', sql.NVarChar, direccion || null)
        .input('latitud', sql.Decimal(9, 6), latitud || null)
        .input('longitud', sql.Decimal(9, 6), longitud || null)
        .input('telefono', sql.NVarChar, telefono || null)
        .input('director', sql.NVarChar, director || null)
        .input('sitio_web', sql.NVarChar, sitio_web || null)
        .execute('sp_ActualizarCentroVacunacion');

      res.json({ message: 'Center updated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/centers/{id}:
 *   delete:
 *     summary: Elimina un centro de vacunación
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     ...
 */
router.delete(
  '/:id',
  authenticate,
  checkRole(['director', 'administrador']),
  [param('id').isUUID().withMessage('Invalid UUID')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_centro', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarCentroVacunacion');

      res.json({ message: 'Center deleted' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
