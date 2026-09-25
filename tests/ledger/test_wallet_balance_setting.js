import assert from 'assert';
import { reconcileBalancesFromLedger } from '../../src/domain/reconciliation.js';
import { calculateOverview } from '../../src/domain/finance.js';

console.log('🧪 Testing Wallet Initial Balance & Adjustment Logic...');

// 1. Initial Clean state (0 txs), setting cash = 2,000,000 and bank = 10,000,000
const initialWallets = {
  initialBankBalance: 10000000,
  initialCashBalance: 2000000,
  accounts: [
    { name: 'Ngân hàng', balance: 10000000 },
    { name: 'Tiền mặt', balance: 2000000 }
  ]
};

const recClean = reconcileBalancesFromLedger([], initialWallets);
assert.strictEqual(recClean.calcBankBal, 10000000, 'Bank balance matches initial');
assert.strictEqual(recClean.calcCashBal, 2000000, 'Cash balance matches initial');
assert.strictEqual(recClean.ledgerTotal, 12000000, 'Total matches sum of initial balances');

// 2. Add an income of 500,000 to Cash and expense of 1,000,000 from Bank
const txs = [
  { id: 'tx-1', type: 'income', amount: 500000, account: 'Tiền mặt' },
  { id: 'tx-2', type: 'expense', amount: 1000000, account: 'Ngân hàng' }
];

const recWithTxs = reconcileBalancesFromLedger(txs, initialWallets);
assert.strictEqual(recWithTxs.calcBankBal, 9000000, 'Bank: 10M - 1M = 9M');
assert.strictEqual(recWithTxs.calcCashBal, 2500000, 'Cash: 2M + 500k = 2.5M');
assert.strictEqual(recWithTxs.ledgerTotal, 11500000, 'Total: 9M + 2.5M = 11.5M');

// 3. User adjusts Cash wallet balance to 3,000,000
// Current cash delta is +500,000. So new initial cash must be 3,000,000 - 500,000 = 2,500,000.
const adjustedWallets = {
  ...initialWallets,
  initialCashBalance: 3000000 - 500000
};

const recAdjusted = reconcileBalancesFromLedger(txs, adjustedWallets);
assert.strictEqual(recAdjusted.calcCashBal, 3000000, 'Cash balance is updated to 3M');
assert.strictEqual(recAdjusted.calcBankBal, 9000000, 'Bank balance remains 9M');
assert.strictEqual(recAdjusted.ledgerTotal, 12000000, 'Total is now 12M');

// 4. Test calculateOverview
const overview = calculateOverview(txs, adjustedWallets.initialBankBalance, adjustedWallets.initialCashBalance);
assert.strictEqual(overview.currentBalance, 12000000, 'Overview balance is 12M');
assert.strictEqual(overview.bankBalance, 9000000, 'Overview bank balance is 9M');
assert.strictEqual(overview.cashBalance, 3000000, 'Overview cash balance is 3M');

console.log('✅ All Wallet Balance Logic tests passed successfully!');
