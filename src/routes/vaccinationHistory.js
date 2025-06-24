const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { poolPromise, sql } = require('../config/db'); // Ensure this path is correct
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
    .withMessage('Sitio de aplicación debe ser una cadena válida (máximo 100 caracteres)'),
  body('observaciones')
    .optional({ nullable: true })
    .isString()
    .withMessage('Observaciones debe ser una cadena válida'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

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
 *           nullable: true
 *         fecha_vacunacion:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la vacunación
 *         dosis_aplicada:
 *           type: integer
 *           description: Número de dosis aplicada
 *         sitio_aplicacion:
 *           type: string
 *           description: Sitio de aplicación (opcional, cualquier texto hasta 100 caracteres)
 *           nullable: true
 *         observaciones:
 *           type: string
 *           description: Observaciones (opcional, cualquier texto)
 *           nullable: true
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
 *         id_niño: "123e4567-e89b-12d3-a456-426614174006"
 *         id_lote: "123e4567-e89b-12d3-a456-426614174018"
 *         id_usuario: "123e4567-e89b-12d3-a456-426614174005"
 *         id_centro: "123e4567-e89b-12d3-a456-426614174007"
 *         fecha_vacunacion: "2025-06-20T14:00:00Z"
 *         dosis_aplicada: 1
 *         sitio_aplicacion: "Espalda"
 *         observaciones: "Paciente se movió durante la aplicación, pero la vacunación fue exitosa."
 *         nombre_vacuna: "Vacuna contra el sarampión"
 *         nombre_centro: "Centro de Salud Central"
 *         usuario_responsable: "Dr. Juan Pérez"
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
 *       example:
 *         id_niño: "123e4567-e89b-12d3-a456-426614174006"
 *         id_lote: "123e4567-e89b-12d3-a456-426614174018"
 *         id_usuario: "123e4567-e89b-12d3-a456-426614174005"
 *         id_centro: "123e4567-e89b-12d3-a456-426614174007"
 *         fecha_vacunacion: "2025-06-20T14:00:00Z"
 *         dosis_aplicada: 1
 *         sitio_aplicacion: "Espalda"
 *         observaciones: "Vacunación exitosa"
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
 *           nullable: true
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
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo historiales de vacunación', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Historial_Vacunacion_Alterna');
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener historiales de vacunación', { error: err.message, ip: req.ip });
    const error = new Error('Error al obtener historiales de vacunación');
    error.statusCode = 500;
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
 *       404:
 *         description: Historial no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/by-id/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo historial de vacunación por ID', { id: req.params.id, ip: req.ip });
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
      .input('id_historial', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Historial_Vacunacion_Alterna WHERE id_historial = @id_historial');
    if (result.recordset.length === 0) {
      logger.warn('Historial no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Historial no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    logger.error('Error al obtener historial de vacunación', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
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
 *       404:
 *         description: Historial no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/by-child/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Obteniendo historial de vacunación por ID de niño', { id_niño: req.params.id, ip: req.ip });
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
      .input('id_niño', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Historial_Vacunacion_Alterna WHERE id_niño = @id_niño');
    if (result.recordset.length === 0) {
      logger.warn('Historial no encontrado para el niño', { id_niño: req.params.id, ip: req.ip });
      const error = new Error('Historial no encontrado');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(result.recordset);
  } catch (err) {
    logger.error('Error al obtener historial de vacunación por niño', { id_niño: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
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
 *       404:
 *         description: Recurso no encontrado (ej. niño, lote, usuario, centro)
 *       409:
 *         description: Conflicto (ej. stock de vacuna insuficiente)
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateVaccination, async (req, res, next) => {
  try {
    logger.info('Creando historial de vacunación', { id_niño: req.body.id_niño, id_lote: req.body.id_lote, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida en vacunación', { errors: errors.array(), body: req.body, ip: req.ip });
      const error = new Error('Validación de entrada fallida');
      error.statusCode = 400;
      error.data = errors.array();
      throw error;
    }

    // Check for concerning observations
    const concerningKeywords = ['ojo', 'accidente', 'error', 'herida', 'incidente'];
    if (req.body.observaciones && concerningKeywords.some(keyword => req.body.observaciones.toLowerCase().includes(keyword))) {
      logger.warn('Observaciones contienen contenido preocupante', { observaciones: req.body.observaciones, ip: req.ip });
      const error = new Error('Las observaciones contienen contenido no permitido. Por favor, use el endpoint /api/incidentes para reportar incidentes.');
      error.statusCode = 400;
      throw error;
    }

    const pool = await poolPromise;
    logger.info('Executing sp_RegistrarVacunacion_Alterna with parameters', {
      id_niño: req.body.id_niño,
      id_lote: req.body.id_lote,
      id_usuario: req.body.id_usuario,
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
      .input('observaciones', sql.NVarChar(sql.MAX), req.body.observaciones || null)
      .execute('sp_RegistrarVacunacion_Alterna');
    res.status(201).json({ id_historial: result.recordset[0].id_historial });
  } catch (err) {
    logger.error('Error al crear historial de vacunación', {
      error: err.message,
      originalError: err.originalError ? err.originalError.message : null,
      number: err.originalError ? err.originalError.number : null,
      ip: req.ip
    });

    let errorMessage = 'Error interno del servidor al registrar la vacunación.';
    let statusCode = 500;

    if (err.originalError) {
      const sqlError = err.originalError;
      errorMessage = sqlError.message;

      if (errorMessage.includes('La dosis aplicada debe ser un número positivo')) {
        statusCode = 400;
      } else if (
        errorMessage.includes('El ID del niño no existe en la base de datos') ||
        errorMessage.includes('El ID del usuario no existe en la base de datos') ||
        errorMessage.includes('El ID del centro no existe en la base de datos') ||
        errorMessage.includes('El ID del lote no existe en la base de datos')
      ) {
        statusCode = 404;
      } else if (errorMessage.includes('El lote de vacuna no tiene stock suficiente')) {
        statusCode = 409;
      } else if (sqlError.number === 547) {
        errorMessage = 'Error de integridad de datos. Asegúrese de que todos los IDs existan.';
        statusCode = 400;
      } else {
        statusCode = 500;
      }
    } else if (err.statusCode) {
      errorMessage = err.message;
      statusCode = err.statusCode;
    }

    const error = new Error(errorMessage);
    error.statusCode = statusCode;
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
 *       404:
 *         description: Historial no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [validateUUID, validateVaccination], async (req, res, next) => {
  try {
    logger.info('Actualizando historial de vacunación', { id: req.params.id, id_niño: req.body.id_niño, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida', { id: req.params.id, errors: errors.array(), ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = errors.array();
      throw error;
    }

    const concerningKeywords = ['ojo', 'accidente', 'error', 'herida', 'incidente'];
    if (req.body.observaciones && concerningKeywords.some(keyword => req.body.observaciones.toLowerCase().includes(keyword))) {
      logger.warn('Observaciones contienen contenido preocupante', { observaciones: req.body.observaciones, ip: req.ip });
      const error = new Error('Las observaciones contienen contenido no permitido. Por favor, use el endpoint /api/incidentes para reportar incidentes.');
      error.statusCode = 400;
      throw error;
    }

    const pool = await poolPromise;
    const exists = await pool
      .request()
      .input('id_historial', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Historial_Vacunacion_Alterna WHERE id_historial = @id_historial');
    if (exists.recordset.length === 0) {
      logger.warn('Historial no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Historial no encontrado');
      error.statusCode = 404;
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
      .input('observaciones', sql.NVarChar(sql.MAX), req.body.observaciones || null)
      .execute('sp_ActualizarHistorialVacunacion_Alterna');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar historial de vacunación', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
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
 *       404:
 *         description: Historial no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', validateUUID, async (req, res, next) => {
  try {
    logger.info('Eliminando historial de vacunación', { id: req.params.id, ip: req.ip });
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
      .input('id_historial', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM Historial_Vacunacion_Alterna WHERE id_historial = @id_historial');
    if (exists.recordset.length === 0) {
      logger.warn('Historial no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Historial no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_historial', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarHistorialVacunacion_Alterna');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar historial de vacunación', { id: req.params.id, error: err.message, ip: req.ip });
    err.statusCode = err.statusCode || 500;
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
 *       404:
 *         description: Historial de vacunación no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/incidentes', validateIncidente, async (req, res, next) => {
  try {
    logger.info('Creando incidente', { id_historial: req.body.id_historial, ip: req.ip });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida en incidente', { errors: errors.array(), body: req.body, ip: req.ip });
      const error = new Error('Validación fallida');
      error.statusCode = 400;
      error.data = errors.array();
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
      originalError: err.originalError ? err.originalError.message : null,
      ip: req.ip
    });

    let errorMessage = 'Error interno del servidor al registrar el incidente.';
    let statusCode = 500;

    if (err.originalError) {
      const sqlError = err.originalError;
      errorMessage = sqlError.message;

      if (errorMessage.includes('El ID del historial no existe en la base de datos')) {
        statusCode = 404;
      } else if (sqlError.number && sqlError.severity >= 16) {
        statusCode = 400;
      }
    } else if (err.statusCode) {
      errorMessage = err.message;
      statusCode = err.statusCode;
    }

    const error = new Error(errorMessage);
    error.statusCode = statusCode;
    next(error);
  }
});

module.exports = router;