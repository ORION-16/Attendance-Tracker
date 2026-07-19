const jwt = require('jsonwebtoken');
const { loadEnv } = require('../config/env');

const env = loadEnv();
const useSecureCookies = env.nodeEnv === 'production' && env.clientUrl.startsWith('https://');
const sameSitePolicy = useSecureCookies ? 'none' : 'lax';

function createAccessToken(user) {
  return jwt.sign({ sub: user._id.toString() }, env.accessTokenSecret, {
    expiresIn: '15m', issuer: env.jwtIssuer, audience: env.jwtAudience,
  });
}

function createRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), tokenVersion: user.refreshTokenVersion },
    env.refreshTokenSecret,
    { expiresIn: '7d', issuer: env.jwtIssuer, audience: env.jwtAudience }
  );
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.refreshTokenSecret, { issuer: env.jwtIssuer, audience: env.jwtAudience });
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: sameSitePolicy,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: sameSitePolicy,
    path: '/api/auth',
  });
}

module.exports = { createAccessToken, createRefreshToken, verifyRefreshToken, setRefreshCookie, clearRefreshCookie };
