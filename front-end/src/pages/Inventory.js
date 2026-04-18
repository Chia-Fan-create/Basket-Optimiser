import React, { useState, useEffect } from 'react';
import { PlusSvg } from '../components/Icons';
import { getInventory, dismissInventoryItem, addInventoryItem } from '../api';

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
  const [addForm, setAddForm] = useState({ product_id: '', qty: '', consumptionDays: '' });
  const [addSubmitting, setAddSubmitting] = useState(false);
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
          </div>
        ))}
        {ok.length === 0 && low.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '16px 0' }}>No items yet.</p>
        )}
      </div>

      <button className="add-item-btn" onClick={() => setAddOpen(true)}><PlusSvg /> Add item to inventory</button>

      {addOpen && (
        <div className="ocr-modal">
          <div className="ocr-card">
            <div className="ocr-head">
              <h3>Add Inventory Item</h3>
              <button className="ocr-close" onClick={() => setAddOpen(false)}>✕</button>
            </div>
            <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fg">
                <label className="fl">Product</label>
                <select className="fi" value={addForm.product_id} onChange={e => setAddForm(p => ({ ...p, product_id: e.target.value }))}>
                  <option value="">Select product...</option>
                  {products.map(p => (
                    <option key={p.id ?? p.product_id} value={p.id ?? p.product_id}>{p.icon} {p.name}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="fl">Quantity</label>
                <input className="fi" type="number" placeholder="e.g. 2" value={addForm.qty} onChange={e => setAddForm(p => ({ ...p, qty: e.target.value }))} />
              </div>
              <div className="fg">
                <label className="fl">Days Until Empty</label>
                <input className="fi" type="number" placeholder="e.g. 7 for a week" value={addForm.consumptionDays} onChange={e => setAddForm(p => ({ ...p, consumptionDays: e.target.value }))} />
              </div>
              <button
                className="btn-primary"
                style={{ width: '100%', marginTop: 4 }}
                disabled={addSubmitting || !addForm.product_id || !addForm.qty || !addForm.consumptionDays}
                onClick={handleAddItem}
              >
                {addSubmitting ? 'Adding...' : 'Add to Inventory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}