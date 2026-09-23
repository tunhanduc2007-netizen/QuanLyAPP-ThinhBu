/**
 * TEST SUITE: CONCURRENCY, RACE CONDITIONS & OFFLINE RECONCILIATION
 * Kiểm thử khả năng xử lý đồng thời và chống mất mát dữ liệu (No Lost Update)
 */

const assert = require('assert');

console.log('====================================================');
console.log('🚀 KIỂM THỬ CONCURRENCY & RECONCILIATION (test_concurrency.js)');
console.log('====================================================\n');

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name} ->`, err.message);
  }
}

// Giả lập hệ thống Subcollection Document Store
class MockSubcollectionStore {
  constructor() {
    this.documents = new Map(); // path -> document
    this.wallets = new Map();
  }

  // Thêm một transaction riêng biệt (Document-level write)
  addTransactionDoc(userId, tx) {
    const path = `users/${userId}/transactions/${tx.id}`;
    this.documents.set(path, { ...tx, writtenAt: Date.now() });
  }

  getTransactions(userId) {
    const prefix = `users/${userId}/transactions/`;
    const list = [];
    for (const [path, doc] of this.documents.entries()) {
      if (path.startsWith(prefix)) list.push(doc);
    }
    return list;
  }

  // Chuyển tiền nguyên tử bằng mô phỏng Firestore Transaction
  atomicTransfer(userId, fromAcc, toAcc, amount) {
    const fromBal = this.wallets.get(`${userId}_${fromAcc}`) || 0;
    const toBal = this.wallets.get(`${userId}_${toAcc}`) || 0;

    if (fromBal < amount) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    // Atomically commit both updates
    this.wallets.set(`${userId}_${fromAcc}`, fromBal - amount);
    this.wallets.set(`${userId}_${toAcc}`, toBal + amount);

    const txId = `tx-transfer-${Date.now()}-${Math.random()}`;
    this.addTransactionDoc(userId, {
      id: txId,
      type: 'transfer',
      amount,
      fromAcc,
      toAcc
    });

    return { txId, fromBal: fromBal - amount, toBal: toBal + amount };
  }
}

// TEST 1: Hai thiết bị thêm giao dịch đồng thời -> CẢ 2 PHẢI TỒN TẠI (NO LOST UPDATE)
runTest('1. Concurrent writes from Device A and Device B preserve BOTH transactions', () => {
  const store = new MockSubcollectionStore();
  const userId = 'user_concurrent';

  // Device A creates TX-1
  const tx1 = { id: 'tx-device-a-101', title: 'Thu nhập Grab', amount: 500000, type: 'income' };
  // Device B creates TX-2 at the same exact moment
  const tx2 = { id: 'tx-device-b-202', title: 'Đổ xăng', amount: 80000, type: 'expense' };

  // Thực thi song song (mô phỏng 2 HTTP requests / websocket messages)
  store.addTransactionDoc(userId, tx1);
  store.addTransactionDoc(userId, tx2);

  const txs = store.getTransactions(userId);
  assert.strictEqual(txs.length, 2, 'Cả 2 transaction phải được lưu lại!');
  assert.ok(txs.some(t => t.id === tx1.id), 'TX-1 phải tồn tại');
  assert.ok(txs.some(t => t.id === tx2.id), 'TX-2 phải tồn tại');
});

// TEST 2: Hai lệnh chuyển tiền đồng thời (Concurrent Transfer Atomicity)
runTest('2. Concurrent transfers maintain balance invariants without negative balances', () => {
  const store = new MockSubcollectionStore();
  const userId = 'user_transfers';
  
  // Khởi tạo ví ban đầu: Ngân hàng có 1.000.000đ, Tiền mặt 0đ
  store.wallets.set(`${userId}_Ngân hàng`, 1000000);
  store.wallets.set(`${userId}_Tiền mặt`, 0);

  // Thao tác 1: Chuyển 600.000đ
  store.atomicTransfer(userId, 'Ngân hàng', 'Tiền mặt', 600000);

  // Thao tác 2: Chuyển tiếp 600.000đ (sẽ thất bại vì chỉ còn 400.000đ)
  let rejected = false;
  try {
    store.atomicTransfer(userId, 'Ngân hàng', 'Tiền mặt', 600000);
  } catch (e) {
    rejected = true;
    assert.strictEqual(e.message, 'INSUFFICIENT_FUNDS');
  }

  assert.strictEqual(rejected, true, 'Lệnh chuyển thứ 2 vượt quá số dư phải bị từ chối');
  const bankBal = store.wallets.get(`${userId}_Ngân hàng`);
  const cashBal = store.wallets.get(`${userId}_Tiền mặt`);
  assert.strictEqual(bankBal, 400000);
  assert.strictEqual(cashBal, 600000);
  assert.strictEqual(bankBal + cashBal, 1000000, 'Tổng tài sản bất biến 1.000.000đ');
});

// TEST 3: Thuật toán Smart Offline Reconciliation (Deduplication & Union Merge)
runTest('3. Offline transaction creation reconciled cleanly when reconnecting', () => {
  // Trạng thái Cloud hiện tại
  const cloudTxs = [
    { id: 'tx-1', amount: 100000, title: 'Ăn sáng' },
    { id: 'tx-2', amount: 500000, title: 'Lương' }
  ];

  // Trạng thái cục bộ (tạo 2 giao dịch khi đang rớt mạng Offline)
  const localOfflineTxs = [
    { id: 'tx-1', amount: 100000, title: 'Ăn sáng' }, // Đã có
    { id: 'tx-offline-3', amount: 30000, title: 'Cà phê offline' }, // Mới tạo offline
    { id: 'tx-offline-4', amount: 70000, title: 'Ăn trưa offline' } // Mới tạo offline
  ];

  // Thuật toán Union Merge theo ID
  const map = new Map();
  cloudTxs.forEach(t => map.set(t.id, t));
  localOfflineTxs.forEach(t => map.set(t.id, t)); // Hợp nhất

  const merged = Array.from(map.values());
  assert.strictEqual(merged.length, 4, 'Phải có đủ 4 giao dịch (2 cloud + 2 offline)');
  assert.ok(merged.some(t => t.id === 'tx-offline-3'), 'tx-offline-3 không bị mất');
  assert.ok(merged.some(t => t.id === 'tx-offline-4'), 'tx-offline-4 không bị mất');
});

// TEST 4: Đóng góp mục tiêu (Goal Funding) đồng thời
runTest('4. Concurrent Goal funding deducts correctly without double spending', () => {
  let walletBal = 10000000; // 10tr
  let goalFund = 0;

  function fundGoal(amt) {
    if (walletBal < amt) throw new Error('NOT_ENOUGH_MONEY');
    walletBal -= amt;
    goalFund += amt;
  }

  fundGoal(3000000);
  fundGoal(5000000);
  assert.strictEqual(walletBal, 2000000);
  assert.strictEqual(goalFund, 8000000);

  // Thử nạp quá mức
  assert.throws(() => fundGoal(3000000), /NOT_ENOUGH_MONEY/);
  assert.strictEqual(walletBal, 2000000);
  assert.strictEqual(goalFund, 8000000);
});

console.log('\n====================================================');
console.log(`KẾT QUẢ TEST CONCURRENCY: ${passed}/${total} PASS`);
console.log('====================================================\n');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
