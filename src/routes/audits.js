const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, checkRole } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const { logger } = require('../config/db');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Audits
 *   description: Registro de auditorías
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
 *           description: Identificador único de la auditoría
 *         tabla_afectada:
 *           type: string
 *           description: Tabla afectada
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
 *           enum: [INSERT, UPDATE, DELETE, SELECT]
 *           description: Acción realizada
 *         detalles:
 *           type: string
 *           description: Detalles de la acción (opcional)
 *         ip_origen:
 *           type: string
 *           description: IP de origen (opcional)
 *         fecha_registro:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora del registro
 *     AuditInput:
 *       type: object
 *       required:
 *         - tabla_afectada
 *         - id_registro
 *         - id_usuario
 *         - accion
 *       properties:
 *         tabla_afectada:
 *           type: string
 *         id_registro:
 *           type: string
 *           format: uuid
 *         id_usuario:
 *           type: string
 *           format: uuid
 *         accion:
 *           type: string
 *           enum: [INSERT, UPDATE, DELETE, SELECT]
 *         detalles:
 *           type: string
 *           nullable: true
 *         ip_origen:
 *           type: string
 *           nullable: true
 */

const validateAudit = [
  body('tabla_afectada').notEmpty().isString().withMessage('Tabla afectada es requerida'),
  body('id_registro').isUUID().withMessage('ID de registro inválido'),
  body('id_usuario').isUUID().withMessage('ID de usuario inválido'),
  body('accion').isIn(['INSERT', 'UPDATE', 'DELETE', 'SELECT']).withMessage('Acción inválida'),
  body('detalles').optional().isString(),
  body('ip_origen').optional().isIP().withMessage('IP de origen inválida'),
];

const validateUUID = param('id').isUUID().withMessage('ID inválido');

/**
 * @swagger
 * /api/audits:
 *   get:
 *     summary: Listar todas las auditorías
 *     tags: [Audits]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de auditorías obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Audit'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', [authenticate, checkRole(['director', 'administrador'])], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Auditoria');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/audits/{id}:
 *   get:
 *     summary: Obtener una auditoría por ID
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
 *     responses:
 *       200:
 *         description: Auditoría obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Audit'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Auditoría no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', [authenticate, checkRole(['director', 'administrador']), validateUUID], async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id_auditoria', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Auditoria WHERE id_auditoria = @id_auditoria');
    if (result.recordset.length === 0) {
      const error = new Error('Auditoría no encontrada');
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
 * /api/audits:
 *   post:
 *     summary: Registrar una entrada de auditoría
 *     tags: [Audits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuditInput'
 *     responses:
 *       201:
 *         description: Auditoría registrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_auditoria:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/',
  [authenticate, checkRole(['director', 'administrador']), validateAudit],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('tabla_afectada', sql.NVarChar, req.body.tabla_afectada)
        .input('id_registro', sql.UniqueIdentifier, req.body.id_registro)
        .input('id_usuario', sql.UniqueIdentifier, req.body.id_usuario)
        .input('accion', sql.NVarChar, req.body.accion)
        .input('detalles', sql.NVarChar, req.body.detalles)
        .input('ip_origen', sql.NVarChar, req.body.ip_origen)
        .execute('sp_RegistrarAuditoria');
      res.status(201).json({ id_auditoria: result.recordset[0].id_auditoria });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/audits/{id}:
 *   put:
 *     summary: Actualizar una entrada de auditoría
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuditInput'
 *     responses:
 *       204:
 *         description: Auditoría actualizada exitosamente
 *       400:
 *         description: Error en los datos enviados
 *       404:
 *         description: Auditoría no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  '/:id',
  [authenticate, checkRole(['director', 'administrador']), validateUUID, validateAudit],
  async (req, res, next) => {
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input('id_auditoria', sql.UniqueIdentifier, req.params.id)
        .input('tabla_afectada', sql.NVarChar, req.body.tabla_afectada)
        .input('id_registro', sql.UniqueIdentifier, req.body.id_registro)
        .input('id_usuario', sql.UniqueIdentifier, req.body.id_usuario)
        .input('accion', sql.NVarChar, req.body.accion)
        .input('detalles', sql.NVarChar, req.body.detalles)
        .input('ip_origen', sql.NVarChar, req.body.ip_origen)
        .query('UPDATE Auditoria SET tabla_afectada = @tabla_afectada, id_registro = @id_registro, id_usuario = @id_usuario, accion = @accion, detalles = @detalles, ip_origen = @ip_origen WHERE id_auditoria = @id_auditoria'); // Nota: No hay stored procedure, usar UPDATE directo
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/audits/{id}:
 *   delete:
 *     summary: Eliminar una entrada de auditoría
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
 *     responses:
 *       204:
 *         description: Auditoría eliminada exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Auditoría no encontrada
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
        .input('id_auditoria', sql.UniqueIdentifier, req.params.id)
        .query('DELETE FROM Auditoria WHERE id_auditoria = @id_auditoria'); // Nota: No hay stored procedure, usar DELETE directo
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;