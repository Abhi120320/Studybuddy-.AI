/**
 * components/AuthPage.jsx
 * Secure Email OTP + JWT Authentication UI for StudyBuddy AI.
 *
 * Flow:
 *   Step 1 (Login):    Email + Password → [Continue]
 *   Step 1 (Register): Name + Email + Password → [Create Account]
 *   Step 2 (OTP):      6-digit code input → [Verify OTP] | [Resend OTP]
 *
 * Features:
 *   - OTP never displayed from API response
 *   - 5-minute countdown timer
 *   - Resend cooldown (60s)
 *   - Individual digit boxes with auto-focus
 *   - All error states: invalid/expired/too-many-attempts
 *   - Loading states on all async operations
 *   - Rive animated character
 *   - Matches existing design system exactly
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { IconArrow } from './Icons';
import { loginUser, registerUser, verifyOTP, resendOTP, forgotPassword, resetPassword } from '../utils/api';

// ── Constants ─────────────────────────────────────────────────────────────
const OTP_LENGTH       = 6;
const OTP_EXPIRY_S     = 5 * 60; // 5 minutes in seconds
const RESEND_COOLDOWN  = 60;     // seconds before resend is allowed again
const STATE_MACHINE    = 'Login Machine';

// ── Eye / Password Toggle Icon ────────────────────────────────────────────
const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// ── Countdown Timer Hook ──────────────────────────────────────────────────
function useCountdown(initialSeconds, active) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (!active) { setSeconds(initialSeconds); return; }
    setSeconds(initialSeconds);
    const id = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active, initialSeconds]);

  return seconds;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Main Component ────────────────────────────────────────────────────────
const AuthPage = () => {
  // Mode: 'login' | 'register'
  const [mode, setMode]             = useState('login');
  // Step: 'credentials' | 'otp'
  const [step, setStep]             = useState('credentials');

  // Credentials form
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [name, setName]             = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password flow states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetOtp, setResetOtp] = useState('');

  // OTP digits — stored as array of single chars
  const [digits, setDigits]         = useState(Array(OTP_LENGTH).fill(''));
  const digitRefs                   = useRef([]);

  // UI state
  const [loading, setLoading]       = useState(false);
  const [isSuccess, setIsSuccess]   = useState(false);
  const [error, setError]           = useState('');
  const [infoMsg, setInfoMsg]       = useState('');

  // Timers
  const [otpActive, setOtpActive]   = useState(false);
  const [resendActive, setResendActive] = useState(false);
  const otpCountdown    = useCountdown(OTP_EXPIRY_S, otpActive);
  const resendCountdown = useCountdown(RESEND_COOLDOWN, resendActive);

  // Rive animation
  const { rive, RiveComponent } = useRive({
    src: '/animated-login-screen.riv',
    stateMachines: STATE_MACHINE,
    autoplay: true,
  });
  const isCheckingInput = useStateMachineInput(rive, STATE_MACHINE, 'isChecking');
  const numLookInput    = useStateMachineInput(rive, STATE_MACHINE, 'numLook');
  const isHandsUpInput  = useStateMachineInput(rive, STATE_MACHINE, 'isHandsUp');
  const trigSuccessInput = useStateMachineInput(rive, STATE_MACHINE, 'trigSuccess');
  const trigFailInput    = useStateMachineInput(rive, STATE_MACHINE, 'trigFail');

  // Mouse-tracking for Rive character
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isSuccess) return;
      if (numLookInput && (!isHandsUpInput || !isHandsUpInput.value)) {
        numLookInput.value = (e.clientX / window.innerWidth) * 100;
        if (isCheckingInput) isCheckingInput.value = true;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [numLookInput, isHandsUpInput, isCheckingInput, isSuccess]);

  // Derived: assembled OTP string
  const otpValue = digits.join('');
  const otpComplete = otpValue.length === OTP_LENGTH;

  // ── Rive Helpers ─────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/immutability -- Rive StateMachineInput uses .value mutation by design
  const riveHandsUp = useCallback(() => {
    if (isCheckingInput) isCheckingInput.value = false;
    if (isHandsUpInput)  isHandsUpInput.value  = true;
  }, [isCheckingInput, isHandsUpInput]);
  // eslint-disable-next-line react-hooks/immutability -- Rive StateMachineInput uses .value mutation by design
  const riveHandsDown = useCallback(() => {
    if (isHandsUpInput) isHandsUpInput.value = false;
  }, [isHandsUpInput]);
  // eslint-disable-next-line react-hooks/immutability -- Rive StateMachineInput uses .fire() mutation by design
  const riveSuccess = useCallback(() => {
    if (trigSuccessInput) trigSuccessInput.fire();
  }, [trigSuccessInput]);
  // eslint-disable-next-line react-hooks/immutability -- Rive StateMachineInput uses .fire() mutation by design
  const riveFail = useCallback(() => {
    if (trigFailInput) trigFailInput.fire();
  }, [trigFailInput]);

  // ── Step 1: Submit Credentials ────────────────────────────────────────
  const handleCredentials = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    // Basic client-side validation
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError('Please enter a valid email address.');
      riveFail();
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      riveFail();
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Please enter your full name.');
      riveFail();
      return;
    }

    setLoading(true);
    riveHandsDown();

    try {
      if (mode === 'login') {
        await loginUser(email.trim().toLowerCase(), password);
        setIsSuccess(true);
        riveSuccess();
        setInfoMsg('✅ Login successful! Redirecting…');
        setTimeout(() => {
          window.location.hash = 'dashboard';
        }, 1500);
      } else {
        await registerUser(name.trim(), email.trim().toLowerCase(), password);
        // Move to OTP step
        setStep('otp');
        setDigits(Array(OTP_LENGTH).fill(''));
        setOtpActive(true);
        setResendActive(true);
        setInfoMsg(`Verification code sent to ${email}. Check your inbox.`);
        if (isCheckingInput) isCheckingInput.value = true; // eslint-disable-line react-hooks/immutability

        // Auto-focus first digit
        setTimeout(() => digitRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      riveFail();
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password Handlers ──────────────────────────────────────────
  const handleForgotEmail = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError('Please enter a valid email address.');
      riveFail();
      return;
    }

    setLoading(true);
    riveHandsDown();

    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      setStep('forgot_otp');
      setDigits(Array(OTP_LENGTH).fill(''));
      setOtpActive(true);
      setInfoMsg(res.message || 'Verification code sent. Check your inbox.');
      
      // Auto-focus first digit
      setTimeout(() => digitRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message || 'Failed to send reset code. Please try again.');
      riveFail();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyForgotOTP = (e) => {
    e.preventDefault();
    setError('');

    if (!otpComplete) {
      setError('Please enter the full 6-digit code.');
      riveFail();
      return;
    }

    // Save the OTP and transition to password reset input screen
    setResetOtp(otpValue);
    setStep('reset_password');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setInfoMsg('');
  };

  const handleNewPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      riveFail();
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      riveFail();
      return;
    }

    setLoading(true);
    riveHandsDown();

    try {
      await resetPassword(email.trim().toLowerCase(), resetOtp, newPassword);
      setInfoMsg('✅ Password reset successfully! Redirecting to login…');
      riveSuccess();
      
      // Reset states and redirect to login
      setTimeout(() => {
        setMode('login');
        setStep('credentials');
        setEmail('');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setResetOtp('');
        setInfoMsg('');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
      riveFail();
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Digit Handlers ────────────────────────────────────────────────
  const handleDigitChange = (index, value) => {
    // Accept only single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-advance to next box
    if (digit && index < OTP_LENGTH - 1) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        // Clear current
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        // Move to previous
        digitRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      digitRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newDigits = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setDigits(newDigits);
    // Focus last filled or first empty
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    digitRefs.current[focusIndex]?.focus();
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpComplete) {
      setError('Please enter all 6 digits of the verification code.');
      riveFail();
      return;
    }

    if (otpCountdown === 0) {
      setError('This code has expired. Please request a new one.');
      riveFail();
      return;
    }

    setLoading(true);
    riveHandsDown();

    try {
      await verifyOTP(email.trim().toLowerCase(), otpValue);

      setIsSuccess(true);
      riveSuccess();
      setInfoMsg('✅ Verification successful! Redirecting…');
      setOtpActive(false);

      setTimeout(() => {
        window.location.hash = 'dashboard';
      }, 1500);
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
      riveFail();
      // Clear digits on failure for re-entry
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setError('');
    setInfoMsg('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const res = await forgotPassword(email.trim().toLowerCase());
        setDigits(Array(OTP_LENGTH).fill(''));
        setOtpActive(true);
        setResendActive(true);
        setInfoMsg(res.message || 'New verification code sent. Check your inbox.');
      } else {
        await resendOTP(email.trim().toLowerCase());
        setDigits(Array(OTP_LENGTH).fill(''));
        setOtpActive(true);
        setResendActive(true);
        setInfoMsg('New verification code sent. Check your inbox.');
      }
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
      riveFail();
    } finally {
      setLoading(false);
    }
  };

  // ── Reset to Step 1 ───────────────────────────────────────────────────
  const resetToCredentials = () => {
    setStep('credentials');
    setDigits(Array(OTP_LENGTH).fill(''));
    setError('');
    setInfoMsg('');
    setOtpActive(false);
    setResendActive(false);
  };

  // ── Switch Mode (Login ↔ Register) ────────────────────────────────────
  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setStep('credentials');
    setEmail('');
    setPassword('');
    setName('');
    setDigits(Array(OTP_LENGTH).fill(''));
    setError('');
    setInfoMsg('');
    setOtpActive(false);
    setResendActive(false);
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="landing-layout">
      <div className="card auth-card">

        {/* Rive Animation */}
        <div className="auth-rive">
          <RiveComponent style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Title */}
        <h2 style={{ textAlign: 'center', marginBottom: '0.25rem' }}>
          {mode === 'forgot'
            ? (step === 'forgot_email' ? 'Reset Password' : step === 'forgot_otp' ? 'Enter Reset Code' : 'New Password')
            : (step === 'credentials' ? (mode === 'login' ? 'Welcome back' : 'Create an account') : 'Enter verification code')}
        </h2>
        <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {mode === 'forgot' ? (
            step === 'forgot_email'
              ? "Enter your email address. We'll send you a 6-digit code to reset your password."
              : step === 'forgot_otp'
                ? `Code sent to ${email}. It expires in `
                : "Choose a new secure password."
          ) : (
            step === 'credentials'
              ? (mode === 'login'
                  ? "Enter your credentials. We'll send a one-time code to verify it's you."
                  : 'Sign up with your email. We\'ll verify it with a one-time code.')
              : `Code sent to ${email}. It expires in `
          )}
          {(step === 'otp' || step === 'forgot_otp') && (
            <strong style={{
              color: otpCountdown < 60 ? 'var(--color-danger)' : 'var(--accent)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {formatTime(otpCountdown)}
            </strong>
          )}
        </p>

        {/* ── STEP 1: Credentials Form ─────────────────────────────── */}
        {step === 'credentials' && mode !== 'forgot' && (
          <form onSubmit={handleCredentials} noValidate>
            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="auth-name">Full name</label>
                <input
                  type="text"
                  id="auth-name"
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={loading}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email">Email</label>
              <input
                type="email"
                id="auth-email"
                placeholder="you@school.edu"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                disabled={loading}
                autoComplete="email"
                required
                onFocus={() => { if (isCheckingInput) isCheckingInput.value = true; }} // eslint-disable-line react-hooks/immutability
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-password">Password</label>
              <div className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="auth-password"
                  placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  disabled={loading}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  onFocus={riveHandsUp}
                  onBlur={riveHandsDown}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(s => !s)}
                  tabIndex={-1}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: '-0.75rem', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  className="link-btn"
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => {
                    setMode('forgot');
                    setStep('forgot_email');
                    setError('');
                    setInfoMsg('');
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && <div className="status-message status-error" role="alert">{error}</div>}

            <button
              type="submit"
              id="auth-submit-btn"
              className="btn btn-primary btn-block btn-large"
              disabled={loading}
              style={{ marginTop: '0.5rem' }}
            >
              {loading
                ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                : (mode === 'login' ? 'Continue' : 'Create Account')}
              {!loading && <span className="btn-arrow"><IconArrow /></span>}
            </button>
          </form>
        )}

        {/* ── STEP 2: OTP Verification ──────────────────────────────── */}
        {(step === 'otp' || step === 'forgot_otp') && (
          <form onSubmit={step === 'forgot_otp' ? handleVerifyForgotOTP : handleVerifyOTP} noValidate>

            {/* 6 individual digit boxes */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
              role="group"
              aria-label="6-digit verification code"
            >
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={el => digitRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  pattern="\d"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleDigitKeyDown(i, e)}
                  onPaste={i === 0 ? handleDigitPaste : undefined}
                  onFocus={() => {
                    riveHandsUp();
                    if (isCheckingInput) isCheckingInput.value = false;
                  }}
                  onBlur={() => {
                    riveHandsDown();
                  }}
                  disabled={loading || isSuccess}
                  aria-label={`Digit ${i + 1}`}
                  id={`otp-digit-${i}`}
                  style={{
                    width: '44px',
                    height: '56px',
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    letterSpacing: 0,
                    padding: '0',
                    borderRadius: 'var(--radius-sm)',
                    border: digit
                      ? '2px solid var(--accent)'
                      : '2px solid #cbd5e1',
                    boxShadow: digit ? '3px 3px 0 var(--accent)' : '3px 3px 0 transparent',
                    background: 'var(--input)',
                    color: 'var(--foreground)',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    caretColor: 'transparent',
                  }}
                />
              ))}
            </div>

            {/* Info / Error messages */}
            {infoMsg && !error && (
              <div className="status-message status-success" role="status">{infoMsg}</div>
            )}
            {error && (
              <div className="status-message status-error" role="alert">{error}</div>
            )}

            {/* OTP expired warning */}
            {otpCountdown === 0 && !isSuccess && (
              <div className="status-message status-error" role="alert">
                ⏰ This code has expired. Please request a new one.
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
              <button
                type="button"
                id="auth-back-btn"
                className="btn btn-ghost"
                onClick={step === 'forgot_otp' ? () => { setStep('forgot_email'); setError(''); setInfoMsg(''); } : resetToCredentials}
                disabled={loading || isSuccess}
                style={{ flex: 1 }}
              >
                ← Back
              </button>
              <button
                type="submit"
                id="auth-verify-btn"
                className="btn btn-primary"
                disabled={loading || isSuccess || !otpComplete || otpCountdown === 0}
                style={{ flex: 2 }}
              >
                {loading ? 'Verifying…' : (step === 'forgot_otp' ? 'Continue' : (isSuccess ? '✓ Verified!' : 'Verify OTP'))}
              </button>
            </div>

            {/* Resend OTP */}
            <div style={{ textalign: 'center', marginTop: '1.1rem' }}>
              {resendCountdown > 0 ? (
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                  Resend available in{' '}
                  <strong style={{ color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>
                    {resendCountdown}s
                  </strong>
                </p>
              ) : (
                <button
                  type="button"
                  id="auth-resend-btn"
                  className="link-btn"
                  onClick={handleResend}
                  disabled={loading || isSuccess}
                >
                  Resend verification code
                </button>
              )}
            </div>
          </form>
        )}

        {/* ── FORGOT EMAIL STEP ───────────────────────────────────── */}
        {step === 'forgot_email' && mode === 'forgot' && (
          <form onSubmit={handleForgotEmail} noValidate>
            <div className="form-group">
              <label htmlFor="forgot-email">Email</label>
              <input
                type="email"
                id="forgot-email"
                placeholder="you@school.edu"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                disabled={loading}
                autoComplete="email"
                required
                onFocus={() => { if (isCheckingInput) isCheckingInput.value = true; }} // eslint-disable-line react-hooks/immutability
              />
            </div>

            {error && <div className="status-message status-error" role="alert">{error}</div>}
            {infoMsg && <div className="status-message status-success" role="status">{infoMsg}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-block btn-large"
              disabled={loading}
              style={{ marginTop: '0.5rem' }}
            >
              {loading ? 'Sending code…' : 'Send Reset Code'}
              {!loading && <span className="btn-arrow"><IconArrow /></span>}
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-block"
              style={{ marginTop: '0.5rem' }}
              onClick={() => {
                setMode('login');
                setStep('credentials');
                setError('');
                setInfoMsg('');
              }}
              disabled={loading}
            >
              Cancel
            </button>
          </form>
        )}

        {/* ── RESET PASSWORD STEP ─────────────────────────────────── */}
        {step === 'reset_password' && mode === 'forgot' && (
          <form onSubmit={handleNewPasswordSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="new-password">New password</label>
              <div className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="new-password"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setError(''); }}
                  disabled={loading}
                  autoComplete="new-password"
                  required
                  onFocus={riveHandsUp}
                  onBlur={riveHandsDown}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(s => !s)}
                  tabIndex={-1}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm new password</label>
              <div className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirm-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                  disabled={loading}
                  autoComplete="new-password"
                  required
                  onFocus={riveHandsUp}
                  onBlur={riveHandsDown}
                />
              </div>
            </div>

            {error && <div className="status-message status-error" role="alert">{error}</div>}
            {infoMsg && <div className="status-message status-success" role="status">{infoMsg}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-block btn-large"
              disabled={loading || !newPassword || !confirmPassword}
              style={{ marginTop: '0.5rem' }}
            >
              {loading ? 'Resetting…' : 'Reset Password'}
              {!loading && <span className="btn-arrow"><IconArrow /></span>}
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-block"
              style={{ marginTop: '0.5rem' }}
              onClick={() => {
                setStep('forgot_otp');
                setError('');
                setInfoMsg('');
              }}
              disabled={loading}
            >
              ← Back
            </button>
          </form>
        )}

        {/* Footer links */}
        {step === 'credentials' && mode !== 'forgot' && (
          <>
            <p className="auth-switch">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" className="link-btn" onClick={switchMode}>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
            <p className="auth-switch" style={{ marginTop: '0.5rem' }}>
              <a href="#landing" className="link-btn" style={{ textDecoration: 'none' }}>
                ← Back to home
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
