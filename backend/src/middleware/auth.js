const jwt = require('jsonwebtoken');
const { loadEnv } = require('../config/env');

const env = loadEnv();

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication is required.' });
  }

  try {
    const payload = jwt.verify(header.slice(7), env.accessTokenSecret, { issuer: env.jwtIssuer, audience: env.jwtAudience });
    req.user = { id: payload.sub };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}

module.exports = { requireAuth };
