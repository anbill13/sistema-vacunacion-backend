const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, checkRole } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Supplies
 *   description: Gestión de suministros
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Supply:
 *       type: object
 *       required:
 *         - nombre_suministro
 *         - cantidad_total
 *         - cantidad_disponible
 *         - id_centro
 *         - fecha_entrada
 *       properties:
 *         id_suministro:
 *           type: string
 *           format: uuid
 *           description: Identificador único del suministro
 *         nombre_suministro:
 *           type: string
 *           description: Nombre del suministro
 *         tipo_suministro:
 *           type: string
 *           description: Tipo de suministro (opcional)
 *         cantidad_total:
 *           type: integer
 *           description: Cantidad total
 *         cantidad_disponible:
 *           type: integer
 *           description: Cantidad disponible
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: ID del centro
 *         fecha_entrada:
 *           type: string
 *           format: date
 *           description: Fecha de entrada
 *         fecha_vencimiento:
 *           type: string
 *           format: date
 *           description: Fecha de vencimiento (opcional)
 *         proveedor:
 *           type: string
 *           description: Proveedor (opcional)
 *         condiciones_almacenamiento:
 *           type: string
 *           description: Condiciones de almacenamiento (opcional)
 *     SupplyInput:
 *       type: object
 *       required:
 *         - nombre_suministro
 *         - cantidad_total
 *         - cantidad_disponible
 *         - id_centro
 *         - fecha_entrada
 *       properties:
 *         nombre_suministro:
 *           type: string
 *         tipo_suministro:
 *           type: string
 *           nullable: true
 *         cantidad_total:
 *           type: integer
 *         cantidad_disponible:
 *           type: integer
 *         id_centro:
 *           type: string
 *           format: uuid
 *         fecha_entrada:
 *           type: string
 *           format: date
 *         fecha_vencimiento:
 *           type: string
 *           format: date
 *           nullable: true
 *         proveedor:
 *           type: string
 *           nullable: true
 *         condiciones_almacenamiento:
 *           type: string
 *           nullable: true
 */

const validateSupply = [
  body('nombre_suministro').notEmpty().isString().withMessage('Nombre del suministro es requerido'),
  body('tipo_suministro').optional().isString(),
  body('cantidad_total').isInt({ min: 1 }).withMessage('Cantidad total debe ser un número positivo'),
  body('cantidad_disponible').isInt({ min: 0 }).withMessage('Cantidad disponible debe ser un número no negativo'),
  body('id_centro').isUUID().withMessage('ID de centro inválido'),
  body('fecha_entrada').isDate().withMessage('Fecha de entrada inválida'),
  body('fecha_vencimiento').optional().isDate().withMessage('Fecha de vencimiento inválida'),
  body('proveedor').optional().isString(),
  body('condiciones_almacenamiento').optional().isString(),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * /api/supplies:
 *   get:
 *     summary: Listar todos los suministros
 *     tags: [Supplies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de suministros obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Supply'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', [authenticate, checkRole(['director', 'administrador'])], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Inventario_Suministros');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/supplies/{id}:
 *   get:
 *     summary: Obtener un suministro por ID
 *     tags: [Supplies]
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
 *         description: Suministro obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Supply'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Suministro no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [authenticate, checkRole(['director', 'administrador']), validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_suministro', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Inventario_Suministros WHERE id_suministro = @id_suministro');
    if (result.recordset.length === 0) {
      const error = new Error('Suministro no encontrado');
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
 * /api/supplies:
 *   post:
 *     summary: Crear un nuevo suministro
 *     tags: [Supplies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SupplyInput'
 *     responses:
 *       201:
 *         description: Suministro creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_suministro:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/',
  [authenticate, checkRole(['director', 'administrador']), validateSupply],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('nombre_suministro', sql.NVarChar, req.body.nombre_suministro)
        .input('tipo_suministro', sql.NVarChar, req.body.tipo_suministro)
        .input('cantidad_total', sql.Int, req.body.cantidad_total)
        .input('cantidad_disponible', sql.Int, req.body.cantidad_disponible)
        .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
        .input('fecha_entrada', sql.Date, req.body.fecha_entrada)
        .input('fecha_vencimiento', sql.Date, req.body.fecha_vencimiento)
        .input('proveedor', sql.NVarChar, req.body.proveedor)
        .input('condiciones_almacenamiento', sql.NVarChar, req.body.condiciones_almacenamiento)
        .query('INSERT INTO Inventario_Suministros (nombre_suministro, tipo_suministro, cantidad_total, cantidad_disponible, id_centro, fecha_entrada, fecha_vencimiento, proveedor, condiciones_almacenamiento) VALUES (@nombre_suministro, @tipo_suministro, @cantidad_total, @cantidad_disponible, @id_centro, @fecha_entrada, @fecha_vencimiento, @proveedor, @condiciones_almacenamiento); SELECT SCOPE_IDENTITY() AS id_suministro'); // Nota: No hay stored procedure, usar INSERT directo
      res.status(201).json({ id_suministro: result.recordset[0].id_suministro });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/supplies/{id}:
 *   put:
 *     summary: Actualizar un suministro
 *     tags: [Supplies]
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
 *             $ref: '#/components/schemas/SupplyInput'
 *     responses:
 *       204:
 *         description: Suministro actualizado exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Suministro no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id',
  [authenticate, checkRole(['director', 'administrador']), validateUUID, validateSupply],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_suministro', sql.UniqueIdentifier, req.params.id)
        .input('nombre_suministro', sql.NVarChar, req.body.nombre_suministro)
        .input('tipo_suministro', sql.NVarChar, req.body.tipo_suministro)
        .input('cantidad_total', sql.Int, req.body.cantidad_total)
        .input('cantidad_disponible', sql.Int, req.body.cantidad_disponible)
        .input('id_centro', sql.UniqueIdentifier, req.body.id_centro)
        .input('fecha_entrada', sql.Date, req.body.fecha_entrada)
        .input('fecha_vencimiento', sql.Date, req.body.fecha_vencimiento)
        .input('proveedor', sql.NVarChar, req.body.proveedor)
        .input('condiciones_almacenamiento', sql.NVarChar, req.body.condiciones_almacenamiento)
        .execute('sp_ActualizarSuministro');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/supplies/{id}:
 *   delete:
 *     summary: Eliminar un suministro
 *     tags: [Supplies]
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
 *         description: Suministro eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Suministro no encontrado
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
        .input('id_suministro', sql.UniqueIdentifier, req.params.id)
        .execute('sp_EliminarSuministro');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;