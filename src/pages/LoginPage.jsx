import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { loginWithCredentials, registerWithCredentials, loginAsGuest } = useAuth();

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setErrorMsg('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await loginWithCredentials(username, password);
    } catch (err) {
      setErrorMsg(err.message || 'Đăng nhập không thành công');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await registerWithCredentials(fullName, username, password);
    } catch (err) {
      setErrorMsg(err.message || 'Tạo tài khoản không thành công');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px 20px',
        textAlign: 'center',
        background: 'var(--bg-app)'
      }}
    >
      {/* Brand Icon & Title */}
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
          marginBottom: 14
        }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
        FinTrack Pro
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px 0', maxWidth: 300, lineHeight: 1.45 }}>
        Quản lý tài chính cá nhân & nhóm chuẩn di động với Sổ Cái SSOT và AI Trợ Lý
      </p>

      {/* Auth Card */}
      <div
        className="auth-card-wrap"
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg, 16px)',
          padding: '20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          border: '1px solid var(--border-color, #E2E8F0)',
          textAlign: 'left'
        }}
      >
        {/* Tab Switcher */}
        <div className="auth-tabs" style={{ marginBottom: 18 }}>
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('login')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>Đăng nhập</span>
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('register')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span>Tạo tài khoản</span>
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              fontSize: 12.5,
              fontWeight: 500,
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' ? (
          <form className="auth-form-panel" onSubmit={handleLoginSubmit}>
            <div className="auth-field">
              <label className="auth-label">Tài khoản hoặc Email</label>
              <div className="auth-input-box">
                <span className="auth-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Ví dụ: nguyenvana hoặc a@gmail.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Mật khẩu</label>
              <div className="auth-input-box">
                <span className="auth-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-toggle-pass"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
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

            <button type="submit" className="btn-primary-auth" disabled={submitting}>
              {submitting ? (
                <>
                  <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập ngay</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Register Form */
          <form className="auth-form-panel" onSubmit={handleRegisterSubmit}>
            <div className="auth-field">
              <label className="auth-label">Họ và tên của bạn</label>
              <div className="auth-input-box">
                <span className="auth-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Ví dụ: Từ Nhân Đức"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Tên tài khoản hoặc Email</label>
              <div className="auth-input-box">
                <span className="auth-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Ví dụ: tunhanduc (hoặc email của bạn)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Mật khẩu</label>
              <div className="auth-input-box">
                <span className="auth-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Tối thiểu 6 ký tự"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-toggle-pass"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
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

            <button type="submit" className="btn-primary-auth" disabled={submitting}>
              {submitting ? (
                <>
                  <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span>Đang khởi tạo tài khoản...</span>
                </>
              ) : (
                <>
                  <span>Tạo tài khoản & Bắt đầu</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </>
              )}
            </button>
          </form>
        )}

        {/* Guest Mode Option */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-color, #E2E8F0)' }}>
          <button
            type="button"
            className="btn-guest-login"
            onClick={loginAsGuest}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px dashed var(--border-color, #CBD5E1)',
              borderRadius: 'var(--radius-md, 12px)',
              padding: '11px',
              color: 'var(--text-muted, #64748B)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Dùng thử chế độ Khách (Offline)</span>
          </button>
        </div>
      </div>

      {/* Footer Policy */}
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 20, maxWidth: 320, lineHeight: 1.5 }}>
        Bằng việc tiếp tục, bạn đồng ý với <span style={{ color: 'var(--primary-green)', cursor: 'pointer' }}>Điều khoản</span> & <span style={{ color: 'var(--primary-green)', cursor: 'pointer' }}>Quyền riêng tư</span>.
      </div>
    </div>
  );
}
