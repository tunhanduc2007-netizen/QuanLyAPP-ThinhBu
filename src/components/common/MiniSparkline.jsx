import React, { useMemo } from 'react';

/**
 * MiniSparkline (Tremor inspired)
 * Renders a lightweight, responsive 7-day SVG wave chart with optical gradient fill
 * and pulsing endpoint to show weekly cashflow trends.
 */
export default function MiniSparkline({ transactions = [], height = 48 }) {
  const { points, pathD, areaD, lastY, isPositive, trendText } = useMemo(() => {
    const days = 7;
    const today = new Date();
    const dailyTotals = Array(days).fill(0);

    // Group transactions of last 7 days
    transactions.forEach(tx => {
      if (!tx.isoDate) return;
      const [y, m, d] = tx.isoDate.split('-').map(Number);
      const txDate = new Date(y, m - 1, d);
      const diffDays = Math.floor((today - txDate) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < days) {
        const slot = days - 1 - diffDays;
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'income') dailyTotals[slot] += amt;
        else if (tx.type === 'expense') dailyTotals[slot] -= amt;
      }
    });

    const min = Math.min(...dailyTotals);
    const max = Math.max(...dailyTotals);
    const range = (max - min) || 1;

    const width = 240;
    const pad = 8;
    const chartH = height - pad * 2;

    const pts = dailyTotals.map((val, idx) => {
      const x = (idx / (days - 1)) * width;
      const normalized = (val - min) / range;
      const y = pad + chartH - normalized * chartH;
      return { x, y };
    });

    // Generate smooth cubic bezier SVG curve
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const area = `${d} L ${width} ${height} L 0 ${height} Z`;
    const last = pts[pts.length - 1].y;

    const totalIncome7d = transactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalExpense7d = transactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const net7d = totalIncome7d - totalExpense7d;

    return {
      points: pts,
      pathD: d,
      areaD: area,
      lastY: last,
      isPositive: net7d >= 0,
      trendText: net7d >= 0 ? 'Dòng tiền 7 ngày dương' : 'Chi tiêu 7 ngày vượt thu'
    };
  }, [transactions, height]);

  return (
    <div style={{ marginTop: 10, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.92, display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
          {trendText}
        </span>
        <span style={{ fontSize: 10, opacity: 0.75, fontWeight: 600 }}>7 ngày qua</span>
      </div>

      <div style={{ height, width: '100%', position: 'relative', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 240 ${height}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={areaD} fill="url(#sparklineGrad)" />

          {/* Curve Stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pulsing Endpoint */}
          <circle cx="240" cy={lastY} r="4" fill="#FFFFFF" />
          <circle cx="240" cy={lastY} r="7" fill="#FFFFFF" opacity="0.3">
            <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.0;0.4" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
    </div>
  );
}
