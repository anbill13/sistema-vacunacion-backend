const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    return next(error);
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    error.statusCode = 403;
    next(error);
  }
};

module.exports = authenticate;