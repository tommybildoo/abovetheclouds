import React, { useState } from 'react';
import { useAuth } from './AuthContext.jsx';

export default function LoginModal({ onClose }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await signup(email, username, password);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <form style={modalStyle} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="eyebrow">{mode === 'login' ? 'Sign In' : 'Create Account'}</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 26, margin: '10px 0 20px', textTransform: 'uppercase' }}>
          {mode === 'login' ? 'Welcome back' : 'Join AboveTheClouds'}
        </h3>
        {mode === 'signup' && (
          <input style={inputStyle} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        )}
        <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input style={inputStyle} type="password" placeholder="Password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        {error && <div style={{ color: 'var(--danger)', fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 12 }}>{error}</div>}
        <button className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy} type="submit">
          {busy ? 'PLEASE WAIT…' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
        </button>
        <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ marginTop: 14, fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', width: '100%' }}>
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}

const overlayStyle = { position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(4,5,7,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 };
const modalStyle = { background: 'var(--bg-2)', border: '1px solid var(--line-strong)', padding: 34, width: '100%', maxWidth: 380 };
const inputStyle = { width: '100%', padding: '13px 14px', marginBottom: 14, background: 'var(--bg)', border: '1px solid var(--line-strong)', color: 'var(--text)', fontSize: 14 };
