import React, { useState, useEffect } from 'react';
import { PlusSvg, CheckSvg, CameraSvg, ArrowR } from '../components/Icons';
import { MOCK_LISTS, STORE_COLORS } from '../data/mockData';

export default function ShoppingListsPage({ onNavigate }) {
  const [show, setShow] = useState(false);
  const [activeList, setActiveList] = useState(0);
  const [purchased, setPurchased] = useState({});
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrStep, setOcrStep] = useState(0);
  const [ocrChecked, setOcrChecked] = useState({ 0: true, 1: true, 2: true });
  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  const list = MOCK_LISTS[activeList];
  const storeTotals = {};
  list.items.forEach(item => {
    ['Walmart', 'Target', 'Amazon'].forEach(store => {
      const mk = store === 'Walmart' ? 1 : store === 'Target' ? 1.1 : 1.25;
      storeTotals[store] = (storeTotals[store] || 0) + item.bestPrice * item.qty * mk;
    });
  });
  const cheapest = Object.entries(storeTotals).sort((a, b) => a[1] - b[1])[0];
  const expensive = Object.entries(storeTotals).sort((a, b) => b[1] - a[1])[0];
  const savings = (expensive[1] - cheapest[1]).toFixed(2);
  const togglePurchased = (i) => setPurchased(p => ({ ...p, [`${activeList}-${i}`]: !p[`${activeList}-${i}`] }));

  const ocrResults = [
    { product: 'Whole Milk 1 Gal', price: 3.42, qty: 2, matched: true },
    { product: 'Chicken Breast 2.6lb', price: 8.37, qty: 1, matched: true },
    { product: 'Organic Bananas', price: 1.29, qty: 1, matched: false },
  ];

  return (
    <div className="page lists-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <h2 className="page-title">Shopping Lists</h2>
      <p className="page-sub">Build lists and find the cheapest store for everything</p>

      <div className="list-tabs">
        {MOCK_LISTS.map((l, i) => <button key={l.id} className={`ltab2 ${activeList === i ? 'active' : ''}`} onClick={() => setActiveList(i)}>{l.name}</button>)}
        <button className="ltab2 add-ltab"><PlusSvg /> New List</button>
      </div>

      <div className="store-banner">
        <div className="sb-best"><span className="sb-label">Cheapest Store</span><span className="sb-store" style={{ color: STORE_COLORS[cheapest[0]] }}>{cheapest[0]}</span><span className="sb-price">${cheapest[1].toFixed(2)}</span></div>
        <div className="sb-savings"><span className="sb-save">Save ${savings}</span><span className="sb-vs">vs. {expensive[0]}</span></div>
        <div className="sb-all">
          {Object.entries(storeTotals).sort((a, b) => a[1] - b[1]).map(([s, t]) => (
            <div key={s} className="sb-row"><span className="sb-dot" style={{ background: STORE_COLORS[s] }} /><span className="sb-name">{s}</span><span className="sb-total">${t.toFixed(2)}</span></div>
          ))}
        </div>
      </div>

      <div className="list-card">
        <div className="list-card-head"><h3>{list.name}</h3><span className="list-cnt">{list.items.length} items</span></div>
        {list.items.map((item, i) => {
          const isPurch = purchased[`${activeList}-${i}`] || item.purchased;
          return (
            <div key={i} className={`li-row ${isPurch ? 'done' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
              <button className={`li-check ${isPurch ? 'checked' : ''}`} onClick={() => togglePurchased(i)}>{isPurch && <CheckSvg />}</button>
              <span className="li-icon">{item.icon}</span>
              <div className="li-info"><span className="li-name">{item.product}</span><span className="li-detail">Qty: {item.qty} · {item.unit}</span></div>
              <div className="li-price"><span className="li-bp">${(item.bestPrice * item.qty).toFixed(2)}</span><span className="li-bs" style={{ color: STORE_COLORS[item.bestStore] }}>{item.bestStore}</span></div>
            </div>
          );
        })}
        <button className="add-item-btn"><PlusSvg /> Add item from Compare</button>
      </div>

      {/* Receipt OCR */}
      <div className="ocr-section">
        <button className="ocr-trigger" onClick={() => { setOcrOpen(true); setOcrStep(0); setOcrChecked({ 0: true, 1: true, 2: true }); }}>
          <CameraSvg />
          <div><strong>Upload Receipt</strong><p>Scan your receipt to mark items as purchased & update inventory</p></div>
          <ArrowR />
        </button>

        {ocrOpen && (
          <div className="ocr-modal">
            <div className="ocr-card">
              <div className="ocr-head"><h3>Receipt Scanner</h3><button className="ocr-close" onClick={() => setOcrOpen(false)}>✕</button></div>

              {ocrStep === 0 && (
                <div className="ocr-upload">
                  <div className="ocr-dropzone"><CameraSvg /><p>Drop receipt image here or tap to upload</p><span>Supports JPG, PNG, PDF</span></div>
                  <button className="btn-primary ocr-go" onClick={() => setOcrStep(1)}>Scan Receipt <ArrowR /></button>
                </div>
              )}

              {ocrStep === 1 && (
                <div className="ocr-confirm">
                  <p className="ocr-confirm-title">Review detected items</p>
                  <p className="ocr-confirm-sub">Check the items you want to import. Edit names, prices, and quantities as needed.</p>
                  <div className="ocr-select-all">
                    <button className="ocr-sel-btn" onClick={() => {
                      const allChecked = Object.values(ocrChecked).every(v => v);
                      const next = {}; ocrResults.forEach((_, i) => { next[i] = !allChecked; }); setOcrChecked(next);
                    }}>{Object.values(ocrChecked).every(v => v) ? 'Deselect All' : 'Select All'}</button>
                    <span className="ocr-sel-count">{Object.values(ocrChecked).filter(Boolean).length} of {ocrResults.length} selected</span>
                  </div>
                  <div className="ocr-results">
                    {ocrResults.map((r, i) => (
                      <div key={i} className={`ocr-row ${r.matched ? '' : 'unmatched'} ${!ocrChecked[i] ? 'unchecked' : ''}`}>
                        <button className={`ocr-check ${ocrChecked[i] ? 'checked' : ''}`} onClick={() => setOcrChecked(p => ({ ...p, [i]: !p[i] }))}>
                          {ocrChecked[i] && <CheckSvg />}
                        </button>
                        <div className="ocr-ri">
                          <div className="ocr-top-row">
                            <input className="ocr-input ocr-name-input" defaultValue={r.product} />
                            {r.matched ? <span className="ocr-match">✓ Matched</span> : <span className="ocr-nomatch">? No match</span>}
                          </div>
                          <div className="ocr-edit-row">
                            <div className="ocr-field"><label className="ocr-field-label">Qty</label><input className="ocr-field-input" type="number" defaultValue={r.qty} /></div>
                            <div className="ocr-field"><label className="ocr-field-label">Price</label><div className="ocr-price-input"><span className="ocr-dollar">$</span><input className="ocr-field-input" type="number" step="0.01" defaultValue={r.price.toFixed(2)} /></div></div>
                            <div className="ocr-field"><label className="ocr-field-label">Unit Price</label><span className="ocr-unit-price">${(r.price / r.qty).toFixed(2)}/ea</span></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="ocr-actions">
                    <button className="btn-secondary" onClick={() => setOcrStep(0)}>← Re-scan</button>
                    <button className="btn-primary" disabled={Object.values(ocrChecked).filter(Boolean).length === 0} onClick={() => setOcrStep(2)}>
                      Confirm & Save ({Object.values(ocrChecked).filter(Boolean).length} items) <CheckSvg />
                    </button>
                  </div>
                </div>
              )}

              {ocrStep === 2 && (
                <div className="ocr-done">
                  <div className="ocr-done-icon">✅</div>
                  <h3>Receipt Processed!</h3>
                  <div className="ocr-done-list">
                    <div className="ocr-done-item"><CheckSvg /> Items marked as purchased</div>
                    <div className="ocr-done-item"><CheckSvg /> Prices saved to history</div>
                    <div className="ocr-done-item"><CheckSvg /> Inventory updated</div>
                    <div className="ocr-done-item"><CheckSvg /> Spending analytics refreshed</div>
                  </div>
                  <button className="btn-primary" onClick={() => setOcrOpen(false)}>Done <ArrowR /></button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
