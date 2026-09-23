import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { parseVND, formatVND } from '@/domain/finance';

const GOAL_PRESETS = [
  { title: 'Mua xe máy', icon: '🏍️', target: 25000000, months: 6 },
  { title: 'Điện thoại mới', icon: '📱', target: 15000000, months: 4 },
  { title: 'Quỹ khẩn cấp', icon: '🛡️', target: 20000000, months: 12 },
  { title: 'Du lịch nghỉ dưỡng', icon: '🏖️', target: 8000000, months: 3 },
  { title: 'Laptop làm việc', icon: '💻', target: 18000000, months: 5 }
];

const GOAL_ICONS = ['🎯', '🏍️', '📱', '💻', '🏖️', '🛡️', '🏠', '🚗', '🎓', '💍', '✈️', '💰'];

function getFutureDate(months = 6) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function formatDisplayDigits(val) {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('vi-VN');
}

function getFriendlyAmountText(num) {
  const n = Number(String(num).replace(/\D/g, '')) || 0;
  if (n <= 0) return '0 VNĐ';
  if (n >= 1000000000) {
    const ty = n / 1000000000;
    return `${Number(ty.toFixed(2)).toLocaleString('vi-VN')} Tỷ VNĐ`;
  }
  if (n >= 1000000) {
    const tr = n / 1000000;
    return `${Number(tr.toFixed(1)).toLocaleString('vi-VN')} Triệu VNĐ`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toLocaleString('vi-VN')} Nghìn VNĐ`;
  }
  return `${n.toLocaleString('vi-VN')} VNĐ`;
}

export default function NewGoalModal() {
  const { isNewGoalOpen, setIsNewGoalOpen, createGoal, showToast } = useFinance();
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [rawTarget, setRawTarget] = useState('10000000');
  const [rawCurrent, setRawCurrent] = useState('0');
  const [deadline, setDeadline] = useState('2026-12-31');
  const [showIconPicker, setShowIconPicker] = useState(false);

  if (!isNewGoalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const tgt = parseVND(rawTarget);
    const cur = parseVND(rawCurrent) || 0;
    if (!title.trim() || !tgt || tgt <= 0) {
      if (showToast) showToast('Vui lòng nhập tên mục tiêu và số tiền hợp lệ', 'error');
      else alert('Vui lòng nhập tên mục tiêu và số tiền hợp lệ');
      return;
    }

    createGoal({
      title: title.trim(),
      icon,
      targetAmount: tgt,
      currentAmount: cur,
      deadline
    });

    setTitle('');
    setIcon('🎯');
    setRawTarget('10000000');
    setRawCurrent('0');
    setShowIconPicker(false);
  };

  const cur = parseVND(rawCurrent) || 0;
  const tgt = parseVND(rawTarget) || 1;
  const pct = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0;
  const remaining = Math.max(0, tgt - cur);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.68)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={() => setIsNewGoalOpen(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-card, #FFFFFF)',
          borderRadius: 24,
          border: '1px solid var(--border-color)',
          padding: 22,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          position: 'relative'
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 4, background: 'linear-gradient(90deg, #10B981, #06B6D4, #3B82F6)', borderRadius: '0 0 8px 8px' }} />

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              title="Đổi biểu tượng"
              onClick={() => setShowIconPicker(!showIconPicker)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'var(--primary-green-light, rgba(16, 185, 129, 0.12))',
                border: '1.5px solid var(--primary-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
              }}
            >
              {icon}
            </button>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-main)', letterSpacing: -0.3 }}>
                Tạo Mục Tiêu Tài Chính
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                Lộ trình tích lũy thông minh và rõ ràng
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsNewGoalOpen(false)}
            style={{
              background: 'var(--bg-card-subtle, #F1F5F9)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              cursor: 'pointer',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        {/* Icon Picker Popover */}
        {showIconPicker && (
          <div
            style={{
              padding: '10px',
              borderRadius: 14,
              background: 'var(--bg-card-subtle, #F8FAFC)',
              border: '1px solid var(--border-color)',
              marginBottom: 14,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center'
            }}
          >
            {GOAL_ICONS.map(ic => (
              <button
                key={ic}
                type="button"
                onClick={() => { setIcon(ic); setShowIconPicker(false); }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: icon === ic ? 'var(--primary-green-light)' : 'var(--bg-card)',
                  border: icon === ic ? '1.5px solid var(--primary-green)' : '1px solid var(--border-color)',
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {ic}
              </button>
            ))}
          </div>
        )}

        {/* Presets */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>💡 Gợi ý mục tiêu nhanh:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {GOAL_PRESETS.map(p => (
              <button
                key={p.title}
                type="button"
                onClick={() => {
                  setTitle(p.title);
                  setIcon(p.icon);
                  setRawTarget(String(p.target));
                  setDeadline(getFutureDate(p.months));
                }}
                style={{
                  padding: '4px 9px',
                  borderRadius: 8,
                  background: title === p.title ? 'var(--primary-green-light)' : 'var(--bg-card-subtle)',
                  border: title === p.title ? '1px solid var(--primary-green)' : '1px solid var(--border-color)',
                  color: title === p.title ? 'var(--primary-green)' : 'var(--text-main)',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>{p.icon}</span>
                <span>{p.title}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 5 }}>
              Tên mục tiêu:
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 12, fontSize: 16 }}>{icon}</span>
              <input
                type="text"
                placeholder="Ví dụ: Mua xe máy, Du lịch Đà Lạt..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="auth-input"
                style={{ width: '100%', height: 42, paddingLeft: 38, paddingRight: 12, fontSize: 13.5, borderRadius: 12 }}
              />
            </div>
          </div>

          {/* Field 2: HERO TARGET AMOUNT INPUT (Số tiền cần đạt) */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
              border: '1.5px solid rgba(16, 185, 129, 0.28)',
              borderRadius: 20,
              padding: '16px 14px',
              marginBottom: 14,
              textAlign: 'center',
              boxShadow: '0 4px 16px -2px rgba(16, 185, 129, 0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, padding: '0 4px' }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--primary-green)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>🎯</span> Số tiền cần đạt (Mục tiêu)
              </span>
              {Number(String(rawTarget).replace(/\D/g, '')) > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--primary-green-light)', color: 'var(--primary-green)', padding: '2px 8px', borderRadius: 20 }}>
                  {getFriendlyAmountText(rawTarget)}
                </span>
              )}
            </div>

            {/* Big Tabular Numeric Input Display */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '6px 0 10px 0' }}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={formatDisplayDigits(rawTarget)}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setRawTarget(val);
                }}
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  textAlign: 'center',
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '78%',
                  color: 'var(--primary-green)',
                  fontFamily: 'inherit',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.5px'
                }}
              />
              <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary-green)', opacity: 0.9 }}>₫</span>
            </div>

            {/* Quick Target Preset Chips */}
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
              {[5000000, 10000000, 20000000, 50000000, 100000000].map(val => {
                const isSelected = String(rawTarget).replace(/\D/g, '') === String(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRawTarget(String(val))}
                    style={{
                      padding: '5px 10px',
                      fontSize: 11.5,
                      borderRadius: 10,
                      background: isSelected ? 'var(--primary-green)' : 'var(--bg-card)',
                      border: isSelected ? '1.5px solid var(--primary-green)' : '1px solid var(--border-color)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-main)',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 800 : 600,
                      boxShadow: isSelected ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {val >= 1000000 ? `${val / 1000000} Triệu` : formatVND(val)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field 3: ĐÃ CÓ SẴN (VỐN BAN ĐẦU) */}
          <div
            style={{
              background: 'var(--bg-card-subtle, #F8FAFC)',
              border: '1px solid var(--border-color)',
              borderRadius: 16,
              padding: '12px 14px',
              marginBottom: 14
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>💰</span> Đã có sẵn (Vốn ban đầu):
              </label>
              {Number(String(rawCurrent).replace(/\D/g, '')) > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {getFriendlyAmountText(rawCurrent)}
                </span>
              )}
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={formatDisplayDigits(rawCurrent)}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setRawCurrent(val);
                }}
                className="auth-input"
                style={{
                  width: '100%',
                  height: 42,
                  paddingLeft: 14,
                  paddingRight: 36,
                  fontSize: 16,
                  fontWeight: 800,
                  borderRadius: 12,
                  fontVariantNumeric: 'tabular-nums'
                }}
              />
              <span style={{ position: 'absolute', right: 14, fontSize: 14, fontWeight: 800, color: 'var(--text-muted)' }}>₫</span>
            </div>

            {/* Quick Current Preset Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {[0, 1000000, 2000000, 5000000, 10000000].map(val => {
                const isSelected = String(rawCurrent).replace(/\D/g, '') === String(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRawCurrent(String(val))}
                    style={{
                      padding: '3px 8px',
                      fontSize: 11,
                      borderRadius: 8,
                      background: isSelected ? 'var(--primary-green-light)' : 'var(--bg-card)',
                      border: isSelected ? '1px solid var(--primary-green)' : '1px solid var(--border-color)',
                      color: isSelected ? 'var(--primary-green)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 800 : 600,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {val === 0 ? '0 đ' : `${val / 1000000}Tr`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>
                Ngày dự kiến hoàn thành:
              </label>
              <span style={{ fontSize: 11, color: 'var(--primary-green)', fontWeight: 700 }}>
                {deadline || 'Chưa đặt'}
              </span>
            </div>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="auth-input"
              style={{ width: '100%', height: 42, padding: '0 12px', fontSize: 13.5, borderRadius: 12 }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {[
                { label: '3 tháng', m: 3 },
                { label: '6 tháng', m: 6 },
                { label: '1 năm', m: 12 },
                { label: 'Cuối 2026', date: '2026-12-31' }
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setDeadline(item.date || getFutureDate(item.m))}
                  style={{
                    padding: '2px 8px',
                    fontSize: 10.5,
                    borderRadius: 6,
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div
            style={{
              background: 'var(--bg-card-subtle, #F8FAFC)',
              borderRadius: 16,
              padding: '12px 14px',
              border: '1px solid var(--border-color)',
              marginBottom: 16
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)' }}>
                  {(title || '').trim() || 'Mục tiêu của bạn'}
                </span>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--primary-green)' }}>
                {pct}%
              </span>
            </div>

            <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 9999, overflow: 'hidden', marginBottom: 6 }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                  borderRadius: 9999,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              <span>Hiện có: <strong style={{ color: 'var(--text-main)' }}>{formatVND(cur)}</strong></span>
              <span>Mục tiêu: <strong style={{ color: 'var(--primary-green)' }}>{formatVND(tgt)}</strong></span>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-primary"
              type="submit"
              style={{
                flex: 1,
                height: 44,
                fontSize: 13.5,
                fontWeight: 800,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <span>✨</span>
              <span>Tạo Mục Tiêu Ngay</span>
            </button>
            <button
              type="button"
              onClick={() => setIsNewGoalOpen(false)}
              style={{
                padding: '0 18px',
                height: 44,
                borderRadius: 12,
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13
              }}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
