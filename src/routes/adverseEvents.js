const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db'); // Use db.js instead of dbConfig

/**
 * @swagger
 * tags:
 *   name: AdverseEvents
 *   description: API endpoints for managing adverse events
 */

/**
 * @swagger
 * /adverseEvents:
 *   get:
 *     summary: Retrieve all adverse events
 *     tags: [AdverseEvents]
 *     responses:
 *       200:
 *         description: A list of adverse events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AdverseEvent'
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise; // Use poolPromise
        const result = await pool.request().execute('sp_ListarEventosAdversos');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /adverseEvents/{id}:
 *   get:
 *     summary: Retrieve an adverse event by ID
 *     tags: [AdverseEvents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the adverse event
 *     responses:
 *       200:
 *         description: Adverse event details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdverseEvent'
 *       404:
 *         description: Adverse event not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id_evento', sql.UniqueIdentifier, req.params.id)
            .execute('sp_ObtenerEventoAdversoPorId');
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'Evento adverso no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /adverseEvents:
 *   post:
 *     summary: Create a new adverse event
 *     tags: [AdverseEvents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdverseEventInput'
 *     responses:
 *       201:
 *         description: Adverse event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_evento:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Bad request (e.g., missing required fields)
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req, res) => {
    try {
        // Validate required fields
        if (!req.body.id_historial || !req.body.id_personal_reportante || !req.body.fecha_reporte ||
            !req.body.tipo_evento || !req.body.severidad || !req.body.estado) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('id_historial', sql.UniqueIdentifier, req.body.id_historial)
            .input('id_personal_reportante', sql.UniqueIdentifier, req.body.id_personal_reportante)
            .input('fecha_reporte', sql.DateTime2, req.body.fecha_reporte)
            .input('tipo_evento', sql.NVarChar, req.body.tipo_evento)
            .input('severidad', sql.NVarChar, req.body.severidad)
            .input('descripcion', sql.NVarChar, req.body.descripcion)
            .input('estado', sql.NVarChar, req.body.estado)
            .execute('sp_CrearEventoAdverso');
        res.status(201).json({ id_evento: result.recordset[0].id_evento });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/adverseEvents/{id}:
 *   put:
 *     summary: Update an existing adverse event
 *     tags: [AdverseEvents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the adverse event to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdverseEventInput'
 *     responses:
 *       200:
 *         description: Successful event updated successfully
 *       400:
 *         description: Bad request (e.g., missing required fields)
 *       404:
 *         description: Not found not found
 *       500:
 *         description: Server server error
 */
router.put('/:id', async (req, res) => {
    try {
    // Validate required fields
    if (!req.body.id_historial || !req.body.id_personal_reportante || !req.body.fecha_reporte ||
        !req.body.tipo_evento || !req.body.severidad || !req.body.estado) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
        .input('id_evento', sql.UniqueIdentifier, req.params.id)
        .input('id_historial', sql.UniqueIdentifier, req.body.id_historial)
        .input('id_personal_reportante', sql.UniqueIdentifier, req.body.id_personal_reportante)
        .input('fecha_reporte', sql.DateTime2, req.body.fecha_reporte)
        .input('tipo_evento', sql.NVarChar, req.body.tipo_evento)
        .input('severidad', sql.NVarChar, req.body.severidad)
        .input('descripcion', sql.NVarChar, req.body.descripcion)
        .input('estado', sql.NVarChar, req.body.estado)
        .execute('sp_ActualizarEventoAdverso');

    // Check if the update affected any rows
    if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ error: 'Evento adverso no encontrado' });
    }
    res.status(200).json({ message: 'Evento adverso actualizado' });
    } catch (err) {
    res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /adverseEvents/{id}:
 *   delete:
 *     summary: Delete an adverse event
 *     tags: [AdverseEvents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the adverse event to delete
 *     responses:
 *       200:
 *         description: Adverse event deleted successfully
 *       404:
 *         description: Adverse event not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id_evento', sql.UniqueIdentifier, req.params.id)
            .execute('sp_EliminarEventoAdverso');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Evento adverso no encontrado' });
        }
        res.status(200).json({ message: 'Evento adverso eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     AdverseEvent:
 *       type: object
 *       properties:
 *         id_evento:
 *           type: string
 *           format: uuid
 *         id_historial:
 *           type: string
 *           format: uuid
 *         id_personal_reportante:
 *           type: string
 *           format: uuid
 *         fecha_reporte:
 *           type: string
 *           format: date-time
 *         tipo_evento:
 *           type: string
 *         severidad:
 *           type: string
 *         descripcion:
 *           type: string
 *         estado:
 *           type: string
 *       required:
 *         - id_evento
 *         - id_historial
 *         - id_personal_reportante
 *         - fecha_reporte
 *         - tipo_evento
 *         - severidad
 *         - estado
 *     AdverseEventInput:
 *       type: object
 *       properties:
 *         id_historial:
 *           type: string
 *           format: uuid
 *         id_personal_reportante:
 *           type: string
 *           format: uuid
 *         fecha_reporte:
 *           type: string
 *           format: date-time
 *         tipo_evento:
 *           type: string
 *         severidad:
 *           type: string
 *         descripcion:
 *           type: string
 *         estado:
 *           type: string
 *       required:
 *         - id_historial
 *         - id_personal_reportante
 *         - fecha_reporte
 *         - tipo_evento
 *         - severidad
 *         - estado
 */

module.exports = router;