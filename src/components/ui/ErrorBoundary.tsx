/**
 * ErrorBoundary — Catches unhandled render errors and shows a
 * user-friendly fallback instead of a white screen.
 *
 * Wraps the entire <App /> in main.tsx.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production you'd send this to a monitoring service
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'var(--font-family, system-ui, sans-serif)',
            color: 'var(--text-primary, #fff)',
            background: 'var(--bg-base, #0a0a14)',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Something went wrong</h1>
          <p style={{ color: 'var(--text-secondary, #aaa)', maxWidth: '28rem' }}>
            An unexpected error occurred. You can try reloading the page.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre
              style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1rem',
                borderRadius: '0.5rem',
                maxWidth: '40rem',
                overflow: 'auto',
                fontSize: '0.8rem',
                textAlign: 'left',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'var(--color-accent, #6366f1)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
