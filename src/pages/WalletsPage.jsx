import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { formatVND, parseVND } from '@/domain/finance';

const CATEGORY_ICONS = {
  'ăn uống': { icon: '🍜', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  'xăng xe': { icon: '⛽', color: '#F97316', bg: 'rgba(249, 115, 22, 0.12)' },
  'mua sắm': { icon: '🛍️', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' },
  'giải trí': { icon: '🎮', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  'nhà ở': { icon: '🏠', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  'tiền trọ': { icon: '🏠', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  'sức khỏe': { icon: '🏥', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)' },
  'học tập': { icon: '📚', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
  'khác': { icon: '🏷️', color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)' }
};

const BUDGET_SUGGESTIONS = [
  {
    title: 'Ăn uống',
    icon: '🍜',
    desc: 'Cơm trưa, cà phê, ăn ngoài, đồ ăn vặt',
    suggestedTarget: 3000000,
    hintRange: 'Gợi ý: ~2 - 5 triệu / tháng',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.12)'
  },
  {
    title: 'Xăng xe & Đi lại',
    icon: '⛽',
    desc: 'Đổ xăng, xe bus, gửi xe, bảo dưỡng',
    suggestedTarget: 1500000,
    hintRange: 'Gợi ý: ~1 - 2 triệu / tháng',
    color: '#F97316',
    bg: 'rgba(249, 115, 22, 0.12)'
  },
  {
    title: 'Tiền trọ & Nhà ở',
    icon: '🏠',
    desc: 'Tiền phòng trọ, điện nước, mạng internet',
    suggestedTarget: 4000000,
    hintRange: 'Theo hóa đơn cố định hàng tháng',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)'
  },
  {
    title: 'Mua sắm & Đồ dùng',
    icon: '🛍️',
    desc: 'Quần áo, đồ gia dụng, đồ dùng cá nhân',
    suggestedTarget: 2000000,
    hintRange: 'Gợi ý: ~1 - 3 triệu / tháng',
    color: '#EC4899',
    bg: 'rgba(236, 72, 153, 0.12)'
  },
  {
    title: 'Giải trí & Giao lưu',
    icon: '🎮',
    desc: 'Xem phim, dã ngoại, liên hoan bạn bè',
    suggestedTarget: 1000000,
    hintRange: 'Gợi ý: ~500k - 1.5 triệu / tháng',
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.12)'
  },
  {
    title: 'Sức khỏe & Y tế',
    icon: '🏥',
    desc: 'Thuốc men, khám răng, thể thao rèn luyện',
    suggestedTarget: 1000000,
    hintRange: 'Quỹ dự phòng sức khỏe',
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.12)'
  },
  {
    title: 'Học tập & Phát triển',
    icon: '📚',
    desc: 'Sách vở, khóa học nâng cao kỹ năng',
    suggestedTarget: 1000000,
    hintRange: 'Đầu tư phát triển bản thân',
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.12)'
  }
];

function getCategoryMeta(title) {
  const clean = (title || '').toLowerCase().trim();
  for (const [key, val] of Object.entries(CATEGORY_ICONS)) {
    if (clean.includes(key)) return val;
  }
  return { icon: '💰', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
}

const GOAL_PRESETS = [
  { title: 'Mua xe máy', icon: '🏍️', target: 25000000, months: 6 },
  { title: 'Điện thoại mới', icon: '📱', target: 15000000, months: 4 },
  { title: 'Quỹ khẩn cấp', icon: '🛡️', target: 20000000, months: 12 },
  { title: 'Du lịch nghỉ dưỡng', icon: '🏖️', target: 8000000, months: 3 },
  { title: 'Laptop làm việc', icon: '💻', target: 18000000, months: 5 },
  { title: 'Tiết kiệm mua nhà', icon: '🏠', target: 100000000, months: 24 }
];

const GOAL_ICONS = ['🎯', '🏍️', '📱', '💻', '🏖️', '🛡️', '🏠', '🚗', '🎓', '💍', '✈️', '💰'];

function getFutureDate(months = 6) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function formatDisplayDigits(val) {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('vi-VN');
}

function getFriendlyAmountText(num) {
  const n = Number(String(num).replace(/\D/g, '')) || 0;
  if (n <= 0) return '0 VNĐ';
  if (n >= 1000000000) {
    const ty = n / 1000000000;
    return `${Number(ty.toFixed(2)).toLocaleString('vi-VN')} Tỷ VNĐ`;
  }
  if (n >= 1000000) {
    const tr = n / 1000000;
    return `${Number(tr.toFixed(1)).toLocaleString('vi-VN')} Triệu VNĐ`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toLocaleString('vi-VN')} Nghìn VNĐ`;
  }
  return `${n.toLocaleString('vi-VN')} VNĐ`;
}

export default function WalletsPage() {
  const {
    wallets,
    budgets,
    goals,
    fundGoal,
    addBudget,
    saveBudget,
    deleteBudget,
    clearAllBudgets,
    createGoal,
    updateGoal,
    deleteGoal,
    showToast,
    setActiveTab,
    setIsTransferOpen,
    setIsAddTxOpen,
    setAddTxType,
    setAddTxAccount,
    updateWalletBalance,
    updateAllWalletBalances
  } = useFinance();

  // Dialog / Modal States
  const [walletModal, setWalletModal] = useState({
    open: false,
    mode: 'single', // 'single' | 'all'
    accountName: 'Tiền mặt',
    currentBalance: 0,
    targetBalance: '',
    cashBalance: '',
    bankBalance: ''
  });
  const [budgetModal, setBudgetModal] = useState({ open: false, mode: 'add', item: null, title: '', target: '' });
  const [goalModal, setGoalModal] = useState({
    open: false,
    mode: 'add',
    item: null,
    title: '',
    icon: '🎯',
    target: '10000000',
    current: '0',
    deadline: '2026-12-31',
    showIconPicker: false
  });
  const [fundModal, setFundModal] = useState({ open: false, goal: null, amount: '', account: 'Tài khoản ngân hàng' });

  // Accounts
  const accounts = wallets?.accounts || [];
  const cashAcc = accounts.find(a => a?.name === 'Tiền mặt') || { balance: 0 };
  const bankAcc = accounts.find(a => a?.name === 'Tài khoản ngân hàng' || a?.name === 'Ngân hàng') || { balance: 0 };
  const totalBalance = (Number(cashAcc.balance) || 0) + (Number(bankAcc.balance) || 0);

  // Wallet Balance Handlers
  const handleOpenWalletModal = (accountName) => {
    const isCash = accountName === 'Tiền mặt';
    const acc = isCash ? cashAcc : bankAcc;
    const curBal = Number(acc.balance) || 0;
    setWalletModal({
      open: true,
      mode: 'single',
      accountName: isCash ? 'Tiền mặt' : 'Ngân hàng',
      currentBalance: curBal,
      targetBalance: curBal > 0 ? String(curBal) : '',
      cashBalance: '',
      bankBalance: ''
    });
  };

  const handleOpenAllWalletsModal = () => {
    setWalletModal({
      open: true,
      mode: 'all',
      accountName: 'all',
      currentBalance: totalBalance,
      targetBalance: '',
      cashBalance: cashAcc.balance > 0 ? String(cashAcc.balance) : '',
      bankBalance: bankAcc.balance > 0 ? String(bankAcc.balance) : ''
    });
  };

  const handleSaveWalletBalance = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (walletModal.mode === 'all') {
      const cBal = parseVND(walletModal.cashBalance);
      const bBal = parseVND(walletModal.bankBalance);
      if (updateAllWalletBalances) {
        updateAllWalletBalances(cBal, bBal);
      }
    } else {
      const tgt = parseVND(walletModal.targetBalance);
      if (updateWalletBalance) {
        updateWalletBalance(walletModal.accountName, tgt);
      }
    }
    setWalletModal(prev => ({ ...prev, open: false }));
  };

  const handleQuickAddTx = (type, accName) => {
    setWalletModal(prev => ({ ...prev, open: false }));
    if (setAddTxType) setAddTxType(type);
    if (setAddTxAccount) setAddTxAccount(accName);
    if (setIsAddTxOpen) setIsAddTxOpen(true);
  };

  // Budget Handlers
  const handleOpenAddBudget = (prefillTitle = '', prefillTarget = '') => {
    setBudgetModal({
      open: true,
      mode: 'add',
      item: null,
      title: prefillTitle || '',
      target: prefillTarget ? String(prefillTarget) : ''
    });
  };

  const handleSelectSuggestion = (sug) => {
    setBudgetModal({
      open: true,
      mode: 'add',
      item: null,
      title: sug.title,
      target: String(sug.suggestedTarget || 2000000)
    });
  };

  const handleClearAllBudgets = () => {
    if (window.confirm('Bạn có muốn xóa toàn bộ ngân sách để thiết lập lại từ đầu theo danh mục gợi ý không?')) {
      if (clearAllBudgets) {
        clearAllBudgets();
      } else {
        (budgets || []).forEach(b => deleteBudget(b.id));
      }
    }
  };

  const handleOpenEditBudget = (b) => {
    setBudgetModal({ open: true, mode: 'edit', item: b, title: b.title, target: String(b.target) });
  };

  const handleSaveBudgetSubmit = (e) => {
    e.preventDefault();
    const tgt = parseVND(budgetModal.target);
    if (!budgetModal.title.trim() || tgt <= 0) {
      showToast('Vui lòng nhập tên danh mục và hạn mức hợp lệ', 'error');
      return;
    }

    if (budgetModal.mode === 'add') {
      addBudget({
        title: budgetModal.title.trim(),
        target: tgt,
        color: '#10B981'
      });
      showToast('Đã thêm hạn mức ngân sách mới');
    } else if (budgetModal.mode === 'edit' && budgetModal.item) {
      saveBudget(budgetModal.item.id, tgt, budgetModal.title.trim());
      showToast('Đã cập nhật hạn mức ngân sách');
    }

    setBudgetModal({ open: false, mode: 'add', item: null, title: '', target: '' });
  };

  const handleDeleteBudget = (id, title) => {
    if (window.confirm(`Bạn có chắc muốn xóa ngân sách danh mục "${title}"?`)) {
      deleteBudget(id);
      showToast(`Đã xóa ngân sách "${title}"`);
    }
  };

  // Goal Handlers
  const handleOpenAddGoal = (preset = null) => {
    // Guard against React SyntheticEvent being passed as first param when used as onClick={handleOpenAddGoal}
    const isRealPreset = preset && typeof preset === 'object' && typeof preset.title === 'string' && !preset.nativeEvent;
    if (isRealPreset) {
      setGoalModal({
        open: true,
        mode: 'add',
        item: null,
        title: preset.title || '',
        icon: preset.icon || '🎯',
        target: String(preset.target || 10000000),
        current: '0',
        deadline: getFutureDate(preset.months || 6),
        showIconPicker: false
      });
    } else {
      setGoalModal({
        open: true,
        mode: 'add',
        item: null,
        title: '',
        icon: '🎯',
        target: '10000000',
        current: '0',
        deadline: '2026-12-31',
        showIconPicker: false
      });
    }
  };

  const handleOpenEditGoal = (g) => {
    if (!g) return;
    setGoalModal({
      open: true,
      mode: 'edit',
      item: g,
      title: g.title || '',
      icon: g.icon || '🎯',
      target: String(g.targetAmount || 10000000),
      current: String(g.currentAmount || 0),
      deadline: g.deadline || '2026-12-31',
      showIconPicker: false
    });
  };

  const handleSaveGoalSubmit = (e) => {
    e.preventDefault();
    const tgt = parseVND(goalModal.target);
    const cur = parseVND(goalModal.current) || 0;
    const cleanTitle = (goalModal.title || '').trim();
    if (!cleanTitle || tgt <= 0) {
      showToast('Vui lòng nhập tên mục tiêu và số tiền hợp lệ', 'error');
      return;
    }

    if (goalModal.mode === 'add') {
      createGoal({
        title: cleanTitle,
        icon: goalModal.icon || '🎯',
        targetAmount: tgt,
        currentAmount: cur,
        deadline: goalModal.deadline
      });
      showToast('Đã tạo mục tiêu tài chính mới');
    } else if (goalModal.mode === 'edit' && goalModal.item) {
      updateGoal(goalModal.item.id, {
        title: cleanTitle,
        icon: goalModal.icon || '🎯',
        targetAmount: tgt,
        currentAmount: cur,
        deadline: goalModal.deadline
      });
      showToast('Đã cập nhật mục tiêu tài chính');
    }

    setGoalModal({ open: false, mode: 'add', item: null, title: '', icon: '🎯', target: '', current: '', deadline: '2026-12-31', showIconPicker: false });
  };

  const handleDeleteGoal = (id, title) => {
    if (window.confirm(`Bạn có chắc muốn xóa mục tiêu "${title}"?`)) {
      deleteGoal(id);
      showToast(`Đã xóa mục tiêu "${title}"`);
    }
  };

  // Fund Goal Handlers
  const handleOpenFundGoal = (g) => {
    setFundModal({ open: true, goal: g, amount: '500000', account: 'Tài khoản ngân hàng' });
  };

  const handleFundSubmit = (e) => {
    e.preventDefault();
    if (!fundModal.goal) return;
    const amt = parseVND(fundModal.amount);
    if (!amt || amt <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ', 'error');
      return;
    }
    fundGoal(fundModal.goal.id, amt, fundModal.account);
    showToast(`Đã nạp ${formatVND(amt)} vào "${fundModal.goal.title}"`);
    setFundModal({ open: false, goal: null, amount: '', account: 'Tài khoản ngân hàng' });
  };

  return (
    <div className="app-screen active" style={{ display: 'block', opacity: 1, transform: 'none', paddingBottom: 90 }}>
      {/* Centered container constraint so widescreen desktop and mobile (F12) both look centered and clean */}
      <div style={{ maxWidth: 580, margin: '0 auto', width: '100%' }}>
        {/* Header Bar with Back Button to Dashboard */}
        <div className="screen-header-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-main)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
              title="Quay lại Tổng quan"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div>
              <h1 className="screen-header-title" style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>
                Tài Khoản & Ngân Sách
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Quản lý số dư các ví, hạn mức chi & mục tiêu tiết kiệm
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Quick Add Transaction Button */}
            {setIsAddTxOpen && (
              <button
                type="button"
                onClick={() => {
                  if (setAddTxType) setAddTxType('expense');
                  setIsAddTxOpen(true);
                }}
                style={{
                  background: 'var(--primary-green)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-pill)',
                  padding: '6px 14px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.15s ease'
                }}
                title="Ghi chép một khoản thu hoặc chi tiêu mới"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Ghi tiền</span>
              </button>
            )}

            {/* Quick Transfer Button */}
            {setIsTransferOpen && (
              <button
                type="button"
                onClick={() => setIsTransferOpen(true)}
                style={{
                  background: 'var(--primary-green-light)',
                  color: 'var(--primary-green)',
                  border: '1px solid var(--primary-green)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '6px 14px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                <span>Chuyển ví</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. HERO TOTAL BALANCE SUMMARY CARD */}
        <div
          className="ui-card"
          onClick={handleOpenAllWalletsModal}
          role="button"
          tabIndex={0}
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #0D9488 50%, #0284C7 100%)',
            color: '#FFFFFF',
            borderRadius: 20,
            padding: '20px',
            marginBottom: 16,
            boxShadow: '0 10px 25px -5px rgba(13, 148, 136, 0.35)',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease'
          }}
          title="Bấm vào đây để cài đặt số dư ban đầu cho các ví"
        >
          <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)', pointerEvents: 'none' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.9 }}>
              TỔNG SỐ DƯ KHẢ DỤNG
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: 9999, fontWeight: 600 }}>
                2 Ví Hoạt Động
              </span>
              <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.28)', padding: '3px 9px', borderRadius: 9999, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                ✏️ Sửa số dư
              </span>
            </div>
          </div>

          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.5, marginBottom: 12 }}>
            {formatVND(totalBalance)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, opacity: 0.95 }}>
            <span>🔒 Chuẩn sổ cái kép SSOT • Bấm vào ví bên dưới để ghi tiền hoặc sửa số dư ✏️</span>
          </div>
        </div>

        {/* 2. TWO WALLET CARDS: Tiền mặt & Tài khoản ngân hàng */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {/* Tiền mặt Card */}
          <div
            className="ui-card"
            onClick={() => handleOpenWalletModal('Tiền mặt')}
            role="button"
            tabIndex={0}
            style={{
              padding: 16,
              margin: 0,
              background: 'var(--bg-card)',
              borderRadius: 16,
              border: '1.5px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
            title="Bấm vào đây để ghi tiền hoặc sửa số dư Ví Tiền mặt"
          >
            <div style={{ width: '100%', height: 4, background: 'linear-gradient(90deg, #06B6D4, #0891B2)', position: 'absolute', top: 0, left: 0 }} />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(6, 182, 212, 0.12)', color: '#06B6D4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="12" x="2" y="6" rx="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <path d="M6 12h.01M18 12h.01"/>
                </svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#06B6D4', background: 'rgba(6, 182, 212, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
                Tiền mặt
              </span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Số dư ví</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-main)', marginTop: 2 }}>
              {formatVND(cashAcc.balance || 0)}
            </div>

            {/* Call to action badge */}
            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#06B6D4', background: 'rgba(6, 182, 212, 0.08)', padding: '4px 8px', borderRadius: 6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </svg>
              <span>Ghi / Sửa số dư</span>
            </div>
          </div>

          {/* Tài khoản ngân hàng Card */}
          <div
            className="ui-card"
            onClick={() => handleOpenWalletModal('Ngân hàng')}
            role="button"
            tabIndex={0}
            style={{
              padding: 16,
              margin: 0,
              background: 'var(--bg-card)',
              borderRadius: 16,
              border: '1.5px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
            title="Bấm vào đây để ghi tiền hoặc sửa số dư Tài khoản Ngân hàng"
          >
            <div style={{ width: '100%', height: 4, background: 'linear-gradient(90deg, #10B981, #059669)', position: 'absolute', top: 0, left: 0 }} />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" x2="21" y1="22" y2="22"/>
                  <line x1="6" x2="6" y1="18" y2="11"/>
                  <line x1="10" x2="10" y1="18" y2="11"/>
                  <line x1="14" x2="14" y1="18" y2="11"/>
                  <line x1="18" x2="18" y1="18" y2="11"/>
                  <polygon points="12 2 20 7 4 7"/>
                </svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
                Ngân hàng
              </span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Tài khoản liên kết</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-main)', marginTop: 2 }}>
              {formatVND(bankAcc.balance || 0)}
            </div>

            {/* Call to action badge */}
            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#10B981', background: 'rgba(16, 185, 129, 0.08)', padding: '4px 8px', borderRadius: 6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </svg>
              <span>Ghi / Sửa số dư</span>
            </div>
          </div>
        </div>

        {/* 3. SECTION: MONTHLY BUDGETS (HẠN MỨC NGÂN SÁCH THÁNG) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>Hạn Mức Ngân Sách Tháng</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Kiểm soát chi tiêu theo từng danh mục thực tế</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {budgets && budgets.length > 0 && (
              <button
                onClick={handleClearAllBudgets}
                type="button"
                title="Xóa tất cả ngân sách để chọn lại từ danh mục gợi ý"
                style={{
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Đặt lại
              </button>
            )}
            <button
              onClick={() => handleOpenAddBudget()}
              type="button"
              style={{
                background: 'var(--primary-green-light)',
                color: 'var(--primary-green)',
                border: '1px solid var(--primary-green)',
                borderRadius: 'var(--radius-pill)',
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Thêm ngân sách</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {budgets && budgets.length > 0 ? (
            <>
              {budgets.map(b => {
                const used = Number(b.used) || 0;
                const target = Number(b.target) || 1;
                const isExceeded = used > target;
                const pct = Math.min(100, Math.round((used / target) * 100));
                const remaining = Math.max(0, target - used);
                const meta = getCategoryMeta(b.title);

                return (
                  <div
                    key={b.id}
                    className="ui-card"
                    style={{
                      padding: 16,
                      margin: 0,
                      background: 'var(--bg-card)',
                      borderRadius: 16,
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-card)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      {/* Category Icon & Title */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: meta.bg,
                            color: meta.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            flexShrink: 0
                          }}
                        >
                          {meta.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>
                            {b.title}
                          </div>
                          <div style={{ fontSize: 11, color: isExceeded ? '#EF4444' : 'var(--text-muted)', fontWeight: 600 }}>
                            {isExceeded ? `Đã vượt quá ${formatVND(used - target)}` : `Còn lại: ${formatVND(remaining)}`}
                          </div>
                        </div>
                      </div>

                      {/* Badge & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: isExceeded ? 'rgba(239, 68, 68, 0.15)' : pct >= 80 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isExceeded ? '#EF4444' : pct >= 80 ? '#D97706' : 'var(--primary-green)'
                          }}
                        >
                          {isExceeded ? 'Vượt mức' : `${pct}%`}
                        </span>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditBudget(b)}
                          title="Sửa ngân sách"
                          style={{
                            background: 'var(--bg-card-subtle, #F1F5F9)',
                            border: 'none',
                            borderRadius: 6,
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            cursor: 'pointer'
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteBudget(b.id, b.title)}
                          title="Xóa ngân sách"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: 'none',
                            borderRadius: 6,
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#EF4444',
                            cursor: 'pointer'
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Amounts Info Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-main)' }}>
                        Đã chi: <strong style={{ color: isExceeded ? '#EF4444' : 'var(--text-main)' }}>{formatVND(used)}</strong>
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Hạn mức: {formatVND(target)}
                      </span>
                    </div>

                    {/* Dynamic Progress Bar */}
                    <div style={{ height: 7, background: 'var(--bg-card-subtle, #E2E8F0)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: isExceeded
                            ? 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)'
                            : pct >= 80
                            ? 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)'
                            : 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                          borderRadius: 9999,
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Suggestions for unconfigured categories */}
              {BUDGET_SUGGESTIONS.filter(sug => !budgets.some(b => (b.title || '').toLowerCase().includes(sug.title.toLowerCase()))).length > 0 && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: 'var(--bg-card)',
                    border: '1px dashed var(--border-color)',
                    marginTop: 4
                  }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>💡 Gợi ý thêm danh mục:</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {BUDGET_SUGGESTIONS
                      .filter(sug => !budgets.some(b => (b.title || '').toLowerCase().includes(sug.title.toLowerCase())))
                      .map(sug => (
                        <button
                          key={sug.title}
                          type="button"
                          onClick={() => handleSelectSuggestion(sug)}
                          style={{
                            background: 'var(--bg-card-subtle)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 9999,
                            padding: '4px 10px',
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5
                          }}
                        >
                          <span>{sug.icon}</span>
                          <span>{sug.title}</span>
                          <span style={{ fontSize: 10, color: 'var(--primary-green)', fontWeight: 800 }}>+ Thiết lập</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Smart Setup Suggestions Empty State */
            <div
              className="ui-card"
              style={{
                padding: '22px 18px',
                borderRadius: 20,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-card)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--primary-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20
                  }}
                >
                  💡
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text-main)' }}>
                    Gợi ý thiết lập ngân sách thông minh
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    Chọn danh mục bạn cần để tự đặt hạn mức chi tiêu theo thực tế:
                  </div>
                </div>
              </div>

              {/* Suggestions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {BUDGET_SUGGESTIONS.map(sug => (
                  <div
                    key={sug.title}
                    onClick={() => handleSelectSuggestion(sug)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 14,
                      background: 'var(--bg-card-subtle, #F8FAFC)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: sug.bg,
                          color: sug.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          flexShrink: 0
                        }}
                      >
                        {sug.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-main)' }}>
                          {sug.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {sug.desc} • <span style={{ color: 'var(--primary-green)', fontWeight: 600 }}>{sug.hintRange}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSuggestion(sug);
                      }}
                      style={{
                        background: 'var(--primary-green-light)',
                        color: 'var(--primary-green)',
                        border: '1px solid var(--primary-green)',
                        borderRadius: 'var(--radius-pill)',
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      + Thiết lập
                    </button>
                  </div>
                ))}
              </div>

              {/* Custom Category Button */}
              <div style={{ marginTop: 14, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleOpenAddBudget()}
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: 12,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>+ Tự nhập danh mục khác</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. SECTION: FINANCIAL GOALS (MỤC TIÊU TÀI CHÍNH) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>Mục Tiêu Tài Chính</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Lộ trình tích lũy mua sắm & dự phòng</div>
          </div>
          <button
            onClick={() => handleOpenAddGoal()}
            type="button"
            style={{
              background: 'var(--primary-green-light)',
              color: 'var(--primary-green)',
              border: '1px solid var(--primary-green)',
              borderRadius: 'var(--radius-pill)',
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Thêm mục tiêu</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {goals && goals.length > 0 ? (
            goals.map(g => {
              const current = Number(g.currentAmount) || 0;
              const target = Number(g.targetAmount) || 1;
              const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
              const isCompleted = current >= target;

              return (
                <div
                  key={g.id}
                  className="ui-card"
                  style={{
                    padding: 16,
                    margin: 0,
                    background: 'var(--bg-card)',
                    borderRadius: 16,
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-card)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        {g.icon && typeof g.icon === 'string' && g.icon.length <= 4 ? g.icon : '🎯'}
                      </div>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{g.title}</span>
                          {isCompleted && (
                            <span style={{ fontSize: 10, background: 'var(--primary-green)', color: '#FFF', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                              Đạt mục tiêu
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Hạn dự kiến: {g.deadline || 'Chưa đặt'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {/* Fund Button */}
                      <button
                        onClick={() => handleOpenFundGoal(g)}
                        type="button"
                        style={{
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 'var(--radius-pill)',
                          padding: '5px 12px',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                        }}
                      >
                        <span>+ Nạp</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEditGoal(g)}
                        type="button"
                        title="Sửa mục tiêu"
                        style={{ background: 'var(--bg-card-subtle, #F1F5F9)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                        </svg>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteGoal(g.id, g.title)}
                        type="button"
                        title="Xóa mục tiêu"
                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', cursor: 'pointer' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    <span style={{ color: 'var(--primary-green)' }}>Hiện có: {formatVND(current)}</span>
                    <span style={{ color: 'var(--text-muted)' }}>Mục tiêu: {formatVND(target)} ({pct}%)</span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: 7, background: 'var(--bg-card-subtle, #E2E8F0)', borderRadius: 9999, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: isCompleted ? '#10B981' : 'linear-gradient(90deg, #3B82F6 0%, #10B981 100%)',
                        borderRadius: 9999,
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            /* Premium Empty State */
            <div
              className="ui-card"
              style={{
                textAlign: 'center',
                padding: '30px 20px',
                borderRadius: 20,
                background: 'var(--bg-card)',
                border: '1.5px dashed var(--border-color)',
                boxShadow: 'var(--shadow-card)'
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary-green-light)', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', fontSize: 24 }}>
                🎯
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
                Chưa có mục tiêu tài chính nào
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 320, margin: '0 auto 16px auto' }}>
                Tiết kiệm mua xe, du lịch hoặc quỹ dự phòng khẩn cấp. Lên kế hoạch rõ ràng để hoàn thành mục tiêu sớm hơn!
              </p>
              <button
                type="button"
                onClick={() => handleOpenAddGoal()}
                className="btn-primary"
                style={{
                  width: 'auto',
                  padding: '9px 20px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  margin: '0 auto'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Tạo Mục Tiêu Mới</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. MODAL: Budget Add/Edit */}
      {budgetModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setBudgetModal({ ...budgetModal, open: false })}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 440,
              background: 'var(--bg-card)',
              borderRadius: 20,
              border: '1px solid var(--border-color)',
              padding: 22,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>
                {budgetModal.mode === 'add' ? 'Thêm Hạn Mức Ngân Sách' : 'Chỉnh Sửa Ngân Sách'}
              </div>
              <button
                type="button"
                onClick={() => setBudgetModal({ ...budgetModal, open: false })}
                style={{ background: 'var(--bg-card-subtle)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBudgetSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                  Tên danh mục chi tiêu:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ăn uống, Xăng xe, Tiền trọ..."
                  value={budgetModal.title}
                  onChange={e => setBudgetModal({ ...budgetModal, title: e.target.value })}
                  className="auth-input"
                  style={{ width: '100%', height: 42, padding: '0 12px', fontSize: 13.5 }}
                />
                {/* Quick suggestions tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {['Ăn uống', 'Xăng xe', 'Tiền trọ', 'Mua sắm', 'Giải trí', 'Sức khỏe'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setBudgetModal(prev => ({ ...prev, title: cat }))}
                      style={{
                        padding: '3px 8px',
                        fontSize: 11,
                        borderRadius: 6,
                        border: budgetModal.title === cat ? '1px solid var(--primary-green)' : '1px solid var(--border-color)',
                        background: budgetModal.title === cat ? 'var(--primary-green-light)' : 'var(--bg-card-subtle)',
                        color: budgetModal.title === cat ? 'var(--primary-green)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>
                    Hạn mức tối đa trong tháng (VNĐ):
                  </label>
                  {parseVND(budgetModal.target) > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary-green)' }}>
                      {formatVND(parseVND(budgetModal.target))}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Ví dụ: 3.000.000"
                  value={budgetModal.target}
                  onChange={e => setBudgetModal({ ...budgetModal, target: e.target.value })}
                  className="auth-input"
                  style={{ width: '100%', height: 42, padding: '0 12px', fontSize: 15, fontWeight: 800 }}
                />
                {/* Quick amount presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {[1000000, 2000000, 3000000, 5000000, 10000000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBudgetModal(prev => ({ ...prev, target: String(amt) }))}
                      style={{
                        padding: '3px 8px',
                        fontSize: 11,
                        borderRadius: 6,
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card-subtle)',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {formatVND(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary" type="submit" style={{ flex: 1, height: 42, fontSize: 13.5, fontWeight: 700 }}>
                  {budgetModal.mode === 'add' ? 'Lưu Ngân Sách' : 'Cập Nhật Ngân Sách'}
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetModal({ ...budgetModal, open: false })}
                  style={{ padding: '0 16px', height: 42, borderRadius: 12, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: Goal Add/Edit */}
      {goalModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.68)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setGoalModal({ ...goalModal, open: false })}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 460,
              maxHeight: '92vh',
              overflowY: 'auto',
              background: 'var(--bg-card, #FFFFFF)',
              borderRadius: 24,
              border: '1px solid var(--border-color)',
              padding: 22,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
              position: 'relative'
            }}
          >
            {/* Top subtle decorative gradient bar */}
            <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 4, background: 'linear-gradient(90deg, #10B981, #06B6D4, #3B82F6)', borderRadius: '0 0 8px 8px' }} />

            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  title="Bấm để đổi biểu tượng"
                  onClick={() => setGoalModal(prev => ({ ...prev, showIconPicker: !prev.showIconPicker }))}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: 'var(--primary-green-light, rgba(16, 185, 129, 0.12))',
                    border: '1.5px solid var(--primary-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  {goalModal.icon || '🎯'}
                </button>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-main)', letterSpacing: -0.3 }}>
                    {goalModal.mode === 'add' ? 'Tạo Mục Tiêu Tài Chính' : 'Chỉnh Sửa Mục Tiêu'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    Lộ trình tích lũy thông minh và rõ ràng
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGoalModal({ ...goalModal, open: false })}
                style={{
                  background: 'var(--bg-card-subtle, #F1F5F9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>

            {/* Icon Picker Popover (if toggled) */}
            {goalModal.showIconPicker && (
              <div
                style={{
                  padding: '10px',
                  borderRadius: 14,
                  background: 'var(--bg-card-subtle, #F8FAFC)',
                  border: '1px solid var(--border-color)',
                  marginBottom: 14,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  justifyContent: 'center'
                }}
              >
                {GOAL_ICONS.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setGoalModal(prev => ({ ...prev, icon: ic, showIconPicker: false }))}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: goalModal.icon === ic ? 'var(--primary-green-light)' : 'var(--bg-card)',
                      border: goalModal.icon === ic ? '1.5px solid var(--primary-green)' : '1px solid var(--border-color)',
                      fontSize: 18,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Inspiration Presets (Only in Add mode) */}
            {goalModal.mode === 'add' && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>💡 Gợi ý mục tiêu phổ biến:</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {GOAL_PRESETS.map(p => (
                    <button
                      key={p.title}
                      type="button"
                      onClick={() => {
                        setGoalModal(prev => ({
                          ...prev,
                          title: p.title,
                          icon: p.icon,
                          target: String(p.target),
                          deadline: getFutureDate(p.months)
                        }));
                      }}
                      style={{
                        padding: '4px 9px',
                        borderRadius: 8,
                        background: goalModal.title === p.title ? 'var(--primary-green-light)' : 'var(--bg-card-subtle)',
                        border: goalModal.title === p.title ? '1px solid var(--primary-green)' : '1px solid var(--border-color)',
                        color: goalModal.title === p.title ? 'var(--primary-green)' : 'var(--text-main)',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <span>{p.icon}</span>
                      <span>{p.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveGoalSubmit}>
              {/* Field 1: Goal Title */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 5 }}>
                  Tên mục tiêu:
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 12, fontSize: 16 }}>
                    {goalModal.icon || '🎯'}
                  </span>
                  <input
                    type="text"
                    placeholder="Ví dụ: Mua xe máy, Du lịch Đà Lạt, Quỹ khẩn cấp..."
                    value={goalModal.title || ''}
                    onChange={e => setGoalModal({ ...goalModal, title: e.target.value })}
                    className="auth-input"
                    style={{ width: '100%', height: 42, paddingLeft: 38, paddingRight: 12, fontSize: 13.5, borderRadius: 12 }}
                  />
                </div>
              </div>

              {/* Field 2: HERO TARGET AMOUNT INPUT (Số tiền cần đạt) */}
              <div
                style={{
                  background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
                  border: '1.5px solid rgba(16, 185, 129, 0.28)',
                  borderRadius: 20,
                  padding: '16px 14px',
                  marginBottom: 14,
                  textAlign: 'center',
                  boxShadow: '0 4px 16px -2px rgba(16, 185, 129, 0.12)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, padding: '0 4px' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--primary-green)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>🎯</span> Số tiền cần đạt (Mục tiêu)
                  </span>
                  {Number(String(goalModal.target).replace(/\D/g, '')) > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--primary-green-light)', color: 'var(--primary-green)', padding: '2px 8px', borderRadius: 20 }}>
                      {getFriendlyAmountText(goalModal.target)}
                    </span>
                  )}
                </div>

                {/* Big Tabular Numeric Input Display */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '6px 0 10px 0' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatDisplayDigits(goalModal.target)}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setGoalModal(prev => ({ ...prev, target: val }));
                    }}
                    style={{
                      fontSize: 32,
                      fontWeight: 900,
                      textAlign: 'center',
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      width: '78%',
                      color: 'var(--primary-green)',
                      fontFamily: 'inherit',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.5px'
                    }}
                  />
                  <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary-green)', opacity: 0.9 }}>₫</span>
                </div>

                {/* Quick Target Preset Chips */}
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
                  {[5000000, 10000000, 20000000, 50000000, 100000000].map(val => {
                    const isSelected = String(goalModal.target).replace(/\D/g, '') === String(val);
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setGoalModal(prev => ({ ...prev, target: String(val) }))}
                        style={{
                          padding: '5px 10px',
                          fontSize: 11.5,
                          borderRadius: 10,
                          background: isSelected ? 'var(--primary-green)' : 'var(--bg-card)',
                          border: isSelected ? '1.5px solid var(--primary-green)' : '1px solid var(--border-color)',
                          color: isSelected ? '#FFFFFF' : 'var(--text-main)',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 800 : 600,
                          boxShadow: isSelected ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {val >= 1000000 ? `${val / 1000000} Triệu` : formatVND(val)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 3: ĐÃ CÓ SẴN (VỐN BAN ĐẦU) */}
              <div
                style={{
                  background: 'var(--bg-card-subtle, #F8FAFC)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 16,
                  padding: '12px 14px',
                  marginBottom: 14
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>💰</span> Đã có sẵn (Vốn ban đầu):
                  </label>
                  {Number(String(goalModal.current).replace(/\D/g, '')) > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                      {getFriendlyAmountText(goalModal.current)}
                    </span>
                  )}
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatDisplayDigits(goalModal.current)}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setGoalModal(prev => ({ ...prev, current: val }));
                    }}
                    className="auth-input"
                    style={{
                      width: '100%',
                      height: 42,
                      paddingLeft: 14,
                      paddingRight: 36,
                      fontSize: 16,
                      fontWeight: 800,
                      borderRadius: 12,
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  />
                  <span style={{ position: 'absolute', right: 14, fontSize: 14, fontWeight: 800, color: 'var(--text-muted)' }}>₫</span>
                </div>

                {/* Quick Current Preset Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {[0, 1000000, 2000000, 5000000, 10000000].map(val => {
                    const isSelected = String(goalModal.current).replace(/\D/g, '') === String(val);
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setGoalModal(prev => ({ ...prev, current: String(val) }))}
                        style={{
                          padding: '3px 8px',
                          fontSize: 11,
                          borderRadius: 8,
                          background: isSelected ? 'var(--primary-green-light)' : 'var(--bg-card)',
                          border: isSelected ? '1px solid var(--primary-green)' : '1px solid var(--border-color)',
                          color: isSelected ? 'var(--primary-green)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 800 : 600,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {val === 0 ? '0 đ' : `${val / 1000000}Tr`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 4: Target Deadline with Quick Presets */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>
                    Ngày dự kiến hoàn thành:
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--primary-green)', fontWeight: 700 }}>
                    {goalModal.deadline || 'Chưa đặt'}
                  </span>
                </div>
                <input
                  type="date"
                  value={goalModal.deadline || ''}
                  onChange={e => setGoalModal({ ...goalModal, deadline: e.target.value })}
                  className="auth-input"
                  style={{ width: '100%', height: 42, padding: '0 12px', fontSize: 13.5, borderRadius: 12 }}
                />
                {/* Quick Timeline pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {[
                    { label: '3 tháng', m: 3 },
                    { label: '6 tháng', m: 6 },
                    { label: '1 năm', m: 12 },
                    { label: 'Cuối 2026', date: '2026-12-31' }
                  ].map(item => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        const targetDate = item.date || getFutureDate(item.m);
                        setGoalModal(prev => ({ ...prev, deadline: targetDate }));
                      }}
                      style={{
                        padding: '2px 8px',
                        fontSize: 10.5,
                        borderRadius: 6,
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Goal Card Live Preview */}
              {(() => {
                const cur = parseVND(goalModal.current) || 0;
                const tgt = parseVND(goalModal.target) || 1;
                const pct = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0;
                const remaining = Math.max(0, tgt - cur);
                return (
                  <div
                    style={{
                      background: 'var(--bg-card-subtle, #F8FAFC)',
                      borderRadius: 16,
                      padding: '12px 14px',
                      border: '1px solid var(--border-color)',
                      marginBottom: 16
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{goalModal.icon || '🎯'}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)' }}>
                          {(goalModal.title || '').trim() || 'Mục tiêu của bạn'}
                        </span>
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--primary-green)' }}>
                        {pct}%
                      </span>
                    </div>

                    {/* Mini Progress Bar */}
                    <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 9999, overflow: 'hidden', marginBottom: 6 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                          borderRadius: 9999,
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                      <span>Hiện có: <strong style={{ color: 'var(--text-main)' }}>{formatVND(cur)}</strong></span>
                      <span>Mục tiêu: <strong style={{ color: 'var(--primary-green)' }}>{formatVND(tgt)}</strong></span>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-primary"
                  type="submit"
                  style={{
                    flex: 1,
                    height: 44,
                    fontSize: 13.5,
                    fontWeight: 800,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <span>✨</span>
                  <span>{goalModal.mode === 'add' ? 'Tạo Mục Tiêu Ngay' : 'Lưu Thay Đổi'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGoalModal({ ...goalModal, open: false })}
                  style={{
                    padding: '0 18px',
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 13
                  }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: Fund Goal */}
      {fundModal.open && fundModal.goal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setFundModal({ open: false, goal: null, amount: '', account: 'Tài khoản ngân hàng' })}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 440,
              background: 'var(--bg-card)',
              borderRadius: 20,
              border: '1px solid var(--border-color)',
              padding: 22,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>
                  Nạp Tiền Vào Mục Tiêu
                </div>
                <div style={{ fontSize: 13, color: 'var(--primary-green)', fontWeight: 700, marginTop: 2 }}>
                  {fundModal.goal.title}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFundModal({ open: false, goal: null, amount: '', account: 'Tài khoản ngân hàng' })}
                style={{ background: 'var(--bg-card-subtle)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFundSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                  Số tiền nạp (VNĐ):
                </label>
                <input
                  type="text"
                  placeholder="500.000"
                  value={fundModal.amount}
                  onChange={e => setFundModal({ ...fundModal, amount: e.target.value })}
                  className="auth-input"
                  style={{ width: '100%', height: 42, padding: '0 12px', fontSize: 16, fontWeight: 900 }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                  Nguồn ví trích tiền:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {['Tài khoản ngân hàng', 'Tiền mặt'].map(accName => {
                    const isSel = fundModal.account === accName;
                    return (
                      <div
                        key={accName}
                        onClick={() => setFundModal({ ...fundModal, account: accName })}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: isSel ? '2px solid var(--primary-green)' : '1px solid var(--border-color)',
                          background: isSel ? 'var(--primary-green-light)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: 13,
                          fontWeight: 700,
                          color: isSel ? 'var(--primary-green)' : 'var(--text-main)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {accName}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary" type="submit" style={{ flex: 1, height: 42, fontSize: 13.5, fontWeight: 700 }}>
                  Xác Nhận Nạp Tiền
                </button>
                <button
                  type="button"
                  onClick={() => setFundModal({ open: false, goal: null, amount: '', account: 'Tài khoản ngân hàng' })}
                  style={{ padding: '0 16px', height: 42, borderRadius: 12, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: Quản Lý & Điều Chỉnh Số Dư Ví (Single Wallet & All Wallets) */}
      {walletModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setWalletModal(prev => ({ ...prev, open: false }))}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 460,
              background: 'var(--bg-card, #FFFFFF)',
              borderRadius: 22,
              border: '1px solid var(--border-color)',
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              maxHeight: '92vh',
              overflowY: 'auto'
            }}
          >
            {walletModal.mode === 'all' ? (
              /* --- MODE: CÀI ĐẶT CẢ 2 VÍ --- */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>
                      Cài Đặt Số Dư Khởi Tạo
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Nhập số tiền thực tế đang có trong các ví của bạn
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWalletModal(prev => ({ ...prev, open: false }))}
                    style={{ background: 'var(--bg-card-subtle)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveWalletBalance}>
                  {/* Ví Tiền mặt */}
                  <div style={{ marginBottom: 16, background: 'rgba(6, 182, 212, 0.05)', padding: '14px', borderRadius: 16, border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#06B6D4', display: 'flex', alignItems: 'center', gap: 6 }}>
                        💵 Ví Tiền mặt
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Hiện tại: {formatVND(cashAcc.balance || 0)}
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formatDisplayDigits(walletModal.cashBalance)}
                      onChange={e => setWalletModal(prev => ({ ...prev, cashBalance: e.target.value.replace(/\D/g, '') }))}
                      className="auth-input"
                      style={{ width: '100%', height: 44, padding: '0 12px', fontSize: 18, fontWeight: 900, borderRadius: 12 }}
                    />
                    {walletModal.cashBalance && (
                      <div style={{ fontSize: 11.5, color: '#06B6D4', fontWeight: 700, marginTop: 4 }}>
                        ≈ {getFriendlyAmountText(walletModal.cashBalance)}
                      </div>
                    )}
                    {/* Quick chips for Cash */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {[500000, 1000000, 2000000, 5000000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            const cur = Number(walletModal.cashBalance) || 0;
                            setWalletModal(prev => ({ ...prev, cashBalance: String(cur + amt) }));
                          }}
                          style={{
                            background: 'var(--bg-card)',
                            border: '1px solid rgba(6, 182, 212, 0.3)',
                            borderRadius: 9999,
                            padding: '3px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#06B6D4',
                            cursor: 'pointer'
                          }}
                        >
                          +{amt >= 1000000 ? `${amt / 1000000}tr` : `${amt / 1000}k`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setWalletModal(prev => ({ ...prev, cashBalance: '0' }))}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          borderRadius: 9999,
                          padding: '3px 8px',
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        Đặt 0đ
                      </button>
                    </div>
                  </div>

                  {/* Tài khoản Ngân hàng */}
                  <div style={{ marginBottom: 18, background: 'rgba(16, 185, 129, 0.05)', padding: '14px', borderRadius: 16, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: 6 }}>
                        🏛️ Tài khoản Ngân hàng
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Hiện tại: {formatVND(bankAcc.balance || 0)}
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formatDisplayDigits(walletModal.bankBalance)}
                      onChange={e => setWalletModal(prev => ({ ...prev, bankBalance: e.target.value.replace(/\D/g, '') }))}
                      className="auth-input"
                      style={{ width: '100%', height: 44, padding: '0 12px', fontSize: 18, fontWeight: 900, borderRadius: 12 }}
                    />
                    {walletModal.bankBalance && (
                      <div style={{ fontSize: 11.5, color: '#10B981', fontWeight: 700, marginTop: 4 }}>
                        ≈ {getFriendlyAmountText(walletModal.bankBalance)}
                      </div>
                    )}
                    {/* Quick chips for Bank */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {[1000000, 2000000, 5000000, 10000000, 20000000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            const cur = Number(walletModal.bankBalance) || 0;
                            setWalletModal(prev => ({ ...prev, bankBalance: String(cur + amt) }));
                          }}
                          style={{
                            background: 'var(--bg-card)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: 9999,
                            padding: '3px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#10B981',
                            cursor: 'pointer'
                          }}
                        >
                          +{amt >= 1000000 ? `${amt / 1000000}tr` : `${amt / 1000}k`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setWalletModal(prev => ({ ...prev, bankBalance: '0' }))}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          borderRadius: 9999,
                          padding: '3px 8px',
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        Đặt 0đ
                      </button>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: 'var(--bg-card-subtle)', marginBottom: 18 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Tổng số dư mới:</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-main)' }}>
                      {formatVND((Number(walletModal.cashBalance) || 0) + (Number(walletModal.bankBalance) || 0))}
                    </span>
                  </div>

                  {/* Submit buttons */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn-primary"
                      type="submit"
                      style={{ flex: 1, height: 44, fontSize: 14, fontWeight: 800 }}
                    >
                      💾 Lưu Số Dư Cả Hai Ví
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalletModal(prev => ({ ...prev, open: false }))}
                      style={{ padding: '0 16px', height: 44, borderRadius: 12, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* --- MODE: CÀI ĐẶT / QUẢN LÝ 1 VÍ CỤ THỂ --- */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: walletModal.accountName === 'Tiền mặt' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: walletModal.accountName === 'Tiền mặt' ? '#06B6D4' : '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20
                      }}
                    >
                      {walletModal.accountName === 'Tiền mặt' ? '💵' : '🏛️'}
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>
                        Ví {walletModal.accountName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Số dư hiện tại: <strong style={{ color: 'var(--text-main)' }}>{formatVND(walletModal.currentBalance)}</strong>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWalletModal(prev => ({ ...prev, open: false }))}
                    style={{ background: 'var(--bg-card-subtle)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                  >
                    ✕
                  </button>
                </div>

                {/* FORM ĐIỀU CHỈNH SỐ DƯ */}
                <form onSubmit={handleSaveWalletBalance} style={{ marginBottom: 18 }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                      Nhập số dư thực tế mới trong ví (VNĐ):
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      placeholder="0"
                      value={formatDisplayDigits(walletModal.targetBalance)}
                      onChange={e => setWalletModal(prev => ({ ...prev, targetBalance: e.target.value.replace(/\D/g, '') }))}
                      className="auth-input"
                      style={{ width: '100%', height: 46, padding: '0 14px', fontSize: 20, fontWeight: 900, borderRadius: 12 }}
                    />
                    {walletModal.targetBalance ? (
                      <div style={{ fontSize: 12, color: walletModal.accountName === 'Tiền mặt' ? '#06B6D4' : '#10B981', fontWeight: 700, marginTop: 4 }}>
                        ≈ {getFriendlyAmountText(walletModal.targetBalance)}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        💡 Gõ số tiền thực tế bạn đang có trong ví này
                      </div>
                    )}
                  </div>

                  {/* Gợi ý số tiền nhanh */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                      Cộng nhanh số tiền:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {[100000, 200000, 500000, 1000000, 2000000, 5000000, 10000000, 20000000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            const cur = Number(walletModal.targetBalance) || 0;
                            setWalletModal(prev => ({ ...prev, targetBalance: String(cur + amt) }));
                          }}
                          style={{
                            background: 'var(--bg-card-subtle)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 9999,
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            cursor: 'pointer'
                          }}
                        >
                          +{amt >= 1000000 ? `${amt / 1000000}tr` : `${amt / 1000}k`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setWalletModal(prev => ({ ...prev, targetBalance: '0' }))}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          borderRadius: 9999,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        Đặt 0đ
                      </button>
                    </div>
                  </div>

                  <button
                    className="btn-primary"
                    type="submit"
                    style={{ width: '100%', height: 44, fontSize: 14, fontWeight: 800, borderRadius: 12 }}
                  >
                    💾 Lưu Số Dư Ví
                  </button>
                </form>

                {/* PHẦN GHI CHÉP GIAO DỊCH NHANH */}
                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textAlign: 'center' }}>
                    HOẶC GHI NHANH GIAO DỊCH CHO VÍ NÀY
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => handleQuickAddTx('income', walletModal.accountName)}
                      style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: 'var(--primary-green)',
                        border: '1px solid var(--primary-green)',
                        borderRadius: 12,
                        padding: '10px 8px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <span>➕</span>
                      <span>Ghi Thu Nhập</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickAddTx('expense', walletModal.accountName)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#EF4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 12,
                        padding: '10px 8px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <span>➖</span>
                      <span>Ghi Chi Tiêu</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
