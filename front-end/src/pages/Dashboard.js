import React, { useState, useEffect } from 'react';
import { LockSvg, ArrowR, SettingSvg } from '../components/Icons';
import { PRODUCT_CATALOG, MOCK_COMPARISONS, MOCK_INVENTORY, STORE_COLORS } from '../data/mockData';

export default function DashboardPage({ selectedIds, isLoggedIn, onNavigate, onEditFavorites, onLogin }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  const bestDeals = selectedIds.slice(0, 8).map(pid => {
    const p = PRODUCT_CATALOG.find(x => x.id === pid);
    const best = (MOCK_COMPARISONS[pid] || [])[0];
    return best ? { ...p, best } : null;
  }).filter(Boolean);

  const storeSummary = {};
  selectedIds.forEach(pid => { const it = (MOCK_COMPARISONS[pid] || [])[0]; if (it) storeSummary[it.store] = (storeSummary[it.store] || 0) + 1; });
  const topStore = Object.entries(storeSummary).sort((a, b) => b[1] - a[1])[0];
  const totalSavings = selectedIds.reduce((acc, pid) => {
    const it = MOCK_COMPARISONS[pid] || [];
    return it.length >= 2 ? acc + (it[it.length - 1].unitPrice - it[0].unitPrice) : acc;
  }, 0);
  const lowInventory = MOCK_INVENTORY.filter(i => i.status === 'low');

  return (
    <div className="page dash-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <div className="dash-header">
        <h2 className="page-title">Your Dashboard</h2>
        <p className="page-sub">Quick overview based on your {selectedIds.length} favorite items</p>
      </div>

      {!isLoggedIn && (
        <div className="login-prompt">
          <div className="lp-left"><LockSvg /><div><strong>Sign in to unlock more features</strong><p>Shopping lists, inventory tracking, price alerts, receipt OCR & spending insight</p></div></div>
          <button className="btn-secondary" onClick={onLogin}>Sign In / Register <ArrowR /></button>
        </div>
      )}

      <div className="kpi-row">
        <div className="kpi-card"><span className="kpi-label">Tracking</span><span className="kpi-val">{selectedIds.length}</span><span className="kpi-sub">products</span></div>
        <div className="kpi-card"><span className="kpi-label">Best Retailer</span><span className="kpi-val" style={{ color: topStore ? STORE_COLORS[topStore[0]] : 'var(--brown)', fontSize: 22 }}>{topStore ? topStore[0] : '—'}</span><span className="kpi-sub">{topStore ? `${topStore[1]} best prices` : 'select items'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Potential Savings</span><span className="kpi-val" style={{ color: 'var(--green)' }}>${totalSavings.toFixed(2)}</span><span className="kpi-sub">vs. most expensive</span></div>
      </div>

      {isLoggedIn && lowInventory.length > 0 && (
        <div className="low-inv-banner" onClick={() => onNavigate('inventory')}>
          <span className="lib-icon">⚠️</span>
          <div className="lib-text"><strong>{lowInventory.length} item{lowInventory.length > 1 ? 's' : ''} running low</strong><p>{lowInventory.map(i => i.product).join(', ')} — tap to view inventory</p></div>
          <ArrowR />
        </div>
      )}

      <div className="dash-section">
        <div className="dash-sec-head"><h3 className="sec-title">Your Favorites</h3><button className="btn-icon" onClick={onEditFavorites}><SettingSvg /> Edit</button></div>
        <div className="fav-grid">
          {bestDeals.map(item => (
            <div key={item.id} className="fav-card" onClick={() => onNavigate('compare')}>
              <span className="fav-icon">{item.icon}</span>
              <div className="fav-info">
                <span className="fav-name">{item.name}</span>
                <span className="fav-price">${item.best.unitPrice < 1 ? item.best.unitPrice.toFixed(3) : item.best.unitPrice.toFixed(2)} <small>{item.best.unit}</small></span>
                <span className="fav-store" style={{ color: item.best.storeColor }}>{item.best.store}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-section">
        <h3 className="sec-title">Quick Actions</h3>
        <div className="action-grid">
          <button className="action-card" onClick={() => onNavigate('compare')}><span className="ac-icon">📊</span><span className="ac-label">Compare Prices</span><span className="ac-desc">Find the cheapest option</span></button>
          <button className="action-card" onClick={() => onNavigate('trends')}><span className="ac-icon">📈</span><span className="ac-label">Price Trends</span><span className="ac-desc">History & predictions</span></button>
          {isLoggedIn ? (<>
            <button className="action-card" onClick={() => onNavigate('lists')}><span className="ac-icon">🛒</span><span className="ac-label">Shopping Lists</span><span className="ac-desc">Build & optimize your cart</span></button>
            <button className="action-card" onClick={() => onNavigate('inventory')}><span className="ac-icon">📦</span><span className="ac-label">Inventory</span><span className="ac-desc">Track what's at home</span></button>
            <button className="action-card" onClick={() => onNavigate('alerts')}><span className="ac-icon">🔔</span><span className="ac-label">Price Alerts</span><span className="ac-desc">Get notified on drops</span></button>
            <button className="action-card" onClick={() => onNavigate('insight')}><span className="ac-icon">💰</span><span className="ac-label">Insight</span><span className="ac-desc">Track your spending</span></button>
          </>) : (<>
            {['🛒 Shopping Lists', '📦 Inventory', '🔔 Price Alerts', '💰 Insight'].map((label, i) => (
              <button key={i} className="action-card locked" onClick={onLogin}>
                <span className="ac-lock"><LockSvg /></span>
                <span className="ac-icon">{label.split(' ')[0]}</span>
                <span className="ac-label">{label.substring(label.indexOf(' ') + 1)}</span>
                <span className="ac-desc">Sign in to unlock</span>
              </button>
            ))}
          </>)}
        </div>
      </div>
    </div>
  );
}
