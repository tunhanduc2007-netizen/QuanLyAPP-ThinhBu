/**
 * DATA MIGRATION ENGINE — FINTRACK PRO
 * Chuyển đổi dữ liệu từ Single JSON Blob cũ sang Firestore Subcollections chuẩn hóa:
 * users/{uid}/transactions/{txId}
 * users/{uid}/wallets/{walletId}
 * users/{uid}/budgets/{budgetId}
 * users/{uid}/goals/{goalId}
 * 
 * Kiểm định số dư và số lượng giao dịch: 100% khớp mới chốt hoàn tất.
 */

const assert = require('assert');

class LegacyDataMigrator {
  constructor(dbInstance = null) {
    this.db = dbInstance;
  }

  /**
   * Chuyển đổi từ dữ liệu Blob (object hoặc JSON string) sang cấu trúc Subcollections
   * @param {string} uid 
   * @param {Object|string} legacyBlob 
   * @returns {Object} Kết quả di chuyển & đối soát dữ liệu
   */
  migrate(uid, legacyBlob) {
    if (!uid) throw new Error('MIGRATION_ERROR: Thiếu UID người dùng');
    if (!legacyBlob) throw new Error('MIGRATION_ERROR: Không tìm thấy dữ liệu cũ');

    // 1. Parse dữ liệu cũ
    let legacyData = legacyBlob;
    if (typeof legacyBlob === 'string') {
      try {
        legacyData = JSON.parse(legacyBlob);
      } catch (e) {
        throw new Error('MIGRATION_ERROR: Dữ liệu cũ bị hỏng không thể JSON.parse: ' + e.message);
      }
    }

    // 2. Validate cấu trúc cơ bản
    const legacyTxs = Array.isArray(legacyData.transactions) ? legacyData.transactions : [];
    const legacyWallets = legacyData.wallets && Array.isArray(legacyData.wallets.accounts) ? legacyData.wallets.accounts : [];
    const legacyBudgets = Array.isArray(legacyData.budgets) ? legacyData.budgets : [];
    const legacyGoals = Array.isArray(legacyData.goals) ? legacyData.goals : [];

    const legacyTxCount = legacyTxs.length;
    const legacyTotalBalance = (legacyData.overview && typeof legacyData.overview.currentBalance === 'number')
      ? legacyData.overview.currentBalance
      : legacyWallets.reduce((s, a) => s + (Number(a.balance) || 0), 0);

    // 3. Chuẩn hóa từng document theo cấu trúc mới
    const newCollections = {
      userProfileDoc: {
        path: `users/${uid}`,
        data: {
          profile: legacyData.user || {},
          overview: legacyData.overview || {},
          calendar: legacyData.calendar || {},
          migratedAt: Date.now(),
          migrationVersion: '2.0-subcollections'
        }
      },
      wallets: [],
      transactions: [],
      budgets: [],
      goals: []
    };

    // 4. Tạo document cho từng Wallet
    let newWalletsTotal = 0;
    legacyWallets.forEach(acc => {
      const walletId = acc.id || (acc.name === 'Tiền mặt' ? 'acc-cash' : 'acc-bank');
      const balance = Number(acc.balance) || 0;
      newWalletsTotal += balance;
      newCollections.wallets.push({
        path: `users/${uid}/wallets/${walletId}`,
        data: {
          id: walletId,
          name: acc.name,
          icon: acc.icon || 'landmark',
          balance: balance,
          color: acc.color || '#10B981',
          bg: acc.bg || '#D1FAE5',
          updatedAt: Date.now()
        }
      });
    });

    // 5. Tạo document cho từng Transaction (Không còn lưu chuỗi JSON gộp)
    // Áp dụng Deduplication Map đảm bảo tính Idempotent khi chạy lại nhiều lần (Criteria 11)
    const txMap = new Map();
    const idMappings = [];

    legacyTxs.forEach((tx, idx) => {
      const sourceId = tx.id || `tx-migrated-${idx}`;
      const destId = sourceId;

      const txData = {
        id: destId,
        title: tx.title || 'Giao dịch',
        category: tx.category || 'Khác',
        type: tx.type || 'expense',
        amount: Number(tx.amount) || 0,
        account: tx.account || 'Ngân hàng',
        date: tx.date || '',
        time: tx.time || '12:00',
        isoDate: tx.isoDate || '',
        user: tx.user || (legacyData.user && legacyData.user.name) || 'Người dùng',
        icon: tx.icon || 'file-text',
        createdAt: tx.createdAt || (Date.now() - idx),
        migratedFromLegacy: true
      };

      txMap.set(destId, {
        path: `users/${uid}/transactions/${destId}`,
        data: txData
      });

      idMappings.push({
        sourceId: sourceId,
        destinationId: destId,
        status: 'MAPPED'
      });
    });

    newCollections.transactions = Array.from(txMap.values());

    // 6. Tạo document cho Budgets & Goals
    legacyBudgets.forEach(b => {
      newCollections.budgets.push({
        path: `users/${uid}/budgets/${b.id}`,
        data: { ...b, updatedAt: Date.now() }
      });
    });

    legacyGoals.forEach(g => {
      newCollections.goals.push({
        path: `users/${uid}/goals/${g.id}`,
        data: { ...g, updatedAt: Date.now() }
      });
    });

    // 7. KIỂM ĐỊNH TOÀN VẸN 4 CHỈ SỐ TÀI CHÍNH (CRITERIA 1 & CRITERIA 11)
    const sourceTransactionCount = legacyTxs.length;
    const destinationTransactionCount = newCollections.transactions.length;

    const sourceIncome = legacyTxs
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const destinationIncome = newCollections.transactions
      .filter(t => t.data.type === 'income')
      .reduce((s, t) => s + (Number(t.data.amount) || 0), 0);

    const sourceExpense = legacyTxs
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const destinationExpense = newCollections.transactions
      .filter(t => t.data.type === 'expense')
      .reduce((s, t) => s + (Number(t.data.amount) || 0), 0);

    const sourceBalance = legacyTotalBalance;
    const destinationBalance = newWalletsTotal;

    const countMatch = sourceTransactionCount === destinationTransactionCount;
    const incomeMatch = Math.abs(sourceIncome - destinationIncome) < 0.001;
    const expenseMatch = Math.abs(sourceExpense - destinationExpense) < 0.001;
    const balanceMatch = Math.abs(sourceBalance - destinationBalance) < 0.001;

    // Sai bất kỳ giá trị nào: FAIL -> STOP -> DO NOT DELETE SOURCE (Criteria 1)
    if (!countMatch || !incomeMatch || !expenseMatch || !balanceMatch) {
      const errMsgs = [];
      if (!countMatch) errMsgs.push(`Số lượng giao dịch không khớp (Cũ: ${sourceTransactionCount}, Mới: ${destinationTransactionCount})`);
      if (!incomeMatch) errMsgs.push(`Thu nhập không khớp (Cũ: ${sourceIncome}, Mới: ${destinationIncome})`);
      if (!expenseMatch) errMsgs.push(`Chi tiêu không khớp (Cũ: ${sourceExpense}, Mới: ${destinationExpense})`);
      if (!balanceMatch) errMsgs.push(`Số dư không khớp (Cũ: ${sourceBalance}, Mới: ${destinationBalance})`);
      const errorMsg = `CRITICAL INTEGRITY FAILURE: ${errMsgs.join('; ')}`;

      return {
        success: false,
        error: errorMsg,
        migrationStatus: 'FAIL',
        decision: 'STOP',
        deleteSourceAllowed: false,
        errorReport: errorMsg,
        sourceTransactionCount,
        destinationTransactionCount,
        sourceIncome,
        destinationIncome,
        sourceExpense,
        destinationExpense,
        sourceBalance,
        destinationBalance,
        idMappings
      };
    }

    // 8. Đánh dấu Migration hoàn tất - BẢO LƯU SOURCE DOCUMENT (Criteria 11)
    return {
      success: true,
      migrationStatus: 'PASS',
      decision: 'PROCEED',
      deleteSourceAllowed: false, // BẮT BUỘC: Không xóa fintrack_user_data cho tới khi mọi gate pass
      errorReport: null,
      sourceTransactionCount,
      destinationTransactionCount,
      sourceIncome,
      destinationIncome,
      sourceExpense,
      destinationExpense,
      sourceBalance,
      destinationBalance,
      idMappings,
      migratedCounts: {
        transactions: destinationTransactionCount,
        wallets: newCollections.wallets.length,
        budgets: newCollections.budgets.length,
        goals: newCollections.goals.length
      },
      verifiedBalances: {
        legacyTotalBalance,
        newWalletsTotal,
        match: true
      },
      payload: newCollections,
      completedAt: new Date().toISOString()
    };
  }
}

// Chạy test độc lập nếu được gọi trực tiếp từ console
if (require.main === module) {
  console.log('====================================================');
  console.log('🚀 CHẠY KIỂM ĐỊNH DATA MIGRATION ENGINE');
  console.log('====================================================');

  const sampleLegacyData = {
    user: { name: "Từ Nhân Đức", email: "nhantuduc@gmail.com", uid: "test_uid_123" },
    overview: { currentBalance: 17500000 },
    wallets: {
      accounts: [
        { id: "acc-bank", name: "Ngân hàng", balance: 15000000 },
        { id: "acc-cash", name: "Tiền mặt", balance: 2500000 }
      ]
    },
    transactions: [
      { id: "tx-1", title: "Thu nhập Grab", type: "income", amount: 20000000, account: "Ngân hàng" },
      { id: "tx-2", title: "Đổ xăng", type: "expense", amount: 100000, account: "Tiền mặt" },
      { id: "tx-3", title: "Ăn trưa", type: "expense", amount: 50000, account: "Tiền mặt" }
    ],
    budgets: [{ id: "bg-1", title: "Xăng xe", target: 2000000 }],
    goals: [{ id: "goal-1", title: "Điện thoại", target: 30000000 }]
  };

  const migrator = new LegacyDataMigrator();
  const res = migrator.migrate("test_uid_123", sampleLegacyData);

  assert.strictEqual(res.success, true, 'Migration phải thành công');
  assert.strictEqual(res.migratedCounts.transactions, 3, 'Phải chuyển đúng 3 transactions');
  assert.strictEqual(res.verifiedBalances.match, true, 'Số dư phải khớp hoàn toàn');

  console.log('✅ Migration Test PASS!');
  console.log(`- Số lượng Transactions: ${res.migratedCounts.transactions}/${sampleLegacyData.transactions.length}`);
  console.log(`- Số dư đối soát: ${res.verifiedBalances.newWalletsTotal.toLocaleString()}đ (Khớp 100%)`);
  console.log('====================================================\n');
}

module.exports = LegacyDataMigrator;
