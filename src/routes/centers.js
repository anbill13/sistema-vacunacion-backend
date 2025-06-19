const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate, checkRole } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: Centers
 *   description: Gestión de centros de vacunación
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Center:
 *       type: object
 *       required:
 *         - nombre_centro
 *       properties:
 *         id_centro:
 *           type: string
 *           format: uuid
 *           description: Identificador único del centro
 *         nombre_centro:
 *           type: string
 *           description: Nombre del centro
 *         nombre_corto:
 *           type: string
 *           nullable: true
 *           description: Nombre corto del centro
 *         direccion:
 *           type: string
 *           nullable: true
 *           description: Dirección del centro
 *         latitud:
 *           type: number
 *           nullable: true
 *           description: Latitud del centro
 *         longitud:
 *           type: number
 *           nullable: true
 *           description: Longitud del centro
 *         telefono:
 *           type: string
 *           nullable: true
 *           description: Teléfono del centro
 *         director:
 *           type: string
 *           nullable: true
 *           description: Nombre del director
 *         sitio_web:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Sitio web del centro
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *           description: Estado del registro
 *       example:
 *         id_centro: "123e4567-e89b-12d3-a456-426614174002"
 *         nombre_centro: "Centro de Salud Central"
 *         estado: "Activo"
 *     CenterInput:
 *       type: object
 *       required:
 *         - nombre_centro
 *       properties:
 *         nombre_centro:
 *           type: string
 *         nombre_corto:
 *           type: string
 *           nullable: true
 *         direccion:
 *           type: string
 *           nullable: true
 *         latitud:
 *           type: number
 *           nullable: true
 *         longitud:
 *           type: number
 *           nullable: true
 *         telefono:
 *           type: string
 *           nullable: true
 *         director:
 *           type: string
 *           nullable: true
 *         sitio_web:
 *           type: string
 *           format: uri
 *           nullable: true
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');
const validateCenter = [
  body('nombre_centro').notEmpty().isString().withMessage('Nombre del centro es requerido'),
  body('nombre_corto').optional().isString(),
  body('direccion').optional().isString(),
  body('latitud').optional().isFloat(),
  body('longitud').optional().isFloat(),
  body('telefono').optional().isString(),
  body('director').optional().isString(),
  body('sitio_web').optional().isURL(),
];

/**
 * @swagger
 * /api/centers:
 *   get:
 *     summary: Obtener todos los centros activos
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de centros activos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Center'
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_centro, nombre_centro, nombre_corto, direccion, latitud, longitud, telefono, director, sitio_web, estado
      FROM Centros_Vacunacion WHERE estado = 'Activo'
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener centros' });
  }
});

/**
 * @swagger
 * /api/centers:
 *   post:
 *     summary: Crear un nuevo centro
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CenterInput'
 *     responses:
 *       201:
 *         description: Centro creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_centro:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       403:
 *         description: No autorizado (requiere rol de director o administrador)
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, checkRole(['director', 'administrador']), validateCenter, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre_centro, nombre_corto, direccion, latitud, longitud, telefono, director, sitio_web } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('nombre_centro', sql.NVarChar, nombre_centro)
      .input('nombre_corto', sql.NVarChar, nombre_corto)
      .input('direccion', sql.NVarChar, direccion)
      .input('latitud', sql.Decimal(9, 6), latitud)
      .input('longitud', sql.Decimal(9, 6), longitud)
      .input('telefono', sql.NVarChar, telefono)
      .input('director', sql.NVarChar, director)
      .input('sitio_web', sql.NVarChar, sitio_web)
      .execute('sp_CrearCentroVacunacion');

    res.status(201).json({ id_centro: result.recordset[0].id_centro });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear centro' });
  }
});

/**
 * @swagger
 * /api/centers/{id}:
 *   get:
 *     summary: Obtener un centro por ID
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro
 *     responses:
 *       200:
 *         description: Centro encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Center'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Centro no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerCentroVacunacion');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Centro no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener centro' });
  }
});

/**
 * @swagger
 * /api/centers/{id}:
 *   put:
 *     summary: Actualizar un centro
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
<<<<<<< HEAD
 *             $ref: '#/components/schemas/CenterInput'
=======
 *             type: object
 *             properties:
 *               nombre_centro:
 *                 type: string
 *                 example: "Centro de Salud Santo Domingo Actualizado"
 *               nombre_corto:
 *                 type: string
 *                 example: "CSSD"
 *               direccion:
 *                 type: string
 *                 example: "Calle 1, Santo Domingo"
 *               latitud:
 *                 type: number
 *                 format: float
 *                 example: 18.4861
 *               longitud:
 *                 type: number
 *                 format: float
 *                 example: -69.9312
 *               telefono:
 *                 type: string
 *                 example: "8098765432"
 *               director:
 *                 type: string
 *                 example: "Dr. José Gómez"
 *               sitio_web:
 *                 type: string
 *                 format: url
 *                 example: "http://cssd.gov.do"
>>>>>>> b447ffd (cleanup)
 *     responses:
 *       200:
 *         description: Centro actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Centro actualizado
 *       400:
 *         description: Error en los datos enviados
 *       403:
 *         description: No autorizado (requiere rol de director o administrador)
 *       404:
 *         description: Centro no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, checkRole(['director', 'administrador']), validateUUID, validateCenter, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre_centro, nombre_corto, direccion, latitud, longitud, telefono, director, sitio_web } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .input('nombre_centro', sql.NVarChar, nombre_centro)
      .input('nombre_corto', sql.NVarChar, nombre_corto)
      .input('direccion', sql.NVarChar, direccion)
      .input('latitud', sql.Decimal(9, 6), latitud)
      .input('longitud', sql.Decimal(9, 6), longitud)
      .input('telefono', sql.NVarChar, telefono)
      .input('director', sql.NVarChar, director)
      .input('sitio_web', sql.NVarChar, sitio_web)
      .execute('sp_ActualizarCentroVacunacion');

    res.json({ message: 'Centro actualizado' });
  } catch (err) {
    if (err.number === 50001 || err.number === 50002) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error al actualizar centro' });
  }
});

/**
 * @swagger
 * /api/centers/{id}:
 *   delete:
 *     summary: Desactivar un centro
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del centro
 *     responses:
 *       200:
 *         description: Centro desactivado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Centro desactivado
 *       400:
 *         description: ID inválido
 *       403:
 *         description: No autorizado (requiere rol de director o administrador)
 *       404:
 *         description: Centro no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, checkRole(['director', 'administrador']), validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_EliminarCentroVacunacion');

    res.json({ message: 'Centro desactivado' });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Error al desactivar centro' });
  }
});

module.exports = router;