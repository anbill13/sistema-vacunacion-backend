const checkRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.rol)) {
    const error = new Error('Insufficient permissions');
    error.statusCode = 403;
    return next(error);
  }
  next();
};

module.exports = checkRole;