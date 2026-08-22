/**
 * middleware/auth.js
 * Firebase Token Authentication Middleware.
 */
'use strict';

const admin = require('../config/firebase-admin');
const db    = require('../db/queries');

/**
 * Express middleware: verifies Bearer Firebase ID Token from Authorization header.
 * Automatically synchronizes/resolves the corresponding Postgres SERIAL user ID.
 * Attaches { id, email, uid } to req.user on success.
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Automatically map Firebase UID to PostgreSQL serial ID
    const user = await db.findOrCreateUserByFirebase(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name || ''
    );

    req.user = {
      id:    user.id,
      email: user.email,
      uid:   decodedToken.uid
    };
    
    next();
  } catch (err) {
    console.error('❌ Token verification error:', err.message);
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ success: false, error: 'Session expired — please log in again.' });
    }
    return res.status(403).json({ success: false, error: 'Invalid access token' });
  }
}

// Keep dummy exports of helper keys for compatibility if needed
module.exports = {
  authenticateToken,
  generateAccessToken: (user) => 'firebase-controlled-token',
  generateRefreshToken: (user) => 'firebase-controlled-refresh',
  JWT_SECRET: process.env.JWT_SECRET || 'compat_dummy_secret_value_32_chars_long'
};

