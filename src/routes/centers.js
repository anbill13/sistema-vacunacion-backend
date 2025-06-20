const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, checkRole } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Centers
 *   description: Gestión de centros de vacunación
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Center:
 *       type: object
 *       required:
 *         - nombre_centro
 *       properties:
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: Identificador único del centro
 *         nombre_centro:
 *           type: string
 *           description: Nombre completo del centro
 *         nombre_corto:
 *           type: string
 *           description: Nombre corto del centro (opcional)
 *         direccion:
 *           type: string
 *           description: Dirección del centro (opcional)
 *         latitud:
 *           type: number
 *           description: Latitud del centro (opcional)
 *         longitud:
 *           type: number
 *           description: Longitud del centro (opcional)
 *         telefono:
 *           type: string
 *           description: Teléfono del centro (opcional)
 *         director:
 *           type: string
 *           description: Nombre del director (opcional)
 *         sitio_web:
 *           type: string
 *           description: Sitio web del centro (opcional)
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del centro
 *       example:
 *         id_centro: "123e4567-e89b-12d3-a456-426614174002"
 *         nombre_centro: "Centro de Vacunación Central"
 *         nombre_corto: "CVC"
 *         direccion: "Calle Principal 123, Ciudad"
 *         latitud: 18.4667
 *         longitud: -69.9333
 *         telefono: "809-555-1234"
 *         director: "Dr. Juan Pérez"
 *         sitio_web: "http://cvc.example.com"
 *         estado: "Activo"
 *     CenterInput:
 *       type: object
 *       required:
 *         - nombre_centro
 *       properties:
 *         nombre_centro:
 *           type: string
 *         nombre_corto:
 *           type: string
 *           nullable: true
 *         direccion:
 *           type: string
 *           nullable: true
 *         latitud:
 *           type: number
 *           nullable: true
 *         longitud:
 *           type: number
 *           nullable: true
 *         telefono:
 *           type: string
 *           nullable: true
 *         director:
 *           type: string
 *           nullable: true
 *         sitio_web:
 *           type: string
 *           nullable: true
 *     Child:
 *       type: object
 *       required:
 *         - nombre
 *         - id_centro
 *       properties:
 *         id_nino:
 *           type: string
 *           format: uuid
 *           description: Identificador único del niño
 *         nombre:
 *           type: string
 *           description: Nombre del niño
 *         fecha_nacimiento:
 *           type: string
 *           format: date
 *           description: Fecha de nacimiento del niño
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro asociado
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del niño
 *       example:
 *         id_nino: "123e4567-e89b-12d3-a456-426614174003"
 *         nombre: "Ana López"
 *         fecha_nacimiento: "2018-05-15"
 *         id_centro: "123e4567-e89b-12d3-a456-426614174002"
 *         estado: "Activo"
 */

const validateCenter = [
  body('nombre_centro').notEmpty().isString().withMessage('Nombre del centro es requerido'),
  body('nombre_corto').optional().isString(),
  body('direccion').optional().isString(),
  body('latitud').optional().isFloat().withMessage('Latitud inválida'),
  body('longitud').optional().isFloat().withMessage('Longitud inválida'),
  body('telefono').optional().isString(),
  body('director').optional().isString(),
  body('sitio_web').optional().isURL().withMessage('Sitio web inválido'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * /api/centers:
 *   get:
 *     summary: Listar todos los centros de vacunación
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de centros obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Center'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', [authenticate, checkRole(['director', 'administrador'])], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Centros_Vacunacion');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/centers/{id}:
 *   get:
 *     summary: Obtener un centro de vacunación por ID
 *     tags: [Centers]
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
 *         description: Centro obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Center'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Centro no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [authenticate, checkRole(['director', 'administrador']), validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Centros_Vacunacion WHERE id_centro = @id_centro');
    if (result.recordset.length === 0) {
      const error = new Error('Centro no encontrado');
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
 * /api/centers:
 *   post:
 *     summary: Crear un nuevo centro de vacunación
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CenterInput'
 *     responses:
 *       201:
 *         description: Centro creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_centro:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/',
  [authenticate, checkRole(['director', 'administrador']), validateCenter],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('nombre_centro', sql.NVarChar, req.body.nombre_centro)
        .input('nombre_corto', sql.NVarChar, req.body.nombre_corto)
        .input('direccion', sql.NVarChar, req.body.direccion)
        .input('latitud', sql.Decimal(9, 6), req.body.latitud)
        .input('longitud', sql.Decimal(9, 6), req.body.longitud)
        .input('telefono', sql.NVarChar, req.body.telefono)
        .input('director', sql.NVarChar, req.body.director)
        .input('sitio_web', sql.NVarChar, req.body.sitio_web)
        .execute('sp_CrearCentroVacunacion');
      res.status(201).json({ id_centro: result.recordset[0].id_centro });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/centers/{id}:
 *   put:
 *     summary: Actualizar un centro de vacunación
 *     tags: [Centers]
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
 *             $ref: '#/components/schemas/CenterInput'
 *     responses:
 *       204:
 *         description: Centro actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Centro no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id',
  [authenticate, checkRole(['director', 'administrador']), validateUUID, validateCenter],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_centro', sql.UniqueIdentifier, req.params.id)
        .input('nombre_centro', sql.NVarChar, req.body.nombre_centro)
        .input('nombre_corto', sql.NVarChar, req.body.nombre_corto)
        .input('direccion', sql.NVarChar, req.body.direccion)
        .input('latitud', sql.Decimal(9, 6), req.body.latitud)
        .input('longitud', sql.Decimal(9, 6), req.body.longitud)
        .input('telefono', sql.NVarChar, req.body.telefono)
        .input('director', sql.NVarChar, req.body.director)
        .input('sitio_web', sql.NVarChar, req.body.sitio_web)
        .execute('sp_ActualizarCentroVacunacion');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/centers/{id}:
 *   delete:
 *     summary: Eliminar un centro de vacunación
 *     tags: [Centers]
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
 *         description: Centro eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Centro no encontrado
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
        .input('id_centro', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarCentroVacunacion');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/centers/{id}/children:
 *   get:
 *     summary: Obtener todos los niños asociados a un centro de vacunación
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro de vacunación
 *     responses:
 *       200:
 *         description: Lista de niños obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Child'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Centro no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  '/:id/children',
  [authenticate, checkRole(['director', 'administrador']), validateUUID],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_centro', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerNinosPorCentro');

      if (result.recordset.length === 0) {
        const error = new Error('No se encontraron niños para este centro');
        error.statusCode = 404;
        throw error;
      }

      res.status(200).json(result.recordset);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;