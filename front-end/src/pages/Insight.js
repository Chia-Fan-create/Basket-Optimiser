import React, { useState, useEffect } from 'react';
import { getMonthlySpending, getCategorySpending, getInsightSummary, getPurchaseHistory } from '../api';

// Backend doesn't return a color field for categories — assign a fixed palette
const CATEGORY_COLORS = [
  '#4A7169', '#735231', '#BEB59C', '#FF9900', '#0071DC',
  '#CC0000', '#49271B', '#6B8F71', '#A0522D', '#708090',
];

export default function InsightPage() {
  const [show, setShow] = useState(false);
  const [monthlySpending, setMonthlySpending] = useState([]);
  const [categorySpending, setCategorySpending] = useState([]);
  const [summary, setSummary] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [expandedPurchase, setExpandedPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  useEffect(() => {
    Promise.all([getMonthlySpending(), getCategorySpending(), getInsightSummary(), getPurchaseHistory()])
      .then(([monthly, categories, summaryData, purchaseData]) => {
        setMonthlySpending(monthly);
        setCategorySpending(categories.map((c, i) => ({
          ...c,
          color: c.color ?? CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        })));
        setSummary(summaryData);
        setPurchases(purchaseData || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  const maxM = Math.max(...monthlySpending.map(m => m.amount), 1);
  const totalCat = categorySpending.reduce((a, b) => a + b.amount, 0) || 1;

  return (
    <div className="page insight-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <h2 className="page-title">Insight</h2>
      <p className="page-sub">Track your grocery spending patterns over time</p>

      <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-label">6-Month Total</span>
          <span className="kpi-val">${summary?.total_6_months ?? '—'}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Monthly Average</span>
          <span className="kpi-val">${summary?.monthly_average?.toFixed(0) ?? '—'}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">This Month</span>
          <span className="kpi-val" style={{ color: 'var(--green)' }}>${summary?.current_month ?? '—'}</span>
          {summary?.change_vs_last_month != null && (
            <span className="kpi-sub" style={{ color: summary.change_vs_last_month <= 0 ? 'var(--green)' : 'var(--brown)', fontWeight: 600 }}>
              {summary.change_vs_last_month <= 0 ? '↓' : '↑'} {Math.abs(summary.change_vs_last_month)}% vs last month
            </span>
          )}
        </div>
      </div>

      <div className="an-card">
        <h3 className="an-title">Monthly Spending</h3>
        <div className="bar-chart">
          {monthlySpending.map((m, i) => (
            <div key={i} className="bar-col" style={{ animationDelay: `${i * 80}ms` }}>
              <span className="bar-amt">${m.amount}</span>
              <div className="bar-track"><div className="bar-fill" style={{ height: `${(m.amount / maxM) * 100}%` }} /></div>
              <span className="bar-lbl">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="an-card">
        <h3 className="an-title">Spending by Category</h3>
        <div className="cat-break">
          <div className="cat-visual">
            <svg viewBox="0 0 120 120" className="pie">
              {(() => {
                let cum = 0;
                return categorySpending.map((c, i) => {
                  const pct = c.amount / totalCat;
                  const sa = cum * 2 * Math.PI - Math.PI / 2; cum += pct;
                  const ea = cum * 2 * Math.PI - Math.PI / 2; const la = pct > 0.5 ? 1 : 0;
                  const x1 = 60 + 50 * Math.cos(sa), y1 = 60 + 50 * Math.sin(sa);
                  const x2 = 60 + 50 * Math.cos(ea), y2 = 60 + 50 * Math.sin(ea);
                  return <path key={i} d={`M60,60 L${x1},${y1} A50,50 0 ${la},1 ${x2},${y2} Z`} fill={c.color} opacity="0.85" />;
                });
              })()}
            </svg>
          </div>
          <div className="cat-list">
            {categorySpending.map((c, i) => (
              <div key={i} className="cat-row">
                <span className="cat-dot" style={{ background: c.color }} />
                <span className="cat-name">{c.category}</span>
                <span className="cat-amt">${c.amount}</span>
                <span className="cat-pct">{c.percentage?.toFixed(0) ?? ((c.amount / totalCat) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="an-card">
        <h3 className="an-title">💡 Insights</h3>
        <div className="insights-list">
          {summary?.insights?.length > 0 ? summary.insights.map((ins, i) => (
            <div key={i} className="insight-item">
              <span className={`ins-badge ${ins.type === 'decrease' ? 'down' : ins.type === 'savings' ? 'up' : 'neutral'}`}>
                {ins.type === 'decrease' ? `↓ ${Math.abs(ins.value)}%`
                  : ins.type === 'increase' ? `↑ ${ins.value}%`
                  : ins.type === 'savings' ? `↑ $${ins.value}`
                  : `${ins.value}%`}
              </span>
              <span>{ins.message}</span>
            </div>
          )) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No insights yet — keep shopping to build up data!</p>
          )}
        </div>
      </div>

      <div className="an-card">
        <h3 className="an-title">Purchase History</h3>
        {purchases.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No purchase records yet. Process purchased items from your shopping list to see history here.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {purchases.map((p, i) => (
              <div key={p.purchase_id} style={{ animationDelay: `${i * 60}ms` }}>
                <div
                  onClick={() => setExpandedPurchase(expandedPurchase === p.purchase_id ? null : p.purchase_id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f9f7f0', borderRadius: 10, cursor: 'pointer', border: '1px solid #ebe7db' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--brown-deep)' }}>
                      {new Date(p.purchased_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {p.store && <span style={{ marginRight: 8 }}>{p.store}</span>}
                      {p.item_count} item{p.item_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: 16 }}>${p.total_amount.toFixed(2)}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedPurchase === p.purchase_id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.4 }}><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
                {expandedPurchase === p.purchase_id && p.items && (
                  <div style={{ padding: '8px 16px 12px', borderLeft: '2px solid var(--sand)', marginLeft: 16 }}>
                    {p.items.map((item, j) => (
                      <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: j < p.items.length - 1 ? '1px solid #f0ede4' : 'none', fontSize: 13 }}>
                        <span style={{ color: 'var(--brown-deep)' }}>{item.product_name} <span style={{ color: 'var(--text-muted)' }}>x{item.quantity}</span></span>
                        <span style={{ fontWeight: 600 }}>${item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}