import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { aiService } from '@/services/aiService';

const SUGGESTIONS = [
  'Hôm nay ăn phở 45k, đổ xăng 50k',
  'Cà phê sáng 35k tiền mặt',
  'Đi siêu thị WinMart hết 320k qua ngân hàng',
  'Nhận tiền freelance 2.5 triệu vào ngân hàng',
  'Ăn tối lẩu bò 280k với bạn'
];

export default function AIAssistantModal() {
  const {
    isAIAssistantOpen,
    setIsAIAssistantOpen,
    setIsAIProposalOpen,
    setAiProposals,
    showToast
  } = useFinance();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAIAssistantOpen) return null;

  const handleExtract = async (textToExtract) => {
    const query = (textToExtract || prompt).trim();
    if (!query) {
      alert('Vui lòng nhập câu mô tả chi tiêu');
      return;
    }

    setLoading(true);
    try {
      const result = await aiService.parseExpense(query);
      if (result && result.proposals && result.proposals.length > 0) {
        setAiProposals(result.proposals);
        setIsAIAssistantOpen(false);
        setIsAIProposalOpen(true);
      } else {
        showToast('Không trích xuất được giao dịch từ câu này', 'error');
      }
    } catch (err) {
      console.warn('AI Extract error:', err);
      showToast('Lỗi khi phân tích bằng AI: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await aiService.parseReceiptImage(file);
      if (result && result.proposal) {
        setAiProposals([result.proposal]);
        setIsAIAssistantOpen(false);
        setIsAIProposalOpen(true);
      } else {
        showToast('Không nhận diện được số tiền trong hóa đơn', 'error');
      }
    } catch (err) {
      showToast('Lỗi quét hóa đơn: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bottom-sheet-backdrop" style={{ display: 'flex' }} onClick={() => setIsAIAssistantOpen(false)}>
      <div className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="sheet-drag-handle"></div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
            </svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>AI Trợ Lý Tài Chính</span>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 14 }}>
          Mô tả thu/chi tự nhiên bằng tiếng Việt hoặc quét ảnh hóa đơn
        </p>

        {/* Text Input */}
        <div style={{ marginBottom: 12 }}>
          <textarea
            rows={3}
            placeholder="Ví dụ: Hôm nay ăn trưa 45k, uống trà sữa 35k tiền mặt, nhận lương 15tr..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: 13.5,
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Suggestion Chips */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Gợi ý nhập nhanh
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(s);
                  handleExtract(s);
                }}
                style={{
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '5px 10px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* OCR Button & Extract Button */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginTop: 16 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: 'var(--bg-card)',
              border: '1.5px dashed var(--primary-green)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 6px',
              fontSize: 12.5,
              fontWeight: 700,
              color: 'var(--primary-green)',
              cursor: 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <span>Ảnh hóa đơn</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>

          <button
            className="btn-primary"
            onClick={() => handleExtract()}
            disabled={loading}
            type="button"
            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' }}
          >
            {loading ? 'Đang phân tích...' : 'Trích xuất giao dịch'}
          </button>
        </div>
      </div>
    </div>
  );
}
