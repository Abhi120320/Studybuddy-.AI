const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const db = require('../db/queries');
const { JWT_SECRET } = require('../middleware/auth');

// Helper: Generate 6 digit numeric code
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Build transporter lazily so env vars are read at call time, not module load
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// POST /auth/send-otp  — generates OTP code and returns it directly to client
router.post('/send-otp', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.createOTP(email.trim().toLowerCase(), code, expiresAt);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔑 OTP generated for ${email}: ${code}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return res.json({
      success: true,
      code,
      message: 'Verification code generated successfully.'
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/verify-otp  — creates user account ONLY after code is verified
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required' });
    }

    const verified = await db.verifyOTP(email, code);
    if (!verified) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code' });
    }

    // ✅ Only AFTER successful OTP verification do we create or load the user account
    const user = await db.findOrCreateUser(email);

    // Issue 7-day JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ User verified and logged in: ${user.email} (id=${user.id})`);

    res.json({ success: true, token, email: user.email });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
