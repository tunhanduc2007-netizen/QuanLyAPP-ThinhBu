/**
 * FINANCE APP - QUẢN LÝ TÀI CHÍNH CÁ NHÂN & NHÓM
 * TRẠNG THÁI SẠCH (CLEAN STATE) — KHỞI ĐẦU CHÍNH CHỦ
 * Không dữ liệu ảo, tính toán động 100% khi người dùng thêm giao dịch.
 */

class FinanceApp {
  constructor() {
    window.app = this;
    this.storageKey = typeof STORAGE_FINANCE_KEY !== 'undefined' ? STORAGE_FINANCE_KEY : 'finance_app_clean_user_v2';
    this.isSubmittingTx = false;
    this.historyStack = [];

    // Kiểm tra trạng thái đăng nhập
    this.isLoggedIn = !!localStorage.getItem('finance_user_logged_in');
    this.currentScreen = this.isLoggedIn ? 'screen-dashboard' : 'screen-login';

    this.isBalanceHidden = false;
    this.currentAddType = 'income'; // 'income' | 'expense'
    this.selectedCategory = 'Chọn danh mục';
    this.selectedCatIcon = 'folder';
    
    // OCR Instance
    if (typeof GrabOCR !== 'undefined') {
      this.ocr = new GrabOCR();
    }

    // Load Data sạch
    this.initData();
    this.recalculateBalances();
    this.saveData();

    // Chart instances
    this.dashChart = null;
    this.analyticsBar = null;
    this.analyticsPie = null;
    this.incomePie = null;

    // Start Live Clock in iOS Status Bar
    this.initClock();

    // Render Initial UI
    this.applyTheme(this.data.user.darkMode);
    this.renderAll();

    // Thiết lập hiển thị màn hình khởi động
    document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
    const startScreenEl = document.getElementById(this.currentScreen);
    if (startScreenEl) startScreenEl.classList.add('active');

    const bottomBar = document.querySelector('.bottom-nav-bar');
    if (bottomBar) {
      bottomBar.style.display = (this.currentScreen === 'screen-login') ? 'none' : 'flex';
    }

    this.initAuthListener();
    this.setupIcons();
  }

  // Khởi tạo hoặc load từ LocalStorage theo từng User riêng biệt (Multi-User Isolation)
  initData() {
    let uid = 'guest';
    const savedProfile = localStorage.getItem('finance_user_profile');
    if (savedProfile) {
      try {
        const u = JSON.parse(savedProfile);
        if (u.uid) uid = u.uid;
      } catch (e) {}
    }

    this.storageKey = 'finance_data_' + uid;
    const saved = localStorage.getItem(this.storageKey);

    if (saved) {
      try {
        this.data = JSON.parse(saved);
      } catch (e) {
        console.error("Lỗi đọc LocalStorage, nạp DEFAULT_FINANCE_DATA", e);
        this.data = JSON.parse(JSON.stringify(DEFAULT_FINANCE_DATA));
      }
    } else {
      this.data = JSON.parse(JSON.stringify(DEFAULT_FINANCE_DATA));
      this.saveData();
    }

    // Phục hồi hồ sơ đăng nhập đã lưu
    if (savedProfile) {
      try {
        const u = JSON.parse(savedProfile);
        if (u.name) this.data.user.name = u.name;
        if (u.email) this.data.user.email = u.email;
        if (u.avatar) this.data.user.avatar = u.avatar;
        if (u.name) this.data.user.nickname = `${u.name} 👋`;
        if (u.uid) this.data.user.uid = u.uid;
      } catch (e) {}
    }
  }

  saveData() {
    if (this.storageKey) {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }
    if (window.grabSync && typeof window.grabSync.pushToCloud === 'function') {
      window.grabSync.pushToCloud(this.data);
    }
  }

  resetAllDataClean() {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu tài khoản này và bắt đầu lại từ 0đ?')) {
      if (this.storageKey) {
        localStorage.removeItem(this.storageKey);
      }
      this.data = JSON.parse(JSON.stringify(DEFAULT_FINANCE_DATA));
      this.saveData();
      this.renderAll();
      this.showToast('Đã xóa dữ liệu tài khoản này về trạng thái sạch 0đ!');
      this.navTo('screen-dashboard');
    }
  }

  setupIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  initClock() {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const clockEl = document.getElementById('statusClock');
      if (clockEl) clockEl.textContent = `${hrs}:${mins}`;
    };
    updateTime();
    setInterval(updateTime, 10000);
  }

  // Format currency: 28500000 -> 28.500.000đ
  formatVND(num) {
    if (isNaN(num)) return '0đ';
    return Number(num).toLocaleString('vi-VN') + 'đ';
  }

  parseVND(str) {
    if (!str) return 0;
    return parseInt(str.toString().replace(/[^\d]/g, ''), 10) || 0;
  }

  getDefaultAvatarUrl(name) {
    const displayName = name || this.data?.user?.name || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10B981&color=ffffff&bold=true&size=150`;
  }

  getAvatarUrl() {
    const av = this.data?.user?.avatar;
    if (!av || av.trim() === '' || av === 'undefined' || av === 'null') {
      return this.getDefaultAvatarUrl();
    }
    return av;
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

  // Bù trừ múi giờ địa phương (GMT+7) tránh lỗi lùi ngày khi dùng UTC toISOString() lúc nửa đêm
  getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // CORE FINANCIAL ENGINE: Chuẩn hóa và đồng bộ số dư toàn hệ thống
  recalculateBalances() {
    if (!this.data) return;

    // 1. Tinh gọn chỉ giữ đúng 2 nguồn tiền: "Ngân hàng" và "Tiền mặt"
    if (!this.data.wallets) {
      this.data.wallets = { totalBalance: 0, accounts: [], recentTransactions: [] };
    }

    let bankBal = 0;
    let cashBal = 0;
    (this.data.wallets.accounts || []).forEach(acc => {
      if (acc.name === 'Tiền mặt') {
        cashBal += (Number(acc.balance) || 0);
      } else {
        bankBal += (Number(acc.balance) || 0);
      }
    });

    this.data.wallets.accounts = [
      { id: "acc-bank", name: "Ngân hàng", icon: "landmark", balance: bankBal, color: "#10B981", bg: "#D1FAE5" },
      { id: "acc-cash", name: "Tiền mặt", icon: "banknote", balance: cashBal, color: "#06B6D4", bg: "#CFFAFE" }
    ];

    const totalAccountsBal = bankBal + cashBal;
    this.data.wallets.totalBalance = totalAccountsBal;

    if (!this.data.overview) {
      this.data.overview = { currentBalance: 0, monthlyIncome: 0, monthlyExpense: 0, monthlySavings: 0 };
    }
    // Số dư Dashboard và Wallets sử dụng chung 1 nguồn dữ liệu chính xác
    this.data.overview.currentBalance = totalAccountsBal;

    // 2. Tính toán thu nhập, chi tiêu, tiết kiệm từ transactions
    const txs = this.data.transactions || [];
    let calcIncome = 0;
    let calcExpense = 0;

    const incCatMap = {};
    const expCatMap = {};
    const calDays = {};

    txs.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      const isoDate = tx.isoDate || (tx.date ? tx.date.split('/').reverse().join('-') : '2026-09-20');

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
      // Lưu ý: type === 'transfer' không làm tăng giảm thu/chi tổng quan

      calDays[isoDate].transactions.push({
        id: tx.id,
        title: tx.title,
        category: tx.category,
        time: (tx.time || '12:00') + ' • ' + (tx.type === 'income' ? 'Thu nhập' : (tx.type === 'transfer' ? 'Chuyển khoản' : 'Chi tiêu')),
        amount: amt,
        type: tx.type,
        icon: tx.icon || 'credit-card',
        color: tx.type === 'income' ? '#10B981' : (tx.type === 'transfer' ? '#3B82F6' : '#EF4444')
      });
    });

    this.data.overview.monthlyIncome = calcIncome;
    this.data.overview.monthlyExpense = calcExpense;
    this.data.overview.monthlySavings = calcIncome - calcExpense;

    if (!this.data.calendar) {
      this.data.calendar = { selectedMonth: 9, selectedYear: 2026, selectedDate: "2026-09-20", days: {} };
    }
    this.data.calendar.days = calDays;

    // 3. Cập nhật tiến độ ngân sách (Budgets)
    if (this.data.budgets && Array.isArray(this.data.budgets)) {
      this.data.budgets.forEach(b => {
        const used = expCatMap[b.title] || 0;
        b.used = used;
        b.percent = b.target > 0 ? Math.round((used / b.target) * 100) : 0;
        b.isWarning = b.percent >= 90;
      });
    }

    // 4. Cập nhật tỷ lệ nguồn thu nhập (Income Sources)
    if (this.data.incomeSources && this.data.incomeSources.sources) {
      this.data.incomeSources.totalMonth = calcIncome;
      this.data.incomeSources.sources.forEach(s => {
        const amt = incCatMap[s.title] || 0;
        s.amount = amt;
        s.percent = calcIncome > 0 ? Math.round((amt / calcIncome) * 100) : 0;
      });
    }

    // 5. Cập nhật Leaderboard Ranking theo metric đã chọn
    if (this.data.ranking) {
      const metric = this.data.ranking.metric || 'total_income';
      const rankAmount = (metric === 'net_income') ? this.data.overview.monthlySavings : this.data.overview.monthlyIncome;
      if (this.data.ranking.leaderboard && this.data.ranking.leaderboard[0]) {
        this.data.ranking.leaderboard[0].amount = Math.max(0, rankAmount);
      }
    }

    // 6. Cập nhật Group featured & detail
    if (this.data.groups) {
      if (this.data.groups.featured) {
        this.data.groups.featured.totalIncome = calcIncome;
        this.data.groups.featured.totalExpense = calcExpense;
        this.data.groups.featured.savings = calcIncome - calcExpense;
      }
      if (this.data.groups.detail) {
        this.data.groups.detail.totalIncome = calcIncome;
        this.data.groups.detail.totalExpense = calcExpense;
        this.data.groups.detail.savings = calcIncome - calcExpense;
        if (this.data.groups.detail.membersContribution && this.data.groups.detail.membersContribution[0]) {
          this.data.groups.detail.membersContribution[0].amount = calcIncome;
        }
      }
    }
  }

  showToast(message) {
    const toast = document.getElementById('toastMsg');
    const toastText = document.getElementById('toastText');
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // ===================================================
  // NAVIGATION & ROUTING
  // ===================================================
  navTo(screenId, saveHistory = true) {
    if (this.currentScreen === screenId) return;

    if (saveHistory && this.currentScreen) {
      this.historyStack.push(this.currentScreen);
    }

    const prevEl = document.getElementById(this.currentScreen);
    if (prevEl) prevEl.classList.remove('active');

    const nextEl = document.getElementById(screenId);
    if (nextEl) {
      nextEl.classList.add('active');
      this.currentScreen = screenId;
    }

    // Ẩn thanh Bottom Nav khi đang ở màn hình Đăng nhập
    const bottomBar = document.querySelector('.bottom-nav-bar');
    if (bottomBar) {
      bottomBar.style.display = (screenId === 'screen-login') ? 'none' : 'flex';
    }

    // Cập nhật trạng thái Bottom Nav
    this.updateBottomNavState(screenId);

    // Re-render chart nếu màn hình có canvas
    if (screenId === 'screen-dashboard') {
      setTimeout(() => this.renderDashboardChart(), 80);
    } else if (screenId === 'screen-analytics') {
      setTimeout(() => this.renderAnalyticsCharts(), 80);
    } else if (screenId === 'screen-income-sources') {
      setTimeout(() => this.renderIncomeSourcesPie(), 80);
    }

    this.setupIcons();
  }

  goBack() {
    if (this.currentScreen === 'screen-login') return;
    if (this.historyStack.length > 0) {
      const prev = this.historyStack.pop();
      if (prev === 'screen-login' && this.isLoggedIn) {
        this.navTo('screen-dashboard', false);
      } else {
        this.navTo(prev, false);
      }
    } else {
      this.navTo(this.isLoggedIn ? 'screen-dashboard' : 'screen-login', false);
    }
  }

  updateBottomNavState(screenId) {
    const navMap = {
      'screen-dashboard': 'navDash',
      'screen-calendar': 'navCal',
      'screen-ranking': 'navRank',
      'screen-profile': 'navProfile'
    };

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const targetNavId = navMap[screenId];
    if (targetNavId) {
      const targetNavEl = document.getElementById(targetNavId);
      if (targetNavEl) targetNavEl.classList.add('active');
    }
  }

  // Quick Action Sheet
  openQuickActionSheet() {
    const sheet = document.getElementById('quickActionSheet');
    if (sheet) sheet.classList.add('show');
  }

  closeQuickActionSheet() {
    const sheet = document.getElementById('quickActionSheet');
    if (sheet) sheet.classList.remove('show');
  }

  // ===================================================
  // 1. DASHBOARD
  // ===================================================
  toggleBalanceVisibility() {
    this.isBalanceHidden = !this.isBalanceHidden;
    const balanceEl = document.getElementById('dashMainBalance');
    const eyeIcon = document.getElementById('eyeBalanceIcon');
    if (balanceEl) {
      balanceEl.textContent = this.isBalanceHidden ? '••••••••' : this.formatVND(this.data.overview.currentBalance);
    }
    if (eyeIcon) {
      eyeIcon.setAttribute('data-lucide', this.isBalanceHidden ? 'eye-off' : 'eye');
      this.setupIcons();
    }
  }

  renderDashboard() {
    const ov = this.data.overview;
    const dashBal = document.getElementById('dashMainBalance');
    if (dashBal && !this.isBalanceHidden) dashBal.textContent = this.formatVND(ov.currentBalance);

    // Cập nhật lời chào và Avatar người dùng trên Dashboard
    const avEl = document.getElementById('dashUserAvatar');
    if (avEl) {
      avEl.referrerPolicy = "no-referrer";
      avEl.src = this.getAvatarUrl();
      avEl.onerror = () => {
        avEl.onerror = null;
        avEl.src = this.getDefaultAvatarUrl();
      };
    }
    const nameEl = document.getElementById('dashUserName');
    if (nameEl) nameEl.textContent = this.data.user.nickname || `${this.data.user.name} 👋`;

    const inc = document.getElementById('dashMonthlyIncome');
    if (inc) inc.textContent = this.formatVND(ov.monthlyIncome);

    const exp = document.getElementById('dashMonthlyExpense');
    if (exp) exp.textContent = this.formatVND(ov.monthlyExpense);

    const sav = document.getElementById('dashMonthlySavings');
    if (sav) sav.textContent = this.formatVND(ov.monthlySavings);

    // Chi tiêu hôm nay
    const listEl = document.getElementById('dashTodayExpensesList');
    if (listEl) {
      if (!this.data.todayExpenses || this.data.todayExpenses.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 22px 10px; color: var(--text-muted); font-size: 13px;">
            <i data-lucide="inbox" style="width: 24px; height: 24px; margin: 0 auto 6px auto; display: block; opacity: 0.4;"></i>
            Hôm nay bạn chưa có chi tiêu nào ✨
          </div>
        `;
      } else {
        listEl.innerHTML = this.data.todayExpenses.map(item => `
          <div class="expense-item-row">
            <div class="expense-item-left">
              <div class="category-icon-circle" style="background: ${item.bg}; color: ${item.color};">
                <i data-lucide="${item.icon}" style="width: 18px; height: 18px;"></i>
              </div>
              <div>
                <div class="expense-item-name">${item.title}</div>
                <div class="expense-item-sub">Hôm nay</div>
              </div>
            </div>
            <div class="expense-item-amount">${this.formatVND(item.amount)}</div>
          </div>
        `).join('');
      }
    }

    this.renderDashboardChart();
  }

  renderDashboardChart() {
    const canvas = document.getElementById('dashLineChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (this.dashChart) this.dashChart.destroy();

    const labels = ['21/08', '28/08', '04/09', '11/09', '18/09'];
    const hasData = this.data.transactions && this.data.transactions.length > 0;
    const incomeData = hasData ? [0, 0, 0, 0, this.data.overview.monthlyIncome] : [0, 0, 0, 0, 0];
    const expenseData = hasData ? [0, 0, 0, 0, this.data.overview.monthlyExpense] : [0, 0, 0, 0, 0];

    this.dashChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Thu nhập',
            data: incomeData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            borderWidth: 2.5,
            tension: 0.35,
            pointRadius: 3,
            fill: true
          },
          {
            label: 'Chi tiêu',
            data: expenseData,
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.04)',
            borderWidth: 2.5,
            tension: 0.35,
            pointRadius: 3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { boxWidth: 8, font: { size: 11, family: 'Plus Jakarta Sans' } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString('vi-VN')}đ`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            display: false,
            suggestedMin: 0
          }
        }
      }
    });
  }

  updateDashboardChart(period) {
    this.showToast(`Đã lọc theo ${period}`);
    this.renderDashboardChart();
  }

  // ===================================================
  // 2. LỊCH THU CHI (CALENDAR)
  // ===================================================
  renderCalendar() {
    const gridEl = document.getElementById('calDaysGrid');
    if (!gridEl) return;

    if (!this.data.calendar) {
      this.data.calendar = { selectedMonth: 9, selectedYear: 2026, selectedDate: "2026-09-20", days: {} };
    }

    const month = this.data.calendar.selectedMonth || 9;
    const year = this.data.calendar.selectedYear || 2026;
    const selectedDate = this.data.calendar.selectedDate;

    // Cập nhật tiêu đề hiển thị tháng/năm
    const monthTitle = document.getElementById('calMonthYearTitle');
    if (monthTitle) monthTitle.textContent = `Tháng ${month}/${year}`;

    // Tính toán số ngày và offset bắt đầu từ Thứ 2 (T2)
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0: CN, 1: T2, ...
    const startDayOffset = (firstDayOfWeek + 6) % 7;
    const prevMonthDays = new Date(year, month - 1, 0).getDate();

    let html = '';
    // Ô ngày tháng trước
    for (let i = 0; i < startDayOffset; i++) {
      html += `<div class="calendar-day-cell other-month">${prevMonthDays - startDayOffset + 1 + i}</div>`;
    }

    const monthStr = String(month).padStart(2, '0');
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const isoDate = `${year}-${monthStr}-${dayStr}`;
      const isSelected = (isoDate === selectedDate);
      
      const dayRecord = this.data.calendar.days && this.data.calendar.days[isoDate];
      const hasIncome = dayRecord && dayRecord.income > 0;
      const hasExpense = dayRecord && dayRecord.expense > 0;

      html += `
        <div class="calendar-day-cell ${isSelected ? 'selected' : ''}" onclick="app.selectCalendarDate('${isoDate}', ${day})">
          <span>${day}</span>
          <div class="cal-dots-row">
            ${hasIncome ? '<span class="cal-dot income"></span>' : ''}
            ${hasExpense ? '<span class="cal-dot expense"></span>' : ''}
          </div>
        </div>
      `;
    }

    gridEl.innerHTML = html;
    this.renderCalendarDayDetail();
  }

  selectCalendarDate(isoDate, day) {
    this.data.calendar.selectedDate = isoDate;
    this.renderCalendar();
  }

  changeMonth(delta) {
    if (!this.data.calendar) {
      this.data.calendar = { selectedMonth: 9, selectedYear: 2026, selectedDate: "2026-09-20", days: {} };
    }
    let m = (this.data.calendar.selectedMonth || 9) + delta;
    let y = this.data.calendar.selectedYear || 2026;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    this.data.calendar.selectedMonth = m;
    this.data.calendar.selectedYear = y;
    this.data.calendar.selectedDate = `${y}-${String(m).padStart(2, '0')}-01`;
    this.saveData();
    this.renderCalendar();
    this.showToast(`Đã chuyển sang Tháng ${m}/${y}`);
  }

  setCalendarView(view, tabEl) {
    const tabs = tabEl.parentElement.querySelectorAll('.segmented-tab');
    tabs.forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
    this.showToast(`Xem theo ${view}`);
  }

  renderCalendarDayDetail() {
    const dateStr = this.data.calendar.selectedDate || '2026-09-20';
    const parts = dateStr.split('-');
    const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;

    const titleEl = document.getElementById('calSelectedDateTitle');
    if (titleEl) titleEl.textContent = formatted;

    const dayData = (this.data.calendar.days && this.data.calendar.days[dateStr]) || {
      income: 0,
      expense: 0,
      net: 0,
      transactions: []
    };

    const incEl = document.getElementById('calDayIncome');
    if (incEl) incEl.textContent = '+' + this.formatVND(dayData.income);

    const expEl = document.getElementById('calDayExpense');
    if (expEl) expEl.textContent = '-' + this.formatVND(dayData.expense);

    const netEl = document.getElementById('calDayNet');
    if (netEl) netEl.textContent = (dayData.net >= 0 ? '+' : '-') + this.formatVND(Math.abs(dayData.net));

    const listEl = document.getElementById('calDayTxList');
    if (listEl) {
      if (!dayData.transactions || dayData.transactions.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 20px 8px; color: var(--text-muted); font-size: 13px;">
            <i data-lucide="calendar" style="width: 24px; height: 24px; margin: 0 auto 6px auto; display: block; opacity: 0.4;"></i>
            Chưa có giao dịch trong ngày này
          </div>
        `;
      } else {
        listEl.innerHTML = dayData.transactions.map(tx => `
          <div class="expense-item-row">
            <div class="expense-item-left">
              <div class="category-icon-circle" style="background: ${tx.type === 'income' ? '#D1FAE5' : '#FEE2E2'}; color: ${tx.type === 'income' ? '#10B981' : '#EF4444'};">
                <i data-lucide="${tx.icon || 'circle'}" style="width: 18px; height: 18px;"></i>
              </div>
              <div>
                <div class="expense-item-name">${tx.title}</div>
                <div class="expense-item-sub">${tx.time || tx.category}</div>
              </div>
            </div>
            <div class="${tx.type === 'income' ? 'tx-amount-green' : 'tx-amount-red'}">
              ${tx.type === 'income' ? '+' : '-'}${this.formatVND(tx.amount)}
            </div>
          </div>
        `).join('');
      }
    }

    this.setupIcons();
  }

  // ===================================================
  // 3. DANH SÁCH GIAO DỊCH
  // ===================================================
  renderTransactionsList(filterType = 'all', searchQuery = '') {
    const listEl = document.getElementById('allTransactionsList');
    if (!listEl) return;

    let items = this.data.transactions || [];
    if (filterType !== 'all') {
      items = items.filter(tx => tx.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(tx => tx.title.toLowerCase().includes(q) || tx.category.toLowerCase().includes(q));
    }

    if (items.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: var(--text-muted); font-size: 13px;">
          <i data-lucide="receipt" style="width: 32px; height: 32px; margin: 0 auto 8px auto; display: block; opacity: 0.4;"></i>
          Chưa có giao dịch nào.<br>Bấm nút <b>+ Thêm giao dịch</b> để bắt đầu ghi chép!
        </div>
      `;
      this.setupIcons();
      return;
    }

    listEl.innerHTML = items.map(tx => {
      const isIncome = tx.type === 'income';
      const isTransfer = tx.type === 'transfer';
      const color = isIncome ? '#10B981' : (isTransfer ? '#3B82F6' : '#EF4444');
      const bg = isIncome ? '#D1FAE5' : (isTransfer ? '#DBEAFE' : '#FEE2E2');

      const safeTitle = this.escapeHtml(tx.title);
      const safeCat = this.escapeHtml(tx.category);
      const safeDate = this.escapeHtml(tx.date);
      const safeTime = this.escapeHtml(tx.time);

      return `
        <div class="expense-item-row" onclick="app.showToast('Giao dịch: ' + '${this.formatVND(tx.amount)}')">
          <div class="expense-item-left">
            <div class="category-icon-circle" style="background: ${bg}; color: ${color};">
              <i data-lucide="${this.escapeHtml(tx.icon || 'credit-card')}" style="width: 18px; height: 18px;"></i>
            </div>
            <div>
              <div class="expense-item-name">${safeTitle}</div>
              <div class="expense-item-sub">${safeCat} • ${safeDate} ${safeTime}</div>
            </div>
          </div>
          <div class="${isIncome ? 'tx-amount-green' : (isTransfer ? '' : 'tx-amount-red')}" style="${isTransfer ? 'color: #3B82F6;' : ''}">
            ${isIncome ? '+' : (isTransfer ? '' : '-')}${this.formatVND(tx.amount)}
          </div>
        </div>
      `;
    }).join('');

    this.setupIcons();
  }

  filterTxTab(type, tabEl) {
    const tabs = tabEl.parentElement.querySelectorAll('.segmented-tab');
    tabs.forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
    this.renderTransactionsList(type);
  }

  searchTransactions(query) {
    this.renderTransactionsList('all', query);
  }

  // ===================================================
  // 4. THÊM GIAO DỊCH
  // ===================================================
  openAddTx(type = 'income') {
    this.setAddType(type);
    this.navTo('screen-add-transaction');
  }

  setAddType(type) {
    this.currentAddType = type;
    const tabInc = document.getElementById('tabAddIncome');
    const tabExp = document.getElementById('tabAddExpense');
    if (type === 'income') {
      if (tabInc) tabInc.classList.add('active');
      if (tabExp) tabExp.classList.remove('active');
    } else {
      if (tabExp) tabExp.classList.add('active');
      if (tabInc) tabInc.classList.remove('active');
    }
  }

  formatAddAmount(input) {
    const num = this.parseVND(input.value);
    input.value = num > 0 ? num.toLocaleString('vi-VN') + ' đ' : '';
  }

  quickFill(desc, amount, category, type) {
    this.setAddType(type);
    const amtInput = document.getElementById('addAmountInput');
    if (amtInput) amtInput.value = amount.toLocaleString('vi-VN') + ' đ';

    const noteInput = document.getElementById('addNoteInput');
    if (noteInput) noteInput.value = desc;

    this.selectedCategory = category;
    const catLabel = document.getElementById('addCatLabel');
    if (catLabel) catLabel.textContent = category;

    this.showToast(`Đã điền nhanh: ${category}`);
  }

  openCategorySheet() {
    const categories = [
      { name: "Công việc", icon: "briefcase" },
      { name: "Grab", icon: "car" },
      { name: "Lương", icon: "dollar-sign" },
      { name: "Ăn uống", icon: "utensils" },
      { name: "Xăng xe", icon: "fuel" },
      { name: "Mua sắm", icon: "shopping-bag" },
      { name: "Giải trí", icon: "coffee" },
      { name: "Nhà ở", icon: "home" },
      { name: "Khác", icon: "more-horizontal" }
    ];

    const container = document.getElementById('categoryListContainer');
    if (container) {
      container.innerHTML = categories.map(c => `
        <div class="menu-list-item" onclick="app.chooseCategory('${c.name}', '${c.icon}')">
          <div class="menu-item-left">
            <i data-lucide="${c.icon}" style="width: 18px; height: 18px; color: var(--primary-green);"></i>
            <span>${c.name}</span>
          </div>
          <i data-lucide="check" style="width: 16px; height: 16px; opacity: ${this.selectedCategory === c.name ? 1 : 0}; color: var(--primary-green);"></i>
        </div>
      `).join('');
    }

    const sheet = document.getElementById('catSelectSheet');
    if (sheet) sheet.classList.add('show');
    this.setupIcons();
  }

  chooseCategory(name, icon) {
    this.selectedCategory = name;
    this.selectedCatIcon = icon;
    const label = document.getElementById('addCatLabel');
    if (label) label.textContent = name;
    const iconEl = document.getElementById('addCatIcon');
    if (iconEl) iconEl.setAttribute('data-lucide', icon);
    this.closeCategorySheet();
    this.setupIcons();
  }

  closeCategorySheet() {
    const sheet = document.getElementById('catSelectSheet');
    if (sheet) sheet.classList.remove('show');
  }

  selectAccount(accName) {
    this.selectedAccount = (accName === 'Tiền mặt') ? 'Tiền mặt' : 'Ngân hàng';
    
    // Cập nhật giao diện Segmented Control nếu có
    const tabBank = document.getElementById('tabAccBank');
    const tabCash = document.getElementById('tabAccCash');
    if (tabBank && tabCash) {
      if (this.selectedAccount === 'Tiền mặt') {
        tabCash.classList.add('active');
        tabBank.classList.remove('active');
      } else {
        tabBank.classList.add('active');
        tabCash.classList.remove('active');
      }
    }

    // Cập nhật label/icon cũ nếu có
    const lbl = document.getElementById('addAccountLabel');
    if (lbl) lbl.textContent = this.selectedAccount;
    const icon = document.getElementById('addAccountIcon');
    if (icon) icon.setAttribute('data-lucide', this.selectedAccount === 'Ngân hàng' ? 'landmark' : 'banknote');

    this.showToast(`Đã chọn: ${this.selectedAccount}`);
    this.setupIcons();
  }

  openAccountSheet() {
    this.selectAccount(this.selectedAccount === 'Tiền mặt' ? 'Ngân hàng' : 'Tiền mặt');
  }

  // Quét OCR hóa đơn
  async handleReceiptScan(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const notice = document.getElementById('ocrStatusNotice');
    if (notice) {
      notice.style.display = 'block';
      notice.textContent = '⏳ Đang quét hóa đơn qua OCR AI...';
    }

    try {
      if (this.ocr) {
        const res = await this.ocr.scanImage(file, (pct) => {
          if (notice) notice.textContent = `⏳ Đang quét hóa đơn... ${pct}%`;
        });

        if (res.amount && res.amount > 0) {
          const amtInput = document.getElementById('addAmountInput');
          if (amtInput) amtInput.value = res.amount.toLocaleString('vi-VN') + ' đ';
        }

        if (res.note) {
          const noteInput = document.getElementById('addNoteInput');
          if (noteInput) noteInput.value = res.note;
        }

        if (notice) notice.textContent = `✅ Đã quét thành công! Số tiền: ${this.formatVND(res.amount || 0)}`;
        this.showToast(`Quét hóa đơn thành công!`);
      }
    } catch (e) {
      console.error(e);
      if (notice) notice.textContent = '⚠️ Không đọc được text, hãy nhập tay.';
    }
  }

  handleReceiptImage(event) {
    const file = event.target.files && event.target.files[0];
    if (file) {
      this.showToast('Đã đính kèm ảnh hóa đơn 🖼');
    }
  }

  submitNewTransaction() {
    if (this.isSubmittingTx) return;
    this.isSubmittingTx = true;

    try {
      const amtInput = document.getElementById('addAmountInput');
      const amount = this.parseVND(amtInput ? amtInput.value : 0);

      if (amount <= 0 || !Number.isFinite(amount) || amount > 1e15) {
        this.showToast('Vui lòng nhập số tiền hợp lệ (> 0đ)!');
        return;
      }

      const noteRaw = document.getElementById('addNoteInput')?.value?.trim();
      const note = noteRaw ? this.escapeHtml(noteRaw) : this.selectedCategory;
      const dateVal = document.getElementById('addDateInput')?.value || this.getLocalDateString();
      const timeVal = document.getElementById('addTimeInput')?.value || '12:00';

      const parts = dateVal.split('-');
      const dateDisplay = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateVal;

      // Chọn tài khoản ví để áp dụng biến động
      if (!this.data.wallets || !this.data.wallets.accounts || this.data.wallets.accounts.length === 0) {
        this.recalculateBalances();
      }
      // Chọn tài khoản: Ngân hàng hoặc Tiền mặt
      const targetName = this.selectedAccount || "Ngân hàng";
      const targetAcc = this.data.wallets.accounts.find(a => a.name === targetName) || this.data.wallets.accounts[0];

      const newTx = {
        id: 'tx-' + Date.now(),
        title: note,
        category: this.selectedCategory,
        date: dateDisplay,
        time: timeVal,
        isoDate: dateVal,
        type: this.currentAddType,
        amount: amount,
        account: targetAcc ? targetAcc.name : "Ngân hàng",
        user: this.data.user.name || "Người dùng",
        icon: this.selectedCatIcon || (this.currentAddType === 'income' ? 'arrow-down-left' : 'utensils')
      };

      // Thêm vào danh sách giao dịch
      if (!this.data.transactions) this.data.transactions = [];
      this.data.transactions.unshift(newTx);

      // Cập nhật số dư ví cụ thể
      if (targetAcc) {
        if (this.currentAddType === 'income') {
          targetAcc.balance += amount;
        } else {
          targetAcc.balance -= amount;
        }
      }

      // Thêm vào todayExpenses nếu là chi tiêu hôm nay
      const todayIso = this.getLocalDateString();
      if (this.currentAddType === 'expense' && (dateVal === todayIso || dateVal === '2026-09-20')) {
        if (!this.data.todayExpenses) this.data.todayExpenses = [];
        this.data.todayExpenses.unshift({
          id: 'te-' + Date.now(),
          title: note,
          amount: amount,
          icon: this.selectedCatIcon || 'shopping-bag',
          color: '#EF4444',
          bg: '#FEE2E2'
        });
      }

      // Tính toán lại toàn bộ số dư và chỉ số đồng bộ (Single Source of Truth)
      this.recalculateBalances();

      this.saveData();

      // Đồng bộ độc lập từng Document lên Firestore Subcollection & Leaderboard
      if (window.grabSync) {
        if (typeof window.grabSync.writeTransactionDoc === 'function') {
          window.grabSync.writeTransactionDoc(newTx);
        }
        if (this.currentAddType === 'income' && typeof window.grabSync.syncLeaderboardEntry === 'function') {
          window.grabSync.syncLeaderboardEntry('total_income', this.data.overview.monthlyIncome, this.data.ranking?.hidePersonal, this.data.user?.name);
        }
      }

      this.renderAll();
      this.showToast(`Đã thêm giao dịch ${this.formatVND(amount)}!`);

      // Reset input
      if (amtInput) amtInput.value = '';
      this.goBack();
    } finally {
      this.isSubmittingTx = false;
    }
  }

  // ===================================================
  // 5. RANKING
  // ===================================================
  renderRanking() {
    const container = document.getElementById('rankingListContainer');
    if (!container) return;

    // Cập nhật số tiền ranking người dùng theo đúng metric đã chọn (total_income hoặc net_income)
    if (this.data.ranking && this.data.ranking.leaderboard && this.data.ranking.leaderboard[0]) {
      const metric = this.data.ranking.metric || 'total_income';
      const rankVal = (metric === 'net_income') ? this.data.overview.monthlySavings : this.data.overview.monthlyIncome;
      this.data.ranking.leaderboard[0].amount = Math.max(0, rankVal || 0);
    }

    const list = this.data.ranking.leaderboard || [];

    container.innerHTML = list.map((item, idx) => {
      const isTop1 = item.rank === 1;
      const isTop2 = item.rank === 2;
      const isTop3 = item.rank === 3;
      const isCurrent = item.isCurrentUser;

      let badge = `<span class="rank-number-normal">#${item.rank}</span>`;
      if (isTop1) badge = `<span class="rank-badge-podium">🥇</span>`;
      else if (isTop2) badge = `<span class="rank-badge-podium">🥈</span>`;
      else if (isTop3) badge = `<span class="rank-badge-podium">🥉</span>`;

      return `
        <div class="ranking-card-item ${isCurrent ? 'current-user' : ''}">
          <div class="ranking-left">
            ${badge}
            <img src="${item.avatar}" class="rank-avatar">
            <div>
              <div class="rank-user-name">${this.data.ranking.hidePersonal && isCurrent ? 'Bạn (Ẩn danh)' : item.name}</div>
              ${isCurrent ? `<span class="rank-user-tag">Bạn đang đứng #${item.rank}</span>` : ''}
            </div>
          </div>
          <div class="rank-right">
            <div class="rank-amount">${this.formatVND(item.amount)}</div>
            <div class="rank-growth">+${item.growth}%</div>
          </div>
        </div>
      `;
    }).join('');

    const alertText = document.getElementById('rankAlertText');
    if (alertText) {
      if (list.length <= 1) {
        alertText.textContent = "Bạn đang dẫn đầu bảng xếp hạng cá nhân! 🎉";
      } else {
        alertText.textContent = "Bảng xếp hạng đang cập nhật.";
      }
    }

    this.setupIcons();
  }

  setRankingMetric(metric, tabEl) {
    const tabs = tabEl.parentElement.querySelectorAll('.segmented-tab');
    tabs.forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
    this.data.ranking.metric = metric;
    this.recalculateBalances();
    this.saveData();
    this.renderRanking();
    this.showToast(`Xếp hạng theo ${tabEl.textContent}`);
  }

  setRankingPeriod(period, tabEl) {
    const tabs = tabEl.parentElement.querySelectorAll('.segmented-tab');
    tabs.forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
    this.data.ranking.period = period;
    this.recalculateBalances();
    this.saveData();
    this.renderRanking();
    this.showToast(`Kỳ: ${tabEl.textContent}`);
  }

  toggleRankPrivacy(checked) {
    this.data.ranking.hidePersonal = checked;
    this.saveData();
    this.renderRanking();
    this.showToast(checked ? 'Đã ẩn thông tin cá nhân trên Ranking' : 'Đã hiển thị thông tin');
  }

  // ===================================================
  // 6 & 7. NHÓM & PHÂN TÍCH NHÓM
  // ===================================================
  renderGroups() {
    const listEl = document.getElementById('groupsListMenu');
    if (listEl) {
      if (!this.data.groups.list || this.data.groups.list.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px;">
            Chưa có nhóm nào khác.
          </div>
        `;
      } else {
        listEl.innerHTML = this.data.groups.list.map(grp => `
          <div class="menu-list-item" onclick="app.navTo('screen-group-detail')">
            <div class="menu-item-left">
              <div class="category-icon-circle" style="background: ${grp.bg}; color: ${grp.color};">
                <i data-lucide="${grp.icon}" style="width: 18px; height: 18px;"></i>
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">${grp.name}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${grp.memberCount} thành viên</div>
              </div>
            </div>
            <i data-lucide="chevron-right" style="color: var(--text-muted); width: 16px; height: 16px;"></i>
          </div>
        `).join('');
      }
    }

    // Cập nhật số liệu nhóm chính
    const feat = this.data.groups.featured;
    if (feat) {
      const nameEl = document.getElementById('featuredGroupName');
      if (nameEl) nameEl.textContent = feat.name;
      const countEl = document.getElementById('featuredGroupCount');
      if (countEl) countEl.textContent = `${feat.memberCount} thành viên`;
      const incEl = document.getElementById('grpTotalInc');
      if (incEl) incEl.textContent = this.formatVND(feat.totalIncome);
      const expEl = document.getElementById('grpTotalExp');
      if (expEl) expEl.textContent = this.formatVND(feat.totalExpense);
      const savEl = document.getElementById('grpTotalSav');
      if (savEl) savEl.textContent = this.formatVND(feat.savings);

      // Render Group Avatar Stack
      const avatarWrap = document.getElementById('featuredGroupAvatars');
      if (avatarWrap) {
        avatarWrap.innerHTML = (feat.members || [this.data.user.avatar]).map(av => `
          <img src="${av}" class="avatar-stack-item">
        `).join('');
      }
    }

    // Cập nhật banner phân tích nhóm
    const detail = this.data.groups.detail || {};
    const dName = document.getElementById('grpDetailBannerName');
    if (dName) dName.textContent = detail.name || 'Gia đình';
    const dCount = document.getElementById('grpDetailBannerCount');
    if (dCount) dCount.textContent = `${detail.memberCount || 1} thành viên`;
    const dInc = document.getElementById('grpDetailIncome');
    if (dInc) dInc.textContent = this.formatVND(detail.totalIncome || 0);
    const dExp = document.getElementById('grpDetailExpense');
    if (dExp) dExp.textContent = this.formatVND(detail.totalExpense || 0);
    const dSav = document.getElementById('grpDetailSavings');
    if (dSav) dSav.textContent = this.formatVND(detail.savings || 0);

    // Render Group Contributions
    const contribEl = document.getElementById('groupMembersContribList');
    if (contribEl) {
      contribEl.innerHTML = this.data.groups.detail.membersContribution.map(m => `
        <div class="member-contrib-item">
          <img src="${m.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
          <span class="member-contrib-name">${m.name}</span>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width: ${m.percent}%;"></div>
          </div>
          <div class="member-contrib-right">
            <span class="member-contrib-pct">${m.percent}%</span>
            <span class="member-contrib-val">${this.formatVND(m.amount)}</span>
          </div>
        </div>
      `).join('');
    }

    this.setupIcons();
  }

  setGroupPeriod(period, tabEl) {
    const tabs = tabEl.parentElement.querySelectorAll('.segmented-tab');
    tabs.forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
    this.showToast(`Phân tích nhóm theo ${tabEl.textContent}`);
  }

  // ===================================================
  // 8. NGÂN SÁCH
  // ===================================================
  renderBudgets() {
    const listEl = document.getElementById('budgetItemsList');
    if (!listEl) return;

    listEl.innerHTML = this.data.budgets.map(b => `
      <div class="budget-card-item">
        <div class="budget-card-top">
          <div class="budget-card-left">
            <div class="category-icon-circle" style="background: ${b.bg}; color: ${b.color}; width: 34px; height: 34px;">
              <i data-lucide="${b.icon}" style="width: 16px; height: 16px;"></i>
            </div>
            <div>
              <div class="budget-title">${b.title}</div>
              <div class="budget-amounts">${this.formatVND(b.used)} / ${this.formatVND(b.target)}</div>
            </div>
          </div>
          <span class="budget-pct-badge">${b.percent}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width: ${b.percent}%; background: ${b.isWarning ? '#F59E0B' : '#10B981'};"></div>
        </div>
      </div>
    `).join('');

    // Hiển thị banner cảnh báo chỉ khi có danh mục vượt 90%
    const warningEl = document.getElementById('budgetWarningBanner');
    const warningItem = this.data.budgets.find(b => b.isWarning || b.percent >= 90);
    if (warningEl) {
      if (warningItem) {
        warningEl.style.display = 'flex';
        const txt = document.getElementById('budgetWarningText');
        if (txt) txt.textContent = `Bạn đã sử dụng ${warningItem.percent}% ngân sách ${warningItem.title}!`;
      } else {
        warningEl.style.display = 'none';
      }
    }

    this.setupIcons();
  }

  // ===================================================
  // 9. MỤC TIÊU TÀI CHÍNH
  // ===================================================
  renderGoals() {
    const listEl = document.getElementById('goalsCardsList');
    if (!listEl) return;

    if (!this.data.goals || this.data.goals.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 40px 16px; color: var(--text-muted); font-size: 13px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
            <i data-lucide="target" style="width: 24px; height: 24px; color: var(--text-muted);"></i>
          </div>
          <div style="font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Chưa có mục tiêu tài chính</div>
          <div>Bấm <b>Tạo mục tiêu mới</b> để bắt đầu tích lũy!</div>
        </div>
      `;
      this.setupIcons();
      return;
    }

    listEl.innerHTML = this.data.goals.map((g, idx) => `
      <div class="goal-card-item">
        <div class="goal-card-top">
          <div class="goal-left-info">
            <div class="goal-icon-box">
              <i data-lucide="${g.icon}" style="width: 20px; height: 20px; color: ${g.color};"></i>
            </div>
            <div>
              <div class="goal-title">${g.title}</div>
              <div class="goal-amounts-text">${this.formatVND(g.current)} / ${this.formatVND(g.target)}</div>
            </div>
          </div>
          <span style="font-size: 12px; font-weight: 700; color: var(--text-muted);">${g.percent}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width: ${g.percent}%; background: ${g.color};"></div>
        </div>
        <button class="btn-add-fund" onclick="app.addFundToGoal(${idx})">+ Thêm tiền</button>
      </div>
    `).join('');

    this.setupIcons();
  }

  addFundToGoal(index) {
    const goal = this.data.goals && this.data.goals[index];
    if (!goal) return;
    const addAmt = 500000;

    // Tìm ví có đủ số dư để trích tiền tích lũy
    const accounts = this.data.wallets?.accounts || [];
    const sourceAcc = accounts.find(a => (a.balance || 0) >= addAmt) || accounts[0];

    if (!sourceAcc || (sourceAcc.balance || 0) < addAmt) {
      this.showToast(`Số dư ví không đủ 500.000đ để tích lũy!`);
      return;
    }

    // Trừ số dư ví thực tế
    sourceAcc.balance -= addAmt;
    goal.current = (goal.current || 0) + addAmt;
    goal.percent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 100;

    // Ghi nhận giao dịch tài chính thật
    const now = new Date();
    const dayStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const dateDisplay = `${dayStr}/${monthStr}/${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isoDate = `${now.getFullYear()}-${monthStr}-${dayStr}`;

    const tx = {
      id: 'tx-' + Date.now(),
      title: `Tích lũy: ${goal.title}`,
      category: 'Mục tiêu',
      date: dateDisplay,
      time: timeStr,
      isoDate: isoDate,
      type: 'expense',
      amount: addAmt,
      account: sourceAcc.name,
      user: this.data.user.name || "Người dùng",
      icon: 'target'
    };

    if (!this.data.transactions) this.data.transactions = [];
    this.data.transactions.unshift(tx);

    this.recalculateBalances();
    this.saveData();
    this.renderAll();
    this.showToast(`Đã trích ${this.formatVND(addAmt)} từ ${sourceAcc.name} vào mục tiêu ${goal.title}!`);
  }

  openNewGoalModal() {
    const modal = document.getElementById('newGoalModal');
    if (modal) modal.classList.add('show');
  }

  closeNewGoalModal() {
    const modal = document.getElementById('newGoalModal');
    if (modal) modal.classList.remove('show');
  }

  submitNewGoal() {
    const titleInput = document.getElementById('newGoalTitleInput');
    const targetInput = document.getElementById('newGoalTargetInput');
    const currentInput = document.getElementById('newGoalCurrentInput');

    const title = titleInput?.value.trim();
    const target = parseInt(targetInput?.value, 10) || 0;
    const current = parseInt(currentInput?.value, 10) || 0;

    if (!title || target <= 0) {
      this.showToast('Vui lòng nhập tên và số tiền mục tiêu!');
      return;
    }

    const pct = Math.min(100, Math.round((current / target) * 100));

    this.data.goals.push({
      id: 'gl-' + Date.now(),
      title: title,
      icon: "target",
      current: current,
      target: target,
      percent: pct,
      color: "#10B981"
    });

    this.saveData();
    this.renderGoals();
    this.closeNewGoalModal();
    this.showToast(`Đã tạo mục tiêu "${title}"!`);

    if (titleInput) titleInput.value = '';
    if (targetInput) targetInput.value = '';
    if (currentInput) currentInput.value = '';
  }

  // ===================================================
  // 10. ANALYTICS (CHARTS)
  // ===================================================
  renderAnalyticsCharts() {
    // 1. Bar Chart Thu nhập vs Chi tiêu
    const barCanvas = document.getElementById('analyticsBarChart');
    if (barCanvas) {
      const ctx = barCanvas.getContext('2d');
      if (this.analyticsBar) this.analyticsBar.destroy();

      const txs = this.data.transactions || [];
      const mInc = [0, 0, 0, 0, 0, 0]; // T7, T8, T9, T10, T11, T12
      const mExp = [0, 0, 0, 0, 0, 0];
      txs.forEach(tx => {
        if (!tx.isoDate) return;
        const parts = tx.isoDate.split('-');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10);
          if (m >= 7 && m <= 12) {
            const idx = m - 7;
            if (tx.type === 'income') mInc[idx] += (Number(tx.amount) || 0);
            if (tx.type === 'expense') mExp[idx] += (Number(tx.amount) || 0);
          }
        }
      });

      this.analyticsBar = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
          datasets: [
            {
              label: 'Thu nhập',
              data: mInc,
              backgroundColor: '#10B981',
              borderRadius: 6
            },
            {
              label: 'Chi tiêu',
              data: mExp,
              backgroundColor: '#EF4444',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString('vi-VN')}đ`
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: { display: false }
          }
        }
      });
    }

    // 2. Pie / Donut Chart Chi tiêu theo danh mục
    const pieCanvas = document.getElementById('analyticsCategoryPie');
    if (pieCanvas) {
      const ctx = pieCanvas.getContext('2d');
      if (this.analyticsPie) this.analyticsPie.destroy();

      const categoriesMap = {};
      (this.data.transactions || []).filter(tx => tx.type === 'expense').forEach(tx => {
        categoriesMap[tx.category] = (categoriesMap[tx.category] || 0) + tx.amount;
      });

      const hasExpenses = Object.keys(categoriesMap).length > 0;
      const catLabels = hasExpenses ? Object.keys(categoriesMap) : ['Chưa có chi tiêu'];
      const catValues = hasExpenses ? Object.values(categoriesMap) : [1];
      const catColors = hasExpenses ? ['#EF4444', '#F97316', '#EC4899', '#10B981', '#64748B'] : ['#CBD5E1'];

      this.analyticsPie = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [
            {
              data: catValues,
              backgroundColor: catColors,
              borderWidth: 2,
              borderColor: '#FFFFFF'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: {
              position: 'right',
              labels: { boxWidth: 10, font: { size: 11, family: 'Plus Jakarta Sans' } }
            }
          }
        }
      });
    }
  }

  setAnalyticsPeriod(period, tabEl) {
    const tabs = tabEl.parentElement.querySelectorAll('.segmented-tab');
    tabs.forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
    this.showToast(`Biểu đồ theo ${tabEl.textContent}`);
    this.renderAnalyticsCharts();
  }

  // ===================================================
  // 11. NGUỒN THU NHẬP
  // ===================================================
  renderIncomeSources() {
    const totEl = document.getElementById('incomeSourcesTotal');
    if (totEl) totEl.textContent = this.formatVND(this.data.overview?.monthlyIncome || 0);
    const badgeEl = document.getElementById('incomeSourcesBadge');
    if (badgeEl) badgeEl.textContent = '+0%';

    const listEl = document.getElementById('incomeSourcesList');
    if (!listEl) return;

    listEl.innerHTML = this.data.incomeSources.sources.map(s => `
      <div style="padding: 10px 0; border-bottom: 1px solid var(--border-subtle);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="category-icon-circle" style="background: ${s.bg}; color: ${s.color}; width: 30px; height: 30px;">
              <i data-lucide="${s.icon}" style="width: 15px; height: 15px;"></i>
            </div>
            <span style="font-size: 13px; font-weight: 700; color: var(--text-main);">${s.title}</span>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 13px; font-weight: 800; color: var(--text-main);">${this.formatVND(s.amount)}</span>
            <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">${s.percent}%</span>
          </div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width: ${s.percent}%; background: ${s.color};"></div>
        </div>
      </div>
    `).join('');

    this.renderIncomeSourcesPie();
    this.setupIcons();
  }

  renderIncomeSourcesPie() {
    const canvas = document.getElementById('incomeSourcesPie');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (this.incomePie) this.incomePie.destroy();

    const incMap = {};
    (this.data.transactions || []).filter(tx => tx.type === 'income').forEach(tx => {
      incMap[tx.category] = (incMap[tx.category] || 0) + tx.amount;
    });

    const hasIncome = Object.keys(incMap).length > 0;
    const incLabels = hasIncome ? Object.keys(incMap) : ['Chưa có thu nhập'];
    const incValues = hasIncome ? Object.values(incMap) : [1];
    const incColors = hasIncome ? ['#14B8A6', '#10B981', '#F97316', '#8B5CF6', '#94A3B8'] : ['#CBD5E1'];

    this.incomePie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: incLabels,
        datasets: [
          {
            data: incValues,
            backgroundColor: incColors,
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 10, font: { size: 10, family: 'Plus Jakarta Sans' } }
          }
        }
      }
    });
  }

  // ===================================================
  // 12. TÀI KHOẢN / VÍ
  // ===================================================
  renderWallets() {
    const totEl = document.getElementById('walletsTotalBalance');
    if (totEl) {
      const sum = (this.data.wallets?.accounts || []).reduce((acc, a) => acc + (a.balance || 0), 0);
      totEl.textContent = this.formatVND(sum);
    }

    const gridEl = document.getElementById('walletsGrid2x2');
    if (gridEl) {
      gridEl.innerHTML = this.data.wallets.accounts.map(acc => `
        <div class="account-card-box">
          <div class="account-card-top">
            <div class="category-icon-circle" style="background: ${acc.bg}; color: ${acc.color}; width: 30px; height: 30px;">
              <i data-lucide="${acc.icon}" style="width: 15px; height: 15px;"></i>
            </div>
            <span class="account-name-lbl">${acc.name}</span>
          </div>
          <div class="account-balance-val">${this.formatVND(acc.balance)}</div>
        </div>
      `).join('');
    }

    const recListEl = document.getElementById('walletsRecentTxList');
    if (recListEl) {
      if (!this.data.wallets.recentTransactions || this.data.wallets.recentTransactions.length === 0) {
        recListEl.innerHTML = `
          <div style="text-align: center; padding: 18px; color: var(--text-muted); font-size: 12px;">
            Chưa có biến động số dư nào
          </div>
        `;
      } else {
        recListEl.innerHTML = this.data.wallets.recentTransactions.map(tx => `
          <div class="expense-item-row">
            <div class="expense-item-left">
              <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">${tx.account}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${tx.date}</div>
            </div>
            <div style="font-size: 13px; font-weight: 800; color: ${tx.color};">
              ${tx.type === 'income' ? '+' : '-'}${this.formatVND(tx.amount)}
            </div>
          </div>
        `).join('');
      }
    }

    this.setupIcons();
  }

  openTransferModal() {
    const fromSelect = document.getElementById('transferFromSelect');
    const toSelect = document.getElementById('transferToSelect');
    const accounts = this.data.wallets?.accounts || [];

    if (fromSelect && accounts.length > 0) {
      fromSelect.innerHTML = accounts.map(a => `
        <option value="${this.escapeHtml(a.name)}">${this.escapeHtml(a.name)} (${this.formatVND(a.balance || 0)})</option>
      `).join('');
    }
    if (toSelect && accounts.length > 0) {
      toSelect.innerHTML = accounts.map((a, idx) => `
        <option value="${this.escapeHtml(a.name)}" ${idx === 1 ? 'selected' : ''}>${this.escapeHtml(a.name)} (${this.formatVND(a.balance || 0)})</option>
      `).join('');
    }

    const modal = document.getElementById('transferModal');
    if (modal) modal.classList.add('show');
  }

  handleTransferFromChange() {
    const fromVal = document.getElementById('transferFromSelect')?.value;
    const toSelect = document.getElementById('transferToSelect');
    if (toSelect && fromVal) {
      toSelect.value = (fromVal === 'Ngân hàng') ? 'Tiền mặt' : 'Ngân hàng';
    }
  }

  closeTransferModal() {
    const modal = document.getElementById('transferModal');
    if (modal) modal.classList.remove('show');
  }

  executeTransfer() {
    if (this.isSubmittingTx) return;
    this.isSubmittingTx = true;

    try {
      const from = document.getElementById('transferFromSelect')?.value;
      const to = document.getElementById('transferToSelect')?.value;
      const amtInput = document.getElementById('transferAmountInput');
      const amt = this.parseVND(amtInput?.value);

      if (amt <= 0 || !Number.isFinite(amt) || amt > 1e15) {
        this.showToast('Vui lòng nhập số tiền chuyển hợp lệ (> 0đ)!');
        return;
      }

      if (from === to) {
        this.showToast('Ví nguồn và ví đích không được trùng nhau!');
        return;
      }

      const accFrom = (this.data.wallets?.accounts || []).find(a => a.name === from);
      const accTo = (this.data.wallets?.accounts || []).find(a => a.name === to);

      if (!accFrom || !accTo) {
        this.showToast('Không tìm thấy tài khoản ví!');
        return;
      }

      if ((accFrom.balance || 0) < amt) {
        this.showToast(`Số dư ${from} không đủ (${this.formatVND(accFrom.balance)})!`);
        return;
      }

      // Chuyển tiền nguyên tử giữa 2 ví
      accFrom.balance -= amt;
      accTo.balance += amt;

      const now = new Date();
      const dayStr = String(now.getDate()).padStart(2, '0');
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const dateDisplay = `${dayStr}/${monthStr}/${now.getFullYear()}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const isoDate = `${now.getFullYear()}-${monthStr}-${dayStr}`;

      // Ghi nhận vào danh sách transactions chính
      const transferTx = {
        id: 'tx-' + Date.now(),
        title: `Chuyển tiền: ${from} → ${to}`,
        category: 'Chuyển khoản',
        date: dateDisplay,
        time: timeStr,
        isoDate: isoDate,
        type: 'transfer',
        amount: amt,
        account: `${from} → ${to}`,
        user: this.data.user?.name || "Người dùng",
        icon: 'repeat'
      };

      if (!this.data.transactions) this.data.transactions = [];
      this.data.transactions.unshift(transferTx);

      if (!this.data.wallets.recentTransactions) this.data.wallets.recentTransactions = [];
      this.data.wallets.recentTransactions.unshift({
        id: 'wt-' + Date.now(),
        account: `${from} → ${to}`,
        date: "Hôm nay",
        amount: amt,
        type: "transfer",
        color: "#3B82F6"
      });

      this.recalculateBalances();
      this.saveData();

      // Đồng bộ nguyên tử lên Firestore cấp Database
      if (window.grabSync && typeof window.grabSync.executeAtomicTransfer === 'function') {
        window.grabSync.executeAtomicTransfer(from, to, amt, transferTx);
      }

      this.renderWallets();
      this.renderTransactionsList();
      this.closeTransferModal();
      if (amtInput) amtInput.value = '';
      this.showToast(`Chuyển ${this.formatVND(amt)} từ ${from} sang ${to} thành công!`);
    } finally {
      this.isSubmittingTx = false;
    }
  }

  // ===================================================
  // 13. THÔNG BÁO
  // ===================================================
  renderNotifications(typeFilter = 'all') {
    const listEl = document.getElementById('notificationsList');
    if (!listEl) return;

    let items = this.data.notifications || [];
    if (typeFilter === 'tx') items = items.filter(n => n.type === 'income' || n.type === 'general');
    else if (typeFilter === 'budget') items = items.filter(n => n.type === 'budget');
    else if (typeFilter === 'group') items = items.filter(n => n.type === 'group');

    if (items.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">
          Không có thông báo nào.
        </div>
      `;
      return;
    }

    listEl.innerHTML = items.map(n => `
      <div class="notif-card-item">
        <div class="notif-icon-circle" style="background: ${n.bg}; color: ${n.color};">
          <i data-lucide="${n.icon}" style="width: 18px; height: 18px;"></i>
        </div>
        <div>
          <div class="notif-text-title">${n.title}</div>
          <div class="notif-time-sub">${n.time}</div>
        </div>
      </div>
    `).join('');

    this.setupIcons();
  }

  filterNotifs(type, tabEl) {
    const tabs = tabEl.parentElement.querySelectorAll('.segmented-tab');
    tabs.forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
    this.renderNotifications(type);
  }

  // ===================================================
  // 15. CÀI ĐẶT & DARK MODE
  // ===================================================
  applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      const switchEl = document.getElementById('darkModeToggleSwitch');
      if (switchEl) switchEl.checked = true;
    } else {
      document.documentElement.removeAttribute('data-theme');
      const switchEl = document.getElementById('darkModeToggleSwitch');
      if (switchEl) switchEl.checked = false;
    }
  }

  toggleDarkMode(isDark) {
    this.data.user.darkMode = isDark;
    this.saveData();
    this.applyTheme(isDark);
    this.showToast(isDark ? 'Đã kích hoạt Chế độ tối (Dark Mode) 🌙' : 'Đã kích hoạt Chế độ sáng (Light Mode) ☀️');
    
    // Re-render chart colors
    if (this.currentScreen === 'screen-dashboard') this.renderDashboardChart();
    if (this.currentScreen === 'screen-analytics') this.renderAnalyticsCharts();
  }

  saveSetting(key, val) {
    this.data.user[key] = val;
    this.saveData();
    this.showToast('Đã lưu tùy chọn cài đặt!');
  }

  renderProfile() {
    const inc = document.getElementById('profileIncome');
    if (inc) inc.textContent = this.formatVND(this.data.overview.monthlyIncome);
    const exp = document.getElementById('profileExpense');
    if (exp) exp.textContent = this.formatVND(this.data.overview.monthlyExpense);
    const sav = document.getElementById('profileSavings');
    if (sav) sav.textContent = this.formatVND(this.data.overview.monthlySavings);

    // Cập nhật thông tin tài khoản hiển thị
    const nameEl = document.getElementById('profileFullName');
    if (nameEl) nameEl.textContent = this.data.user.name;
    const userEl = document.getElementById('profileEmailOrUser');
    if (userEl) userEl.textContent = this.data.user.email || this.data.user.username;
    const avEl = document.getElementById('profileAvatarImg');
    if (avEl) {
      avEl.referrerPolicy = "no-referrer";
      avEl.src = this.getAvatarUrl();
      avEl.onerror = () => {
        avEl.onerror = null;
        avEl.src = this.getDefaultAvatarUrl();
      };
    }
  }

  // ===================================================
  // 16. GOOGLE AUTHENTICATION & LOGIN MANAGEMENT
  // ===================================================
  initAuthListener() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
        if (user && !this.isLoggedIn) {
          console.log('Firebase user detected on startup:', user.email);
          this.handleLoginSuccess({
            name: user.displayName || 'Người dùng Google',
            email: user.email || '',
            avatar: user.photoURL || this.getDefaultAvatarUrl(user.displayName),
            uid: user.uid
          }, false);
        }
      });
    }
  }

  async loginWithGoogle() {
    const btn = document.getElementById('btnGoogleLogin');
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display: inline-block; width: 16px; height: 16px; border: 2px solid #10B981; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span> <span>Đang kết nối Google...</span>`;
    }

    try {
      if (typeof firebase === 'undefined' || !firebase.auth) {
        throw new Error('Thư viện Firebase Auth chưa sẵn sàng');
      }

      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      if (user) {
        this.handleLoginSuccess({
          name: user.displayName || 'Người dùng Google',
          email: user.email || '',
          avatar: user.photoURL || this.getDefaultAvatarUrl(user.displayName),
          uid: user.uid
        });
      }
    } catch (error) {
      console.warn('Google Sign-in error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        this.showToast('Bạn đã đóng cửa sổ đăng nhập Google.');
      } else if (error.code === 'auth/popup-blocked') {
        this.showToast('Trình duyệt đã chặn popup! Hãy bấm "Cho phép cửa sổ bật lên".');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Đang mở popup, bỏ qua request trùng
      } else {
        this.showToast('Lỗi đăng nhập Google: ' + (error.message || error.code));
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalContent;
      }
    }
  }

  loginAsGuest() {
    this.handleLoginSuccess({
      name: 'Khách trải nghiệm',
      email: 'khach@fintrack.app',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      uid: 'guest-' + Date.now()
    });
  }

  handleLoginSuccess(userInfo, showToastNotice = true) {
    this.isLoggedIn = true;
    const uid = userInfo.uid || ('user_' + Date.now());
    this.storageKey = 'finance_data_' + uid;

    // Kiểm tra xem người dùng này đã có dữ liệu ví/tiền trước đó chưa
    const savedUserRecord = localStorage.getItem(this.storageKey);
    if (savedUserRecord) {
      try {
        this.data = JSON.parse(savedUserRecord);
      } catch (e) {
        this.data = JSON.parse(JSON.stringify(DEFAULT_FINANCE_DATA));
      }
    } else {
      // Người mới hoàn toàn: Tạo không gian tài chính sạch 0đ của riêng họ
      this.data = JSON.parse(JSON.stringify(DEFAULT_FINANCE_DATA));
      this.data.overview = { currentBalance: 0, monthlyIncome: 0, monthlyExpense: 0, monthlySavings: 0 };
      this.data.transactions = [];
      this.data.todayExpenses = [];
      this.data.goals = [];
    }

    // Cập nhật thông tin profile của chính người đó
    this.data.user.name = userInfo.name;
    this.data.user.email = userInfo.email;
    this.data.user.avatar = userInfo.avatar;
    this.data.user.nickname = `${userInfo.name} 👋`;
    this.data.user.uid = uid;

    if (this.data.ranking?.leaderboard?.[0]) {
      this.data.ranking.leaderboard[0].name = userInfo.name;
      this.data.ranking.leaderboard[0].avatar = userInfo.avatar;
    }
    if (this.data.groups?.detail?.membersContribution?.[0]) {
      this.data.groups.detail.membersContribution[0].name = userInfo.name;
      this.data.groups.detail.membersContribution[0].avatar = userInfo.avatar;
    }
    if (this.data.groups?.featured?.members) {
      this.data.groups.featured.members = [userInfo.avatar];
    }

    localStorage.setItem('finance_user_logged_in', 'true');
    localStorage.setItem('finance_user_profile', JSON.stringify(userInfo));

    this.recalculateBalances();
    this.saveData();

    // Chuyển kênh Cloud Sync sang riêng biệt theo UID của người này
    if (window.grabSync && typeof window.grabSync.switchUser === 'function') {
      window.grabSync.switchUser(uid, userInfo.name);
    }

    this.renderAll();
    this.navTo('screen-dashboard');
    if (showToastNotice) {
      this.showToast(`🎉 Xin chào, ${userInfo.name}!`);
    }
  }

  logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất tài khoản?')) {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().catch(() => {});
      }
      if (window.grabSync && typeof window.grabSync.stopSync === 'function') {
        window.grabSync.stopSync();
      }
      this.isLoggedIn = false;
      localStorage.removeItem('finance_user_logged_in');
      localStorage.removeItem('finance_user_profile');
      this.storageKey = 'finance_data_guest';

      // Xóa sạch dữ liệu tài khoản cũ trong bộ nhớ RAM (Data Isolation)
      this.data = JSON.parse(JSON.stringify(DEFAULT_FINANCE_DATA));
      this.data.overview = { currentBalance: 0, monthlyIncome: 0, monthlyExpense: 0, monthlySavings: 0 };
      this.data.transactions = [];
      this.data.todayExpenses = [];
      this.data.goals = [];

      this.navTo('screen-login');
      this.showToast('Đã đăng xuất thành công.');
    }
  }

  // ===================================================
  // RENDER TOÀN BỘ ỨNG DỤNG
  // ===================================================
  renderAll() {
    this.renderDashboard();
    this.renderCalendar();
    this.renderTransactionsList();
    this.renderRanking();
    this.renderGroups();
    this.renderBudgets();
    this.renderGoals();
    this.renderIncomeSources();
    this.renderWallets();
    this.renderNotifications();
    this.renderProfile();
    this.setupIcons();
  }
}

// Khởi chạy App khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  window.app = new FinanceApp();

  // Tự động đối soát và đẩy giao dịch offline khi có kết nối Internet trở lại
  window.addEventListener('online', () => {
    if (window.grabSync && typeof window.grabSync.reconcileOfflineQueue === 'function') {
      window.grabSync.reconcileOfflineQueue();
    }
  });
});
