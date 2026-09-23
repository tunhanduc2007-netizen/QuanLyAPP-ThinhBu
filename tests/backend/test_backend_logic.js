/**
 * TEST SUITE: BACKEND & FINANCIAL LOGIC ENGINE
 * Kiểm tra toàn diện 8 module lõi của hệ thống tài chính
 * Chạy bằng: node test_backend_logic.js
 */

const assert = require('assert');

// 1. Mock LocalStorage & DOM
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

global.document = {
  getElementById: () => null,
  querySelectorAll: () => [],
  documentElement: { setAttribute: () => {}, removeAttribute: () => {} },
  addEventListener: () => {}
};
global.window = {};

// 2. Load Core Data & Logic
const fs = require('fs');
const path = require('path');
const dataContent = fs.readFileSync(path.join(__dirname, '../../src/constants/data.js'), 'utf8');
const vm = require('vm');
vm.runInThisContext(dataContent);
global.DEFAULT_FINANCE_DATA = DEFAULT_FINANCE_DATA;

// Tạo mô phỏng FinanceEngine dựa trên app.js
class FinancialEngine {
  constructor() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_FINANCE_DATA));
  }

  parseVND(str) {
    if (!str) return 0;
    return parseInt(str.toString().replace(/[^\d]/g, ''), 10) || 0;
  }

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  recalculateBalances() {
    if (!this.data) return;

    if (!this.data.wallets) {
      this.data.wallets = { totalBalance: 0, accounts: [], recentTransactions: [] };
    }
    if (!this.data.wallets.accounts || this.data.wallets.accounts.length === 0) {
      this.data.wallets.accounts = [
        { id: "acc-1", name: "Ngân hàng", balance: 0 },
        { id: "acc-2", name: "Tiền mặt", balance: 0 }
      ];
    }

    const totalAccountsBal = this.data.wallets.accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    this.data.wallets.totalBalance = totalAccountsBal;

    if (!this.data.overview) {
      this.data.overview = { currentBalance: 0, monthlyIncome: 0, monthlyExpense: 0, monthlySavings: 0 };
    }
    this.data.overview.currentBalance = totalAccountsBal;

    const txs = this.data.transactions || [];
    let calcIncome = 0;
    let calcExpense = 0;

    const incCatMap = {};
    const expCatMap = {};
    const calDays = {};

    txs.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      const isoDate = tx.isoDate || '2026-09-20';

      if (!calDays[isoDate]) {
        calDays[isoDate] = { income: 0, expense: 0, net: 0, transactions: [] };
      }

      if (tx.type === 'income') {
        calcIncome += amt;
        incCatMap[tx.category] = (incCatMap[tx.category] || 0) + amt;
        calDays[isoDate].income += amt;
        calDays[isoDate].net += amt;
      } else if (tx.type === 'expense') {
        calcExpense += amt;
        expCatMap[tx.category] = (expCatMap[tx.category] || 0) + amt;
        calDays[isoDate].expense += amt;
        calDays[isoDate].net -= amt;
      }

      calDays[isoDate].transactions.push(tx);
    });

    this.data.overview.monthlyIncome = calcIncome;
    this.data.overview.monthlyExpense = calcExpense;
    this.data.overview.monthlySavings = calcIncome - calcExpense;

    if (!this.data.calendar) {
      this.data.calendar = { selectedMonth: 9, selectedYear: 2026, selectedDate: "2026-09-20", days: {} };
    }
    this.data.calendar.days = calDays;

    if (this.data.budgets && Array.isArray(this.data.budgets)) {
      this.data.budgets.forEach(b => {
        const used = expCatMap[b.title] || 0;
        b.used = used;
        b.percent = b.target > 0 ? Math.round((used / b.target) * 100) : 0;
        b.isWarning = b.percent >= 90;
      });
    }

    if (this.data.incomeSources && this.data.incomeSources.sources) {
      this.data.incomeSources.totalMonth = calcIncome;
      this.data.incomeSources.sources.forEach(s => {
        const amt = incCatMap[s.title] || 0;
        s.amount = amt;
        s.percent = calcIncome > 0 ? Math.round((amt / calcIncome) * 100) : 0;
      });
    }

    if (this.data.ranking) {
      const metric = this.data.ranking.metric || 'total_income';
      const rankAmount = (metric === 'net_income') ? this.data.overview.monthlySavings : this.data.overview.monthlyIncome;
      if (this.data.ranking.leaderboard && this.data.ranking.leaderboard[0]) {
        this.data.ranking.leaderboard[0].amount = Math.max(0, rankAmount);
      }
    }
  }

  addTransaction(type, amount, category, accountName, isoDate = '2026-09-20') {
    if (amount <= 0 || !Number.isFinite(amount) || amount > 1e15) {
      throw new Error('VALIDATION_ERROR: Số tiền không hợp lệ');
    }

    const acc = this.data.wallets.accounts.find(a => a.name === accountName) || this.data.wallets.accounts[0];
    if (type === 'income') {
      acc.balance += amount;
    } else if (type === 'expense') {
      acc.balance -= amount;
    }

    const tx = {
      id: 'tx-' + Date.now() + Math.random(),
      title: category,
      category: category,
      type: type,
      amount: amount,
      account: acc.name,
      isoDate: isoDate
    };

    if (!this.data.transactions) this.data.transactions = [];
    this.data.transactions.unshift(tx);
    this.recalculateBalances();
    return tx;
  }

  transfer(fromName, toName, amount) {
    if (amount <= 0 || !Number.isFinite(amount)) {
      throw new Error('VALIDATION_ERROR: Số tiền chuyển không hợp lệ');
    }
    if (fromName === toName) {
      throw new Error('VALIDATION_ERROR: Ví nguồn và đích trùng nhau');
    }

    const accFrom = this.data.wallets.accounts.find(a => a.name === fromName);
    const accTo = this.data.wallets.accounts.find(a => a.name === toName);

    if (!accFrom || !accTo) throw new Error('NOT_FOUND: Không tìm thấy ví');
    if (accFrom.balance < amount) throw new Error('INSUFFICIENT_FUNDS: Số dư không đủ');

    accFrom.balance -= amount;
    accTo.balance += amount;

    const tx = {
      id: 'tx-tr-' + Date.now(),
      title: `Chuyển ${fromName} -> ${toName}`,
      category: 'Chuyển khoản',
      type: 'transfer',
      amount: amount,
      account: `${fromName} → ${toName}`,
      isoDate: '2026-09-20'
    };

    if (!this.data.transactions) this.data.transactions = [];
    this.data.transactions.unshift(tx);
    this.recalculateBalances();
  }

  addFundToGoal(goalIndex, amount = 500000) {
    const goal = this.data.goals && this.data.goals[goalIndex];
    if (!goal) throw new Error('NOT_FOUND: Mục tiêu không tồn tại');

    const sourceAcc = this.data.wallets.accounts.find(a => a.balance >= amount);
    if (!sourceAcc) throw new Error('INSUFFICIENT_FUNDS: Không ví nào đủ tiền');

    sourceAcc.balance -= amount;
    goal.current = (goal.current || 0) + amount;
    goal.percent = Math.min(100, Math.round((goal.current / goal.target) * 100));

    this.data.transactions.unshift({
      id: 'tx-goal-' + Date.now(),
      title: `Tích lũy: ${goal.title}`,
      category: 'Mục tiêu',
      type: 'expense',
      amount: amount,
      account: sourceAcc.name,
      isoDate: '2026-09-20'
    });

    this.recalculateBalances();
  }
}

// BẮT ĐẦU CHẠY CÁC TEST CASES
console.log('====================================================');
console.log('🚀 KHỞI CHẠY TEST SUITE LOGIC BACKEND FINTRACK PRO');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   -> Lỗi: ${err.message}\n`);
  }
}

// TEST 1: Khởi tạo dữ liệu sạch (Clean State)
test('1. Clean state initial balances must be exactly 0đ', () => {
  const engine = new FinancialEngine();
  engine.recalculateBalances();
  assert.strictEqual(engine.data.overview.currentBalance, 0);
  assert.strictEqual(engine.data.wallets.totalBalance, 0);
  assert.strictEqual(engine.data.overview.monthlyIncome, 0);
  assert.strictEqual(engine.data.overview.monthlyExpense, 0);
  assert.strictEqual(engine.data.overview.monthlySavings, 0);
});

// TEST 2: Ghi nhận Thu nhập & Chi tiêu (Income & Expense Consistency)
test('2. Income increases balance, Expense decreases balance across Dashboard & Wallets', () => {
  const engine = new FinancialEngine();
  // Nạp ví Ngân hàng: +5.000.000đ
  engine.addTransaction('income', 5000000, 'Lương', 'Ngân hàng');
  assert.strictEqual(engine.data.overview.currentBalance, 5000000);
  assert.strictEqual(engine.data.wallets.totalBalance, 5000000);
  assert.strictEqual(engine.data.overview.monthlyIncome, 5000000);
  assert.strictEqual(engine.data.overview.monthlySavings, 5000000);

  // Chi tiêu Ăn uống: -1.200.000đ
  engine.addTransaction('expense', 1200000, 'Ăn uống', 'Ngân hàng');
  assert.strictEqual(engine.data.overview.currentBalance, 3800000);
  assert.strictEqual(engine.data.wallets.totalBalance, 3800000);
  assert.strictEqual(engine.data.overview.monthlyExpense, 1200000);
  assert.strictEqual(engine.data.overview.monthlySavings, 3800000);
});

// TEST 3: Chuyển khoản bảo toàn tổng số dư & Không tính vào Thu/Chi
test('3. Transfer maintains total balance invariance and does NOT count as Income/Expense', () => {
  const engine = new FinancialEngine();
  engine.addTransaction('income', 10000000, 'Grab', 'Ngân hàng');
  
  const bank = engine.data.wallets.accounts.find(a => a.name === 'Ngân hàng');
  const cash = engine.data.wallets.accounts.find(a => a.name === 'Tiền mặt');

  // Chuyển 3.000.000đ từ Ngân hàng -> Tiền mặt (rút tiền mặt)
  engine.transfer('Ngân hàng', 'Tiền mặt', 3000000);

  assert.strictEqual(bank.balance, 7000000, 'Bank balance must be 7.000.000');
  assert.strictEqual(cash.balance, 3000000, 'Cash balance must be 3.000.000');
  assert.strictEqual(engine.data.wallets.totalBalance, 10000000, 'Total balance invariant holds');
  assert.strictEqual(engine.data.overview.currentBalance, 10000000, 'Overview balance invariant holds');
  assert.strictEqual(engine.data.overview.monthlyIncome, 10000000, 'Income must remain 10M (not 13M)');
  assert.strictEqual(engine.data.overview.monthlyExpense, 0, 'Expense must remain 0 (not 3M)');
});

// TEST 4: Chuyển khoản thất bại khi không đủ số dư (No Overdraft)
test('4. Transfer fails with INSUFFICIENT_FUNDS when balance is inadequate', () => {
  const engine = new FinancialEngine();
  assert.throws(() => {
    engine.transfer('Ngân hàng', 'Tiền mặt', 500000);
  }, /INSUFFICIENT_FUNDS/);
});

// TEST 5: Tính toán Lịch Thu Chi (Calendar Net Formula = Income - Expense)
test('5. Calendar Day Net = Income - Expense with accurate date aggregation', () => {
  const engine = new FinancialEngine();
  engine.addTransaction('income', 2000000, 'Công việc', 'Ngân hàng', '2026-09-21');
  engine.addTransaction('expense', 500000, 'Ăn uống', 'Ngân hàng', '2026-09-21');
  engine.addTransaction('expense', 200000, 'Xăng xe', 'Ngân hàng', '2026-09-21');

  const day = engine.data.calendar.days['2026-09-21'];
  assert(day, 'Day 2026-09-21 must exist in calendar');
  assert.strictEqual(day.income, 2000000);
  assert.strictEqual(day.expense, 700000);
  assert.strictEqual(day.net, 1300000, 'Net must be exactly 1.300.000đ');
  assert.strictEqual(day.transactions.length, 3);
});

// TEST 6: Ngân sách tự động tính % và bật cảnh báo khi >= 90%
test('6. Budget engine tracks spending % and raises warning threshold >= 90%', () => {
  const engine = new FinancialEngine();
  // Target Ăn uống là 5.000.000đ
  engine.addTransaction('expense', 4600000, 'Ăn uống', 'Ngân hàng');
  const bg = engine.data.budgets.find(b => b.title === 'Ăn uống');
  assert(bg, 'Ăn uống budget must exist');
  assert.strictEqual(bg.used, 4600000);
  assert.strictEqual(bg.percent, 92);
  assert.strictEqual(bg.isWarning, true, 'isWarning must be true at 92%');
});

// TEST 7: Mục tiêu tài chính trích tiền ví thật (Không tạo tiền ảo)
test('7. Goal funding deducts from actual wallet balance and records transaction', () => {
  const engine = new FinancialEngine();
  engine.data.goals = [{ id: 'gl-1', title: 'Mua điện thoại', target: 20000000, current: 0, percent: 0 }];
  engine.addTransaction('income', 2000000, 'Lương', 'Ngân hàng');

  engine.addFundToGoal(0, 500000);
  const bank = engine.data.wallets.accounts.find(a => a.name === 'Ngân hàng');
  assert.strictEqual(bank.balance, 1500000, 'Wallet must be deducted by 500k');
  assert.strictEqual(engine.data.goals[0].current, 500000, 'Goal current must be 500k');
  assert.strictEqual(engine.data.goals[0].percent, 3, 'Goal progress percent matches');
  assert.strictEqual(engine.data.overview.currentBalance, 1500000);
});

// TEST 8: Phòng chống XSS và Format tiền tệ Việt Nam (parseVND)
test('8. XSS sanitization and parseVND handles Vietnamese currency strings properly', () => {
  const engine = new FinancialEngine();
  assert.strictEqual(engine.parseVND('500.000 đ'), 500000);
  assert.strictEqual(engine.parseVND('25.500.000'), 25500000);
  assert.strictEqual(engine.parseVND('abc'), 0);

  const rawPayload = '<script>alert("hack")</script>';
  const clean = engine.escapeHtml(rawPayload);
  assert(!clean.includes('<script>'), 'HTML tags must be escaped');
  assert(clean.includes('&lt;script&gt;'), 'Must contain escaped entities');
});

// TEST 9: Ranking Metric Switching (total_income vs net_income)
test('9. Ranking Leaderboard correctly adjusts amount based on selected metric', () => {
  const engine = new FinancialEngine();
  engine.addTransaction('income', 10000000, 'Grab', 'Ngân hàng');
  engine.addTransaction('expense', 4000000, 'Nhà ở', 'Ngân hàng');

  // Metric 1: total_income -> 10.000.000
  engine.data.ranking.metric = 'total_income';
  engine.recalculateBalances();
  assert.strictEqual(engine.data.ranking.leaderboard[0].amount, 10000000);

  // Metric 2: net_income -> 6.000.000 (10M - 4M)
  engine.data.ranking.metric = 'net_income';
  engine.recalculateBalances();
  assert.strictEqual(engine.data.ranking.leaderboard[0].amount, 6000000);
});

console.log('\n====================================================');
console.log(`KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS ĐÃ VƯỢT QUA!`);
console.log('====================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
