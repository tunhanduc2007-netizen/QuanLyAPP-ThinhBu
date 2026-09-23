import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { DEFAULT_FINANCE_DATA, STORAGE_FINANCE_KEY } from '@/constants/defaultData';
import {
  formatVND,
  parseVND,
  calculateNetCashFlow,
  calculateSavingsRate,
  calculateOverview,
  calculateCategoryBreakdown,
  calculateBudgetUsage,
  generateAppUUID
} from '@/domain/finance';
import { reconcileBalancesFromLedger } from '@/domain/reconciliation';
import { firebaseService } from '@/services/firebaseService';

const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid || 'guest';

  // 1. Core State loaded from LocalStorage Cache or Default Clean State
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FINANCE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Normalize accounts to strictly only 'Ngân hàng' and 'Tiền mặt'
        const rawAccounts = parsed.wallets?.accounts || [];
        let bankBal = 0;
        let cashBal = 0;
        rawAccounts.forEach(acc => {
          if (acc.name === 'Tiền mặt') {
            cashBal += (Number(acc.balance) || 0);
          } else {
            // Consolidate Vietcombank, MoMo, Thẻ tín dụng, Ngân hàng into Ngân hàng
            bankBal += (Number(acc.balance) || 0);
          }
        });

        const cleanAccounts = [
          { id: "acc-1", name: "Ngân hàng", icon: "landmark", balance: bankBal, color: "#10B981", bg: "#D1FAE5" },
          { id: "acc-2", name: "Tiền mặt", icon: "banknote", balance: cashBal, color: "#06B6D4", bg: "#CFFAFE" }
        ];

        return {
          ...DEFAULT_FINANCE_DATA,
          ...parsed,
          wallets: {
            ...parsed.wallets,
            totalBalance: bankBal + cashBal,
            accounts: cleanAccounts
          }
        };
      }
    } catch (e) {
      console.warn('Failed to load cached finance data:', e);
    }
    return DEFAULT_FINANCE_DATA;
  });

  // Navigation & Page State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [txFilter, setTxFilter] = useState('all'); // 'all' | 'income' | 'expense' | 'transfer'

  // Modals Visibility
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [addTxType, setAddTxType] = useState('expense'); // 'expense' | 'income'
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isAIProposalOpen, setIsAIProposalOpen] = useState(false);
  const [aiProposals, setAiProposals] = useState([]);
  const [isAIInsightsOpen, setIsAIInsightsOpen] = useState(false);
  const [aiInsightsData, setAiInsightsData] = useState(null);
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [isFriendQrOpen, setIsFriendQrOpen] = useState(false);

  // Privacy Mode State (Ẩn số dư)
  const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
    return localStorage.getItem('fintrack_privacy_mode') === 'true';
  });

  const togglePrivacyMode = useCallback(() => {
    setIsPrivacyMode(prev => {
      const next = !prev;
      localStorage.setItem('fintrack_privacy_mode', String(next));
      return next;
    });
  }, []);

  const formatMoney = useCallback((amt) => {
    if (isPrivacyMode) return '••••••';
    return formatVND(amt);
  }, [isPrivacyMode]);

  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  // 2. Persist state to local storage projection whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FINANCE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [data]);

  // 3. Realtime Firestore Ledger SSOT Listener
  useEffect(() => {
    if (!uid || uid === 'guest') return;

    // Subscribe to users/{uid}/transactions subcollection
    const unsubscribe = firebaseService.subscribeLedger(
      uid,
      (ledgerTxs) => {
        if (!ledgerTxs || !Array.isArray(ledgerTxs)) return;

        setData(prev => {
          // Sort newest first
          const sorted = [...ledgerTxs].sort((a, b) => {
            const dateA = a.isoDate || (a.createdAt ? a.createdAt.split('T')[0] : '');
            const dateB = b.isoDate || (b.createdAt ? b.createdAt.split('T')[0] : '');
            return dateB.localeCompare(dateA);
          });

          // Run Reconciliation Domain Engine
          const recResult = reconcileBalancesFromLedger(sorted, prev.wallets);

          // Update wallets with reconciled values
          const updatedWallets = {
            ...prev.wallets,
            totalBalance: recResult.ledgerTotal,
            accounts: [
              { id: "acc-1", name: "Ngân hàng", icon: "landmark", balance: recResult.calcBankBal, color: "#10B981", bg: "#D1FAE5" },
              { id: "acc-2", name: "Tiền mặt", icon: "banknote", balance: recResult.calcCashBal, color: "#06B6D4", bg: "#CFFAFE" }
            ],
            recentTransactions: sorted.slice(0, 10)
          };

          // Update Overview
          const newOverview = calculateOverview(
            sorted,
            recResult.initialBankBalance,
            recResult.initialCashBalance
          );

          // Update Budget Usage
          const updatedBudgets = calculateBudgetUsage(sorted, prev.budgets || []);

          return {
            ...prev,
            transactions: sorted,
            wallets: updatedWallets,
            overview: { ...prev.overview, ...newOverview },
            budgets: updatedBudgets
          };
        });
      },
      (err) => {
        console.warn('Ledger SSOT Subscription error:', err);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [uid]);

  // 4. Financial Actions

  /**
   * Thêm giao dịch mới (Income / Expense)
   */
  const addTransaction = useCallback(async (txData) => {
    const txId = txData.id || generateAppUUID('tx');
    const amt = Number(txData.amount) || 0;
    if (amt <= 0) {
      showToast('Số tiền không hợp lệ', 'error');
      return { success: false, error: 'Số tiền không hợp lệ' };
    }

    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const txTime = txData.time || currentTimeStr;
    const txDate = txData.isoDate || now.toISOString().split('T')[0];

    const newTx = {
      id: txId,
      type: txData.type || 'expense',
      amount: amt,
      category: txData.category || 'Khác',
      account: txData.account || 'Tài khoản ngân hàng',
      note: txData.note || '',
      isoDate: txDate,
      time: txTime,
      createdAt: `${txDate}T${txTime}:00.000Z`
    };

    // Optimistic UI Update & Reconciliation
    setData(prev => {
      const nextTxs = [newTx, ...prev.transactions];
      const rec = reconcileBalancesFromLedger(nextTxs, prev.wallets);
      const updatedWallets = {
        ...prev.wallets,
        totalBalance: rec.ledgerTotal,
        accounts: [
          { id: "acc-1", name: "Tiền mặt", icon: "banknote", balance: rec.calcCashBal, color: "#06B6D4", bg: "#CFFAFE" },
          { id: "acc-2", name: "Tài khoản ngân hàng", icon: "landmark", balance: rec.calcBankBal, color: "#10B981", bg: "#D1FAE5" }
        ],
        recentTransactions: nextTxs.slice(0, 10)
      };
      const updatedOverview = calculateOverview(nextTxs, rec.initialBankBalance, rec.initialCashBalance);
      const updatedBudgets = calculateBudgetUsage(nextTxs, prev.budgets);

      return {
        ...prev,
        transactions: nextTxs,
        wallets: updatedWallets,
        overview: { ...prev.overview, ...updatedOverview },
        budgets: updatedBudgets
      };
    });

    // Write to Firebase Ledger SSOT
    try {
      await firebaseService.writeTransactionDoc(newTx);
    } catch (e) {
      console.warn('writeTransactionDoc cloud error (queued if offline):', e);
    }

    showToast('Giao dịch đã được lưu thành công');
    setIsAddTxOpen(false);
    return { success: true, tx: newTx };
  }, [showToast]);

  /**
   * Chuyển tiền nguyên tử giữa 2 ví (Atomic Transfer)
   */
  const executeTransfer = useCallback(async (fromAccName, toAccName, amount) => {
    const amt = Number(amount) || 0;
    if (amt <= 0) {
      showToast('Số tiền chuyển không hợp lệ', 'error');
      return { success: false, error: 'Số tiền không hợp lệ' };
    }
    if (fromAccName === toAccName) {
      showToast('Tài khoản nguồn và đích phải khác nhau', 'error');
      return { success: false, error: 'Tài khoản trùng lặp' };
    }

    // Check balance
    const sourceAcc = data.wallets.accounts.find(a => a.name === fromAccName);
    if (!sourceAcc || sourceAcc.balance < amt) {
      showToast('Số dư tài khoản nguồn không đủ', 'error');
      return { success: false, error: 'INSUFFICIENT_FUNDS' };
    }

    const txId = generateAppUUID('tx');
    const transferTx = {
      id: txId,
      type: 'transfer',
      amount: amt,
      fromAccount: fromAccName,
      toAccount: toAccName,
      account: `${fromAccName} → ${toAccName}`,
      category: 'Chuyển tiền',
      note: `Chuyển từ ${fromAccName} sang ${toAccName}`,
      isoDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    // Optimistic Update
    setData(prev => {
      const nextTxs = [transferTx, ...prev.transactions];
      const rec = reconcileBalancesFromLedger(nextTxs, prev.wallets);
      const updatedWallets = {
        ...prev.wallets,
        totalBalance: rec.ledgerTotal,
        accounts: [
          { id: "acc-1", name: "Tiền mặt", icon: "banknote", balance: rec.calcCashBal, color: "#06B6D4", bg: "#CFFAFE" },
          { id: "acc-2", name: "Tài khoản ngân hàng", icon: "landmark", balance: rec.calcBankBal, color: "#10B981", bg: "#D1FAE5" }
        ]
      };
      return {
        ...prev,
        transactions: nextTxs,
        wallets: updatedWallets
      };
    });

    // Cloud Atomic Transfer
    try {
      await firebaseService.executeAtomicTransfer(fromAccName, toAccName, amt, transferTx);
    } catch (e) {
      console.warn('executeAtomicTransfer error:', e);
    }

    showToast(`Đã chuyển ${formatVND(amt)} thành công`);
    setIsTransferOpen(false);
    return { success: true };
  }, [data.wallets.accounts, showToast]);

  /**
   * Xóa giao dịch
   */
  const deleteTransaction = useCallback(async (txId) => {
    setData(prev => {
      const nextTxs = prev.transactions.filter(t => t.id !== txId);
      const rec = reconcileBalancesFromLedger(nextTxs, prev.wallets);
      const updatedWallets = {
        ...prev.wallets,
        totalBalance: rec.ledgerTotal,
        accounts: [
          { id: "acc-1", name: "Tiền mặt", icon: "banknote", balance: rec.calcCashBal, color: "#06B6D4", bg: "#CFFAFE" },
          { id: "acc-2", name: "Tài khoản ngân hàng", icon: "landmark", balance: rec.calcBankBal, color: "#10B981", bg: "#D1FAE5" }
        ],
        recentTransactions: nextTxs.slice(0, 10)
      };
      const updatedOverview = calculateOverview(nextTxs, rec.initialBankBalance, rec.initialCashBalance);
      const updatedBudgets = calculateBudgetUsage(nextTxs, prev.budgets);

      return {
        ...prev,
        transactions: nextTxs,
        wallets: updatedWallets,
        overview: { ...prev.overview, ...updatedOverview },
        budgets: updatedBudgets
      };
    });
    showToast('Đã xóa giao dịch');
  }, [showToast]);

  /**
   * Nạp tiền vào mục tiêu tiết kiệm
   */
  const fundGoal = useCallback(async (goalId, amount, fromAccount = 'Tài khoản ngân hàng') => {
    const amt = Number(amount) || 0;
    if (amt <= 0) return { success: false };

    const goal = data.goals.find(g => g.id === goalId);
    if (!goal) return { success: false, error: 'Mục tiêu không tồn tại' };

    const sourceAcc = data.wallets.accounts.find(a => a.name === fromAccount || (fromAccount === 'Ngân hàng' && a.name === 'Tài khoản ngân hàng'));
    if (!sourceAcc || sourceAcc.balance < amt) {
      showToast('Số dư tài khoản không đủ để nạp mục tiêu', 'error');
      return { success: false, error: 'INSUFFICIENT_FUNDS' };
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const txId = generateAppUUID('tx');
    const goalTx = {
      id: txId,
      type: 'expense',
      amount: amt,
      category: 'Tích lũy mục tiêu',
      account: sourceAcc.name,
      note: `Nạp mục tiêu: ${goal.title}`,
      isoDate: now.toISOString().split('T')[0],
      time: timeStr,
      createdAt: now.toISOString()
    };

    setData(prev => {
      const nextTxs = [goalTx, ...prev.transactions];
      const nextGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          const newCurrent = (g.currentAmount || 0) + amt;
          const pct = Math.min(100, Math.round((newCurrent / g.targetAmount) * 100));
          return { ...g, currentAmount: newCurrent, percent: pct };
        }
        return g;
      });
      const rec = reconcileBalancesFromLedger(nextTxs, prev.wallets);
      const updatedWallets = {
        ...prev.wallets,
        totalBalance: rec.ledgerTotal,
        accounts: [
          { id: "acc-1", name: "Tiền mặt", icon: "banknote", balance: rec.calcCashBal, color: "#06B6D4", bg: "#CFFAFE" },
          { id: "acc-2", name: "Tài khoản ngân hàng", icon: "landmark", balance: rec.calcBankBal, color: "#10B981", bg: "#D1FAE5" }
        ],
        recentTransactions: nextTxs.slice(0, 10)
      };
      const updatedOverview = calculateOverview(nextTxs, rec.initialBankBalance, rec.initialCashBalance);

      return {
        ...prev,
        transactions: nextTxs,
        goals: nextGoals,
        wallets: updatedWallets,
        overview: { ...prev.overview, ...updatedOverview }
      };
    });

    try {
      await firebaseService.writeTransactionDoc(goalTx);
    } catch (e) {}

    showToast(`Đã nạp ${formatVND(amt)} vào ${goal.title}`);
    return { success: true };
  }, [data.goals, data.wallets.accounts, showToast]);

  /**
   * Tạo mục tiêu mới
   */
  const createGoal = useCallback((newGoal) => {
    const curAmt = Number(newGoal.currentAmount) || 0;
    const tgtAmt = Number(newGoal.targetAmount) || 10000000;
    const pct = tgtAmt > 0 ? Math.min(100, Math.round((curAmt / tgtAmt) * 100)) : 0;

    const goalObj = {
      id: 'goal-' + Date.now(),
      title: newGoal.title || 'Mục tiêu mới',
      targetAmount: tgtAmt,
      currentAmount: curAmt,
      percent: pct,
      deadline: newGoal.deadline || '2026-12-31',
      icon: newGoal.icon || 'target',
      color: newGoal.color || '#10B981'
    };

    setData(prev => ({
      ...prev,
      goals: [...(prev.goals || []), goalObj]
    }));
    showToast('Đã thêm mục tiêu thành công');
    setIsNewGoalOpen(false);
  }, [showToast]);

  /**
   * Cập nhật mục tiêu
   */
  const updateGoal = useCallback((goalId, updatedFields) => {
    setData(prev => {
      const nextGoals = (prev.goals || []).map(g => {
        if (g.id === goalId) {
          const tgt = Number(updatedFields.targetAmount) || g.targetAmount;
          const cur = typeof updatedFields.currentAmount !== 'undefined' ? Number(updatedFields.currentAmount) : g.currentAmount;
          const pct = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0;
          return {
            ...g,
            ...updatedFields,
            targetAmount: tgt,
            currentAmount: cur,
            percent: pct
          };
        }
        return g;
      });
      return { ...prev, goals: nextGoals };
    });
    showToast('Đã cập nhật mục tiêu');
  }, [showToast]);

  /**
   * Xóa mục tiêu
   */
  const deleteGoal = useCallback((goalId) => {
    setData(prev => ({
      ...prev,
      goals: (prev.goals || []).filter(g => g.id !== goalId)
    }));
    showToast('Đã xóa mục tiêu');
  }, [showToast]);

  /**
   * Thêm ngân sách mới
   */
  const addBudget = useCallback((budgetData) => {
    setData(prev => {
      const target = Number(budgetData.target) || 2000000;
      const newBudget = {
        id: 'bg-' + Date.now(),
        title: budgetData.title || 'Danh mục khác',
        icon: budgetData.icon || 'tag',
        color: budgetData.color || '#10B981',
        bg: budgetData.bg || '#D1FAE5',
        used: 0,
        target: target,
        percent: 0,
        isWarning: false
      };
      const nextBudgets = [...(prev.budgets || []), newBudget];
      const recalculated = calculateBudgetUsage(prev.transactions, nextBudgets);
      return { ...prev, budgets: recalculated };
    });
    showToast('Đã thêm hạn mức ngân sách mới');
  }, [showToast]);

  /**
   * Cập nhật hạn mức ngân sách
   */
  const saveBudget = useCallback((budgetId, newTarget, newTitle) => {
    setData(prev => {
      const updated = (prev.budgets || []).map(b => {
        if (b.id === budgetId) {
          const tgt = Number(newTarget) || b.target;
          const title = newTitle || b.title;
          return { ...b, target: tgt, title: title };
        }
        return b;
      });
      const recalculated = calculateBudgetUsage(prev.transactions, updated);
      return { ...prev, budgets: recalculated };
    });
    showToast('Đã cập nhật ngân sách');
  }, [showToast]);

  /**
   * Xóa ngân sách
   */
  const deleteBudget = useCallback((budgetId) => {
    setData(prev => {
      const filtered = (prev.budgets || []).filter(b => b.id !== budgetId);
      return { ...prev, budgets: filtered };
    });
    showToast('Đã xóa ngân sách');
  }, [showToast]);

  /**
   * Xác nhận và ghi hàng loạt giao dịch do AI đề xuất
   */
  const confirmAITransactions = useCallback(async (proposals = []) => {
    if (!proposals.length) return;

    const newTxs = proposals.map(p => ({
      id: p.id || generateAppUUID('tx'),
      type: p.type || 'expense',
      amount: Number(p.amount) || 0,
      category: p.category || 'Khác',
      account: p.account || 'Ngân hàng',
      note: p.description || p.note || 'Giao dịch từ AI',
      isoDate: p.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    }));

    setData(prev => {
      const nextTxs = [...newTxs, ...prev.transactions];
      const rec = reconcileBalancesFromLedger(nextTxs, prev.wallets);
      const updatedWallets = {
        ...prev.wallets,
        totalBalance: rec.ledgerTotal,
        accounts: prev.wallets.accounts.map(acc => {
          if (acc.name === 'Ngân hàng') return { ...acc, balance: rec.calcBankBal };
          if (acc.name === 'Tiền mặt') return { ...acc, balance: rec.calcCashBal };
          return acc;
        })
      };
      const updatedOverview = calculateOverview(nextTxs, rec.initialBankBalance, rec.initialCashBalance);
      const updatedBudgets = calculateBudgetUsage(nextTxs, prev.budgets);

      return {
        ...prev,
        transactions: nextTxs,
        wallets: updatedWallets,
        overview: { ...prev.overview, ...updatedOverview },
        budgets: updatedBudgets
      };
    });

    for (const tx of newTxs) {
      try {
        await firebaseService.writeTransactionDoc(tx);
      } catch (e) {}
    }

    showToast(`Đã ghi nhận ${newTxs.length} giao dịch từ AI`);
    setIsAIProposalOpen(false);
    setAiProposals([]);
  }, [showToast]);

  /**
  /**
   * Xóa sạch dữ liệu (Clean State)
   */
  const resetAllDataClean = useCallback(() => {
    setData(DEFAULT_FINANCE_DATA);
    try {
      localStorage.removeItem(STORAGE_FINANCE_KEY);
    } catch (e) {}
    showToast('Đã khôi phục trạng thái dữ liệu sạch');
  }, [showToast]);

  /**
   * Khôi phục toàn bộ dữ liệu từ tệp sao lưu JSON
   */
  const restoreData = useCallback((importedData) => {
    if (!importedData) return;
    setData(importedData);
    try {
      localStorage.setItem(STORAGE_FINANCE_KEY, JSON.stringify(importedData));
    } catch (e) {}
    showToast('Khôi phục dữ liệu sao lưu thành công!');
  }, [showToast]);

  const value = useMemo(() => ({
    data,
    transactions: data.transactions,
    wallets: data.wallets,
    budgets: data.budgets,
    goals: data.goals,
    overview: data.overview,
    groups: data.groups,
    ranking: data.ranking,
    friends: data.friends,
    notifications: data.notifications,
    activeTab,
    setActiveTab,
    selectedDate,
    setSelectedDate,
    txFilter,
    setTxFilter,
    // Modals
    isAddTxOpen,
    setIsAddTxOpen,
    addTxType,
    setAddTxType,
    isTransferOpen,
    setIsTransferOpen,
    isAIAssistantOpen,
    setIsAIAssistantOpen,
    isAIProposalOpen,
    setIsAIProposalOpen,
    aiProposals,
    setAiProposals,
    isAIInsightsOpen,
    setIsAIInsightsOpen,
    aiInsightsData,
    setAiInsightsData,
    isNewGoalOpen,
    setIsNewGoalOpen,
    isFriendQrOpen,
    setIsFriendQrOpen,
    // Toast
    toast,
    showToast,
    // Actions
    addTransaction,
    executeTransfer,
    deleteTransaction,
    fundGoal,
    createGoal,
    updateGoal,
    deleteGoal,
    addBudget,
    saveBudget,
    deleteBudget,
    confirmAITransactions,
    resetAllDataClean,
    restoreData,
    isPrivacyMode,
    togglePrivacyMode,
    formatMoney
  }), [
    data,
    activeTab,
    selectedDate,
    txFilter,
    isAddTxOpen,
    addTxType,
    isTransferOpen,
    isAIAssistantOpen,
    isAIProposalOpen,
    aiProposals,
    isAIInsightsOpen,
    aiInsightsData,
    isNewGoalOpen,
    isFriendQrOpen,
    toast,
    showToast,
    addTransaction,
    executeTransfer,
    deleteTransaction,
    fundGoal,
    createGoal,
    updateGoal,
    deleteGoal,
    addBudget,
    saveBudget,
    deleteBudget,
    confirmAITransactions,
    resetAllDataClean,
    restoreData,
    isPrivacyMode,
    togglePrivacyMode,
    formatMoney
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within a FinanceProvider');
  return ctx;
}
