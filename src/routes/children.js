const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: Children
 *   description: Gestión de niños en el sistema de vacunación
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Child:
 *       type: object
 *       required:
 *         - nombre_completo
 *         - identificacion
 *         - nacionalidad
 *         - fecha_nacimiento
 *         - genero
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: Identificador único del niño
 *         nombre_completo:
 *           type: string
 *           description: Nombre completo del niño
 *         identificacion:
 *           type: string
 *           description: Número de identificación del niño
 *         nacionalidad:
 *           type: string
 *           enum: [Dominicano, Extranjero]
 *           description: Nacionalidad del niño
 *         pais_nacimiento:
 *           type: string
 *           nullable: true
 *           description: País de nacimiento del niño
 *         fecha_nacimiento:
 *           type: string
 *           format: date
 *           description: Fecha de nacimiento del niño
 *         genero:
 *           type: string
 *           enum: [M, F, O]
 *           description: Género del niño
 *         direccion_residencia:
 *           type: string
 *           nullable: true
 *           description: Dirección de residencia del niño
 *         latitud:
 *           type: number
 *           nullable: true
 *           description: Latitud de la residencia
 *         longitud:
 *           type: number
 *           nullable: true
 *           description: Longitud de la residencia
 *         id_centro_salud:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: ID del centro de salud asociado
 *         contacto_principal:
 *           type: string
 *           enum: [Madre, Padre, Tutor]
 *           nullable: true
 *           description: Contacto principal del niño
 *         id_salud_nacional:
 *           type: string
 *           nullable: true
 *           description: ID de salud nacional
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del registro
 *       example:
 *         id_niño: "123e4567-e89b-12d3-a456-426614174000"
 *         nombre_completo: "Juan Pérez"
 *         identificacion: "123456789"
 *         nacionalidad: "Dominicano"
 *         fecha_nacimiento: "2020-01-01"
 *         genero: "M"
 *         estado: "Activo"
 *     ChildInput:
 *       type: object
 *       required:
 *         - nombre_completo
 *         - identificacion
 *         - nacionalidad
 *         - fecha_nacimiento
 *         - genero
 *       properties:
 *         nombre_completo:
 *           type: string
 *         identificacion:
 *           type: string
 *         nacionalidad:
 *           type: string
 *           enum: [Dominicano, Extranjero]
 *         pais_nacimiento:
 *           type: string
 *           nullable: true
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
 *           enum: [Madre, Padre, Tutor]
 *           nullable: true
 *         id_salud_nacional:
 *           type: string
 *           nullable: true
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateChild = [
  body('nombre_completo').notEmpty().isString().withMessage('Nombre completo es requerido'),
  body('identificacion').notEmpty().isString().withMessage('Identificación es requerida'),
  body('nacionalidad').isIn(['Dominicano', 'Extranjero']).withMessage('Nacionalidad inválida'),
  body('fecha_nacimiento').isDate().withMessage('Fecha de nacimiento inválida'),
  body('genero').isIn(['M', 'F', 'O']).withMessage('Género inválido'),
  body('pais_nacimiento').optional().isString(),
  body('direccion_residencia').optional().isString(),
  body('latitud').optional().isFloat(),
  body('longitud').optional().isFloat(),
  body('id_centro_salud').optional().isUUID(),
  body('contacto_principal').optional().isIn(['Madre', 'Padre', 'Tutor']),
  body('id_salud_nacional').optional().isString(),
];

/**
 * @swagger
 * /api/children:
 *   get:
 *     summary: Obtener todos los niños activos
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de niños activos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Child'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_niño, nombre_completo, identificacion, nacionalidad, pais_nacimiento, fecha_nacimiento, genero, 
             direccion_residencia, latitud, longitud, id_centro_salud, contacto_principal, id_salud_nacional, estado
      FROM Niños WHERE estado = 'Activo'
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener niños' });
  }
});

/**
 * @swagger
 * /api/children:
 *   post:
 *     summary: Crear un nuevo niño
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChildInput'
 *     responses:
 *       201:
 *         description: Niño creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_niño:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados o niño mayor de 14 años
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, validateChild, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    nombre_completo, identificacion, nacionalidad, pais_nacimiento, fecha_nacimiento, genero,
    direccion_residencia, latitud, longitud, id_centro_salud, contacto_principal, id_salud_nacional
  } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('nombre_completo', sql.NVarChar, nombre_completo)
      .input('identificacion', sql.NVarChar, identificacion)
      .input('nacionalidad', sql.NVarChar, nacionalidad)
      .input('pais_nacimiento', sql.NVarChar, pais_nacimiento)
      .input('fecha_nacimiento', sql.Date, fecha_nacimiento)
      .input('genero', sql.Char, genero)
      .input('direccion_residencia', sql.NVarChar, direccion_residencia)
      .input('latitud', sql.Decimal(9, 6), latitud)
      .input('longitud', sql.Decimal(9, 6), longitud)
      .input('id_centro_salud', sql.UniqueIdentifier, id_centro_salud)
      .input('contacto_principal', sql.NVarChar, contacto_principal)
      .input('id_salud_nacional', sql.NVarChar, id_salud_nacional)
      .execute('sp_CrearNino');

    res.status(201).json({ id_niño: result.recordset[0].id_niño });
  } catch (err) {
    if (err.number === 50001) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear niño' });
  }
});

/**
 * @swagger
=======

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
 * /api/children:
 *   get:
 *     summary: Obtiene todos los niños
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de niños
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_niño:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440000"
 *                   nombre_completo:
 *                     type: string
 *                     example: "Juan Pérez"
 *                   identificacion:
 *                     type: string
 *                     example: "001-1234567-8"
 *                   nacionalidad:
 *                     type: string
 *                     enum: [Dominicano, Extranjero]
 *                     example: "Dominicano"
 *                   fecha_nacimiento:
 *                     type: string
 *                     format: date
 *                     example: "2015-05-15"
 *                   genero:
 *                     type: string
 *                     enum: [M, F, O]
 *                     example: "M"
 *                   id_centro_salud:
 *                     type: string
 *                     format: uuid
 *                     example: "2D5BAA7F-B6F1-46C9-AEF9-25FBFB29F284"
 *                   contacto_principal:
 *                     type: string
 *                     enum: [Madre, Padre, Tutor]
 *                     example: "Madre"
 */
router.get(
  '/',
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .execute('sp_ObtenerTodosNinos');

      // Filtrar solo niños activos
      const activeChildren = result.recordset.filter(child => child.estado === 'Activo');
      res.json(activeChildren);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
<<<<<<< HEAD
>>>>>>> b447ffd (cleanup)
=======
>>>>>>> b447ffd (cleanup)
 * /api/children/{id}:
 *   get:
 *     summary: Obtener un niño por ID
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
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
 *         description: Niño encontrado
 *         content:
 *           application/json:
 *             schema:
<<<<<<< HEAD
 *               $ref: '#/components/schemas/Child'
 *       400:
 *         description: ID inválido
=======
 *               type: object
 *               properties:
 *                 id_niño:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 nombre_completo:
 *                   type: string
 *                   example: "Juan Pérez"
 *                 identificacion:
 *                   type: string
 *                   example: "001-1234567-8"
 *                 nacionalidad:
 *                   type: string
 *                   enum: [Dominicano, Extranjero]
 *                   example: "Dominicano"
 *                 fecha_nacimiento:
 *                   type: string
 *                   format: date
 *                   example: "2015-05-15"
 *                 genero:
 *                   type: string
 *                   enum: [M, F, O]
 *                   example: "M"
 *                 id_centro_salud:
 *                   type: string
 *                   format: uuid
 *                   example: "2D5BAA7F-B6F1-46C9-AEF9-25FBFB29F284"
 *                 contacto_principal:
 *                   type: string
 *                   enum: [Madre, Padre, Tutor]
 *                   example: "Madre"
>>>>>>> b447ffd (cleanup)
 *       404:
 *         description: Niño no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_niño', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerNino');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Niño no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener niño' });
  }
<<<<<<< HEAD
});
=======
);

/**
 * @swagger
 * /api/children/center/{id}:
 *   get:
 *     summary: Obtiene todos los niños de un centro específico
 *     tags: [Children]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "3BC990DD-9F0F-43A9-95F0-FD08821E70DA"
 *     responses:
 *       200:
 *         description: Lista de niños del centro
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_niño:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440000"
 *                   nombre_completo:
 *                     type: string
 *                     example: "Juan Pérez"
 *                   identificacion:
 *                     type: string
 *                     example: "001-1234567-8"
 *                   nacionalidad:
 *                     type: string
 *                     enum: [Dominicano, Extranjero]
 *                     example: "Dominicano"
 *                   fecha_nacimiento:
 *                     type: string
 *                     format: date
 *                     example: "2015-05-15"
 *                   genero:
 *                     type: string
 *                     enum: [M, F, O]
 *                     example: "M"
 *                   id_centro_salud:
 *                     type: string
 *                     format: uuid
 *                     example: "3BC990DD-9F0F-43A9-95F0-FD08821E70DA"
 *                   contacto_principal:
 *                     type: string
 *                     enum: [Madre, Padre, Tutor]
 *                     example: "Madre"
 *       404:
 *         description: No se encontraron niños para el centro
 */
router.get(
  '/center/:id',
  [param('id').isUUID().withMessage('Invalid UUID')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_centro_salud', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerNinosPorCentro');

      if (result.recordset.length === 0) {
        const error = new Error('No children found for this center');
        error.statusCode = 404;
        throw error;
      }
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/children/center/{id}:
 *   get:
 *     summary: Obtiene todos los niños de un centro específico
 *     tags: [Children]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "3BC990DD-9F0F-43A9-95F0-FD08821E70DA"
 *     responses:
 *       200:
 *         description: Lista de niños del centro
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_niño:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440000"
 *                   nombre_completo:
 *                     type: string
 *                     example: "Juan Pérez"
 *                   identificacion:
 *                     type: string
 *                     example: "001-1234567-8"
 *                   nacionalidad:
 *                     type: string
 *                     enum: [Dominicano, Extranjero]
 *                     example: "Dominicano"
 *                   fecha_nacimiento:
 *                     type: string
 *                     format: date
 *                     example: "2015-05-15"
 *                   genero:
 *                     type: string
 *                     enum: [M, F, O]
 *                     example: "M"
 *                   id_centro_salud:
 *                     type: string
 *                     format: uuid
 *                     example: "3BC990DD-9F0F-43A9-95F0-FD08821E70DA"
 *                   contacto_principal:
 *                     type: string
 *                     enum: [Madre, Padre, Tutor]
 *                     example: "Madre"
 *       404:
 *         description: No se encontraron niños para el centro
 */
router.get(
  '/center/:id',
  [param('id').isUUID().withMessage('Invalid UUID')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_centro_salud', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerNinosPorCentro');

      if (result.recordset.length === 0) {
        const error = new Error('No children found for this center');
        error.statusCode = 404;
        throw error;
      }
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/children:
 *   post:
 *     summary: Crea un nuevo niño
 *     tags: [Children]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_completo:
 *                 type: string
 *                 example: "Juan Pérez"
 *               identificacion:
 *                 type: string
 *                 example: "001-1234567-8"
 *               nacionalidad:
 *                 type: string
 *                 enum: [Dominicano, Extranjero]
 *                 example: "Dominicano"
 *               id_pais_nacimiento:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440004"
 *               fecha_nacimiento:
 *                 type: string
 *                 format: date
 *                 example: "2015-05-15"
 *               genero:
 *                 type: string
 *                 enum: [M, F, O]
 *                 example: "M"
 *               direccion_residencia:
 *                 type: string
 *                 example: "Calle 2, Santo Domingo"
 *               latitud:
 *                 type: number
 *                 format: float
 *                 example: 18.4861
 *               longitud:
 *                 type: number
 *                 format: float
 *                 example: -69.9312
 *               id_centro_salud:
 *                 type: string
 *                 format: uuid
 *                 example: "2D5BAA7F-B6F1-46C9-AEF9-25FBFB29F284"
 *               contacto_principal:
 *                 type: string
 *                 enum: [Madre, Padre, Tutor]
 *                 example: "Madre"
 *               id_salud_nacional:
 *                 type: string
 *                 example: "SN001"
 *     responses:
 *       201:
 *         description: Niño creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Child created successfully"
 *                 id_niño:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('nombre_completo').isString().trim().notEmpty().withMessage('Full name is required'),
    body('identificacion').isString().trim().notEmpty().withMessage('Identification is required'),
    body('nacionalidad').isIn(['Dominicano', 'Extranjero']).withMessage('Nationality must be Dominicano or Extranjero'),
    body('id_pais_nacimiento').optional().isUUID().withMessage('Invalid UUID for id_pais_nacimiento'),
    body('fecha_nacimiento').isDate().withMessage('Invalid birth date'),
    body('genero').isIn(['M', 'F', 'O']).withMessage('Gender must be M, F, or O'),
    body('id_centro_salud').optional().isUUID().withMessage('Invalid UUID for health center'),
    body('contacto_principal').optional().isIn(['Madre', 'Padre', 'Tutor']).withMessage('Contact must be Madre, Padre, or Tutor'),
  ],
  validate,
  async (req, res, next) => {
    const {
      nombre_completo,
      identificacion,
      nacionalidad,
      id_pais_nacimiento,
      fecha_nacimiento,
      genero,
      direccion_residencia,
      latitud,
      longitud,
      id_centro_salud,
      contacto_principal,
      id_salud_nacional,
    } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('nombre_completo', sql.NVarChar, nombre_completo)
        .input('identificacion', sql.NVarChar, identificacion)
        .input('nacionalidad', sql.NVarChar, nacionalidad)
        .input('id_pais_nacimiento', sql.UniqueIdentifier, id_pais_nacimiento || null)
        .input('fecha_nacimiento', sql.Date, fecha_nacimiento)
        .input('genero', sql.Char, genero)
        .input('direccion_residencia', sql.NVarChar, direccion_residencia || null)
        .input('latitud', sql.Decimal(9, 6), latitud || null)
        .input('longitud', sql.Decimal(9, 6), longitud || null)
        .input('id_centro_salud', sql.UniqueIdentifier, id_centro_salud || null)
        .input('contacto_principal', sql.NVarChar, contacto_principal || null)
        .input('id_salud_nacional', sql.NVarChar, id_salud_nacional || null)
        .execute('sp_CrearNino');

      res.status(201).json({ message: 'Child created successfully', id_niño: result.recordset[0].id_niño });
    } catch (error) {
      next(error);
    }
  }
);
>>>>>>> b447ffd (cleanup)

/**
 * @swagger
 * /api/children/{id}:
 *   put:
 *     summary: Actualizar un niño
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del niño
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
<<<<<<< HEAD
 *             $ref: '#/components/schemas/ChildInput'
=======
 *             type: object
 *             properties:
 *               nombre_completo:
 *                 type: string
 *                 example: "Juan Pérez Actualizado"
 *               identificacion:
 *                 type: string
 *                 example: "001-1234567-8"
 *               nacionalidad:
 *                 type: string
 *                 enum: [Dominicano, Extranjero]
 *                 example: "Dominicano"
 *               id_pais_nacimiento:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440004"
 *               fecha_nacimiento:
 *                 type: string
 *                 format: date
 *                 example: "2015-05-15"
 *               genero:
 *                 type: string
 *                 enum: [M, F, O]
 *                 example: "M"
 *               direccion_residencia:
 *                 type: string
 *                 example: "Calle 2, Santo Domingo"
 *               latitud:
 *                 type: number
 *                 format: float
 *                 example: 18.4861
 *               longitud:
 *                 type: number
 *                 format: float
 *                 example: -69.9312
 *               id_centro_salud:
 *                 type: string
 *                 format: uuid
 *                 example: "2D5BAA7F-B6F1-46C9-AEF9-25FBFB29F284"
 *               contacto_principal:
 *                 type: string
 *                 enum: [Madre, Padre, Tutor]
 *                 example: "Madre"
 *               id_salud_nacional:
 *                 type: string
 *                 example: "SN001"
>>>>>>> b447ffd (cleanup)
 *     responses:
 *       200:
 *         description: Niño actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Niño actualizado
 *       400:
 *         description: Error en los datos enviados o niño mayor de 14 años
 *       404:
 *         description: Niño no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, validateUUID, validateChild, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    nombre_completo, identificacion, nacionalidad, pais_nacimiento, fecha_nacimiento, genero,
    direccion_residencia, latitud, longitud, id_centro_salud, contacto_principal, id_salud_nacional
  } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_niño', sql.UniqueIdentifier, req.params.id)
      .input('nombre_completo', sql.NVarChar, nombre_completo)
      .input('identificacion', sql.NVarChar, identificacion)
      .input('nacionalidad', sql.NVarChar, nacionalidad)
      .input('pais_nacimiento', sql.NVarChar, pais_nacimiento)
      .input('fecha_nacimiento', sql.Date, fecha_nacimiento)
      .input('genero', sql.Char, genero)
      .input('direccion_residencia', sql.NVarChar, direccion_residencia)
      .input('latitud', sql.Decimal(9, 6), latitud)
      .input('longitud', sql.Decimal(9, 6), longitud)
      .input('id_centro_salud', sql.UniqueIdentifier, id_centro_salud)
      .input('contacto_principal', sql.NVarChar, contacto_principal)
      .input('id_salud_nacional', sql.NVarChar, id_salud_nacional)
      .execute('sp_ActualizarNino');

    res.json({ message: 'Niño actualizado' });
  } catch (err) {
    if (err.number === 50001 || err.number === 50002 || err.number === 50003) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar niño' });
  }
});

/**
 * @swagger
 * /api/children/{id}:
 *   delete:
 *     summary: Desactivar un niño
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
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
 *         description: Niño desactivado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Niño desactivado
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Niño no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_niño', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarNino');

    res.json({ message: 'Niño desactivado' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al desactivar niño' });
  }
});

/**
 * @swagger
 * /api/children/center/{id}:
 *   get:
 *     summary: Obtener niños por centro de salud
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro de salud
 *     responses:
 *       200:
 *         description: Lista de niños asociados al centro
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Child'
 *       400:
 *         description: ID de centro inválido
 *       500:
 *         description: Error del servidor
 */
router.get('/center/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_centro_salud', sql.UniqueIdentifier, req.params.id)
      .query(`
        SELECT id_niño, nombre_completo, identificacion, nacionalidad, pais_nacimiento, fecha_nacimiento, genero, 
               direccion_residencia, latitud, longitud, id_centro_salud, contacto_principal, id_salud_nacional, estado
        FROM Niños
        WHERE id_centro_salud = @id_centro_salud AND estado = 'Activo'
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener niños por centro' });
  }
});

module.exports = router;