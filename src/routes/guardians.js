const express = require('express');
const { body, param } = require('express-validator');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Guardians
 *   description: Gestión de tutores
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Guardian:
 *       type: object
 *       required:
 *         - id_niño
 *         - nombre
 *         - relacion
 *         - nacionalidad
 *       properties:
 *         id_tutor:
 *           type: string
 *           format: uuid
 *           description: Identificador único del tutor
 *         id_niño:
 *           type: string
 *           format: uuid
 *           description: ID del niño asociado
 *         nombre:
 *           type: string
 *           description: Nombre completo del tutor
 *         relacion:
 *           type: string
 *           enum: [Madre, Padre, Tutor Legal]
 *           description: Relación con el niño
 *         nacionalidad:
 *           type: string
 *           format: uuid
 *           description: ID del país de nacionalidad
 *         identificacion:
 *           type: string
 *           description: Identificación del tutor (opcional)
 *         telefono:
 *           type: string
 *           description: Teléfono del tutor (opcional)
 *         email:
 *           type: string
 *           description: Email del tutor (opcional)
 *         direccion:
 *           type: string
 *           description: Dirección del tutor (opcional)
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del tutor
 *     GuardianInput:
 *       type: object
 *       required:
 *         - id_niño
 *         - nombre
 *         - relacion
 *         - nacionalidad
 *       properties:
 *         id_niño:
 *           type: string
 *           format: uuid
 *         nombre:
 *           type: string
 *         relacion:
 *           type: string
 *           enum: [Madre, Padre, Tutor Legal]
 *         nacionalidad:
 *           type: string
 *           format: uuid
 *         identificacion:
 *           type: string
 *           nullable: true
 *         telefono:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           nullable: true
 *         direccion:
 *           type: string
 *           nullable: true
 */

const validateGuardian = [
  body('id_niño').isUUID().withMessage('ID de niño inválido'),
  body('nombre').notEmpty().isString().withMessage('Nombre es requerido'),
  body('relacion').isIn(['Madre', 'Padre', 'Tutor Legal']).withMessage('Relación inválida'),
  body('nacionalidad').isUUID().withMessage('Nacionalidad inválida'),
  body('identificacion').optional().isString(),
  body('telefono').optional().isString(),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('direccion').optional().isString(),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * /api/guardians:
 *   get:
 *     summary: Listar todos los tutores
 *     tags: [Guardians]
 *     responses:
 *       200:
 *         description: Lista de tutores obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Guardian'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Tutores');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/guardians/{id}:
 *   get:
 *     summary: Obtener un tutor por ID
 *     tags: [Guardians]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Tutor obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Guardian'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Tutor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_tutor', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Tutores WHERE id_tutor = @id_tutor');
    if (result.recordset.length === 0) {
      const error = new Error('Tutor no encontrado');
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
 * /api/guardians:
 *   post:
 *     summary: Crear un nuevo tutor
 *     tags: [Guardians]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GuardianInput'
 *     responses:
 *       201:
 *         description: Tutor creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_tutor:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', validateGuardian, async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_niño', sql.UniqueIdentifier, req.body.id_niño)
      .input('nombre', sql.NVarChar, req.body.nombre)
      .input('identificacion', sql.NVarChar, req.body.identificacion)
      .input('relacion', sql.NVarChar, req.body.relacion)
      .input('telefono', sql.NVarChar, req.body.telefono)
      .input('email', sql.NVarChar, req.body.email)
      .input('direccion', sql.NVarChar, req.body.direccion)
      .input('nacionalidad', sql.UniqueIdentifier, req.body.nacionalidad)
      .execute('sp_CrearTutor');
    res.status(201).json({ id_tutor: result.recordset[0].id_tutor });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/guardians/{id}:
 *   put:
 *     summary: Actualizar un tutor
 *     tags: [Guardians]
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
 *             $ref: '#/components/schemas/GuardianInput'
 *     responses:
 *       204:
 *         description: Tutor actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Tutor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', [validateUUID, validateGuardian], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    await pool
      .request()
      .input('id_tutor', sql.UniqueIdentifier, req.params.id)
      .input('id_niño', sql.UniqueIdentifier, req.body.id_niño)
      .input('nombre', sql.NVarChar, req.body.nombre)
      .input('identificacion', sql.NVarChar, req.body.identificacion)
      .input('relacion', sql.NVarChar, req.body.relacion)
      .input('telefono', sql.NVarChar, req.body.telefono)
      .input('email', sql.NVarChar, req.body.email)
      .input('direccion', sql.NVarChar, req.body.direccion)
      .input('nacionalidad', sql.UniqueIdentifier, req.body.nacionalidad)
      .execute('sp_ActualizarTutor');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/guardians/{id}:
 *   delete:
 *     summary: Eliminar un tutor
 *     tags: [Guardians]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Tutor eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Tutor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', [validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    await pool
      .request()
      .input('id_tutor', sql.UniqueIdentifier, req.params.id)
      .query('DELETE FROM Tutores WHERE id_tutor = @id_tutor'); // Nota: No hay stored procedure, usar DELETE directo
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;