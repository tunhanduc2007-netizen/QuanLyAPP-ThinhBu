/**
 * FINTRACK PRO — FIREBASE SERVICE LAYER
 * Cung cấp giao diện dịch vụ sạch cho các React Components
 * Tái sử dụng engine đồng bộ đã được nghiệm thu (firebase-sync.js)
 */

export class FirebaseService {
  constructor() {
    this.syncInstance = typeof window !== 'undefined' ? window.grabSync : null;
  }

  getSync() {
    if (!this.syncInstance && typeof window !== 'undefined') {
      this.syncInstance = window.grabSync;
    }
    return this.syncInstance;
  }

  getCurrentUid() {
    const s = this.getSync();
    return s ? s.getCurrentUid() : 'guest';
  }

  subscribeLedger(uid, onData, onError) {
    const s = this.getSync();
    if (!s || !s.db || uid === 'guest') return () => {};

    try {
      const ref = s.db.collection('users').doc(uid).collection('transactions');
      return ref.onSnapshot((snapshot) => {
        const txs = [];
        if (snapshot && !snapshot.empty) {
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data && data.id) txs.push(data);
          });
        }
        onData(txs);
      }, (err) => {
        if (onError) onError(err);
      });
    } catch (e) {
      console.warn('FirebaseService subscribe error:', e);
      return () => {};
    }
  }

  async writeTransactionDoc(tx) {
    const s = this.getSync();
    if (s && typeof s.writeTransactionDoc === 'function') {
      return await s.writeTransactionDoc(tx);
    }
  }

  async deleteTransactionDoc(txId) {
    const s = this.getSync();
    if (s && typeof s.deleteTransactionDoc === 'function') {
      return await s.deleteTransactionDoc(txId);
    }
  }

  async writeWalletDoc(walletId, walletData) {
    const s = this.getSync();
    if (s && typeof s.writeWalletDoc === 'function') {
      return await s.writeWalletDoc(walletId, walletData);
    }
  }

  async executeAtomicTransfer(fromAccName, toAccName, amount, txRecord) {
    const s = this.getSync();
    if (s && typeof s.executeAtomicTransfer === 'function') {
      return await s.executeAtomicTransfer(fromAccName, toAccName, amount, txRecord);
    }
    return { success: false, error: 'Cloud sync instance not available' };
  }

  async reconcileOfflineQueue() {
    const s = this.getSync();
    if (s && typeof s.reconcileOfflineQueue === 'function') {
      return await s.reconcileOfflineQueue();
    }
  }

  async syncPublicProfile(profile) {
    const s = this.getSync();
    if (s && typeof s.syncPublicProfile === 'function') {
      return await s.syncPublicProfile(profile);
    }
  }

  async searchPublicUsers(query) {
    const s = this.getSync();
    if (s && typeof s.searchPublicUsers === 'function') {
      return await s.searchPublicUsers(query);
    }
    return { success: false, results: [] };
  }

  async syncFriendToCloud(friend) {
    const s = this.getSync();
    if (s && typeof s.syncFriendToCloud === 'function') {
      return await s.syncFriendToCloud(friend);
    }
  }

  async removeFriendFromCloud(friendId) {
    const s = this.getSync();
    if (s && typeof s.removeFriendFromCloud === 'function') {
      return await s.removeFriendFromCloud(friendId);
    }
  }
}

export const firebaseService = new FirebaseService();
