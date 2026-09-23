import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { formatVND, parseVND } from '@/domain/finance';

export default function TransferModal() {
  const { isTransferOpen, setIsTransferOpen, executeTransfer, wallets } = useFinance();
  const [fromAccount, setFromAccount] = useState('Tiền mặt');
  const [toAccount, setToAccount] = useState('Ngân hàng');
  const [rawAmount, setRawAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isTransferOpen) return null;

  const handleFromChange = (e) => {
    const val = e.target.value;
    setFromAccount(val);
    setToAccount(val === 'Tiền mặt' ? 'Ngân hàng' : 'Tiền mặt');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseVND(rawAmount);
    if (!amt || amt <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    setIsSubmitting(true);
    const result = await executeTransfer(fromAccount, toAccount, amt);
    setIsSubmitting(false);

    if (result.success) {
      setRawAmount('');
      setIsTransferOpen(false);
    }
  };

  const fromAccObj = wallets.accounts.find(a => a.name === fromAccount);

  return (
    <div className="bottom-sheet-backdrop show active" onClick={() => setIsTransferOpen(false)}>
      <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
        <div className="sheet-drag-handle"></div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 16, textAlign: 'center' }}>
          Chuyển tiền giữa các ví
        </div>

        {/* From Account */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Từ ví
          </label>
          <select
            value={fromAccount}
            onChange={handleFromChange}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            <option value="Tiền mặt">Tiền mặt ({formatVND(wallets.accounts.find(a => a.name === 'Tiền mặt')?.balance || 0)})</option>
            <option value="Ngân hàng">Ngân hàng ({formatVND(wallets.accounts.find(a => a.name === 'Ngân hàng')?.balance || 0)})</option>
          </select>
        </div>

        {/* To Account */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Đến ví
          </label>
          <select
            value={toAccount}
            onChange={e => setToAccount(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            <option value="Ngân hàng">Ngân hàng ({formatVND(wallets.accounts.find(a => a.name === 'Ngân hàng')?.balance || 0)})</option>
            <option value="Tiền mặt">Tiền mặt ({formatVND(wallets.accounts.find(a => a.name === 'Tiền mặt')?.balance || 0)})</option>
          </select>
        </div>

        {/* Transfer Amount */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Số tiền chuyển
          </label>
          <input
            type="text"
            placeholder="Ví dụ: 200k, 500.000"
            value={rawAmount}
            onChange={e => setRawAmount(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: 15,
              fontWeight: 700
            }}
          />
          {fromAccObj && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Số dư khả dụng: {formatVND(fromAccObj.balance)}
            </div>
          )}
        </div>

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          type="button"
          style={{ background: '#3B82F6' }}
        >
          {isSubmitting ? 'Đang xử lý...' : 'Xác nhận chuyển'}
        </button>
      </div>
    </div>
  );
}
