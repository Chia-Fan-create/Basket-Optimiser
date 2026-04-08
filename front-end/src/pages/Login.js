import React, { useState, useEffect } from 'react';
import { CartIcon, ArrowR } from '../components/Icons';

export default function LoginPage({ onLogin, onBack }) {
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState('login');
  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  return (
    <div className="page login-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo"><CartIcon /></div>
          <h2 className="login-title">Welcome to SmartCart</h2>
          <p className="login-sub">Sign in to save your favorites and unlock all features.</p>
        </div>
        <div className="login-tabs">
          <button className={`ltab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Sign In</button>
          <button className={`ltab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Register</button>
        </div>
        <div className="login-form">
          {tab === 'register' && <div className="fg"><label className="fl">Display Name</label><input className="fi" type="text" placeholder="Your name" /></div>}
          <div className="fg"><label className="fl">Email</label><input className="fi" type="email" placeholder="you@example.com" /></div>
          <div className="fg"><label className="fl">Password</label><input className="fi" type="password" placeholder="••••••••" /></div>
          <button className="btn-primary login-submit" onClick={onLogin}>{tab === 'login' ? 'Sign In' : 'Create Account'} <ArrowR /></button>
        </div>
        <button className="login-skip" onClick={onBack}>← Back to Dashboard</button>
      </div>
    </div>
  );
}
