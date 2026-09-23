import React, { useState, useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { formatVND } from '@/domain/finance';

export default function RankingPage() {
  const { transactions, data, friends, setActiveTab } = useFinance();
  const [metric, setMetric] = useState('total_income'); // 'total_income' | 'savings'
  const [period, setPeriod] = useState('this_month'); // 'this_week' | 'this_month' | 'this_year'
  const [scope, setScope] = useState('friends'); // 'friends' | 'all'

  const userName = data?.user?.name || 'Từ Nhân Đức';
  const friendsList = friends?.list || [];

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
      const currentDay = now.getDay();
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
      return Math.max(0, incomeSum - expenseSum);
    }
  }, [transactions, metric, period]);

  // Construct Leaderboard based on Scope
  const leaderboard = useMemo(() => {
    if (scope === 'friends') {
      // 1. Friends Leaderboard: user + real added friends
      const userItem = {
        id: 'me',
        name: userName,
        amount: userScore,
        isCurrentUser: true,
        tag: '@ban'
      };

      const friendItems = friendsList.map(f => {
        return {
          id: f.id || f.uid,
          name: f.name || 'Bạn bè',
          amount: Number(f.score) || 0,
          isCurrentUser: false,
          tag: f.tag || `@${(f.uid || f.id || '').slice(0, 8)}`
        };
      });

      const combined = [userItem, ...friendItems];
      // Sort descending by score
      combined.sort((a, b) => b.amount - a.amount);

      return combined.map((item, idx) => ({
        ...item,
        rank: idx + 1
      }));
    } else {
      // 2. Global / Personal: shows current user rank
      if (!transactions || transactions.length === 0 || userScore === 0) {
        return [];
      }
      return [
        {
          id: 'me',
          rank: 1,
          name: userName,
          amount: userScore,
          isCurrentUser: true,
          tag: '@ban'
        }
      ];
    }
  }, [scope, transactions, userScore, userName, friendsList, metric, period]);

  const topUser = leaderboard[0];
  const currentUserRank = leaderboard.find(item => item.isCurrentUser)?.rank || 1;

  return (
    <div className="app-screen active" style={{ display: 'block', opacity: 1, transform: 'none', paddingBottom: 90 }}>
      <div style={{ maxWidth: 580, margin: '0 auto', width: '100%' }}>
        {/* Header Bar with Friends Link */}
        <div className="screen-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 className="screen-header-title" style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
              Bảng Xếp Hạng
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Thi đua thành tích tài chính & tiết kiệm
            </p>
          </div>

          {/* Quick Connect / Add Friends Button */}
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--primary-green-light)',
              color: 'var(--primary-green)',
              border: '1.5px solid var(--primary-green)',
              borderRadius: 'var(--radius-pill)',
              padding: '7px 14px',
              fontSize: 12.5,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            <span>Kết bạn ({friendsList.length})</span>
          </button>
        </div>

        {/* Scope Selector: Friends vs Global */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--bg-card-subtle, #F1F5F9)', padding: 4, borderRadius: 12, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setScope('friends')}
            style={{
              padding: '8px 0',
              borderRadius: 10,
              border: 'none',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              background: scope === 'friends' ? 'var(--primary-green)' : 'transparent',
              color: scope === 'friends' ? '#FFFFFF' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            Đua top bạn bè ({friendsList.length})
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            style={{
              padding: '8px 0',
              borderRadius: 10,
              border: 'none',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              background: scope === 'all' ? 'var(--primary-green)' : 'transparent',
              color: scope === 'all' ? '#FFFFFF' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            Cá nhân & Toàn sàn
          </button>
        </div>

        {/* Metric Selector: Income vs Savings */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--bg-card-subtle, #F1F5F9)', padding: 4, borderRadius: 'var(--radius-pill)', marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setMetric('total_income')}
            style={{
              padding: '8px 0',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              fontWeight: 800,
              fontSize: 12.5,
              cursor: 'pointer',
              background: metric === 'total_income' ? 'var(--bg-card)' : 'transparent',
              color: metric === 'total_income' ? 'var(--text-main)' : 'var(--text-muted)',
              boxShadow: metric === 'total_income' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            Tổng thu nhập
          </button>
          <button
            type="button"
            onClick={() => setMetric('savings')}
            style={{
              padding: '8px 0',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              fontWeight: 800,
              fontSize: 12.5,
              cursor: 'pointer',
              background: metric === 'savings' ? 'var(--bg-card)' : 'transparent',
              color: metric === 'savings' ? 'var(--text-main)' : 'var(--text-muted)',
              boxShadow: metric === 'savings' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            Tiết kiệm ròng
          </button>
        </div>

        {/* Period Selector: Week / Month / Year */}
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
                boxShadow: period === p.id ? '0 2px 6px rgba(0,0,0,0.04)' : 'none'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* If in Friends mode and 0 friends added: Show Inviting Call-To-Action Card */}
        {scope === 'friends' && friendsList.length === 0 && (
          <div
            className="ui-card"
            style={{
              textAlign: 'center',
              padding: '24px 18px',
              borderRadius: 18,
              background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-card) 100%)',
              border: '1.5px dashed var(--primary-green)',
              marginBottom: 18
            }}
          >
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary-green-light)', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
              Chưa có bạn bè để so tài thứ hạng!
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 320, margin: '0 auto 14px auto' }}>
              Hãy kết bạn qua mã ID (@user), quét mã QR hoặc danh bạ để cùng nhau đua top xếp hạng tài chính mỗi ngày!
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('friends')}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: 'auto',
                padding: '10px 22px',
                fontSize: 13,
                fontWeight: 700,
                margin: '0 auto'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Vào Mục Kết Bạn Ngay</span>
            </button>
          </div>
        )}

        {/* Podium for #1 Rank */}
        {topUser && topUser.amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <div
              className="ui-card"
              style={{
                width: '100%',
                maxWidth: 280,
                padding: '20px 16px',
                margin: 0,
                textAlign: 'center',
                borderTop: '4px solid #F59E0B',
                background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, var(--bg-card) 100%)',
                boxShadow: '0 6px 18px rgba(245, 158, 11, 0.15)',
                borderRadius: 18,
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ fontSize: 32 }}>👑</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                {topUser.name} {topUser.isCurrentUser && '(Bạn)'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Quán quân {metric === 'total_income' ? 'Doanh thu' : 'Tiết kiệm'} ({period === 'this_week' ? 'Tuần này' : period === 'this_month' ? 'Tháng này' : 'Năm nay'})
              </div>
              <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--primary-green)', marginTop: 8 }}>
                {formatVND(topUser.amount)}
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard List */}
        {leaderboard.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {leaderboard.map(item => (
              <div
                key={item.id || item.rank}
                className="ui-card"
                style={{
                  padding: '13px 16px',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 14,
                  border: item.isCurrentUser ? '1.5px solid var(--primary-green)' : '1px solid var(--border-color)',
                  background: item.isCurrentUser ? 'var(--primary-green-light)' : 'var(--bg-card)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Rank Badge */}
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: item.rank === 1 ? '#FEF3C7' : item.rank === 2 ? '#F1F5F9' : item.rank === 3 ? '#FFEDD5' : 'var(--bg-card-subtle)',
                      color: item.rank === 1 ? '#D97706' : item.rank === 2 ? '#64748B' : item.rank === 3 ? '#C2410C' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 900
                    }}
                  >
                    {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                  </span>

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{item.name}</span>
                      {item.isCurrentUser && (
                        <span style={{ fontSize: 10, background: 'var(--primary-green)', color: '#FFF', borderRadius: 6, padding: '1px 6px', fontWeight: 700 }}>
                          Tôi
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.tag}</div>
                  </div>
                </div>

                <div style={{ fontSize: 14, fontWeight: 800, color: item.isCurrentUser ? 'var(--primary-green)' : 'var(--text-main)' }}>
                  {formatVND(item.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State when no transactions */
          <div
            className="ui-card"
            style={{
              textAlign: 'center',
              padding: '36px 20px',
              borderRadius: 20,
              border: '1.5px dashed var(--border-color)',
              background: 'var(--bg-card)'
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
              Chưa có dữ liệu giao dịch
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 280, margin: '0 auto' }}>
              Hãy thêm giao dịch thu chi mới để bắt đầu tích lũy thành tích thi đua trên bảng xếp hạng.
            </p>
          </div>
        )}

        {/* Footer Quick Action: Connect More Friends */}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--primary-green)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            <span>Tìm kiếm và thêm bạn bè mới</span>
          </button>
        </div>
      </div>
    </div>
  );
}
