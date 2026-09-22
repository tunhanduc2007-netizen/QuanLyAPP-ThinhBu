/**
 * TEST SUITE: DATA MIGRATION VERIFICATION (test_migration.js)
 * Kiểm định toàn diện tiêu chuẩn di chuyển dữ liệu (Criteria 1 & Criteria 11):
 * - Bảo toàn 127 giao dịch, 40,960,000đ thu nhập, 40,320,000đ chi tiêu, 25,000,000đ số dư
 * - Idempotent: chạy lần 1 và lần 2 không gây nhân đôi bản ghi
 * - Lệch bất kỳ giá trị nào: FAIL -> STOP -> KHÔNG XÓA DỮ LIỆU CŨ
 * - Ánh xạ Source ID -> Destination ID
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const LegacyDataMigrator = require('./migrate_legacy_data');

console.log('====================================================');
console.log('🚀 KIỂM THỬ DATA MIGRATION SUITE (test_migration.js)');
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

// TEST 1: Di chuyển dữ liệu Baseline thực tế (127 transactions, 40.96M thu, 40.32M chi, 25M số dư)
runTest('1. Exact match migration on Baseline (127 txs, 40.96M inc, 40.32M exp, 25M bal)', () => {
  const migrator = new LegacyDataMigrator();
  const baselinePath = path.join(__dirname, 'backup_baseline_127tx.json');
  assert.ok(fs.existsSync(baselinePath), 'Phải có file backup_baseline_127tx.json');
  const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

  const res = migrator.migrate(baselineData.user.uid, baselineData);
  assert.strictEqual(res.success, true, 'Migration phải thành công');
  assert.strictEqual(res.migrationStatus, 'PASS');
  assert.strictEqual(res.sourceTransactionCount, 127);
  assert.strictEqual(res.destinationTransactionCount, 127);
  assert.strictEqual(res.sourceIncome, 40960000);
  assert.strictEqual(res.destinationIncome, 40960000);
  assert.strictEqual(res.sourceExpense, 40320000);
  assert.strictEqual(res.destinationExpense, 40320000);
  assert.strictEqual(res.sourceBalance, 25000000);
  assert.strictEqual(res.destinationBalance, 25000000);
  assert.strictEqual(res.deleteSourceAllowed, false, 'Không bao giờ được xóa source trước khi đủ 7 gate');
});

// TEST 2: Phát hiện sai lệch số lượng giao dịch (127 != 126 do trùng hoặc mất ID) -> PHẢI TỪ CHỐI
runTest('2. Mismatched transaction count must FAIL, STOP and retain source', () => {
  const migrator = new LegacyDataMigrator();
  const corruptedData = {
    user: { name: 'Test User', uid: 'user_mismatch' },
    overview: { currentBalance: 200000 },
    wallets: { accounts: [{ id: 'acc-bank', balance: 200000 }] },
    transactions: [
      { id: 'tx-dup-1', amount: 100000, type: 'income' },
      { id: 'tx-dup-1', amount: 100000, type: 'income' } // Duplicate ID làm count lệch
    ]
  };

  const res = migrator.migrate('user_mismatch', corruptedData);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.migrationStatus, 'FAIL');
  assert.strictEqual(res.decision, 'STOP');
  assert.strictEqual(res.deleteSourceAllowed, false);
  assert.ok(res.error.includes('Số lượng giao dịch không khớp'));
});

// TEST 3: Sai lệch số dư -> Bắt buộc FAIL, STOP
runTest('3. Mismatched total balance must FAIL and abort', () => {
  const migrator = new LegacyDataMigrator();
  const legacyData = {
    user: { name: 'Test User', uid: 'user_bal_err' },
    overview: { currentBalance: 50000000 }, // Khai báo 50tr
    wallets: { accounts: [{ id: 'acc-bank', balance: 40000000 }] }, // Thực tế chỉ 40tr
    transactions: []
  };

  const res = migrator.migrate('user_bal_err', legacyData);
  assert.strictEqual(res.success, false, 'Phải từ chối khi số dư lệch!');
  assert.strictEqual(res.migrationStatus, 'FAIL');
  assert.strictEqual(res.decision, 'STOP');
  assert.strictEqual(res.deleteSourceAllowed, false);
  assert.ok(res.error.includes('Số dư không khớp'));
});

// TEST 4: Idempotency: Chạy migration lần 1 và lần 2 cho kết quả giống hệt nhau, không nhân đôi bản ghi
runTest('4. Idempotency test (Run 1 == Run 2 without duplicate destination items)', () => {
  const migrator = new LegacyDataMigrator();
  const baselinePath = path.join(__dirname, 'backup_baseline_127tx.json');
  const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

  const run1 = migrator.migrate('uid_idempotent', baselineData);
  const run2 = migrator.migrate('uid_idempotent', baselineData);

  assert.strictEqual(run1.destinationTransactionCount, run2.destinationTransactionCount);
  assert.strictEqual(run1.destinationBalance, run2.destinationBalance);
  assert.strictEqual(run1.destinationIncome, run2.destinationIncome);
  assert.strictEqual(run1.destinationExpense, run2.destinationExpense);
  assert.strictEqual(run2.destinationTransactionCount, 127);
});

// TEST 5: Ánh xạ Source ID -> Destination ID đầy đủ
runTest('5. Source ID to Destination ID mapping auditability', () => {
  const migrator = new LegacyDataMigrator();
  const testData = {
    user: { name: 'Audit User', uid: 'uid_map' },
    overview: { currentBalance: 100000 },
    wallets: { accounts: [{ id: 'acc-bank', balance: 100000 }] },
    transactions: [
      { id: 'tx-src-001', amount: 100000, type: 'income', title: 'Lương' }
    ]
  };

  const res = migrator.migrate('uid_map', testData);
  assert.strictEqual(res.success, true);
  assert.ok(Array.isArray(res.idMappings));
  assert.strictEqual(res.idMappings.length, 1);
  assert.strictEqual(res.idMappings[0].sourceId, 'tx-src-001');
  assert.strictEqual(res.idMappings[0].destinationId, 'tx-src-001');
  assert.strictEqual(res.idMappings[0].status, 'MAPPED');
});

// TEST 6: Dữ liệu JSON Blob hỏng -> Phải throw error an toàn
runTest('6. Corrupted JSON string input throws safe error without crashing', () => {
  const migrator = new LegacyDataMigrator();
  let threw = false;
  try {
    migrator.migrate('user_corrupt', '{ this is invalid json blob %%%');
  } catch (e) {
    threw = true;
    assert.ok(e.message.includes('MIGRATION_ERROR'));
  }
  assert.strictEqual(threw, true);
});

// TEST 7: Thiếu UID -> Phải từ chối ngay lập tức
runTest('7. Missing UID is rejected immediately', () => {
  const migrator = new LegacyDataMigrator();
  let threw = false;
  try {
    migrator.migrate('', { user: {} });
  } catch (e) {
    threw = true;
    assert.ok(e.message.includes('Thiếu UID'));
  }
  assert.strictEqual(threw, true);
});

console.log('\n====================================================');
console.log(`KẾT QUẢ TEST MIGRATION: ${passed}/${total} PASS`);
console.log('====================================================\n');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
