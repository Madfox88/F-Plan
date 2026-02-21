/**
 * LoginPage — Email + Password sign-in.
 *
 * Also links to sign-up and forgot-password flows.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

interface LoginPageProps {
  onNavigate: (page: 'signup' | 'forgot') => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: err } = await signIn(email.trim(), password);
    if (err) {
      setError(err);
      setLoading(false);
    }
    // On success the AuthContext session updates automatically
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={`${import.meta.env.BASE_URL}Logo.png`} alt="F-Plan" className="auth-logo-img" />
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your F-Plan account</p>

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

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            className="auth-button-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <button
          className="auth-link"
          type="button"
          onClick={() => onNavigate('forgot')}
        >
          Forgot your password?
        </button>

        <div className="auth-divider" />

        <p className="auth-footer">
          Don't have an account?{' '}
          <button
            className="auth-link-inline"
            type="button"
            onClick={() => onNavigate('signup')}
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
