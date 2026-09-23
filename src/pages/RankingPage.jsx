import React, { useState, useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { formatVND } from '@/domain/finance';

export default function RankingPage() {
  const { transactions, data } = useFinance();
  const [metric, setMetric] = useState('total_income'); // 'total_income' | 'savings'
  const [period, setPeriod] = useState('this_month'); // 'this_week' | 'this_month' | 'this_year'

  const userName = data?.user?.name || 'Từ Nhân Đức';

  // Helper to check if a date falls in the selected period
  const isDateInPeriod = (isoDate, prd) => {
    if (!isoDate) return false;
    const now = new Date();
    const [y, m, d] = isoDate.split('-').map(Number);
    const txDate = new Date(y, m - 1, d);

    if (prd === 'this_year') {
      return y === now.getFullYear();
    }
    if (prd === 'this_month') {
      return y === now.getFullYear() && (m - 1) === now.getMonth();
    }
    if (prd === 'this_week') {
      // Monday of current week
      const currentDay = now.getDay(); // 0 is Sunday
      const distToMon = (currentDay + 6) % 7;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - distToMon);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return txDate >= startOfWeek && txDate <= endOfWeek;
    }
    return true;
  };

  // Compute real score for the current user based on transactions
  const userScore = useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;

    (transactions || []).forEach(tx => {
      const date = tx.isoDate || (tx.createdAt ? tx.createdAt.split('T')[0] : '');
      if (isDateInPeriod(date, period)) {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'income') incomeSum += amt;
        else if (tx.type === 'expense') expenseSum += amt;
      }
    });

    if (metric === 'total_income') {
      return incomeSum;
    } else {
      // Net savings
      return Math.max(0, incomeSum - expenseSum);
    }
  }, [transactions, metric, period]);

  // Construct real leaderboard without any fake users
  const leaderboard = useMemo(() => {
    if (!transactions || transactions.length === 0 || userScore === 0) {
      return [];
    }

    return [
      {
        rank: 1,
        name: userName,
        amount: userScore,
        isCurrentUser: true
      }
    ];
  }, [transactions, userScore, userName]);

  return (
    <div className="app-screen active" style={{ display: 'block', opacity: 1, transform: 'none' }}>
      <div className="screen-header-bar">
        <div className="screen-header-title">Bảng Xếp Hạng</div>
      </div>

      {/* Metric Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--bg-card-subtle)', padding: 4, borderRadius: 'var(--radius-pill)', marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setMetric('total_income')}
          style={{
            padding: '9px 0',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            background: metric === 'total_income' ? 'var(--primary-green)' : 'transparent',
            color: metric === 'total_income' ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s'
          }}
        >
          Tổng thu nhập
        </button>
        <button
          type="button"
          onClick={() => setMetric('savings')}
          style={{
            padding: '9px 0',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            background: metric === 'savings' ? 'var(--primary-green)' : 'transparent',
            color: metric === 'savings' ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s'
          }}
        >
          Tiết kiệm ròng
        </button>
      </div>

      {/* Period Selector */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
        {[
          { id: 'this_week', label: 'Tuần này' },
          { id: 'this_month', label: 'Tháng này' },
          { id: 'this_year', label: 'Năm nay' }
        ].map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            style={{
              background: period === p.id ? 'var(--bg-card)' : 'transparent',
              border: period === p.id ? '1px solid var(--border-color)' : 'none',
              borderRadius: 'var(--radius-pill)',
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: period === p.id ? 800 : 600,
              color: period === p.id ? 'var(--text-main)' : 'var(--text-muted)',
              cursor: 'pointer',
              boxShadow: period === p.id ? '0 2px 6px rgba(0,0,0,0.03)' : 'none'
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {leaderboard.length > 0 ? (
        <>
          {/* Top Podium for Real User */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div
              className="ui-card"
              style={{
                width: '100%',
                maxWidth: 240,
                padding: '20px 14px',
                margin: 0,
                textAlign: 'center',
                borderTop: '4px solid #F59E0B',
                background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, var(--bg-card) 100%)',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.12)'
              }}
            >
              <div style={{ fontSize: 32 }}>👑</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', marginTop: 6 }}>
                {leaderboard[0].name}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                {metric === 'total_income' ? 'Tổng thu nhập' : 'Tiết kiệm ròng'} ({period === 'this_week' ? 'Tuần này' : period === 'this_month' ? 'Tháng này' : 'Năm nay'})
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary-green)', marginTop: 8 }}>
                {formatVND(leaderboard[0].amount)}
              </div>
            </div>
          </div>

          {/* Rankings List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {leaderboard.map(item => (
              <div
                key={item.rank}
                className="ui-card"
                style={{
                  padding: '13px 16px',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1.5px solid var(--primary-green)',
                  background: 'var(--primary-green-light)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#F59E0B', width: 20, textAlign: 'center' }}>
                    {item.rank}
                  </span>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>
                      {item.name} (Bạn)
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary-green)' }}>
                  {formatVND(item.amount)}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Empty State */
        <div
          className="ui-card"
          style={{
            textAlign: 'center',
            padding: '36px 20px',
            borderRadius: 20,
            border: '1.5px dashed var(--border-color)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--bg-card-subtle)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto'
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16"/>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
            Chưa có dữ liệu xếp hạng
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 280, margin: '0 auto' }}>
            Thực hiện giao dịch thu nhập hoặc chi tiêu để bắt đầu ghi nhận thành tích thực tế của bạn.
          </div>
        </div>
      )}
    </div>
  );
}
