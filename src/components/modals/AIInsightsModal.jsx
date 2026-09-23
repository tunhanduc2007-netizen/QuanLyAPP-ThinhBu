import React from 'react';
import { useFinance } from '@/context/FinanceContext';
import { formatVND } from '@/domain/finance';

export default function AIInsightsModal() {
  const { isAIInsightsOpen, setIsAIInsightsOpen, aiInsightsData } = useFinance();

  if (!isAIInsightsOpen || !aiInsightsData) return null;

  const score = aiInsightsData.financialHealthScore || 85;
  const recommendations = aiInsightsData.recommendations || [];
  const metrics = aiInsightsData.metrics || {};

  return (
    <div className="bottom-sheet-backdrop" style={{ display: 'flex' }} onClick={() => setIsAIInsightsOpen(false)}>
      <div className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="sheet-drag-handle"></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>Báo Cáo Sức Khỏe Tài Chính</span>
          </div>
          <button
            onClick={() => setIsAIInsightsOpen(false)}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Health Score Card */}
        <div style={{ background: 'linear-gradient(135deg, #059669 0%, #0D9488 55%, #0284C7 100%)', borderRadius: 'var(--radius-lg)', padding: 18, color: '#fff', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>ĐIỂM SỨC KHỎE TÀI CHÍNH</div>
              <div style={{ fontSize: 32, fontWeight: 800, marginTop: 2 }}>{score}<span style={{ fontSize: 18 }}>/100</span></div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 700 }}>
              {score >= 80 ? 'Rất Tốt' : score >= 60 ? 'Ổn Định' : 'Cần Chú Ý'}
            </div>
          </div>
          <p style={{ fontSize: 12.5, opacity: 0.9, marginTop: 8, lineHeight: 1.4 }}>
            {aiInsightsData.summary || 'Tài chính của bạn đang vận hành ổn định với tỷ lệ chi tiêu an toàn.'}
          </p>
        </div>

        {/* Key Metrics 3-Cols */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          <div style={{ background: 'var(--bg-card-subtle)', padding: 10, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dòng tiền ròng</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary-green)', marginTop: 4 }}>
              {formatVND(metrics.netSavings || 0)}
            </div>
          </div>
          <div style={{ background: 'var(--bg-card-subtle)', padding: 10, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tỷ lệ tiết kiệm</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#3B82F6', marginTop: 4 }}>
              {metrics.savingsRate || 0}%
            </div>
          </div>
          <div style={{ background: 'var(--bg-card-subtle)', padding: 10, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mức cảnh báo</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: (metrics.budgetBurnRate || 0) > 90 ? 'var(--accent-red)' : 'var(--primary-green)', marginTop: 4 }}>
              {metrics.budgetBurnRate || 0}%
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>
            Gợi ý hành động tối ưu
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recommendations.length > 0 ? (
              recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    fontSize: 12.5,
                    lineHeight: 1.4,
                    color: 'var(--text-main)'
                  }}
                >
                  <span style={{ color: 'var(--primary-green)', fontWeight: 800 }}>✓</span>
                  <span>{rec}</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Chưa có đủ dữ liệu lịch sử để sinh gợi ý chi tiết.
              </div>
            )}
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={() => setIsAIInsightsOpen(false)}
          type="button"
          style={{ background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
        >
          Đóng báo cáo
        </button>
      </div>
    </div>
  );
}
