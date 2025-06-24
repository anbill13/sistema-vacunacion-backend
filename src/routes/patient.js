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

// Log to confirm file loading
console.log('patients.js loaded at', new Date().toISOString());

/**
 * @swagger
 * tags:
 *   name: Patients
 *   description: Gestión de pacientes (niños)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Patient:
 *       type: object
 *       required:
 *         - nombre_completo
 *         - identificacion
 *         - nacionalidad
 *         - pais_nacimiento
 *         - fecha_nacimiento
 *         - genero
 *       properties:
 *         id_paciente:
 *           type: string
 *           format: uuid
 *           description: Identificador único del paciente
 *         nombre_completo:
 *           type: string
 *           description: Nombre completo del paciente
 *         identificacion:
 *           type: string
 *           description: Identificación del paciente
 *         nacionalidad:
 *           type: string
 *           description: Gentilicio del país de nacionalidad
 *         pais_nacimiento:
 *           type: string
 *           description: Nombre del país de nacimiento
 *         fecha_nacimiento:
 *           type: string
 *           format: date
 *           description: Fecha de nacimiento
 *         genero:
 *           type: string
 *           enum: [M, F, O]
 *           description: Género del paciente
 *         direccion_residencia:
 *           type: string
 *           description: Dirección de residencia (opcional)
 *           nullable: true
 *         latitud:
 *           type: number
 *           description: Latitud de la residencia (opcional)
 *           nullable: true
 *         longitud:
 *           type: number
 *           description: Longitud de la residencia (opcional)
 *           nullable: true
 *         id_centro_salud:
 *           type: string
 *           format: uuid
 *           description: ID del centro de salud (opcional)
 *           nullable: true
 *         contacto_principal:
 *           type: string
 *           description: Contacto principal (opcional)
 *           nullable: true
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del paciente
 *           nullable: true
 *         tutores:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id_tutor:
 *                 type: string
 *                 format: uuid
 *                 description: Identificador único del tutor
 *               nombre:
 *                 type: string
 *               relacion:
 *                 type: string
 *                 enum: [Madre, Padre, Tutor Legal]
 *               nacionalidad:
 *                 type: string
 *                 description: Gentilicio del país de nacionalidad
 *               identificacion:
 *                 type: string
 *                 nullable: true
 *               telefono:
 *                 type: string
 *                 nullable: true
 *               email:
 *                 type: string
 *                 nullable: true
 *               direccion:
 *                 type: string
 *                 nullable: true
 *               tipo_relacion:
 *                 type: string
 *                 enum: [Padre1, Padre2, TutorLegal]
 *               estado:
 *                 type: string
 *                 enum: [Activo, Inactivo]
 *       example:
 *         id_paciente: "0F7D5047-5B0F-40C6-B8B8-4AA7ECD5EAE0"
 *         nombre_completo: "Pedro Díaz"
 *         identificacion: "PD123456"
 *         nacionalidad: "Dominicano"
 *         pais_nacimiento: "República Dominicana"
 *         fecha_nacimiento: "2013-09-25"
 *         genero: "M"
 *         direccion_residencia: null
 *         latitud: null
 *         longitud: null
 *         id_centro_salud: null
 *         contacto_principal: null
 *         estado: "Activo"
 *         tutores: []
 *     PatientInput:
 *       type: object
 *       required:
 *         - nombre_completo
 *         - identificacion
 *         - nacionalidad
 *         - pais_nacimiento
 *         - fecha_nacimiento
 *         - genero
 *       properties:
 *         nombre_completo:
 *           type: string
 *         identificacion:
 *           type: string
 *         nacionalidad:
 *           type: string
 *           description: Gentilicio del país de nacionalidad
 *         pais_nacimiento:
 *           type: string
 *           description: Nombre del país de nacimiento
 *         fecha_nacimiento:
 *           type: string
 *           format: date
 *         genero:
 *           type: string
 *           enum: [M, F, O]
 *         direccion_residencia:
 *           type: string
 *           nullable: true
 *         latitud:
 *           type: number
 *           nullable: true
 *         longitud:
 *           type: number
 *           nullable: true
 *         id_centro_salud:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         contacto_principal:
 *           type: string
 *           nullable: true
 *         tutores:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               relacion:
 *                 type: string
 *                 enum: [Madre, Padre, Tutor Legal]
 *               nacionalidad:
 *                 type: string
 *                 description: Gentilicio del país de nacionalidad
 *               identificacion:
 *                 type: string
 *                 nullable: true
 *               telefono:
 *                 type: string
 *                 nullable: true
 *               email:
 *                 type: string
 *                 nullable: true
 *               direccion:
 *                 type: string
 *                 nullable: true
 *               tipo_relacion:
 *                 type: string
 *                 enum: [Padre1, Padre2, TutorLegal]
 *                 default: TutorLegal
 *           minItems: 0
 *           maxItems: 3
 *           description: Lista de nuevos tutores (opcional)
 *         tutor_ids:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           minItems: 0
 *           maxItems: 3
 *           description: Lista de IDs de tutores existentes (opcional)
 */

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Obtener todos los pacientes con sus tutores
 *     tags: [Patients]
 *     responses:
 *       200:
 *         description: Lista de pacientes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Patient'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Obteniendo todos los pacientes con tutores', { ip: req.ip });
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        n.id_niño AS id_paciente,
        n.nombre_completo,
        n.identificacion,
        n.nacionalidad,
        n.pais_nacimiento,
        n.fecha_nacimiento,
        n.genero,
        n.direccion_residencia,
        n.latitud,
        n.longitud,
        n.id_centro_salud,
        n.contacto_principal,
        n.estado,
        (
          SELECT 
            t.id_tutor,
            t.nombre,
            t.relacion,
            t.nacionalidad,
            t.identificacion,
            t.telefono,
            t.email,
            t.direccion,
            t.tipo_relacion,
            t.estado
          FROM [dbo].[Tutores] t
          WHERE t.id_niño = n.id_niño
          FOR JSON PATH
        ) AS tutores
      FROM [dbo].[Niños] n
    `);

    if (!result.recordset || result.recordset.length === 0) {
      logger.warn('No patients found in Niños table', { ip: req.ip });
      return res.status(200).json([]);
    }

    const patients = result.recordset.map(row => ({
      id_paciente: row.id_paciente,
      nombre_completo: row.nombre_completo,
      identificacion: row.identificacion,
      nacionalidad: row.nacionalidad,
      pais_nacimiento: row.pais_nacimiento,
      fecha_nacimiento: row.fecha_nacimiento,
      genero: row.genero,
      direccion_residencia: row.direccion_residencia,
      latitud: row.latitud,
      longitud: row.longitud,
      id_centro_salud: row.id_centro_salud,
      contacto_principal: row.contacto_principal,
      estado: row.estado,
      tutores: row.tutores ? JSON.parse(row.tutores) : []
    }));

    logger.info('Patients retrieved successfully', { count: patients.length, ip: req.ip });
    res.status(200).json(patients);
  } catch (err) {
    logger.error('Error al obtener pacientes', { error: err.stack, ip: req.ip });
    const error = new Error('Error al obtener pacientes');
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Crear un nuevo paciente con tutores
 *     tags: [Patients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PatientInput'
 *           example:
 *             nombre_completo: "Pedro Díaz"
 *             identificacion: "PD123456"
 *             nacionalidad: "Dominicano"
 *             pais_nacimiento: "República Dominicana"
 *             fecha_nacimiento: "2013-09-25"
 *             genero: "M"
 *             direccion_residencia: "C. H numero 11, Santo Domingo"
 *             latitud: 18.482554
 *             longitud: -69.970076
 *             id_centro_salud: "71e89e1a-1324-44b4-85f2-4b341af9d02e"
 *             contacto_principal: null
 *             tutores: []
 *             tutor_ids: []
 *     responses:
 *       201:
 *         description: Paciente creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_paciente:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', [
  body('nombre_completo').notEmpty().isString().withMessage('Nombre completo es requerido'),
  body('identificacion').notEmpty().isString().withMessage('Identificación es requerida'),
  body('nacionalidad').notEmpty().isString().withMessage('Nacionalidad es requerida'),
  body('pais_nacimiento').notEmpty().isString().withMessage('País de nacimiento es requerido'),
  body('fecha_nacimiento').isISO8601().withMessage('Fecha de nacimiento inválida'),
  body('genero').isIn(['M', 'F', 'O']).withMessage('Género inválido'),
  body('direccion_residencia').optional().isString().withMessage('Dirección debe ser una cadena válida'),
  body('latitud').optional().isDecimal().withMessage('Latitud inválida'),
  body('longitud').optional().isDecimal().withMessage('Longitud inválida'),
  body('id_centro_salud').optional().isUUID().withMessage('ID de centro inválido'),
  body('contacto_principal').optional().isString().withMessage('Contacto principal debe ser una cadena válida'),
  body('tutores').optional().isArray({ min: 0, max: 3 }).withMessage('Debe asignarse hasta 3 tutores nuevos'),
  body('tutores.*.nombre').optional().notEmpty().isString().withMessage('Nombre del tutor es requerido'),
  body('tutores.*.relacion')
    .optional()
    .customSanitizer(value => {
      if (typeof value === 'string') {
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      }
      return value;
    })
    .isIn(['Madre', 'Padre', 'Tutor Legal']).withMessage('Relación inválida'),
  body('tutores.*.nacionalidad').optional().notEmpty().isString().withMessage('Nacionalidad del tutor es requerida'),
  body('tutores.*.identificacion').optional().isString().withMessage('Identificación del tutor debe ser una cadena válida'),
  body('tutores.*.telefono').optional().isString().withMessage('Teléfono del tutor debe ser una cadena válida'),
  body('tutores.*.email').optional().isEmail().withMessage('Email del tutor debe ser válido'),
  body('tutores.*.direccion').optional().isString().withMessage('Dirección del tutor debe ser una cadena válida'),
  body('tutores.*.tipo_relacion').optional().isIn(['Padre1', 'Padre2', 'TutorLegal']).withMessage('Tipo de relación inválido'),
  body('tutor_ids').optional().isArray({ min: 0, max: 3 }).withMessage('Debe asignarse hasta 3 IDs de tutores existentes'),
  body('tutor_ids.*').optional().isUUID().withMessage('ID de tutor inválido'),
  body('tutores').custom((tutores, { req }) => {
    if (tutores && tutores.length > 0) {
      const roles = tutores.map(t => t.tipo_relacion || 'TutorLegal');
      const roleCount = {};
      roles.forEach(r => { roleCount[r] = (roleCount[r] || 0) + 1; });
      if (roleCount['Padre1'] > 1 || roleCount['Padre2'] > 1 || roleCount['TutorLegal'] > 1) {
        throw new Error('Solo puede haber un Padre1, un Padre2 y un TutorLegal.');
      }
    }
    return true;
  }),
], async (req, res) => {
  try {
    logger.info('Creando paciente con tutores', {
      nombre_completo: req.body.nombre_completo,
      identificacion: req.body.identificacion,
      tutor_count: (req.body.tutores?.length || 0) + (req.body.tutor_ids?.length || 0),
      ip: req.ip
    });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validación fallida en el servidor', { errors: errors.array(), ip: req.ip });
      return res.status(400).json({
        error: 'Validación fallida',
        data: errors.array()
      });
    }

    const pool = await poolPromise;
    const tvpTutores = new sql.Table();
    tvpTutores.columns.add('nombre', sql.NVarChar(200));
    tvpTutores.columns.add('relacion', sql.NVarChar(50));
    tvpTutores.columns.add('nacionalidad', sql.NVarChar(100));
    tvpTutores.columns.add('identificacion', sql.NVarChar(20));
    tvpTutores.columns.add('telefono', sql.NVarChar(20));
    tvpTutores.columns.add('email', sql.NVarChar(100));
    tvpTutores.columns.add('direccion', sql.NVarChar(500));
    tvpTutores.columns.add('tipo_relacion', sql.NVarChar(20));

    if (req.body.tutores && req.body.tutores.length > 0) {
      req.body.tutores.forEach(tutor => {
        tvpTutores.rows.add(
          tutor.nombre,
          tutor.relacion,
          tutor.nacionalidad,
          tutor.identificacion || null,
          tutor.telefono || null,
          tutor.email || null,
          tutor.direccion || null,
          tutor.tipo_relacion || 'TutorLegal'
        );
      });
    }

    const tvpTutorIds = new sql.Table();
    tvpTutorIds.columns.add('id_tutor', sql.UniqueIdentifier);
    if (req.body.tutor_ids && req.body.tutor_ids.length > 0) {
      req.body.tutor_ids.forEach(id => {
        tvpTutorIds.rows.add(id);
      });
    }

    const request = pool.request()
      .input('nombre_completo', sql.NVarChar, req.body.nombre_completo)
      .input('identificacion', sql.NVarChar, req.body.identificacion)
      .input('nacionalidad', sql.NVarChar, req.body.nacionalidad)
      .input('pais_nacimiento', sql.NVarChar, req.body.pais_nacimiento)
      .input('fecha_nacimiento', sql.Date, req.body.fecha_nacimiento)
      .input('genero', sql.Char(1), req.body.genero)
      .input('direccion_residencia', sql.NVarChar, req.body.direccion_residencia || null)
      .input('latitud', sql.Decimal(9, 6), req.body.latitud || null)
      .input('longitud', sql.Decimal(9, 6), req.body.longitud || null)
      .input('id_centro_salud', sql.UniqueIdentifier, req.body.id_centro_salud || null)
      .input('contacto_principal', sql.NVarChar, req.body.contacto_principal || null)
      .input('tutores', tvpTutores)
      .input('tutor_ids', tvpTutorIds);

    const result = await request.execute('sp_CrearNiño');
    const id_niño = result.recordset[0]?.id_niño;

    if (!id_niño) {
      logger.warn('No se obtuvo id_niño del procedimiento almacenado', { ip: req.ip });
      return res.status(500).json({
        error: 'Error interno del servidor',
        data: { message: 'No se pudo crear el paciente' }
      });
    }

    logger.info('Paciente creado exitosamente', { id_niño, ip: req.ip });
    res.status(201).json({ id_paciente: id_niño });
  } catch (err) {
    logger.error('Error al crear paciente', {
      error: err.message,
      stack: err.stack,
      rawError: JSON.stringify(err, Object.getOwnPropertyNames(err)),
      ip: req.ip
    });
    const statusCode = err.number === 50000 ? 400 : 500;
    res.status(statusCode).json({
      error: 'Error al crear paciente',
      data: { message: err.message || 'Error interno del servidor' }
    });
  }
});

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Obtener un paciente por ID con sus tutores
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del paciente
 *     responses:
 *       200:
 *         description: Paciente obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Paciente no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [
  param('id').isUUID().withMessage('ID inválido'),
], async (req, res, next) => {
  try {
    logger.info('Obteniendo paciente por ID con tutores', { id: req.params.id, ip: req.ip });
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
      .input('id_paciente', sql.UniqueIdentifier, req.params.id)
      .query(`
        SELECT 
          n.id_niño AS id_paciente,
          n.nombre_completo,
          n.identificacion,
          n.nacionalidad,
          n.pais_nacimiento,
          n.fecha_nacimiento,
          n.genero,
          n.direccion_residencia,
          n.latitud,
          n.longitud,
          n.id_centro_salud,
          n.contacto_principal,
          n.estado,
          (
            SELECT 
              t.id_tutor,
              t.nombre,
              t.relacion,
              t.nacionalidad,
              t.identificacion,
              t.telefono,
              t.email,
              t.direccion,
              t.tipo_relacion,
              t.estado
            FROM [dbo].[Tutores] t
            WHERE t.id_niño = n.id_niño
            FOR JSON PATH
          ) AS tutores
        FROM [dbo].[Niños] n
        WHERE n.id_niño = @id_paciente
      `);

    if (!result.recordset[0]) {
      logger.warn('Paciente no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Paciente no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const patient = {
      id_paciente: result.recordset[0].id_paciente,
      nombre_completo: result.recordset[0].nombre_completo,
      identificacion: result.recordset[0].identificacion,
      nacionalidad: result.recordset[0].nacionalidad,
      pais_nacimiento: result.recordset[0].pais_nacimiento,
      fecha_nacimiento: result.recordset[0].fecha_nacimiento,
      genero: result.recordset[0].genero,
      direccion_residencia: result.recordset[0].direccion_residencia,
      latitud: result.recordset[0].latitud,
      longitud: result.recordset[0].longitud,
      id_centro_salud: result.recordset[0].id_centro_salud,
      contacto_principal: result.recordset[0].contacto_principal,
      estado: result.recordset[0].estado,
      tutores: result.recordset[0].tutores ? JSON.parse(result.recordset[0].tutores) : []
    };

    res.status(200).json(patient);
  } catch (err) {
    logger.error('Error al obtener paciente', { id: req.params.id, error: err.stack, ip: req.ip });
    const error = new Error(err.message || 'Error al obtener paciente');
    error.statusCode = err.statusCode || 500;
    error.data = err.message ? { message: err.message } : null;
    next(error);
  }
});

/**
 * @swagger
 * /api/patients/{id}:
 *   put:
 *     summary: Actualizar un paciente y sus tutores
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del paciente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PatientInput'
 *     responses:
 *       204:
 *         description: Paciente actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Paciente no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [
  param('id').isUUID().withMessage('ID inválido'),
  body('nombre_completo').optional().notEmpty().isString().withMessage('Nombre completo debe ser una cadena válida'),
  body('identificacion').optional().notEmpty().isString().withMessage('Identificación debe ser una cadena válida'),
  body('nacionalidad').optional().notEmpty().isString().withMessage('Nacionalidad debe ser una cadena válida'),
  body('pais_nacimiento').optional().notEmpty().isString().withMessage('País de nacimiento debe ser una cadena válida'),
  body('fecha_nacimiento').optional().isISO8601().withMessage('Fecha de nacimiento inválida'),
  body('genero').optional().isIn(['M', 'F', 'O']).withMessage('Género inválido'),
  body('direccion_residencia').optional().isString().withMessage('Dirección debe ser una cadena válida'),
  body('latitud').optional().isDecimal().withMessage('Latitud inválida'),
  body('longitud').optional().isDecimal().withMessage('Longitud inválida'),
  body('id_centro_salud').optional().isUUID().withMessage('ID de centro inválido'),
  body('contacto_principal').optional().isString().withMessage('Contacto principal debe ser una cadena válida'),
  body('tutores').optional().isArray({ min: 0, max: 3 }).withMessage('Debe asignarse hasta 3 tutores si se proporciona'),
  body('tutores.*.nombre').optional().notEmpty().isString().withMessage('Nombre del tutor es requerido'),
  body('tutores.*.relacion')
    .optional()
    .customSanitizer(value => {
      if (typeof value === 'string') {
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      }
      return value;
    })
    .isIn(['Madre', 'Padre', 'Tutor Legal']).withMessage('Relación inválida'),
  body('tutores.*.nacionalidad').optional().notEmpty().isString().withMessage('Nacionalidad del tutor es requerida'),
  body('tutores.*.identificacion').optional().isString().withMessage('Identificación del tutor debe ser una cadena válida'),
  body('tutores.*.telefono').optional().isString().withMessage('Teléfono del tutor debe ser una cadena válida'),
  body('tutores.*.email').optional().isEmail().withMessage('Email del tutor debe ser válido'),
  body('tutores.*.direccion').optional().isString().withMessage('Dirección del tutor debe ser una cadena válida'),
  body('tutores.*.tipo_relacion').optional().isIn(['Padre1', 'Padre2', 'TutorLegal']).withMessage('Tipo de relación inválido'),
  body('tutor_ids').optional().isArray({ min: 0, max: 3 }).withMessage('Debe asignarse hasta 3 IDs de tutores si se proporciona'),
  body('tutor_ids.*').optional().isUUID().withMessage('ID de tutor inválido'),
  body('tutores').custom((tutores, { req }) => {
    if (tutores && tutores.length > 0) {
      const roles = tutores.map(t => t.tipo_relacion || 'TutorLegal');
      const roleCount = {};
      roles.forEach(r => { roleCount[r] = (roleCount[r] || 0) + 1; });
      if (roleCount['Padre1'] > 1 || roleCount['Padre2'] > 1 || roleCount['TutorLegal'] > 1) {
        throw new Error('Solo puede haber un Padre1, un Padre2 y un TutorLegal.');
      }
    }
    return true;
  }),
], async (req, res, next) => {
  try {
    logger.info('Actualizando paciente', {
      id: req.params.id,
      tutor_count: (req.body.tutores?.length || 0) + (req.body.tutor_ids?.length || 0),
      ip: req.ip
    });
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
      .input('id_paciente', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM [dbo].[Niños] WHERE id_niño = @id_paciente');
    if (exists.recordset.length === 0) {
      logger.warn('Paciente no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Paciente no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const tvpTutores = new sql.Table();
    tvpTutores.columns.add('nombre', sql.NVarChar(200));
    tvpTutores.columns.add('relacion', sql.NVarChar(50));
    tvpTutores.columns.add('nacionalidad', sql.NVarChar(100));
    tvpTutores.columns.add('identificacion', sql.NVarChar(20));
    tvpTutores.columns.add('telefono', sql.NVarChar(20));
    tvpTutores.columns.add('email', sql.NVarChar(100));
    tvpTutores.columns.add('direccion', sql.NVarChar(500));
    tvpTutores.columns.add('tipo_relacion', sql.NVarChar(20));

    if (req.body.tutores && req.body.tutores.length > 0) {
      req.body.tutores.forEach(tutor => {
        tvpTutores.rows.add(
          tutor.nombre,
          tutor.relacion,
          tutor.nacionalidad,
          tutor.identificacion || null,
          tutor.telefono || null,
          tutor.email || null,
          tutor.direccion || null,
          tutor.tipo_relacion || 'TutorLegal'
        );
      });
    }

    const tvpTutorIds = new sql.Table();
    tvpTutorIds.columns.add('id_tutor', sql.UniqueIdentifier);
    if (req.body.tutor_ids && req.body.tutor_ids.length > 0) {
      req.body.tutor_ids.forEach(id => {
        tvpTutorIds.rows.add(id);
      });
    }

    await pool
      .request()
      .input('id_paciente', sql.UniqueIdentifier, req.params.id)
      .input('nombre_completo', sql.NVarChar, req.body.nombre_completo || null)
      .input('identificacion', sql.NVarChar, req.body.identificacion || null)
      .input('nacionalidad', sql.NVarChar, req.body.nacionalidad || null)
      .input('pais_nacimiento', sql.NVarChar, req.body.pais_nacimiento || null)
      .input('fecha_nacimiento', sql.Date, req.body.fecha_nacimiento || null)
      .input('genero', sql.Char(1), req.body.genero || null)
      .input('direccion_residencia', sql.NVarChar, req.body.direccion_residencia || null)
      .input('latitud', sql.Decimal(9, 6), req.body.latitud || null)
      .input('longitud', sql.Decimal(9, 6), req.body.longitud || null)
      .input('id_centro_salud', sql.UniqueIdentifier, req.body.id_centro_salud || null)
      .input('contacto_principal', sql.NVarChar, req.body.contacto_principal || null)
      .input('tutores', tvpTutores)
      .input('tutor_ids', tvpTutorIds)
      .execute('sp_ActualizarNiño');

    res.status(204).send();
  } catch (err) {
    logger.error('Error al actualizar paciente', { id: req.params.id, error: err.stack, ip: req.ip });
    const error = new Error(err.message || 'Error al actualizar paciente');
    error.statusCode = err.statusCode || 500;
    error.data = err.message ? { message: err.message } : null;
    next(error);
  }
});

/**
 * @swagger
 * /api/patients/{id}:
 *   delete:
 *     summary: Eliminar un paciente
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del paciente
 *     responses:
 *       204:
 *         description: Paciente eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Paciente no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', [
  param('id').isUUID().withMessage('ID inválido'),
], async (req, res, next) => {
  try {
    logger.info('Eliminando paciente', { id: req.params.id, ip: req.ip });
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
      .input('id_paciente', sql.UniqueIdentifier, req.params.id)
      .query('SELECT 1 FROM [dbo].[Niños] WHERE id_niño = @id_paciente');
    if (exists.recordset.length === 0) {
      logger.warn('Paciente no encontrado', { id: req.params.id, ip: req.ip });
      const error = new Error('Paciente no encontrado');
      error.statusCode = 404;
      throw error;
    }
    await pool
      .request()
      .input('id_paciente', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarNiño');
    res.status(204).send();
  } catch (err) {
    logger.error('Error al eliminar paciente', { id: req.params.id, error: err.stack, ip: req.ip });
    const error = new Error(err.message || 'Error al eliminar paciente');
    error.statusCode = err.statusCode || 500;
    error.data = err.message ? { message: err.message } : null;
    next(error);
  }
});

router.stack.forEach(layer => {
  logger.debug('Registered route', { path: layer.route?.path, methods: layer.route?.methods });
});

module.exports = router;