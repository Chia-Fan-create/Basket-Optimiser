import React, { useState, useEffect } from 'react';
import { MOCK_MONTHLY_SPENDING, MOCK_CATEGORY_SPENDING } from '../data/mockData';

export default function InsightPage() {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  const total = MOCK_MONTHLY_SPENDING.reduce((a, b) => a + b.amount, 0);
  const avg = total / MOCK_MONTHLY_SPENDING.length;
  const maxM = Math.max(...MOCK_MONTHLY_SPENDING.map(m => m.amount));
  const totalCat = MOCK_CATEGORY_SPENDING.reduce((a, b) => a + b.amount, 0);

  return (
    <div className="page insight-page" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(30px)' }}>
      <h2 className="page-title">Insight</h2>
      <p className="page-sub">Track your grocery spending patterns over time</p>

      <div className="kpi-row">
        <div className="kpi-card"><span className="kpi-label">6-Month Total</span><span className="kpi-val">${total}</span></div>
        <div className="kpi-card"><span className="kpi-label">Monthly Average</span><span className="kpi-val">${avg.toFixed(0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">This Month</span><span className="kpi-val" style={{ color: 'var(--green)' }}>${MOCK_MONTHLY_SPENDING[MOCK_MONTHLY_SPENDING.length - 1].amount}</span><span className="kpi-sub" style={{ color: 'var(--green)', fontWeight: 600 }}>↓ 15% vs last month</span></div>
      </div>

      <div className="an-card">
        <h3 className="an-title">Monthly Spending</h3>
        <div className="bar-chart">
          {MOCK_MONTHLY_SPENDING.map((m, i) => (
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
              {(() => { let cum = 0; return MOCK_CATEGORY_SPENDING.map((c, i) => {
                const pct = c.amount / totalCat; const sa = cum * 2 * Math.PI - Math.PI / 2; cum += pct;
                const ea = cum * 2 * Math.PI - Math.PI / 2; const la = pct > 0.5 ? 1 : 0;
                const x1 = 60 + 50 * Math.cos(sa), y1 = 60 + 50 * Math.sin(sa);
                const x2 = 60 + 50 * Math.cos(ea), y2 = 60 + 50 * Math.sin(ea);
                return <path key={i} d={`M60,60 L${x1},${y1} A50,50 0 ${la},1 ${x2},${y2} Z`} fill={c.color} opacity="0.85" />;
              }); })()}
            </svg>
          </div>
          <div className="cat-list">
            {MOCK_CATEGORY_SPENDING.map((c, i) => (
              <div key={i} className="cat-row"><span className="cat-dot" style={{ background: c.color }} /><span className="cat-name">{c.category}</span><span className="cat-amt">${c.amount}</span><span className="cat-pct">{((c.amount / totalCat) * 100).toFixed(0)}%</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="an-card">
        <h3 className="an-title">💡 Insights</h3>
        <div className="insights-list">
          <div className="insight-item"><span className="ins-badge down">↓ 15%</span><span>Your spending decreased this month — nice work!</span></div>
          <div className="insight-item"><span className="ins-badge neutral">34%</span><span>Dairy is your largest spending category at $68/month</span></div>
          <div className="insight-item"><span className="ins-badge up">↑ $8</span><span>You could save ~$8/month by switching Meat purchases to Walmart</span></div>
        </div>
      </div>
    </div>
  );
}
