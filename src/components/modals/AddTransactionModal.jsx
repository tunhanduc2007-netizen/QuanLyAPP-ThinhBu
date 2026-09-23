import React, { useState, useEffect } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { formatVND, parseVND } from '@/domain/finance';

// Curated Category Definitions with bespoke SVG Icons & Hex Palettes
const CATEGORY_DEFINITIONS = {
  expense: [
    { id: 'an-uong', title: 'Ăn uống', color: '#EF4444', bg: '#FEE2E2', iconType: 'food' },
    { id: 'xang-xe', title: 'Xăng xe', color: '#F97316', bg: '#FFEDD5', iconType: 'fuel' },
    { id: 'mua-sam', title: 'Mua sắm', color: '#EC4899', bg: '#FDF2F8', iconType: 'shopping' },
    { id: 'giai-tri', title: 'Giải trí', color: '#8B5CF6', bg: '#F5F3FF', iconType: 'game' },
    { id: 'nha-o', title: 'Nhà ở', color: '#10B981', bg: '#ECFDF5', iconType: 'home' },
    { id: 'suc-khoe', title: 'Sức khỏe', color: '#06B6D4', bg: '#CFFAFE', iconType: 'health' },
    { id: 'hoc-tap', title: 'Học tập', color: '#3B82F6', bg: '#EFF6FF', iconType: 'education' },
    { id: 'khac-chi', title: 'Khác', color: '#64748B', bg: '#F1F5F9', iconType: 'other' }
  ],
  income: [
    { id: 'luong', title: 'Lương', color: '#10B981', bg: '#ECFDF5', iconType: 'salary' },
    { id: 'thuong', title: 'Thưởng', color: '#F59E0B', bg: '#FEF3C7', iconType: 'gift' },
    { id: 'kinh-doanh', title: 'Kinh doanh', color: '#7C3AED', bg: '#EDE9FE', iconType: 'business' },
    { id: 'dau-tu', title: 'Đầu tư', color: '#0D9488', bg: '#CCFBF1', iconType: 'invest' },
    { id: 'freelance', title: 'Freelance', color: '#2563EB', bg: '#EFF6FF', iconType: 'freelance' },
    { id: 'khac-thu', title: 'Khác', color: '#64748B', bg: '#F1F5F9', iconType: 'other' }
  ]
};

// Pure SVG Icon Renderer
function CategorySvgIcon({ type, color }) {
  const p = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2.2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  };

  switch (type) {
    case 'food':
      return (
        <svg {...p}>
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      );
    case 'fuel':
      return (
        <svg {...p}>
          <path d="M3 22h12" />
          <path d="M4 9h10" />
          <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
          <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
        </svg>
      );
    case 'shopping':
      return (
        <svg {...p}>
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case 'game':
      return (
        <svg {...p}>
          <line x1="6" y1="12" x2="10" y2="12" />
          <line x1="8" y1="10" x2="8" y2="14" />
          <line x1="15" y1="13" x2="15.01" y2="13" />
          <line x1="18" y1="11" x2="18.01" y2="11" />
          <rect x="2" y="6" width="20" height="12" rx="6" />
        </svg>
      );
    case 'home':
      return (
        <svg {...p}>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'health':
      return (
        <svg {...p}>
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          <path d="M12 5v14" />
        </svg>
      );
    case 'education':
      return (
        <svg {...p}>
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      );
    case 'salary':
      return (
        <svg {...p}>
          <rect x="2" y="6" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <circle cx="12" cy="15" r="2" />
        </svg>
      );
    case 'gift':
      return (
        <svg {...p}>
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
      );
    case 'business':
      return (
        <svg {...p}>
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      );
    case 'invest':
      return (
        <svg {...p}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case 'freelance':
      return (
        <svg {...p}>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      );
  }
}

export default function AddTransactionModal() {
  const {
    isAddTxOpen,
    setIsAddTxOpen,
    addTxType,
    setAddTxType,
    addTransaction,
    wallets,
    selectedDate,
    formatMoney
  } = useFinance();

  const [rawAmount, setRawAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('Tiền mặt');
  const [note, setNote] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Sync date and account when modal opens
  useEffect(() => {
    if (isAddTxOpen) {
      if (selectedDate) setTxDate(selectedDate);
      if (!selectedAccount && wallets?.accounts?.[0]?.name) {
        setSelectedAccount(wallets.accounts[0].name);
      }
    }
  }, [isAddTxOpen, selectedDate]);

  if (!isAddTxOpen) return null;

  // Custom categories from LocalStorage (created in Settings)
  const customCategories = (() => {
    try {
      const stored = JSON.parse(localStorage.getItem('fintrack_custom_categories') || '{}');
      return Array.isArray(stored[addTxType]) ? stored[addTxType] : [];
    } catch (e) {
      return [];
    }
  })();

  const baseCategories = CATEGORY_DEFINITIONS[addTxType] || CATEGORY_DEFINITIONS.expense;
  const currentCategories = [
    ...baseCategories,
    ...customCategories.map(c => ({
      id: c.id || c.title,
      title: c.title,
      color: c.color || '#10B981',
      bg: `${c.color || '#10B981'}18`,
      iconType: 'other'
    }))
  ];

  const activeCategory = selectedCategory || currentCategories[0]?.title;
  const isExpense = addTxType === 'expense';
  const themeColor = isExpense ? '#EF4444' : '#10B981';

  // Handle Quick Amount suggestions
  const handleQuickFill = (amt) => {
    setRawAmount(amt.toString());
  };

  // Format displayed numeric string
  const formatDisplayAmount = (val) => {
    if (!val) return '';
    const cleanNum = val.toString().replace(/\D/g, '');
    if (!cleanNum) return '';
    return Number(cleanNum).toLocaleString('vi-VN');
  };

  const handleAmountChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setRawAmount(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedAmt = parseVND(rawAmount);
    if (!parsedAmt || parsedAmt <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ lớn hơn 0đ');
      return;
    }

    addTransaction({
      type: addTxType,
      amount: parsedAmt,
      category: activeCategory,
      account: selectedAccount,
      note: note.trim(),
      isoDate: txDate
    });

    setRawAmount('');
    setNote('');
  };

  // Accounts with fallback
  const accountsList = (wallets?.accounts?.length ? wallets.accounts : [
    { id: 'acc-1', name: 'Tiền mặt', balance: 0 },
    { id: 'acc-2', name: 'Tài khoản ngân hàng', balance: 0 }
  ]);

  return (
    <div className="bottom-sheet-backdrop active show" onClick={() => setIsAddTxOpen(false)}>
      <div
        className="bottom-sheet-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '28px 28px 0 0',
          padding: '16px 20px 24px 20px',
          background: 'var(--bg-card, #FFFFFF)'
        }}
      >
        {/* Drag Handle */}
        <div
          style={{
            width: 44,
            height: 4,
            borderRadius: 999,
            background: 'var(--border-color, #E2E8F0)',
            margin: '0 auto 14px auto'
          }}
        />

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              {isExpense ? 'Ghi chép Chi tiêu' : 'Ghi chép Thu nhập'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Cập nhật tức thì vào Sổ Cái SSOT
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddTxOpen(false)}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'var(--bg-card-subtle, #F1F5F9)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 1. Neobank Segmented Type Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
            background: 'var(--bg-card-subtle, #F1F5F9)',
            padding: 4,
            borderRadius: 14,
            marginBottom: 16
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAddTxType('expense');
              setSelectedCategory('');
            }}
            style={{
              padding: '10px 0',
              borderRadius: 11,
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              background: isExpense ? 'var(--bg-card, #FFFFFF)' : 'transparent',
              color: isExpense ? '#EF4444' : 'var(--text-muted)',
              boxShadow: isExpense ? '0 3px 10px rgba(239, 68, 68, 0.15)' : 'none',
              border: isExpense ? '1px solid var(--border-color, transparent)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="7" x2="17" y2="17" />
              <polyline points="17 7 17 17 7 17" />
            </svg>
            <span>Chi tiêu</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAddTxType('income');
              setSelectedCategory('');
            }}
            style={{
              padding: '10px 0',
              borderRadius: 11,
              border: !isExpense ? '1px solid var(--border-color, transparent)' : 'none',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              background: !isExpense ? 'var(--bg-card, #FFFFFF)' : 'transparent',
              color: !isExpense ? '#10B981' : 'var(--text-muted)',
              boxShadow: !isExpense ? '0 3px 10px rgba(16, 185, 129, 0.15)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
            <span>Thu nhập</span>
          </button>
        </div>

        {/* 2. Amount Hero Card */}
        <div
          style={{
            background: isExpense ? 'rgba(239, 68, 68, 0.04)' : 'rgba(16, 185, 129, 0.04)',
            border: `1.5px solid ${isExpense ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
            borderRadius: 20,
            padding: '16px 14px',
            marginBottom: 16,
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: themeColor, marginBottom: 6 }}>
            {isExpense ? 'Số tiền chi tiêu' : 'Số tiền thu nhập'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: isExpense ? '#FEE2E2' : '#D1FAE5',
                color: themeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 18,
                flexShrink: 0
              }}
            >
              {isExpense ? '−' : '+'}
            </span>

            <input
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="0"
              value={formatDisplayAmount(rawAmount)}
              onChange={handleAmountChange}
              style={{
                fontSize: 34,
                fontWeight: 800,
                textAlign: 'center',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '65%',
                color: 'var(--text-main)',
                fontFamily: 'inherit',
                letterSpacing: '-0.5px'
              }}
            />

            <span style={{ fontSize: 22, fontWeight: 800, color: themeColor }}>₫</span>
          </div>

          {/* Quick-fill Pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            {[50000, 100000, 200000, 500000, 1000000].map((amt) => {
              const formattedAmt = amt >= 1000000 ? `${amt / 1000000}tr` : `${amt / 1000}k`;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickFill(amt)}
                  style={{
                    background: 'var(--bg-card, #FFFFFF)',
                    border: '1px solid var(--border-color, #E2E8F0)',
                    borderRadius: 999,
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  +{formattedAmt}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Categories Grid with Real SVG Icons */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
              Danh mục
            </label>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {activeCategory}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {currentCategories.map((cat) => {
              const isSelected = activeCategory === cat.title;
              return (
                <div
                  key={cat.id || cat.title}
                  onClick={() => setSelectedCategory(cat.title)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '12px 6px',
                    borderRadius: 16,
                    border: isSelected ? `2px solid ${cat.color}` : '1.5px solid var(--border-color, #E2E8F0)',
                    background: isSelected ? `${cat.color}10` : 'var(--bg-card, #FFFFFF)',
                    cursor: 'pointer',
                    boxShadow: isSelected ? `0 4px 14px ${cat.color}25` : '0 1px 3px rgba(0,0,0,0.02)',
                    transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: isSelected ? cat.color : cat.bg || '#F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    <CategorySvgIcon type={cat.iconType} color={isSelected ? '#FFFFFF' : cat.color} />
                  </div>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? cat.color : 'var(--text-main)',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%'
                    }}
                  >
                    {cat.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Dual Wallet / Account Selection */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 8 }}>
            Nguồn tiền thanh toán
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {accountsList.map((acc) => {
              const isSel = selectedAccount === acc.name;
              const isBank = acc.name.includes('ngân hàng') || acc.name.includes('Ngân hàng');
              const iconColor = isBank ? '#10B981' : '#06B6D4';
              const iconBg = isBank ? '#D1FAE5' : '#CFFAFE';

              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc.name)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 16,
                    border: isSel ? `2px solid ${iconColor}` : '1.5px solid var(--border-color, #E2E8F0)',
                    background: isSel ? `${iconColor}10` : 'var(--bg-card, #FFFFFF)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: isSel ? `0 4px 12px ${iconColor}22` : '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: iconBg,
                        color: iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {isBank ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="3" y1="22" x2="21" y2="22" />
                          <line x1="6" y1="18" x2="6" y2="11" />
                          <line x1="10" y1="18" x2="10" y2="11" />
                          <line x1="14" y1="18" x2="14" y2="11" />
                          <line x1="18" y1="18" x2="18" y2="11" />
                          <polygon points="12 2 20 7 4 7" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="6" width="20" height="12" rx="2" />
                          <circle cx="12" cy="12" r="2" />
                          <path d="M6 12h.01M18 12h.01" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                        {acc.name === 'Tài khoản ngân hàng' ? 'Ngân hàng' : acc.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {formatMoney ? formatMoney(acc.balance || 0) : formatVND(acc.balance || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Radio Indicator */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: isSel ? `5px solid ${iconColor}` : '2px solid var(--border-color, #CBD5E1)',
                      background: 'var(--bg-card, #FFFFFF)',
                      transition: 'all 0.15s ease'
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Date & Note Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {/* Date Field */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
              Ngày giao dịch
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px',
                  borderRadius: 12,
                  border: '1.5px solid var(--border-color, #E2E8F0)',
                  background: 'var(--bg-app, #F8FAFC)',
                  color: 'var(--text-main)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Note Field */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
              Ghi chú
            </label>
            <input
              type="text"
              placeholder="Ăn trưa, nhận lương..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                border: '1.5px solid var(--border-color, #E2E8F0)',
                background: 'var(--bg-app, #F8FAFC)',
                color: 'var(--text-main)',
                fontSize: 12.5,
                fontWeight: 600,
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {/* 6. Neobank Gradient Submit Button */}
        <button
          onClick={handleSubmit}
          type="button"
          style={{
            width: '100%',
            height: 50,
            borderRadius: 16,
            border: 'none',
            background: isExpense
              ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
              : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: isExpense
              ? '0 6px 20px rgba(239, 68, 68, 0.35)'
              : '0 6px 20px rgba(16, 185, 129, 0.35)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <span>{isExpense ? 'Ghi nhận chi tiêu' : 'Ghi nhận thu nhập'}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
