/**
 * services/emailService.js
 * Reusable email service for StudyBuddy AI.
 * Uses Nodemailer (SMTP) — configured via environment variables.
 * Never logs OTP values or credentials.
 */
'use strict';

const nodemailer = require('nodemailer');

/**
 * Build a Nodemailer transporter lazily so env vars are resolved at call time.
 * Supports Gmail, Outlook, or any custom SMTP provider.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // If no SMTP config — return null (handled in callers)
  if (!user || !pass) return null;

  // Gmail shortcut: if no host provided, use Gmail defaults
  if (!host) {
    return nodemailer.createTransport({
      service          : 'gmail',
      auth             : { user, pass },
      connectionTimeout: 5000, // fail fast instead of hanging
      socketTimeout    : 10000,
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure           : port === 465,
    auth             : { user, pass },
    connectionTimeout: 5000,
    socketTimeout    : 10000,
  });
}

function buildOTPEmailHTML(appName, title, leadText, digits, expiryMins) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    @media only screen and (max-width: 480px) {
      .main-card { width: 100% !important; border-radius: 16px !important; }
      .card-padding { padding: 24px 16px !important; }
      .digit-box { width: 36px !important; height: 48px !important; font-size: 20px !important; line-height: 48px !important; }
      .digit-table { border-spacing: 4px !important; }
      .brand-title { font-size: 18px !important; }
    }
    @media (prefers-color-scheme: dark) {
      body { background-color: #0f172a !important; }
      .email-bg { background-color: #0f172a !important; }
      .main-card { background-color: #1e293b !important; border-color: #ffffff !important; box-shadow: 4px 4px 0px #ffffff !important; }
      .card-padding { background-color: #1e293b !important; }
      .digit-box { background-color: #1e293b !important; color: #ffffff !important; border-color: #a78bfa !important; box-shadow: 2px 2px 0px #a78bfa !important; }
      .warning-box { background-color: #312e81 !important; border-color: #ffffff !important; box-shadow: 2px 2px 0px #ffffff !important; }
      .warning-text { color: #e2e8f0 !important; }
      .warning-highlight { color: #fcd34d !important; }
      .text-slate { color: #cbd5e1 !important; }
      .card-footer { background-color: #1e293b !important; border-top-color: #334155 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#fffdf5;font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">
  <table class="email-bg" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffdf5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table class="main-card" width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border:3px solid #1e293b;border-radius:24px;box-shadow:6px 6px 0px #1e293b;overflow:hidden;max-width:100%;border-collapse:separate;">
          <!-- Header -->
          <tr>
            <td style="background:#8b5cf6;padding:20px 24px;text-align:left;border-bottom:3px solid #1e293b;">
              <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">
                <tr>
                  <td valign="middle" style="width:46px;padding:0;">
                    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="width:10px;height:10px;border-radius:50%;background:#ef4444;border:1.5px solid #1e293b;padding:0;"></td>
                        <td style="width:6px;padding:0;"></td>
                        <td style="width:10px;height:10px;border-radius:50%;background:#fbbf24;border:1.5px solid #1e293b;padding:0;"></td>
                        <td style="width:6px;padding:0;"></td>
                        <td style="width:10px;height:10px;border-radius:50%;background:#22c55e;border:1.5px solid #1e293b;padding:0;"></td>
                      </tr>
                    </table>
                  </td>
                  <td valign="middle" style="width:32px;padding:0;">
                    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:32px;">
                      <tr>
                        <td valign="middle" style="width:32px;height:32px;background:#ffffff;border:2px solid #1e293b;border-radius:8px;box-shadow:2px 2px 0px #1e293b;text-align:center;font-family:'Outfit',sans-serif;font-size:18px;font-weight:900;color:#8b5cf6;line-height:32px;padding:0;">
                          S
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td class="brand-title" valign="middle" style="padding-left:12px;font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;color:#ffffff;line-height:1;">
                    StudyBuddy<span style="color:#fbbf24;">.ai</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="card-padding" style="padding:40px 32px;background:#ffffff;">
              <h2 style="margin:0 0 16px;color:#8b5cf6;font-size:22px;font-weight:800;font-family:'Outfit',sans-serif;">
                Hello,
              </h2>
              <p class="text-slate" style="margin:0 0 32px;color:#1e293b;font-size:15px;line-height:1.6;font-weight:500;">
                ${leadText}
              </p>
              <!-- OTP Boxes -->
              <div style="margin:0 auto 32px;text-align:center;">
                <p class="text-slate" style="margin:0 0 12px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                  Your verification code
                </p>
                <table class="digit-table" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;border-collapse:separate;border-spacing:8px;">
                  <tr>
                    <td class="digit-box" align="center" valign="middle" style="width:44px;height:56px;background:#ffffff;border:2px solid #8b5cf6;border-radius:8px;box-shadow:3px 3px 0px #8b5cf6;font-size:24px;font-weight:900;color:#1e293b;font-family:'Outfit',sans-serif;line-height:56px;padding:0;">${digits[0]}</td>
                    <td class="digit-box" align="center" valign="middle" style="width:44px;height:56px;background:#ffffff;border:2px solid #8b5cf6;border-radius:8px;box-shadow:3px 3px 0px #8b5cf6;font-size:24px;font-weight:900;color:#1e293b;font-family:'Outfit',sans-serif;line-height:56px;padding:0;">${digits[1]}</td>
                    <td class="digit-box" align="center" valign="middle" style="width:44px;height:56px;background:#ffffff;border:2px solid #8b5cf6;border-radius:8px;box-shadow:3px 3px 0px #8b5cf6;font-size:24px;font-weight:900;color:#1e293b;font-family:'Outfit',sans-serif;line-height:56px;padding:0;">${digits[2]}</td>
                    <td class="digit-box" align="center" valign="middle" style="width:44px;height:56px;background:#ffffff;border:2px solid #8b5cf6;border-radius:8px;box-shadow:3px 3px 0px #8b5cf6;font-size:24px;font-weight:900;color:#1e293b;font-family:'Outfit',sans-serif;line-height:56px;padding:0;">${digits[3]}</td>
                    <td class="digit-box" align="center" valign="middle" style="width:44px;height:56px;background:#ffffff;border:2px solid #8b5cf6;border-radius:8px;box-shadow:3px 3px 0px #8b5cf6;font-size:24px;font-weight:900;color:#1e293b;font-family:'Outfit',sans-serif;line-height:56px;padding:0;">${digits[4]}</td>
                    <td class="digit-box" align="center" valign="middle" style="width:44px;height:56px;background:#ffffff;border:2px solid #8b5cf6;border-radius:8px;box-shadow:3px 3px 0px #8b5cf6;font-size:24px;font-weight:900;color:#1e293b;font-family:'Outfit',sans-serif;line-height:56px;padding:0;">${digits[5]}</td>
                  </tr>
                </table>
                <p class="text-slate" style="margin:16px 0 0;color:#64748b;font-size:13px;font-weight:500;">
                  Expires in <strong style="color:#8b5cf6;font-weight:700;">${expiryMins} minutes</strong>
                </p>
              </div>
              <!-- Security Notice -->
              <table class="warning-box" cellpadding="0" cellspacing="0" style="width:100%;background:#fffbeb;border:2px solid #1e293b;border-radius:12px;box-shadow:3px 3px 0px #1e293b;margin:0 0 32px;border-collapse:collapse;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p class="warning-text" style="margin:0;color:#1e293b;font-size:13px;line-height:1.5;font-weight:500;">
                      🔒 <strong class="warning-highlight" style="font-weight:700;color:#b45309;">Security notice:</strong> Never share this code with anyone.
                      ${appName} will never ask for your verification code by phone, chat, or email.
                      If you did not request this code, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
              <p class="text-slate" style="margin:0;color:#64748b;font-size:12px;line-height:1.6;text-align:center;font-weight:500;">
                This code is valid for one use only and will expire in ${expiryMins} minutes.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="card-footer" style="padding:24px 32px;border-top:2px solid #e2e8f0;background:#ffffff;text-align:center;">
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
}

/**
 * Send a 6-digit OTP verification email via SMTP.
 */
async function sendOTPEmail(email, otp, expiryMins = 5) {
  const appName  = 'StudyBuddy AI';
  const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@studybuddy.ai';

  const transporter = getTransporter();

  if (!transporter) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`⚠️  SMTP not configured. [DEV ONLY] OTP for ${email}: ${otp}`);
    } else {
      console.error(`❌ SMTP not configured — cannot send OTP email to ${email}`);
      throw new Error('Email service is not configured. Contact support.');
    }
    return;
  }

  const otpStr  = String(otp || '');
  const digits  = Array.from({ length: 6 }, (_, i) => otpStr[i] || '-');
  const leadText = `You requested a login verification code for your ${appName} account. Use the code below to complete your sign-in.`;
  const html    = buildOTPEmailHTML(appName, `${appName} — Verification Code`, leadText, digits, expiryMins);
  const text    = `${appName} — Verification Code\n\nYour login verification code is: ${otp}\n\nThis code expires in ${expiryMins} minutes.\n\nSECURITY NOTICE: Never share this code with anyone.`;

  await transporter.sendMail({
    from   : `"${appName}" <${fromAddr}>`,
    to     : email,
    subject: `${otp} is your ${appName} verification code`,
    text,
    html,
  });

  console.log(`📧 OTP email sent to ${email} via SMTP (expires in ${expiryMins}m)`);
}

/**
 * Send a password reset OTP email via SMTP.
 */
async function sendPasswordResetEmail(email, otp, expiryMins = 5) {
  const appName  = 'StudyBuddy AI';
  const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@studybuddy.ai';

  const transporter = getTransporter();

  if (!transporter) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`⚠️  SMTP not configured. [DEV ONLY] Password Reset OTP for ${email}: ${otp}`);
    } else {
      console.error(`❌ SMTP not configured — cannot send password reset email to ${email}`);
      throw new Error('Email service is not configured. Contact support.');
    }
    return;
  }

  const otpStr   = String(otp || '');
  const digits   = Array.from({ length: 6 }, (_, i) => otpStr[i] || '-');
  const leadText = `You requested a password reset code for your ${appName} account. Use the code below to complete your password reset.`;
  const html     = buildOTPEmailHTML(appName, `${appName} — Reset Password`, leadText, digits, expiryMins);
  const text     = `${appName} — Reset Password\n\nYour password reset code is: ${otp}\n\nThis code expires in ${expiryMins} minutes.\n\nSECURITY NOTICE: Never share this code with anyone.`;

  await transporter.sendMail({
    from   : `"${appName}" <${fromAddr}>`,
    to     : email,
    subject: `${otp} is your ${appName} password reset code`,
    text,
    html,
  });

  console.log(`📧 Password reset email sent to ${email} via SMTP (expires in ${expiryMins}m)`);
}

module.exports = { sendOTPEmail, sendPasswordResetEmail };
