import React, { useState, useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { IconArrow } from './Icons';
import { sendOTP, verifyOTP } from '../utils/api';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const STATE_MACHINE_NAME = 'Login Machine';
  const { rive, RiveComponent } = useRive({
    src: '/animated-login-screen.riv',
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
  });

  const isCheckingInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'isChecking');
  const numLookInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'numLook');
  const isHandsUpInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'isHandsUp');
  const trigSuccessInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'trigSuccess');
  const trigFailInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'trigFail');

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

  const onCodeFocus = () => {
    // Hands up covers eyes for password/code inputs in the Rive animation
    if (isCheckingInput) isCheckingInput.value = false;
    if (isHandsUpInput) isHandsUpInput.value = true;
  };

  const onCodeBlur = () => {
    if (isHandsUpInput) isHandsUpInput.value = false;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      if (trigFailInput) trigFailInput.fire();
      return;
    }

    setLoading(true);
    try {
      const data = await sendOTP(email);
      setOtpSent(true);
      if (data.code) {
        setInfoMessage(`🔑 Your Verification Code is: ${data.code}`);
      } else {
        setInfoMessage('Verification code generated successfully.');
      }
      if (isCheckingInput) isCheckingInput.value = true;
    } catch (err) {
      setError(err.message);
      if (trigFailInput) trigFailInput.fire();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (!code.trim() || code.length < 6) {
      setError('Enter the 6-digit passcode.');
      if (trigFailInput) trigFailInput.fire();
      return;
    }

    setLoading(true);
    if (isHandsUpInput) isHandsUpInput.value = false;

    try {
      await verifyOTP(email, code);
      setIsSuccess(true);
      if (trigSuccessInput) trigSuccessInput.fire();
      setInfoMessage('Verification successful!');
      setTimeout(() => {
        window.location.hash = 'dashboard';
      }, 1500);
    } catch (err) {
      setError(err.message);
      if (trigFailInput) trigFailInput.fire();
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setOtpSent(false);
    setCode('');
    setError('');
    setInfoMessage('');
  };

  return (
    <div className="landing-layout">
      <div className="card auth-card">
        <div className="auth-rive">
          <RiveComponent style={{ width: '100%', height: '100%' }} />
        </div>

        <h2 style={{ textAlign: 'center', marginBottom: '0.35rem' }}>
          {isLogin ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          {isLogin ? 'Verify your email to continue studying.' : 'Sign up via One-Time Passcode.'}
        </p>

        {/* ── Step 1: Input Email ── */}
        {!otpSent ? (
          <form onSubmit={handleSendOTP}>
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="name">Full name</label>
                <input type="text" id="name" placeholder="Alex Rivera" required />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="you@school.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <div className="status-message status-error">{error}</div>}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Sending code…' : 'Send Code'}
              <span className="btn-arrow"><IconArrow /></span>
            </button>
          </form>
        ) : (
          /* ── Step 2: Input OTP Code ── */
          <form onSubmit={handleVerifyOTP}>
            <div className="form-group">
              <label htmlFor="code">One-Time Passcode</label>
              <input
                type="text"
                id="code"
                placeholder="123456"
                maxLength="6"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} // numbers only
                onFocus={onCodeFocus}
                onBlur={onCodeBlur}
                disabled={loading}
                style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.2rem', fontWeight: 800 }}
              />
            </div>

            {infoMessage && <div className="status-message status-success">{infoMessage}</div>}
            {error && <div className="status-message status-error">{error}</div>}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={resetFlow}
                disabled={loading}
                style={{ flex: 1 }}
              >
                Change Email
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ flex: 2 }}
              >
                {loading ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </form>
        )}

        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              resetFlow();
            }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
        <p className="auth-switch" style={{ marginTop: '0.5rem' }}>
          <a href="#landing" className="link-btn" style={{ textDecoration: 'none' }}>Back to home</a>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
