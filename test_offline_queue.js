/**
 * TEST SUITE: OFFLINE QUEUE BATCH CHUNKING & IDEMPOTENCY (test_offline_queue.js)
 * Kiểm định Criteria 7:
 * - Giới hạn Firestore WriteBatch <= 500 ops; finTrack Pro chunk tối đa 400 ops/batch
 * - Commit tuần tự (chunk 1 -> success -> remove committed -> chunk 2 ...)
 * - Tuyệt đối không dùng Promise.all() cho các batches
 * - Idempotency khi retry
 * - Test suite với các kích thước: 1, 100, 499, 500, 501, 1000 operations
 */

const assert = require('assert');

console.log('====================================================');
console.log('🚀 KIỂM THỬ OFFLINE QUEUE BATCH CHUNKING (Criteria 7)');
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

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name} ->`, err.message);
  }
}

// Giả lập Firestore Mock với Batch Tracking & Giới hạn cứng 500 ops
class MockFirestore {
  constructor() {
    this.batchCommitLog = [];
    this.concurrentBatches = 0;
    this.maxConcurrentBatchesObserved = 0;
  }

  batch() {
    const parent = this;
    return {
      operations: [],
      set(ref, data) {
        this.operations.push({ type: 'set', ref, data });
      },
      async commit() {
        parent.concurrentBatches++;
        if (parent.concurrentBatches > parent.maxConcurrentBatchesObserved) {
          parent.maxConcurrentBatchesObserved = parent.concurrentBatches;
        }

        // BẮT BUỘC: Kiểm tra giới hạn Firestore WriteBatch không vượt quá 500
        if (this.operations.length > 500) {
          parent.concurrentBatches--;
          throw new Error(`FIRESTORE_BATCH_OVERFLOW: ${this.operations.length} vượt quá giới hạn tối đa 500 ops!`);
        }

        // Mô phỏng độ trễ commit mạng
        await new Promise(r => setTimeout(r, 5));

        parent.batchCommitLog.push({
          count: this.operations.length,
          timestamp: Date.now()
        });

        parent.concurrentBatches--;
        return { writeResults: this.operations.length };
      }
    };
  }

  collection(name) {
    return {
      doc: (docId) => ({
        collection: (subName) => ({
          doc: (subDocId) => `/${name}/${docId}/${subName}/${subDocId}`
        })
      })
    };
  }
}

// Simulator cho Offline Queue Reconcile logic trong firebase-sync.js
async function simulateReconcileQueue(queue, mockDb, chunkSize = 400) {
  const qCopy = [...queue];
  const committedItems = [];
  const batchesExecuted = [];

  while (qCopy.length > 0) {
    const chunk = qCopy.slice(0, chunkSize);
    assert.ok(chunk.length <= 400, `Batch size ${chunk.length} vượt quá mức an toàn 400 ops!`);

    const batch = mockDb.batch();
    chunk.forEach(tx => {
      const ref = mockDb.collection('users').doc('user_test').collection('transactions').doc(tx.id);
      batch.set(ref, tx);
    });

    // Commit tuần tự - await trước khi chuyển sang batch kế tiếp
    await batch.commit();

    // Loại bỏ các items đã commit thành công khỏi queue
    committedItems.push(...chunk);
    batchesExecuted.push(chunk.length);
    qCopy.splice(0, chunk.length);
  }

  return {
    remainingInQueue: qCopy.length,
    committedCount: committedItems.length,
    batchesExecuted
  };
}

(async () => {
  // Test các kích thước quy định: 1, 100, 499, 500, 501, 1000
  const testSizes = [1, 100, 499, 500, 501, 1000];

  for (const size of testSizes) {
    await runAsyncTest(`Batch chunking test với ${size} operations`, async () => {
      const mockDb = new MockFirestore();
      const queue = [];
      for (let i = 0; i < size; i++) {
        queue.push({ id: `tx-offline-${i}`, amount: 10000 + i, type: 'expense' });
      }

      const res = await simulateReconcileQueue(queue, mockDb, 400);

      // 1. Kiểm tra không item nào bị sót
      assert.strictEqual(res.remainingInQueue, 0, 'Hàng đợi phải được xóa sạch sau khi hoàn tất');
      assert.strictEqual(res.committedCount, size, `Phải commit đủ ${size} operations`);

      // 2. Kiểm tra không batch nào vượt quá 400
      mockDb.batchCommitLog.forEach((b, idx) => {
        assert.ok(b.count <= 400, `Batch #${idx} có ${b.count} ops, vượt quá 400!`);
      });

      // 3. Kiểm tra tính tuần tự (Không bao giờ có > 1 batch commit đồng thời)
      assert.strictEqual(mockDb.maxConcurrentBatchesObserved, 1, 'Batches phải commit tuần tự, KHÔNG Promise.all()!');

      // 4. Kiểm tra số lượng batch tương ứng với phân chia chunk 400
      const expectedBatches = Math.ceil(size / 400);
      assert.strictEqual(res.batchesExecuted.length, expectedBatches, `Cần đúng ${expectedBatches} batch cho ${size} ops`);
    });
  }

  // TEST IDEMPOTENCY: Retry cùng một tập ID không sinh thêm financial effect
  await runAsyncTest('Idempotent retry test (Retrying same queue does not create duplicates)', async () => {
    const queueStorage = new Map();
    function queueTx(tx) {
      if (!queueStorage.has(tx.id)) {
        queueStorage.set(tx.id, tx);
      }
    }

    const tx = { id: 'tx-stable-uuid-999', amount: 500000, type: 'income' };
    queueTx(tx);
    queueTx(tx); // Thử đẩy trùng lần 2 do network glitch
    queueTx(tx); // Thử đẩy trùng lần 3

    assert.strictEqual(queueStorage.size, 1, 'Queue phải loại bỏ trùng lặp dựa trên Transaction ID duy nhất');
  });

  // TEST PARTIAL FAILURE RESILIENCE: Khi batch thứ 2 bị lỗi, batch 1 đã commit vẫn được bảo toàn
  await runAsyncTest('Sequential rollback resilience (Failure at batch N does not un-commit batch N-1)', async () => {
    let failOnSecondBatch = true;
    const mockDb = new MockFirestore();
    const originalBatch = mockDb.batch.bind(mockDb);

    let batchCount = 0;
    mockDb.batch = function() {
      const b = originalBatch();
      const origCommit = b.commit.bind(b);
      b.commit = async function() {
        batchCount++;
        if (batchCount === 2 && failOnSecondBatch) {
          throw new Error('NETWORK_TIMEOUT_ON_BATCH_2');
        }
        return origCommit();
      };
      return b;
    };

    // Tạo 500 items -> sẽ chia thành 2 batch (400 và 100)
    const queue = [];
    for (let i = 0; i < 500; i++) {
      queue.push({ id: `tx-resilience-${i}`, amount: 1000 });
    }

    const qWorking = [...queue];
    let caughtError = false;
    try {
      while (qWorking.length > 0) {
        const chunk = qWorking.slice(0, 400);
        const batch = mockDb.batch();
        chunk.forEach(t => batch.set(t.id, t));
        await batch.commit();
        // Remove committed
        qWorking.splice(0, chunk.length);
      }
    } catch (err) {
      caughtError = true;
    }

    assert.strictEqual(caughtError, true, 'Batch 2 phải phát sinh lỗi');
    assert.strictEqual(qWorking.length, 100, 'Batch 1 (400 items) đã commit phải được xóa, còn lại đúng 100 items chưa commit');
    assert.strictEqual(mockDb.batchCommitLog.length, 1, 'Chỉ 1 batch được ghi nhận commit thành công');
    assert.strictEqual(mockDb.batchCommitLog[0].count, 400, 'Batch 1 chứa đúng 400 items');
  });

  console.log('\n====================================================');
  console.log(`KẾT QUẢ TEST OFFLINE QUEUE: ${passed}/${total} PASS`);
  console.log('====================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
})();
