/**
 * routes/authRoutes.js
 * Firebase Authentication sync and user routes.
 */
'use strict';

const express    = require('express');
const db         = require('../db/queries');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/** Get the client IP */
function getClientIP(req) {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/**
 * POST /auth/sync
 * Verify Firebase ID token (via authenticateToken middleware) and sync user to Postgres.
 * Seeding subjects is handled in queries.findOrCreateUserByFirebase.
 */
router.post('/sync', authenticateToken, async (req, res, next) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User synchronization failed.' });
    }

    return res.json({
      success: true,
      email:   user.email,
      name:    user.name,
      uid:     user.firebase_uid,
      id:      user.id
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/logout
 * Clean up session / cookies.
 */
router.post('/logout', async (req, res) => {
  // Clear any legacy cookies if they exist
  res.clearCookie('sb_refresh', { path: '/auth' });
  console.log(`👋 User logged out (IP: ${getClientIP(req)})`);
  return res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * GET /auth/me
 * Get safe user profile.
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.json({
      success: true,
      user: {
        id:          user.id,
        email:       user.email,
        name:        user.name,
        firebaseUid: user.firebase_uid,
        createdAt:   user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
