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

const validateCenter = [
  body('nombre_centro').notEmpty().isString().withMessage('Nombre del centro es requerido'),
  body('nombre_corto').optional().isString().withMessage('Nombre corto debe ser una cadena válida'),
  body('direccion').optional().isString().withMessage('Dirección debe ser una cadena válida'),
  body('latitud').optional().isFloat().withMessage('Latitud inválida'),
  body('longitud').optional().isFloat().withMessage('Longitud inválida'),
  body('telefono')
    .optional()
    .isString()
    .matches(/^\+?[\d\s\-()]{7,15}$/)
    .withMessage('Teléfono debe ser un número válido (e.g., +1-809-532-0001)'),
  body('director').optional().isString().withMessage('Director debe ser una cadena válida'),
  body('sitio_web').optional().isURL().withMessage('Sitio web inválido'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * openapi: 3.0.3
 * info:
 *   title: Vaccination Centers API
 *   description: API para la gestión de centros de vacunación y niños asociados
 *   version: 1.0.0
 * servers:
 *   - url: /api
 *     description: Base URL for the API
 * components:
 *   schemas:
 *     Center:
 *       type: object
 *       properties:
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: Identificador único del centro de vacunación
 *           example: "3031019A-8658-4567-B284-D610A8AC7766"
 *         nombre_centro:
 *           type: string
 *           description: Nombre completo del centro
 *           example: "Hospital Darío Contreras"
 *         nombre_corto:
 *           type: string
 *           nullable: true
 *           description: Nombre abreviado del centro
 *           example: "HDC"
 *         direccion:
 *           type: string
 *           nullable: true
 *           description: Dirección del centro
 *           example: "Av. Independencia 257, Santo Domingo"
 *         latitud:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Latitud del centro
 *           example: 18.4824
 *         longitud:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Longitud del centro
 *           example: -69.9269
 *         telefono:
 *           type: string
 *           nullable: true
 *           description: Teléfono del centro
 *           example: "+1-809-532-0001"
 *         director:
 *           type: string
 *           nullable: true
 *           description: Nombre del director del centro
 *           example: "Dr. Juan Gómez"
 *         sitio_web:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Sitio web del centro
 *           example: "http://www.hospitaldariocontreras.do"
 *         estado:
 *           type: string
 *           description: Estado del centro (e.g., Activo, Inactivo)
 *           example: "Activo"
 *       required:
 *         - id_centro
 *         - nombre_centro
 *         - estado
 *     CenterInput:
 *       type: object
 *       properties:
 *         nombre_centro:
 *           type: string
 *           description: Nombre completo del centro
 *           example: "Hospital Darío Contreras"
 *         nombre_corto:
 *           type: string
 *           nullable: true
 *           description: Nombre abreviado del centro
 *           example: "HDC"
 *         direccion:
 *           type: string
 *           nullable: true
 *           description: Dirección del centro
 *           example: "Av. Independencia 257, Santo Domingo"
 *         latitud:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Latitud del centro
 *           example: 18.4824
 *         longitud:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Longitud del centro
 *           example: -69.9269
 *         telefono:
 *           type: string
 *           nullable: true
 *           description: Teléfono del centro
 *           example: "+1-809-532-0001"
 *         director:
 *           type: string
 *           nullable: true
 *           description: Nombre del director del centro
 *           example: "Dr. Juan Gómez"
 *         sitio_web:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Sitio web del centro
 *           example: "http://www.hospitaldariocontreras.do"
 *       required:
 *         - nombre_centro
 *     Patient:
 *       type: object
 *       properties:
 *         id_paciente:
 *           type: string
 *           format: uuid
 *           description: Identificador único del niño
 *           example: "4A3B2C1D-1234-5678-9012-3456789ABCDE"
 *         nombre_completo:
 *           type: string
 *           description: Nombre completo del niño
 *           example: "Juan Pérez"
 *         identificacion:
 *           type: string
 *           description: Identificación del niño
 *           example: "ID001"
 *         nacionalidad:
 *           type: string
 *           description: Nacionalidad del niño
 *           example: "Dominicano"
 *         pais_nacimiento:
 *           type: string
 *           description: País de nacimiento del niño
 *           example: "República Dominicana"
 *         fecha_nacimiento:
 *           type: string
 *           format: date
 *           description: Fecha de nacimiento del niño
 *           example: "2018-05-20"
 *         genero:
 *           type: string
 *           description: Género del niño (M/F)
 *           example: "M"
 *         direccion_residencia:
 *           type: string
 *           description: Dirección de residencia del niño
 *           example: "Calle 1, Santo Domingo"
 *         latitud:
 *           type: number
 *           format: float
 *           description: Latitud de la dirección
 *           example: 18.4824
 *         longitud:
 *           type: number
 *           format: float
 *           description: Longitud de la dirección
 *           example: -69.9269
 *         id_centro_salud:
 *           type: string
 *           format: uuid
 *           description: ID del centro de vacunación asociado
 *           example: "3031019A-8658-4567-B284-D610A8AC7766"
 *         contacto_principal:
 *           type: string
 *           description: Contacto principal (e.g., Madre, Padre)
 *           example: "Madre"
 *         id_salud_nacional:
 *           type: string
 *           description: ID de salud nacional
 *           example: "SN001"
 *         estado:
 *           type: string
 *           description: Estado del niño (e.g., Activo, Inactivo)
 *           example: "Activo"
 *         tutores:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id_tutor:
 *                 type: string
 *                 format: uuid
 *                 description: Identificador único del tutor
 *                 example: "123e4567-e89b-12d3-a456-426614174008"
 *               nombre:
 *                 type: string
 *                 description: Nombre del tutor
 *                 example: "Juan Pérez"
 *               relacion:
 *                 type: string
 *                 description: Relación con el niño
 *                 example: "Padre"
 *               nacionalidad:
 *                 type: string
 *                 description: Nacionalidad del tutor
 *                 example: "Dominicano"
 *               identificacion:
 *                 type: string
 *                 description: Identificación del tutor
 *                 example: "002-7654321-15"
 *               telefono:
 *                 type: string
 *                 description: Teléfono del tutor
 *                 example: "809-555-4321"
 *               email:
 *                 type: string
 *                 description: Email del tutor
 *                 example: "juan.perez@example.com"
 *               direccion:
 *                 type: string
 *                 description: Dirección del tutor
 *                 example: "Calle 2, La Romana"
 *               tipo_relacion:
 *                 type: string
 *                 description: Tipo de relación (e.g., Padre1, TutorLegal)
 *                 example: "Padre1"
 *               estado:
 *                 type: string
 *                 description: Estado del tutor
 *                 example: "Activo"
 *             required:
 *               - id_tutor
 *               - nombre
 *               - relacion
 *               - nacionalidad
 *               - identificacion
 *               - telefono
 *               - email
 *               - direccion
 *               - tipo_relacion
 *               - estado
 *       required:
 *         - id_paciente
 *         - nombre_completo
 *         - identificacion
 *         - nacionalidad
 *         - pais_nacimiento
 *         - fecha_nacimiento
 *         - genero
 *         - direccion_residencia
 *         - latitud
 *         - longitud
 *         - id_centro_salud
 *         - contacto_principal
 *         - id_salud_nacional
 *         - estado
 *         - tutores
 * tags:
 *   - name: Centers
 *     description: Gestión de centros de vacunación
 */

/**
 * @swagger
 * /api/centers:
 *   get:
 *     summary: Listar todos los centros de vacunación
 *     tags: [Centers]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al obtener centros
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo centros de vacunación', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Centros_Vacunacion WHERE estado = \'Activo\'');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener centros', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener centros');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/centers/{id}:
 *   get:
 *     summary: Obtener un centro de vacunación por ID
 *     tags: [Centers]
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
 *         description: Centro obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Center'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Validación fallida
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *                       location:
 *                         type: string
 *       404:
 *         description: Centro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Centro no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al obtener centro
 */
router.get('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo centro por ID', { id: req.params.id, ip: req.ip });
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
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Centros_Vacunacion WHERE id_centro = @id_centro');
    if (result.recordset.length === 0) {
      logger.warn('Centro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Centro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener centro', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/centers:
 *   post:
 *     summary: Crear un nuevo centro de vacunación
 *     tags: [Centers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CenterInput'
 *           example:
 *             nombre_centro: "Hospital Darío Contreras"
 *             nombre_corto: "HDC"
 *             direccion: "Av. Independencia 257, Santo Domingo"
 *             latitud: 18.4824
 *             longitud: -69.9269
 *             telefono: "+1-809-532-0001"
 *             director: "Dr. Juan Gómez"
 *             sitio_web: "http://www.hospitaldariocontreras.do"
 *     responses:
 *       201:
 *         description: Centro creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Center'
 *             example:
 *               id_centro: "3031019A-8658-4567-B284-D610A8AC7766"
 *               nombre_centro: "Hospital Darío Contreras"
 *               nombre_corto: "HDC"
 *               direccion: "Av. Independencia 257, Santo Domingo"
 *               latitud: 18.4824
 *               longitud: -69.9269
 *               telefono: "+1-809-532-0001"
 *               director: "Dr. Juan Gómez"
 *               sitio_web: "http://www.hospitaldariocontreras.do"
 *               estado: "Activo"
 *       400:
 *         description: Error en los datos enviados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Validación fallida
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *                       location:
 *                         type: string
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al crear centro
 */
router.post('/', validateCenter, async (req, res, next) => {
  try {
    logger.info('Creando centro de vacunación', { nombre: req.body.nombre_centro, ip: req.ip });
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
      .input('nombre_centro', sql.NVarChar, req.body.nombre_centro)
      .input('nombre_corto', sql.NVarChar, req.body.nombre_corto || null)
      .input('direccion', sql.NVarChar, req.body.direccion || null)
      .input('latitud', sql.Decimal(9, 6), req.body.latitud ?? null)
      .input('longitud', sql.Decimal(9, 6), req.body.longitud ?? null)
      .input('telefono', sql.NVarChar, req.body.telefono || null)
      .input('director', sql.NVarChar, req.body.director || null)
      .input('sitio_web', sql.NVarChar, req.body.sitio_web || null)
      .execute('sp_CrearCentroVacunacion');
    const newCenter = result.recordset[0];
    res.status(201).json(newCenter);
  } catch (err) {
    logger.error('Error al crear centro', { error: err.message, ip: req.ip });
    const error = new Error('Error al crear centro');
    error.statusCode = err.number === 50001 ? 400 : 500;
    error.data = err.message;
    next(error);
  }
});

/**
 * @swagger
 * /api/centers/{id}:
 *   put:
 *     summary: Actualizar un centro de vacunación
 *     tags: [Centers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro de vacunación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CenterInput'
 *           example:
 *             nombre_centro: "Hospital Darío Contreras"
 *             nombre_corto: "HDC"
 *             direccion: "Av. Independencia 257, Santo Domingo"
 *             latitud: 18.4824
 *             longitud: -69.9269
 *             telefono: "+1-809-532-0001"
 *             director: "Dr. Juan Gómez"
 *             sitio_web: "http://www.hospitaldariocontreras.do"
 *     responses:
 *       204:
 *         description: Centro actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Validación fallida
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *                       location:
 *                         type: string
 *       404:
 *         description: Centro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Centro no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al actualizar centro
 */
router.put('/:id', [validateUUID, validateCenter], async (req, res, next) => {
  try {
    logger.info('Actualando centro', { id: req.params.id, nombre: req.body.nombre_centro, ip: req.ip });
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
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro');
    if (exists.recordset.length === 0) {
      logger.warn('Centro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Centro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .input('nombre_centro', sql.NVarChar, req.body.nombre_centro)
      .input('nombre_corto', sql.NVarChar, req.body.nombre_corto || null)
      .input('direccion', sql.NVarChar, req.body.direccion || null)
      .input('latitud', sql.Decimal(9, 6), req.body.latitud ?? null)
      .input('longitud', sql.Decimal(9, 6), req.body.longitud ?? null)
      .input('telefono', sql.NVarChar, req.body.telefono || null)
      .input('director', sql.NVarChar, req.body.director || null)
      .input('sitio_web', sql.NVarChar, req.body.sitio_web || null)
      .execute('sp_ActualizarCentroVacunacion');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar centro', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/centers/{id}:
 *   delete:
 *     summary: Eliminar un centro de vacunación
 *     tags: [Centers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro de vacunación
 *     responses:
 *       204:
 *         description: Centro eliminado exitosamente
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Validación fallida
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *                       location:
 *                         type: string
 *       404:
 *         description: Centro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Centro no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al eliminar centro
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando centro', { id: req.params.id, ip: req.ip });
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
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro');
    if (exists.recordset.length === 0) {
      logger.warn('Centro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Centro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarCentroVacunacion');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar centro', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/centers/{id}/patients:
 *   get:
 *     summary: Obtener todos los niños asociados a un centro de vacunación
 *     tags: [Centers]
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
 *                 $ref: '#/components/schemas/Patient'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Validación fallida
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *                       location:
 *                         type: string
 *       404:
 *         description: Centro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Centro no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al obtener niños
 */
router.get('/:id/patients', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo niños por centro', { id: req.params.id, ip: req.ip });
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
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Centros_Vacunacion WHERE id_centro = @id_centro');
    if (exists.recordset.length === 0) {
      logger.warn('Centro no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Centro no encontrado');
      error.statusCode = 404;
      throw error;
    }
    const result = await pool
      .request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerNinosPorCentro');
    const jsonString = result.recordset[0][Object.keys(result.recordset[0])[0]];
    const patients = JSON.parse(jsonString);
    res.status(200).json(patients);
  } catch (err) {
    logger.error('Error al obtener niños', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

module.exports = router;