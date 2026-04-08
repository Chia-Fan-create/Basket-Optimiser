import React, { useState, useEffect } from 'react';
import { BoltSvg, CheckSvg } from '../components/Icons';
import { PRODUCT_CATALOG, MOCK_ALERTS, STORE_COLORS } from '../data/mockData';

export default function AlertsPage() {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  const smartAlerts = MOCK_ALERTS.filter(a => a.type === 'smart');
  const userTriggered = MOCK_ALERTS.filter(a => a.type === 'user' && a.isTriggered);
  const userActive = MOCK_ALERTS.filter(a => a.type === 'user' && !a.isTriggered);

  return (
    <div className="page alerts-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <h2 className="page-title">Price Alerts</h2>
      <p className="page-sub">Get notified when products drop below your target price</p>

      <div className="new-alert-card">
        <h3 className="na-title">Set New Alert</h3>
        <div className="na-form">
          <select className="fi sel"><option>Select product...</option>{PRODUCT_CATALOG.map(p => <option key={p.id}>{p.icon} {p.name}</option>)}</select>
          <div className="na-price"><span className="na-dollar">$</span><input className="fi" type="number" placeholder="Target price" /></div>
          <button className="btn-primary">Set Alert</button>
        </div>
      </div>

      {smartAlerts.length > 0 && (
        <div className="alert-section">
          <h3 className="alert-sec-title"><BoltSvg /> Smart Alerts</h3>
          <p className="alert-sec-sub">Automatically detected price drops</p>
          {smartAlerts.map(a => (
            <div key={a.id} className="alert-row smart">
              <span className="alert-icon">{a.icon}</span>
              <div className="alert-info">
                <span className="alert-name">{a.product}</span>
                <span className="alert-detail">
                  Dropped <strong style={{ color: 'var(--green)' }}>{a.dropPct}%</strong> to <strong>${a.currentPrice.toFixed(2)}</strong> at <strong style={{ color: STORE_COLORS[a.store] }}>{a.store}</strong>
                </span>
                <span className="alert-time">Detected {a.triggeredAt}</span>
              </div>
              <span className="alert-badge smart">⚡ Smart</span>
            </div>
          ))}
        </div>
      )}

      {userTriggered.length > 0 && (
        <div className="alert-section">
          <h3 className="alert-sec-title">🎉 Triggered</h3>
          {userTriggered.map(a => (
            <div key={a.id} className="alert-row triggered">
              <span className="alert-icon">{a.icon}</span>
              <div className="alert-info">
                <span className="alert-name">{a.product}</span>
                <span className="alert-detail">Dropped to <strong style={{ color: 'var(--green)' }}>${a.currentPrice.toFixed(2)}</strong> at <strong style={{ color: STORE_COLORS[a.store] }}>{a.store}</strong></span>
                <span className="alert-time">Triggered {a.triggeredAt}</span>
              </div>
              <div className="alert-target"><span className="at-label">Target</span><span className="at-price">${a.targetPrice.toFixed(2)}</span></div>
            </div>
          ))}
        </div>
      )}

      <div className="alert-section">
        <h3 className="alert-sec-title">Active Alerts</h3>
        {userActive.map(a => (
          <div key={a.id} className="alert-row">
            <span className="alert-icon">{a.icon}</span>
            <div className="alert-info"><span className="alert-name">{a.product}</span><span className="alert-detail">Current: ${a.currentPrice.toFixed(2)}</span></div>
            <div className="alert-target"><span className="at-label">Target</span><span className="at-price">${a.targetPrice.toFixed(2)}</span></div>
            <div className="alert-prog">
              <div className="ap-bar"><div className="ap-fill" style={{ width: `${Math.min((a.targetPrice / a.currentPrice) * 100, 100)}%` }} /></div>
              <span className="ap-text">${(a.currentPrice - a.targetPrice).toFixed(2)} away</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
