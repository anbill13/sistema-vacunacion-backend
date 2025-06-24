const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { poolPromise, sql } = require('../config/db'); // Ensure this path points to your SQL Server config
const winston = require('winston');

const router = express.Router();

// Configure Winston logger
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

// Validation rules for vaccination history
const validateVaccination = [
  body('id_niño').isUUID().withMessage('ID de niño inválido'),
  body('id_lote').isUUID().withMessage('ID de lote inválido'),
  body('id_usuario').isUUID().withMessage('ID de usuario inválido'),
  body('id_centro').optional({ nullable: true }).isUUID().withMessage('ID de centro inválido'),
  body('fecha_vacunacion').isISO8601().withMessage('Fecha de vacunación inválida'),
  body('dosis_aplicada').isInt({ min: 1 }).withMessage('Dosis aplicada debe ser un número positivo'),
  body('sitio_aplicacion')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 100 })
    .withMessage('Sitio de aplicación debe ser una cadena válida (máximo 100 caracteres)')
    .custom((value) => {
      if (!value) return true;
      const validSites = ['Brazo izquierdo', 'Brazo derecho', 'Muslo izquierdo', 'Muslo derecho'];
      if (!validSites.includes(value)) {
        throw new Error('Sitio de aplicación debe ser uno de: ' + validSites.join(', '));
      }
      return true;
    }),
  body('observaciones')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 4000 }) // Added max length for observaciones
    .withMessage('Observaciones debe ser una cadena válida (máximo 4000 caracteres)'),
];

// Validation for UUID parameters
const validateUUID = param('id').isUUID().withMessage('ID inválido');

// Validation rules for incidents
const validateIncidente = [
  body('descripcion').isString().notEmpty().withMessage('Descripción es obligatoria'),
  body('fecha_reporte').isISO8601().withMessage('Fecha de reporte inválida'),
  body('id_historial').optional({ nullable: true }).isUUID().withMessage('ID de historial inválido'),
];

/**
 * @swagger
 * tags:
 *   - name: Vaccinations
 *     description: Gestión de vacunaciones
 *   - name: Incidentes
 *     description: Gestión de incidentes relacionados con vacunaciones
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
 *         - id_usuario
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
 *         id_usuario:
 *           type: string
 *           format: uuid
 *           description: ID del usuario que registra la vacunación
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
 *           description: Sitio de aplicación (opcional, e.g., Brazo izquierdo, Brazo derecho)
 *         observaciones:
 *           type: string
 *           description: Observaciones (opcional, máximo 4000 caracteres)
 *         nombre_vacuna:
 *           type: string
 *           description: Nombre de la vacuna
 *         nombre_centro:
 *           type: string
 *           description: Nombre del centro
 *         usuario_responsable:
 *           type: string
 *           description: Nombre del usuario responsable
 *       example:
 *         id_historial: "123e4567-e89b-12d3-a456-426614174019"
 *         id_niño: "d63f6a52-f23a-4d67-bb87-2c4fc2cc481d"
 *         id_lote: "08d96d9b-0001-4000-a111-000000000001"
 *         id_usuario: "512ba4d5-98e9-4c60-bcbb-374491b48d74"
 *         id_centro: "71e89e1a-1324-44b4-85f2-4b341af9d02e"
 *         fecha_vacunacion: "2025-06-24T16:31:41.851Z"
 *         dosis_aplicada: 2
 *         sitio_aplicacion: "Brazo izquierdo"
 *         observaciones: "Paciente se movió durante la aplicación, pero la vacunación fue exitosa sin incidentes."
 *         nombre_vacuna: "Vacuna contra el sarampión"
 *         nombre_centro: "Centro de Salud Central"
 *         usuario_responsable: "Dr. Ana Gómez"
 *     VaccinationHistoryInput:
 *       type: object
 *       required:
 *         - id_niño
 *         - id_lote
 *         - id_usuario
 *         - fecha_vacunacion
 *         - dosis_aplicada
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *         id_lote:
 *           type: string
 *           format: uuid
 *         id_usuario:
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
 *     Incidente:
 *       type: object
 *       required:
 *         - descripcion
 *         - fecha_reporte
 *       properties:
 *         id_incidente:
 *           type: string
 *           format: uuid
 *           description: Identificador único del incidente
 *         id_historial:
 *           type: string
 *           format: uuid
 *           description: ID del historial de vacunación relacionado (opcional)
 *         descripcion:
 *           type: string
 *           description: Descripción del incidente
 *         fecha_reporte:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora del reporte
 *       example:
 *         id_incidente: "987e4567-e89b-12d3-a456-426614174020"
 *         id_historial: "123e4567-e89b-12d3-a456-426614174019"
 *         descripcion: "Error durante la aplicación de la vacuna, se requiere revisión."
 *         fecha_reporte: "2025-06-24T16:35:00Z"
 */

/**
 * @swagger
 * /api/vaccination-history:
 *   get:
 *     summary: Listar todos los historiales de vacunación
 *     tags: [Vaccinations]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo historiales de vacunación', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Historial_Vacunacion');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener historiales de vacunación', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener historiales de vacunación');
    error.statusCode = 500;
    error.data = { error: error.message };
    next(error);
  }
});

/**
 * @swagger
 * /api/vaccination-history/by-id/{id}:
 *   get:
 *     summary: Obtener un historial de vacunación por ID
 *     tags: [Vaccinations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del historial de vacunación
 *     responses:
 *       200:
 *         description: Historial obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VaccinationHistory'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Historial no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/by-id/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo historial de vacunación por ID', { id: req.params.id, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { id: req.params.id, errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = { error: error.message, details: errors.array() };
      throw error;
    }
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_historial', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Historial_Vacunacion WHERE id_historial = @id_historial');
    if (result.recordset.length === 0) {
      logger.warn('Historial no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Historial no encontrado');
      error.statusCode = 404;
      error.data = { error: error.message };
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener historial de vacunación', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    err.data = err.data || { error: err.message };
    next(err);
  }
});

/**
 * @swagger
 * /api/vaccination-history/by-child/:id:
 *   get:
 *     summary: Obtener el historial de vacunación por ID de niño
 *     tags: [Vaccinations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del niño
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Historial no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/by-child/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo historial de vacunación por ID de niño', { id_niño: req.params.id, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { id: req.params.id, errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = { error: error.message, details: errors.array() };
      throw error;
    }
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_niño', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerHistorialVacunacion');
    if (result.recordset.length === 0) {
      logger.warn('Historial no encontrado para el niño', { id_niño: req.params.id, ip: req.ip });
      const error = new Error('Historial no encontrado');
      error.statusCode = 404;
      error.data = { error: error.message };
      throw error;
    }
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener historial de vacunación por niño', { id_niño: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    err.data = err.data || { error: err.message };
    next(err);
  }
});

/**
 * @swagger
 * /api/vaccination-history:
 *   post:
 *     summary: Registrar una nueva vacunación
 *     tags: [Vaccinations]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/', validateVaccination, async (req, res, next) => {
  try {
    logger.info('Creando historial de vacunación', { id_niño: req.body.id_niño, id_lote: req.body.id_lote, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida en vacunación', { errors: errors.array(), body: req.body, ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = { error: error.message, details: errors.array() };
      throw error;
    }

    // Flag concerning observations
    const concerningKeywords = ['ojo', 'accidente', 'error', 'herida', 'incidente'];
    if (req.body.observaciones && concerningKeywords.some(keyword => req.body.observaciones.toLowerCase().includes(keyword))) {
      logger.warn('Observaciones contienen contenido preocupante', { observaciones: req.body.observaciones, ip: req.ip });
      const error = new Error('Las observaciones contienen contenido no permitido. Por favor, use el endpoint /api/incidentes para reportar incidentes.');
      error.statusCode = 400;
      error.data = { error: error.message };
      throw error;
    }

    const pool = await poolPromise;
    logger.info('Executing sp_RegistrarVacunacion with parameters', {
      id_niño: req.body.id_niño,
      id_lote: req.body.id_lote,
      id_usuario: req.body.id_usuario,
      id_centro: req.body.id_centro,
      fecha_vacunacion: req.body.fecha_vacunacion,
      dosis_aplicada: req.body.dosis_aplicada,
      sitio_aplicacion: req.body.sitio_aplicacion,
      observaciones: req.body.observaciones,
      ip: req.ip
    });
    const result = await pool
      .request()
      .input('id_niño', sql.UniqueIdentifier, req.body.id_niño)
      .input('id_lote', sql.UniqueIdentifier, req.body.id_lote)
      .input('id_usuario', sql.UniqueIdentifier, req.body.id_usuario)
      .input('id_centro', sql.UniqueIdentifier, req.body.id_centro || null)
      .input('fecha_vacunacion', sql.DateTime2, req.body.fecha_vacunacion)
      .input('dosis_aplicada', sql.Int, req.body.dosis_aplicada)
      .input('sitio_aplicacion', sql.NVarChar(100), req.body.sitio_aplicacion || null)
      .input('observaciones', sql.NVarChar(4000), req.body.observaciones || null) // Updated to match max length
      .execute('sp_RegistrarVacunacion');
    res.status(201).json({ id_historial: result.recordset[0].id_historial });
  } catch (err) {
    logger.error('Error al crear historial de vacunación', {
      error: err.message,
      number: err.number,
      ip: req.ip
    });

    let errorMessage = 'Error al registrar la vacunación';
    let statusCode = 500;
    let errorData = { error: errorMessage };

    switch (err.number) {
      case 50001:
        errorMessage = 'El ID del niño no existe en la base de datos';
        statusCode = 400;
        break;
      case 50002:
        errorMessage = 'El ID del lote no existe en la base de datos';
        statusCode = 400;
        break;
      case 50003:
        errorMessage = 'El lote de vacuna no tiene stock suficiente';
        statusCode = 400;
        break;
      case 50004:
        errorMessage = 'El ID del usuario no existe en la base de datos';
        statusCode = 400;
        break;
      case 50005:
        errorMessage = 'El ID del centro no existe en la base de datos';
        statusCode = 400;
        break;
      case 50006:
        errorMessage = 'La dosis aplicada debe ser un número positivo';
        statusCode = 400;
        break;
      case 50007:
        errorMessage = 'El sitio de aplicación debe ser uno de: Brazo izquierdo, Brazo derecho, Muslo izquierdo, Muslo derecho';
        statusCode = 400;
        break;
      case 547:
        errorMessage = 'Error de integridad: verifique que los IDs existan';
        statusCode = 400;
        break;
      default:
        errorMessage = 'Error inesperado al registrar la vacunación';
        statusCode = 500;
        break;
    }

    const error = new Error(errorMessage);
    error.statusCode = statusCode;
    error.data = errorData;
    next(error);
  }
});

/**
 * @swagger
 * /api/vaccination-history/{id}:
 *   put:
 *     summary: Actualizar un historial de vacunación
 *     tags: [Vaccinations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del historial de vacunación
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Historial no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.put('/:id', [validateUUID, validateVaccination], async (req, res, next) => {
  try {
    logger.info('Actualizando historial de vacunación', { id: req.params.id, id_niño: req.body.id_niño, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { id: req.params.id, errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = { error: error.message, details: errors.array() };
      throw error;
    }

    const concerningKeywords = ['ojo', 'accidente', 'error', 'herida', 'incidente'];
    if (req.body.observaciones && concerningKeywords.some(keyword => req.body.observaciones.toLowerCase().includes(keyword))) {
      logger.warn('Observaciones contienen contenido preocupante', { observaciones: req.body.observaciones, ip: req.ip });
      const error = new Error('Las observaciones contienen contenido no permitido. Por favor, use el endpoint /api/incidentes para reportar incidentes.');
      error.statusCode = 400;
      error.data = { error: error.message };
      throw error;
    }

    const pool = await poolPromise;
    const exists = await pool
      .request()
      .input('id_historial', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Historial_Vacunacion WHERE id_historial = @id_historial');
    if (exists.recordset.length === 0) {
      logger.warn('Historial no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Historial no encontrado');
      error.statusCode = 404;
      error.data = { error: error.message };
      throw error;
    }
    await pool
      .request()
      .input('id_historial', sql.UniqueIdentifier, req.params.id)
      .input('id_niño', sql.UniqueIdentifier, req.body.id_niño)
      .input('id_lote', sql.UniqueIdentifier, req.body.id_lote)
      .input('id_usuario', sql.UniqueIdentifier, req.body.id_usuario)
      .input('id_centro', sql.UniqueIdentifier, req.body.id_centro || null)
      .input('fecha_vacunacion', sql.DateTime2, req.body.fecha_vacunacion)
      .input('dosis_aplicada', sql.Int, req.body.dosis_aplicada)
      .input('sitio_aplicacion', sql.NVarChar(100), req.body.sitio_aplicacion || null)
      .input('observaciones', sql.NVarChar(4000), req.body.observaciones || null)
      .execute('sp_ActualizarHistorialVacunacion');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar historial de vacunación', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    err.data = err.data || { error: err.message };
    next(err);
  }
});

/**
 * @swagger
 * /api/vaccination-history/{id}:
 *   delete:
 *     summary: Eliminar un historial de vacunación
 *     tags: [Vaccinations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del historial de vacunación
 *     responses:
 *       204:
 *         description: Historial eliminado exitosamente
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Historial no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando historial de vacunación', { id: req.params.id, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { id: req.params.id, errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = { error: error.message, details: errors.array() };
      throw error;
    }
    const pool = await poolPromise;
    const exists = await pool
      .request()
      .input('id_historial', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Historial_Vacunacion WHERE id_historial = @id_historial');
    if (exists.recordset.length === 0) {
      logger.warn('Historial no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Historial no encontrado');
      error.statusCode = 404;
      error.data = { error: error.message };
      throw error;
    }
    await pool
      .request()
      .input('id_historial', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarHistorialVacunacion');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar historial de vacunación', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
    err.data = err.data || { error: err.message };
    next(err);
  }
});

/**
 * @swagger
 * /api/incidentes:
 *   post:
 *     summary: Registrar un nuevo incidente
 *     tags: [Incidentes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Incidente'
 *     responses:
 *       201:
 *         description: Incidente registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_incidente:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/incidentes', validateIncidente, async (req, res, next) => {
  try {
    logger.info('Creando incidente', { id_historial: req.body.id_historial, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida en incidente', { errors: errors.array(), body: req.body, ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = { error: error.message, details: errors.array() };
      throw error;
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_historial', sql.UniqueIdentifier, req.body.id_historial || null)
      .input('descripcion', sql.NVarChar(sql.MAX), req.body.descripcion)
      .input('fecha_reporte', sql.DateTime2, req.body.fecha_reporte)
      .execute('sp_RegistrarIncidente');
    res.status(201).json({ id_incidente: result.recordset[0].id_incidente });
  } catch (err) {
    logger.error('Error al crear incidente', {
      error: err.message,
      number: err.number,
      ip: req.ip
    });

    let errorMessage = 'Error al registrar el incidente';
    let statusCode = 500;
    let errorData = { error: errorMessage };

    switch (err.number) {
      case 50008:
        errorMessage = 'El ID del historial no existe en la base de datos';
        statusCode = 400;
        break;
      case 547:
        errorMessage = 'Error de integridad: verifique que el ID de historial exista';
        statusCode = 400;
        break;
      default:
        errorMessage = 'Error inesperado al registrar el incidente';
        statusCode = 500;
        break;
    }

    const error = new Error(errorMessage);
    error.statusCode = statusCode;
    error.data = errorData;
    next(err);
  }
});

module.exports = router;