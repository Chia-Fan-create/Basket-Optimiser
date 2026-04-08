import React, { useState, useEffect } from 'react';
import { ArrowR } from '../components/Icons';

export default function LandingPage({ onNext }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);
  return (
    <div className="page landing" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <div className="landing-content">
        <div className="landing-badge">🛒 Smart Shopping Starts Here</div>
        <h1 className="landing-title">Compare prices.<br /><span className="hl">Save smarter.</span></h1>
        <p className="landing-sub">SmartCart normalizes prices across Amazon, Target & Walmart so you always know the true cost per unit.</p>
        <button className="btn-primary landing-btn" onClick={onNext}>Start Comparing <ArrowR /></button>
        <div className="landing-stores">
          <span className="store-chip" style={{ borderColor: '#FF990044', color: '#FF9900' }}>Amazon</span>
          <span className="store-chip" style={{ borderColor: '#CC000044', color: '#CC0000' }}>Target</span>
          <span className="store-chip" style={{ borderColor: '#0071DC44', color: '#0071DC' }}>Walmart</span>
        </div>
      </div>
    </div>
  );
}
