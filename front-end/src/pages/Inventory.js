import React, { useState, useEffect } from 'react';
import { PlusSvg } from '../components/Icons';
import { getInventory, dismissInventoryItem, deleteInventoryItem, addInventoryItem } from '../api';

// Normalize backend field names to what the UI expects
// backend: inventory_id, days_left, quantity (string "2 gal"), product_name
// mock:    id, daysLeft, qty, product
function normalizeItem(item) {
  return {
    ...item,
    id:          item.inventory_id ?? item.id,
    product:     item.product_name ?? item.product,
    qty:         item.quantity      ?? item.qty,
    daysLeft:    item.days_left     ?? item.daysLeft ?? 0,
    totalDays:   item.consumption_days ?? item.totalDays ?? 30,
    purchaseDate: item.purchase_date  ?? item.purchaseDate ?? '',
    status:      item.status,
  };
}

export default function InventoryPage({ onNavigate }) {
  const [show, setShow] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ product_id: '', product_name: '', qty: '', consumptionDays: '' });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addStep, setAddStep] = useState('pick'); // 'pick' | 'form'
  const [products, setProducts] = useState([]);

  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  useEffect(() => {
    // Load inventory and product list in parallel
    Promise.all([
      getInventory(),
      import('../api').then(api => api.getProducts()),
    ])
      .then(([invData, productData]) => {
        setInventory(invData.map(normalizeItem));
        setProducts(productData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = (id) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, status: 'ok' } : i));
    dismissInventoryItem(id).catch(err => {
      setInventory(prev => prev.map(i => i.id === id ? { ...i, status: 'low' } : i));
      setError(err.message);
    });
  };

  const handleDeleteInventory = (id, productName) => {
    if (!window.confirm(`Permanently delete "${productName}" from inventory?`)) return;
    setInventory(prev => prev.filter(i => i.id !== id));
    deleteInventoryItem(id).catch(err => {
      setError(err.message);
      getInventory().then(data => setInventory(data.map(normalizeItem))).catch(() => {});
    });
  };

  const handleAddItem = () => {
    if (!addForm.product_id || !addForm.qty || !addForm.consumptionDays) return;
    setAddSubmitting(true);
    addInventoryItem({
      product_id: parseInt(addForm.product_id),
      quantity: parseFloat(addForm.qty),
      consumption_days: parseInt(addForm.consumptionDays),
    })
      .then(() => getInventory())
      .then(data => setInventory(data.map(normalizeItem)))
      .catch(err => setError(err.message))
      .finally(() => {
        setAddSubmitting(false);
        setAddOpen(false);
        setAddForm({ product_id: '', qty: '', consumptionDays: '' });
      });
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  const low = inventory.filter(i => i.status === 'low');
  const ok  = inventory.filter(i => i.status === 'ok');

  return (
    <div className="page inv-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <h2 className="page-title">Household Inventory</h2>
      <p className="page-sub">Track what's at home and get reminded when running low</p>

      {low.length > 0 && (
        <div className="inv-section">
          <h3 className="inv-sec-title warning">⚠️ Running Low</h3>
          {low.map(item => (
            <div key={item.id} className="inv-row low">
              <span className="inv-icon">{item.icon ?? '📦'}</span>
              <div className="inv-info">
                <span className="inv-name">{item.product}</span>
                <span className="inv-detail">{item.qty} remaining · Bought {item.purchaseDate}</span>
              </div>
              <div className="inv-status">
                <div className="inv-bar">
                  <div className="inv-fill low" style={{ width: `${Math.min((item.daysLeft / item.totalDays) * 100, 100)}%` }} />
                </div>
                <span className="inv-days low">{item.daysLeft} day{item.daysLeft !== 1 ? 's' : ''} left</span>
              </div>
              <button className="btn-sm" onClick={() => onNavigate('lists')}>+ Add to List</button>
              <button className="btn-dismiss" onClick={() => handleDismiss(item.id)}>Dismiss</button>
              <button className="btn-dismiss" onClick={() => handleDeleteInventory(item.id, item.product)} style={{ color: '#c0392b' }}>Delete</button>
            </div>
          ))}
        </div>
      )}

      <div className="inv-section">
        <h3 className="inv-sec-title">📦 In Stock</h3>
        {ok.map(item => (
          <div key={item.id} className="inv-row">
            <span className="inv-icon">{item.icon ?? '📦'}</span>
            <div className="inv-info">
              <span className="inv-name">{item.product}</span>
              <span className="inv-detail">{item.qty} remaining · Bought {item.purchaseDate}</span>
            </div>
            <div className="inv-status">
              <div className="inv-bar">
                <div className="inv-fill ok" style={{ width: `${Math.min((item.daysLeft / item.totalDays) * 100, 100)}%` }} />
              </div>
              <span className="inv-days">{item.daysLeft} days left</span>
            </div>
            <button className="btn-dismiss" onClick={() => handleDeleteInventory(item.id, item.product)} style={{ color: '#c0392b' }}>Delete</button>
          </div>
        ))}
        {ok.length === 0 && low.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '16px 0' }}>No items yet.</p>
        )}
      </div>

      <button className="add-item-btn" onClick={() => { setAddOpen(true); setAddStep('pick'); setAddSearch(''); }}><PlusSvg /> Add item to inventory</button>

      {addOpen && (
        <div className="ocr-modal">
          <div className="ocr-card">
            <div className="ocr-head">
              <h3>{addStep === 'pick' ? 'Add Inventory Item' : addForm.product_name}</h3>
              <button className="ocr-close" onClick={() => setAddOpen(false)}>✕</button>
            </div>

            {addStep === 'pick' && (
              <div style={{ padding: '12px 24px 24px' }}>
                <input
                  autoFocus
                  placeholder="Search products..."
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  style={{ width: '100%', marginBottom: 12, padding: '10px 14px', border: '1px solid var(--sand)', borderRadius: 10, fontSize: 14, fontFamily: 'Outfit, sans-serif', boxSizing: 'border-box' }}
                />
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {products
                    .filter(p => !addSearch || p.name.toLowerCase().includes(addSearch.toLowerCase()))
                    .map(p => (
                      <div
                        key={p.id ?? p.product_id}
                        onClick={() => {
                          const pid = p.id ?? p.product_id;
                          const defaultDays = p.default_consumption_days_per_unit || '';
                          setAddForm({ product_id: pid, product_name: p.name, qty: '1', consumptionDays: String(defaultDays) });
                          setAddStep('form');
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', cursor: 'pointer', borderBottom: '1px solid #f0ede4', borderRadius: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9f7f0'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: 'var(--brown-deep)', flex: 1 }}>{p.name}</span>
                        {p.default_consumption_days_per_unit && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.default_consumption_days_per_unit}d/unit</span>
                        )}
                        <svg style={{ opacity: 0.3 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {addStep === 'form' && (
              <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <button
                  onClick={() => setAddStep('pick')}
                  style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: 13, fontFamily: 'Outfit, sans-serif', padding: 0, textAlign: 'left' }}
                >← Change product</button>
                <div className="fg">
                  <label className="fl">Quantity</label>
                  <input className="fi" type="number" min="1" placeholder="e.g. 2" value={addForm.qty} onChange={e => setAddForm(p => ({ ...p, qty: e.target.value }))} />
                </div>
                <div className="fg">
                  <label className="fl">Days per unit until empty</label>
                  <input className="fi" type="number" min="1" placeholder="e.g. 7 for a week" value={addForm.consumptionDays} onChange={e => setAddForm(p => ({ ...p, consumptionDays: e.target.value }))} />
                  {addForm.consumptionDays && addForm.qty && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Total: ~{parseInt(addForm.consumptionDays) * parseInt(addForm.qty) || 0} days until empty
                    </span>
                  )}
                </div>
                <button
                  className="btn-primary"
                  style={{ width: '100%', marginTop: 4 }}
                  disabled={addSubmitting || !addForm.qty || !addForm.consumptionDays}
                  onClick={handleAddItem}
                >
                  {addSubmitting ? 'Adding...' : 'Add to Inventory'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}