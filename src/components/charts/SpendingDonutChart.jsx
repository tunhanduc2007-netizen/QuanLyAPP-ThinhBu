import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { formatVND } from '@/domain/finance';

const CATEGORY_COLORS = {
  'ăn uống': '#EF4444',
  'ăn': '#EF4444',
  'mua sắm': '#EC4899',
  'xăng xe': '#F59E0B',
  'đi lại': '#F59E0B',
  'nhà ở': '#8B5CF6',
  'thuê nhà': '#8B5CF6',
  'giải trí': '#3B82F6',
  'sức khỏe': '#06B6D4',
  'học tập': '#10B981',
  'giáo dục': '#10B981',
  'khác': '#64748B'
};

const CATEGORY_ICONS = {
  'ăn uống': '🍜',
  'mua sắm': '🛍️',
  'xăng xe': '⛽',
  'đi lại': '🛵',
  'nhà ở': '🏠',
  'giải trí': '🎮',
  'sức khỏe': '🏥',
  'học tập': '📚',
  'khác': '🏷️'
};

function getCategoryColor(cat) {
  const c = (cat || '').toLowerCase().trim();
  for (const [key, val] of Object.entries(CATEGORY_COLORS)) {
    if (c.includes(key)) return val;
  }
  return '#10B981';
}

function getCategoryIcon(cat) {
  const c = (cat || '').toLowerCase().trim();
  for (const [key, val] of Object.entries(CATEGORY_ICONS)) {
    if (c.includes(key)) return val;
  }
  return '💸';
}

export default function SpendingDonutChart({ onSeedDemo }) {
  const { transactions = [], formatMoney, isPrivacyMode } = useFinance();
  const [activeCategory, setActiveCategory] = useState(null);

  // Filter expenses only
  const expenses = transactions.filter(t => t.type === 'expense' && Number(t.amount) > 0);
  const totalExpense = expenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Group by category
  const categoryMap = {};
  expenses.forEach(t => {
    const cat = t.category || 'Khác';
    categoryMap[cat] = (categoryMap[cat] || 0) + (Number(t.amount) || 0);
  });

  const categories = Object.entries(categoryMap)
    .map(([name, amount]) => ({
      name,
      amount,
      pct: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      color: getCategoryColor(name),
      icon: getCategoryIcon(name)
    }))
    .sort((a, b) => b.amount - a.amount);

  // If empty, show clean interactive placeholder
  if (expenses.length === 0 || totalExpense === 0) {
    return (
      <div
        className="ui-card"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border-color)',
          padding: '20px 16px',
          marginBottom: 16,
          boxShadow: 'var(--shadow-card)',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 800, color: 'var(--text-main)' }}>
            <span>📊</span> Phân Bổ Chi Tiêu (Donut Chart)
          </div>
          <span style={{ fontSize: 11, background: 'var(--bg-card-subtle)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 9999, fontWeight: 700 }}>
            Tháng này
          </span>
        </div>

        {/* Placeholder decorative chart */}
        <div style={{ position: 'relative', width: 140, height: 140, margin: '10px auto' }}>
          <svg width="140" height="140" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="38" fill="none" stroke="var(--border-color)" strokeWidth="12" strokeDasharray="6 4" opacity="0.5" />
            <circle cx="50" cy="50" r="28" fill="var(--bg-card)" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 20 }}>📊</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginTop: 2 }}>0đ</span>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 14px' }}>
          Chưa có chi tiêu nào được ghi nhận trong tháng này.
        </p>

        {onSeedDemo && (
          <button
            type="button"
            onClick={onSeedDemo}
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 12,
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}
          >
            <span>✨</span> Nạp dữ liệu mẫu 1-click để xem biểu đồ
          </button>
        )}
      </div>
    );
  }

  // Calculate SVG donut segments
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const segments = categories.map(cat => {
    const ratio = cat.amount / totalExpense;
    const strokeDasharray = `${ratio * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle * circumference;
    accumulatedAngle += ratio;
    return {
      ...cat,
      strokeDasharray,
      strokeDashoffset
    };
  });

  const highlightedCat = activeCategory
    ? categories.find(c => c.name === activeCategory)
    : categories[0];

  return (
    <div
      className="ui-card"
      style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid var(--border-color)',
        padding: '18px 16px',
        marginBottom: 16,
        boxShadow: 'var(--shadow-card)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>📊</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)', letterSpacing: -0.2 }}>
            Tỷ Trọng Chi Tiêu Tháng
          </span>
        </div>
        <span style={{ fontSize: 11, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '3px 8px', borderRadius: 9999, fontWeight: 800 }}>
          {categories.length} danh mục
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-around', margin: '8px 0 14px' }}>
        {/* SVG Donut Visual */}
        <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
          <svg width="130" height="130" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background ring */}
            <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--bg-card-subtle)" strokeWidth="12" />
            {/* Segments */}
            {segments.map(seg => (
              <circle
                key={seg.name}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={activeCategory === seg.name ? 15 : 12}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  filter: activeCategory === seg.name ? `drop-shadow(0 0 6px ${seg.color})` : 'none'
                }}
                onMouseEnter={() => setActiveCategory(seg.name)}
                onClick={() => setActiveCategory(activeCategory === seg.name ? null : seg.name)}
              />
            ))}
          </svg>

          {/* Center Info Hole */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {activeCategory ? highlightedCat?.name : 'Tổng chi'}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 900, color: activeCategory ? highlightedCat?.color : 'var(--text-main)', marginTop: 1 }}>
              {activeCategory
                ? `${highlightedCat?.pct}%`
                : (formatMoney ? formatMoney(totalExpense) : formatVND(totalExpense))}
            </span>
          </div>
        </div>

        {/* Top 3 Breakdown List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {categories.slice(0, 4).map(c => {
            const isHovered = activeCategory === c.name;
            return (
              <div
                key={c.name}
                onClick={() => setActiveCategory(isHovered ? null : c.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 8px',
                  borderRadius: 10,
                  background: isHovered ? 'var(--bg-card-subtle)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.icon} {c.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: c.color }}>
                    {c.pct}%
                  </span>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                    ({formatMoney ? formatMoney(c.amount) : formatVND(c.amount)})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
