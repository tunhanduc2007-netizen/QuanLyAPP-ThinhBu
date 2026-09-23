import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { parseVND } from '@/domain/finance';

export default function NewGoalModal() {
  const { isNewGoalOpen, setIsNewGoalOpen, createGoal } = useFinance();
  const [title, setTitle] = useState('');
  const [rawTarget, setRawTarget] = useState('');
  const [deadline, setDeadline] = useState('2026-12-31');

  if (!isNewGoalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const tgt = parseVND(rawTarget);
    if (!title.trim() || !tgt || tgt <= 0) {
      alert('Vui lòng nhập tên mục tiêu và số tiền hợp lệ');
      return;
    }

    createGoal({
      title: title.trim(),
      targetAmount: tgt,
      deadline
    });

    setTitle('');
    setRawTarget('');
  };

  return (
    <div className="bottom-sheet-backdrop active show" onClick={() => setIsNewGoalOpen(false)}>
      <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
        <div className="sheet-drag-handle"></div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 14, textAlign: 'center' }}>
          Tạo mục tiêu tài chính mới
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Tên mục tiêu
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Mua iPhone 16 Pro, Du lịch Đà Lạt..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: 14
            }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Số tiền mục tiêu
          </label>
          <input
            type="text"
            placeholder="Ví dụ: 30 triệu, 50.000.000"
            value={rawTarget}
            onChange={e => setRawTarget(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: 14,
              fontWeight: 700
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Hạn hoàn thành
          </label>
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: 13
            }}
          />
        </div>

        <button className="btn-primary" onClick={handleSubmit} type="button">
          Tạo mục tiêu
        </button>
      </div>
    </div>
  );
}
