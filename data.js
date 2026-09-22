/**
 * DỮ LIỆU TÀI CHÍNH SẠCH (CLEAN STATE)
 * Khởi đầu mới: Chỉ có 1 người dùng (Nhân Từ Đức), số dư 0đ, 0 giao dịch.
 */

const DEFAULT_FINANCE_DATA = {
  user: {
    name: "Nhân Từ Đức",
    nickname: "Nhân Từ Đức 👋",
    username: "@nhantuduc",
    greeting: "Chúc bạn một ngày tốt lành!",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
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
    selectedDate: "2026-09-20",
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
    leaderboard: [
      {
        rank: 1,
        name: "Nhân Từ Đức",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        amount: 0,
        growth: 0,
        isCurrentUser: true
      }
    ]
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
      members: [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
      ]
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
          name: "Nhân Từ Đức",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80",
          percent: 100,
          amount: 0
        }
      ]
    }
  },

  budgets: [
    { id: "bg-1", title: "Ăn uống", icon: "utensils", color: "#EF4444", bg: "#FEE2E2", used: 0, target: 5000000, percent: 0, isWarning: false },
    { id: "bg-2", title: "Xăng xe", icon: "fuel", color: "#F97316", bg: "#FFEDD5", used: 0, target: 2000000, percent: 0, isWarning: false },
    { id: "bg-3", title: "Mua sắm", icon: "shopping-bag", color: "#EC4899", bg: "#FCE7F3", used: 0, target: 3000000, percent: 0, isWarning: false },
    { id: "bg-4", title: "Giải trí", icon: "gamepad-2", color: "#8B5CF6", bg: "#EDE9FE", used: 0, target: 1500000, percent: 0, isWarning: false },
    { id: "bg-5", title: "Nhà ở", icon: "home", color: "#10B981", bg: "#D1FAE5", used: 0, target: 5000000, percent: 0, isWarning: false }
  ],

  goals: [],

  incomeSources: {
    totalMonth: 0,
    growthRate: 0,
    sources: [
      { id: "src-1", title: "Công việc", amount: 0, percent: 0, icon: "briefcase", color: "#14B8A6", bg: "#CCFBF1" },
      { id: "src-2", title: "Grab", amount: 0, percent: 0, icon: "car", color: "#10B981", bg: "#D1FAE5" },
      { id: "src-3", title: "Kinh doanh", amount: 0, percent: 0, icon: "shopping-cart", color: "#F97316", bg: "#FFEDD5" },
      { id: "src-4", title: "Freelance", amount: 0, percent: 0, icon: "laptop", color: "#8B5CF6", bg: "#EDE9FE" },
      { id: "src-5", title: "Khác", amount: 0, percent: 0, icon: "more-horizontal", color: "#94A3B8", bg: "#F1F5F9" }
    ]
  },

  wallets: {
    totalBalance: 0,
    accounts: [
      { id: "acc-1", name: "Ngân hàng", icon: "landmark", balance: 0, color: "#10B981", bg: "#D1FAE5" },
      { id: "acc-2", name: "Tiền mặt", icon: "banknote", balance: 0, color: "#06B6D4", bg: "#CFFAFE" }
    ],
    recentTransactions: []
  },

  notifications: [
    {
      id: "notif-welcome",
      title: "Chào mừng Nhân Từ Đức! Bấm nút '+' để thêm giao dịch đầu tiên.",
      time: "Vừa xong",
      type: "general",
      icon: "sparkles",
      color: "#10B981",
      bg: "#D1FAE5"
    }
  ],

  friends: {
    tag: "@nhantuduc",
    activeTab: "list",
    list: [
      {
        id: "fr-1",
        name: "Nguyễn Văn Thịnh",
        tag: "@thinh_grab",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
        role: "Tài xế công nghệ 5⭐",
        status: "accepted",
        addedAt: "20/09/2026"
      },
      {
        id: "fr-2",
        name: "Trần Mai Anh",
        tag: "@maianh_99",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
        role: "Thành viên Quỹ Gia Đình",
        status: "accepted",
        addedAt: "21/09/2026"
      }
    ],
    requests: [
      {
        id: "req-1",
        fromName: "Lê Hoàng Nam",
        fromTag: "@nam_tech",
        avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
        role: "Bạn cùng nhóm",
        time: "10 phút trước"
      }
    ]
  }
};

// Khóa lưu trữ sạch mới
const STORAGE_FINANCE_KEY = "finance_app_clean_user_v2";

if (typeof module !== 'undefined') {
  module.exports = { DEFAULT_FINANCE_DATA, STORAGE_FINANCE_KEY };
}
