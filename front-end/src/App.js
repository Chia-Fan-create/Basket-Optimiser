// ============================================================
// SmartCart — Main App
// Manages navigation, auth state, and favorites
// ============================================================
import React, { useState, useCallback } from 'react';
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

export default function App() {
  const [page, setPage] = useState('landing');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const navigate = useCallback((to) => {
    setTransitioning(true);
    setTimeout(() => {
      setPage(to);
      setTransitioning(false);
      setIsEditing(false);
      window.scrollTo?.({ top: 0 });
    }, 250);
  }, []);

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

      {page === 'landing' && <LandingPage onNext={() => navigate('select')} />}
      {page === 'select' && <SelectPage selectedIds={selectedIds} setSelectedIds={setSelectedIds} onNext={() => navigate('dashboard')} isEditing={isEditing} />}
      {page === 'login' && <LoginPage onLogin={handleLogin} onBack={() => navigate('dashboard')} />}
      {page === 'dashboard' && <DashboardPage selectedIds={selectedIds} isLoggedIn={isLoggedIn} onNavigate={navigate} onEditFavorites={handleEditFavorites} onLogin={() => navigate('login')} />}
      {page === 'compare' && <ComparePage selectedIds={selectedIds} onNavigate={navigate} isLoggedIn={isLoggedIn} onLogin={() => navigate('login')} />}
      {page === 'trends' && <TrendsPage selectedIds={selectedIds} />}
      {page === 'lists' && <ShoppingListsPage onNavigate={navigate} />}
      {page === 'inventory' && <InventoryPage onNavigate={navigate} />}
      {page === 'alerts' && <AlertsPage />}
      {page === 'insight' && <InsightPage />}
    </div>
  );
}