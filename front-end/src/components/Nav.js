// SmartCart — Navigation Component
import React, { useState, useEffect, useRef } from 'react';
import { CartIcon, ChevDown, UserSvg } from './Icons';

export default function Nav({ page, isLoggedIn, currentUser, onNavigate, onLogoClick, onLogout }) {
  const [shopOpen, setShopOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const shopRef = useRef(null);
  const profileRef = useRef(null);
  const showNav = page !== 'landing' && page !== 'select';

  useEffect(() => {
    const close = (e) => {
      if (shopRef.current && !shopRef.current.contains(e.target)) setShopOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
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

          <div className="nav-dropdown" ref={shopRef}>
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
            <div className="nav-dropdown" ref={profileRef}>
              <button className="nav-link nav-profile" onClick={() => setProfileOpen(!profileOpen)}>
                <UserSvg />
                {currentUser?.display_name && <span className="nav-username">{currentUser.display_name}</span>}
                <ChevDown />
              </button>
              {profileOpen && (
                <div className="nav-drop-menu nav-profile-menu">
                  {currentUser?.display_name && (
                    <div className="nav-profile-header">
                      <span className="nav-profile-name">{currentUser.display_name}</span>
                      <span className="nav-profile-email">{currentUser.email}</span>
                    </div>
                  )}
                  <button className="nav-drop-item" onClick={() => { onNavigate('dashboard'); setProfileOpen(false); }}>
                    Dashboard
                  </button>
                  <div className="nav-drop-divider" />
                  <button className="nav-drop-item nav-logout" onClick={() => { onLogout(); setProfileOpen(false); }}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="nav-link nav-login" onClick={() => onNavigate('login')}>Sign In</button>
          )}
        </div>
      )}
    </nav>
  );
}

// Add these styles to global.css:
// .nav-username { font-size: 12px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
// .nav-profile-menu { min-width: 200px; }
// .nav-profile-header { padding: 12px 16px 8px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 4px; }
// .nav-profile-name { display: block; color: #F5F2EA; font-weight: 600; font-size: 14px; }
// .nav-profile-email { display: block; color: rgba(245,242,234,0.5); font-size: 12px; margin-top: 2px; }
// .nav-drop-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 4px 8px; }
// .nav-logout { color: #FF6B6B !important; }
// .nav-logout:hover { background: rgba(255,107,107,0.15) !important; }