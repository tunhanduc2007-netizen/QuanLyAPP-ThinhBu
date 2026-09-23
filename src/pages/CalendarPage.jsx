import React, { useState, useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { formatVND } from '@/domain/finance';

export default function CalendarPage() {
  const { transactions, setIsAddTxOpen, setAddTxType, setSelectedDate } = useFinance();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Change Month
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Group transactions by date
  const txsByDate = useMemo(() => {
    const map = {};
    transactions.forEach(tx => {
      const d = tx.isoDate || (tx.createdAt ? tx.createdAt.split('T')[0] : '');
      if (!d) return;
      if (!map[d]) {
        map[d] = { income: 0, expense: 0, list: [] };
      }
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') map[d].income += amt;
      else if (tx.type === 'expense') map[d].expense += amt;
      map[d].list.push(tx);
    });
    return map;
  }, [transactions]);

  // Calendar days grid
  const daysGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells = [];
    // Leading blanks
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(null);
    }
    // Days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [year, month]);

  const selectedDayData = txsByDate[selectedDayStr] || { income: 0, expense: 0, list: [] };
  const netDay = selectedDayData.income - selectedDayData.expense;

  return (
    <div className="app-screen active" style={{ display: 'block', opacity: 1, transform: 'none' }}>
      {/* Screen Title */}
      <div className="screen-header-bar">
        <div className="screen-header-title">Lịch Tài Chính</div>
      </div>

      {/* Month Navigator */}
      <div className="ui-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', marginBottom: 12 }}>
        <button
          onClick={handlePrevMonth}
          type="button"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)', padding: 4 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>
          Tháng {month + 1}, {year}
        </span>

        <button
          onClick={handleNextMonth}
          type="button"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)', padding: 4 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Calendar Grid Table */}
      <div className="ui-card" style={{ padding: 12, marginBottom: 14 }}>
        {/* Days of week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: 8 }}>
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((wd, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
              {wd}
            </span>
          ))}
        </div>

        {/* Days cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {daysGrid.map((c, idx) => {
            if (!c) {
              return <div key={`blank-${idx}`} style={{ height: 42 }}></div>;
            }
            const isSelected = selectedDayStr === c.dateStr;
            const dayTxs = txsByDate[c.dateStr];
            const hasIncome = dayTxs && dayTxs.income > 0;
            const hasExpense = dayTxs && dayTxs.expense > 0;

            return (
              <div
                key={c.dateStr}
                onClick={() => setSelectedDayStr(c.dateStr)}
                style={{
                  height: 42,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  cursor: 'pointer',
                  position: 'relative',
                  background: isSelected ? 'var(--primary-green)' : 'transparent',
                  color: isSelected ? '#FFFFFF' : 'var(--text-main)',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: 13,
                  transition: 'all 0.15s'
                }}
              >
                <span>{c.day}</span>
                {/* Dots */}
                <div style={{ display: 'flex', gap: 2, position: 'absolute', bottom: 4 }}>
                  {hasIncome && (
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#fff' : 'var(--primary-green)' }}></div>
                  )}
                  {hasExpense && (
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#fff' : 'var(--accent-red)' }}></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Stats & Transactions */}
      <div className="day-detail-card" style={{ marginBottom: 14 }}>
        <div className="day-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Chi tiết ngày {selectedDayStr}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedDayData.list.length} giao dịch</span>
        </div>

        {/* 3-Cols Day Stats */}
        <div className="day-stats-3col">
          <div>
            <div className="day-stat-val" style={{ color: 'var(--primary-green)' }}>+{formatVND(selectedDayData.income)}</div>
            <div className="day-stat-lbl">Tổng thu</div>
          </div>
          <div>
            <div className="day-stat-val" style={{ color: 'var(--accent-red)' }}>-{formatVND(selectedDayData.expense)}</div>
            <div className="day-stat-lbl">Tổng chi</div>
          </div>
          <div>
            <div className="day-stat-val" style={{ color: netDay >= 0 ? 'var(--primary-green)' : 'var(--accent-red)' }}>
              {netDay >= 0 ? '+' : ''}{formatVND(netDay)}
            </div>
            <div className="day-stat-lbl">Chênh lệch</div>
          </div>
        </div>

        {/* Day Actions */}
        <div className="day-actions-row">
          <button
            className="btn-cal-add-income"
            onClick={() => {
              setSelectedDate(selectedDayStr);
              setAddTxType('income');
              setIsAddTxOpen(true);
            }}
            type="button"
          >
            + Thu nhập ngày này
          </button>
          <button
            className="btn-cal-add-expense"
            onClick={() => {
              setSelectedDate(selectedDayStr);
              setAddTxType('expense');
              setIsAddTxOpen(true);
            }}
            type="button"
          >
            - Chi tiêu ngày này
          </button>
        </div>

        {/* Day Transactions List or Empty State */}
        {selectedDayData.list.length > 0 ? (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selectedDayData.list.map(tx => (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 12px',
                  background: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                    {tx.category || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {tx.time ? `${tx.time} • ` : ''}{tx.account || 'Tiền mặt'}{tx.note ? ` • ${tx.note}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: tx.type === 'income' ? 'var(--primary-green)' : 'var(--accent-red)' }}>
                  {tx.type === 'income' ? '+' : '-'}{formatVND(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 14, padding: '16px 12px', textAlign: 'center', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: 12.5 }}>
            Chưa có giao dịch trong ngày này. Nhấn nút bên trên để thêm giao dịch.
          </div>
        )}
      </div>
    </div>
  );
}
