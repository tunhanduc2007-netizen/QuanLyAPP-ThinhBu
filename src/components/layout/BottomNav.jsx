import React from 'react';
import { useFinance } from '@/context/FinanceContext';

export default function BottomNav() {
  const { activeTab, setActiveTab, setIsAddTxOpen, setAddTxType } = useFinance();

  return (
    <nav className="bottom-nav-bar">
      {/* 1. Tổng quan */}
      <button
        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => setActiveTab('dashboard')}
        type="button"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Tổng quan</span>
        {activeTab === 'dashboard' && <span className="nav-active-pill" />}
      </button>

      {/* 2. Lịch */}
      <button
        className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
        onClick={() => setActiveTab('calendar')}
        type="button"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
          <line x1="16" x2="16" y1="2" y2="6"/>
          <line x1="8" x2="8" y1="2" y2="6"/>
          <line x1="3" x2="21" y1="10" y2="10"/>
        </svg>
        <span>Lịch</span>
        {activeTab === 'calendar' && <span className="nav-active-pill" />}
      </button>

      {/* 3. Nút "+" tròn ở giữa */}
      <button
        className="nav-center-plus"
        onClick={() => {
          setAddTxType('expense');
          setIsAddTxOpen(true);
        }}
        title="Thêm giao dịch mới"
        type="button"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* 4. Ranking */}
      <button
        className={`nav-item ${activeTab === 'ranking' ? 'active' : ''}`}
        onClick={() => setActiveTab('ranking')}
        type="button"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
          <path d="M4 22h16"/>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
        </svg>
        <span>Ranking</span>
        {activeTab === 'ranking' && <span className="nav-active-pill" />}
      </button>

      {/* 5. Tài chính */}
      <button
        className={`nav-item ${activeTab === 'wallets' ? 'active' : ''}`}
        onClick={() => setActiveTab('wallets')}
        type="button"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
        </svg>
        <span>Tài chính</span>
        {activeTab === 'wallets' && <span className="nav-active-pill" />}
      </button>
    </nav>
  );
}
