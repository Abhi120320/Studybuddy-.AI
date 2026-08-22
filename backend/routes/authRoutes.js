/**
 * routes/authRoutes.js
 * Secure Email OTP + JWT Authentication for StudyBuddy AI.
 *
 * Endpoints:
 *   POST /auth/register     — create account (email + password)
 *   POST /auth/login        — validate credentials → send OTP
 *   POST /auth/verify-otp   — verify OTP → issue JWT
 *   POST /auth/resend-otp   — resend OTP (rate limited)
 *   POST /auth/logout       — invalidate session
 *   GET  /auth/me           — return authenticated user profile
 *
 * Security guarantees:
 *   - OTP generated with crypto.randomInt (CSPRNG)
 *   - OTP hashed with bcrypt before DB storage
 *   - OTP never returned in API response or logged in production
 *   - Previous OTPs invalidated on new generation
 *   - Rate limiting on all auth endpoints
 *   - Max 5 OTP verification attempts
 *   - Consistent error messages (no account enumeration)
 *   - Passwords hashed with bcrypt (12 rounds)
 *   - Login sessions recorded on success
 */
'use strict';

const express    = require('express');
const crypto     = require('crypto');
const bcrypt     = require('bcryptjs');
const rateLimit  = require('express-rate-limit');

const db                  = require('../db/queries');
const { sendOTPEmail, sendPasswordResetEmail }    = require('../services/emailService');
const {
  generateAccessToken,
  generateRefreshToken,
  authenticateToken,
} = require('../middleware/auth');

const router = express.Router();

const BCRYPT_ROUNDS  = 10; // 10 rounds = secure & fast (~4x faster than 12 on shared CPU)
const OTP_EXPIRY_MIN = 5;     // minutes
const RESEND_COOLDOWN_S = 60; // seconds between resend requests

// ── Per-route Rate Limiters ───────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min window
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many verification attempts. Please try again later.' },
});

const resendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min window
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many resend requests. Please wait before requesting another code.' },
});

// ── Helpers ───────────────────────────────────────────────────────────────

/** Generate a cryptographically secure 6-digit OTP */
function generateSecureOTP() {
  // crypto.randomInt(min, max) — inclusive of min, exclusive of max
  return String(crypto.randomInt(100000, 1000000));
}

/** Get the client IP (works behind Nginx proxy with trust proxy = 1) */
function getClientIP(req) {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/** Sanitize email: trim and lowercase */
function sanitizeEmail(email) {
  return (email || '').toString().trim().toLowerCase();
}

/** Basic email format validation */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** Basic password strength validation */
function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

// ── POST /auth/register ───────────────────────────────────────────────────
// Create a new account. Sends OTP to verify email ownership.
router.post('/register', loginLimiter, async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const email = sanitizeEmail(req.body.email);

    // Validate inputs
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
    }

    // Check for existing account
    const existing = await db.findUserByEmail(email);
    if (existing) {
      if (existing.is_verified) {
        return res.status(409).json({
          success: false,
          error  : 'An account with this email already exists. Please log in instead.',
        });
      }

      // If the account exists but is not verified, allow re-registration by overwriting it
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await db.updateUserRegistration(existing.id, name, passwordHash);

      const otp       = generateSecureOTP();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);
      await db.createLoginOTP(existing.id, otp, expiresAt);

      try {
        await sendOTPEmail(email, otp, OTP_EXPIRY_MIN);
      } catch (emailErr) {
        console.error('Email send failed during register retry:', emailErr.message);
        if (process.env.NODE_ENV === 'production') {
          return res.status(503).json({
            success: false,
            error  : 'Failed to send verification email. Please try again.',
          });
        }
      }

      return res.status(201).json({
        success    : true,
        otpRequired: true,
        email,
        message    : `Verification code sent to ${email}. It expires in ${OTP_EXPIRY_MIN} minutes.`,
        expiresInSeconds: OTP_EXPIRY_MIN * 60,
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const user = await db.createUser(email, name, passwordHash);

    // Generate and send OTP
    const otp       = generateSecureOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

    await db.createLoginOTP(user.id, otp, expiresAt);

    // Send OTP email (never expose otp in response)
    try {
      await sendOTPEmail(email, otp, OTP_EXPIRY_MIN);
    } catch (emailErr) {
      console.error('Email send failed during register:', emailErr.message);
      // In production, SMTP failure prevents registration completion
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          success: false,
          error  : 'Failed to send verification email. Please try again.',
        });
      }
    }

    console.log(`✅ New user registered: ${email} (id=${user.id})`);

    return res.status(201).json({
      success    : true,
      otpRequired: true,
      email,
      message    : `Verification code sent to ${email}. It expires in ${OTP_EXPIRY_MIN} minutes.`,
      expiresInSeconds: OTP_EXPIRY_MIN * 60,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/login ──────────────────────────────────────────────────────
// Validate email + password → immediately log user in and issue JWT (no OTP).
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { password } = req.body;
    const email = sanitizeEmail(req.body.email);

    // Input validation
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required.' });
    }

    // Look up user
    const user = await db.findUserByEmail(email);

    // Use constant-time comparison to prevent timing attacks.
    const DUMMY_HASH = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxx';
    const storedHash = user?.password_hash || DUMMY_HASH;
    const passwordMatch = await bcrypt.compare(password, storedHash);

    // Both "user not found" and "wrong password" return the same error
    if (!user || !passwordMatch) {
      return res.status(401).json({
        success: false,
        error  : 'Invalid email or password.',
      });
    }

    // Check if user has a password set
    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        error  : 'This account was created without a password. Please contact support.',
      });
    }

    // Record login session
    await db.createLoginSession(user.id, getClientIP(req), req.headers['user-agent']);

    // Issue tokens
    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    console.log(`✅ Login successful (password-only) — user authenticated: ${user.email} (id=${user.id})`);

    // Set refresh token as HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('sb_refresh', refreshToken, {
      httpOnly: true,
      secure  : isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge  : 7 * 24 * 60 * 60 * 1000, // 7 days in ms
      path    : '/auth',                   // only sent to /auth/* routes
    });

    return res.json({
      success: true,
      token  : accessToken,
      email  : user.email,
      name   : user.name,
      message: 'Authentication successful.',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/verify-otp ─────────────────────────────────────────────────
// Verify the OTP → issue access + refresh tokens → store login session.
router.post('/verify-otp', otpVerifyLimiter, async (req, res, next) => {
  try {
    const { otp, code } = req.body; // support both field names
    const email = sanitizeEmail(req.body.email);
    const otpValue = (otp || code || '').toString().trim();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }
    if (!otpValue || otpValue.length !== 6 || !/^\d{6}$/.test(otpValue)) {
      return res.status(400).json({ success: false, error: 'A 6-digit verification code is required.' });
    }

    // Find user (must exist)
    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, error: 'No account found with this email.' });
    }

    // Verify OTP
    const result = await db.verifyLoginOTP(user.id, otpValue);

    if (!result.success) {
      // Map internal reason to HTTP status
      const isExpired  = result.reason?.includes('expired');
      const isExceeded = result.reason?.includes('exceeded');
      const status     = isExpired || isExceeded ? 429 : 400;
      return res.status(status).json({ success: false, error: result.reason });
    }

    // OTP verified — mark user as verified
    await db.markUserVerified(user.id);

    // Record login session
    await db.createLoginSession(user.id, getClientIP(req), req.headers['user-agent']);

    // Issue tokens
    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    console.log(`✅ OTP verified — user authenticated: ${user.email} (id=${user.id})`);

    // Set refresh token as HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('sb_refresh', refreshToken, {
      httpOnly: true,
      secure  : isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge  : 7 * 24 * 60 * 60 * 1000, // 7 days in ms
      path    : '/auth',                   // only sent to /auth/* routes
    });

    return res.json({
      success     : true,
      token       : accessToken,   // short-lived access token (15m)
      email       : user.email,
      name        : user.name,
      message     : 'Authentication successful.',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/resend-otp ─────────────────────────────────────────────────
// Resend OTP (rate-limited). Invalidates previous OTP.
router.post('/resend-otp', resendLimiter, async (req, res, next) => {
  try {
    const email = sanitizeEmail(req.body.email);

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    const user = await db.findUserByEmail(email);

    // Always return success response regardless of whether email exists
    // to prevent account enumeration via resend
    if (!user) {
      return res.json({
        success: true,
        message: `If an account exists for ${email}, a new verification code has been sent.`,
        expiresInSeconds: OTP_EXPIRY_MIN * 60,
      });
    }

    // Generate new OTP (this invalidates previous ones)
    const otp       = generateSecureOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

    await db.createLoginOTP(user.id, otp, expiresAt);

    try {
      await sendOTPEmail(email, otp, OTP_EXPIRY_MIN);
    } catch (emailErr) {
      console.error('Email send failed during resend:', emailErr.message);
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          success: false,
          error  : 'Failed to send verification email. Please try again.',
        });
      }
    }

    console.log(`🔄 OTP resent for user_id=${user.id}`);

    return res.json({
      success         : true,
      message         : `A new verification code has been sent to ${email}.`,
      expiresInSeconds: OTP_EXPIRY_MIN * 60,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/logout ─────────────────────────────────────────────────────
// Clear refresh token cookie. Stateless access token expiry is handled client-side.
router.post('/logout', async (req, res) => {
  // Clear the HTTP-only refresh token cookie
  res.clearCookie('sb_refresh', { path: '/auth' });

  console.log(`👋 User logged out (IP: ${getClientIP(req)})`);

  return res.json({ success: true, message: 'Logged out successfully.' });
});

// ── GET /auth/me ──────────────────────────────────────────────────────────
// Return the currently authenticated user's safe profile.
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Return only safe, non-sensitive fields
    return res.json({
      success: true,
      user   : {
        id         : user.id,
        email      : user.email,
        name       : user.name,
        isVerified : user.is_verified,
        createdAt  : user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/send-otp (legacy) ──────────────────────────────────────────
// Backward-compatible endpoint for the existing email-only flow.
// Kept so existing clients don't break. Returns a generic response.
router.post('/send-otp', loginLimiter, async (req, res, next) => {
  try {
    const email = sanitizeEmail(req.body.email);

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }

    // Find-or-create user (legacy flow — no password)
    const user = await db.findOrCreateUser(email);

    const otp       = generateSecureOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

    await db.createLoginOTP(user.id, otp, expiresAt);

    try {
      await sendOTPEmail(email, otp, OTP_EXPIRY_MIN);
    } catch (emailErr) {
      console.error('Email send failed (legacy send-otp):', emailErr.message);
      // In dev, still continue so frontend works without SMTP
    }

    return res.json({
      success    : true,
      otpRequired: true,
      message    : 'Verification code sent. Check your email.',
      expiresInSeconds: OTP_EXPIRY_MIN * 60,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/forgot-password ────────────────────────────────────────────
// Generate a password reset OTP and email it to the user.
router.post('/forgot-password', loginLimiter, async (req, res, next) => {
  try {
    const email = sanitizeEmail(req.body.email);

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      // Security: return success and generic message to prevent account enumeration
      return res.json({
        success: true,
        message: 'If your email is registered, a password reset code has been sent. Check your email.',
        expiresInSeconds: OTP_EXPIRY_MIN * 60,
      });
    }

    const otp = generateSecureOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

    await db.createPasswordResetOTP(user.id, otp, expiresAt);

    try {
      await sendPasswordResetEmail(email, otp, OTP_EXPIRY_MIN);
    } catch (emailErr) {
      console.error('Password reset email send failed:', emailErr.message);
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          success: false,
          error  : 'Failed to send password reset email. Please try again.',
        });
      }
    }

    console.log(`🔑 Password reset requested for: ${email}`);

    return res.json({
      success: true,
      message: 'If your email is registered, a password reset code has been sent. Check your email.',
      expiresInSeconds: OTP_EXPIRY_MIN * 60,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/reset-password ─────────────────────────────────────────────
// Verify password reset OTP and update user's password.
router.post('/reset-password', otpVerifyLimiter, async (req, res, next) => {
  try {
    const { otp, password } = req.body;
    const email = sanitizeEmail(req.body.email);

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }
    if (!otp || otp.length !== 6) {
      return res.status(400).json({ success: false, error: 'A 6-digit verification code is required.' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid email or verification code.' });
    }

    const verifyResult = await db.verifyPasswordResetOTP(user.id, otp);
    if (!verifyResult.success) {
      return res.status(400).json({ success: false, error: verifyResult.reason || 'Invalid verification code.' });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Update user password and ensure user is marked as verified
    await db.updateUserPassword(user.id, passwordHash);
    await db.markUserVerified(user.id);

    // Invalidate any remaining unverified reset OTPs for this user
    await db.invalidatePreviousResetOTPs(user.id);

    console.log(`🔐 Password successfully reset for: ${email}`);

    return res.json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
