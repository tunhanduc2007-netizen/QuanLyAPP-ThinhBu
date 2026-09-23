import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { formatVND } from '@/domain/finance';

export default function AIProposalModal() {
  const {
    isAIProposalOpen,
    setIsAIProposalOpen,
    aiProposals,
    confirmAITransactions
  } = useFinance();

  const [selectedIndices, setSelectedIndices] = useState(() => {
    return (aiProposals || []).map((_, idx) => idx);
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isAIProposalOpen || !aiProposals || aiProposals.length === 0) return null;

  const toggleSelect = (index) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleConfirm = async () => {
    const selected = aiProposals.filter((_, idx) => selectedIndices.includes(idx));
    if (selected.length === 0) {
      alert('Vui lòng chọn ít nhất 1 giao dịch để ghi vào Sổ Cái');
      return;
    }

    setSubmitting(true);
    await confirmAITransactions(selected);
    setSubmitting(false);
  };

  return (
    <div className="bottom-sheet-backdrop" style={{ display: 'flex' }} onClick={() => setIsAIProposalOpen(false)}>
      <div className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="sheet-drag-handle"></div>

        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', textAlign: 'center', marginBottom: 4 }}>
          Xác nhận đề xuất từ AI
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 14 }}>
          Kiểm tra kỹ trước khi ghi vào Sổ Cái (Ledger SSOT). Bạn toàn quyền quyết định.
        </p>

        {/* Proposals List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {aiProposals.map((item, idx) => {
            const isSelected = selectedIndices.includes(idx);
            const isIncome = item.type === 'income';

            return (
              <div
                key={idx}
                onClick={() => toggleSelect(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '1.5px solid var(--primary-green)' : '1px solid var(--border-color)',
                  background: isSelected ? 'var(--primary-green-light)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {/* Custom Checkbox */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    border: isSelected ? 'none' : '1.5px solid var(--border-color)',
                    background: isSelected ? 'var(--primary-green)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}
                >
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                      {item.category || (isIncome ? 'Thu nhập' : 'Chi tiêu')}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: isIncome ? 'var(--primary-green)' : 'var(--accent-red)' }}>
                      {isIncome ? '+' : '-'}{formatVND(item.amount)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{item.description || item.note || 'Không có mô tả'}</span>
                    <span>{item.account || 'Ngân hàng'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setIsAIProposalOpen(false)}
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              color: 'var(--text-main)'
            }}
          >
            Hủy bỏ
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={submitting}
            type="button"
          >
            {submitting ? 'Đang ghi Sổ Cái...' : `Ghi ${selectedIndices.length} giao dịch`}
          </button>
        </div>
      </div>
    </div>
  );
}
