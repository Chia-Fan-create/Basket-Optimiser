import React, { useState, useEffect } from 'react';
import { CartIcon, ArrowR } from '../components/Icons';
import { login, register } from '../api';

export default function LoginPage({ onLogin, onBack }) {
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  const handleSubmit = () => {
    setError(null);
    setSubmitting(true);
    const action = tab === 'login'
      ? login(email, password)
      : register(email, password, displayName);

    action
      .then(res => {
        localStorage.setItem('token', res.token);
        onLogin(res.user);
      })
      .catch(err => setError(err.message))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="page login-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo"><CartIcon /></div>
          <h2 className="login-title">Welcome to SmartCart</h2>
          <p className="login-sub">Sign in to save your favorites and unlock all features.</p>
        </div>
        <div className="login-tabs">
          <button className={`ltab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(null); }}>Sign In</button>
          <button className={`ltab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(null); }}>Register</button>
        </div>
        <div className="login-form">
          {tab === 'register' && (
            <div className="fg">
              <label className="fl">Display Name</label>
              <input className="fi" type="text" placeholder="Your name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
          )}
          <div className="fg">
            <label className="fl">Email</label>
            <input className="fi" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="fg">
            <label className="fl">Password</label>
            <input className="fi" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="btn-primary login-submit" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Please wait...' : (tab === 'login' ? 'Sign In' : 'Create Account')} {!submitting && <ArrowR />}
          </button>
        </div>
        <button className="login-skip" onClick={onBack}>← Back to Dashboard</button>
      </div>
    </div>
  );
}