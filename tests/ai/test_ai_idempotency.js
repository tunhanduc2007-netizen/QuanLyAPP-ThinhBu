/**
 * TEST SUITE: test_ai_idempotency.js
 * Kiểm thử tính lũy đẳng (Idempotency) của các đề xuất giao dịch từ AI
 * Đảm bảo: Cùng 1 yêu cầu retry nhiều lần không tạo ra các giao dịch trùng lặp
 */

const assert = require('assert');
const { MockLocalAIProvider } = require('../../src/services/ai/ai-provider.js');
const { ExpenseParser } = require('../../src/services/ai/expense-parser.js');

console.log('====================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ AI IDEMPOTENCY: test_ai_idempotency.js');
console.log('====================================================');

let testsPassed = 0;
const provider = new MockLocalAIProvider();
const parser = new ExpenseParser(provider);

async function runTests() {
  // Test 1: Đảm bảo proposal ID là ổn định khi truyền cùng 1 aiRequestId
  {
    const aiRequestId = 'fixed-req-12345';
    const text = "Sáng nay chạy Grab được 450k tiền mặt, ăn trưa 45k";

    const run1 = await parser.parseExpenseText(text, { aiRequestId });
    const run2 = await parser.parseExpenseText(text, { aiRequestId });

    assert.strictEqual(run1.proposals.length, 2);
    assert.strictEqual(run2.proposals.length, 2);

    assert.strictEqual(run1.proposals[0].id, run2.proposals[0].id, 'Transaction 1 ID phải trùng khớp trên các lần retry');
    assert.strictEqual(run1.proposals[1].id, run2.proposals[1].id, 'Transaction 2 ID phải trùng khớp trên các lần retry');
    assert.strictEqual(run1.proposals[0].id, 'tx-ai-fixed-req-12345-0');
    assert.strictEqual(run1.proposals[1].id, 'tx-ai-fixed-req-12345-1');

    console.log('✅ [PASS] 1. Stable client-generated transaction IDs across retries');
    testsPassed++;
  }

  // Test 2: Mô phỏng ghi nhận vào Ledger (Deduplication check)
  {
    const simulatedLedger = new Map();
    const aiRequestId = 'fixed-req-dedup-test';
    const text = "chi 120k tiền xăng";

    const parsed = await parser.parseExpenseText(text, { aiRequestId });
    assert.strictEqual(parsed.proposals.length, 1);
    const proposal = parsed.proposals[0];

    // Lần ghi thứ nhất (Lần submit đầu)
    function writeToLedger(tx) {
      if (simulatedLedger.has(tx.id)) {
        return { status: 'DUPLICATE_IGNORED', doc: simulatedLedger.get(tx.id) };
      }
      simulatedLedger.set(tx.id, tx);
      return { status: 'COMMITTED', doc: tx };
    }

    const firstWrite = writeToLedger(proposal);
    assert.strictEqual(firstWrite.status, 'COMMITTED');
    assert.strictEqual(simulatedLedger.size, 1);

    // Lần ghi thứ hai (Người dùng bấm retry do mạng lag hoặc gửi lại proposal)
    const secondWrite = writeToLedger(proposal);
    assert.strictEqual(secondWrite.status, 'DUPLICATE_IGNORED', 'Lần ghi trùng phải bị chặn bởi Idempotency Key');
    assert.strictEqual(simulatedLedger.size, 1, 'Số lượng giao dịch trong Ledger không được tăng lên');

    console.log('✅ [PASS] 2. Retry of AI proposal does not duplicate transactions in Ledger');
    testsPassed++;
  }

  // Test 3: Idempotency trên Atomic Transfer Proposal
  {
    const simulatedLedger = new Map();
    const aiRequestId = 'transfer-idempotency-test';
    const text = "chuyển 2 triệu từ ngân hàng sang tiền mặt";

    const parsed = await parser.parseExpenseText(text, { aiRequestId });
    const proposal = parsed.proposals[0];

    function applyTransfer(transferTx, wallets) {
      if (simulatedLedger.has(transferTx.id)) {
        return { status: 'ALREADY_PROCESSED', wallets };
      }
      simulatedLedger.set(transferTx.id, transferTx);
      wallets.bank -= transferTx.amount;
      wallets.cash += transferTx.amount;
      return { status: 'PROCESSED', wallets };
    }

    const wallets = { bank: 10000000, cash: 1000000 };

    const firstTry = applyTransfer(proposal, wallets);
    assert.strictEqual(firstTry.status, 'PROCESSED');
    assert.strictEqual(wallets.bank, 8000000);
    assert.strictEqual(wallets.cash, 3000000);

    // Thử lại lần 2
    const secondTry = applyTransfer(proposal, wallets);
    assert.strictEqual(secondTry.status, 'ALREADY_PROCESSED');
    assert.strictEqual(wallets.bank, 8000000, 'Số dư ngân hàng không bị trừ lần 2');
    assert.strictEqual(wallets.cash, 3000000, 'Số dư tiền mặt không bị cộng lần 2');

    console.log('✅ [PASS] 3. Atomic transfer proposal idempotency preserves wallet balances');
    testsPassed++;
  }

  console.log(`\n🎉 KẾT QUẢ: ${testsPassed}/3 TESTS PASSED HOÀN TOÀN!`);
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
