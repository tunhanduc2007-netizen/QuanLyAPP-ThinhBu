import React, { useState, useRef } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';
import { formatVND } from '@/domain/finance';

export default function SettingsPage() {
  const { transactions, showToast, setActiveTab } = useFinance();
  const { currentUser, updateUserProfile, changePassword, logout } = useAuth();

  // 1. Appearance States
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark' ||
      localStorage.getItem('fintrack_theme') === 'dark';
  });

  const [privacyMode, setPrivacyMode] = useState(() => {
    return localStorage.getItem('fintrack_privacy_mode') === 'true';
  });

  // 2. Profile & Avatar Edit States
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(currentUser?.name || 'Từ Nhân Đức');
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // 3. Security (PIN Code, Biometrics, Auto-Lock) States
  const [pinEnabled, setPinEnabled] = useState(() => {
    return !!localStorage.getItem('fintrack_app_pin');
  });
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [inputPin, setInputPin] = useState('');

  const [biometricsEnabled, setBiometricsEnabled] = useState(() => {
    return localStorage.getItem('fintrack_biometrics') === 'true';
  });

  const [autoLockTime, setAutoLockTime] = useState(() => {
    return localStorage.getItem('fintrack_auto_lock') || '5min';
  });

  // 4. Change Password States
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  // 5. Financial Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);

  // Calculate live financial figures
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.min(100, Math.round((netSavings / totalIncome) * 100))) : 0;

  // Breakdown expense by category
  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const cat = t.category || 'Khác';
      acc[cat] = (acc[cat] || 0) + (Number(t.amount) || 0);
      return acc;
    }, {});

  const sortedCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1]);

  // Toggle Theme
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

  // Toggle Privacy
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

  // Change Avatar Preset
  const handleSelectAvatar = async (avatarUrl) => {
    await updateUserProfile({ avatar: avatarUrl });
    setIsPickingAvatar(false);
    showToast('Đã cập nhật ảnh đại diện thành công');
  };

  // Custom Avatar Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Vui lòng chọn ảnh dung lượng dưới 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target.result;
      await updateUserProfile({ avatar: base64 });
      setIsPickingAvatar(false);
      showToast('Đã tải ảnh đại diện lên thành công');
    };
    reader.readAsDataURL(file);
  };

  // Toggle PIN
  const handleTogglePin = () => {
    if (pinEnabled) {
      localStorage.removeItem('fintrack_app_pin');
      setPinEnabled(false);
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
    setPinEnabled(true);
    setIsSettingPin(false);
    setInputPin('');
    showToast('Đã kích hoạt khóa bảo vệ mã PIN 4 số');
  };

  // Toggle Biometrics
  const handleToggleBiometrics = () => {
    const next = !biometricsEnabled;
    setBiometricsEnabled(next);
    localStorage.setItem('fintrack_biometrics', String(next));
    showToast(next ? 'Đã bật xác thực FaceID / Vân tay' : 'Đã tắt xác thực sinh trắc học');
  };

  // Change Auto-Lock duration
  const handleChangeAutoLock = (val) => {
    setAutoLockTime(val);
    localStorage.setItem('fintrack_auto_lock', val);
    showToast('Đã cập nhật thời gian tự động khóa');
  };

  // Submit Password Change
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp', 'error');
      return;
    }

    setPassLoading(true);
    try {
      if (changePassword) {
        await changePassword(oldPassword, newPassword);
      }
      showToast('Đổi mật khẩu thành công!');
      setIsChangingPassword(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.message || 'Không thể đổi mật khẩu', 'error');
    } finally {
      setPassLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!transactions || transactions.length === 0) {
      showToast('Chưa có giao dịch nào để xuất file', 'error');
      return;
    }

    const headers = ['Mã GD', 'Ngày', 'Giờ', 'Loại GD', 'Danh mục', 'Số tiền (VNĐ)', 'Ví thanh toán', 'Ghi chú'];
    const rows = transactions.map(tx => [
      `"${tx.id || ''}"`,
      `"${tx.isoDate || ''}"`,
      `"${tx.time || ''}"`,
      `"${tx.type === 'income' ? 'Thu nhập' : tx.type === 'expense' ? 'Chi tiêu' : 'Chuyển tiền'}"`,
      `"${tx.category || ''}"`,
      `"${tx.amount || 0}"`,
      `"${tx.account || 'Tiền mặt'}"`,
      `"${(tx.note || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FinTrack_GiaoDich_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã xuất file Excel/CSV thành công');
  };

  return (
    <div className="app-screen active" style={{ display: 'block', opacity: 1, transform: 'none', paddingBottom: 90 }}>
      {/* Content Constraint Container for clean desktop & mobile display */}
      <div style={{ maxWidth: 580, margin: '0 auto', width: '100%' }}>
        {/* Header Bar */}
        <div className="screen-header-bar" style={{ marginBottom: 16 }}>
          <div>
            <h1 className="screen-header-title" style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
              Cài Đặt & Tài Khoản
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Hồ sơ, giao diện hiển thị, bảo mật & báo cáo
            </p>
          </div>
        </div>

        {/* 1. Profile & Account Card with Custom Avatar */}
        <div
          className="ui-card"
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg, 16px)',
            padding: 18,
            boxShadow: 'var(--shadow-card)',
            border: '1px solid var(--border-color)',
            marginBottom: 14
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Avatar Container with change button */}
              <div style={{ position: 'relative' }}>
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser?.name || 'Avatar'}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--primary-green)',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 52,
                      height: 52,
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
                )}
                {/* Camera / Edit avatar badge */}
                <button
                  type="button"
                  onClick={() => setIsPickingAvatar(!isPickingAvatar)}
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--text-main)',
                    color: 'var(--bg-main)',
                    border: '2px solid var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="Thay đổi ảnh đại diện"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
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

          {/* Avatar Picker Panel */}
          {isPickingAvatar && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px dashed var(--border-color)',
                animation: 'fadeIn 0.2s ease-in-out'
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
                Chọn ảnh đại diện phong cách 3D hoặc tải từ máy:
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                {/* Preset 1: 3D Male Avatar */}
                <div
                  onClick={() => handleSelectAvatar('/images/avatar_1.jpg')}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 12,
                    padding: 3,
                    border: currentUser?.avatar === '/images/avatar_1.jpg' ? '2px solid var(--primary-green)' : '2px solid transparent',
                    background: 'var(--bg-card-subtle, #F8FAFC)',
                    textAlign: 'center'
                  }}
                  title="3D Tech Professional"
                >
                  <img
                    src="/images/avatar_1.jpg"
                    alt="3D Avatar Nam"
                    style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', display: 'block' }}
                  />
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Nam 3D</span>
                </div>

                {/* Preset 2: 3D Female Avatar */}
                <div
                  onClick={() => handleSelectAvatar('/images/avatar_2.jpg')}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 12,
                    padding: 3,
                    border: currentUser?.avatar === '/images/avatar_2.jpg' ? '2px solid var(--primary-green)' : '2px solid transparent',
                    background: 'var(--bg-card-subtle, #F8FAFC)',
                    textAlign: 'center'
                  }}
                  title="3D Financial Manager"
                >
                  <img
                    src="/images/avatar_2.jpg"
                    alt="3D Avatar Nữ"
                    style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', display: 'block' }}
                  />
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Nữ 3D</span>
                </div>

                {/* Preset 3: Monogram Default */}
                <div
                  onClick={() => handleSelectAvatar('')}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 12,
                    padding: 3,
                    border: !currentUser?.avatar ? '2px solid var(--primary-green)' : '2px solid transparent',
                    background: 'var(--bg-card-subtle, #F8FAFC)',
                    textAlign: 'center'
                  }}
                  title="Chữ cái mặc định"
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 22
                    }}
                  >
                    {(currentUser?.name || 'Từ Nhân Đức').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Mặc định</span>
                </div>

                {/* Custom File Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 62,
                    height: 72,
                    borderRadius: 12,
                    border: '1.5px dashed var(--border-color)',
                    background: 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: 10,
                    fontWeight: 600
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Tải ảnh</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. RICH FINANCIAL REPORT VISUAL CARD */}
        <div
          className="ui-card"
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg, 16px)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid var(--border-color)',
            marginBottom: 14
          }}
        >
          {/* 3D Fintech Visual Banner */}
          <div style={{ position: 'relative', width: '100%', height: 160, overflow: 'hidden' }}>
            <img
              src="/images/fintech_report_banner.jpg"
              alt="Báo cáo tài chính 3D"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
            {/* Gradient Overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.2) 0%, rgba(15, 23, 42, 0.85) 100%)'
              }}
            />
            {/* Header Content on Banner */}
            <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16, color: '#FFFFFF' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: 'rgba(16, 185, 129, 0.3)', backdropFilter: 'blur(8px)', border: '1px solid rgba(16, 185, 129, 0.4)', fontSize: 10.5, fontWeight: 700, marginBottom: 4, color: '#6EE7B7' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                <span>Báo Cáo Sổ Cái Trực Quan</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                Tổng Quan & Báo Cáo Tài Chính
              </div>
            </div>
          </div>

          {/* Report Summary Body */}
          <div style={{ padding: 16 }}>
            {/* 3 KPI Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
              <div style={{ background: 'var(--bg-card-subtle, #F8FAFC)', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>Tổng Thu</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--accent-green, #10B981)', marginTop: 2 }}>
                  {formatVND(totalIncome)}
                </div>
              </div>
              <div style={{ background: 'var(--bg-card-subtle, #F8FAFC)', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>Tổng Chi</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--accent-red, #EF4444)', marginTop: 2 }}>
                  {formatVND(totalExpense)}
                </div>
              </div>
              <div style={{ background: 'var(--bg-card-subtle, #F8FAFC)', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>Tiết Kiệm Ròng</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: netSavings >= 0 ? 'var(--primary-green)' : 'var(--accent-red)', marginTop: 2 }}>
                  {formatVND(netSavings)}
                </div>
              </div>
            </div>

            {/* Savings Rate Progress Meter */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-main)' }}>Tỷ lệ tích lũy / tiết kiệm:</span>
                <span style={{ color: savingsRate >= 20 ? 'var(--primary-green)' : '#F59E0B' }}>
                  {savingsRate}% {savingsRate >= 20 ? '• Lý tưởng' : '• Cần cải thiện'}
                </span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'var(--bg-card-subtle, #E2E8F0)', borderRadius: 9999, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${savingsRate}%`,
                    height: '100%',
                    background: savingsRate >= 20 ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)' : 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)',
                    borderRadius: 9999,
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
            </div>

            {/* Action Buttons: Open Report & Export */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span>Xem Báo Cáo Chi Tiết</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                title="Xuất file Excel"
                style={{
                  padding: '11px 14px',
                  borderRadius: 12,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card-subtle, #F8FAFC)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-green)' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 3. CHANGE PASSWORD CARD (ĐỔI MẬT KHẨU) */}
        <div
          className="ui-card"
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg, 16px)',
            padding: 18,
            boxShadow: 'var(--shadow-card)',
            border: '1px solid var(--border-color)',
            marginBottom: 14
          }}
        >
          <div
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-main)' }}>Đổi Mật Khẩu Đăng Nhập</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Cập nhật mật khẩu bảo vệ tài khoản của bạn</div>
              </div>
            </div>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transform: isChangingPassword ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* Change Password Form Accordion */}
          {isChangingPassword && (
            <form onSubmit={handleChangePasswordSubmit} style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
              {/* Old Password */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                  Mật khẩu hiện tại:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    className="auth-input"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại..."
                    style={{ width: '100%', height: 40, padding: '0 38px 0 12px', fontSize: 13 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    style={{ position: 'absolute', right: 10, top: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {showOldPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                  Mật khẩu mới (tối thiểu 6 ký tự):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="auth-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    style={{ width: '100%', height: 40, padding: '0 38px 0 12px', fontSize: 13 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{ position: 'absolute', right: 10, top: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {showNewPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                  Xác nhận lại mật khẩu mới:
                </label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  className="auth-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới để xác nhận..."
                  style={{ width: '100%', height: 40, padding: '0 12px', fontSize: 13 }}
                />
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="btn-primary"
                  style={{ flex: 1, height: 40, fontSize: 13, fontWeight: 700 }}
                >
                  {passLoading ? 'Đang lưu...' : 'Lưu Mật Khẩu Mới'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  style={{
                    padding: '0 14px',
                    height: 40,
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 4. Appearance & Personalization */}
        <div
          className="ui-card"
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg, 16px)',
            padding: 18,
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle, #F1F5F9)' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>Chế độ tối (Dark Mode)</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Giao diện nền tối sang trọng, êm dịu cho mắt</div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
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
        </div>

        {/* 5. Security & App PIN Lock + Biometrics + Auto-Lock */}
        <div
          className="ui-card"
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg, 16px)',
            padding: 18,
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
            <span>Bảo mật ứng dụng</span>
          </div>

          {/* PIN Lock Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle, #F1F5F9)' }}>
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
            <div style={{ marginTop: 12, paddingTop: 10, borderBottom: '1px solid var(--border-subtle, #F1F5F9)', paddingBottom: 12, display: 'flex', gap: 8 }}>
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

          {/* Biometrics (Fingerprint / FaceID) Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle, #F1F5F9)' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>Xác thực Vân tay / FaceID</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Mở khóa ứng dụng nhanh chóng bằng sinh trắc học</div>
            </div>
            <button
              type="button"
              onClick={handleToggleBiometrics}
              style={{
                width: 48,
                height: 28,
                borderRadius: 14,
                border: 'none',
                background: biometricsEnabled ? 'var(--primary-green)' : 'var(--bg-card-subtle, #E2E8F0)',
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
                  left: biometricsEnabled ? 23 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              />
            </button>
          </div>

          {/* Auto-lock timer dropdown */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>Tự động khóa màn hình</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Khóa khi không có tương tác</div>
            </div>
            <select
              value={autoLockTime}
              onChange={(e) => handleChangeAutoLock(e.target.value)}
              style={{
                background: 'var(--bg-card-subtle, #F8FAFC)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="immediate">Ngay lập tức</option>
              <option value="1min">Sau 1 phút</option>
              <option value="5min">Sau 5 phút</option>
              <option value="15min">Sau 15 phút</option>
              <option value="never">Không bao giờ</option>
            </select>
          </div>
        </div>

        {/* 6. Export CSV / Excel Data */}
        <div
          className="ui-card"
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg, 16px)',
            padding: 18,
            boxShadow: 'var(--shadow-card)',
            border: '1px solid var(--border-color)',
            marginBottom: 20
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-green)' }}>
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <span>Dữ liệu & Báo cáo</span>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
            Xuất sổ cái đối soát hoặc quản lý chi tiết các ví & hạn mức ngân sách
          </p>

          {/* Quick link to Wallets & Budgets from Settings */}
          <button
            type="button"
            onClick={() => setActiveTab('wallets')}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'var(--bg-card-subtle, #F8FAFC)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: 13.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              marginBottom: 10,
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary-green-light)', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                </svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div>Tài khoản & Ngân sách</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Quản lý số dư các ví, hạn mức chi & mục tiêu</div>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-green)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'var(--bg-card-subtle, #F8FAFC)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: 13.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary-green-light)', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-green)' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      {/* 7. FINANCIAL REPORT DETAIL MODAL */}
      {showReportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            animation: 'fadeIn 0.2s ease-in-out'
          }}
          onClick={() => setShowReportModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 520,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--bg-card)',
              borderRadius: 20,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-color)',
              padding: 22
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Báo Cáo & Phân Tích Chi Tiết
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Thống kê dựa trên toàn bộ sổ cái thu chi đã ghi nhận
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  border: 'none',
                  background: 'var(--bg-card-subtle, #F1F5F9)',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Visual Overview Box */}
            <div
              style={{
                borderRadius: 14,
                padding: 16,
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.08) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                marginBottom: 18
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
                Chỉ số sức khỏe tài chính:
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--primary-green)' }}>
                  {savingsRate}%
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                  tỷ lệ tiết kiệm trên tổng thu nhập
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-main)', marginTop: 8, lineHeight: 1.5 }}>
                {savingsRate >= 30
                  ? '✨ Bạn đang quản lý tài chính xuất sắc! Dòng tiền tích lũy vượt mức khuyến nghị 20% của chuẩn 50/30/20.'
                  : savingsRate >= 15
                  ? '👍 Mức tiết kiệm ổn định. Bạn có thể tối ưu thêm một số khoản chi tiêu không cố định để tăng tốc tích lũy.'
                  : '⚠️ Tỷ lệ chi tiêu đang ở mức cao. Hãy rà soát các khoản ăn uống, mua sắm để bảo toàn dòng tiền ròng.'}
              </p>
            </div>

            {/* Category Expense Breakdown */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-main)', marginBottom: 12 }}>
                Phân bổ chi tiêu theo danh mục:
              </div>
              {sortedCategories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12.5 }}>
                  Chưa có dữ liệu chi tiêu nào được ghi nhận.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sortedCategories.map(([cat, amount]) => {
                    const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                          <span style={{ color: 'var(--text-main)' }}>{cat}</span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {formatVND(amount)} ({percentage}%)
                          </span>
                        </div>
                        <div style={{ width: '100%', height: 6, background: 'var(--bg-card-subtle, #E2E8F0)', borderRadius: 9999, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${percentage}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #EF4444 0%, #F97316 100%)',
                              borderRadius: 9999
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleExportCSV}
                style={{ flex: 1, height: 42, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Tải Bảng Tính Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                style={{
                  padding: '0 18px',
                  height: 42,
                  borderRadius: 12,
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
