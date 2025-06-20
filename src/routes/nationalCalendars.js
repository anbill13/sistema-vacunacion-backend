const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db'); // Use db.js
const { authenticate, checkRole } = require('../middleware/auth'); // Add auth middleware
const { param, body } = require('express-validator'); // For validation

/**
 * @swagger
 * tags:
 *   name: NationalCalendars
 *   description: API endpoints for managing national vaccination calendars
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     NationalCalendar:
 *       type: object
 *       properties:
 *         id_calendario:
 *           type: string
 *           format: uuid
 *         nombre_calendario:
 *           type: string
 *         pais:
 *           type: string
 *         descripcion:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *       required:
 *         - id_calendario
 *         - nombre_calendario
 *         - pais
 *         - estado
 *     NationalCalendarInput:
 *       type: object
 *       properties:
 *         nombre_calendario:
 *           type: string
 *         pais:
 *           type: string
 *         descripcion:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [Activo, Inactivo]
 *       required:
 *         - nombre_calendario
 *         - pais
 *         - estado
 */

const validateUUID = param('id').isUUID().withMessage('ID inválido');

const validateCalendar = [
  body('nombre_calendario').notEmpty().isString().withMessage('Nombre del calendario es requerido'),
  body('pais').notEmpty().isString().withMessage('País es requerido'),
  body('descripcion').optional().isString().withMessage('Descripción debe ser una cadena'),
  body('estado').isIn(['Activo', 'Inactivo']).withMessage('Estado inválido'),
];

/**
 * @swagger
 * /api/national-calendars:
 *   get:
 *     summary: Retrieve all national calendars
 *     tags: [NationalCalendars]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of national calendars
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NationalCalendar'
 *       500:
 *         description: Internal server error
 */
router.get('/', [authenticate, checkRole(['director', 'administrador'])], async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ListarCalendariosNacionales');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/national-calendars/{id}:
 *   get:
 *     summary: Retrieve a national calendar by ID
 *     tags: [NationalCalendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the national calendar
 *     responses:
 *       200:
 *         description: National calendar details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NationalCalendar'
 *       404:
 *         description: National calendar not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', [authenticate, checkRole(['director', 'administrador']), validateUUID], async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id_calendario', sql.UniqueIdentifier, req.params.id)
            .execute('sp_ObtenerCalendarioNacionalPorId');
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'Calendario nacional no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/national-calendars:
 *   post:
 *     summary: Create a new national calendar
 *     tags: [NationalCalendars]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NationalCalendarInput'
 *     responses:
 *       201:
 *         description: National calendar created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_calendario:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Bad request (e.g., missing required fields)
 *       500:
 *         description: Internal server error
 */
router.post('/', [authenticate, checkRole(['director', 'administrador']), validateCalendar], async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('nombre_calendario', sql.NVarChar, req.body.nombre_calendario)
            .input('pais', sql.NVarChar, req.body.pais)
            .input('descripcion', sql.NVarChar, req.body.descripcion)
            .input('estado', sql.NVarChar, req.body.estado)
            .execute('sp_CrearCalendarioNacional');
        res.status(201).json({ id_calendario: result.recordset[0].id_calendario });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/national-calendars/{id}:
 *   put:
 *     summary: Update an existing national calendar
 *     tags: [NationalCalendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the national calendar to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NationalCalendarInput'
 *     responses:
 *       200:
 *         description: National calendar updated successfully
 *       400:
 *         description: Bad request (e.g., missing required fields)
 *       404:
 *         description: National calendar not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', [authenticate, checkRole(['director', 'administrador']), validateUUID, validateCalendar], async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id_calendario', sql.UniqueIdentifier, req.params.id)
            .input('nombre_calendario', sql.NVarChar, req.body.nombre_calendario)
            .input('pais', sql.NVarChar, req.body.pais)
            .input('descripcion', sql.NVarChar, req.body.descripcion)
            .input('estado', sql.NVarChar, req.body.estado)
            .execute('sp_ActualizarCalendarioNacional');
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Calendario nacional no encontrado' });
        }
        res.status(200).json({ message: 'Calendario nacional actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/national-calendars/{id}:
 *   delete:
 *     summary: Delete a national calendar
 *     tags: [NationalCalendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the national calendar to delete
 *     responses:
 *       200:
 *         description: National calendar deleted successfully
 *       404:
 *         description: National calendar not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', [authenticate, checkRole(['director', 'administrador']), validateUUID], async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id_calendario', sql.UniqueIdentifier, req.params.id)
            .execute('sp_EliminarCalendarioNacional');
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Calendario nacional no encontrado' });
        }
        res.status(200).json({ message: 'Calendario nacional eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;