import React from 'react';
import { useFinance } from '@/context/FinanceContext';

/**
 * AIAssistantFab (Magic UI & Liquid Glass inspired)
 * Floating Action Button for opening the AI Assistant with rotating shimmer border
 * and spring tactile micro-interaction.
 */
export default function AIAssistantFab() {
  const { setIsAIAssistantOpen } = useFinance();

  return (
    <button
      type="button"
      className="ai-shimmer-fab"
      onClick={() => setIsAIAssistantOpen(true)}
      title="Trợ lý AI FinTrack (Nói / Quét bill / Gõ tự nhiên)"
      aria-label="Mở Trợ lý AI"
    >
      {/* 360 rotating conic shimmer beam */}
      <span className="ai-shimmer-beam" />

      {/* Inner glass button core */}
      <div className="ai-fab-inner">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ai-fab-icon"
        >
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
        </svg>
        <span className="ai-fab-text">AI</span>
      </div>
    </button>
  );
}
