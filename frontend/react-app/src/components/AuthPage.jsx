/**
 * components/AuthPage.jsx
 * Firebase email link verification + credentials UI for StudyBuddy AI.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { IconArrow } from './Icons';
import { loginUser, registerUser, forgotPassword } from '../utils/api';
import { auth } from '../firebase';
import { sendEmailVerification } from 'firebase/auth';

const STATE_MACHINE = 'Login Machine';

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

const AuthPage = () => {
  // Mode: 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState('login');
  // Step: 'credentials' | 'verification_pending'
  const [step, setStep] = useState('credentials');

  // Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

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

  // Rive Helpers
  const riveHandsUp = useCallback(() => {
    if (isCheckingInput) isCheckingInput.value = false;
    if (isHandsUpInput)  isHandsUpInput.value  = true;
  }, [isCheckingInput, isHandsUpInput]);

  const riveHandsDown = useCallback(() => {
    if (isHandsUpInput) isHandsUpInput.value = false;
  }, [isHandsUpInput]);

  const riveSuccess = useCallback(() => {
    if (trigSuccessInput) trigSuccessInput.fire();
  }, [trigSuccessInput]);

  const riveFail = useCallback(() => {
    if (trigFailInput) trigFailInput.fire();
  }, [trigFailInput]);

  // Handle Register/Login Form Submit
  const handleCredentials = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

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
        const syncData = await loginUser(email.trim().toLowerCase(), password);
        setIsSuccess(true);
        riveSuccess();
        setInfoMsg('✅ Login successful! Redirecting…');
        setTimeout(() => {
          window.location.hash = 'dashboard';
        }, 1500);
      } else {
        await registerUser(name.trim(), email.trim().toLowerCase(), password);
        riveSuccess();
        setStep('verification_pending');
        setInfoMsg(`We've sent a verification link to ${email}. Check your inbox to activate your account.`);
      }
    } catch (err) {
      console.error(err);
      riveFail();
      if (err.message?.includes('verify your email')) {
        setStep('verification_pending');
        setInfoMsg(err.message);
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e) => {
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
      await forgotPassword(email.trim().toLowerCase());
      riveSuccess();
      setInfoMsg(`Password reset link sent to ${email}. Check your inbox.`);
    } catch (err) {
      riveFail();
      setError(err.message || 'Failed to send password reset link.');
    } finally {
      setLoading(false);
    }
  };

  // Resend Email Verification link manually
  const handleResendVerification = async () => {
    setError('');
    setInfoMsg('');
    setLoading(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setInfoMsg('Verification email resent successfully!');
      } else {
        setError('Unable to resend. Please try logging in again to trigger the link.');
      }
    } catch (err) {
      setError(err.message || 'Failed to resend verification link.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setStep('credentials');
    setEmail('');
    setPassword('');
    setName('');
    setError('');
    setInfoMsg('');
  };

  return (
    <div className="landing-layout">
      <div className="card auth-card">
        {/* Rive Animation */}
        <div className="auth-rive">
          <RiveComponent style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Title */}
        <h2 style={{ textAlign: 'center', marginBottom: '0.25rem' }}>
          {step === 'verification_pending'
            ? 'Verify your email'
            : mode === 'forgot'
              ? 'Reset Password'
              : mode === 'login'
                ? 'Welcome back'
                : 'Create an account'}
        </h2>
        
        <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {step === 'verification_pending'
            ? "We sent an email verification link. Please click it to verify, then come back to sign in."
            : mode === 'forgot'
              ? "Enter your email address. We'll send you a secure link to reset your password."
              : mode === 'login'
                ? "Sign in to access your study companion and generate personalized test materials."
                : "Sign up with your email. We'll verify it with a secure confirmation link."}
        </p>

        {/* Status Messages */}
        {error && <div className="status-message status-error" role="alert">{error}</div>}
        {infoMsg && !error && <div className="status-message status-success" role="status">{infoMsg}</div>}

        {/* ── STEP 1: Credentials / Forgot Password Form ──────────────── */}
        {step === 'credentials' && (
          <form onSubmit={mode === 'forgot' ? handleForgotPassword : handleCredentials} noValidate>
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
                onFocus={() => { if (isCheckingInput) isCheckingInput.value = true; }}
              />
            </div>

            {mode !== 'forgot' && (
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
            )}

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: '-0.75rem', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  className="link-btn"
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                    setInfoMsg('');
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              id="auth-submit-btn"
              className="btn btn-primary btn-block btn-large"
              disabled={loading}
              style={{ marginTop: '0.5rem' }}
            >
              {loading
                ? (mode === 'login' ? 'Signing in…' : mode === 'forgot' ? 'Sending link…' : 'Creating account…')
                : (mode === 'login' ? 'Continue' : mode === 'forgot' ? 'Send Link' : 'Create Account')}
              {!loading && <span className="btn-arrow"><IconArrow /></span>}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                className="btn btn-ghost btn-block"
                style={{ marginTop: '0.5rem' }}
                onClick={() => {
                  setMode('login');
                  setError('');
                  setInfoMsg('');
                }}
                disabled={loading}
              >
                Cancel
              </button>
            )}
          </form>
        )}

        {/* ── STEP 2: Email Verification Pending Screen ───────────────── */}
        {step === 'verification_pending' && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => {
                  setStep('credentials');
                  setMode('login');
                  setError('');
                  setInfoMsg('');
                }}
                disabled={loading}
              >
                ← Sign in
              </button>
              
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={handleResendVerification}
                disabled={loading}
              >
                {loading ? 'Sending…' : 'Resend Link'}
              </button>
            </div>
          </div>
        )}

        {/* Switching Modes Links */}
        {step === 'credentials' && (
          <>
            <p className="auth-switch">
              {mode === 'login' ? "Don't have an account? " : mode === 'register' ? 'Already have an account? ' : ''}
              {mode !== 'forgot' && (
                <button type="button" className="link-btn" onClick={switchMode}>
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              )}
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
