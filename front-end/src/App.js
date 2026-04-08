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

  const handleLogin = () => {
    setIsLoggedIn(true);
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

  return (
    <div className={`app-shell ${transitioning ? 'fading' : ''}`}>
      <Nav
        page={page}
        isLoggedIn={isLoggedIn}
        onNavigate={navigate}
        onLogoClick={handleLogoClick}
      />

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
