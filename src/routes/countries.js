const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db'); // Use db.js
const { authenticate, checkRole } = require('../middleware/auth'); // Add auth middleware
const { param, body } = require('express-validator'); // For validation

/**
 * @swagger
 * tags:
 *   name: Countries
 *   description: API endpoints for managing countries
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Country:
 *       type: object
 *       properties:
 *         id_pais:
 *           type: string
 *           format: uuid
 *         nombre_pais:
 *           type: string
 *         codigo_iso:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *       required:
 *         - id_pais
 *         - nombre_pais
 *         - codigo_iso
 *         - estado
 *     CountryInput:
 *       type: object
 *       properties:
 *         nombre_pais:
 *           type: string
 *         codigo_iso:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *       required:
 *         - nombre_pais
 *         - codigo_iso
 *         - estado
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');

const validateCountry = [
  body('nombre_pais').notEmpty().isString().withMessage('Nombre del país es requerido'),
  body('codigo_iso').notEmpty().isString().withMessage('Código ISO es requerido'),
  body('estado').isIn(['Activo', 'Inactivo']).withMessage('Estado inválido'),
];

/**
 * @swagger
 * /api/countries:
 *   get:
 *     summary: Retrieve all countries
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of countries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Country'
 *       500:
 *         description: Internal server error
 */
router.get('/', [authenticate, checkRole(['director', 'administrador'])], async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ListarPaises');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/countries/{id}:
 *   get:
 *     summary: Retrieve a country by ID
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the country
 *     responses:
 *       200:
 *         description: Country details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Country'
 *       404:
 *         description: Country not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', [authenticate, checkRole(['director', 'administrador']), validateUUID], async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id_pais', sql.UniqueIdentifier, req.params.id)
            .execute('sp_ObtenerPaisPorId');
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'País no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/countries:
 *   post:
 *     summary: Create a new country
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CountryInput'
 *     responses:
 *       201:
 *         description: Country created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_pais:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Bad request (e.g., missing required fields)
 *       500:
 *         description: Internal server error
 */
router.post('/', [authenticate, checkRole(['director', 'administrador']), validateCountry], async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('nombre_pais', sql.NVarChar, req.body.nombre_pais)
            .input('codigo_iso', sql.NVarChar, req.body.codigo_iso)
            .input('estado', sql.NVarChar, req.body.estado)
            .execute('sp_CrearPais');
        res.status(201).json({ id_pais: result.recordset[0].id_pais });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/countries/{id}:
 *   put:
 *     summary: Update an existing country
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the country to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CountryInput'
 *     responses:
 *       200:
 *         description: Country updated successfully
 *       400:
 *         description: Bad request (e.g., missing required fields)
 *       404:
 *         description: Country not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', [authenticate, checkRole(['director', 'administrador']), validateUUID, validateCountry], async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id_pais', sql.UniqueIdentifier, req.params.id)
            .input('nombre_pais', sql.NVarChar, req.body.nombre_pais)
            .input('codigo_iso', sql.NVarChar, req.body.codigo_iso)
            .input('estado', sql.NVarChar, req.body.estado)
            .execute('sp_ActualizarPais');
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'País no encontrado' });
        }
        res.status(200).json({ message: 'País actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/countries/{id}:
 *   delete:
 *     summary: Delete a country
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the country to delete
 *     responses:
 *       200:
 *         description: Country deleted successfully
 *       404:
 *         description: Country not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', [authenticate, checkRole(['director', 'administrador']), validateUUID], async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id_pais', sql.UniqueIdentifier, req.params.id)
            .execute('sp_EliminarPais');
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'País no encontrado' });
        }
        res.status(200).json({ message: 'País eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;