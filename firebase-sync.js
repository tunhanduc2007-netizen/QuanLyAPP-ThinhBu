/**
 * FIREBASE REALTIME CLOUD SYNC CHO THỊNH & BU
 * Đồng bộ dữ liệu 2 chiều tức thì (Realtime) qua Firebase Firestore
 * Phòng dùng chung: 'thinh_bu_59e2_05957'
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAgE2pwaYfduVnOFu3domBnVq9eXr9v-lk",
  authDomain: "quanlygrab-thinhbu-8e9e3.firebaseapp.com",
  projectId: "quanlygrab-thinhbu-8e9e3",
  storageBucket: "quanlygrab-thinhbu-8e9e3.firebasestorage.app",
  messagingSenderId: "402039138248",
  appId: "1:402039138248:web:fe09d383a3b8a8c303c2fd",
  measurementId: "G-KKDWM5DHMP"
};

class GrabCloudSync {
  constructor() {
    this.roomId = 'thinh_bu_59e2_05957';
    this.collectionName = 'grab_shared_data';
    this.isConnected = false;
    this.deviceId = 'dev_' + Math.random().toString(36).substring(2, 9);
    this.currentDriver = localStorage.getItem('grab_current_user') || 'thinh';
    this.isFirebaseReady = false;
    this.saveTimeout = null;
    this.db = null;

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

    const docRef = this.db.collection(this.collectionName).doc(this.roomId);

    this.updateStatusBadge('syncing', 'Đang kết nối Cloud...');

    docRef.onSnapshot((doc) => {
      if (doc.exists) {
        const cloudData = doc.data();

        // Nếu thay đổi xuất phát từ chính thiết bị này thì bỏ qua
        if (cloudData.updatedBy === this.deviceId) {
          this.updateStatusBadge('online', 'Đồng bộ Realtime (Cloud)');
          return;
        }

        // Nhận dữ liệu từ máy của người kia
        if (cloudData.payload && window.app) {
          try {
            const parsed = typeof cloudData.payload === 'string' ? JSON.parse(cloudData.payload) : cloudData.payload;
            window.app.data = parsed;
            localStorage.setItem(window.app.storageKey, JSON.stringify(parsed));
            window.app.recalculateBalances();
            window.app.renderAll();

            const senderName = cloudData.driver === 'bu' ? 'Bu' : 'Thịnh';
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
      localStorage.setItem(window.app.storageKey, JSON.stringify(packet.payload));
      window.app.recalculateBalances();
      window.app.renderAll();
      const senderName = packet.senderDriver === 'bu' ? 'Bu' : 'Thịnh';
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

  // Đổi người dùng máy hiện tại (Máy của Thịnh hoặc Máy của Bu)
  setDeviceUser(driverId) {
    this.currentDriver = driverId;
    localStorage.setItem('grab_current_user', driverId);
  }
}

// Khởi tạo instance toàn cục
window.grabSync = new GrabCloudSync();
