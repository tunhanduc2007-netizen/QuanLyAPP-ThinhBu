import React, { useState, useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { formatVND } from '@/domain/finance';

export default function TransactionsPage() {
  const { transactions, deleteTransaction, txFilter, setTxFilter } = useFinance();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTxs = useMemo(() => {
    return transactions.filter(tx => {
      // Type filter
      if (txFilter !== 'all' && tx.type !== txFilter) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cat = (tx.category || '').toLowerCase();
        const note = (tx.note || '').toLowerCase();
        const acc = (tx.account || '').toLowerCase();
        const amtStr = String(tx.amount || '');
        if (!cat.includes(q) && !note.includes(q) && !acc.includes(q) && !amtStr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, txFilter, searchQuery]);

  return (
    <div className="app-screen active" style={{ display: 'block', opacity: 1, transform: 'none' }}>
      {/* Header */}
      <div className="screen-header-bar">
        <div className="screen-header-title">Sổ Cái Giao Dịch</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
          {filteredTxs.length} mục
        </span>
      </div>

      {/* Search Input */}
      <div className="search-input-wrap">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          type="text"
          className="search-input-field"
          placeholder="Tìm theo nội dung, danh mục, số tiền..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="filter-dropdowns-row">
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'expense', label: 'Chi tiêu' },
          { id: 'income', label: 'Thu nhập' },
          { id: 'transfer', label: 'Chuyển tiền' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            className="filter-dropdown-btn"
            onClick={() => setTxFilter(tab.id)}
            style={{
              background: txFilter === tab.id ? 'var(--primary-green)' : 'var(--bg-card)',
              color: txFilter === tab.id ? '#FFFFFF' : 'var(--text-muted)',
              border: txFilter === tab.id ? 'none' : '1px solid var(--border-color)',
              fontWeight: txFilter === tab.id ? 800 : 600
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {filteredTxs.length > 0 ? (
          filteredTxs.map(tx => {
            const isIncome = tx.type === 'income';
            const isTransfer = tx.type === 'transfer';

            return (
              <div
                key={tx.id}
                className="ui-card"
                style={{
                  margin: 0,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: isTransfer ? 'var(--accent-blue-light)' : isIncome ? 'var(--primary-green-light)' : 'var(--accent-red-light)',
                      color: isTransfer ? 'var(--accent-blue)' : isIncome ? 'var(--primary-green)' : 'var(--accent-red)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 14
                    }}
                  >
                    {isTransfer ? '⇄' : isIncome ? '+' : '-'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>
                      {tx.category || (isTransfer ? 'Chuyển tiền' : isIncome ? 'Thu nhập' : 'Chi tiêu')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {tx.note || tx.account} • {tx.isoDate}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: isTransfer ? 'var(--accent-blue)' : isIncome ? 'var(--primary-green)' : 'var(--accent-red)'
                      }}
                    >
                      {isTransfer ? '' : isIncome ? '+' : '-'}{formatVND(tx.amount)}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                      {tx.account}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Bạn có chắc muốn xóa giao dịch này?')) {
                        deleteTransaction(tx.id);
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 4
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="ui-card" style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>
            Không tìm thấy giao dịch nào phù hợp.
          </div>
        )}
      </div>
    </div>
  );
}
