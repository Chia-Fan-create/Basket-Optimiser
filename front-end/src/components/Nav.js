// SmartCart — Navigation Component
import React, { useState, useEffect, useRef } from 'react';
import { CartIcon, ChevDown, UserSvg } from './Icons';

export default function Nav({ page, isLoggedIn, onNavigate, onLogoClick }) {
  const [shopOpen, setShopOpen] = useState(false);
  const dropRef = useRef(null);
  const showNav = page !== 'landing' && page !== 'select';

  useEffect(() => {
    const close = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShopOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const shopPages = isLoggedIn
    ? ['compare', 'trends', 'lists', 'inventory', 'alerts']
    : ['compare', 'trends'];
  const shopLabels = { compare: 'Compare', trends: 'Trends', lists: 'Lists', inventory: 'Inventory', alerts: 'Alerts' };
  const isShopPage = shopPages.includes(page);

  return (
    <nav className="sc-nav">
      <a className="sc-logo" onClick={onLogoClick}>
        <div className="sc-logo-icon"><CartIcon /></div>
        SmartCart
      </a>
      {showNav && (
        <div className="nav-links">
          <button className={`nav-link ${page === 'dashboard' ? 'active' : ''}`} onClick={() => onNavigate('dashboard')}>Dashboard</button>
          <div className="nav-dropdown" ref={dropRef}>
            <button className={`nav-link nav-drop-trigger ${isShopPage ? 'active' : ''}`} onClick={() => setShopOpen(!shopOpen)}>
              Shopping <ChevDown />
            </button>
            {shopOpen && (
              <div className="nav-drop-menu">
                {shopPages.map(p => (
                  <button key={p} className={`nav-drop-item ${page === p ? 'active' : ''}`}
                    onClick={() => { onNavigate(p); setShopOpen(false); }}>
                    {shopLabels[p]}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isLoggedIn && (
            <button className={`nav-link ${page === 'insight' ? 'active' : ''}`} onClick={() => onNavigate('insight')}>Insight</button>
          )}
          {isLoggedIn ? (
            <button className="nav-link nav-profile" onClick={() => onNavigate('dashboard')}><UserSvg /></button>
          ) : (
            <button className="nav-link nav-login" onClick={() => onNavigate('login')}>Sign In</button>
          )}
        </div>
      )}
    </nav>
  );
}
