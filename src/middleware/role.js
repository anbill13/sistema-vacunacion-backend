// middleware/role.js
const jwt = require('jsonwebtoken');

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Obtener el token del encabezado Authorization
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
      }

      // Verificar el token y extraer el payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userRole = decoded.rol;

      // Verificar si el rol del usuario está en los roles permitidos
      if (!allowedRoles.includes(userRole)) {
        const error = new Error('Insufficient permissions');
        error.statusCode = 403;
        throw error;
      }

      // Agregar el usuario decodificado al request para uso posterior
      req.user = decoded;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = checkRole;