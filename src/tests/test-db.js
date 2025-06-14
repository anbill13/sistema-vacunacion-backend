const { poolPromise } = require('./src/config/db');

async function testConnection() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT 1 AS test');
    console.log('Conexión exitosa:', result.recordset);
  } catch (err) {
    console.error('Fallo en la conexión:', err);
  }
}

testConnection();