import React from 'react';
import { logAppError } from '../utils/logger.js';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logAppError("ReactErrorBoundary", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-card)',
          color: 'var(--text-main)',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '520px'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '0.75rem' }}>
              Display Refresh Required
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
              The screen encountered a display refresh. Please click the button below to reload.
            </p>
            {this.state.error && (
              <div style={{ background: 'var(--modal-overlay)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--danger)', fontFamily: 'monospace', marginBottom: '1.25rem', textAlign: 'left', wordBreak: 'break-all' }}>
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh View
            </button>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
