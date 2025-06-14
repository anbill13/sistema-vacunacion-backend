const { logger } = require('../config/db');

const errorHandler = (err, req, res, next) => {
  logger.error(`${err.message} - ${req.method} ${req.url}`, {
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;