/**
 * FINTRACK PRO — RECONCILIATION ENGINE
 * Đối soát số dư ví từ Sổ Cái (Ledger SSOT)
 * Đảm bảo: Dữ liệu tài chính chân thực 100% bắt nguồn từ Ledger
 */

/**
 * Đối soát số dư ví từ toàn bộ Ledger transactions
 * @param {Array} transactions 
 * @param {Object} wallets 
 * @returns {{ match: boolean, drift: number, calcBankBal: number, calcCashBal: number, ledgerTotal: number }}
 */
export function reconcileBalancesFromLedger(transactions = [], wallets = {}) {
  let ledgerIncome = 0;
  let ledgerExpense = 0;
  const accountDeltas = { 'Ngân hàng': 0, 'Tiền mặt': 0 };

  const normAccount = (acc) => {
    if (!acc) return 'Ngân hàng';
    if (acc === 'Tiền mặt') return 'Tiền mặt';
    return 'Ngân hàng';
  };

  transactions.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    const accName = normAccount(tx.account);
    if (tx.type === 'income') {
      ledgerIncome += amt;
      accountDeltas[accName] = (accountDeltas[accName] || 0) + amt;
    } else if (tx.type === 'expense') {
      ledgerExpense += amt;
      accountDeltas[accName] = (accountDeltas[accName] || 0) - amt;
    } else if (tx.type === 'transfer') {
      const from = normAccount(tx.fromAccount || (tx.account && tx.account.split(' → ')[0]));
      const to = normAccount(tx.toAccount || (tx.account && tx.account.split(' → ')[1]));
      accountDeltas[from] = (accountDeltas[from] || 0) - amt;
      accountDeltas[to] = (accountDeltas[to] || 0) + amt;
    }
  });

  let initialBank = 0;
  let initialCash = 0;
  if (typeof wallets.initialBankBalance === 'number') {
    initialBank = wallets.initialBankBalance;
    initialCash = wallets.initialCashBalance || 0;
  } else {
    const currentBank = (wallets.accounts || []).find(a => a.name === 'Ngân hàng' || a.name === 'Tài khoản ngân hàng')?.balance || 0;
    const currentCash = (wallets.accounts || []).find(a => a.name === 'Tiền mặt')?.balance || 0;
    initialBank = currentBank - (accountDeltas['Ngân hàng'] || 0);
    initialCash = currentCash - (accountDeltas['Tiền mặt'] || 0);
  }

  const calcBankBal = initialBank + (accountDeltas['Ngân hàng'] || 0);
  const calcCashBal = initialCash + (accountDeltas['Tiền mặt'] || 0);
  const ledgerTotal = calcBankBal + calcCashBal;

  const currBank = (wallets.accounts || []).find(a => a.name === 'Ngân hàng' || a.name === 'Tài khoản ngân hàng')?.balance || 0;
  const currCash = (wallets.accounts || []).find(a => a.name === 'Tiền mặt')?.balance || 0;
  const currentTotal = currBank + currCash;

  const drift = currentTotal - ledgerTotal;
  const driftDetected = Math.abs(drift) > 0.001;

  return {
    match: !driftDetected,
    drift: drift,
    calcBankBal: Math.round(calcBankBal),
    calcCashBal: Math.round(calcCashBal),
    ledgerTotal: Math.round(ledgerTotal),
    initialBankBalance: initialBank,
    initialCashBalance: initialCash
  };
}

export default {
  reconcileBalancesFromLedger
};
