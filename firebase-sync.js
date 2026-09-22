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
    const cleanUid = String(initialUid).replace(/^user_/, '');
    this.roomId = 'user_' + cleanUid;
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
    const cleanUid = String(uid || 'guest').replace(/^user_/, '');
    this.roomId = 'user_' + cleanUid;
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

    const uid = this.getCurrentUid();
    this.updateStatusBadge('syncing', 'Đang kết nối Cloud...');

    if (uid && uid !== 'guest') {
      // 1. PRIMARY FINANCIAL AUTHORITY: users/{uid}/transactions Subcollection
      // Transaction Ledger là Financial Single Source of Truth (SSOT) duy nhất
      const ledgerRef = this.db.collection('users').doc(uid).collection('transactions');

      this.unsubscribe = ledgerRef.onSnapshot((snapshot) => {
        if (snapshot && !snapshot.empty) {
          const cloudTxs = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data && data.id) cloudTxs.push(data);
          });

          if (window.app) {
            const localTxs = (window.app.data && window.app.data.transactions) || [];
            const txMap = new Map();

            // Nạp toàn bộ authoritative transactions từ Firestore Ledger
            cloudTxs.forEach(tx => txMap.set(tx.id, tx));

            // Bảo toàn các transactions vừa tạo cục bộ khi offline chưa kịp đẩy lên
            localTxs.forEach(tx => {
              if (tx && tx.id && !txMap.has(tx.id)) {
                txMap.set(tx.id, tx);
              }
            });

            if (!window.app.data) window.app.data = {};
            window.app.data.transactions = Array.from(txMap.values());
            window.app.data.transactions.sort((a, b) => String(b.isoDate || b.id).localeCompare(String(a.isoDate || a.id)));

            // Tự động đối soát số dư ví từ Ledger (Reconciliation Engine)
            if (typeof window.app.reconcileBalancesFromLedger === 'function') {
              window.app.reconcileBalancesFromLedger();
            }
            if (typeof window.app.recalculateBalances === 'function') {
              window.app.recalculateBalances();
            }
            window.app.renderAll();
            this.updateStatusBadge('online', 'Đồng bộ Realtime (Ledger SSOT)');
          }
        } else {
          // 2. LEGACY FALLBACK ONLY:
          // Chỉ đọc fintrack_user_data nếu users/{uid}/transactions rỗng (tài khoản cũ chưa migrate)
          console.log('[LEGACY FALLBACK] users/{uid}/transactions rỗng. Kiểm tra fintrack_user_data cho migration.');
          const legacyDocRef = this.db.collection(this.collectionName).doc(this.roomId);
          legacyDocRef.get().then(doc => {
            if (doc.exists && doc.data()?.payload && window.app) {
              const parsed = typeof doc.data().payload === 'string' ? JSON.parse(doc.data().payload) : doc.data().payload;
              // Chỉ nạp nếu data local hoàn toàn rỗng để tránh stale snapshot ghi đè
              if (!window.app.data || !window.app.data.transactions || window.app.data.transactions.length === 0) {
                window.app.data = parsed;
                if (typeof window.app.recalculateBalances === 'function') window.app.recalculateBalances();
                window.app.renderAll();
              }
            }
          }).catch(err => console.warn('Lỗi đọc Legacy Fallback:', err.message));
          this.updateStatusBadge('online', 'Đồng bộ Realtime (Cloud)');
        }
      }, (error) => {
        console.warn('⚠️ Firestore Ledger onSnapshot notice:', error.message);
        if (error.code === 'permission-denied') {
          this.updateStatusBadge('offline', 'Lưu trữ Cục bộ (Bảo mật)');
        } else {
          this.updateStatusBadge('offline', 'Lỗi Cloud: ' + (error.code || 'offline'));
        }
      });
    } else {
      this.updateStatusBadge('offline', 'Chế độ Cục bộ (Guest)');
    }
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
          this.updateStatusBadge('offline', 'Lưu trữ Cục bộ (Bảo mật)');
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
    return this.roomId.replace(/^user_/, '') || 'guest';
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

  // Ghi nhận số dư ví độc lập vào Subcollection users/{uid}/wallets/{walletId}
  async writeWalletDoc(walletId, walletData) {
    if (!walletId || !walletData) return;
    const uid = this.getCurrentUid();
    if (uid === 'guest' || !this.isFirebaseReady || !this.db) return;
    try {
      await this.db.collection('users').doc(uid).collection('wallets').doc(walletId).set({
        ...walletData,
        updatedAt: Date.now(),
        deviceId: this.deviceId
      }, { merge: true });
    } catch (e) {
      console.warn('⚠️ Lỗi ghi Wallet Subcollection:', e.message);
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

  // Đối soát và đẩy hàng đợi Offline lên Cloud khi Online trở lại với Chunking an toàn (Criteria 7)
  async reconcileOfflineQueue() {
    const uid = this.getCurrentUid();
    const qKey = 'fintrack_offline_queue_' + uid;
    const raw = localStorage.getItem(qKey);
    if (!raw) return;

    try {
      const queue = JSON.parse(raw);
      if (!Array.isArray(queue) || queue.length === 0) return;

      if (!this.isFirebaseReady || !this.db) return;

      // Firestore WriteBatch tối đa 500 operations. Chunk an toàn 400 operations/batch.
      const CHUNK_SIZE = 400;
      let committedCount = 0;

      while (queue.length > 0) {
        const chunk = queue.slice(0, CHUNK_SIZE);
        const batch = this.db.batch();
        chunk.forEach(tx => {
          const ref = this.db.collection('users').doc(uid).collection('transactions').doc(tx.id);
          batch.set(ref, { ...tx, reconciledAt: Date.now(), deviceId: this.deviceId }, { merge: true });
        });

        // Commit tuần tự từng batch; không dùng Promise.all tránh mất kiểm soát trạng thái cục bộ
        await batch.commit();
        committedCount += chunk.length;

        // Chỉ xóa các phần tử đã commit thành công khỏi queue
        queue.splice(0, chunk.length);
        if (queue.length > 0) {
          localStorage.setItem(qKey, JSON.stringify(queue));
        } else {
          localStorage.removeItem(qKey);
        }
      }

      console.log(`✅ Đã đối soát và đẩy ${committedCount} giao dịch offline lên Firestore!`);
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
        // IDEMPOTENCY GUARD: Kiểm tra nếu transaction này đã được commit trước đó
        const txDoc = await transaction.get(txRef);
        if (txDoc.exists) {
          console.warn(`[IDEMPOTENCY] Giao dịch chuyển tiền ${txRecord.id} đã được thực thi trước đó. Bỏ qua biến động số dư ví.`);
          return;
        }

        const fromDoc = await transaction.get(fromRef);
        const toDoc = await transaction.get(toRef);

        let currentFromBal = 0;
        if (fromDoc.exists) {
          currentFromBal = (Number(fromDoc.data().balance) || 0);
        } else {
          // Khởi tạo từ số dư local trước khi chuyển nếu doc trên Cloud chưa có
          const localFrom = (window.app?.data?.wallets?.accounts || []).find(a => a.name === fromAccName);
          currentFromBal = (localFrom ? (Number(localFrom.balance) || 0) : 0) + amount;
        }

        let currentToBal = 0;
        if (toDoc.exists) {
          currentToBal = (Number(toDoc.data().balance) || 0);
        } else {
          const localTo = (window.app?.data?.wallets?.accounts || []).find(a => a.name === toAccName);
          currentToBal = (localTo ? (Number(localTo.balance) || 0) : 0) - amount;
        }

        if (currentFromBal < amount) {
          throw new Error('Số dư ví nguồn không đủ trên Cloud');
        }

        transaction.set(fromRef, {
          id: fromWalletId,
          name: fromAccName,
          balance: currentFromBal - amount,
          updatedAt: Date.now()
        }, { merge: true });

        transaction.set(toRef, {
          id: toWalletId,
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

      // Cập nhật bản sao backup phái sinh (Derived Backup Only - không phải SSOT)
      try {
        if (window.app && window.app.data) {
          this.pushToCloud(window.app.data);
        }
      } catch (backupErr) {
        console.warn('⚠️ Lỗi ghi bản sao backup (không ảnh hưởng Ledger):', backupErr.message);
      }
      return { success: true, mode: 'firestore-atomic' };
    } catch (err) {
      console.warn('⚠️ Giao dịch Atomic trên Cloud thất bại:', err.message);
      // KHÔNG ghi đè backup snapshot khi giao dịch atomic bị rollback để tránh divergence
      return { success: false, error: err.message };
    }
  }

  // Đọc toàn bộ Firestore Ledger Subcollection users/{uid}/transactions
  async loadFirestoreLedger(uid) {
    if (!this.isFirebaseReady || !this.db || !uid || uid === 'guest') return null;
    try {
      const snap = await this.db.collection('users').doc(uid).collection('transactions').get();
      const txs = [];
      snap.forEach(doc => {
        txs.push(doc.data());
      });
      return txs;
    } catch (e) {
      console.warn('⚠️ Lỗi đọc Firestore Ledger:', e.message);
      return null;
    }
  }

  // 3. Đẩy chỉ số Leaderboard toàn hệ thống với cơ chế che giấu danh tính (Privacy Masking)
  // GHI CHÚ BẢO MẬT: Bảng xếp hạng public cần có projection riêng (Tier/Score) thay vì lộ thu nhập thật.
  // [BUSINESS RULE REQUIRED]: Quy tắc xếp hạng, phân hạng tier, và chu kỳ cần phê duyệt từ Product Owner.
  async syncLeaderboardEntry(metric, amount, isAnonymous = false, customName = null) {
    if (!this.isFirebaseReady || !this.db) return;
    const uid = this.getCurrentUid();
    if (uid === 'guest') return;

    try {
      const displayName = isAnonymous 
        ? 'Người dùng ẩn danh' 
        : (customName || this.currentDriver || 'Thành viên');

      // Acceptance Model: { displayName, tier, score }
      // TUYỆT ĐỐI KHÔNG LƯU: private UID, email, private income/expense, raw transaction, wallet balance
      // [BUSINESS RULE REQUIRED]: Đánh dấu rõ ràng theo yêu cầu của Product Owner
      await this.db.collection('leaderboards').doc('monthly').collection('entries').doc(uid).set({
        displayName: displayName,
        tier: 'BUSINESS_RULE_REQUIRED',
        score: 0,
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
