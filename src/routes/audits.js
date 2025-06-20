const express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator');
const sql = require('mssql');
const { authenticate, checkRole } = require('../middleware/auth');
const config = require('../config/dbConfig');

/**
 * @swagger
 * tags:
 *   name: Audits
 *   description: Gestión de registros de auditoría
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Audit:
 *       type: object
 *       required:
 *         - tabla_afectada
 *         - id_registro
 *         - id_usuario
 *         - accion
 *       properties:
 *         id_auditoria:
 *           type: string
 *           format: uuid
 *           description: Identificador único del registro de auditoría
 *         tabla_afectada:
 *           type: string
 *           description: Nombre de la tabla afectada
 *         id_registro:
 *           type: string
 *           format: uuid
 *           description: ID del registro afectado
 *         id_usuario:
 *           type: string
 *           format: uuid
 *           description: ID del usuario que realizó la acción
 *         accion:
 *           type: string
 *           description: Acción realizada (inserción, actualización, eliminación)
 *         fecha_accion:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la acción
 *         detalles:
 *           type: string
 *           description: Detalles adicionales de la acción (opcional)
 *       example:
 *         id_auditoria: "123e4567-e89b-12d3-a456-426614174012"
 *         tabla_afectada: "Niños"
 *         id_registro: "123e4567-e89b-12d3-a456-426614174000"
 *         id_usuario: "123e4567-e89b-12d3-a456-426614174007"
 *         accion: "INSERT"
 *         fecha_accion: "2025-06-20T10:00:00Z"
 *         detalles: "Creado nuevo niño"

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * /api/audits:
 *   get:
 *     summary: Obtener todos los registros de auditoría
 *     tags: [Audits]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de registros de auditoría
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Audit'
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, checkRole(['administrador']), async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id_auditoria, tabla_afectada, id_registro, id_usuario, accion, fecha_accion, detalles
      FROM Auditoria
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener registros de auditoría' });
  }
});

/**
 * @swagger
 * /api/audits/{id}:
 *   get:
 *     summary: Obtener un registro de auditoría por ID
 *     tags: [Audits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del registro de auditoría
 *     responses:
 *       200:
 *         description: Registro de auditoría encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Audit'
 *       400:
 *         description: ID inválido
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       404:
 *         description: Registro de auditoría no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, checkRole(['administrador']), validateUUID, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id_auditoria', sql.UniqueIdentifier, req.params.id)
      .execute('sp_ObtenerAuditoria');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Registro de auditoría no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener registro de auditoría' });
  }
});

module.exports = router;