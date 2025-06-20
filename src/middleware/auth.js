// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const winston = require('winston'); // Importa winston directamente

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

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extrae el token después de "Bearer"

  if (!token) {
    logger.warn('Intento de acceso sin token', { ip: req.ip });
    const error = new Error('Access token is missing');
    error.statusCode = 401;
    return next(error);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Token inválido', { token, ip: req.ip });
      const error = new Error('Invalid token');
      error.statusCode = 401;
      return next(error);
    }
    req.user = user; // Guarda los datos del usuario decodificados
    logger.info('Usuario autenticado', { user: user.username, ip: req.ip });
    next();
  });
};

module.exports = authenticate;