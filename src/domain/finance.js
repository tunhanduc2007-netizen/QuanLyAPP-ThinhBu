/**
 * FINTRACK PRO — DETERMINISTIC FINANCIAL DOMAIN
 * Logic nghiệp vụ tài chính thuần túy, KHÔNG phụ thuộc DOM, KHÔNG phụ thuộc React
 * Tuân thủ tuyệt đối các nguyên tắc bất biến tài chính
 */

/**
 * Định dạng số tiền sang tiền tệ VNĐ (ví dụ: 450.000đ)
 * @param {number} amount 
 * @returns {string}
 */
export function formatVND(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString('vi-VN') + 'đ';
}

/**
 * Phân tích chuỗi số tiền tiếng Việt sang số nguyên VNĐ
 * Hỗ trợ các định dạng: 450k, 4.5k, 4tr5, 1.5 triệu, 50.000, 1.000.000
 * @param {string|number} input 
 * @returns {number}
 */
export function parseVND(input) {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? Math.round(input) : 0;
  }
  if (!input || typeof input !== 'string') return 0;

  const clean = input.toLowerCase().replace(/đ|vnd|đồng/g, '').trim();

  // 1. Dạng triệu kết hợp: "4tr5" -> 4,500,000; "1tr2" -> 1,200,000
  const trMatch = clean.match(/^(\d+)\s*(?:tr|trieu|triệu)\s*(\d+)$/i);
  if (trMatch) {
    const whole = parseInt(trMatch[1], 10);
    const fracPart = trMatch[2];
    const fracValue = parseInt(fracPart.padEnd(6, '0').slice(0, 6), 10);
    return (whole * 1000000) + fracValue;
  }

  // 2. Dạng số thập phân triệu: "1.5 triệu", "1,5 triệu", "5tr"
  const decTrMatch = clean.match(/^(\d+(?:[.,]\d+)?)\s*(?:tr|trieu|triệu)$/i);
  if (decTrMatch) {
    const num = parseFloat(decTrMatch[1].replace(',', '.'));
    return Math.round(num * 1000000);
  }

  // 3. Dạng số thập phân nghìn: "4.5k", "4,5k" -> 4,500
  const decKMatch = clean.match(/^(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|ngàn)$/i);
  if (decKMatch) {
    const num = parseFloat(decKMatch[1].replace(',', '.'));
    return Math.round(num * 1000);
  }

  // 4. Dạng nghìn: "450k", "120k", "70 nghìn"
  const kMatch = clean.match(/^(\d+)\s*(?:k|nghìn|ngàn)$/i);
  if (kMatch) {
    return parseInt(kMatch[1], 10) * 1000;
  }

  // 5. Dạng chuẩn có dấu phân cách: "1.000.000", "450,000"
  const dotFormatMatch = clean.match(/^(\d{1,3}(?:[.,]\d{3})+)$/);
  if (dotFormatMatch) {
    return parseInt(dotFormatMatch[1].replace(/[.,]/g, ''), 10);
  }

  // 6. Số thuần túy
  const pure = clean.replace(/[^\d]/g, '');
  return parseInt(pure, 10) || 0;
}

/**
 * Tính toán dòng tiền ròng (Net Cash Flow)
 */
export function calculateNetCashFlow(income, expense) {
  return (Number(income) || 0) - (Number(expense) || 0);
}

/**
 * Tính tỷ lệ tiết kiệm (%)
 */
export function calculateSavingsRate(income, expense) {
  const inc = Number(income) || 0;
  const exp = Number(expense) || 0;
  if (inc <= 0) return 0;
  const net = inc - exp;
  return Number(((net / inc) * 100).toFixed(2));
}

/**
 * Tính toán tổng quan tài chính từ danh sách giao dịch
 */
export function calculateOverview(transactions = [], initialBank = 0, initialCash = 0, targetMonth = '') {
  let monthlyIncome = 0;
  let monthlyExpense = 0;
  let bankDelta = 0;
  let cashDelta = 0;

  const currentMonth = targetMonth || new Date().toISOString().slice(0, 7);

  transactions.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    const txDate = tx.isoDate || (tx.createdAt ? tx.createdAt.split('T')[0] : '');
    const isCurrentMonth = !txDate || txDate.startsWith(currentMonth);

    if (tx.type === 'income') {
      if (isCurrentMonth) monthlyIncome += amt;
      if (tx.account === 'Tiền mặt') cashDelta += amt;
      else bankDelta += amt;
    } else if (tx.type === 'expense') {
      if (isCurrentMonth) monthlyExpense += amt;
      if (tx.account === 'Tiền mặt') cashDelta -= amt;
      else bankDelta -= amt;
    } else if (tx.type === 'transfer') {
      const from = tx.fromAccount || (tx.account && tx.account.split(' → ')[0]) || 'Ngân hàng';
      const to = tx.toAccount || (tx.account && tx.account.split(' → ')[1]) || 'Tiền mặt';
      if (from === 'Ngân hàng') bankDelta -= amt;
      else if (from === 'Tiền mặt') cashDelta -= amt;

      if (to === 'Ngân hàng') bankDelta += amt;
      else if (to === 'Tiền mặt') cashDelta += amt;
    }
  });

  const bankBalance = initialBank + bankDelta;
  const cashBalance = initialCash + cashDelta;
  const currentBalance = bankBalance + cashBalance;
  const monthlySavings = monthlyIncome - monthlyExpense;
  const savingsGrowthRate = calculateSavingsRate(monthlyIncome, monthlyExpense);

  return {
    currentBalance,
    monthlyIncome,
    monthlyExpense,
    monthlySavings,
    savingsGrowthRate,
    bankBalance,
    cashBalance
  };
}

/**
 * Phân bổ chi tiêu theo danh mục
 */
export function calculateCategoryBreakdown(transactions = [], type = 'expense') {
  const categoryTotals = {};
  let total = 0;

  transactions.forEach(tx => {
    if (tx.type === type) {
      const amt = Number(tx.amount) || 0;
      const cat = tx.category || 'Khác';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      total += amt;
    }
  });

  return Object.entries(categoryTotals).map(([cat, amt]) => ({
    category: cat,
    amount: amt,
    percent: total > 0 ? Number(((amt / total) * 100).toFixed(1)) : 0
  })).sort((a, b) => b.amount - a.amount);
}

/**
 * Theo dõi hạn mức ngân sách (Budget Engine)
 */
export function calculateBudgetUsage(transactions = [], budgets = []) {
  return budgets.map(bg => {
    let used = 0;
    transactions.forEach(tx => {
      if (tx.type === 'expense' && (tx.category === bg.title || tx.category === bg.id)) {
        used += Number(tx.amount) || 0;
      }
    });
    const target = Number(bg.target) || 1;
    const percent = Math.min(100, Number(((used / target) * 100).toFixed(1)));
    const isWarning = (used / target) >= 0.90; // Cảnh báo khi đạt >= 90%

    return {
      ...bg,
      used,
      percent,
      isWarning
    };
  });
}

/**
 * Sinh UUID duy nhất cho giao dịch
 */
export function generateAppUUID(prefix = 'tx') {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${prefix}-${hex}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export default {
  formatVND,
  parseVND,
  calculateNetCashFlow,
  calculateSavingsRate,
  calculateOverview,
  calculateCategoryBreakdown,
  calculateBudgetUsage,
  generateAppUUID
};
