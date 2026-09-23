/**
 * FINTRACK PRO — DEFAULT FINANCIAL DATA CONSTANTS
 * Dữ liệu tài chính sạch chuẩn (Clean State): 0đ, 0 giao dịch.
 */

export const DEFAULT_FINANCE_DATA = {
  user: {
    name: "Từ Nhân Đức",
    nickname: "Từ Nhân Đức 👋",
    username: "@tunhanduc",
    greeting: "Chúc bạn một ngày tốt lành!",
    avatar: "",
    hideNameInRanking: false,
    hideIncome: false,
    hideRankingPos: false,
    allowGroupStats: true,
    hideAccountBalances: false,
    twoFactorAuth: false,
    darkMode: false,
    language: "Tiếng Việt"
  },
  
  overview: {
    currentBalance: 0,
    balanceGrowthRate: 0,
    monthlyIncome: 0,
    incomeGrowthRate: 0,
    monthlyExpense: 0,
    expenseGrowthRate: 0,
    monthlySavings: 0,
    savingsGrowthRate: 0
  },

  calendar: {
    selectedMonth: 9,
    selectedYear: 2026,
    selectedDate: "2026-09-23",
    days: {}
  },

  transactions: [],
  todayExpenses: [],

  ranking: {
    metric: "total_income",
    period: "this_week",
    needAmountToNext: 0,
    nextRank: 1,
    currentUserRank: 1,
    hidePersonal: false,
    leaderboard: []
  },

  groups: {
    featured: {
      id: "grp-my",
      name: "Gia đình",
      memberCount: 1,
      totalIncome: 0,
      totalExpense: 0,
      savings: 0,
      avatarBg: "#10B981",
      members: []
    },
    list: [],
    detail: {
      id: "grp-my",
      name: "Gia đình",
      memberCount: 1,
      period: "month",
      totalIncome: 0,
      totalExpense: 0,
      savings: 0,
      membersContribution: [
        {
          name: "Bạn",
          avatar: "",
          percent: 100,
          amount: 0
        }
      ]
    }
  },

  budgets: [],

  goals: [],

  incomeSources: {
    totalMonth: 0,
    growthRate: 0,
    sources: [
      { id: "src-1", title: "Lương / Thưởng", amount: 0, percent: 0, icon: "briefcase", color: "#14B8A6", bg: "#CCFBF1" },
      { id: "src-2", title: "Kinh doanh", amount: 0, percent: 0, icon: "shopping-cart", color: "#F97316", bg: "#FFEDD5" },
      { id: "src-3", title: "Khác", amount: 0, percent: 0, icon: "more-horizontal", color: "#94A3B8", bg: "#F1F5F9" }
    ]
  },

  wallets: {
    totalBalance: 0,
    accounts: [
      { id: "acc-1", name: "Tiền mặt", icon: "banknote", balance: 0, color: "#06B6D4", bg: "#CFFAFE" },
      { id: "acc-2", name: "Tài khoản ngân hàng", icon: "landmark", balance: 0, color: "#10B981", bg: "#D1FAE5" }
    ],
    recentTransactions: []
  },

  notifications: [],

  friends: {
    tag: "@user",
    activeTab: "list",
    list: [],
    requests: []
  }
};

export const STORAGE_FINANCE_KEY = "finance_app_clean_user_v2";
