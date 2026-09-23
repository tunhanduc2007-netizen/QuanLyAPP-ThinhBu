import React, { useState, useRef } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const {
    data,
    transactions,
    resetAllDataClean,
    restoreData,
    showToast
  } = useFinance();

  const { currentUser, updateUserProfile, logout } = useAuth();

  // 1. Appearance States
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark' ||
      localStorage.getItem('fintrack_theme') === 'dark';
  });

  const [privacyMode, setPrivacyMode] = useState(() => {
    return localStorage.getItem('fintrack_privacy_mode') === 'true';
  });

  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('fintrack_currency') || 'VND';
  });

  const [dateFormat, setDateFormat] = useState(() => {
    return localStorage.getItem('fintrack_date_format') || 'DD/MM/YYYY';
  });

  const [firstDayOfWeek, setFirstDayOfWeek] = useState(() => {
    return localStorage.getItem('fintrack_first_day') || 'mon';
  });

  // 2. Profile Edit States
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(currentUser?.name || 'Từ Nhân Đức');

  // 3. Security (PIN Code) States
  const [pinEnabled, setPinEnabled] = useState(() => {
    return !!localStorage.getItem('fintrack_app_pin');
  });
  const [pinCode, setPinCode] = useState(() => {
    return localStorage.getItem('fintrack_app_pin') || '';
  });
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [inputPin, setInputPin] = useState('');

  // 4. Categories Management States
  const [categoryType, setCategoryType] = useState('expense'); // 'expense' | 'income'
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fintrack_custom_categories') || '{"expense":[],"income":[]}');
    } catch (e) {
      return { expense: [], income: [] };
    }
  });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#10B981');

  // File upload input ref for restoring JSON
  const fileInputRef = useRef(null);

  // Toggle Dark Mode
  const toggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('fintrack_theme', 'dark');
      showToast('Đã kích hoạt Chế độ Tối (Dark Mode)');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('fintrack_theme', 'light');
      showToast('Đã chuyển về Giao diện Sáng (Light Mode)');
    }
  };

  // Toggle Privacy Mode
  const togglePrivacyMode = () => {
    const next = !privacyMode;
    setPrivacyMode(next);
    localStorage.setItem('fintrack_privacy_mode', String(next));
    showToast(next ? 'Đã bật Chế độ Riêng tư (Ẩn số dư)' : 'Đã tắt Chế độ Riêng tư');
  };

  // Save Name
  const handleSaveName = async () => {
    if (!newName.trim()) {
      showToast('Họ và tên không được để trống', 'error');
      return;
    }
    await updateUserProfile({ name: newName.trim() });
    setIsEditingName(false);
    showToast('Đã cập nhật họ và tên thành công');
  };

  // Toggle PIN Lock
  const handleTogglePin = () => {
    if (pinEnabled) {
      localStorage.removeItem('fintrack_app_pin');
      setPinEnabled(false);
      setPinCode('');
      showToast('Đã tắt khóa mã PIN');
    } else {
      setIsSettingPin(true);
      setInputPin('');
    }
  };

  const handleSavePin = () => {
    if (!/^\d{4}$/.test(inputPin)) {
      showToast('Mã PIN phải gồm đúng 4 chữ số', 'error');
      return;
    }
    localStorage.setItem('fintrack_app_pin', inputPin);
    setPinCode(inputPin);
    setPinEnabled(true);
    setIsSettingPin(false);
    showToast('Đã thiết lập mã PIN bảo vệ 4 số thành công');
  };

  // Add Custom Category
  const handleAddCategory = () => {
    if (!newCatName.trim()) {
      showToast('Vui lòng nhập tên danh mục', 'error');
      return;
    }
    const updated = {
      ...customCategories,
      [categoryType]: [
        ...(customCategories[categoryType] || []),
        { id: 'cat-' + Date.now(), title: newCatName.trim(), color: newCatColor }
      ]
    };
    setCustomCategories(updated);
    localStorage.setItem('fintrack_custom_categories', JSON.stringify(updated));
    setNewCatName('');
    setIsAddingCategory(false);
    showToast(`Đã thêm danh mục "${newCatName.trim()}"`);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!transactions || !transactions.length) {
      showToast('Chưa có giao dịch nào để xuất file', 'error');
      return;
    }
    const headers = ['Mã giao dịch', 'Ngày', 'Giờ', 'Loại', 'Số tiền (VND)', 'Danh mục', 'Tài khoản', 'Ghi chú'];
    const rows = transactions.map(t => [
      `"${t.id || ''}"`,
      `"${t.isoDate || ''}"`,
      `"${t.time || ''}"`,
      `"${t.type === 'income' ? 'Thu nhập' : t.type === 'transfer' ? 'Chuyển tiền' : 'Chi tiêu'}"`,
      t.amount || 0,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.account || '').replace(/"/g, '""')}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ]);

    // UTF-8 BOM for Microsoft Excel Vietnamese language compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `fintrack_transactions_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã xuất báo cáo giao dịch CSV thành công');
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    const backupPayload = {
      appName: 'FinTrack Pro',
      version: '2.5.0',
      exportDate: new Date().toISOString(),
      user: currentUser?.name || 'Từ Nhân Đức',
      data: data
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `fintrack_backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã tải tệp sao lưu dữ liệu JSON về máy');
  };

  // Restore JSON Backup
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const restorePayload = parsed.data || parsed;
        if (!restorePayload.wallets || !Array.isArray(restorePayload.transactions)) {
          throw new Error('Định dạng tệp sao lưu FinTrack không hợp lệ.');
        }
        restoreData(restorePayload);
        showToast('Đã khôi phục toàn bộ dữ liệu từ tệp sao lưu!');
      } catch (err) {
        showToast('Lỗi khôi phục: ' + (err.message || 'Tệp không đúng định dạng'), 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Default Categories List
  const defaultExpenseCategories = [
    { title: 'Ăn uống', icon: '🍲', color: '#EF4444' },
    { title: 'Xăng xe', icon: '⛽', color: '#F97316' },
    { title: 'Mua sắm', icon: '🛍️', color: '#EC4899' },
    { title: 'Giải trí', icon: '🎮', color: '#8B5CF6' },
    { title: 'Nhà ở', icon: '🏠', color: '#10B981' },
    { title: 'Sức khỏe', icon: '💊', color: '#06B6D4' },
    { title: 'Học tập', icon: '📚', color: '#3B82F6' },
    { title: 'Khác', icon: '🏷️', color: '#94A3B8' }
  ];

  const defaultIncomeCategories = [
    { title: 'Lương', icon: '💼', color: '#10B981' },
    { title: 'Thưởng', icon: '🎁', color: '#F59E0B' },
    { title: 'Kinh doanh', icon: '🛒', color: '#8B5CF6' },
    { title: 'Đầu tư', icon: '📈', color: '#3B82F6' },
    { title: 'Freelance', icon: '💻', color: '#059669' },
    { title: 'Khác', icon: '🏷️', color: '#94A3B8' }
  ];

  const currentCategories = categoryType === 'expense'
    ? [...defaultExpenseCategories, ...(customCategories.expense || [])]
    : [...defaultIncomeCategories, ...(customCategories.income || [])];

  return (
    <div className="app-screen active" style={{ display: 'block', opacity: 1, transform: 'none', paddingBottom: 90 }}>
      {/* Header Bar */}
      <div className="screen-header-bar" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="screen-header-title" style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            Cài Đặt & Tài Khoản
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Hồ sơ, giao diện, sao lưu dữ liệu & bảo mật
          </p>
        </div>
      </div>

      {/* 1. Profile & Account Card */}
      <div
        className="ui-card"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg, 16px)',
          padding: 16,
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-color)',
          marginBottom: 14
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: 20,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              {(currentUser?.name || 'Từ Nhân Đức').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{currentUser?.name || 'Từ Nhân Đức'}</span>
                <button
                  type="button"
                  onClick={() => setIsEditingName(!isEditingName)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-green)', padding: 0 }}
                  title="Chỉnh sửa họ tên"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {currentUser?.email || (currentUser?.username ? `@${currentUser.username}` : 'tunhanduc6828@gmail.com')}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            type="button"
            style={{
              background: 'var(--accent-red-light, #FEF2F2)',
              color: 'var(--accent-red, #EF4444)',
              border: 'none',
              borderRadius: 'var(--radius-pill, 9999px)',
              padding: '7px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Đăng xuất</span>
          </button>
        </div>

        {/* Edit Name Inline Form */}
        {isEditingName && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border-color)', display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="auth-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nhập họ và tên mới..."
              style={{ flex: 1, height: 38, padding: '0 12px', fontSize: 13 }}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveName}
              style={{ width: 'auto', padding: '0 14px', height: 38, fontSize: 13 }}
            >
              Lưu
            </button>
          </div>
        )}

        {/* Badges row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: 6,
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            Đồng bộ Firestore SSOT
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: 6,
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            🛡️ FinTrack Neobank v2.5
          </span>
        </div>
      </div>

      {/* 2. Appearance & Personalization */}
      <div
        className="ui-card"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg, 16px)',
          padding: 16,
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-color)',
          marginBottom: 14
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-green)' }}>
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <span>Giao diện & Hiển thị</span>
        </div>

        {/* Dark Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle, #F1F5F9)' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>Chế độ tối (Dark Mode)</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Giao diện tối tiết kiệm pin cho màn hình OLED</div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              width: 48,
              height: 28,
              borderRadius: 14,
              border: 'none',
              background: darkMode ? 'var(--primary-green)' : 'var(--bg-card-subtle, #E2E8F0)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s',
              flexShrink: 0
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#FFFFFF',
                position: 'absolute',
                top: 3,
                left: darkMode ? 23 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            />
          </button>
        </div>

        {/* Privacy Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle, #F1F5F9)' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>Chế độ riêng tư (Ẩn số dư)</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Che giấu số tiền bằng •••••• khi ở nơi đông người</div>
          </div>
          <button
            type="button"
            onClick={togglePrivacyMode}
            style={{
              width: 48,
              height: 28,
              borderRadius: 14,
              border: 'none',
              background: privacyMode ? 'var(--primary-green)' : 'var(--bg-card-subtle, #E2E8F0)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s',
              flexShrink: 0
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#FFFFFF',
                position: 'absolute',
                top: 3,
                left: privacyMode ? 23 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            />
          </button>
        </div>

        {/* Currency & Date Format Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Đơn vị tiền tệ
            </label>
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                localStorage.setItem('fintrack_currency', e.target.value);
                showToast(`Đã chọn đơn vị tiền tệ: ${e.target.value}`);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm, 10px)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-app)',
                color: 'var(--text-main)',
                fontSize: 12.5,
                fontWeight: 600
              }}
            >
              <option value="VND">VND (₫)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Định dạng ngày
            </label>
            <select
              value={dateFormat}
              onChange={(e) => {
                setDateFormat(e.target.value);
                localStorage.setItem('fintrack_date_format', e.target.value);
                showToast(`Đã chọn định dạng ngày: ${e.target.value}`);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm, 10px)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-app)',
                color: 'var(--text-main)',
                fontSize: 12.5,
                fontWeight: 600
              }}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Categories Management */}
      <div
        className="ui-card"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg, 16px)',
          padding: 16,
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-color)',
          marginBottom: 14
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-green)' }}>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span>Quản lý danh mục</span>
          </div>

          {/* Switch Type Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-card-subtle, #F1F5F9)', padding: 3, borderRadius: 8, gap: 2 }}>
            <button
              type="button"
              onClick={() => setCategoryType('expense')}
              style={{
                border: 'none',
                background: categoryType === 'expense' ? 'var(--bg-card)' : 'transparent',
                color: categoryType === 'expense' ? 'var(--accent-red)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: 11.5,
                padding: '4px 10px',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Chi tiêu
            </button>
            <button
              type="button"
              onClick={() => setCategoryType('income')}
              style={{
                border: 'none',
                background: categoryType === 'income' ? 'var(--bg-card)' : 'transparent',
                color: categoryType === 'income' ? 'var(--primary-green)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: 11.5,
                padding: '4px 10px',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Thu nhập
            </button>
          </div>
        </div>

        {/* Categories Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {currentCategories.map((c, idx) => (
            <div
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 8,
                background: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-main)'
              }}
            >
              <span style={{ fontSize: 13 }}>{c.icon || '🏷️'}</span>
              <span>{c.title}</span>
            </div>
          ))}
        </div>

        {/* Add Category Trigger / Form */}
        {!isAddingCategory ? (
          <button
            type="button"
            onClick={() => setIsAddingCategory(true)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px dashed var(--border-color)',
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--primary-green)',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Thêm danh mục mới</span>
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="text"
              className="auth-input"
              placeholder="Tên danh mục (ví dụ: Du lịch, Thú cưng)..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              style={{ flex: 1, height: 38, padding: '0 10px', fontSize: 12.5 }}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleAddCategory}
              style={{ width: 'auto', padding: '0 14px', height: 38, fontSize: 12.5 }}
            >
              Thêm
            </button>
            <button
              type="button"
              onClick={() => setIsAddingCategory(false)}
              style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0 10px', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              Hủy
            </button>
          </div>
        )}
      </div>

      {/* 4. Data Management & Backups (Open Source Standard) */}
      <div
        className="ui-card"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg, 16px)',
          padding: 16,
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-color)',
          marginBottom: 14
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-green)' }}>
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          <span>Dữ liệu & Sao lưu (Open Source Standard)</span>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
          Tự do xuất file Excel/CSV, sao lưu và khôi phục toàn vẹn dữ liệu
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: 10,
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div>Xuất dữ liệu Excel / CSV</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>UTF-8 chuẩn mở tiếng Việt trên Microsoft Excel</div>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          {/* Backup JSON */}
          <button
            type="button"
            onClick={handleExportJSON}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: 10,
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#CFFAFE', color: '#0891B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div>Sao lưu toàn bộ Sổ Cái (JSON)</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Lưu giữ toàn bộ giao dịch, ví, ngân sách & mục tiêu</div>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          {/* Restore JSON */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: 10,
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F3E8FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div>Khôi phục từ tệp sao lưu (.json)</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Nhập lại dữ liệu khi đổi điện thoại hoặc cài lại app</div>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* 5. Security & App PIN Lock */}
      <div
        className="ui-card"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg, 16px)',
          padding: 16,
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-color)',
          marginBottom: 14
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-green)' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Bảo mật & Mã khóa</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>Khóa mã PIN 4 số</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {pinEnabled ? 'Đang bật bảo vệ mã PIN' : 'Bảo vệ quyền truy cập khi mở ứng dụng'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleTogglePin}
            style={{
              width: 48,
              height: 28,
              borderRadius: 14,
              border: 'none',
              background: pinEnabled ? 'var(--primary-green)' : 'var(--bg-card-subtle, #E2E8F0)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s',
              flexShrink: 0
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#FFFFFF',
                position: 'absolute',
                top: 3,
                left: pinEnabled ? 23 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            />
          </button>
        </div>

        {/* Set PIN prompt */}
        {isSettingPin && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--border-color)', display: 'flex', gap: 8 }}>
            <input
              type="password"
              maxLength={4}
              placeholder="Nhập 4 số PIN..."
              className="auth-input"
              value={inputPin}
              onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
              style={{ flex: 1, height: 38, padding: '0 12px', fontSize: 14, textAlign: 'center', letterSpacing: 4 }}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleSavePin}
              style={{ width: 'auto', padding: '0 14px', height: 38, fontSize: 13 }}
            >
              Lưu mã
            </button>
            <button
              type="button"
              onClick={() => setIsSettingPin(false)}
              style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0 10px', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              Hủy
            </button>
          </div>
        )}
      </div>

      {/* 6. Danger Zone */}
      <div
        className="ui-card"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg, 16px)',
          padding: 16,
          boxShadow: 'var(--shadow-card)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          marginBottom: 14
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--accent-red)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Vùng nguy hiểm (Danger Zone)</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
          Xóa toàn bộ giao dịch và thiết lập lại số dư Sổ Cái về trạng thái 0đ ban đầu. Dữ liệu sau khi xóa sẽ không thể phục hồi nếu chưa sao lưu.
        </p>
        <button
          type="button"
          onClick={() => {
            if (confirm('⚠️ CẢNH BÁO: Bạn có chắc chắn muốn làm sạch toàn bộ giao dịch và đưa số dư về 0đ?')) {
              resetAllDataClean();
            }
          }}
          style={{
            width: '100%',
            background: 'var(--accent-red-light, #FEF2F2)',
            color: 'var(--accent-red, #EF4444)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: 12,
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          <span>Xóa dữ liệu & Bắt đầu lại (0đ)</span>
        </button>
      </div>

      {/* 7. Open Source About & Credits */}
      <div
        style={{
          textAlign: 'center',
          padding: '16px 12px',
          color: 'var(--text-muted)',
          fontSize: 12,
          lineHeight: 1.6
        }}
      >
        <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: 13, marginBottom: 2 }}>
          FinTrack Pro — Phiên bản 2.5.0
        </div>
        <div>Kiến trúc Sổ Cái SSOT & Quản lý Tài chính Mã Nguồn Mở</div>
        <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-sub)' }}>
          Lấy cảm hứng từ cộng đồng <em>Actual Budget</em>, <em>Cashew</em>, <em>Paisa</em> & <em>Firefly III</em>
        </div>
        <div style={{ marginTop: 6, fontSize: 11 }}>
          Giấy phép mã nguồn mở MIT License
        </div>
      </div>
    </div>
  );
}
