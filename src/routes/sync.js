const express = require('express');
const { authenticate } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const router = express.Router();

router.post(
  '/batch',
  authenticate,
  async (req, res, next) => {
    const operations = req.body; // Array de operaciones: [{ endpoint, method, data }, ...]
    try {
      const pool = await poolPromise;
      const results = [];

      for (const op of operations) {
        const { endpoint, method, data } = op;
        let procName;

        switch (endpoint) {
          case 'children':
            procName = method === 'POST' ? 'sp_CrearNino' : 'sp_ActualizarNino';
            break;
          case 'guardians':
            procName = method === 'POST' ? 'sp_CrearTutor' : 'sp_ActualizarTutor';
            break;
          // Agregar más casos según sea necesario (campaigns, centers, etc.)
          default:
            throw new Error(`Unsupported endpoint: ${endpoint}`);
        }

        const result = await pool.request()
          .input('params', sql.NVarChar, JSON.stringify(data))
          .execute(procName);
        results.push(result.recordset[0]);
      }

      res.status(201).json({ message: 'Batch processed', results });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;