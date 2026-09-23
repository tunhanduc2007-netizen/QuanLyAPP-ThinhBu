import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function normalizeUserToEmail(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  const sanitized = trimmed.replace(/[^a-z0-9._-]/g, '');
  return sanitized ? `${sanitized.toLowerCase()}@fintrack.app` : 'user@fintrack.app';
}

export function getLocalAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem('finance_local_accounts') || '{}');
    return accounts;
  } catch (e) {
    return {};
  }
}

export function saveLocalAccount(username, accountData) {
  try {
    const accounts = getLocalAccounts();
    const sanitized = { ...accountData };
    delete sanitized.password;
    accounts[username.toLowerCase()] = sanitized;
    if (sanitized.email) {
      accounts[sanitized.email.toLowerCase()] = sanitized;
    }
    localStorage.setItem('finance_local_accounts', JSON.stringify(accounts));
  } catch (e) {}
}

export function removeLocalAccount(username, email) {
  try {
    const accounts = getLocalAccounts();
    let changed = false;
    if (username && accounts[username.toLowerCase()]) {
      delete accounts[username.toLowerCase()];
      changed = true;
    }
    if (email && accounts[email.toLowerCase()]) {
      delete accounts[email.toLowerCase()];
      changed = true;
    }
    if (changed) {
      localStorage.setItem('finance_local_accounts', JSON.stringify(accounts));
    }
  } catch (e) {}
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleLoginSuccess = (profile) => {
    setCurrentUser(profile);
    setIsLoggedIn(true);
    localStorage.setItem('finance_user_profile', JSON.stringify(profile));
    localStorage.setItem('finance_user_logged_in', 'true');
    if (window.grabSync) {
      window.grabSync.switchUser(profile.uid, profile.name);
      window.grabSync.syncPublicProfile(profile);
    }
  };

  useEffect(() => {
    // Check local storage for initial auth session
    const saved = localStorage.getItem('finance_user_profile');
    const loggedInFlag = localStorage.getItem('finance_user_logged_in');

    if (saved && loggedInFlag) {
      try {
        const u = JSON.parse(saved);
        setCurrentUser(u);
        setIsLoggedIn(true);
      } catch (e) {}
    }

    // Attach to Firebase auth if available in window
    if (typeof firebase !== 'undefined' && firebase.auth) {
      const unsub = firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          const profile = {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Người dùng',
            email: user.email,
            avatar: user.photoURL || ''
          };
          handleLoginSuccess(profile);
        }
        setLoading(false);
      });
      return () => unsub();
    } else {
      setLoading(false);
    }
  }, []);

  const loginWithCredentials = async (rawUser, password) => {
    const username = (rawUser || '').trim();
    if (!username) {
      throw new Error('Vui lòng nhập Tên tài khoản hoặc Email.');
    }
    if (!password) {
      throw new Error('Vui lòng nhập mật khẩu.');
    }

    const email = normalizeUserToEmail(username);

    // 1. Thử qua Firebase Auth nếu có
    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        if (user) {
          const profile = {
            name: user.displayName || username,
            username: username,
            email: user.email || email,
            uid: user.uid,
            avatar: user.photoURL || ''
          };
          saveLocalAccount(username, profile);
          handleLoginSuccess(profile);
          return profile;
        }
      } catch (fbErr) {
        console.warn('Firebase Auth email login check:', fbErr.code, fbErr.message);
        if (fbErr.code === 'auth/wrong-password') {
          throw new Error('Mật khẩu không chính xác!');
        }
        if (
          fbErr.code === 'auth/user-not-found' ||
          fbErr.code === 'auth/invalid-login-credentials' ||
          fbErr.code === 'auth/invalid-credential'
        ) {
          removeLocalAccount(username, email);
          throw new Error('Tài khoản này không tồn tại hoặc thông tin đăng nhập không hợp lệ!');
        }
        if (fbErr.code === 'auth/user-disabled') {
          throw new Error('Tài khoản này đã bị vô hiệu hóa hoặc tạm khóa!');
        }
        if (fbErr.code === 'auth/too-many-requests') {
          throw new Error('Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau ít phút!');
        }
        if (fbErr.code !== 'auth/network-request-failed' && navigator.onLine) {
          removeLocalAccount(username, email);
          throw new Error('Không tìm thấy tài khoản hoặc thông tin đăng nhập không hợp lệ!');
        }
      }
    }

    // 2. Dự phòng ngoại tuyến / Local Account
    const localAccounts = getLocalAccounts();
    const localAcc = localAccounts[username.toLowerCase()] || localAccounts[email.toLowerCase()];
    if (localAcc) {
      const profile = {
        name: localAcc.name || username,
        username: localAcc.username || username,
        email: localAcc.email || email,
        avatar: localAcc.avatar || '',
        uid: localAcc.uid || ('user_' + username.toLowerCase().replace(/[^a-z0-9]/g, '_'))
      };
      handleLoginSuccess(profile);
      return profile;
    }

    throw new Error('Chưa tìm thấy tài khoản này! Hãy bấm "Tạo tài khoản" để đăng ký mới.');
  };

  const registerWithCredentials = async (fullName, rawUser, password) => {
    const name = (fullName || '').trim();
    const username = (rawUser || '').trim();
    const pass = password || '';

    if (!name) {
      throw new Error('Vui lòng nhập họ và tên của bạn.');
    }
    if (!username || username.length < 3) {
      throw new Error('Tên tài khoản cần có ít nhất 3 ký tự.');
    }
    if (!pass || pass.length < 6) {
      throw new Error('Mật khẩu cần tối thiểu 6 ký tự.');
    }

    const email = normalizeUserToEmail(username);

    // 1. Thử đăng ký qua Firebase Auth
    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, pass);
        const user = userCredential.user;
        if (user) {
          try {
            await user.updateProfile({ displayName: name });
          } catch (e) {}
          const profile = {
            name: name,
            username: username,
            email: user.email || email,
            avatar: '',
            uid: user.uid
          };
          saveLocalAccount(username, profile);
          handleLoginSuccess(profile);
          return profile;
        }
      } catch (fbErr) {
        console.warn('Firebase Auth email registration warning:', fbErr.code, fbErr.message);
        if (fbErr.code === 'auth/email-already-in-use') {
          throw new Error('Tài khoản/Email này đã tồn tại! Vui lòng chuyển sang tab Đăng nhập.');
        }
      }
    }

    // 2. Local fallback account
    const uid = 'user_' + username.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const profile = {
      name: name,
      username: username,
      email: email,
      uid: uid,
      avatar: '',
      createdAt: Date.now()
    };
    saveLocalAccount(username, profile);
    handleLoginSuccess(profile);
    return profile;
  };

  const loginAsGuest = () => {
    const guestUser = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 8),
      name: 'Khách',
      email: '',
      avatar: ''
    };
    handleLoginSuccess(guestUser);
  };

  const loginWithGoogle = async () => {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      const provider = new firebase.auth.GoogleAuthProvider();
      try {
        await firebase.auth().signInWithPopup(provider);
      } catch (err) {
        console.warn('Google Sign-in popup warning, fallback to redirect:', err);
        try {
          await firebase.auth().signInWithRedirect(provider);
        } catch (e) {
          alert('Không thể đăng nhập Google: ' + e.message);
        }
      }
    } else {
      loginAsGuest();
    }
  };

  const updateUserProfile = async (updatedFields) => {
    const updated = { ...currentUser, ...updatedFields };
    setCurrentUser(updated);
    localStorage.setItem('finance_user_profile', JSON.stringify(updated));
    if (updated.username) {
      saveLocalAccount(updated.username, updated);
    }
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
      try {
        if (updatedFields.name) {
          await firebase.auth().currentUser.updateProfile({ displayName: updatedFields.name });
        }
      } catch (e) {}
    }
    if (window.grabSync) {
      window.grabSync.switchUser(updated.uid, updated.name);
      window.grabSync.syncPublicProfile(updated);
    }
    return updated;
  };

  const logout = () => {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().signOut().catch(() => {});
    }
    setCurrentUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('finance_user_profile');
    localStorage.removeItem('finance_user_logged_in');
    if (window.grabSync) {
      window.grabSync.stopSync();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        loading,
        loginWithCredentials,
        registerWithCredentials,
        loginAsGuest,
        loginWithGoogle,
        updateUserProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
