import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { formatVND, parseVND } from '@/domain/finance';

export default function WalletsPage() {
  const {
    wallets,
    budgets,
    goals,
    fundGoal,
    addBudget,
    saveBudget,
    deleteBudget,
    createGoal,
    updateGoal,
    deleteGoal,
    showToast
  } = useFinance();

  // Dialog / Modal States
  const [budgetModal, setBudgetModal] = useState({ open: false, mode: 'add', item: null, title: '', target: '' });
  const [goalModal, setGoalModal] = useState({ open: false, mode: 'add', item: null, title: '', target: '', current: '', deadline: '2026-12-31' });
  const [fundModal, setFundModal] = useState({ open: false, goal: null, amount: '', account: 'Tài khoản ngân hàng' });

  // Accounts
  const accounts = wallets?.accounts || [];
  const cashAcc = accounts.find(a => a?.name === 'Tiền mặt') || { balance: 0 };
  const bankAcc = accounts.find(a => a?.name === 'Tài khoản ngân hàng' || a?.name === 'Ngân hàng') || { balance: 0 };

  // Budget Handlers
  const handleOpenAddBudget = () => {
    setBudgetModal({ open: true, mode: 'add', item: null, title: '', target: '2000000' });
  };

  const handleOpenEditBudget = (b) => {
    setBudgetModal({ open: true, mode: 'edit', item: b, title: b.title, target: String(b.target) });
  };

  const handleSaveBudgetSubmit = (e) => {
    e.preventDefault();
    const tgt = parseVND(budgetModal.target);
    if (!budgetModal.title.trim() || tgt <= 0) {
      alert('Vui lòng nhập tên danh mục và hạn mức hợp lệ');
      return;
    }

    if (budgetModal.mode === 'add') {
      addBudget({
        title: budgetModal.title.trim(),
        target: tgt,
        color: '#10B981'
      });
    } else if (budgetModal.mode === 'edit' && budgetModal.item) {
      saveBudget(budgetModal.item.id, tgt, budgetModal.title.trim());
    }

    setBudgetModal({ open: false, mode: 'add', item: null, title: '', target: '' });
  };

  const handleDeleteBudget = (id, title) => {
    if (confirm(`Bạn có chắc muốn xóa ngân sách danh mục "${title}"?`)) {
      deleteBudget(id);
    }
  };

  // Goal Handlers
  const handleOpenAddGoal = () => {
    setGoalModal({
      open: true,
      mode: 'add',
      item: null,
      title: '',
      target: '10000000',
      current: '0',
      deadline: '2026-12-31'
    });
  };

  const handleOpenEditGoal = (g) => {
    setGoalModal({
      open: true,
      mode: 'edit',
      item: g,
      title: g.title,
      target: String(g.targetAmount),
      current: String(g.currentAmount || 0),
      deadline: g.deadline || '2026-12-31'
    });
  };

  const handleSaveGoalSubmit = (e) => {
    e.preventDefault();
    const tgt = parseVND(goalModal.target);
    const cur = parseVND(goalModal.current) || 0;
    if (!goalModal.title.trim() || tgt <= 0) {
      alert('Vui lòng nhập tên mục tiêu và số tiền hợp lệ');
      return;
    }

    if (goalModal.mode === 'add') {
      createGoal({
        title: goalModal.title.trim(),
        targetAmount: tgt,
        currentAmount: cur,
        deadline: goalModal.deadline
      });
    } else if (goalModal.mode === 'edit' && goalModal.item) {
      updateGoal(goalModal.item.id, {
        title: goalModal.title.trim(),
        targetAmount: tgt,
        currentAmount: cur,
        deadline: goalModal.deadline
      });
    }

    setGoalModal({ open: false, mode: 'add', item: null, title: '', target: '', current: '', deadline: '2026-12-31' });
  };

  const handleDeleteGoal = (id, title) => {
    if (confirm(`Bạn có chắc muốn xóa mục tiêu "${title}"?`)) {
      deleteGoal(id);
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
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    fundGoal(fundModal.goal.id, amt, fundModal.account);
    setFundModal({ open: false, goal: null, amount: '', account: 'Tài khoản ngân hàng' });
  };

  return (
    <div className="app-screen active" style={{ display: 'block', opacity: 1, transform: 'none' }}>
      {/* Screen Title */}
      <div className="screen-header-bar">
        <div className="screen-header-title">Tài khoản & Ngân sách</div>
      </div>

      {/* Section 1: Wallets Cards (Only Tiền mặt & Tài khoản ngân hàng) */}
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>
        Tài khoản & Ví thanh toán
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {/* Tiền mặt */}
        <div
          className="ui-card"
          style={{
            padding: 14,
            margin: 0,
            borderTop: '4px solid #06B6D4'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#06B6D4' }}></div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>Tiền mặt</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>
            {formatVND(cashAcc.balance || 0)}
          </div>
        </div>

        {/* Tài khoản ngân hàng */}
        <div
          className="ui-card"
          style={{
            padding: 14,
            margin: 0,
            borderTop: '4px solid #10B981'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}></div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>Tài khoản ngân hàng</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>
            {formatVND(bankAcc.balance || 0)}
          </div>
        </div>
      </div>

      {/* Section 2: Budgets */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>Hạn mức ngân sách tháng</span>
        <button
          onClick={handleOpenAddBudget}
          type="button"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--primary-green)',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          + Thêm ngân sách
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {budgets && budgets.length > 0 ? (
          budgets.map(b => {
            const isExceeded = (b.used || 0) > b.target;
            const pct = b.target > 0 ? Math.min(100, Math.round(((b.used || 0) / b.target) * 100)) : 0;

            return (
              <div key={b.id} className="ui-card" style={{ padding: 12, margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>{b.title}</span>
                    {isExceeded && (
                      <span style={{ fontSize: 10, background: '#FEF2F2', color: '#EF4444', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                        Vượt ngân sách
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: isExceeded ? '#EF4444' : 'var(--text-muted)' }}>
                      {formatVND(b.used || 0)} / {formatVND(b.target)} ({pct}%)
                    </span>
                    {/* Action buttons */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditBudget(b)}
                      title="Sửa"
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBudget(b.id, b.title)}
                      title="Xóa"
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Dynamic Progress Bar */}
                <div style={{ height: 6, background: 'var(--bg-card-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: isExceeded ? '#EF4444' : (b.color || 'var(--primary-green)'),
                      borderRadius: 3,
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="ui-card" style={{ textAlign: 'center', padding: 18, color: 'var(--text-muted)', fontSize: 13 }}>
            Chưa có hạn mức ngân sách nào.
          </div>
        )}
      </div>

      {/* Section 3: Financial Goals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>Mục tiêu tài chính</span>
        <button
          onClick={handleOpenAddGoal}
          type="button"
          style={{ background: 'transparent', border: 'none', color: 'var(--primary-green)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}
        >
          + Thêm mục tiêu
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {goals && goals.length > 0 ? (
          goals.map(g => {
            const pct = g.targetAmount > 0 ? Math.min(100, Math.round(((g.currentAmount || 0) / g.targetAmount) * 100)) : 0;

            return (
              <div key={g.id} className="ui-card" style={{ padding: 14, margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>{g.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Hạn hoàn thành: {g.deadline}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => handleOpenFundGoal(g)}
                      type="button"
                      style={{
                        background: 'var(--primary-green)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-pill)',
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Nạp thêm
                    </button>
                    <button
                      onClick={() => handleOpenEditGoal(g)}
                      type="button"
                      title="Sửa"
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(g.id, g.title)}
                      type="button"
                      title="Xóa"
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
                  <span style={{ color: 'var(--primary-green)' }}>Hiện có: {formatVND(g.currentAmount || 0)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Mục tiêu: {formatVND(g.targetAmount)} ({pct}%)</span>
                </div>

                {/* Progress Bar */}
                <div style={{ height: 6, background: 'var(--bg-card-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: 'var(--primary-green)',
                      borderRadius: 3,
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div
            className="ui-card"
            style={{
              textAlign: 'center',
              padding: '24px 20px',
              borderRadius: 20,
              border: '1.5px dashed var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: 13
            }}
          >
            Chưa có mục tiêu nào. Nhấn "+ Thêm mục tiêu" để bắt đầu tiết kiệm có kế hoạch.
          </div>
        )}
      </div>

      {/* Budget Add/Edit Modal */}
      {budgetModal.open && (
        <div className="bottom-sheet-backdrop active show" onClick={() => setBudgetModal({ ...budgetModal, open: false })}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-drag-handle"></div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 14, textAlign: 'center' }}>
              {budgetModal.mode === 'add' ? 'Thêm hạn mức ngân sách' : 'Chỉnh sửa ngân sách'}
            </div>

            <form onSubmit={handleSaveBudgetSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Tên danh mục
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ăn uống, Xăng xe..."
                  value={budgetModal.title}
                  onChange={e => setBudgetModal({ ...budgetModal, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: 13.5,
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Hạn mức tháng (VNĐ)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 3.000.000"
                  value={budgetModal.target}
                  onChange={e => setBudgetModal({ ...budgetModal, target: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <button className="btn-primary" type="submit">
                {budgetModal.mode === 'add' ? 'Lưu ngân sách' : 'Cập nhật ngân sách'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Goal Add/Edit Modal */}
      {goalModal.open && (
        <div className="bottom-sheet-backdrop active show" onClick={() => setGoalModal({ ...goalModal, open: false })}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-drag-handle"></div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 14, textAlign: 'center' }}>
              {goalModal.mode === 'add' ? 'Tạo mục tiêu tài chính mới' : 'Chỉnh sửa mục tiêu'}
            </div>

            <form onSubmit={handleSaveGoalSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Tên mục tiêu
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Mua laptop, Quỹ dự phòng..."
                  value={goalModal.title}
                  onChange={e => setGoalModal({ ...goalModal, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: 13.5,
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Số tiền mục tiêu
                  </label>
                  <input
                    type="text"
                    placeholder="10.000.000"
                    value={goalModal.target}
                    onChange={e => setGoalModal({ ...goalModal, target: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: 13.5,
                      fontWeight: 700,
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Số tiền hiện có
                  </label>
                  <input
                    type="text"
                    placeholder="0"
                    value={goalModal.current}
                    onChange={e => setGoalModal({ ...goalModal, current: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: 13.5,
                      fontWeight: 700,
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Ngày hoàn thành
                </label>
                <input
                  type="date"
                  value={goalModal.deadline}
                  onChange={e => setGoalModal({ ...goalModal, deadline: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: 13,
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <button className="btn-primary" type="submit">
                {goalModal.mode === 'add' ? 'Tạo mục tiêu' : 'Lưu thay đổi'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Fund Goal Modal */}
      {fundModal.open && fundModal.goal && (
        <div className="bottom-sheet-backdrop active show" onClick={() => setFundModal({ open: false, goal: null, amount: '', account: 'Tài khoản ngân hàng' })}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-drag-handle"></div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4, textAlign: 'center' }}>
              Nạp tiền vào mục tiêu
            </div>
            <div style={{ fontSize: 13, color: 'var(--primary-green)', fontWeight: 700, textAlign: 'center', marginBottom: 14 }}>
              {fundModal.goal.title}
            </div>

            <form onSubmit={handleFundSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Số tiền nạp (VNĐ)
                </label>
                <input
                  type="text"
                  placeholder="500.000"
                  value={fundModal.amount}
                  onChange={e => setFundModal({ ...fundModal, amount: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Nguồn tiền
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {['Tài khoản ngân hàng', 'Tiền mặt'].map(accName => {
                    const isSel = fundModal.account === accName;
                    return (
                      <div
                        key={accName}
                        onClick={() => setFundModal({ ...fundModal, account: accName })}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: isSel ? '2px solid var(--primary-green)' : '1px solid var(--border-color)',
                          background: isSel ? 'var(--primary-green-light)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: 'var(--text-main)'
                        }}
                      >
                        {accName}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button className="btn-primary" type="submit">
                Xác nhận nạp tiền
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
