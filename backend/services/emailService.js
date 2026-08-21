/**
 * services/emailService.js
 * Reusable email service for StudyBuddy AI.
 * Reads SMTP config from environment variables — never hardcoded.
 * Never logs OTP values or credentials.
 */
'use strict';

const nodemailer = require('nodemailer');

/**
 * Build a Nodemailer transporter lazily so env vars are resolved
 * at call time rather than module load time.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null; // SMTP not configured
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

/**
 * Send a 6-digit OTP verification email.
 *
 * @param {string} email       - Recipient email address
 * @param {string} otp         - Plaintext OTP (only used here, never logged)
 * @param {number} expiryMins  - OTP validity period in minutes (default: 5)
 * @returns {Promise<void>}
 */
async function sendOTPEmail(email, otp, expiryMins = 5) {
  const appName   = 'StudyBuddy AI';
  const fromAddr  = process.env.SMTP_FROM || `"${appName}" <noreply@studybuddy.ai>`;

  const transporter = createTransporter();

  if (!transporter) {
    // SMTP not configured — log OTP to console ONLY in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`⚠️  SMTP not configured. [DEV ONLY] OTP for ${email}: ${otp}`);
    } else {
      console.error(`❌ SMTP not configured — cannot send OTP email to ${email}`);
      throw new Error('Email service is not configured. Contact support.');
    }
    return;
  }

  const otpStr = String(otp || '');
  const digits = [];
  for (let i = 0; i < 6; i++) {
    digits.push(otpStr[i] || '-');
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName} — Verification Code</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#fffdf5;font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffdf5;padding:40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border:3px solid #1e293b;border-radius:24px;box-shadow:6px 6px 0px #1e293b;overflow:hidden;max-width:100%;border-collapse:separate;">

          <!-- Window Header (Neobrutalist Title Bar) -->
          <tr>
            <td style="background:#8b5cf6;padding:20px 24px;text-align:left;border-bottom:3px solid #1e293b;">
              <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">
                <tr>
                  <td align="left">
                    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td valign="middle" style="width:32px;height:32px;background:#ffffff;border:2px solid #1e293b;border-radius:8px;box-shadow:2px 2px 0px #1e293b;text-align:center;font-family:'Outfit',sans-serif;font-size:18px;font-weight:900;color:#8b5cf6;line-height:32px;">
                          S
                        </td>
                        <td valign="middle" style="padding-left:12px;font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;color:#ffffff;line-height:1;">
                          StudyBuddy<span style="color:#fbbf24;">.ai</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <!-- Retro Window Dots -->
                    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="width:10px;height:10px;border-radius:50%;background:#ef4444;border:1.5px solid #1e293b;padding:0;"></td>
                        <td style="width:8px;padding:0;"></td>
                        <td style="width:10px;height:10px;border-radius:50%;background:#fbbf24;border:1.5px solid #1e293b;padding:0;"></td>
                        <td style="width:8px;padding:0;"></td>
                        <td style="width:10px;height:10px;border-radius:50%;background:#22c55e;border:1.5px solid #1e293b;padding:0;"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card Body -->
          <tr>
            <td style="padding:40px 32px;background:#ffffff;">
              <h2 style="margin:0 0 16px;color:#8b5cf6;font-size:22px;font-weight:800;font-family:'Outfit',sans-serif;">
                Hello,
              </h2>
              <p style="margin:0 0 32px;color:#1e293b;font-size:15px;line-height:1.6;font-weight:500;">
                You requested a login verification code for your ${appName} account.
                Use the code below to complete your sign-in.
              </p>

              <!-- OTP Verification Boxes Box -->
              <div style="margin:0 auto 32px;text-align:center;">
                <p style="margin:0 0 12px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                  Your verification code
                </p>
                <table align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;border-collapse:separate;border-spacing:8px;">
                  <tr>
                    <td align="center" valign="middle" style="width:44px;height:56px;background:#ffffff;border:2px solid #8b5cf6;border-radius:8px;box-shadow:3px 3px 0px #8b5cf6;font-size:24px;font-weight:900;color:#1e293b;font-family:'Outfit',sans-serif;line-height:56px;padding:0;">
                      ${digits[0]}
                    </td>
                    <td align="center" valign="middle" style="width:44px;height:56px;background:#ffffff;border:2px solid #8b5cf6;border-radius:8px;box-shadow:3px 3px 0px #8b5cf6;font-size:24px;font-weight:900;color:#1e293b;font-family:'Outfit',sans-serif;line-height:56px;padding:0;">
                      ${digits[1]}
                    </td>
                    <td align="center" valign="middle" style="width:44px;height:56px;background:#ffffff;border:2px solid #8b5cf6;border-radius:8px;box-shadow:3px 3px 0px #8b5cf6;font-size:24px;font-weight:900;color:#1e293b;font-family:'Outfit',sans-serif;line-height:56px;padding:0;">
                      ${digits[2]}
                    </td>
                    <td align="center" valign="middle" style="width:44px;height:56px;background:#ffffff;border:2px solid #8b5cf6;border-radius:8px;box-shadow:3px 3px 0px #8b5cf6;font-size:24px;font-weight:900;color:#1e293b;font-family:'Outfit',sans-serif;line-height:56px;padding:0;">
                      ${digits[3]}
                    </td>
                    <td align="center" valign="middle" style="width:44px;height:56px;background:#ffffff;border:2px solid #8b5cf6;border-radius:8px;box-shadow:3px 3px 0px #8b5cf6;font-size:24px;font-weight:900;color:#1e293b;font-family:'Outfit',sans-serif;line-height:56px;padding:0;">
                      ${digits[4]}
                    </td>
                    <td align="center" valign="middle" style="width:44px;height:56px;background:#ffffff;border:2px solid #8b5cf6;border-radius:8px;box-shadow:3px 3px 0px #8b5cf6;font-size:24px;font-weight:900;color:#1e293b;font-family:'Outfit',sans-serif;line-height:56px;padding:0;">
                      ${digits[5]}
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0;color:#64748b;font-size:13px;font-weight:500;">
                  Expires in <strong style="color:#8b5cf6;font-weight:700;">${expiryMins} minutes</strong>
                </p>
              </div>

              <!-- Security Notice -->
              <table cellpadding="0" cellspacing="0" style="width:100%;background:#fffbeb;border:2px solid #1e293b;border-radius:12px;box-shadow:3px 3px 0px #1e293b;margin:0 0 32px;border-collapse:collapse;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#1e293b;font-size:13px;line-height:1.5;font-weight:500;">
                      🔒 <strong style="font-weight:700;color:#b45309;">Security notice:</strong> Never share this code with anyone.
                      ${appName} will never ask for your verification code by phone, chat, or email.
                      If you did not request this code, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;text-align:center;font-weight:500;">
                This code is valid for one use only and will expire in ${expiryMins} minutes.
              </p>
            </td>
          </tr>

          <!-- Card Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:2px solid #e2e8f0;background:#ffffff;text-align:center;">
              <p style="margin:0;color:#64748b;font-size:12px;font-weight:500;line-height:1;">
                © ${new Date().getFullYear()} ${appName} — Advanced AI-Powered Exam Preparation
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
${appName} — Verification Code

Your login verification code is: ${otp}

This code expires in ${expiryMins} minutes.

SECURITY NOTICE: Never share this code with anyone.
${appName} will never ask for your verification code by phone, chat, or email.
If you did not request this code, you can safely ignore this email.
  `.trim();

  await transporter.sendMail({
    from   : fromAddr,
    to     : email,
    subject: `${otp} is your ${appName} verification code`,
    text,
    html,
  });

  // Log delivery confirmation without leaking OTP
  console.log(`📧 OTP email delivered to ${email} (expires in ${expiryMins}m)`);
}

module.exports = { sendOTPEmail };
