import React, { useState, useEffect } from 'react';
import { BoltSvg, CheckSvg } from '../components/Icons';
import { STORE_COLORS } from '../data/mockData';
import { getProducts, getAlerts, createAlert, deleteAlert, updateAlert, markTodoDone, deleteTodo } from '../api';

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
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [dismissedTodos, setDismissedTodos] = useState(new Set());

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

  const handleUpdatePrice = (alertId) => {
    const price = parseFloat(editPrice);
    if (!price || price <= 0) return;
    updateAlert(alertId, { target_price: price })
      .then(() => { setEditingId(null); setEditPrice(''); loadData(); })
      .catch(err => setError(err.message));
  };

  const handleToggleActive = (alertId, currentlyActive) => {
    updateAlert(alertId, { is_active: !currentlyActive })
      .then(() => loadData())
      .catch(err => setError(err.message));
  };

  const handleTodoDone = (todoId) => {
    markTodoDone(todoId)
      .then(() => setSmartAlerts(prev => prev.filter(a => a.alert_id !== todoId)))
      .catch(err => setError(err.message));
  };

  const handleTodoDismiss = (todoId) => {
    deleteTodo(todoId)
      .then(() => setDismissedTodos(prev => new Set([...prev, todoId])))
      .catch(err => setError(err.message));
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
          {smartAlerts.map(a => {
            const isDismissed = dismissedTodos.has(a.alert_id);
            return (
              <div key={a.alert_id} className="alert-row smart" style={isDismissed ? { opacity: 0.45 } : {}}>
                <span className="alert-icon">📉</span>
                <div className="alert-info">
                  <span className="alert-name">{a.product_name}{isDismissed && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>Dismissed</span>}</span>
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
                {!isDismissed && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn-sm" onClick={() => handleTodoDone(a.alert_id)} style={{ fontSize: 12, padding: '4px 10px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>✓ Done</button>
                    <button className="btn-sm" onClick={() => handleTodoDismiss(a.alert_id)} style={{ fontSize: 12, padding: '4px 10px', background: 'none', color: 'var(--text-muted)', border: '1px solid var(--sand)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Dismiss</button>
                  </div>
                )}
              </div>
            );
          })}
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
              <div className="alert-target">
                <span className="at-label">Target</span>
                {editingId === a.alert_id ? (
                  <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--brown)' }}>$</span>
                    <input
                      autoFocus
                      type="number" step="0.01" value={editPrice}
                      onChange={e => setEditPrice(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdatePrice(a.alert_id); if (e.key === 'Escape') setEditingId(null); }}
                      style={{ width: 70, padding: '2px 6px', border: '1px solid var(--sand)', borderRadius: 6, fontSize: 13, fontFamily: 'Outfit, sans-serif' }}
                    />
                    <button onClick={() => handleUpdatePrice(a.alert_id)} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 12, cursor: 'pointer' }}>✓</button>
                    <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', padding: '2px 4px', fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                  </span>
                ) : (
                  <span className="at-price" onClick={() => { setEditingId(a.alert_id); setEditPrice(a.target_price.toFixed(2)); }} style={{ cursor: 'pointer' }} title="Click to edit">${a.target_price.toFixed(2)} ✎</span>
                )}
              </div>
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
            <div className="alert-target">
              <span className="at-label">Target</span>
              {editingId === a.alert_id ? (
                <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--brown)' }}>$</span>
                  <input
                    autoFocus
                    type="number" step="0.01" value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdatePrice(a.alert_id); if (e.key === 'Escape') setEditingId(null); }}
                    style={{ width: 70, padding: '2px 6px', border: '1px solid var(--sand)', borderRadius: 6, fontSize: 13, fontFamily: 'Outfit, sans-serif' }}
                  />
                  <button onClick={() => handleUpdatePrice(a.alert_id)} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 12, cursor: 'pointer' }}>✓</button>
                  <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', padding: '2px 4px', fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </span>
              ) : (
                <span className="at-price" onClick={() => { setEditingId(a.alert_id); setEditPrice(a.target_price.toFixed(2)); }} style={{ cursor: 'pointer' }} title="Click to edit">${a.target_price.toFixed(2)} ✎</span>
              )}
            </div>
            {a.current_price != null && editingId !== a.alert_id && (
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
