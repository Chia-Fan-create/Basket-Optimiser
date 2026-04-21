import React, { useState, useEffect } from 'react';
import { BoltSvg, CheckSvg } from '../components/Icons';
import { STORE_COLORS } from '../data/mockData';
import { getProducts, getAlerts, createAlert, deleteAlert } from '../api';

export default function AlertsPage() {
  const [show, setShow] = useState(false);
  const [products, setProducts] = useState([]);
  const [smartAlerts, setSmartAlerts] = useState([]);
  const [userAlerts, setUserAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newProductId, setNewProductId] = useState('');
  const [newTargetPrice, setNewTargetPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([getProducts(), getAlerts()])
      .then(([productData, alertData]) => {
        setProducts(productData);
        setUserAlerts(alertData.user_alerts || []);
        setSmartAlerts(alertData.smart_alerts || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = () => {
    if (!newProductId || !newTargetPrice) return;
    setSubmitting(true);
    createAlert(parseInt(newProductId), parseFloat(newTargetPrice))
      .then(() => { setNewProductId(''); setNewTargetPrice(''); loadData(); })
      .catch(err => setError(err.message))
      .finally(() => setSubmitting(false));
  };

  const handleDelete = (alertId) => {
    deleteAlert(alertId).then(() => loadData()).catch(err => setError(err.message));
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  const userTriggered = userAlerts.filter(a => a.is_triggered);
  const userActive = userAlerts.filter(a => !a.is_triggered);

  return (
    <div className="page alerts-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <h2 className="page-title">Price Alerts</h2>
      <p className="page-sub">Get notified when products drop below your target price</p>

      <div className="new-alert-card">
        <h3 className="na-title">Set New Alert</h3>
        <div className="na-form">
          <select className="fi sel" value={newProductId} onChange={e => setNewProductId(e.target.value)}>
            <option value="">Select product...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="na-price"><span className="na-dollar">$</span><input className="fi" type="number" step="0.01" placeholder="Target price" value={newTargetPrice} onChange={e => setNewTargetPrice(e.target.value)} /></div>
          <button className="btn-primary" onClick={handleCreate} disabled={submitting}>{submitting ? 'Setting...' : 'Set Alert'}</button>
        </div>
      </div>

      {smartAlerts.length > 0 && (
        <div className="alert-section">
          <h3 className="alert-sec-title"><BoltSvg /> Smart Alerts</h3>
          <p className="alert-sec-sub">Automatically detected price drops</p>
          {smartAlerts.map(a => (
            <div key={a.alert_id} className="alert-row smart">
              <span className="alert-icon">📉</span>
              <div className="alert-info">
                <span className="alert-name">{a.product_name}</span>
                <span className="alert-detail">
                  Dropped <strong style={{ color: 'var(--green)' }}>{a.drop_pct}%</strong> to <strong>${a.current_price < 1 ? a.current_price.toFixed(3) : a.current_price.toFixed(2)}</strong> at <strong style={{ color: a.store_color || STORE_COLORS[a.store] }}>{a.store}</strong>
                  {a.deal_still_valid != null && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: a.deal_still_valid ? 'var(--green)' : '#b5651d' }}>
                      {a.deal_still_valid ? '· Deal still valid' : '· Price recovered'}
                    </span>
                  )}
                </span>
                {a.detected_at && <span className="alert-time">Detected {new Date(a.detected_at).toLocaleDateString()}</span>}
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
            <div key={a.alert_id} className="alert-row triggered">
              <span className="alert-icon">✅</span>
              <div className="alert-info">
                <span className="alert-name">{a.product_name}</span>
                <span className="alert-detail">Dropped to <strong style={{ color: 'var(--green)' }}>${a.current_price < 1 ? a.current_price.toFixed(3) : a.current_price.toFixed(2)}</strong> at <strong style={{ color: a.triggered_store_color || STORE_COLORS[a.triggered_store] }}>{a.triggered_store}</strong></span>
                {a.triggered_at && <span className="alert-time">Triggered {new Date(a.triggered_at).toLocaleDateString()}</span>}
              </div>
              <div className="alert-target"><span className="at-label">Target</span><span className="at-price">${a.target_price.toFixed(2)}</span></div>
              <button className="ac-dismiss" onClick={() => handleDelete(a.alert_id)} title="Delete alert">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="alert-section">
        <h3 className="alert-sec-title">Active Alerts</h3>
        {userActive.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '12px 0' }}>No active alerts. Set a target price above to get started.</p>
        ) : userActive.map(a => (
          <div key={a.alert_id} className="alert-row">
            <span className="alert-icon">🔔</span>
            <div className="alert-info"><span className="alert-name">{a.product_name}</span><span className="alert-detail">Current: ${a.current_price != null ? (a.current_price < 1 ? a.current_price.toFixed(3) : a.current_price.toFixed(2)) : '—'}</span></div>
            <div className="alert-target"><span className="at-label">Target</span><span className="at-price">${a.target_price.toFixed(2)}</span></div>
            {a.current_price != null && (
              <div className="alert-prog">
                <div className="ap-bar"><div className="ap-fill" style={{ width: `${Math.min((a.target_price / a.current_price) * 100, 100)}%` }} /></div>
                <span className="ap-text">${(a.current_price - a.target_price).toFixed(2)} away</span>
              </div>
            )}
            <button className="ac-dismiss" onClick={() => handleDelete(a.alert_id)} title="Delete alert">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
