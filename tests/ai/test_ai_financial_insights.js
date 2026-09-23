/**
 * TEST SUITE: test_ai_financial_insights.js
 * Kiểm thử Financial Insights Agent (Feature B)
 * Đảm bảo: Context được khử khuẩn 100% PII, tính toán deterministic trước khi AI thuyết minh, không bịa đặt số liệu
 */

const assert = require('assert');
const { MockLocalAIProvider } = require('../../src/services/ai/ai-provider.js');
const { FinancialInsightsAgent } = require('../../src/services/ai/financial-insights.js');

console.log('====================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ AI FINANCIAL INSIGHTS: test_ai_financial_insights.js');
console.log('====================================================');

let testsPassed = 0;
const provider = new MockLocalAIProvider();
const agent = new FinancialInsightsAgent(provider);

async function runTests() {
  // Test 1: Sanitized Financial Context Generator (Rule 14, 21)
  {
    const sampleTxs = [
      { id: 'tx-1', amount: 10000000, type: 'income', category: 'Grab', isoDate: '2026-09-05', userUid: 'SECRET_UID_1', token: 'AUTH_TOKEN' },
      { id: 'tx-2', amount: 5200000, type: 'income', category: 'Lương', isoDate: '2026-09-10', userUid: 'SECRET_UID_1' },
      { id: 'tx-3', amount: 2500000, type: 'expense', category: 'Ăn uống', isoDate: '2026-09-12' },
      { id: 'tx-4', amount: 1800000, type: 'expense', category: 'Xăng xe', isoDate: '2026-09-15' },
      { id: 'tx-5', amount: 5100000, type: 'expense', category: 'Sinh hoạt', isoDate: '2026-09-20' }
    ];
    const budget = { monthlyLimit: 12000000 };

    const ctx = agent.buildSanitizedContext(sampleTxs, {}, budget);

    // Kiểm tra PII data minimization (Rule 21)
    const serialized = JSON.stringify(ctx);
    assert(!serialized.includes('SECRET_UID_1'), 'Context không được chứa User UID');
    assert(!serialized.includes('AUTH_TOKEN'), 'Context không được chứa Auth Token');

    // Kiểm tra tính toán định lượng deterministic (Rule 16)
    assert.strictEqual(ctx.income, 15200000);
    assert.strictEqual(ctx.expense, 9400000);
    assert.strictEqual(ctx.net, 5800000);
    assert.strictEqual(ctx.savingsRate, 38.16);

    // Ngân sách 9.4M / 12M = 78.3%
    assert.strictEqual(ctx.budgetUtilization, 78.3);

    console.log('✅ [PASS] 1. Sanitized financial context generated with zero PII and exact deterministic metrics');
    testsPassed++;
  }

  // Test 2: AI Response Contract & Grounding (Rule 15, 34)
  {
    const sampleTxs = [
      { id: 'tx-1', amount: 15200000, type: 'income', category: 'Lương', isoDate: '2026-09-01' },
      { id: 'tx-2', amount: 9400000, type: 'expense', category: 'Ăn uống', isoDate: '2026-09-15' }
    ];

    const result = await agent.analyze(sampleTxs, {}, null);

    assert.strictEqual(result.status, 'SUCCESS');
    assert.strictEqual(typeof result.summary, 'string');
    assert(Array.isArray(result.observations));
    assert(Array.isArray(result.suggestions));
    assert.strictEqual(result.confidence, 'data_based');

    // Số liệu trong summary phải tương ứng với context tính toán
    assert(result.summary.includes('15.200.000') || result.summary.includes('15,200,000'));
    assert(result.summary.includes('9.400.000') || result.summary.includes('9,400,000'));

    console.log('✅ [PASS] 2. Financial insights response strictly conforms to structured contract and grounded data');
    testsPassed++;
  }

  // Test 3: Insufficient Data Handling (Rule 15)
  {
    // Dữ liệu trống rỗng
    const emptyResult = await agent.analyze([], {}, null);
    assert.strictEqual(emptyResult.status, 'INSUFFICIENT_DATA');
    assert(emptyResult.summary.includes('Chưa có đủ dữ liệu'));
    assert.strictEqual(emptyResult.observations.length, 0);

    console.log('✅ [PASS] 3. Insufficient data correctly detected without hallucinating facts');
    testsPassed++;
  }

  // Test 4: Giới hạn phạm vi tư vấn tài chính (No financial advisory overreach - Rule 18)
  {
    const sampleTxs = [
      { id: 'tx-1', amount: 5000000, type: 'income', category: 'Grab', isoDate: '2026-09-10' },
      { id: 'tx-2', amount: 2000000, type: 'expense', category: 'Ăn uống', isoDate: '2026-09-12' }
    ];

    const res = await agent.analyze(sampleTxs, {}, null);
    const textAll = JSON.stringify(res).toLowerCase();

    // Không được tự xúi mua cổ phiếu, crypto, vay nợ
    assert(!textAll.includes('bitcoin') && !textAll.includes('crypto'), 'Không được tư vấn crypto');
    assert(!textAll.includes('mua cổ phiếu') && !textAll.includes('chứng khoán'), 'Không được phán kèo đầu tư');
    assert(!textAll.includes('vay tín chấp') && !textAll.includes('fe credit'), 'Không được tư vấn vay nợ');

    console.log('✅ [PASS] 4. No financial advisory overreach verified');
    testsPassed++;
  }

  console.log(`\n🎉 KẾT QUẢ: ${testsPassed}/4 TESTS PASSED HOÀN TOÀN!`);
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
