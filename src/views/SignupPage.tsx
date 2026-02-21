/**
 * SignupPage — Create a new account with email + password.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

interface SignupPageProps {
  onNavigate: (page: 'login') => void;
}

export function SignupPage({ onNavigate }: SignupPageProps) {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setLoading(true);
    const { error: err } = await signUp(email.trim(), password, displayName.trim());
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <img src={`${import.meta.env.BASE_URL}Logo.png`} alt="F-Plan" className="auth-logo-img" />
          </div>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">
            We've sent a confirmation link to <strong>{email}</strong>. 
            Click the link to activate your account.
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
          <img src={`${import.meta.env.BASE_URL}Logo.png`} alt="F-Plan" className="auth-logo-img" />
        </div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Get started with F-Plan</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Display name
            <input
              className="auth-input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </label>

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

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>

          <label className="auth-label">
            Confirm password
            <input
              className="auth-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
            />
          </label>

          <button
            className="auth-button-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="auth-divider" />

        <p className="auth-footer">
          Already have an account?{' '}
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
