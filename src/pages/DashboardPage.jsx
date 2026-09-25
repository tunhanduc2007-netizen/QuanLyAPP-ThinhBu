import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';
import { formatVND } from '@/domain/finance';
import SpendingDonutChart from '@/components/charts/SpendingDonutChart';
import NumberTicker from '@/components/common/NumberTicker';
import MiniSparkline from '@/components/common/MiniSparkline';

export default function DashboardPage() {
  const {
    overview,
    wallets,
    transactions,
    setActiveTab,
    setIsAddTxOpen,
    setAddTxType,
    showToast,
    formatMoney,
    friends,
    isPrivacyMode,
    togglePrivacyMode,
    seedDemoData,
    resetAllDataClean
  } = useFinance();

  const { currentUser } = useAuth();
  const [hasUnreadNotif] = useState(true);

  // Extract balances for only two categories: Tiền mặt and Tài khoản ngân hàng
  const accounts = wallets?.accounts || [];
  const bankAcc = accounts.find(a => a?.name === 'Tài khoản ngân hàng' || a?.name === 'Ngân hàng') || { balance: 0 };
  const cashAcc = accounts.find(a => a?.name === 'Tiền mặt') || { balance: 0 };
  const cashBal = Number(cashAcc.balance) || 0;
  const bankBal = Number(bankAcc.balance) || 0;
  const totalAvailableBalance = cashBal + bankBal;
  const cashPct = totalAvailableBalance > 0 ? Math.round((cashBal / totalAvailableBalance) * 100) : 50;
  const bankPct = totalAvailableBalance > 0 ? (100 - cashPct) : 50;

  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const monthlyIncome = (transactions || [])
    .filter(t => t.type === 'income' && (!t.isoDate || t.isoDate.startsWith(currentMonthPrefix)))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const monthlyExpense = (transactions || [])
    .filter(t => t.type === 'expense' && (!t.isoDate || t.isoDate.startsWith(currentMonthPrefix)))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

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
              flexShrink: 0,
              overflow: 'hidden'
            }}
          >
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (currentUser?.name || 'Từ Nhân Đức').charAt(0).toUpperCase()
            )}
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

        {/* Right Action Icons: Notification Bell, Friends & Account Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Friends Shortcut Button */}
          <button
            type="button"
            className="header-icon-btn"
            onClick={() => setActiveTab('friends')}
            title="Bạn bè & Đua top"
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {(friends?.list?.length || 0) > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  background: 'var(--primary-green)',
                  color: '#FFFFFF',
                  fontSize: 9.5,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px'
                }}
              >
                {friends.list.length}
              </span>
            )}
          </button>

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
      {/* 2. Hero Balance Card (Liquid Glass + Magic UI NumberTicker + Tremor MiniSparkline) */}
      <div
        className="liquid-glass-hero"
        onClick={() => setActiveTab('wallets')}
      >
        {/* Card Header: Title + Privacy Mode Eye Button + Wallets Shortcut Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.95 }}>
              TỔNG TÀI SẢN KHẢ DỤNG
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePrivacyMode();
              }}
              title={isPrivacyMode ? 'Hiện số tiền' : 'Ẩn số tiền (Chế độ riêng tư)'}
              style={{
                background: 'rgba(255, 255, 255, 0.22)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#FFFFFF',
                padding: 0,
                transition: 'all 0.15s ease'
              }}
            >
              {isPrivacyMode ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                  <line x1="2" x2="22" y1="2" y2="22"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          <div
            onClick={(e) => { e.stopPropagation(); setActiveTab('wallets'); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 700,
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              cursor: 'pointer'
            }}
            title="Quản lý chi tiết ví & ngân sách"
          >
            <span>Ví & Ngân sách</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {/* Large Amount with Magic UI NumberTicker */}
        <div style={{ fontSize: 36, fontWeight: 800, marginTop: 12, marginBottom: 8, letterSpacing: -0.5 }}>
          <NumberTicker
            value={totalAvailableBalance}
            isPrivacy={isPrivacyMode}
            formatFn={formatMoney || formatVND}
          />
        </div>

        {/* Asset Allocation Bar (Maybe / Ghostfolio style) */}
        {totalAvailableBalance > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 9999, overflow: 'hidden', display: 'flex', gap: 2 }}>
              <div style={{ width: `${cashPct}%`, background: '#34D399', borderRadius: 9999 }} title={`Tiền mặt: ${cashPct}%`} />
              <div style={{ width: `${bankPct}%`, background: '#60A5FA', borderRadius: 9999 }} title={`Ngân hàng: ${bankPct}%`} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, opacity: 0.92, marginTop: 5, fontWeight: 700 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} /> Tiền mặt ({cashPct}%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60A5FA' }} /> Ngân hàng ({bankPct}%)
              </span>
            </div>
          </div>
        )}

        {/* Tremor MiniSparkline (7-day Cashflow wave) */}
        <MiniSparkline transactions={transactions} height={40} />

        {/* Only Two Asset Categories: Tiền mặt & Tài khoản ngân hàng */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.16)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 16,
            padding: '12px 16px',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            marginTop: 12
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
                <NumberTicker
                  value={cashAcc.balance || 0}
                  isPrivacy={isPrivacyMode}
                  formatFn={formatMoney || formatVND}
                />
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
                <NumberTicker
                  value={bankAcc.balance || 0}
                  isPrivacy={isPrivacyMode}
                  formatFn={formatMoney || formatVND}
                />
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
              background: 'var(--primary-green-light)',
              color: 'var(--primary-green)',
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
            <div style={{ fontSize: 11.5, color: 'var(--primary-green)', fontWeight: 600, marginTop: 1 }}>Thu nhập mới</div>
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
              background: 'var(--accent-red-light)',
              color: 'var(--accent-red)',
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
            <div style={{ fontSize: 11.5, color: 'var(--accent-red)', fontWeight: 600, marginTop: 1 }}>Khoản chi mới</div>
          </div>
        </button>
      </div>

      {/* 4. Quick Tile to Wallets & Budgets */}
      <div
        onClick={() => setActiveTab('wallets')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border-color)',
          marginBottom: 16,
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--primary-green-light)',
              color: 'var(--primary-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-main)' }}>Tài chính & Ngân sách</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quản lý chi tiết ví, hạn mức chi & mục tiêu</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary-green)', fontSize: 12, fontWeight: 700 }}>
          <span>Mở ví</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* 5. Monthly Summary: Two Clean Statistic Cards */}
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
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-green)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Thu nhập tháng</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-green)' }}>
            +{formatMoney ? formatMoney(monthlyIncome || overview.monthlyIncome || 0) : formatVND(monthlyIncome || overview.monthlyIncome || 0)}
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
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-red)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Chi tiêu tháng</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-red)' }}>
            -{formatMoney ? formatMoney(monthlyExpense || overview.monthlyExpense || 0) : formatVND(monthlyExpense || overview.monthlyExpense || 0)}
          </div>
        </div>
      </div>

      {/* 5.5 Spending Donut Chart (Tremor / Maybe style) */}
      <SpendingDonutChart onSeedDemo={seedDemoData} />

      {/* Demo Data Status Banner */}
      {transactions && transactions.some(t => t.id && String(t.id).startsWith('demo_')) && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 14,
            padding: '8px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ fontSize: 11.5, color: 'var(--text-main)', fontWeight: 700 }}>
            ✨ Đang xem dữ liệu mẫu trải nghiệm
          </span>
          <button
            type="button"
            onClick={resetAllDataClean}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#EF4444',
              fontSize: 11.5,
              fontWeight: 800,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Xóa dữ liệu mẫu
          </button>
        </div>
      )}

      {/* 6. Recent Transactions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>Giao dịch gần đây</span>
        <span
          onClick={() => setActiveTab('transactions')}
          style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-green)', cursor: 'pointer' }}
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
                      background: isIncome ? 'var(--primary-green-light)' : 'var(--accent-red-light)',
                      color: isIncome ? 'var(--primary-green)' : 'var(--accent-red)',
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
                      color: isIncome ? 'var(--primary-green)' : 'var(--accent-red)'
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
