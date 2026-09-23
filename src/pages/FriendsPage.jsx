import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';
import { firebaseService } from '@/services/firebaseService';

export default function FriendsPage() {
  const { friends, setIsFriendQrOpen, showToast } = useFinance();
  const { currentUser } = useAuth();

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const friendTag = '@' + (currentUser?.uid ? currentUser.uid.slice(0, 8) : 'user');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setHasSearched(true);
    try {
      const res = await firebaseService.searchPublicUsers(query.trim());
      if (res && res.results) {
        setSearchResults(res.results);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      showToast('Lỗi tìm kiếm: ' + err.message, 'error');
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
      showToast(`Đã kết bạn với ${friend.name}`);
      setSearchResults(prev => prev.filter(f => f.uid !== friend.uid));
    } catch (e) {
      showToast('Lỗi kết bạn: ' + e.message, 'error');
    }
  };

  const handleCopyTag = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(friendTag);
      showToast('Đã sao chép mã kết bạn');
    }
  };

  return (
    <div className="app-screen active" style={{ display: 'block', opacity: 1, transform: 'none' }}>
      <div className="screen-header-bar">
        <div className="screen-header-title">Bạn Bè & Kết Nối</div>
      </div>

      {/* My ID Card */}
      <div className="friend-my-id-card">
        <div className="friend-my-id-left">
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>
            {currentUser?.name ? currentUser.name.slice(0, 1).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="friend-my-name">{currentUser?.name || 'Người dùng'}</div>
            <div className="friend-my-tag-row">
              <span className="friend-my-tag">{friendTag}</span>
              <button className="btn-copy-tag" onClick={handleCopyTag} title="Sao chép">
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

      {/* Friend Search Box */}
      <form onSubmit={handleSearch} className="friend-search-box">
        <div className="friend-search-input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            placeholder="Tìm theo ID, nickname, email..."
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
              <div key={f.uid} className="friend-search-result-card">
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{f.uid.slice(0, 8)}</div>
                </div>
                <button
                  className="btn-add-friend-action"
                  onClick={() => handleAddFriend(f)}
                  type="button"
                >
                  Kết bạn
                </button>
              </div>
            ))
          ) : (
            <div className="friend-search-empty-box">
              Không tìm thấy người dùng nào với từ khóa này.
            </div>
          )}
        </div>
      )}

      {/* Friends List */}
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)', marginBottom: 10 }}>
        Danh sách bạn bè ({friends.list.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {friends.list.length > 0 ? (
          friends.list.map((fr, idx) => (
            <div
              key={fr.id || idx}
              className="ui-card"
              style={{
                margin: 0,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366F120', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1', fontWeight: 800 }}>
                  {fr.name?.slice(0, 1) || 'F'}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-main)' }}>{fr.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{fr.id?.slice(0, 8) || 'user'}</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="ui-card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
            Chưa có bạn bè nào. Dùng ô tìm kiếm ở trên để tìm và kết bạn.
          </div>
        )}
      </div>
    </div>
  );
}
