/**
 * TEST SUITE: test_ai_schema.js
 * Kiểm thử tính toàn vẹn và hợp lệ của JSON Schema đối với các thực thể AI
 */

const assert = require('assert');
const AISchema = require('../../src/services/ai/ai-schema.js');

console.log('====================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ AI SCHEMA: test_ai_schema.js');
console.log('====================================================');

let testsPassed = 0;

// Test 1: Hợp lệ với Proposal chuẩn
{
  const validProposal = {
    type: 'income',
    amount: 450000,
    currency: 'VND',
    category: 'Grab',
    walletHint: 'tiền mặt',
    date: '2026-09-23',
    time: '08:30',
    description: 'Chạy Grab sáng'
  };
  const res = AISchema.validateTransactionProposal(validProposal);
  assert.strictEqual(res.valid, true, 'Proposal hợp lệ phải pass schema');
  assert.strictEqual(res.errors.length, 0);
  console.log('✅ [PASS] 1. Valid proposal correctly accepted');
  testsPassed++;
}

// Test 2: Từ chối Type không hợp lệ
{
  const invalidType = {
    type: 'unauthorized_type',
    amount: 100000,
    currency: 'VND',
    date: '2026-09-23',
    description: 'Test'
  };
  const res = AISchema.validateTransactionProposal(invalidType);
  assert.strictEqual(res.valid, false, 'Type sai phải bị từ chối');
  assert(res.errors.some(e => e.includes('Invalid or missing transaction type')));
  console.log('✅ [PASS] 2. Invalid transaction type rejected');
  testsPassed++;
}

// Test 3: Từ chối số tiền âm, 0, hoặc NaN, hoặc vượt ngưỡng
{
  const zeroAmt = { type: 'expense', amount: 0, date: '2026-09-23', category: 'Ăn', walletHint: 'cash', description: 'Test' };
  assert.strictEqual(AISchema.validateTransactionProposal(zeroAmt).valid, false);

  const negAmt = { type: 'expense', amount: -50000, date: '2026-09-23', category: 'Ăn', walletHint: 'cash', description: 'Test' };
  assert.strictEqual(AISchema.validateTransactionProposal(negAmt).valid, false);

  const nanAmt = { type: 'expense', amount: NaN, date: '2026-09-23', category: 'Ăn', walletHint: 'cash', description: 'Test' };
  assert.strictEqual(AISchema.validateTransactionProposal(nanAmt).valid, false);

  const infAmt = { type: 'expense', amount: Infinity, date: '2026-09-23', category: 'Ăn', walletHint: 'cash', description: 'Test' };
  assert.strictEqual(AISchema.validateTransactionProposal(infAmt).valid, false);

  console.log('✅ [PASS] 3. Non-finite, zero, and negative amounts rejected');
  testsPassed++;
}

// Test 4: Định dạng ngày (YYYY-MM-DD) và giờ (HH:mm)
{
  const badDate = { type: 'income', amount: 50000, date: '23/09/2026', category: 'Grab', walletHint: 'cash', description: 'Test' };
  assert.strictEqual(AISchema.validateTransactionProposal(badDate).valid, false);

  const badTime = { type: 'income', amount: 50000, date: '2026-09-23', time: '25:99', category: 'Grab', walletHint: 'cash', description: 'Test' };
  assert.strictEqual(AISchema.validateTransactionProposal(badTime).valid, false);

  console.log('✅ [PASS] 4. Strict date (YYYY-MM-DD) and time (HH:mm) enforced');
  testsPassed++;
}

// Test 5: Kiểm tra sai lệch số học giữa quantity * unitPrice và amount
{
  const badMath = {
    type: 'expense',
    amount: 100000, // Cố tình khai sai: 3 * 25k = 75k != 100k
    quantity: 3,
    unitPrice: 25000,
    currency: 'VND',
    date: '2026-09-23',
    category: 'Ăn uống',
    walletHint: 'tiền mặt',
    description: '3 ly cà phê'
  };
  const res = AISchema.validateTransactionProposal(badMath);
  assert.strictEqual(res.valid, false, 'Sai lệch số học phải bị từ chối');
  assert(res.errors.some(e => e.includes('Arithmetic mismatch')));
  console.log('✅ [PASS] 5. Arithmetic mismatch detected and rejected');
  testsPassed++;
}

// Test 6: Batch Proposal Validation
{
  const emptyBatch = { transactions: [] };
  assert.strictEqual(AISchema.validateTransactionProposalBatch(emptyBatch).valid, false);

  const validBatch = {
    transactions: [
      { type: 'income', amount: 450000, currency: 'VND', category: 'Grab', walletHint: 'tiền mặt', date: '2026-09-23', description: 'Grab' },
      { type: 'expense', amount: 45000, currency: 'VND', category: 'Ăn uống', walletHint: 'tiền mặt', date: '2026-09-23', description: 'Ăn trưa' }
    ]
  };
  assert.strictEqual(AISchema.validateTransactionProposalBatch(validBatch).valid, true);
  console.log('✅ [PASS] 6. Batch transaction proposals validated');
  testsPassed++;
}

// Test 7: Financial Insight Response Validation
{
  const validInsight = {
    summary: 'Thu nhập tăng trưởng tốt trong tuần.',
    observations: [
      { type: 'spending_change', title: 'Ăn uống', value: '250.000đ', evidence: 'Tăng 10%' }
    ],
    suggestions: ['Tiết kiệm thêm 100k mỗi ngày'],
    confidence: 'data_based'
  };
  assert.strictEqual(AISchema.validateFinancialInsightResponse(validInsight).valid, true);

  const badInsight = { summary: '' };
  assert.strictEqual(AISchema.validateFinancialInsightResponse(badInsight).valid, false);
  console.log('✅ [PASS] 7. Financial insight schema validated');
  testsPassed++;
}

console.log(`\n🎉 KẾT QUẢ: ${testsPassed}/7 TESTS PASSED HOÀN TOÀN!`);
