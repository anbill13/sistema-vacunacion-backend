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
 * /api/guardians:
 *   post:
 *     summary: Crea un nuevo tutor y usuario asociado
 *     tags: [Guardians]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_niño:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               nombre:
 *                 type: string
 *                 example: "María López"
 *               relacion:
 *                 type: string
 *                 enum: [Madre, Padre, Tutor Legal]
 *                 example: "Madre"
 *               nacionalidad:
 *                 type: string
 *                 enum: [Dominicano, Extranjero]
 *                 example: "Dominicano"
 *               id_pais_nacimiento:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440004"
 *               identificacion:
 *                 type: string
 *                 example: "001-7654321-9"
 *               telefono:
 *                 type: string
 *                 example: "8099876543"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "maria@example.com"
 *               direccion:
 *                 type: string
 *                 example: "Calle 3, Santo Domingo"
 *     responses:
 *       201:
 *         description: Tutor y usuario creados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Guardian and user created"
 *                 id_tutor:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440008"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('id_niño').isUUID().withMessage('Invalid UUID for id_niño'),
    body('nombre').isString().trim().notEmpty().withMessage('nombre is required'),
    body('relacion').isIn(['Madre', 'Padre', 'Tutor Legal']).withMessage('Invalid relacion'),
    body('nacionalidad').isIn(['Dominicano', 'Extranjero']).withMessage('Invalid nacionalidad'),
    body('id_pais_nacimiento').optional().isUUID().withMessage('Invalid UUID for id_pais_nacimiento'),
    body('identificacion').optional().isString().trim().withMessage('Invalid identificacion'),
    body('telefono').optional().isString().trim().withMessage('Invalid telefono'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('direccion').optional().isString().trim().withMessage('Invalid direccion'),
  ],
  validate,
  async (req, res, next) => {
    const { id_niño, nombre, identificacion, relacion, telefono, email, direccion, nacionalidad, id_pais_nacimiento } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, id_niño)
        .input('nombre', sql.NVarChar, nombre)
        .input('identificacion', sql.NVarChar, identificacion || null)
        .input('relacion', sql.NVarChar, relacion)
        .input('telefono', sql.NVarChar, telefono || null)
        .input('email', sql.NVarChar, email || null)
        .input('direccion', sql.NVarChar, direccion || null)
        .input('nacionalidad', sql.NVarChar, nacionalidad)
        .input('id_pais_nacimiento', sql.UniqueIdentifier, id_pais_nacimiento || null)
        .execute('sp_CrearTutor');

      res.status(201).json({ message: 'Guardian and user created', id_tutor: result.recordset[0].id_tutor });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/guardians:
 *   get:
 *     summary: Obtiene todos los tutores
 *     tags: [Guardians]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tutores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_tutor:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440008"
 *                   id_niño:
 *                     type: string
 *                     format: uuid
 *                     example: "550e8400-e29b-41d4-a716-446655440000"
 *                   nombre:
 *                     type: string
 *                     example: "María López"
 *                   relacion:
 *                     type: string
 *                     enum: [Madre, Padre, Tutor Legal]
 *                     example: "Madre"
 *                   nacionalidad:
 *                     type: string
 *                     enum: [Dominicano, Extranjero]
 *                     example: "Dominicano"
 *                   identificacion:
 *                     type: string
 *                     example: "001-7654321-9"
 *                   telefono:
 *                     type: string
 *                     example: "8099876543"
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: "maria@example.com"
 *                   direccion:
 *                     type: string
 *                     example: "Calle 3, Santo Domingo"
 */
router.get(
  '/',
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .execute('sp_ObtenerTodosTutores');

      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * tags:
 *   name: Guardians
 *   description: Gestión de tutores
 */

/**
 * @swagger
 * /api/guardians:
 *   post:
 *     summary: Crea un nuevo tutor
 *     tags: [Guardians]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_niño:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               nombre:
 *                 type: string
 *                 example: "María López"
 *               relacion:
 *                 type: string
 *                 enum: [Madre, Padre, Tutor Legal]
 *                 example: "Madre"
 *               nacionalidad:
 *                 type: string
 *                 enum: [Dominicano, Extranjero]
 *                 example: "Dominicano"
 *               id_pais_nacimiento:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440004"
 *               identificacion:
 *                 type: string
 *                 example: "001-7654321-9"
 *               telefono:
 *                 type: string
 *                 example: "8099876543"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "maria@example.com"
 *               direccion:
 *                 type: string
 *                 example: "Calle 3, Santo Domingo"
 *     responses:
 *       201:
 *         description: Tutor creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Guardian created"
 *                 id_tutor:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440008"
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/',
  [
    body('id_niño').isUUID().withMessage('Invalid UUID for id_niño'),
    body('nombre').isString().trim().notEmpty().withMessage('nombre is required'),
    body('relacion').isIn(['Madre', 'Padre', 'Tutor Legal']).withMessage('Invalid relacion'),
    body('nacionalidad').isIn(['Dominicano', 'Extranjero']).withMessage('Invalid nacionalidad'),
    body('id_pais_nacimiento').optional().isUUID().withMessage('Invalid UUID for id_pais_nacimiento'),
    body('identificacion').optional().isString().trim().withMessage('Invalid identificacion'),
    body('telefono').optional().isString().trim().withMessage('Invalid telefono'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('direccion').optional().isString().trim().withMessage('Invalid direccion'),
  ],
  validate,
  async (req, res, next) => {
    const { id_niño, nombre, identificacion, relacion, telefono, email, direccion, nacionalidad, id_pais_nacimiento } = req.body;

    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('id_niño', sql.UniqueIdentifier, id_niño)
        .input('nombre', sql.NVarChar, nombre)
        .input('identificacion', sql.NVarChar, identificacion || null)
        .input('relacion', sql.NVarChar, relacion)
        .input('telefono', sql.NVarChar, telefono || null)
        .input('email', sql.NVarChar, email || null)
        .input('direccion', sql.NVarChar, direccion || null)
        .input('nacionalidad', sql.NVarChar, nacionalidad)
        .input('id_pais_nacimiento', sql.UniqueIdentifier, id_pais_nacimiento || null)
        .execute('sp_CrearTutor');

      res.status(201).json({ message: 'Guardian created', id_tutor: result.recordset[0].id_tutor });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/guardians/{id}:
 *   get:
 *     summary: Obtiene un tutor por ID
 *     tags: [Guardians]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440008"
 *     responses:
 *       200:
 *         description: Tutor encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_tutor:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440008"
 *                 id_niño:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 nombre:
 *                   type: string
 *                   example: "María López"
 *                 relacion:
 *                   type: string
 *                   enum: [Madre, Padre, Tutor Legal]
 *                   example: "Madre"
 *                 nacionalidad:
 *                   type: string
 *                   enum: [Dominicano, Extranjero]
 *                   example: "Dominicano"
 *                 identificacion:
 *                   type: string
 *                   example: "001-7654321-9"
 *                 telefono:
 *                   type: string
 *                   example: "8099876543"
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: "maria@example.com"
 *                 direccion:
 *                   type: string
 *                   example: "Calle 3, Santo Domingo"
 *       404:
 *         description: Tutor no encontrado
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
        .input('id_tutor', sql.UniqueIdentifier, req.params.id)
        .execute('sp_ObtenerTutor');

      if (result.recordset.length === 0) {
        const error = new Error('Guardian not found');
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
 * /api/guardians/{id}:
 *   put:
 *     summary: Actualiza un tutor
 *     tags: [Guardians]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440008"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_niño:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               nombre:
 *                 type: string
 *                 example: "María López Actualizada"
 *               relacion:
 *                 type: string
 *                 enum: [Madre, Padre, Tutor Legal]
 *                 example: "Madre"
 *               nacionalidad:
 *                 type: string
 *                 enum: [Dominicano, Extranjero]
 *                 example: "Dominicano"
 *               id_pais_nacimiento:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440004"
 *               identificacion:
 *                 type: string
 *                 example: "001-7654321-9"
 *               telefono:
 *                 type: string
 *                 example: "8099876543"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "maria@example.com"
 *               direccion:
 *                 type: string
 *                 example: "Calle 3, Santo Domingo"
 *     responses:
 *       200:
 *         description: Tutor actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Guardian updated"
 *       400:
 *         description: Validación fallida
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid UUID'),
    body('id_niño').isUUID().withMessage('Invalid UUID for id_niño'),
    body('nombre').isString().trim().notEmpty().withMessage('nombre is required'),
    body('relacion').isIn(['Madre', 'Padre', 'Tutor Legal']).withMessage('Invalid relacion'),
    body('nacionalidad').isIn(['Dominicano', 'Extranjero']).withMessage('Invalid nacionalidad'),
    body('id_pais_nacimiento').optional().isUUID().withMessage('Invalid UUID for id_pais_nacimiento'),
    body('identificacion').optional().isString().trim().withMessage('Invalid identificacion'),
    body('telefono').optional().isString().trim().withMessage('Invalid telefono'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('direccion').optional().isString().trim().withMessage('Invalid direccion'),
  ],
  validate,
  async (req, res, next) => {
    const { id_niño, nombre, identificacion, relacion, telefono, email, direccion, nacionalidad, id_pais_nacimiento } = req.body;

    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_tutor', sql.UniqueIdentifier, req.params.id)
        .input('id_niño', sql.UniqueIdentifier, id_niño)
        .input('nombre', sql.NVarChar, nombre)
        .input('identificacion', sql.NVarChar, identificacion || null)
        .input('relacion', sql.NVarChar, relacion)
        .input('telefono', sql.NVarChar, telefono || null)
        .input('email', sql.NVarChar, email || null)
        .input('direccion', sql.NVarChar, direccion || null)
        .input('nacionalidad', sql.NVarChar, nacionalidad)
        .input('id_pais_nacimiento', sql.UniqueIdentifier, id_pais_nacimiento || null)
        .execute('sp_ActualizarTutor');

      res.json({ message: 'Guardian updated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/guardians/{id}:
 *   delete:
 *     summary: Elimina un tutor
 *     tags: [Guardians]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440008"
 *     responses:
 *       200:
 *         description: Tutor eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Guardian deleted"
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
        .input('id_tutor', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarTutor');

      res.json({ message: 'Guardian deactivated' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;