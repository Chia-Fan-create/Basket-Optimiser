import React, { useState, useEffect } from 'react';
import { SearchSvg, CheckSvg, PlusSvg, TrendSvg } from '../components/Icons';
import { PRODUCT_CATALOG, MOCK_COMPARISONS } from '../data/mockData';

export default function ComparePage({ selectedIds, onNavigate, isLoggedIn, onLogin }) {
  const [show, setShow] = useState(false);
  const [active, setActive] = useState('all');
  const [search, setSearch] = useState('');
  const [added, setAdded] = useState({});
  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  const handleAdd = (pid) => {
    if (!isLoggedIn) { onLogin(); return; }
    setAdded(p => ({ ...p, [pid]: true }));
    setTimeout(() => setAdded(p => ({ ...p, [pid]: false })), 2000);
  };

  const filtered = selectedIds.filter(pid => {
    if (!search) return true;
    return PRODUCT_CATALOG.find(x => x.id === pid)?.name.toLowerCase().includes(search.toLowerCase());
  });

  const cur = active === 'all' ? null : (MOCK_COMPARISONS[active] || []);
  const curP = PRODUCT_CATALOG.find(p => p.id === active);

  return (
    <div className="page compare-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <h2 className="page-title">Price Comparison</h2>
      <p className="page-sub">Top options by normalized unit price across retailers</p>
      <div className="search-row"><div className="search-box"><SearchSvg /><input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>
      <div className="tabs-wrap"><div className="tabs">
        <button className={`tab ${active === 'all' ? 'active' : ''}`} onClick={() => setActive('all')}><span className="tab-icon">📊</span><span className="tab-label">All</span></button>
        {filtered.map(pid => { const p = PRODUCT_CATALOG.find(x => x.id === pid); return (
          <button key={pid} className={`tab ${active === pid ? 'active' : ''}`} onClick={() => setActive(pid)}><span className="tab-icon">{p.icon}</span><span className="tab-label">{p.name}</span></button>
        ); })}
      </div></div>

      <div className="compare-content" key={active}>
        {active === 'all' ? (
          <div className="all-summary">
            <h3 className="sec-title">Best Deals Overview</h3>
            <p className="page-sub" style={{ marginBottom: 16 }}>Based on {selectedIds.length} favorites</p>
            <div className="all-list">
              {selectedIds.map(pid => {
                const p = PRODUCT_CATALOG.find(x => x.id === pid);
                const best = (MOCK_COMPARISONS[pid] || [])[0];
                if (!best) return null;
                return (
                  <div className="all-row" key={pid} onClick={() => setActive(pid)}>
                    <span className="all-icon">{p.icon}</span>
                    <span className="all-name">{p.name}</span>
                    <span className="all-store" style={{ color: best.storeColor }}>{best.store}</span>
                    <span className="all-price">${best.unitPrice < 1 ? best.unitPrice.toFixed(3) : best.unitPrice.toFixed(2)} <small>{best.unit}</small></span>
                    <button className="add-sm" onClick={e => { e.stopPropagation(); handleAdd(pid); }}>{added[pid] ? <CheckSvg /> : <PlusSvg />}</button>
                    <svg className="all-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="single-compare">
            <div className="single-head"><span className="single-ic">{curP?.icon}</span><div><h3 className="single-name">{curP?.name}</h3><p className="single-cat">{curP?.category} — Top options by unit price</p></div></div>
            <div className="comp-list">
              {cur?.map((item, i) => (
                <div className={`comp-row ${i === 0 ? 'best' : ''}`} key={i} style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="comp-rank">{i === 0 ? <span style={{ fontSize: 20 }}>👑</span> : <span className="rank-num">#{item.rank}</span>}</div>
                  <div className="comp-info">
                    <div className="comp-pname">{item.product}</div>
                    <div className="comp-meta"><span className="comp-store" style={{ color: item.storeColor }}><span className="comp-dot" style={{ background: item.storeColor }} />{item.store}</span><span className="comp-pack">{item.originalPack}</span></div>
                  </div>
                  <div className="comp-prices">
                    <div className="comp-up" style={{ color: i === 0 ? 'var(--green)' : 'var(--brown)' }}>${item.unitPrice < 1 ? item.unitPrice.toFixed(3) : item.unitPrice.toFixed(2)}<small>{item.unit}</small></div>
                    <div className="comp-tp">${item.totalPrice.toFixed(2)} total</div>
                  </div>
                  <button className="add-btn" onClick={() => handleAdd(active)}>{added[active] ? '✓ Added' : '+ List'}</button>
                  {i === 0 && <div className="best-label">BEST VALUE</div>}
                </div>
              ))}
            </div>
            <button className="trend-link" onClick={() => onNavigate('trends')}><TrendSvg /> View price trend for {curP?.name}</button>
          </div>
        )}
      </div>
    </div>
  );
}
