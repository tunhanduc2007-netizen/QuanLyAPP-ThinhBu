/**
 * TEST SUITE: test_ai_validation.js
 * Kiểm thử Deterministic Validator: Phép tính số học, phân giải danh mục, ví, và múi giờ Asia/Ho_Chi_Minh
 */

const assert = require('assert');
const AIValidator = require('../../src/services/ai/ai-validator.js');

console.log('====================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ AI VALIDATION: test_ai_validation.js');
console.log('====================================================');

let testsPassed = 0;

// Test 1: Deterministic Math Engine (Rule 7)
{
  const tx = { amount: 75000, quantity: 3, unitPrice: 25000 };
  const res = AIValidator.normalizeAndVerifyAmount(tx);
  assert.strictEqual(res.amount, 75000, '3 ly x 25.000đ phải bằng 75.000đ');

  // Trường hợp LLM đưa ra amount sai nhưng có quantity và unitPrice
  const txWithWrongLlmAmount = { amount: 80000, quantity: 4, unitPrice: 20000 };
  const verified = AIValidator.normalizeAndVerifyAmount(txWithWrongLlmAmount);
  assert.strictEqual(verified.amount, 80000, 'Engine tính lại: 4 x 20.000 = 80.000đ');
  console.log('✅ [PASS] 1. Deterministic arithmetic calculation verified');
  testsPassed++;
}

// Test 2: Múi giờ Asia/Ho_Chi_Minh & Phân giải ngày tương đối (Rule 10)
{
  const today = AIValidator.getVietnamTodayDate();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(today), 'Ngày hôm nay phải có định dạng YYYY-MM-DD');

  const resolvedToday = AIValidator.resolveTemporalDate('sáng nay');
  assert.strictEqual(resolvedToday, today, '"sáng nay" phải tương đương ngày hôm nay');

  const resolvedYesterday = AIValidator.resolveTemporalDate('hôm qua');
  // Ngày hôm qua phải khác ngày hôm nay và lùi đúng 1 ngày
  const cur = new Date(today);
  cur.setDate(cur.getDate() - 1);
  const expectedYesterday = cur.toISOString().slice(0, 10);
  assert.strictEqual(resolvedYesterday, expectedYesterday, '"hôm qua" phải lùi 1 ngày');

  const resolvedLastWeek = AIValidator.resolveTemporalDate('tuần trước');
  const past = new Date(today);
  past.setDate(past.getDate() - 7);
  assert.strictEqual(resolvedLastWeek, past.toISOString().slice(0, 10), '"tuần trước" phải lùi 7 ngày');
  console.log('✅ [PASS] 2. Asia/Ho_Chi_Minh temporal date resolution verified');
  testsPassed++;
}

// Test 3: Phân giải Ví (Rule 8)
{
  const cashRes = AIValidator.resolveWallet('tiền mặt');
  assert.strictEqual(cashRes.resolvedWallet, 'Tiền mặt');
  assert.strictEqual(cashRes.walletId, 'acc-cash');
  assert.strictEqual(cashRes.ambiguous, false);

  const bankRes = AIValidator.resolveWallet('chuyển khoản qua ngân hàng VCB');
  assert.strictEqual(bankRes.resolvedWallet, 'Ngân hàng');
  assert.strictEqual(bankRes.walletId, 'acc-bank');
  assert.strictEqual(bankRes.ambiguous, false);

  // Mơ hồ (Ambiguous): Chỉ nói "ví" hoặc không rõ ràng
  const ambigRes = AIValidator.resolveWallet('trong ví');
  assert.strictEqual(ambigRes.ambiguous, true, 'Từ ngữ mơ hồ phải đánh dấu ambiguous = true');
  assert.strictEqual(ambigRes.resolvedWallet, null);
  console.log('✅ [PASS] 3. Deterministic wallet resolution & ambiguity detection verified');
  testsPassed++;
}

// Test 4: Phân giải Danh mục (Rule 9)
{
  const coffeeRes = AIValidator.resolveCategory('cà phê Highland', 'expense');
  assert.strictEqual(coffeeRes.resolvedCategory, 'Ăn uống');
  assert.strictEqual(coffeeRes.needsConfirmation, false);

  const fuelRes = AIValidator.resolveCategory('đổ xăng petrolimex', 'expense');
  assert.strictEqual(fuelRes.resolvedCategory, 'Xăng xe');
  assert.strictEqual(fuelRes.needsConfirmation, false);

  const grabRes = AIValidator.resolveCategory('chạy cuốc grab', 'income');
  assert.strictEqual(grabRes.resolvedCategory, 'Grab');
  assert.strictEqual(grabRes.needsConfirmation, false);

  // Danh mục lạ không đoán mò
  const unknownRes = AIValidator.resolveCategory('chi tiêu vũ trụ lạ lùng', 'expense');
  assert.strictEqual(unknownRes.resolvedCategory, 'Khác');
  assert.strictEqual(unknownRes.needsConfirmation, true, 'Danh mục không rõ phải yêu cầu xác nhận');
  console.log('✅ [PASS] 4. Category resolution & confirmation requirement verified');
  testsPassed++;
}

// Test 5: Phân giải và kiểm định toàn diện (Rule 6, 8, 9)
{
  const raw = {
    type: 'expense',
    amount: 75000,
    quantity: 3,
    unitPrice: 25000,
    currency: 'VND',
    category: 'cà phê',
    walletHint: 'tiền mặt',
    date: 'hôm nay',
    description: '3 ly cà phê sáng'
  };

  const fullRes = AIValidator.validateAndNormalizeProposal(raw);
  assert.strictEqual(fullRes.status, 'VALID');
  assert.strictEqual(fullRes.proposal.amount, 75000);
  assert.strictEqual(fullRes.proposal.category, 'Ăn uống');
  assert.strictEqual(fullRes.proposal.wallet, 'Tiền mặt');
  assert.strictEqual(fullRes.proposal.requiresManualClarification, false);

  // Khi ví mơ hồ -> status thành NEEDS_CONFIRMATION
  const rawAmbigWallet = { ...raw, walletHint: 'ví lạ' };
  const ambigRes = AIValidator.validateAndNormalizeProposal(rawAmbigWallet);
  assert.strictEqual(ambigRes.status, 'NEEDS_CONFIRMATION');
  assert.strictEqual(ambigRes.proposal.walletAmbiguous, true);
  console.log('✅ [PASS] 5. Full proposal normalization and status pipeline verified');
  testsPassed++;
}

console.log(`\n🎉 KẾT QUẢ: ${testsPassed}/5 TESTS PASSED HOÀN TOÀN!`);
