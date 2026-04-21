import React, { useState, useEffect } from 'react';
import { CheckSvg } from '../components/Icons';
import { getProducts, updateFavorites } from '../api';

export default function SelectPage({ onNext, selectedIds, setSelectedIds, isEditing, isLoggedIn }) {
  const [show, setShow] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page select-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <div className="select-inner">
        <p className="step-label">{isEditing ? 'Edit Favorites' : 'Step 1 of 2'}</p>
        <h2 className="page-title">{isEditing ? 'Update your favorites' : 'What do you usually buy?'}</h2>
        <p className="page-sub">{isEditing ? 'Add or remove items from your favorites.' : 'Pick items to compare. You can always change later.'}</p>
        <div className="product-grid">
          {products.map((p, i) => (
            <button key={p.id} className={`product-chip ${selectedIds.includes(p.id) ? 'active' : ''}`} onClick={() => toggle(p.id)} style={{ animationDelay: `${i * 50}ms` }}>
              <span className="chip-icon">{p.icon}</span>
              <span className="chip-label">{p.name}</span>
              {selectedIds.includes(p.id) && <span className="chip-check"><CheckSvg /></span>}
            </button>
          ))}
        </div>
        <div className="select-actions">
          <span className="select-count">{selectedIds.length} selected</span>
          <button className="btn-primary" disabled={selectedIds.length === 0} onClick={() => {
            if (isLoggedIn) updateFavorites(selectedIds).catch(() => {});
            onNext();
          }}>
            {isEditing ? 'Save & Back →' : 'See My Dashboard →'}
          </button>
        </div>
      </div>
    </div>
  );
}