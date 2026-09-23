import React from 'react';
import { useFinance } from '@/context/FinanceContext';

export default function Toast() {
  const { toast } = useFinance();

  if (!toast.show) return null;

  return (
    <div className="toast-msg show" id="toastMsg" style={{ display: 'flex' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: toast.type === 'error' ? 'var(--accent-red)' : 'var(--primary-green)' }}>
        {toast.type === 'error' ? (
          <>
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </>
        ) : (
          <>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </>
        )}
      </svg>
      <span id="toastText">{toast.message}</span>
    </div>
  );
}
