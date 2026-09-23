import React from 'react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';

export default function FriendQrModal() {
  const { isFriendQrOpen, setIsFriendQrOpen, showToast } = useFinance();
  const { currentUser } = useAuth();

  if (!isFriendQrOpen) return null;

  const friendTag = '@' + (currentUser?.uid ? currentUser.uid.slice(0, 8) : 'user');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(friendTag)}`;

  const handleCopyTag = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(friendTag);
      showToast('Đã sao chép mã kết bạn');
    }
  };

  return (
    <div className="bottom-sheet-backdrop show active" onClick={() => setIsFriendQrOpen(false)}>
      <div className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <div className="sheet-drag-handle"></div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
          Mã QR Kết Bạn
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
          Đưa mã này để bạn bè quét và kết bạn tức thì
        </p>

        <div style={{ display: 'inline-block', padding: 12, background: '#FFFFFF', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', marginBottom: 12 }}>
          <img src={qrUrl} alt="QR Code" style={{ width: 170, height: 170, display: 'block', borderRadius: 8 }} />
        </div>

        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary-green)', marginBottom: 4 }}>
          {currentUser?.name || 'Người dùng'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          {friendTag}
        </div>

        <button
          className="btn-primary"
          onClick={handleCopyTag}
          type="button"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
          <span>Sao chép ID kết bạn</span>
        </button>
      </div>
    </div>
  );
}
