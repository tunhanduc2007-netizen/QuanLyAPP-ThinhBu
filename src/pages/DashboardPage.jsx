import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';
import { formatVND } from '@/domain/finance';

export default function DashboardPage() {
  const {
    overview,
    wallets,
    transactions,
    setActiveTab,
    setIsAddTxOpen,
    setAddTxType,
    showToast,
    formatMoney
  } = useFinance();

  const { currentUser } = useAuth();
  const [hasUnreadNotif] = useState(true);

  // Extract balances for only two categories: Tiền mặt and Tài khoản ngân hàng
  const accounts = wallets?.accounts || [];
  const bankAcc = accounts.find(a => a?.name === 'Tài khoản ngân hàng' || a?.name === 'Ngân hàng') || { balance: 0 };
  const cashAcc = accounts.find(a => a?.name === 'Tiền mặt') || { balance: 0 };
  const totalAvailableBalance = (Number(cashAcc.balance) || 0) + (Number(bankAcc.balance) || 0);

  const recentTxs = (transactions || []).slice(0, 5);

  return (
    <div className="app-screen active" style={{ display: 'block', opacity: 1, transform: 'none' }}>
      {/* 1. Header: Avatar + Greeting + Icons */}
      <div className="screen-header-bar" style={{ marginBottom: 18, paddingTop: 4 }}>
        <div
          className="screen-header-left"
          onClick={() => setActiveTab('settings')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
        >
          {/* Circular profile avatar */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 18,
              boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)',
              flexShrink: 0
            }}
          >
            {(currentUser?.name || 'Từ Nhân Đức').charAt(0).toUpperCase()}
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.2 }}>
              Xin chào, 👋
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
              {currentUser?.name || 'Từ Nhân Đức'}
            </div>
          </div>
        </div>

        {/* Right Action Icons: Notification Bell & Account Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="header-icon-btn"
            onClick={() => showToast('Không có thông báo mới', 'info')}
            title="Thông báo"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              cursor: 'pointer',
              color: 'var(--text-main)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
            {hasUnreadNotif && (
              <span
                style={{
                  position: 'absolute',
                  top: 9,
                  right: 9,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#EF4444',
                  border: '1.5px solid #FFFFFF'
                }}
              />
            )}
          </button>

          <button
            type="button"
            className="header-icon-btn"
            onClick={() => setActiveTab('settings')}
            title="Tài khoản"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-main)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Main Balance Hero Card (Green -> Teal -> Blue Gradient) */}
      <div
        className="hero-balance-card"
        style={{
          background: 'linear-gradient(135deg, #059669 0%, #0D9488 45%, #0284C7 100%)',
          color: '#FFFFFF',
          borderRadius: 24,
          padding: '22px 20px',
          boxShadow: '0 14px 30px -8px rgba(13, 148, 136, 0.42)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 16
        }}
      >
        {/* Subtle decorative glow overlay */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none'
          }}
        />

        {/* Card Header: Title + Security Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.95 }}>
            TỔNG TÀI SẢN KHẢ DỤNG
          </span>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 600,
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.22)'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>An toàn & bảo mật</span>
          </div>
        </div>

        {/* Large Amount */}
        <div style={{ fontSize: 36, fontWeight: 800, marginTop: 12, marginBottom: 18, letterSpacing: -0.5 }}>
          {formatMoney ? formatMoney(totalAvailableBalance) : formatVND(totalAvailableBalance)}
        </div>

        {/* Only Two Asset Categories: Tiền mặt & Tài khoản ngân hàng */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.14)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: 16,
            padding: '12px 16px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          {/* Tiền mặt */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="12" x="2" y="6" rx="2"/>
                <circle cx="12" cy="12" r="2"/>
                <path d="M6 12h.01M18 12h.01"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 11.5, opacity: 0.9, fontWeight: 500 }}>Tiền mặt</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 1 }}>
                {formatMoney ? formatMoney(cashAcc.balance || 0) : formatVND(cashAcc.balance || 0)}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 30, background: 'rgba(255, 255, 255, 0.25)', margin: '0 8px' }} />

          {/* Tài khoản ngân hàng */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, paddingLeft: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" x2="21" y1="22" y2="22"/>
                <line x1="6" x2="6" y1="18" y2="11"/>
                <line x1="10" x2="10" y1="18" y2="11"/>
                <line x1="14" x2="14" y1="18" y2="11"/>
                <line x1="18" x2="18" y1="18" y2="11"/>
                <polygon points="12 2 20 7 4 7"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 11.5, opacity: 0.9, fontWeight: 500 }}>Tài khoản ngân hàng</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 1 }}>
                {formatMoney ? formatMoney(bankAcc.balance || 0) : formatVND(bankAcc.balance || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick Actions: Show only TWO buttons (Thu tiền & Chi tiêu) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Thu tiền (Green) */}
        <button
          onClick={() => { setAddTxType('income'); setIsAddTxOpen(true); }}
          type="button"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 20,
            padding: '15px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            textAlign: 'left'
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>Thu tiền</div>
            <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600, marginTop: 1 }}>Thu nhập mới</div>
          </div>
        </button>

        {/* Chi tiêu (Red) */}
        <button
          onClick={() => { setAddTxType('expense'); setIsAddTxOpen(true); }}
          type="button"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 20,
            padding: '15px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            textAlign: 'left'
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: '#FEF2F2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>Chi tiêu</div>
            <div style={{ fontSize: 11.5, color: '#EF4444', fontWeight: 600, marginTop: 1 }}>Khoản chi mới</div>
          </div>
        </button>
      </div>

      {/* 4. Monthly Summary: Two Clean Statistic Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Thu nhập tháng */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 20,
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Thu nhập tháng</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>
            +{formatMoney ? formatMoney(overview.monthlyIncome || 0) : formatVND(overview.monthlyIncome || 0)}
          </div>
        </div>

        {/* Chi tiêu tháng */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 20,
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Chi tiêu tháng</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#EF4444' }}>
            -{formatMoney ? formatMoney(overview.monthlyExpense || 0) : formatVND(overview.monthlyExpense || 0)}
          </div>
        </div>
      </div>

      {/* 5. Trust & Transparency Card (from reference image) */}
      <div
        style={{
          background: '#F0FDF4',
          border: '1px solid #DCFCE7',
          borderRadius: 18,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 18
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.16)',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>An toàn, minh bạch</div>
          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
            Thông tin tài khoản của bạn luôn được bảo mật tuyệt đối.
          </div>
        </div>
      </div>

      {/* 6. Recent Transactions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>Giao dịch gần đây</span>
        <span
          onClick={() => setActiveTab('transactions')}
          style={{ fontSize: 13, fontWeight: 700, color: '#059669', cursor: 'pointer' }}
        >
          Xem tất cả ({transactions.length})
        </span>
      </div>

      {/* Transactions List or Empty State */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {recentTxs.length > 0 ? (
          recentTxs.map(tx => {
            const isIncome = tx.type === 'income';
            return (
              <div
                key={tx.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 18,
                  padding: '13px 15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: isIncome ? '#ECFDF5' : '#FEF2F2',
                      color: isIncome ? '#059669' : '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 16,
                      flexShrink: 0
                    }}
                  >
                    {isIncome ? '+' : '−'}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                      {tx.category || (isIncome ? 'Thu nhập' : 'Chi tiêu')}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                      {tx.time ? `${tx.time} • ` : ''}{tx.isoDate}{tx.note ? ` • ${tx.note}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: isIncome ? '#059669' : '#EF4444'
                    }}
                  >
                    {isIncome ? '+' : '−'}{formatMoney ? formatMoney(tx.amount) : formatVND(tx.amount)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {tx.account || 'Tiền mặt'}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1.5px dashed var(--border-color)',
              borderRadius: 20,
              padding: '30px 20px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-card-subtle)', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5, maxWidth: 280, margin: '0 auto' }}>
              Chưa có giao dịch nào. Nhấn nút + để thêm giao dịch đầu tiên.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
