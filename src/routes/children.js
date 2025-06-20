const express = require('express');
const { body, param } = require('express-validator');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Children
 *   description: Gestión de niños
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
 *         - pais_nacimiento
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
 *           description: Identificación del niño
 *         nacionalidad:
 *           type: string
 *           format: uuid
 *           description: ID del país de nacionalidad
 *         pais_nacimiento:
 *           type: string
 *           format: uuid
 *           description: ID del país de nacimiento
 *         fecha_nacimiento:
 *           type: string
 *           format: date
 *           description: Fecha de nacimiento
 *         genero:
 *           type: string
 *           enum: [M, F, O]
 *           description: Género del niño
 *         direccion_residencia:
 *           type: string
 *           description: Dirección de residencia (opcional)
 *         latitud:
 *           type: number
 *           description: Latitud de residencia (opcional)
 *         longitud:
 *           type: number
 *           description: Longitud de residencia (opcional)
 *         id_centro_salud:
 *           type: string
 *           format: uuid
 *           description: ID del centro de salud (opcional)
 *         contacto_principal:
 *           type: string
 *           enum: [Madre, Padre, Tutor]
 *           description: Contacto principal (opcional)
 *         id_salud_nacional:
 *           type: string
 *           description: ID de salud nacional (opcional)
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del niño
 *     ChildInput:
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
 *           format: uuid
 *         pais_nacimiento:
 *           type: string
 *           format: uuid
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

const validateChild = [
  body('nombre_completo').notEmpty().isString().withMessage('Nombre completo es requerido'),
  body('identificacion').notEmpty().isString().withMessage('Identificación es requerida'),
  body('nacionalidad').isUUID().withMessage('Nacionalidad inválida'),
  body('pais_nacimiento').isUUID().withMessage('País de nacimiento inválido'),
  body('fecha_nacimiento').isDate().withMessage('Fecha de nacimiento inválida'),
  body('genero').isIn(['M', 'F', 'O']).withMessage('Género inválido'),
  body('direccion_residencia').optional().isString(),
  body('latitud').optional().isFloat().withMessage('Latitud inválida'),
  body('longitud').optional().isFloat().withMessage('Longitud inválida'),
  body('id_centro_salud').optional().isUUID().withMessage('ID de centro de salud inválido'),
  body('contacto_principal').optional().isIn(['Madre', 'Padre', 'Tutor']).withMessage('Contacto principal inválido'),
  body('id_salud_nacional').optional().isString(),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * /api/children:
 *   get:
 *     summary: Listar todos los niños
 *     tags: [Children]
 *     responses:
 *       200:
 *         description: Lista de niños obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Child'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Niños');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/children/{id}:
 *   get:
 *     summary: Obtener un niño por ID
 *     tags: [Children]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Niño obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Child'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Niño no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_niño', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Niños WHERE id_niño = @id_niño');
    if (result.recordset.length === 0) {
      const error = new Error('Niño no encontrado');
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
 * /api/children:
 *   post:
 *     summary: Crear un nuevo niño
 *     tags: [Children]
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
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateChild, async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('nombre_completo', sql.NVarChar, req.body.nombre_completo)
      .input('identificacion', sql.NVarChar, req.body.identificacion)
      .input('nacionalidad', sql.UniqueIdentifier, req.body.nacionalidad)
      .input('pais_nacimiento', sql.UniqueIdentifier, req.body.pais_nacimiento)
      .input('fecha_nacimiento', sql.Date, req.body.fecha_nacimiento)
      .input('genero', sql.Char, req.body.genero)
      .input('direccion_residencia', sql.NVarChar, req.body.direccion_residencia)
      .input('latitud', sql.Decimal(9, 6), req.body.latitud)
      .input('longitud', sql.Decimal(9, 6), req.body.longitud)
      .input('id_centro_salud', sql.UniqueIdentifier, req.body.id_centro_salud)
      .input('contacto_principal', sql.NVarChar, req.body.contacto_principal)
      .input('id_salud_nacional', sql.NVarChar, req.body.id_salud_nacional)
      .execute('sp_CrearNino');
    res.status(201).json({ id_niño: result.recordset[0].id_niño });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/children/{id}:
 *   put:
 *     summary: Actualizar un niño
 *     tags: [Children]
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
 *             $ref: '#/components/schemas/ChildInput'
 *     responses:
 *       204:
 *         description: Niño actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Niño no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [validateUUID, validateChild], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    await pool
      .request()
      .input('id_niño', sql.UniqueIdentifier, req.params.id)
      .input('nombre_completo', sql.NVarChar, req.body.nombre_completo)
      .input('identificacion', sql.NVarChar, req.body.identificacion)
      .input('nacionalidad', sql.UniqueIdentifier, req.body.nacionalidad)
      .input('pais_nacimiento', sql.UniqueIdentifier, req.body.pais_nacimiento)
      .input('fecha_nacimiento', sql.Date, req.body.fecha_nacimiento)
      .input('genero', sql.Char, req.body.genero)
      .input('direccion_residencia', sql.NVarChar, req.body.direccion_residencia)
      .input('latitud', sql.Decimal(9, 6), req.body.latitud)
      .input('longitud', sql.Decimal(9, 6), req.body.longitud)
      .input('id_centro_salud', sql.UniqueIdentifier, req.body.id_centro_salud)
      .input('contacto_principal', sql.NVarChar, req.body.contacto_principal)
      .input('id_salud_nacional', sql.NVarChar, req.body.id_salud_nacional)
      .execute('sp_ActualizarNino');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/children/{id}:
 *   delete:
 *     summary: Eliminar un niño
 *     tags: [Children]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Niño eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Niño no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', [validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    await pool
      .request()
      .input('id_niño', sql.UniqueIdentifier, req.params.id)
      .query('DELETE FROM Niños WHERE id_niño = @id_niño'); // Nota: No hay stored procedure, usar DELETE directo
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;