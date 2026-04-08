import React, { useState, useEffect } from 'react';
import { PlusSvg } from '../components/Icons';
import { MOCK_INVENTORY } from '../data/mockData';

export default function InventoryPage({ onNavigate }) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState({});
  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  const low = MOCK_INVENTORY.filter(i => i.status === 'low' && !dismissed[i.id]);
  const ok = MOCK_INVENTORY.filter(i => i.status === 'ok' || dismissed[i.id]);

  return (
    <div className="page inv-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <h2 className="page-title">Household Inventory</h2>
      <p className="page-sub">Track what's at home and get reminded when running low</p>

      {low.length > 0 && (
        <div className="inv-section">
          <h3 className="inv-sec-title warning">⚠️ Running Low</h3>
          {low.map(item => (
            <div key={item.id} className="inv-row low">
              <span className="inv-icon">{item.icon}</span>
              <div className="inv-info"><span className="inv-name">{item.product}</span><span className="inv-detail">{item.qty} remaining · Bought {item.purchaseDate}</span></div>
              <div className="inv-status">
                <div className="inv-bar"><div className="inv-fill low" style={{ width: `${(item.daysLeft / item.totalDays) * 100}%` }} /></div>
                <span className="inv-days low">{item.daysLeft} day{item.daysLeft !== 1 ? 's' : ''} left</span>
              </div>
              <button className="btn-sm" onClick={() => onNavigate('lists')}>+ Add to List</button>
              <button className="btn-dismiss" onClick={() => setDismissed(p => ({ ...p, [item.id]: true }))}>Dismiss</button>
            </div>
          ))}
        </div>
      )}

      <div className="inv-section">
        <h3 className="inv-sec-title">📦 In Stock</h3>
        {ok.map(item => (
          <div key={item.id} className="inv-row">
            <span className="inv-icon">{item.icon}</span>
            <div className="inv-info"><span className="inv-name">{item.product}</span><span className="inv-detail">{item.qty} remaining · Bought {item.purchaseDate}</span></div>
            <div className="inv-status">
              <div className="inv-bar"><div className="inv-fill ok" style={{ width: `${(item.daysLeft / item.totalDays) * 100}%` }} /></div>
              <span className="inv-days">{item.daysLeft} days left</span>
            </div>
          </div>
        ))}
      </div>

      <button className="add-item-btn"><PlusSvg /> Add item to inventory</button>
    </div>
  );
}
