// src/middleware/role.js
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

const checkRole = (roles) => (req, res, next) => {
  const userRole = req.user?.rol;

  if (!userRole) {
    logger.warn('Usuario sin rol asignado', { user: req.user, ip: req.ip });
    const error = new Error('No role assigned to user');
    error.statusCode = 403;
    return next(error);
  }

  if (!roles.includes(userRole)) {
    logger.warn('Acceso denegado: rol no autorizado', {
      user: req.user.username,
      role: userRole,
      requiredRoles: roles,
      ip: req.ip,
    });
    const error = new Error('Insufficient permissions');
    error.statusCode = 403;
    return next(error);
  }

  logger.info('Rol autorizado', { user: req.user.username, role: userRole, ip: req.ip });
  next();
};

module.exports = checkRole;