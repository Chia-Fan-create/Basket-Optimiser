import React, { useState, useEffect } from 'react';
import { SearchSvg, TrendSvg } from '../components/Icons';
import { getProducts, getComparison } from '../api';

export default function ComparePage({ selectedIds, onNavigate }) {
  const [show, setShow] = useState(false);
  const [products, setProducts] = useState([]);
  const [comparisonData, setComparisonData] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [error, setError] = useState(null);
  const [active, setActive] = useState('all');
  const [search, setSearch] = useState('');
  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  // Fetch product catalog once on mount
  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(err => setError(err.message))
      .finally(() => setLoadingProducts(false));
  }, []);

  // Fetch comparison data whenever active product changes
  useEffect(() => {
    if (active === 'all') return;
    if (comparisonData[active]) return; // already fetched, don't refetch
    setLoadingComparison(true);
    getComparison(active)
      .then(data => setComparisonData(prev => ({ ...prev, [active]: data })))
      .catch(err => setError(err.message))
      .finally(() => setLoadingComparison(false));
  }, [active]);

  if (loadingProducts) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  const filtered = selectedIds.filter(pid => {
    if (!search) return true;
    return products.find(x => x.id === pid)?.name.toLowerCase().includes(search.toLowerCase());
  });

  const cur = active === 'all' ? null : (comparisonData[active] || []);
  const curP = products.find(p => p.id === active);

  return (
    <div className="page compare-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <h2 className="page-title">Price Comparison</h2>
      <p className="page-sub">Top options by normalized unit price across retailers</p>
      <div className="search-row"><div className="search-box"><SearchSvg /><input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>
      <div className="tabs-wrap"><div className="tabs">
        <button className={`tab ${active === 'all' ? 'active' : ''}`} onClick={() => setActive('all')}><span className="tab-icon">📊</span><span className="tab-label">All</span></button>
        {filtered.map(pid => { const p = products.find(x => x.id === pid); return (
          <button key={pid} className={`tab ${active === pid ? 'active' : ''}`} onClick={() => setActive(pid)}><span className="tab-icon">{p?.icon}</span><span className="tab-label">{p?.name}</span></button>
        ); })}
      </div></div>

      <div className="compare-content" key={active}>
        {active === 'all' ? (
          <div className="all-summary">
            <h3 className="sec-title">Best Deals Overview</h3>
            <p className="page-sub" style={{ marginBottom: 16 }}>Based on {selectedIds.length} favorites</p>
            <div className="all-list">
              {selectedIds.map(pid => {
                const p = products.find(x => x.id === pid);
                const best = (comparisonData[pid] || [])[0];
                if (!best) return (
                  <div className="all-row" key={pid} onClick={() => setActive(pid)}>
                    <span className="all-icon">{p?.icon}</span>
                    <span className="all-name">{p?.name}</span>
                    <span className="all-store" style={{ color: 'var(--text-muted)' }}>Tap to load</span>
                    <svg className="all-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                );
                return (
                  <div className="all-row" key={pid} onClick={() => setActive(pid)}>
                    <span className="all-icon">{p?.icon}</span>
                    <span className="all-name">{p?.name}</span>
                    <span className="all-store" style={{ color: best.storeColor }}>{best.store}</span>
                    <span className="all-price">${best.unitPrice < 1 ? best.unitPrice.toFixed(3) : best.unitPrice.toFixed(2)} <small>{best.unit}</small></span>
                    <svg className="all-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="single-compare">
            <div className="single-head"><span className="single-ic">{curP?.icon}</span><div><h3 className="single-name">{curP?.name}</h3><p className="single-cat">{curP?.category} — Top options by unit price</p></div></div>
            {loadingComparison ? (
              <div className="loading">Loading prices...</div>
            ) : (
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
                    {i === 0 && <div className="best-label">BEST VALUE</div>}
                  </div>
                ))}
              </div>
            )}
            <button className="trend-link" onClick={() => onNavigate('trends')}><TrendSvg /> View price trend for {curP?.name}</button>
          </div>
        )}
      </div>
    </div>
  );
}