import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getProducts, getTrends } from '../api';

// Normalize backend format { month, retailers: { Amazon: 3.42 }, predicted }
// into the shape the chart expects: { month, amazon, target, walmart, predicted }
function normalizeTrendData(raw) {
  return raw.map(d => {
    const retailers = d.retailers || {};
    return {
      month: d.month,
      amazon:  retailers['Amazon']  ?? retailers['amazon']  ?? null,
      target:  retailers['Target']  ?? retailers['target']  ?? null,
      walmart: retailers['Walmart'] ?? retailers['walmart'] ?? null,
      predicted: d.predicted ?? null,
    };
  });
}

export default function TrendsPage({ selectedIds }) {
  const [show, setShow] = useState(false);
  const [active, setActive] = useState(selectedIds[0] || null);
  const [products, setProducts] = useState([]);
  const [trendCache, setTrendCache] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(err => setError(err.message))
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    if (!active) return;
    if (trendCache[active]) return;
    setLoadingTrend(true);
    getTrends(active)
      .then(raw => {
        const normalized = normalizeTrendData(raw);
        setTrendCache(prev => ({ ...prev, [active]: normalized }));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoadingTrend(false));
  }, [active]);

  const trendData = trendCache[active] || [];
  const product = products.find(p => (p.id ?? p.product_id) === active);

  const allPrices = trendData.flatMap(d => [d.amazon, d.target, d.walmart].filter(Boolean));
  const lowestPrice = allPrices.length ? Math.min(...allPrices) : 0;
  const avgPrice = allPrices.length ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;

  const latestData = trendData.filter(d => d.amazon || d.target || d.walmart).slice(-1)[0];
  const storeEntries = latestData
    ? [['Amazon', latestData.amazon, '#FF9900'], ['Target', latestData.target, '#CC0000'], ['Walmart', latestData.walmart, '#0071DC']].filter(([, v]) => v != null)
    : [];
  const bestStoreEntry = storeEntries.sort((a, b) => a[1] - b[1])[0];
  const bestStore = bestStoreEntry?.[0] || '—';
  const bestStoreColor = bestStoreEntry?.[2] || 'var(--text)';
  const unitLabel = product?.unit || 'per unit';

  const drawChart = useCallback(() => {
    const c = canvasRef.current; if (!c || !trendData.length) return;
    const ctx = c.getContext('2d'); const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect(); c.width = r.width * dpr; c.height = r.height * dpr;
    ctx.scale(dpr, dpr); const W = r.width, H = r.height; ctx.clearRect(0, 0, W, H);
    const pad = { top: 24, right: 24, bottom: 44, left: 52 };
    const cW = W - pad.left - pad.right, cH = H - pad.top - pad.bottom;
    const vals = trendData.flatMap(d => [d.amazon, d.target, d.walmart, d.predicted].filter(Boolean));
    if (!vals.length) return;
    const mn = Math.min(...vals) * 0.88, mx = Math.max(...vals) * 1.12;
    const xS = (i) => pad.left + (i / (trendData.length - 1)) * cW;
    const yS = (v) => pad.top + cH - ((v - mn) / (mx - mn)) * cH;

    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (cH / 4) * i; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y);
      ctx.strokeStyle = 'rgba(74,113,105,0.06)'; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke();
      const v = mx - (i / 4) * (mx - mn); ctx.fillStyle = 'rgba(139,125,107,0.5)'; ctx.font = '11px Outfit'; ctx.textAlign = 'right'; ctx.fillText(`$${v.toFixed(2)}`, pad.left - 12, y + 4);
    }
    trendData.forEach((d, i) => { ctx.fillStyle = 'rgba(139,125,107,0.6)'; ctx.font = '12px Outfit'; ctx.textAlign = 'center'; ctx.fillText(d.month, xS(i), H - pad.bottom + 22); });

    const drawL = (key, color, lw = 1.8, dash = false) => {
      const pts = []; trendData.forEach((d, i) => { if (d[key] != null) pts.push({ x: xS(i), y: yS(d[key]), val: d[key], month: d.month }); });
      if (pts.length < 2) return; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (dash) ctx.setLineDash([8, 5]); else ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) { const cp = (pts[i - 1].x + pts[i].x) / 2; ctx.bezierCurveTo(cp, pts[i - 1].y, cp, pts[i].y, pts[i].x, pts[i].y); }
      ctx.stroke(); ctx.setLineDash([]);
      pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); });
      if (!c._pts) c._pts = {}; c._pts[key] = pts;
    };
    c._pts = {};
    drawL('walmart', '#0071DC'); drawL('target', '#CC0000'); drawL('amazon', '#FF9900'); drawL('predicted', '#BEB59C', 1.5, true);
  }, [trendData]);

  useEffect(() => { drawChart(); }, [drawChart]);

  const sLabel = { amazon: 'Amazon', target: 'Target', walmart: 'Walmart', predicted: 'Predicted' };
  const sColor = { amazon: '#FF9900', target: '#CC0000', walmart: '#0071DC', predicted: '#BEB59C' };

  const onMove = (e) => {
    const c = canvasRef.current; if (!c || !c._pts) return;
    const r = c.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top;
    let cl = null, md = 30, ck = null;
    Object.entries(c._pts).forEach(([k, pts]) => { pts.forEach(p => { const d = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2); if (d < md) { md = d; cl = p; ck = k; } }); });
    cl ? setTooltip({ x: cl.x, y: cl.y, val: cl.val, month: cl.month, key: ck }) : setTooltip(null);
  };

  if (loadingProducts) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page trends-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <h2 className="page-title">Price Trends</h2>
      <p className="page-sub">Historical prices & predicted best time to buy</p>
      <div className="tabs-wrap"><div className="tabs">
        {selectedIds.map(pid => { const p = products.find(x => (x.id ?? x.product_id) === pid); return (
          <button key={pid} className={`tab ${active === pid ? 'active' : ''}`} onClick={() => setActive(pid)}>
            <span className="tab-icon">{p?.icon}</span><span className="tab-label">{p?.name}</span>
          </button>
        ); })}
      </div></div>
      <div className="trend-dash">
        <div className="t-kpis">
          <div className="t-kpi"><span className="kl">Lowest Price</span><span className="kv">{lowestPrice ? `$${lowestPrice < 1 ? lowestPrice.toFixed(3) : lowestPrice.toFixed(2)}` : '—'}</span><span className="ks">{unitLabel}</span></div>
          <div className="t-kpi"><span className="kl">Average</span><span className="kv">{avgPrice ? `$${avgPrice < 1 ? avgPrice.toFixed(3) : avgPrice.toFixed(2)}` : '—'}</span><span className="ks">{unitLabel}</span></div>
          <div className="t-kpi"><span className="kl">Best Retailer</span><span className="kv kstore" style={{ color: bestStoreColor }}>{bestStore}</span><span className="ks">currently cheapest</span></div>
        </div>
        <div className="t-chart-area">
          <div className="t-chart-top">
            <span className="t-prod">{product?.icon} {product?.name}</span>
            <div className="t-legend">{['amazon', 'target', 'walmart', 'predicted'].map(k => (
              <span key={k} className="lg-item"><span className={`lg-dot ${k === 'predicted' ? 'dashed' : ''}`} style={{ background: sColor[k] }} />{sLabel[k]}</span>
            ))}</div>
          </div>
          <div className="t-chart-wrap">
            {loadingTrend ? (
              <div className="loading">Loading trend data...</div>
            ) : (
              <>
                <canvas ref={canvasRef} className="t-canvas" onMouseMove={onMove} onMouseLeave={() => setTooltip(null)} />
                {tooltip && <div className="chart-tt" style={{ left: tooltip.x, top: tooltip.y - 48 }}>
                  <span style={{ color: sColor[tooltip.key], fontWeight: 700 }}>{sLabel[tooltip.key]}</span>
                  <span style={{ fontWeight: 700 }}>${tooltip.val < 1 ? tooltip.val.toFixed(3) : tooltip.val.toFixed(2)}</span>
                  <span style={{ opacity: 0.6 }}>{tooltip.month}</span>
                </div>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}