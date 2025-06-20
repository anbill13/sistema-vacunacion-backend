const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, checkRole } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Vaccines
 *   description: Gestión de vacunas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Vaccine:
 *       type: object
 *       required:
 *         - nombre
 *         - fabricante
 *         - tipo
 *         - dosis_requeridas
 *       properties:
 *         id_vacuna:
 *           type: string
 *           format: uuid
 *           description: Identificador único de la vacuna
 *         nombre:
 *           type: string
 *           description: Nombre de la vacuna
 *         fabricante:
 *           type: string
 *           description: Fabricante de la vacuna
 *         tipo:
 *           type: string
 *           description: Tipo de vacuna
 *         dosis_requeridas:
 *           type: integer
 *           description: Número de dosis requeridas
 *     VaccineInput:
 *       type: object
 *       required:
 *         - nombre
 *         - fabricante
 *         - tipo
 *         - dosis_requeridas
 *       properties:
 *         nombre:
 *           type: string
 *         fabricante:
 *           type: string
 *         tipo:
 *           type: string
 *         dosis_requeridas:
 *           type: integer
 */

const validateVaccine = [
  body('nombre').notEmpty().isString().withMessage('Nombre es requerido'),
  body('fabricante').notEmpty().isString().withMessage('Fabricante es requerido'),
  body('tipo').notEmpty().isString().withMessage('Tipo es requerido'),
  body('dosis_requeridas').isInt({ min: 1 }).withMessage('Dosis requeridas debe ser un número positivo'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * /api/vaccines:
 *   get:
 *     summary: Listar todas las vacunas
 *     tags: [Vaccines]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de vacunas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Vaccine'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', [authenticate, checkRole(['director', 'administrador'])], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Vacunas');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/vaccines/{id}:
 *   get:
 *     summary: Obtener una vacuna por ID
 *     tags: [Vaccines]
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
 *         description: Vacuna obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vaccine'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Vacuna no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [authenticate, checkRole(['director', 'administrador']), validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_vacuna', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Vacunas WHERE id_vacuna = @id_vacuna');
    if (result.recordset.length === 0) {
      const error = new Error('Vacuna no encontrada');
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
 * /api/vaccines:
 *   post:
 *     summary: Crear una nueva vacuna
 *     tags: [Vaccines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccineInput'
 *     responses:
 *       201:
 *         description: Vacuna creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_vacuna:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/',
  [authenticate, checkRole(['director', 'administrador']), validateVaccine],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('nombre', sql.NVarChar, req.body.nombre)
        .input('fabricante', sql.NVarChar, req.body.fabricante)
        .input('tipo', sql.NVarChar, req.body.tipo)
        .input('dosis_requeridas', sql.Int, req.body.dosis_requeridas)
        .execute('sp_CrearVacuna');
      res.status(201).json({ id_vacuna: result.recordset[0].id_vacuna });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/vaccines/{id}:
 *   put:
 *     summary: Actualizar una vacuna
 *     tags: [Vaccines]
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
 *             $ref: '#/components/schemas/VaccineInput'
 *     responses:
 *       204:
 *         description: Vacuna actualizada exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Vacuna no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id',
  [authenticate, checkRole(['director', 'administrador']), validateUUID, validateVaccine],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_vacuna', sql.UniqueIdentifier, req.params.id)
        .input('nombre', sql.NVarChar, req.body.nombre)
        .input('fabricante', sql.NVarChar, req.body.fabricante)
        .input('tipo', sql.NVarChar, req.body.tipo)
        .input('dosis_requeridas', sql.Int, req.body.dosis_requeridas)
        .execute('sp_ActualizarVacuna');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/vaccines/{id}:
 *   delete:
 *     summary: Eliminar una vacuna
 *     tags: [Vaccines]
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
 *         description: Vacuna eliminada exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Vacuna no encontrada
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
        .input('id_vacuna', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarVacuna');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;