const sql = require('mssql');
const winston = require('winston');
require('dotenv').config();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/app.log' }),
    new winston.transports.Console(),
  ],
});

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

const poolPromise = sql.connect(dbConfig)
  .then(pool => {
    logger.info('✅ Conectado a Azure SQL Server');
    return pool;
  })
  .catch(err => {
    logger.error('❌ Fallo en la conexión a la base de datos', { error: err.message });
    throw err;
  });

module.exports = { poolPromise, sql, logger };