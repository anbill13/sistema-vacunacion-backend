// src/middleware/errorHandler.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

const errorHandler = (err, req, res, next) => {
  logger.error('Error en la aplicación', {
    error: err.message || err.message,
    stack: err.stack || err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
  });

  res.status(err.statusCode || 500).json({
    error: err.message || 'Error del servidor',
    data: err.data || [],
  });
};

module.exports = errorHandler;