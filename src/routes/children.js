const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { poolPromise, sql } = require('../config/db');
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
 *                     example: "550e8400-e29b-41d4-a716-446655440001"
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

      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * tags:
 *   name: Children
 *   description: Gestión de niños
 */

/**
 * @swagger
 * /api/children/{id}:
 *   get:
 *     summary: Obtiene un niño por ID
 *     tags: [Children]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Niño encontrado
 *         content:
 *           application/json:
 *             schema:
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
 *                   example: "550e8400-e29b-41d4-a716-446655440001"
 *                 contacto_principal:
 *                   type: string
 *                   enum: [Madre, Padre, Tutor]
 *                   example: "Madre"
 *       404:
 *         description: Niño no encontrado
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid UUID')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerNino');

      if (result.recordset.length === 0) {
        const error = new Error('Child not found');
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
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
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

/**
 * @swagger
 * /api/children/{id}:
 *   put:
 *     summary: Actualiza un niño
 *     tags: [Children]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
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
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               contacto_principal:
 *                 type: string
 *                 enum: [Madre, Padre, Tutor]
 *                 example: "Madre"
 *               id_salud_nacional:
 *                 type: string
 *                 example: "SN001"
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
 *                   example: "Child updated successfully"
 *       400:
 *         description: Validación fallida
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid UUID'),
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
      await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, req.params.id)
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
        .execute('sp_ActualizarNino');

      res.json({ message: 'Child updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/children/{id}:
 *   delete:
 *     summary: Elimina un niño
 *     tags: [Children]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Niño eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Child deleted successfully"
 *       400:
 *         description: Validación fallida
 */
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid UUID')],
  validate,
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarNino');

      res.json({ message: 'Child deactivated' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;