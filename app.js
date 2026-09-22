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
    this.initPullToRefresh();
    this.initCurrencyMasks();
    this.initViewportHeight();
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

    // Đảm bảo dữ liệu danh bạ bạn bè luôn sẵn sàng & LOẠI BỎ TRIỆT ĐỂ DỮ LIỆU MẪU / GIẢ LẬP
    if (!this.data.friends) {
      this.data.friends = { tag: this.getMyFriendTag(), activeTab: 'list', list: [], requests: [] };
    }
    if (!this.data.friends.tag || this.data.friends.tag === '@nhantuduc') {
      this.data.friends.tag = this.getMyFriendTag();
    }
    if (Array.isArray(this.data.friends.list)) {
      this.data.friends.list = this.data.friends.list.filter(f => 
        !['fr-1', 'fr-2'].includes(f.id) && f.tag !== '@thinh_grab' && f.tag !== '@maianh_99'
      );
    } else {
      this.data.friends.list = [];
    }
    if (Array.isArray(this.data.friends.requests)) {
      this.data.friends.requests = this.data.friends.requests.filter(r => 
        r.id !== 'req-1' && r.fromTag !== '@nam_tech'
      );
    } else {
      this.data.friends.requests = [];
    }

    // Làm sạch thông báo mẫu
    if (Array.isArray(this.data.notifications)) {
      this.data.notifications = this.data.notifications.filter(n => n.id !== 'notif-welcome');
    }

    // Làm sạch ảnh mock unsplash nếu còn sót trong user.avatar
    if (this.data.user && this.data.user.avatar && this.data.user.avatar.includes('unsplash.com')) {
      this.data.user.avatar = '';
    }

    // Phục hồi hồ sơ đăng nhập đã lưu
    if (savedProfile) {
      try {
        const u = JSON.parse(savedProfile);
        if (u.name) this.data.user.name = u.name;
        if (u.email) this.data.user.email = u.email;
        if (u.avatar && !u.avatar.includes('unsplash.com')) this.data.user.avatar = u.avatar;
        if (u.name) this.data.user.nickname = `${u.name} 👋`;
        if (u.uid) this.data.user.uid = u.uid;
      } catch (e) {}
    }

    // Lưu lại trạng thái sạch sau khi lọc bỏ mock data
    this.saveData();
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

  // Đồng bộ chuẩn xác chiều cao hiển thị trên Mobile Safari, PWA & Desktop (Triệt tiêu Chin Gap)
  initViewportHeight() {
    const updateHeight = () => {
      const vh = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 0;
      if (vh > 0 && typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.style.setProperty('--app-height', `${vh}px`);
      }
    };
    updateHeight();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateHeight);
      window.addEventListener('orientationchange', updateHeight);
      window.addEventListener('pageshow', updateHeight);
    }
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

  // Chuẩn sinh ID duy nhất chống xung đột phân tán (Criteria 2: UUID / High-entropy crypto)
  generateAppUUID(prefix = 'tx') {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return `${prefix}-${hex}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }

  // RECONCILIATION ENGINE: Đối soát Ledger là nguồn dữ liệu tài chính chân thực (Criteria 1, 3, 4)
  reconcileBalancesFromLedger() {
    if (!this.data) return { match: true, drift: 0 };
    const txs = this.data.transactions || [];
    let ledgerIncome = 0;
    let ledgerExpense = 0;
    const accountDeltas = { 'Ngân hàng': 0, 'Tiền mặt': 0 };

    txs.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        ledgerIncome += amt;
        const accName = tx.account || 'Ngân hàng';
        accountDeltas[accName] = (accountDeltas[accName] || 0) + amt;
      } else if (tx.type === 'expense') {
        ledgerExpense += amt;
        const accName = tx.account || 'Ngân hàng';
        accountDeltas[accName] = (accountDeltas[accName] || 0) - amt;
      } else if (tx.type === 'transfer') {
        const from = tx.fromAccount || (tx.account && tx.account.split(' → ')[0]) || 'Ngân hàng';
        const to = tx.toAccount || (tx.account && tx.account.split(' → ')[1]) || 'Tiền mặt';
        accountDeltas[from] = (accountDeltas[from] || 0) - amt;
        accountDeltas[to] = (accountDeltas[to] || 0) + amt;
      }
    });

    let initialBank = 0;
    let initialCash = 0;
    if (this.data.wallets && typeof this.data.wallets.initialBankBalance === 'number') {
      initialBank = this.data.wallets.initialBankBalance;
      initialCash = this.data.wallets.initialCashBalance || 0;
    } else {
      const currentBank = (this.data.wallets?.accounts || []).find(a => a.name === 'Ngân hàng')?.balance || 0;
      const currentCash = (this.data.wallets?.accounts || []).find(a => a.name === 'Tiền mặt')?.balance || 0;
      initialBank = currentBank - (accountDeltas['Ngân hàng'] || 0);
      initialCash = currentCash - (accountDeltas['Tiền mặt'] || 0);
      if (!this.data.wallets) this.data.wallets = { totalBalance: 0, accounts: [] };
      this.data.wallets.initialBankBalance = initialBank;
      this.data.wallets.initialCashBalance = initialCash;
    }

    const calcBankBal = initialBank + (accountDeltas['Ngân hàng'] || 0);
    const calcCashBal = initialCash + (accountDeltas['Tiền mặt'] || 0);
    const ledgerTotal = calcBankBal + calcCashBal;

    const currBank = (this.data.wallets?.accounts || []).find(a => a.name === 'Ngân hàng')?.balance || 0;
    const currCash = (this.data.wallets?.accounts || []).find(a => a.name === 'Tiền mặt')?.balance || 0;
    const currentTotal = currBank + currCash;

    const drift = currentTotal - ledgerTotal;
    const driftDetected = Math.abs(drift) > 0.001;
    if (driftDetected) {
      console.warn(`[RECONCILIATION] DRIFT DETECTED: Phát hiện độ lệch số dư (${drift}đ). Đồng bộ ví về giá trị Ledger chân thực.`);
      this.data.wallets.accounts = [
        { id: "acc-bank", name: "Ngân hàng", icon: "landmark", balance: calcBankBal, color: "#10B981", bg: "#D1FAE5" },
        { id: "acc-cash", name: "Tiền mặt", icon: "banknote", balance: calcCashBal, color: "#06B6D4", bg: "#CFFAFE" }
      ];
      this.data.wallets.totalBalance = ledgerTotal;
      if (this.data.overview) {
        this.data.overview.currentBalance = ledgerTotal;
      }
    }

    return {
      driftDetected,
      match: !driftDetected,
      drift,
      ledgerTotal,
      ledgerIncome,
      ledgerExpense,
      calcBankBal,
      calcCashBal
    };
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

  // 🪙 WEB AUDIO API COIN SOUND (0 KB, âm thanh leng keng của đồng xu khi nhận tiền)
  playCoinSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const now = this.audioCtx.currentTime;

      // Tiếng chuông 1 (1760Hz - A6)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1760, now);
      osc1.frequency.exponentialRampToValueAtTime(2200, now + 0.1);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Tiếng chuông 2 (2637Hz - E7) ngân vang
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2637, now + 0.08);
      gain2.gain.setValueAtTime(0.25, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.42);
    } catch (e) {}
  }

  // 🎉 CANVAS CONFETTI (Bắn pháo hoa ăn mừng khi hoàn thành mục tiêu tài chính)
  triggerConfetti() {
    try {
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.65 }
        });
        setTimeout(() => {
          confetti({
            particleCount: 45,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 45,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });
        }, 180);
      }
    } catch (e) {}
  }

  // 💵 REAL-TIME CURRENCY MASK (Tự động format dấu chấm phân cách khi gõ tiền)
  initCurrencyMasks() {
    const inputIds = ['addAmountInput', 'transferAmountInput', 'newGoalTargetInput', 'newGoalCurrentInput'];
    inputIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', (e) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        if (!raw) {
          e.target.value = '';
          return;
        }
        const val = parseInt(raw, 10);
        if (!isNaN(val)) {
          e.target.value = val.toLocaleString('vi-VN') + ' đ';
        }
      });
    });
  }

  // 📳 HAPTIC TOUCH FEEDBACK (Xung rung nhẹ mô phỏng nút bấm iOS/Android)
  triggerHaptic(type = 'light') {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (type === 'medium') {
          navigator.vibrate(22);
        } else if (type === 'heavy') {
          navigator.vibrate([30, 40, 30]);
        } else {
          navigator.vibrate(10);
        }
      }
    } catch (e) {}
  }

  // 🌟 NUMBER COUNT-UP ANIMATION (Lăn số mượt 60fps khi biến động số dư)
  animateNumber(el, targetVal, duration = 650) {
    if (!el || isNaN(targetVal)) return;
    if (!el.dataset) el.dataset = {};
    const startVal = Number(el.dataset.rawVal) || 0;
    el.dataset.rawVal = targetVal;
    if (startVal === targetVal) {
      el.textContent = this.formatVND(targetVal);
      return;
    }
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic: 1 - (1 - t)^3
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (targetVal - startVal) * ease);
      el.textContent = this.formatVND(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = this.formatVND(targetVal);
      }
    };
    requestAnimationFrame(step);
  }

  // 🔄 PULL-TO-REFRESH (Vuốt đỉnh màn hình để đồng bộ Cloud Realtime)
  initPullToRefresh() {
    const indicator = document.getElementById('pullRefreshIndicator');
    const indicatorText = document.getElementById('pullRefreshText');
    const screenContainer = document.querySelector('.screen-container');
    if (!indicator || !screenContainer) return;

    let startY = 0;
    let pullDistance = 0;
    let isPulling = false;
    let activeScreen = null;

    screenContainer.addEventListener('touchstart', (e) => {
      activeScreen = document.querySelector('.app-screen.active');
      if (!activeScreen || activeScreen.id === 'screen-login') return;
      if (activeScreen.scrollTop <= 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    }, { passive: true });

    screenContainer.addEventListener('touchmove', (e) => {
      if (!isPulling || !activeScreen) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      if (diff > 0 && activeScreen.scrollTop <= 0) {
        pullDistance = Math.min(diff * 0.45, 80);
        indicator.classList.add('visible');
        indicator.style.transform = `translateX(-50%) translateY(${pullDistance - 50}px)`;
        if (indicatorText) {
          indicatorText.textContent = pullDistance > 45 ? 'Thả để đồng bộ Cloud' : 'Kéo để làm mới';
        }
      } else {
        indicator.classList.remove('visible');
        indicator.style.transform = '';
      }
    }, { passive: true });

    const finishPull = async () => {
      if (!isPulling) return;
      isPulling = false;
      if (pullDistance > 45) {
        this.triggerHaptic('medium');
        indicator.classList.add('refreshing');
        if (indicatorText) indicatorText.textContent = 'Đang đồng bộ...';
        indicator.style.transform = 'translateX(-50%) translateY(14px)';

        try {
          if (window.grabSync && typeof window.grabSync.initCloudSync === 'function') {
            window.grabSync.initCloudSync();
          }
          this.recalculateBalances();
          this.renderAll();
          this.showToast('☁️ Đã đồng bộ dữ liệu mới nhất từ Cloud!');
        } catch (err) {
          console.warn('Pull-to-refresh sync error:', err);
        }

        setTimeout(() => {
          indicator.classList.remove('refreshing', 'visible');
          indicator.style.transform = '';
          pullDistance = 0;
        }, 600);
      } else {
        indicator.classList.remove('visible');
        indicator.style.transform = '';
        pullDistance = 0;
      }
    };

    screenContainer.addEventListener('touchend', finishPull, { passive: true });
    screenContainer.addEventListener('touchcancel', finishPull, { passive: true });
  }

  // ===================================================
  // NAVIGATION & ROUTING (VIEW TRANSITIONS API)
  // ===================================================
  navTo(screenId, saveHistory = true) {
    if (this.currentScreen === screenId) return;
    this.triggerHaptic('light');

    const switchScreenDOM = () => {
      if (saveHistory && this.currentScreen) {
        this.historyStack.push(this.currentScreen);
      }

      const prevEl = document.getElementById(this.currentScreen);
      if (prevEl) prevEl.classList.remove('active');

      const nextEl = document.getElementById(screenId);
      if (nextEl) {
        nextEl.classList.add('active');
        this.currentScreen = screenId;
        nextEl.scrollTop = 0;
      }

      // Ẩn thanh Bottom Nav khi đang ở màn hình Đăng nhập
      const bottomBar = document.querySelector('.bottom-nav-bar');
      if (bottomBar) {
        bottomBar.style.display = (screenId === 'screen-login') ? 'none' : 'flex';
      }

      // Cập nhật trạng thái Bottom Nav
      this.updateBottomNavState(screenId);
    };

    // Tận dụng View Transitions API nếu trình duyệt hỗ trợ
    if (typeof document !== 'undefined' && document.startViewTransition) {
      document.startViewTransition(() => switchScreenDOM());
    } else {
      switchScreenDOM();
    }

    // Re-render chart nếu màn hình có canvas hoặc dữ liệu động
    if (screenId === 'screen-dashboard') {
      setTimeout(() => this.renderDashboardChart(), 80);
    } else if (screenId === 'screen-analytics') {
      setTimeout(() => this.renderAnalyticsCharts(), 80);
    } else if (screenId === 'screen-income-sources') {
      setTimeout(() => this.renderIncomeSourcesPie(), 80);
    } else if (screenId === 'screen-ranking') {
      this.renderRanking();
    }

    this.setupIcons();
  }

  goBack() {
    this.triggerHaptic('light');
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
    this.triggerHaptic('light');
    const sheet = document.getElementById('quickActionSheet');
    if (sheet) sheet.classList.add('show');
  }

  closeQuickActionSheet() {
    this.triggerHaptic('light');
    const sheet = document.getElementById('quickActionSheet');
    if (sheet) sheet.classList.remove('show');
  }

  // ===================================================
  // 1. DASHBOARD
  // ===================================================
  toggleBalanceVisibility() {
    this.triggerHaptic('light');
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
    if (dashBal && !this.isBalanceHidden) {
      this.animateNumber(dashBal, ov.currentBalance);
    }

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
    if (inc) this.animateNumber(inc, ov.monthlyIncome);

    const exp = document.getElementById('dashMonthlyExpense');
    if (exp) this.animateNumber(exp, ov.monthlyExpense);

    const sav = document.getElementById('dashMonthlySavings');
    if (sav) this.animateNumber(sav, ov.monthlySavings);

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

    // Reset limit nếu đổi bộ lọc hoặc từ khóa tìm kiếm
    if (this.currentTxFilter !== filterType || this.currentTxSearch !== searchQuery) {
      this.txPageLimit = 50;
    }
    this.currentTxFilter = filterType;
    this.currentTxSearch = searchQuery;
    const pageLimit = this.txPageLimit || 50;

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

    // Phân trang UI: giới hạn số lượng render trên DOM (Criteria 4 & Criteria 10)
    // KHÔNG dùng danh sách cắt ngắn này để tính số dư tài chính (Reconciliation chạy trên toàn bộ Ledger)
    const itemsToRender = items.slice(0, pageLimit);

    let html = itemsToRender.map(tx => {
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

    // Nút Tải thêm giao dịch nếu còn phần tử tiếp theo trong Ledger
    if (items.length > pageLimit) {
      html += `
        <div style="text-align: center; padding: 14px 0 6px 0;">
          <button type="button" class="btn-load-more" onclick="app.loadMoreTransactions()" style="background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #E2E8F0); color: var(--text-primary, #1E293B); padding: 8px 18px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
            Xem thêm giao dịch (đang hiển thị ${itemsToRender.length}/${items.length})
          </button>
        </div>
      `;
    }

    listEl.innerHTML = html;
    this.setupIcons();
  }

  loadMoreTransactions() {
    this.txPageLimit = (this.txPageLimit || 50) + 50;
    this.renderTransactionsList(this.currentTxFilter || 'all', this.currentTxSearch || '');
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
        id: this.generateAppUUID('tx'),
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
          id: this.generateAppUUID('te'),
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
        if (targetAcc && typeof window.grabSync.writeWalletDoc === 'function') {
          const wId = targetAcc.id || (targetAcc.name === 'Tiền mặt' ? 'acc-cash' : 'acc-bank');
          window.grabSync.writeWalletDoc(wId, targetAcc);
        }
        if (this.currentAddType === 'income' && typeof window.grabSync.syncLeaderboardEntry === 'function') {
          window.grabSync.syncLeaderboardEntry('total_income', this.data.overview.monthlyIncome, this.data.ranking?.hidePersonal, this.data.user?.name);
        }
      }

      this.playCoinSound();
      this.triggerHaptic('medium');
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

    let html = list.map((item, idx) => {
      const isTop1 = item.rank === 1;
      const isTop2 = item.rank === 2;
      const isTop3 = item.rank === 3;
      const isCurrent = item.isCurrentUser;

      let badge = `<span class="rank-number-normal">#${item.rank}</span>`;
      if (isTop1) badge = `<span class="rank-badge-podium">🥇</span>`;
      else if (isTop2) badge = `<span class="rank-badge-podium">🥈</span>`;
      else if (isTop3) badge = `<span class="rank-badge-podium">🥉</span>`;

      const avatarSrc = item.avatar || this.getDefaultAvatarUrl(item.name);

      return `
        <div class="ranking-card-item ${isCurrent ? 'current-user' : ''}">
          <div class="ranking-left">
            ${badge}
            <img src="${avatarSrc}" class="rank-avatar" alt="${this.escapeHtml(item.name)}" onerror="this.onerror=null;this.src='${this.getDefaultAvatarUrl(item.name)}';">
            <div>
              <div class="rank-user-name">${this.data.ranking?.hidePersonal && isCurrent ? 'Bạn (Ẩn danh)' : this.escapeHtml(item.name)}</div>
              ${isCurrent ? `<span class="rank-user-tag">Bạn đang đứng #${item.rank}</span>` : ''}
            </div>
          </div>
          <div class="rank-right">
            <div class="rank-amount">${this.formatVND(item.amount)}</div>
            <div class="rank-growth">+${item.growth || 0}%</div>
          </div>
        </div>
      `;
    }).join('');

    // Hiển thị thẻ kết nối cộng đồng/bạn bè khi chỉ có 1 người dùng trên danh sách
    if (list.length <= 1) {
      html += `
        <div class="ranking-invite-card">
          <div class="ranking-invite-icon">
            <i data-lucide="users" style="width: 20px; height: 20px;"></i>
          </div>
          <div class="ranking-invite-content">
            <div class="ranking-invite-title">Đua top cùng đồng nghiệp</div>
            <div class="ranking-invite-desc">Kết nối bạn bè hoặc tham gia nhóm tài xế để theo dõi và so tài thứ hạng mỗi ngày!</div>
            <button class="ranking-invite-btn" onclick="app.navTo('screen-friends')">
              <i data-lucide="user-plus" style="width: 14px; height: 14px;"></i>
              <span>Xem danh sách bạn bè</span>
            </button>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

    const alertText = document.getElementById('rankAlertText');
    if (alertText) {
      if (list.length <= 1) {
        alertText.textContent = "Bạn đang dẫn đầu bảng xếp hạng cá nhân! 🎉";
      } else {
        alertText.textContent = "Bảng xếp hạng đang cập nhật theo thời gian thực.";
      }
    }

    // Đồng bộ trạng thái switch Ẩn thông tin cá nhân
    const privacyToggle = document.getElementById('rankPrivacyToggle');
    if (privacyToggle) {
      privacyToggle.checked = !!this.data.ranking?.hidePersonal;
    }

    // Cập nhật huy hiệu kỳ xếp hạng trên header
    const badge = document.getElementById('rankSeasonBadge');
    if (badge && this.data.ranking?.period) {
      const periodMap = {
        'today': 'Hôm nay',
        'this_week': 'Tuần này',
        'this_month': 'Tháng này',
        'this_year': 'Năm nay'
      };
      badge.textContent = periodMap[this.data.ranking.period] || 'Tuần này';
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
      id: this.generateAppUUID('tx'),
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

    if (window.grabSync) {
      if (typeof window.grabSync.writeTransactionDoc === 'function') {
        window.grabSync.writeTransactionDoc(tx);
      }
      if (typeof window.grabSync.writeWalletDoc === 'function') {
        const wId = sourceAcc.id || (sourceAcc.name === 'Tiền mặt' ? 'acc-cash' : 'acc-bank');
        window.grabSync.writeWalletDoc(wId, sourceAcc);
      }
    }

    this.playCoinSound();
    this.triggerHaptic('medium');
    if (goal.percent >= 100) {
      this.triggerConfetti();
      this.showToast(`🎉 CHÚC MỪNG! Đã hoàn thành mục tiêu ${goal.title}!`);
    } else {
      this.showToast(`Đã trích ${this.formatVND(addAmt)} từ ${sourceAcc.name} vào mục tiêu ${goal.title}!`);
    }
    this.renderAll();
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
      id: this.generateAppUUID('gl'),
      title: title,
      icon: "target",
      current: current,
      target: target,
      percent: pct,
      color: "#10B981"
    });

    this.saveData();
    this.playCoinSound();
    this.triggerConfetti();
    this.triggerHaptic('medium');
    this.renderGoals();
    this.closeNewGoalModal();
    this.showToast(`🎉 Đã tạo mục tiêu "${title}"!`);

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
      const monthLabels = [];
      const monthKeys = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        monthLabels.push(`T${m}`);
        monthKeys.push(`${y}-${String(m).padStart(2, '0')}`);
      }
      const mInc = [0, 0, 0, 0, 0, 0];
      const mExp = [0, 0, 0, 0, 0, 0];
      txs.forEach(tx => {
        if (!tx.isoDate) return;
        const ym = tx.isoDate.substring(0, 7);
        const idx = monthKeys.indexOf(ym);
        if (idx !== -1) {
          if (tx.type === 'income') mInc[idx] += (Number(tx.amount) || 0);
          if (tx.type === 'expense') mExp[idx] += (Number(tx.amount) || 0);
        }
      });

      this.analyticsBar = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: monthLabels,
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
        <div class="account-card-box draggable-handle">
          <div class="account-card-top">
            <div class="category-icon-circle" style="background: ${acc.bg}; color: ${acc.color}; width: 30px; height: 30px;">
              <i data-lucide="${acc.icon}" style="width: 15px; height: 15px;"></i>
            </div>
            <span class="account-name-lbl">${acc.name}</span>
          </div>
          <div class="account-balance-val">${this.formatVND(acc.balance)}</div>
        </div>
      `).join('');

      if (typeof Sortable !== 'undefined') {
        if (this.sortableWallets) {
          try { this.sortableWallets.destroy(); } catch (e) {}
        }
        this.sortableWallets = new Sortable(gridEl, {
          animation: 200,
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          dragClass: 'sortable-drag',
          onEnd: (evt) => {
            this.triggerHaptic('light');
            if (evt.oldIndex !== evt.newIndex) {
              const moved = this.data.wallets.accounts.splice(evt.oldIndex, 1)[0];
              this.data.wallets.accounts.splice(evt.newIndex, 0, moved);
              this.saveData();
              this.showToast(`Đã sắp xếp lại ví: ${moved.name}`);
            }
          }
        });
      }
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

      // Ghi nhận vào danh sách transactions chính theo chuẩn Transfer Model (Criteria 5)
      const sourceWId = accFrom.id || (from === 'Tiền mặt' ? 'acc-cash' : 'acc-bank');
      const destWId = accTo.id || (to === 'Tiền mặt' ? 'acc-cash' : 'acc-bank');
      const transferTx = {
        id: this.generateAppUUID('tx'),
        sourceWalletId: sourceWId,
        destinationWalletId: destWId,
        fromAccount: from,
        toAccount: to,
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
        id: this.generateAppUUID('wt'),
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

      this.triggerHaptic('medium');
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

    // Cập nhật số lượng bạn bè hiển thị trên Profile
    const profileFriendsBadge = document.getElementById('profileFriendsBadge');
    if (profileFriendsBadge) {
      profileFriendsBadge.textContent = (this.data.friends?.list?.length) || 0;
    }
  }

  // ===================================================
  // 15. FRIENDS SYSTEM (BẠN BÈ & KẾT BẠN)
  // ===================================================
  generateFriendTag(query, displayName) {
    const raw = (query.startsWith('@') ? query.slice(1) : (displayName || query || 'user'))
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    // Nếu người dùng đã gõ ID có sẵn số ở đuôi (ví dụ: @nghia1234), giữ nguyên
    if (/\d{2,}/.test(raw)) {
      return '@' + raw;
    }

    // Nếu chưa có dãy số, gán thêm dãy 4 số ngẫu nhiên chuẩn (ví dụ: @tunhannghia4821)
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    return '@' + (raw || 'user') + randSuffix;
  }

  getMyFriendTag() {
    if (this.data?.friends?.tag && this.data.friends.tag !== '@nhantuduc' && this.data.friends.tag !== '' && this.data.friends.tag !== '@user') {
      return this.data.friends.tag;
    }
    const raw = (this.data?.user?.email ? this.data.user.email.split('@')[0] : (this.data?.user?.username || this.data?.user?.name || 'user'))
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    const base = raw || 'user';
    const tag = /\d{2,}/.test(base) ? ('@' + base) : ('@' + base + Math.floor(1000 + Math.random() * 9000));
    if (this.data?.friends) {
      this.data.friends.tag = tag;
    }
    return tag;
  }

  renderFriends() {
    if (!this.data.friends) {
      this.data.friends = {
        tag: this.getMyFriendTag(),
        activeTab: 'list',
        list: [],
        requests: []
      };
    }
    if (!Array.isArray(this.data.friends.list)) this.data.friends.list = [];
    if (!Array.isArray(this.data.friends.requests)) this.data.friends.requests = [];

    // Tự động chuẩn hóa và gắn số ngẫu nhiên cho bạn bè cũ có tag lỗi font / tiếng Việt
    this.data.friends.list.forEach(f => {
      if (!f.tag || /[^\x00-\x7F]/.test(f.tag) || !/\d{2,}/.test(f.tag)) {
        f.tag = this.generateFriendTag(f.tag || f.name, f.name);
      }
      if (f.name) {
        f.name = f.name.split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    });

    const myTag = this.getMyFriendTag();
    const myName = this.data.user?.name || 'Người dùng';
    const myAvatar = this.getAvatarUrl();

    // 1. Thẻ ID cá nhân
    const myNameEl = document.getElementById('friendMyName');
    if (myNameEl) myNameEl.textContent = myName;

    const myTagEl = document.getElementById('friendMyTag');
    if (myTagEl) myTagEl.textContent = myTag;

    const myAvEl = document.getElementById('friendMyAvatar');
    if (myAvEl) {
      myAvEl.referrerPolicy = "no-referrer";
      myAvEl.src = myAvatar;
      myAvEl.onerror = () => {
        myAvEl.onerror = null;
        myAvEl.src = this.getDefaultAvatarUrl(myName);
      };
    }

    // 2. Cập nhật các badge số lượng
    const countBadge = document.getElementById('friendsCountBadge');
    if (countBadge) countBadge.textContent = this.data.friends.list.length;

    const reqsBadge = document.getElementById('friendsReqsBadge');
    if (reqsBadge) reqsBadge.textContent = this.data.friends.requests.length;

    const profileBadge = document.getElementById('profileFriendsBadge');
    if (profileBadge) profileBadge.textContent = this.data.friends.list.length;

    // Tự động đồng bộ hồ sơ công khai của chính mình lên Cloud (để người khác tìm thấy)
    if (this.isLoggedIn && window.grabSync && typeof window.grabSync.syncPublicProfile === 'function') {
      window.grabSync.syncPublicProfile({
        name: myName,
        tag: myTag,
        avatar: myAvatar
      });
    }

    // 3. Render Danh sách bạn bè
    const listContainer = document.getElementById('friendsListContainer');
    if (listContainer) {
      if (this.data.friends.list.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state-box" style="text-align: center; padding: 36px 16px; color: var(--text-muted);">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--bg-card-subtle); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: var(--text-muted);">
              <i data-lucide="users" style="width: 26px; height: 26px;"></i>
            </div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Chưa có bạn bè trong danh bạ</div>
            <div style="font-size: 12px; max-width: 260px; margin: 0 auto;">Hãy nhập tên hoặc ID bên trên, hoặc chia sẻ mã QR để kết nối bạn bè!</div>
          </div>
        `;
      } else {
        listContainer.innerHTML = this.data.friends.list.map(f => {
          const defaultAv = this.getDefaultAvatarUrl(f.name);
          const avSrc = f.avatar || defaultAv;
          return `
            <div class="friend-item-card">
              <div class="friend-item-left">
                <img src="${this.escapeHtml(avSrc)}" alt="${this.escapeHtml(f.name)}" class="avatar-circle" style="width: 44px; height: 44px; object-fit: cover;" onerror="this.src='${defaultAv}'">
                <div>
                  <div class="friend-item-name">${this.escapeHtml(f.name)}</div>
                  <div class="friend-item-sub">
                    <span class="friend-item-tag">${this.escapeHtml(f.tag || '')}</span>
                    ${f.role ? `<span>• ${this.escapeHtml(f.role)}</span>` : ''}
                  </div>
                </div>
              </div>
              <div class="friend-item-actions">
                <button class="btn-friend-action primary" onclick="app.inviteFriendToGroup('${this.escapeHtml(f.id)}')" title="Mời vào nhóm">
                  <i data-lucide="user-plus" style="width: 14px; height: 14px;"></i>
                  <span>Mời</span>
                </button>
                <button class="btn-friend-action danger" onclick="app.removeFriend('${this.escapeHtml(f.id)}')" title="Hủy kết bạn">
                  <i data-lucide="user-x" style="width: 14px; height: 14px;"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 4. Render Danh sách lời mời
    const reqsContainer = document.getElementById('friendsRequestsContainer');
    if (reqsContainer) {
      if (this.data.friends.requests.length === 0) {
        reqsContainer.innerHTML = `
          <div class="empty-state-box" style="text-align: center; padding: 36px 16px; color: var(--text-muted);">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--bg-card-subtle); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: var(--text-muted);">
              <i data-lucide="mail-check" style="width: 26px; height: 26px;"></i>
            </div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Không có lời mời kết bạn mới</div>
            <div style="font-size: 12px; max-width: 240px; margin: 0 auto;">Khi ai đó gửi kết bạn theo ID của bạn, lời mời sẽ hiển thị ở đây.</div>
          </div>
        `;
      } else {
        reqsContainer.innerHTML = this.data.friends.requests.map(r => {
          const defaultAv = this.getDefaultAvatarUrl(r.fromName);
          const avSrc = r.avatar || defaultAv;
          return `
            <div class="friend-item-card">
              <div class="friend-item-left">
                <img src="${this.escapeHtml(avSrc)}" alt="${this.escapeHtml(r.fromName)}" class="avatar-circle" style="width: 44px; height: 44px; object-fit: cover;" onerror="this.src='${defaultAv}'">
                <div>
                  <div class="friend-item-name">${this.escapeHtml(r.fromName)}</div>
                  <div class="friend-item-sub">
                    <span class="friend-item-tag">${this.escapeHtml(r.fromTag || '')}</span>
                    <span>• ${this.escapeHtml(r.time || 'Mới đây')}</span>
                  </div>
                </div>
              </div>
              <div class="friend-item-actions">
                <button class="btn-friend-action primary" onclick="app.acceptFriendRequest('${this.escapeHtml(r.id)}')">
                  <i data-lucide="check" style="width: 14px; height: 14px;"></i>
                  <span>Đồng ý</span>
                </button>
                <button class="btn-friend-action danger" onclick="app.declineFriendRequest('${this.escapeHtml(r.id)}')">
                  <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                  <span>Bỏ qua</span>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 5. Cập nhật trạng thái Tab hiển thị
    const activeTab = this.data.friends.activeTab || 'list';
    const tabListEl = document.getElementById('tabFriendsList');
    const tabReqsEl = document.getElementById('tabFriendsRequests');

    if (activeTab === 'list') {
      if (tabListEl) tabListEl.classList.add('active');
      if (tabReqsEl) tabReqsEl.classList.remove('active');
      if (listContainer) listContainer.style.display = 'block';
      if (reqsContainer) reqsContainer.style.display = 'none';
    } else {
      if (tabListEl) tabListEl.classList.remove('active');
      if (tabReqsEl) tabReqsEl.classList.add('active');
      if (listContainer) listContainer.style.display = 'none';
      if (reqsContainer) reqsContainer.style.display = 'block';
    }

    this.setupIcons();
  }

  switchFriendsTab(tab) {
    if (!this.data.friends) this.data.friends = {};
    this.data.friends.activeTab = tab;
    this.triggerHaptic('light');
    this.renderFriends();
    this.saveData();
  }

  clearFriendSearch() {
    const input = document.getElementById('friendSearchInput');
    if (input) input.value = '';
    const container = document.getElementById('friendSearchResultsContainer');
    if (container) {
      container.style.display = 'none';
      container.innerHTML = '';
    }
    const clearBtn = document.getElementById('btnFriendSearchClear');
    if (clearBtn) clearBtn.style.display = 'none';
  }

  async searchFriendUser() {
    const input = document.getElementById('friendSearchInput');
    const container = document.getElementById('friendSearchResultsContainer');
    const clearBtn = document.getElementById('btnFriendSearchClear');
    const btn = document.getElementById('btnFriendSearchAction');
    if (!input || !container) return;

    const query = input.value.trim();
    if (!query) {
      this.showToast('⚠️ Vui lòng nhập ID (@user) hoặc tên người dùng cần tìm!');
      input.focus();
      return;
    }

    if (clearBtn) clearBtn.style.display = 'block';

    const myTag = this.getMyFriendTag().toLowerCase();
    const cleanQuery = query.toLowerCase().replace('@', '');

    // Hiển thị trạng thái đang tìm kiếm
    container.style.display = 'block';
    container.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; text-align: center; color: var(--text-muted); font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <span style="display: inline-block; width: 14px; height: 14px; border: 2px solid #6366F1; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
        <span>Đang tìm kiếm tài khoản trên hệ thống...</span>
      </div>
    `;

    const originalBtn = btn ? btn.innerHTML : '';
    if (btn) btn.disabled = true;

    try {
      let results = [];
      let searchRes = { success: true, results: [] };

      // 1. Tìm trên Firestore qua window.grabSync
      if (window.grabSync && typeof window.grabSync.searchPublicUsers === 'function') {
        searchRes = await window.grabSync.searchPublicUsers(query);
        results = searchRes.results || [];
      }

      // 2. Nếu gặp lỗi phân quyền do chưa publish rules trên Firebase Console
      if (!searchRes.success && searchRes.error) {
        if (searchRes.error.code === 'permission-denied') {
          container.innerHTML = `
            <div class="friend-search-empty-box" style="border: 1.5px solid #F59E0B; background: var(--bg-card); text-align: left; padding: 14px 16px;">
              <div style="font-weight: 800; color: #D97706; margin-bottom: 6px; font-size: 13.5px;">⚠️ Cần Publish (Xuất bản) Rules trên Firebase Console!</div>
              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.55;">
                Tệp <code>firestore.rules</code> đã được cập nhật nhưng <strong>chưa được bấm Publish trên Firebase Console</strong> nên máy chủ Google đang chặn quyền đọc danh bạ người dùng.<br>
                👉 <strong>Cách kích hoạt:</strong> Mở <strong>Firebase Console &gt; Firestore Database &gt; Rules</strong>, dán nội dung file <code>firestore.rules</code> và bấm <strong>Publish</strong> là tìm kiếm được ngay!
              </div>
            </div>
          `;
          return;
        }
      }

      // 3. Tìm bổ sung trong cache tài khoản local nếu Firestore chưa có kết quả (hỗ trợ offline / cùng thiết bị)
      if (results.length === 0) {
        const localAccounts = this.getLocalAccounts();
        Object.values(localAccounts).forEach(acc => {
          if (!acc) return;
          const accTag = (acc.tag || acc.username || '').toLowerCase().replace('@', '');
          const accName = (acc.name || '').toLowerCase();
          const accUser = (acc.username || '').toLowerCase();
          if (accTag.includes(cleanQuery) || accName.includes(cleanQuery) || accUser.includes(cleanQuery)) {
            const tag = acc.tag || ('@' + (acc.username || 'user'));
            results.push({
              uid: acc.uid,
              name: acc.name || acc.username,
              tag: tag,
              avatar: acc.avatar || this.getDefaultAvatarUrl(acc.name || acc.username)
            });
          }
        });
      }

      // Render kết quả tìm kiếm ra thẻ
      this.renderFriendSearchResults(results, query);
    } catch (err) {
      console.warn('Lỗi tìm kiếm bạn bè:', err);
      container.innerHTML = `
        <div class="friend-search-empty-box">
          <i data-lucide="alert-circle" style="width: 24px; height: 24px; margin-bottom: 6px; color: #EF4444;"></i>
          <div>Lỗi khi tìm kiếm: ${this.escapeHtml(err.message || 'Không thể kết nối')}</div>
        </div>
      `;
      this.setupIcons();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtn;
      }
    }
  }

  // Alias tương thích ngược
  searchAndAddFriend() {
    this.searchFriendUser();
  }

  renderFriendSearchResults(results, query) {
    const container = document.getElementById('friendSearchResultsContainer');
    if (!container) return;

    if (!results || results.length === 0) {
      container.innerHTML = `
        <div class="friend-search-empty-box">
          <div style="font-weight: 700; color: var(--text-main); margin-bottom: 4px;">⚠️ Không tìm thấy người dùng nào</div>
          <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">Không có tài khoản nào trùng khớp với "<strong>${this.escapeHtml(query)}</strong>".<br>Hãy kiểm tra lại chính xác ID (ví dụ: @user1234) hoặc tên nhé!</div>
        </div>
      `;
      return;
    }

    const myTag = this.getMyFriendTag().toLowerCase();
    const myUid = this.data.user?.uid || (window.grabSync && window.grabSync.getCurrentUid());

    container.innerHTML = results.map(u => {
      const uTag = (u.tag || '').toLowerCase();
      const isMe = (u.uid && u.uid === myUid) || (uTag && uTag === myTag);
      const isAlreadyFriend = Array.isArray(this.data.friends?.list) && this.data.friends.list.some(f => 
        (f.uid && u.uid && f.uid === u.uid) || 
        (f.tag && u.tag && f.tag.toLowerCase() === u.tag.toLowerCase())
      );

      const defaultAv = this.getDefaultAvatarUrl(u.name);
      const avSrc = u.avatar || defaultAv;
      const safeUid = this.escapeHtml(u.uid || '');
      const safeName = this.escapeHtml(u.name || '');
      const safeTag = this.escapeHtml(u.tag || '');

      let actionBtn = '';
      if (isMe) {
        actionBtn = `<span class="badge-tag-friends" style="background: var(--bg-card-subtle); color: var(--text-muted); font-size: 11px; padding: 5px 12px; font-weight: 700;">Tài khoản của bạn</span>`;
      } else if (isAlreadyFriend) {
        actionBtn = `<span class="badge-tag-friends" style="background: #ECFDF5; color: #10B981; font-size: 11px; padding: 5px 12px; font-weight: 700;">✓ Đã là bạn bè</span>`;
      } else {
        // Nút Kết Bạn chủ động trên thẻ xem trước
        actionBtn = `
          <button class="btn-add-friend-action" onclick="app.confirmAddFriend('${safeUid}', '${safeName}', '${safeTag}', '${this.escapeHtml(avSrc)}')">
            <i data-lucide="user-plus" style="width: 14px; height: 14px;"></i>
            <span>Kết bạn</span>
          </button>
        `;
      }

      return `
        <div class="friend-search-result-card">
          <div class="friend-item-left">
            <img src="${this.escapeHtml(avSrc)}" alt="${safeName}" class="avatar-circle" style="width: 44px; height: 44px; object-fit: cover;" onerror="this.src='${defaultAv}'">
            <div>
              <div class="friend-item-name">${safeName}</div>
              <div class="friend-item-sub">
                <span class="friend-item-tag">${safeTag}</span>
              </div>
            </div>
          </div>
          <div>${actionBtn}</div>
        </div>
      `;
    }).join('');

    this.setupIcons();
  }

  confirmAddFriend(targetUid, targetName, targetTag, targetAvatar) {
    if (!targetName) return;

    if (!this.data.friends) this.data.friends = { list: [], requests: [] };
    if (!Array.isArray(this.data.friends.list)) this.data.friends.list = [];

    // Kiểm tra trùng lặp bạn bè
    const alreadyFriend = this.data.friends.list.some(f => 
      (f.uid && targetUid && f.uid === targetUid) ||
      (f.tag && targetTag && f.tag.toLowerCase() === targetTag.toLowerCase())
    );

    if (alreadyFriend) {
      this.showToast('ℹ️ Người này đã có trong danh sách bạn bè!');
      return;
    }

    const newFriend = {
      id: this.generateAppUUID('fr'),
      uid: targetUid || '',
      name: targetName,
      tag: targetTag,
      avatar: targetAvatar || this.getDefaultAvatarUrl(targetName),
      role: 'Bạn bè',
      status: 'accepted',
      addedAt: this.getLocalDateString()
    };

    this.data.friends.list.unshift(newFriend);
    this.data.friends.activeTab = 'list';
    this.saveData();
    this.renderFriends();

    // Đồng bộ friend lên Firestore
    if (window.grabSync && typeof window.grabSync.syncFriendToCloud === 'function') {
      window.grabSync.syncFriendToCloud(newFriend);
    }

    // Hiệu ứng ăn mừng: âm thanh + pháo hoa + rung
    this.playCoinSound();
    this.triggerConfetti();
    this.triggerHaptic('medium');

    this.showToast(`🎉 Đã kết bạn thành công với ${targetName} (${targetTag})!`);

    // Dọn dẹp ô tìm kiếm và ẩn thẻ kết quả
    this.clearFriendSearch();
  }

  acceptFriendRequest(reqId) {
    if (!this.data.friends || !this.data.friends.requests) return;
    const idx = this.data.friends.requests.findIndex(r => r.id === reqId);
    if (idx === -1) return;

    const req = this.data.friends.requests[idx];
    this.data.friends.requests.splice(idx, 1);

    if (!Array.isArray(this.data.friends.list)) this.data.friends.list = [];
    this.data.friends.list.unshift({
      id: this.generateAppUUID('fr'),
      name: req.fromName,
      tag: req.fromTag,
      avatar: req.avatar || this.getDefaultAvatarUrl(req.fromName),
      role: req.role || 'Bạn mới kết nối',
      status: 'accepted',
      addedAt: this.getLocalDateString()
    });

    this.saveData();
    this.renderFriends();

    this.playCoinSound();
    this.triggerConfetti();
    this.triggerHaptic('medium');
    this.showToast(`✨ Đã đồng ý kết bạn với ${req.fromName}!`);
  }

  declineFriendRequest(reqId) {
    if (!this.data.friends || !this.data.friends.requests) return;
    this.data.friends.requests = this.data.friends.requests.filter(r => r.id !== reqId);
    this.saveData();
    this.renderFriends();
    this.triggerHaptic('light');
    this.showToast('Đã bỏ qua lời mời kết bạn.');
  }

  removeFriend(friendId) {
    if (!this.data.friends || !this.data.friends.list) return;
    const friend = this.data.friends.list.find(f => f.id === friendId);
    const friendName = friend ? friend.name : 'người này';

    if (confirm(`Bạn có chắc muốn hủy kết bạn với ${friendName}?`)) {
      this.data.friends.list = this.data.friends.list.filter(f => f.id !== friendId);
      this.saveData();
      this.renderFriends();
      this.triggerHaptic('light');
      this.showToast(`Đã xóa ${friendName} khỏi danh bạ.`);
    }
  }

  inviteFriendToGroup(friendId) {
    if (!this.data.friends || !this.data.friends.list) return;
    const friend = this.data.friends.list.find(f => f.id === friendId);
    if (friend) {
      this.triggerHaptic('light');
      this.showToast(`📩 Đã gửi lời mời tham gia nhóm tới ${friend.name}!`);
    }
  }

  copyMyFriendTag() {
    const tag = this.getMyFriendTag();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tag).then(() => {
        this.triggerHaptic('light');
        this.showToast(`📋 Đã sao chép ID: ${tag}`);
      }).catch(() => {
        this.showToast(`ID của bạn: ${tag}`);
      });
    } else {
      this.showToast(`ID của bạn: ${tag}`);
    }
  }

  openFriendQrModal() {
    const tag = this.getMyFriendTag();
    const name = this.data?.user?.name || 'Người dùng';
    const qrImg = document.getElementById('friendQrImg');
    const qrName = document.getElementById('friendQrName');
    const qrTag = document.getElementById('friendQrTag');

    if (qrImg) {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=fintrack:friend:${encodeURIComponent(tag)}`;
    }
    if (qrName) qrName.textContent = name;
    if (qrTag) qrTag.textContent = tag;

    const modal = document.getElementById('friendQrModal');
    if (modal) modal.classList.add('active');
    this.triggerHaptic('light');
  }

  closeFriendQrModal() {
    const modal = document.getElementById('friendQrModal');
    if (modal) modal.classList.remove('active');
  }

  // ===================================================
  // 16. AUTHENTICATION & LOGIN MANAGEMENT
  // ===================================================
  switchAuthTab(tab) {
    const tabLogin = document.getElementById('tabBtnLogin');
    const tabRegister = document.getElementById('tabBtnRegister');
    const formLogin = document.getElementById('authLoginForm');
    const formRegister = document.getElementById('authRegisterForm');

    if (tab === 'register') {
      if (tabLogin) tabLogin.classList.remove('active');
      if (tabRegister) tabRegister.classList.add('active');
      if (formLogin) formLogin.style.display = 'none';
      if (formRegister) formRegister.style.display = 'flex';
    } else {
      if (tabRegister) tabRegister.classList.remove('active');
      if (tabLogin) tabLogin.classList.add('active');
      if (formRegister) formRegister.style.display = 'none';
      if (formLogin) formLogin.style.display = 'flex';
    }

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    if (btn) {
      btn.innerHTML = `<i data-lucide="${isPass ? 'eye-off' : 'eye'}" style="width: 16px; height: 16px;"></i>`;
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
  }

  normalizeUserToEmail(input) {
    const trimmed = (input || '').trim().toLowerCase();
    if (!trimmed) return '';
    if (trimmed.includes('@')) return trimmed;
    const sanitized = trimmed.replace(/[^a-z0-9._-]/g, '');
    return sanitized ? `${sanitized}@fintrack.app` : 'user@fintrack.app';
  }

  getLocalAccounts() {
    try {
      const accounts = JSON.parse(localStorage.getItem('finance_local_accounts') || '{}');
      let cleaned = false;
      Object.keys(accounts).forEach(k => {
        if (accounts[k] && accounts[k].password) {
          delete accounts[k].password;
          cleaned = true;
        }
      });
      if (cleaned) {
        localStorage.setItem('finance_local_accounts', JSON.stringify(accounts));
      }
      return accounts;
    } catch (e) {
      return {};
    }
  }

  saveLocalAccount(username, accountData) {
    const accounts = this.getLocalAccounts();
    const sanitized = { ...accountData };
    delete sanitized.password; // Không lưu trữ mật khẩu dạng plaintext trong localStorage
    accounts[username.toLowerCase()] = sanitized;
    if (sanitized.email) {
      accounts[sanitized.email.toLowerCase()] = sanitized;
    }
    localStorage.setItem('finance_local_accounts', JSON.stringify(accounts));
  }

  removeLocalAccount(username, email) {
    try {
      const accounts = this.getLocalAccounts();
      let changed = false;
      if (username && accounts[username.toLowerCase()]) {
        delete accounts[username.toLowerCase()];
        changed = true;
      }
      if (email && accounts[email.toLowerCase()]) {
        delete accounts[email.toLowerCase()];
        changed = true;
      }
      if (changed) {
        localStorage.setItem('finance_local_accounts', JSON.stringify(accounts));
      }
    } catch (e) {}
  }

  async handleRegisterWithCredentials() {
    const nameEl = document.getElementById('regFullName');
    const userEl = document.getElementById('regUsername');
    const passEl = document.getElementById('regPassword');
    const btn = document.getElementById('btnSubmitRegister');

    const fullName = (nameEl ? nameEl.value : '').trim();
    const rawUser = (userEl ? userEl.value : '').trim();
    const password = passEl ? passEl.value : '';

    if (!fullName) {
      this.showToast('Vui lòng nhập họ và tên của bạn.');
      if (nameEl) nameEl.focus();
      return;
    }
    if (!rawUser || rawUser.length < 3) {
      this.showToast('Tên tài khoản cần có ít nhất 3 ký tự.');
      if (userEl) userEl.focus();
      return;
    }
    if (!password || password.length < 6) {
      this.showToast('Mật khẩu cần tối thiểu 6 ký tự.');
      if (passEl) passEl.focus();
      return;
    }

    const email = this.normalizeUserToEmail(rawUser);
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display: inline-block; width: 16px; height: 16px; border: 2px solid #FFFFFF; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span> <span>Đang khởi tạo tài khoản...</span>`;
    }

    try {
      // 1. Thử đăng ký qua Firebase Auth
      let firebaseSuccess = false;
      if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
          const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
          const user = userCredential.user;
          if (user) {
            await user.updateProfile({ displayName: fullName });
            firebaseSuccess = true;
            this.handleLoginSuccess({
              name: fullName,
              email: user.email || email,
              avatar: this.getDefaultAvatarUrl(fullName),
              uid: user.uid
            });
            this.showToast(`🎉 Chào mừng ${fullName} đến với FinTrack Pro!`);
            return;
          }
        } catch (fbErr) {
          console.warn('Firebase Auth email registration warning:', fbErr.code, fbErr.message);
          if (fbErr.code === 'auth/email-already-in-use') {
            this.showToast('Tài khoản này đã tồn tại! Đang chuyển sang tab Đăng nhập...');
            const loginUserEl = document.getElementById('loginUsername');
            if (loginUserEl) loginUserEl.value = rawUser;
            this.switchAuthTab('login');
            return;
          }
          // Nếu Firebase Console chưa bật Email/Password (auth/operation-not-allowed)
          // hoặc gặp lỗi kết nối, kích hoạt cơ chế Local Fallback ngay lập tức
        }
      }

      // 2. Local Fallback Account (Đảm bảo điện thoại chạy trơn tru 100% không bao giờ kẹt)
      const uid = 'user_' + rawUser.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const accountData = {
        name: fullName,
        username: rawUser,
        email: email,
        uid: uid,
        avatar: this.getDefaultAvatarUrl(fullName),
        createdAt: Date.now()
      };
      this.saveLocalAccount(rawUser, accountData);

      this.handleLoginSuccess({
        name: fullName,
        email: email,
        avatar: accountData.avatar,
        uid: uid
      });
      this.showToast(`🎉 Tài khoản "${rawUser}" đã sẵn sàng trên thiết bị!`);
    } catch (err) {
      console.error('Lỗi tạo tài khoản:', err);
      this.showToast('Không thể tạo tài khoản: ' + (err.message || 'Lỗi chưa xác định'));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalContent;
      }
    }
  }

  async handleLoginWithCredentials() {
    const userEl = document.getElementById('loginUsername');
    const passEl = document.getElementById('loginPassword');
    const btn = document.getElementById('btnSubmitLogin');

    const rawUser = (userEl ? userEl.value : '').trim();
    const password = passEl ? passEl.value : '';

    if (!rawUser) {
      this.showToast('Vui lòng nhập Tên tài khoản hoặc Email.');
      if (userEl) userEl.focus();
      return;
    }
    if (!password) {
      this.showToast('Vui lòng nhập mật khẩu.');
      if (passEl) passEl.focus();
      return;
    }

    const email = this.normalizeUserToEmail(rawUser);
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display: inline-block; width: 16px; height: 16px; border: 2px solid #FFFFFF; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span> <span>Đang xác thực...</span>`;
    }

    try {
      // 1. Thử đăng nhập qua Firebase Auth Cloud trước (đảm bảo phiên Token và Firestore Realtime)
      if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
          const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
          const user = userCredential.user;
          if (user) {
            // Cập nhật lại cache local với UID chuẩn của Firebase (không lưu password)
            this.saveLocalAccount(rawUser, {
              name: user.displayName || rawUser,
              username: rawUser,
              email: user.email || email,
              uid: user.uid,
              avatar: user.photoURL || this.getDefaultAvatarUrl(user.displayName || rawUser)
            });

            this.handleLoginSuccess({
              name: user.displayName || rawUser,
              email: user.email || email,
              avatar: user.photoURL || this.getDefaultAvatarUrl(user.displayName || rawUser),
              uid: user.uid
            });
            this.showToast(`🎉 Đăng nhập thành công!`);
            return;
          }
        } catch (fbErr) {
          console.warn('Firebase Auth email login check:', fbErr.code, fbErr.message);
          if (fbErr.code === 'auth/wrong-password') {
            this.showToast('⚠️ Mật khẩu không chính xác!');
            return;
          }
          if (
            fbErr.code === 'auth/user-not-found' || 
            fbErr.code === 'auth/invalid-login-credentials' || 
            fbErr.code === 'auth/invalid-credential'
          ) {
            this.removeLocalAccount(rawUser, email);
            this.showToast('⚠️ Tài khoản này không tồn tại hoặc đã bị xóa khỏi hệ thống!');
            return;
          }
          if (fbErr.code === 'auth/user-disabled') {
            this.showToast('⚠️ Tài khoản này đã bị vô hiệu hóa hoặc tạm khóa!');
            return;
          }
          if (fbErr.code === 'auth/too-many-requests') {
            this.showToast('⚠️ Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau ít phút!');
            return;
          }
          // Chỉ dự phòng ngoại tuyến khi thực sự mất mạng (offline)
          if (fbErr.code !== 'auth/network-request-failed' && navigator.onLine) {
            this.removeLocalAccount(rawUser, email);
            this.showToast('⚠️ Không tìm thấy tài khoản hoặc thông tin đăng nhập không hợp lệ!');
            return;
          }
        }
      }

      // 2. Dự phòng ngoại tuyến (Chỉ kích hoạt khi mất mạng thực sự)
      const localAccounts = this.getLocalAccounts();
      const localAcc = localAccounts[rawUser.toLowerCase()] || localAccounts[email.toLowerCase()];
      if (localAcc) {
        this.handleLoginSuccess({
          name: localAcc.name || rawUser,
          email: localAcc.email || email,
          avatar: localAcc.avatar || this.getDefaultAvatarUrl(localAcc.name || rawUser),
          uid: localAcc.uid
        });
        this.showToast(`🎉 Xin chào trở lại (Chế độ Ngoại tuyến), ${localAcc.name || rawUser}!`);
        return;
      }

      // 3. Nếu cả Cloud và Offline đều chưa có tài khoản này
      this.showToast('Chưa tìm thấy tài khoản này! Hãy bấm "Tạo tài khoản" để đăng ký mới nhé.');
      this.switchAuthTab('register');
      const regUserEl = document.getElementById('regUsername');
      if (regUserEl) regUserEl.value = rawUser;
    } catch (err) {
      console.error('Lỗi đăng nhập:', err);
      this.showToast('Lỗi đăng nhập: ' + (err.message || 'Không thể đăng nhập'));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalContent;
      }
    }
  }

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
      avatar: this.getDefaultAvatarUrl('Khách'),
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
    this.data.user.avatar = (userInfo.avatar && !userInfo.avatar.includes('unsplash.com')) ? userInfo.avatar : this.getDefaultAvatarUrl(userInfo.name);
    this.data.user.nickname = `${userInfo.name} 👋`;
    this.data.user.uid = uid;

    if (this.data.ranking?.leaderboard?.[0]) {
      this.data.ranking.leaderboard[0].name = userInfo.name;
      this.data.ranking.leaderboard[0].avatar = this.data.user.avatar;
    }
    if (this.data.groups?.detail?.membersContribution?.[0]) {
      this.data.groups.detail.membersContribution[0].name = userInfo.name;
      this.data.groups.detail.membersContribution[0].avatar = this.data.user.avatar;
    }
    if (this.data.groups?.featured?.members) {
      this.data.groups.featured.members = [this.data.user.avatar];
    }

    const userTag = '@' + (userInfo.email ? userInfo.email.split('@')[0] : (userInfo.name || 'user').toLowerCase().replace(/\s+/g, ''));
    if (!this.data.friends) {
      this.data.friends = {
        tag: userTag,
        activeTab: 'list',
        list: [],
        requests: []
      };
    } else {
      this.data.friends.tag = userTag;
      if (Array.isArray(this.data.friends.list)) {
        this.data.friends.list = this.data.friends.list.filter(f => 
          !['fr-1', 'fr-2'].includes(f.id) && f.tag !== '@thinh_grab' && f.tag !== '@maianh_99'
        );
      }
      if (Array.isArray(this.data.friends.requests)) {
        this.data.friends.requests = this.data.friends.requests.filter(r => 
          r.id !== 'req-1' && r.fromTag !== '@nam_tech'
        );
      }
    }

    localStorage.setItem('finance_user_logged_in', 'true');
    localStorage.setItem('finance_user_profile', JSON.stringify(userInfo));

    this.recalculateBalances();
    this.saveData();

    // Chuyển kênh Cloud Sync sang riêng biệt theo UID của người này
    if (window.grabSync && typeof window.grabSync.switchUser === 'function') {
      window.grabSync.switchUser(uid, userInfo.name);
    }

    // Tự động publish hồ sơ công khai lên public_users phục vụ tìm kiếm bạn bè thật
    if (window.grabSync && typeof window.grabSync.syncPublicProfile === 'function') {
      window.grabSync.syncPublicProfile({
        name: userInfo.name,
        tag: this.getMyFriendTag(),
        avatar: this.data.user.avatar || this.getDefaultAvatarUrl(userInfo.name)
      });
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
    this.renderFriends();
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
