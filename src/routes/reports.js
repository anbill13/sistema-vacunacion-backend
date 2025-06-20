const express = require('express');
const { param, query } = require('express-validator');
const { authenticate, checkRole } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Generación de reportes y estadísticas
 */

/**
 * @swagger
 * /api/reports/coverage/{id}:
 *   get:
 *     summary: Obtener cobertura de vacunación por centro
 *     tags: [Reports]
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
 *         description: Cobertura obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 centro:
 *                   type: string
 *                 vacunados:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 porcentaje:
 *                   type: number
 *       400:
 *         description: ID inválido
 *       500:
 *         description: Error interno del servidor
 */
router.get('/coverage/:id', [authenticate, checkRole(['director', 'administrador']), param('id').isUUID()], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerCoberturaVacunacion');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/reports/incomplete-schedules/{id}:
 *   get:
 *     summary: Obtener niños con esquemas incompletos por centro
 *     tags: [Reports]
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
 *         description: Lista de niños con esquemas incompletos obtenida exitosamente
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
 *                   nombre_completo:
 *                     type: string
 *                   vacunas_faltantes:
 *                     type: integer
 *       400:
 *         description: ID inválido
 *       500:
 *         description: Error interno del servidor
 */
router.get('/incomplete-schedules/:id', [authenticate, checkRole(['director', 'administrador']), param('id').isUUID()], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_centro', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerEsquemasIncompletos');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Listar todos los reportes disponibles
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reportes disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   tipo:
 *                     type: string
 *                   descripcion:
 *                     type: string
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', [authenticate, checkRole(['director', 'administrador'])], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT DISTINCT tipo_reporte AS tipo, descripcion FROM Reportes_Disponibles'); // Ejemplo ficticio, ajustar según tabla real
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

module.exports = router;