/**
 * FIREBASE REALTIME CLOUD SYNC CHO THỊNH & BU
 * Đồng bộ dữ liệu 2 chiều tức thì (Realtime) qua Firebase Firestore
 * Phòng dùng chung: 'thinh_bu_59e2_05957'
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAhKy48tbkAd6htvp8rr22F8m19iPpOBZM",
  authDomain: "quanlygrab-thinhbu.firebaseapp.com",
  projectId: "quanlygrab-thinhbu",
  storageBucket: "quanlygrab-thinhbu.firebasestorage.app",
  messagingSenderId: "263917541353",
  appId: "1:263917541353:web:4493770edef4b6beacdd78",
  measurementId: "G-2VPB6H4Q1L"
};

class GrabCloudSync {
  constructor() {
    let initialUid = 'guest';
    const savedProfile = localStorage.getItem('finance_user_profile');
    if (savedProfile) {
      try { initialUid = JSON.parse(savedProfile).uid || 'guest'; } catch (e) {}
    }
    this.roomId = 'user_' + initialUid;
    this.collectionName = 'fintrack_user_data';
    this.isConnected = false;
    this.deviceId = 'dev_' + Math.random().toString(36).substring(2, 9);
    this.currentDriver = 'Người dùng';
    this.isFirebaseReady = false;
    this.saveTimeout = null;
    this.db = null;
    this.unsubscribe = null;

    // Kênh broadcast đồng bộ tab cục bộ (cùng trình duyệt)
    try {
      this.channel = new BroadcastChannel('grab_realtime_sync_channel');
      this.channel.onmessage = (event) => this.handleLocalMessage(event.data);
    } catch (e) {
      console.warn('BroadcastChannel không hỗ trợ:', e);
    }

    // Khởi tạo Firebase SDK
    this.initFirebase();
  }

  // Chuyển đổi không gian đồng bộ khi người dùng mới đăng nhập
  switchUser(uid, userName) {
    if (this.unsubscribe) {
      try { this.unsubscribe(); } catch (e) {}
    }
    this.roomId = 'user_' + (uid || 'guest');
    this.currentDriver = userName || 'Người dùng';
    this.initCloudSync();
  }

  // Hủy đăng ký listener khi đăng xuất để tránh rò rỉ dữ liệu phiên cũ
  stopSync() {
    if (this.unsubscribe) {
      try { this.unsubscribe(); } catch (e) {}
      this.unsubscribe = null;
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.updateStatusBadge('offline', 'Đã ngắt kết nối (Đăng xuất)');
  }

  initFirebase() {
    try {
      if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
        this.isFirebaseReady = true;
        console.log('✅ Firebase SDK initialized successfully');
      } else {
        console.warn('⚠️ Firebase SDK chưa load xong');
      }
    } catch (err) {
      console.error('❌ Lỗi khởi tạo Firebase:', err);
      this.isFirebaseReady = false;
    }
  }

  // Khởi động lắng nghe Realtime từ Firestore
  initCloudSync() {
    if (!this.isFirebaseReady || !this.db) {
      this.initFirebase();
    }

    if (!this.isFirebaseReady || !this.db) {
      this.updateStatusBadge('offline', 'Chế độ Cục bộ (Offline)');
      return;
    }

    if (this.unsubscribe) {
      try { this.unsubscribe(); } catch (e) {}
    }

    const docRef = this.db.collection(this.collectionName).doc(this.roomId);

    this.updateStatusBadge('syncing', 'Đang kết nối Cloud...');

    this.unsubscribe = docRef.onSnapshot((doc) => {
      if (doc.exists) {
        const cloudData = doc.data();

        // Nếu thay đổi xuất phát từ chính thiết bị này thì bỏ qua
        if (cloudData.updatedBy === this.deviceId) {
          this.updateStatusBadge('online', 'Đồng bộ Realtime (Cloud)');
          return;
        }

        // Nhận dữ liệu từ cloud và thực hiện Smart Merge để không làm mất transaction tạo khi offline
        if (cloudData.payload && window.app) {
          try {
            const parsed = typeof cloudData.payload === 'string' ? JSON.parse(cloudData.payload) : cloudData.payload;
            
            // Hợp nhất danh sách giao dịch cục bộ và Cloud tránh ghi đè mất mát
            const localTxs = (window.app.data && window.app.data.transactions) || [];
            const cloudTxs = (parsed && parsed.transactions) || [];
            
            const txMap = new Map();
            cloudTxs.forEach(tx => { if (tx && tx.id) txMap.set(tx.id, tx); });
            // Ưu tiên bảo toàn các transaction vừa tạo offline tại máy này
            localTxs.forEach(tx => { if (tx && tx.id) txMap.set(tx.id, tx); });

            parsed.transactions = Array.from(txMap.values());
            // Sắp xếp lại danh sách theo ID/thời gian mới nhất lên đầu
            parsed.transactions.sort((a, b) => String(b.id).localeCompare(String(a.id)));

            window.app.data = parsed;
            const key = (window.app && window.app.storageKey) || 'finance_app_clean_user_v2';
            localStorage.setItem(key, JSON.stringify(parsed));
            if (window.app && typeof window.app.recalculateBalances === 'function') {
              window.app.recalculateBalances();
            }
            window.app.renderAll();

            const senderName = cloudData.driver || 'Thành viên';
            window.app.showToast(`☁️ Đã đồng bộ từ Cloud (${senderName} vừa cập nhật)!`);
            this.updateStatusBadge('online', 'Đồng bộ Realtime (Cloud)');
          } catch (e) {
            console.error('Lỗi phân tích dữ liệu Firestore:', e);
          }
        }
      } else {
        // Tài liệu phòng chưa tồn tại trên Firestore -> đẩy dữ liệu hiện tại lên lần đầu
        if (window.app && window.app.data) {
          this.pushToCloud(window.app.data, true);
        }
        this.updateStatusBadge('online', 'Đồng bộ Realtime (Cloud)');
      }
    }, (error) => {
      console.warn('⚠️ Firestore onSnapshot notice:', error.message);
      if (error.code === 'permission-denied') {
        this.updateStatusBadge('warning', 'Chờ bật Firestore (Test Mode)');
      } else {
        this.updateStatusBadge('offline', 'Lỗi Cloud: ' + (error.code || 'offline'));
      }
    });
  }

  // Đẩy dữ liệu lên Firebase Firestore
  pushToCloud(data, immediate = false) {
    // 1. Gửi qua kênh Broadcast cục bộ
    if (this.channel) {
      this.channel.postMessage({
        sender: this.deviceId,
        senderDriver: this.currentDriver,
        payload: data,
        timestamp: Date.now()
      });
    }

    // 2. Gửi lên Firestore (Debounce 350ms nếu gõ liên tục)
    if (!this.isFirebaseReady || !this.db) return;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    const executePush = () => {
      const docRef = this.db.collection(this.collectionName).doc(this.roomId);
      const payloadString = JSON.stringify(data);

      docRef.set({
        payload: payloadString,
        updatedAt: Date.now(),
        updatedBy: this.deviceId,
        driver: this.currentDriver
      }, { merge: true })
      .then(() => {
        this.updateStatusBadge('online', 'Đồng bộ Realtime (Cloud)');
      })
      .catch((err) => {
        console.warn('⚠️ Không thể lưu lên Firestore:', err.message);
        if (err.code === 'permission-denied') {
          this.updateStatusBadge('warning', 'Cần bật Firestore Test Mode');
        }
      });
    };

    if (immediate) {
      executePush();
    } else {
      this.updateStatusBadge('syncing', 'Đang lưu...');
      this.saveTimeout = setTimeout(executePush, 350);
    }
  }

  // Xử lý gói tin broadcast từ các tab khác trong cùng máy
  handleLocalMessage(packet) {
    if (!packet || packet.sender === this.deviceId) return;
    if (window.app && packet.payload) {
      window.app.data = packet.payload;
      const key = (window.app && window.app.storageKey) || 'finance_app_clean_user_v2';
      localStorage.setItem(key, JSON.stringify(packet.payload));
      if (window.app && typeof window.app.recalculateBalances === 'function') {
        window.app.recalculateBalances();
      }
      window.app.renderAll();
      const senderName = packet.senderDriver || 'Thành viên';
      window.app.showToast(`📱 Đồng bộ tab cục bộ (${senderName})`);
    }
  }

  // Gửi sự kiện hành động cụ thể (tương thích ngược)
  broadcast(action, payload) {
    if (window.app && window.app.data) {
      this.pushToCloud(window.app.data);
    }
  }

  // Cập nhật nhãn trạng thái đám mây trên giao diện
  updateStatusBadge(state, text) {
    const badge = document.getElementById('cloudSyncStatusBadge');
    if (!badge) return;

    let dotColor = '#10B981'; // Xanh lá - Online
    let textColor = '#E2E8F0';

    if (state === 'syncing') {
      dotColor = '#38BDF8'; // Xanh dương - Syncing
      textColor = '#BAE6FD';
    } else if (state === 'warning') {
      dotColor = '#FBBF24'; // Vàng cam - Chờ bật Firestore
      textColor = '#FDE68A';
    } else if (state === 'offline') {
      dotColor = '#F87171'; // Đỏ - Offline
      textColor = '#FECACA';
    }

    badge.innerHTML = `
      <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: ${dotColor}; margin-right: 5px; box-shadow: 0 0 6px ${dotColor};"></span>
      ${text || 'Đồng bộ Realtime'}
    `;
    badge.style.color = textColor;
  }

  // Lấy UID hiện tại đang đồng bộ
  getCurrentUid() {
    return this.roomId.replace('user_', '') || 'guest';
  }

  // 1. Ghi Transaction độc lập vào Subcollection users/{uid}/transactions/{txId} (Loại bỏ Lost Update)
  async writeTransactionDoc(tx) {
    if (!tx || !tx.id) return;
    const uid = this.getCurrentUid();

    // Hàng đợi Offline: Nếu mất mạng, lưu vào queue để đợi đồng bộ
    if (!navigator.onLine || !this.isFirebaseReady || !this.db) {
      this.queueOfflineTransaction(uid, tx);
      return;
    }

    try {
      await this.db.collection('users').doc(uid).collection('transactions').doc(tx.id).set({
        ...tx,
        syncedAt: Date.now(),
        deviceId: this.deviceId
      }, { merge: true });
    } catch (err) {
      console.warn('⚠️ Lỗi ghi Transaction Subcollection, lưu hàng đợi offline:', err.message);
      this.queueOfflineTransaction(uid, tx);
    }
  }

  // Quản lý hàng đợi Offline
  queueOfflineTransaction(uid, tx) {
    try {
      const qKey = 'fintrack_offline_queue_' + uid;
      const raw = localStorage.getItem(qKey);
      const queue = raw ? JSON.parse(raw) : [];
      if (!queue.some(t => t.id === tx.id)) {
        queue.push(tx);
        localStorage.setItem(qKey, JSON.stringify(queue));
      }
    } catch (e) {}
  }

  // Đối soát và đẩy hàng đợi Offline lên Cloud khi Online trở lại
  async reconcileOfflineQueue() {
    const uid = this.getCurrentUid();
    const qKey = 'fintrack_offline_queue_' + uid;
    const raw = localStorage.getItem(qKey);
    if (!raw) return;

    try {
      const queue = JSON.parse(raw);
      if (!Array.isArray(queue) || queue.length === 0) return;

      if (!this.isFirebaseReady || !this.db) return;

      const batch = this.db.batch();
      queue.forEach(tx => {
        const ref = this.db.collection('users').doc(uid).collection('transactions').doc(tx.id);
        batch.set(ref, { ...tx, reconciledAt: Date.now(), deviceId: this.deviceId }, { merge: true });
      });

      await batch.commit();
      localStorage.removeItem(qKey);
      console.log(`✅ Đã đối soát và đẩy ${queue.length} giao dịch offline lên Firestore!`);
    } catch (e) {
      console.warn('⚠️ Lỗi đối soát hàng đợi offline:', e.message);
    }
  }

  // 2. Chuyển tiền nguyên tử bằng Firestore runTransaction (ACID cấp Database)
  async executeAtomicTransfer(fromAccName, toAccName, amount, txRecord) {
    const uid = this.getCurrentUid();

    // Nếu không có kết nối Cloud, fallback an toàn với local commit
    if (!this.isFirebaseReady || !this.db || !navigator.onLine) {
      this.pushToCloud(window.app.data);
      this.queueOfflineTransaction(uid, txRecord);
      return { success: true, mode: 'local-offline' };
    }

    try {
      const fromWalletId = fromAccName === 'Tiền mặt' ? 'acc-cash' : 'acc-bank';
      const toWalletId = toAccName === 'Tiền mặt' ? 'acc-cash' : 'acc-bank';

      const fromRef = this.db.collection('users').doc(uid).collection('wallets').doc(fromWalletId);
      const toRef = this.db.collection('users').doc(uid).collection('wallets').doc(toWalletId);
      const txRef = this.db.collection('users').doc(uid).collection('transactions').doc(txRecord.id);

      await this.db.runTransaction(async (transaction) => {
        const fromDoc = await transaction.get(fromRef);
        const toDoc = await transaction.get(toRef);

        const currentFromBal = fromDoc.exists ? (Number(fromDoc.data().balance) || 0) : 0;
        const currentToBal = toDoc.exists ? (Number(toDoc.data().balance) || 0) : 0;

        if (currentFromBal < amount) {
          throw new Error('Số dư ví nguồn không đủ trên Cloud');
        }

        transaction.set(fromRef, {
          name: fromAccName,
          balance: currentFromBal - amount,
          updatedAt: Date.now()
        }, { merge: true });

        transaction.set(toRef, {
          name: toAccName,
          balance: currentToBal + amount,
          updatedAt: Date.now()
        }, { merge: true });

        transaction.set(txRef, {
          ...txRecord,
          atomicCommitted: true,
          createdAt: Date.now()
        });
      });

      // Đẩy thêm bản sao backward compatibility
      this.pushToCloud(window.app.data);
      return { success: true, mode: 'firestore-atomic' };
    } catch (err) {
      console.warn('⚠️ Giao dịch Atomic trên Cloud cảnh báo:', err.message);
      // Fallback lưu toàn bộ state để bảo toàn dữ liệu
      this.pushToCloud(window.app.data);
      return { success: true, mode: 'fallback-snapshot' };
    }
  }

  // 3. Đẩy chỉ số Leaderboard toàn hệ thống với cơ chế che giấu danh tính (Privacy Masking)
  async syncLeaderboardEntry(metric, amount, isAnonymous = false, customName = null) {
    if (!this.isFirebaseReady || !this.db) return;
    const uid = this.getCurrentUid();
    if (uid === 'guest') return;

    try {
      const displayName = isAnonymous 
        ? 'Người dùng ẩn danh' 
        : (customName || this.currentDriver || 'Thành viên');

      await this.db.collection('leaderboards').doc('monthly').collection('entries').doc(uid).set({
        uid: uid,
        displayName: displayName,
        metric: metric || 'total_income',
        amount: Number(amount) || 0,
        isAnonymous: !!isAnonymous,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.warn('⚠️ Lỗi cập nhật Leaderboard:', e.message);
    }
  }

  // Đổi người dùng máy hiện tại (Máy của Thịnh hoặc Máy của Bu)
  setDeviceUser(driverId) {
    this.currentDriver = driverId;
    localStorage.setItem('grab_current_user', driverId);
  }
}

// Khởi tạo instance toàn cục
window.grabSync = new GrabCloudSync();
