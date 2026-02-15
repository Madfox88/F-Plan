/**
 * ForgotPasswordPage — Request a password reset email.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

interface ForgotPasswordPageProps {
  onNavigate: (page: 'login') => void;
}

export function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: err } = await resetPassword(email.trim());
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <img src="/Logo.png" alt="F-Plan" className="auth-logo-img" />
          </div>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">
            If an account exists for <strong>{email}</strong>, we've sent
            a password reset link. Check your inbox.
          </p>
          <button
            className="auth-button-secondary"
            type="button"
            onClick={() => onNavigate('login')}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/Logo.png" alt="F-Plan" className="auth-logo-img" />
        </div>
        <h1 className="auth-title">Reset your password</h1>
        <p className="auth-subtitle">
          Enter your email address and we'll send you a reset link
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <button
            className="auth-button-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <div className="auth-divider" />

        <p className="auth-footer">
          Remember your password?{' '}
          <button
            className="auth-link-inline"
            type="button"
            onClick={() => onNavigate('login')}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
