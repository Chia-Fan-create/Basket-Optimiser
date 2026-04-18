// ============================================================
// SmartCart — Main App
// Manages navigation, auth state, and favorites
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { getMe, setOnAuthExpired } from './api';
import Nav from './components/Nav';
import LandingPage from './pages/Landing';
import SelectPage from './pages/Select';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import ComparePage from './pages/Compare';
import TrendsPage from './pages/Trends';
import ShoppingListsPage from './pages/ShoppingLists';
import InventoryPage from './pages/Inventory';
import AlertsPage from './pages/Alerts';
import InsightPage from './pages/Insight';

// Map old page names to URL paths
const PAGE_TO_PATH = {
  landing: '/', select: '/select', login: '/login', dashboard: '/dashboard',
  compare: '/compare', trends: '/trends', lists: '/lists',
  inventory: '/inventory', alerts: '/alerts', insight: '/insight',
};

// Reverse: URL path to page name (for Nav active state)
const PATH_TO_PAGE = Object.fromEntries(
  Object.entries(PAGE_TO_PATH).map(([k, v]) => [v, k])
);

export default function App() {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const page = PATH_TO_PAGE[location.pathname] || 'landing';

  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Restore session from localStorage token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    getMe()
      .then(user => { setIsLoggedIn(true); setCurrentUser(user); })
      .catch(() => { localStorage.removeItem('token'); });
  }, []);

  // Handle token expiry — API layer calls this on 401
  useEffect(() => {
    setOnAuthExpired(() => { setIsLoggedIn(false); setCurrentUser(null); });
  }, []);

  const navigate = useCallback((to) => {
    setTransitioning(true);
    setTimeout(() => {
      routerNavigate(PAGE_TO_PATH[to] || '/');
      setTransitioning(false);
      setIsEditing(false);
      window.scrollTo?.({ top: 0 });
    }, 250);
  }, [routerNavigate]);

  const handleLogin = (user) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
    navigate('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setCurrentUser(null);
    navigate('dashboard');
  };

  const handleEditFavorites = () => {
    setIsEditing(true);
    navigate('select');
  };

  const handleLogoClick = () => {
    if (isLoggedIn || selectedIds.length > 0) navigate('dashboard');
    else navigate('landing');
  };

  // ── DEV ONLY: quick login bypass ──────────────────────────
  // Remove this block before production
  const devLogin = () => handleLogin({ user_id: 1, email: 'demo@smartcart.com', display_name: 'Demo User' });
  // ──────────────────────────────────────────────────────────

  return (
    <div className={`app-shell ${transitioning ? 'fading' : ''}`}>
      <Nav
        page={page}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        onNavigate={navigate}
        onLogoClick={handleLogoClick}
        onLogout={handleLogout}
      />

      {/* DEV ONLY: quick login button — remove before production */}
      {!isLoggedIn && page !== 'landing' && page !== 'login' && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
          <button onClick={devLogin} style={{
            padding: '10px 18px', background: '#4A7169', color: 'white',
            border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
          }}>
            🔑 Dev Login
          </button>
        </div>
      )}

      <Routes>
        <Route path="/" element={<LandingPage onNext={() => navigate('select')} />} />
        <Route path="/select" element={<SelectPage selectedIds={selectedIds} setSelectedIds={setSelectedIds} onNext={() => navigate('dashboard')} isEditing={isEditing} />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} onBack={() => navigate('dashboard')} />} />
        <Route path="/dashboard" element={<DashboardPage selectedIds={selectedIds} isLoggedIn={isLoggedIn} onNavigate={navigate} onEditFavorites={handleEditFavorites} onLogin={() => navigate('login')} />} />
        <Route path="/compare" element={<ComparePage selectedIds={selectedIds} onNavigate={navigate} isLoggedIn={isLoggedIn} onLogin={() => navigate('login')} />} />
        <Route path="/trends" element={<TrendsPage selectedIds={selectedIds} />} />
        <Route path="/lists" element={<ShoppingListsPage onNavigate={navigate} />} />
        <Route path="/inventory" element={<InventoryPage onNavigate={navigate} />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/insight" element={<InsightPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
