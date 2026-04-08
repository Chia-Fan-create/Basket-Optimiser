import React, { useState, useEffect } from 'react';
import { CheckSvg } from '../components/Icons';
import { PRODUCT_CATALOG } from '../data/mockData';

export default function SelectPage({ onNext, selectedIds, setSelectedIds, isEditing }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);
  const toggle = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="page select-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <div className="select-inner">
        <p className="step-label">{isEditing ? 'Edit Favorites' : 'Step 1 of 2'}</p>
        <h2 className="page-title">{isEditing ? 'Update your favorites' : 'What do you usually buy?'}</h2>
        <p className="page-sub">{isEditing ? 'Add or remove items from your favorites.' : 'Pick items to compare. You can always change later.'}</p>
        <div className="product-grid">
          {PRODUCT_CATALOG.map((p, i) => (
            <button key={p.id} className={`product-chip ${selectedIds.includes(p.id) ? 'active' : ''}`} onClick={() => toggle(p.id)} style={{ animationDelay: `${i * 50}ms` }}>
              <span className="chip-icon">{p.icon}</span>
              <span className="chip-label">{p.name}</span>
              {selectedIds.includes(p.id) && <span className="chip-check"><CheckSvg /></span>}
            </button>
          ))}
        </div>
        <div className="select-actions">
          <span className="select-count">{selectedIds.length} selected</span>
          <button className="btn-primary" disabled={selectedIds.length === 0} onClick={onNext}>
            {isEditing ? 'Save & Back →' : 'See My Dashboard →'}
          </button>
        </div>
      </div>
    </div>
  );
}
