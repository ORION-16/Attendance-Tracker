const User = require('../models/User');
const {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
} = require('../utils/tokenService');

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

function validateCredentials({ name, email, password }, needsName = false) {
  if (needsName && (!name || name.trim().length < 2)) return 'Please enter your name (at least 2 characters).';
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address.';
  if (!password || password.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const validationError = validateCredentials({ name, email, password }, true);
    if (validationError) return res.status(400).json({ message: validationError });

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(409).json({ message: 'An account with this email already exists.' });

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await User.hashPassword(password),
    });

    setRefreshCookie(res, createRefreshToken(user));
    return res.status(201).json({ user: publicUser(user), accessToken: createAccessToken(user) });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const validationError = validateCredentials({ email, password });
    if (validationError) return res.status(400).json({ message: validationError });

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }

    setRefreshCookie(res, createRefreshToken(user));
    return res.json({ user: publicUser(user), accessToken: createAccessToken(user) });
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: 'No active session found.' });

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }

    const user = await User.findById(payload.sub);
    if (!user || user.refreshTokenVersion !== payload.tokenVersion) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Session is no longer valid. Please sign in again.' });
    }

    setRefreshCookie(res, createRefreshToken(user));
    return res.json({ user: publicUser(user), accessToken: createAccessToken(user) });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await User.findByIdAndUpdate(payload.sub, { $inc: { refreshTokenVersion: 1 } });
      } catch (error) {
        // The cookie is cleared regardless of whether it can be verified.
      }
    }
    clearRefreshCookie(res);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login, refresh, logout };
