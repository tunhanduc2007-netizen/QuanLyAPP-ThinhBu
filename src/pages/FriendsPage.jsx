import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';
import { firebaseService } from '@/services/firebaseService';

export default function FriendsPage() {
  const { friends, setIsFriendQrOpen, showToast, addFriendToState, removeFriendFromState, setActiveTab } = useFinance();
  const { currentUser } = useAuth();

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const friendTag = '@' + (currentUser?.uid ? currentUser.uid.slice(0, 8) : 'user');
  const friendsList = friends?.list || [];

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setHasSearched(true);
    try {
      let results = [];
      try {
        const res = await firebaseService.searchPublicUsers(q);
        if (res && res.results && Array.isArray(res.results)) {
          results = res.results;
        }
      } catch (err) {
        console.warn('Firebase search notice:', err.message);
      }

      // Filter out yourself from search results
      results = results.filter(u => u.uid !== currentUser?.uid && u.tag !== friendTag);

      setSearchResults(results);
    } catch (err) {
      showToast('Lỗi tìm kiếm: ' + err.message, 'error');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (friend) => {
    try {
      await firebaseService.syncFriendToCloud({
        uid: friend.uid,
        name: friend.name,
        email: friend.email || '',
        avatar: friend.avatar || ''
      });
    } catch (e) {
      console.warn('Cloud sync friend notice:', e.message);
    }

    if (addFriendToState) {
      addFriendToState(friend);
    }
    showToast(`Đã kết bạn với ${friend.name}`);
    setSearchResults(prev => prev.filter(f => f.uid !== friend.uid));
  };

  const handleRemoveFriend = (friendId, friendName) => {
    if (window.confirm(`Bạn có chắc muốn hủy kết bạn với ${friendName}?`)) {
      if (removeFriendFromState) {
        removeFriendFromState(friendId);
      }
      showToast(`Đã hủy kết bạn với ${friendName}`);
    }
  };

  const handleCopyTag = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(friendTag);
      showToast('Đã sao chép mã kết bạn');
    }
  };

  return (
    <div className="app-screen active" style={{ display: 'block', opacity: 1, transform: 'none', paddingBottom: 90 }}>
      <div style={{ maxWidth: 580, margin: '0 auto', width: '100%' }}>
        {/* Header Bar with Back Button to Ranking */}
        <div className="screen-header-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setActiveTab('ranking')}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-main)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}
              title="Quay lại Bảng xếp hạng"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div>
              <h1 className="screen-header-title" style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                Bạn Bè & Kết Nối
              </h1>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Tìm kiếm người dùng thực tế & đua top xếp hạng
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('ranking')}
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: 'var(--primary-green)',
              background: 'var(--primary-green-light)',
              border: '1px solid var(--primary-green)',
              borderRadius: 9999,
              padding: '6px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>Đua Top Ranking</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* My ID Card */}
        <div className="friend-my-id-card" style={{ marginBottom: 14 }}>
          <div className="friend-my-id-left">
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>
              {currentUser?.name ? currentUser.name.slice(0, 1).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="friend-my-name">{currentUser?.name || 'Từ Nhân Đức'}</div>
              <div className="friend-my-tag-row">
                <span className="friend-my-tag">{friendTag}</span>
                <button className="btn-copy-tag" onClick={handleCopyTag} title="Sao chép mã ID">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <button className="btn-qr-show" onClick={() => setIsFriendQrOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/>
              <rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
              <path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
            </svg>
            <span>Mã QR</span>
          </button>
        </div>

        {/* Friend Search Box (Real search only) */}
        <form onSubmit={handleSearch} className="friend-search-box" style={{ marginBottom: 14 }}>
          <div className="friend-search-input-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              type="text"
              placeholder="Nhập ID (@username), email hoặc tên thật..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button className="btn-friend-search" type="submit" disabled={searching}>
            {searching ? 'Tìm...' : 'Tìm kiếm'}
          </button>
        </form>

        {/* Search Results */}
        {hasSearched && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
              Kết quả tìm kiếm ({searchResults.length})
            </div>
            {searchResults.length > 0 ? (
              searchResults.map(f => (
                <div key={f.uid} className="friend-search-result-card" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary-green-light)', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                      {f.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.tag || `@${f.uid.slice(0, 8)}`}</div>
                    </div>
                  </div>
                  <button
                    className="btn-add-friend-action"
                    onClick={() => handleAddFriend(f)}
                    type="button"
                  >
                    + Kết bạn
                  </button>
                </div>
              ))
            ) : (
              <div className="friend-search-empty-box" style={{ background: 'var(--bg-card)', padding: 18, borderRadius: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5, border: '1px solid var(--border-color)' }}>
                Không tìm thấy tài khoản người dùng thực tế nào với từ khóa "{query}". Hãy kiểm tra lại chính xác ID hoặc email đã đăng ký.
              </div>
            )}
          </div>
        )}

        {/* Friends List Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>
            Danh sách bạn bè ({friendsList.length})
          </div>
          {friendsList.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('ranking')}
              style={{ background: 'none', border: 'none', color: 'var(--primary-green)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
            >
              So tài trên Bảng xếp hạng →
            </button>
          )}
        </div>

        {/* Friends List Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {friendsList.length > 0 ? (
            friendsList.map((fr, idx) => (
              <div
                key={fr.id || fr.uid || idx}
                className="ui-card"
                style={{
                  margin: 0,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-card)',
                  borderRadius: 14,
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 800 }}>
                    {fr.name?.slice(0, 1) || 'F'}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>{fr.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{fr.tag || `@${(fr.id || fr.uid || 'user').slice(0, 8)}`}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ranking')}
                    style={{
                      background: 'var(--primary-green-light)',
                      color: 'var(--primary-green)',
                      border: '1px solid var(--primary-green)',
                      borderRadius: 8,
                      padding: '5px 10px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Đua top
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFriend(fr.id || fr.uid, fr.name)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-red, #EF4444)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    title="Hủy kết bạn"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="ui-card" style={{ textAlign: 'center', padding: '30px 20px', borderRadius: 16, background: 'var(--bg-card)', border: '1.5px dashed var(--border-color)', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                Chưa có bạn bè nào trong danh bạ
              </div>
              <p style={{ fontSize: 12, margin: 0, color: 'var(--text-muted)' }}>
                Dùng ô tìm kiếm ở trên để tìm kiếm tài khoản người dùng thực tế và bắt đầu kết nối.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
