/**
 * middleware/auth.js
 * JWT authentication middleware and token generation helpers.
 * JWT_SECRET must be set via environment variable — no fallback allowed.
 */
'use strict';

const jwt = require('jsonwebtoken');

// ── JWT Secret Validation ─────────────────────────────────────────────────
// Fail loudly at startup if the secret is missing or insecure.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ FATAL: JWT_SECRET env var is not set or is too short (min 32 chars).');
  console.error('   Add JWT_SECRET=<random 64-char string> to your .env file.');
  process.exit(1);
}

const JWT_EXPIRES_IN         = process.env.JWT_EXPIRES_IN         || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ── Token Generators ─────────────────────────────────────────────────────

/**
 * Generate a short-lived access token.
 * Payload contains only userId and email — no sensitive data.
 */
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate a long-lived refresh token.
 * Used to obtain new access tokens without re-authentication.
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
}

// ── Auth Middleware ───────────────────────────────────────────────────────

/**
 * Express middleware: verifies Bearer JWT from Authorization header.
 * Attaches { id, email } to req.user on success.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      // Provide meaningful errors without leaking internals
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Session expired — please log in again.' });
      }
      return res.status(403).json({ success: false, error: 'Invalid access token' });
    }

    // Reject refresh tokens used as access tokens
    if (payload.type === 'refresh') {
      return res.status(403).json({ success: false, error: 'Invalid access token' });
    }

    req.user = { id: payload.id, email: payload.email };
    next();
  });
}

module.exports = {
  authenticateToken,
  generateAccessToken,
  generateRefreshToken,
  JWT_SECRET,
};
