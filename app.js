/**
 * QUẢN LÝ CHẠY GRAB - THỊNH & BU (FULL CHỨC NĂNG)
 * 1 Xe Air Blade 125 (59E2-059.57) dùng chung cho 2 tài xế Thịnh & Bu
 * Đầy đủ CRUD: Chuyến đi, Lịch chạy & kiểm tra xung đột xe, Ghi chú, Ảnh chốt sổ, Chốt ngày, Lịch sử đối soát.
 */

class GrabApp {
  getTodayInfo() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = dayNames[dayOfWeek];
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return {
      date: now,
      day: now.getDate(),
      month: now.getMonth() + 1,
      year: yyyy,
      dayName,
      dateStr: `${dd}/${mm}/${yyyy}`,
      displayStr: `${dayName}, ${dd}/${mm}/${yyyy}`,
      isoDate: `${yyyy}-${mm}-${dd}`
    };
  }

  constructor() {
    this.storageKey = 'grab_management_state_v2';
    this.currentScreen = 'screen-overview';
    
    // Tự động nhận diện chính xác ngày hôm nay theo thời gian thực
    const today = this.getTodayInfo();
    this.currentCalYear = today.year;
    this.currentCalMonth = today.month;
    this.selectedDay = today.day;
    this.activeSlot = null;
    this.activeLightboxImgId = null;
    
    this.initData();
    this.bindEvents();
    this.recalculateBalances();
    this.renderAll();

    if (window.grabSync) {
      window.grabSync.initCloudSync();
    }
  }

  // Khởi tạo hoặc lấy dữ liệu từ localStorage
  initData() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.data = JSON.parse(saved);
        if (!this.data.closedHistory) this.data.closedHistory = [];
      } catch (e) {
        console.error('Lỗi nạp dữ liệu, dùng INITIAL_DATA:', e);
        this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
      }
    } else {
      this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    }
    if (this.data && this.data.vehicle) {
      this.data.vehicle.plate = '59E2-059.57';
    }
    if (this.data && !this.data.vehicleMaintenance) {
      this.data.vehicleMaintenance = JSON.parse(JSON.stringify((typeof INITIAL_DATA !== 'undefined' && INITIAL_DATA.vehicleMaintenance) || {
        currentOdo: 12850,
        oilChangeInterval: 1500,
        lastOilChangeOdo: 11500,
        gearOilInterval: 5000,
        lastGearOilOdo: 10000,
        airFilterInterval: 10000,
        lastAirFilterOdo: 5000,
        logs: []
      }));
    }
    if (this.data && !this.data.settlement) {
      this.data.settlement = { lastSettledDate: null, history: [] };
    }
  }

  saveState() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    if (window.grabSync) {
      window.grabSync.pushToCloud(this.data);
    }
  }

  // ===================================================
  // RESET SẠCH & NẠP DEMO REFERENCE
  // ===================================================
  confirmResetClean() {
    if (typeof CLEAN_DATA === 'undefined') {
      alert('Không tìm thấy dữ liệu mẫu CLEAN_DATA');
      return;
    }
    this.data = JSON.parse(JSON.stringify(CLEAN_DATA));
    const today = this.getTodayInfo();
    this.selectedDay = today.day;
    this.currentCalMonth = today.month;
    this.currentCalYear = today.year;
    this.data.currentDate = today.isoDate;
    this.data.displayDate = today.displayStr;
    
    // Xóa các input nếu có
    const walletInput = document.getElementById('closeInputWallet');
    const fuelInput = document.getElementById('closeInputFuel');
    const otherInput = document.getElementById('closeInputOther');
    if (walletInput) walletInput.value = '';
    if (fuelInput) fuelInput.value = '';
    if (otherInput) otherInput.value = '';

    const finTotalRev = document.getElementById('finTotalRev');
    const finCash = document.getElementById('finCash');
    const finTransfer = document.getElementById('finTransfer');
    const finWallet = document.getElementById('finWallet');
    const finFuel = document.getElementById('finFuel');
    const finOther = document.getElementById('finOther');
    if (finTotalRev) finTotalRev.value = '0đ';
    if (finCash) finCash.value = '0đ';
    if (finTransfer) finTransfer.value = '0đ';
    if (finWallet) finWallet.value = '0đ';
    if (finFuel) finFuel.value = '0đ';
    if (finOther) finOther.value = '0đ';

    this.saveState();
    this.recalculateBalances();
    this.renderAll();
    this.showToast('✓ Đã RESET TOÀN BỘ dữ liệu về trạng thái sạch (0 chuyến, 0đ)!');
  }

  loadDemoReferenceData() {
    if (typeof DEMO_DATA === 'undefined') {
      alert('Không tìm thấy dữ liệu mẫu DEMO_DATA');
      return;
    }
    this.data = JSON.parse(JSON.stringify(DEMO_DATA));
    this.selectedDay = 12;
    this.currentCalMonth = 9;
    this.currentCalYear = 2026;
    this.saveState();
    this.recalculateBalances();
    this.renderAll();
    this.showToast('✓ Đã nạp dữ liệu mẫu reference UI!');
  }

  formatMoney(num) {
    if (typeof num !== 'number') num = parseInt(num) || 0;
    return num.toLocaleString('vi-VN') + 'đ';
  }

  showToast(message) {
    const toast = document.getElementById('toastNotice');
    const toastText = document.getElementById('toastText');
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // ===================================================
  // TÍNH TOÁN TÀI CHÍNH TỰ CHỦ & ĐỐI SOÁT BÙ TRỪ
  // ===================================================
  recalculateBalances() {
    if (!this.data.incomeOverview) {
      this.data.incomeOverview = { total: 0, totalTrips: 0, cash: 0, transfer: 0, thinh: {}, bu: {} };
    }
    if (!this.data.dailyClosing) {
      this.data.dailyClosing = { thinh: {}, bu: {}, isClosed: false };
    }
    if (!this.data.dailyClosing.thinh) this.data.dailyClosing.thinh = {};
    if (!this.data.dailyClosing.bu) this.data.dailyClosing.bu = {};
    if (!this.data.reports) this.data.reports = { overview: {}, thinh: {}, bu: {}, chartDays: [] };
    if (!this.data.todaySummary) this.data.todaySummary = {};

    let thinhRev = 0, thinhCash = 0, thinhTransfer = 0, thinhTrips = 0;
    let buRev = 0, buCash = 0, buTransfer = 0, buTrips = 0;

    (this.data.trips || []).forEach(t => {
      const amt = parseInt(t.amount) || 0;
      if (t.driverId === 'thinh') {
        thinhRev += amt;
        thinhTrips++;
        if (t.type === 'cash') thinhCash += amt;
        else thinhTransfer += amt;
      } else {
        buRev += amt;
        buTrips++;
        if (t.type === 'cash') buCash += amt;
        else buTransfer += amt;
      }
    });

    // Cập nhật incomeOverview
    this.data.incomeOverview.total = thinhRev + buRev;
    this.data.incomeOverview.totalTrips = thinhTrips + buTrips;
    this.data.incomeOverview.cash = thinhCash + buCash;
    this.data.incomeOverview.transfer = thinhTransfer + buTransfer;

    this.data.incomeOverview.thinh = {
      total: thinhRev,
      trips: thinhTrips,
      cash: thinhCash,
      transfer: thinhTransfer
    };

    this.data.incomeOverview.bu = {
      total: buRev,
      trips: buTrips,
      cash: buCash,
      transfer: buTransfer
    };

    // Chi phí và tip
    const thinhTip = this.data.dailyClosing.thinh.tip || 0;
    const thinhFuel = this.data.dailyClosing.thinh.fuelExpense || 0;
    const thinhOther = this.data.dailyClosing.thinh.otherExpense || 0;
    const thinhNet = thinhRev + thinhTip - thinhFuel - thinhOther;

    const buTip = this.data.dailyClosing.bu.tip || 0;
    const buFuel = this.data.dailyClosing.bu.fuelExpense || 0;
    const buOther = this.data.dailyClosing.bu.otherExpense || 0;
    const buNet = buRev + buTip - buFuel - buOther;

    this.data.dailyClosing.thinh.trips = thinhTrips;
    this.data.dailyClosing.thinh.revenue = thinhRev;
    this.data.dailyClosing.thinh.cash = thinhCash;
    this.data.dailyClosing.thinh.transfer = thinhTransfer;
    this.data.dailyClosing.thinh.netIncome = thinhNet;

    this.data.dailyClosing.bu.trips = buTrips;
    this.data.dailyClosing.bu.revenue = buRev;
    this.data.dailyClosing.bu.cash = buCash;
    this.data.dailyClosing.bu.transfer = buTransfer;
    this.data.dailyClosing.bu.netIncome = buNet;

    // Cập nhật báo cáo & hôm nay
    this.data.reports.overview.revenue = thinhRev + buRev;
    this.data.reports.overview.trips = thinhTrips + buTrips;
    this.data.reports.overview.cash = thinhCash + buCash;
    this.data.reports.overview.transfer = thinhTransfer + buTransfer;

    this.data.todaySummary.trips = thinhTrips + buTrips;
    this.data.todaySummary.totalRevenue = thinhRev + buRev;
    this.data.todaySummary.cash = thinhCash + buCash;
    this.data.todaySummary.transfer = thinhTransfer + buTransfer;
    this.data.todaySummary.fuelExpense = thinhFuel + buFuel;
    this.data.todaySummary.otherExpense = thinhOther + buOther;
    this.data.todaySummary.netIncome = thinhNet + buNet;
  }

  bindEvents() {
    const headerLeftBtn = document.getElementById('headerLeftBtn');
    if (headerLeftBtn) {
      headerLeftBtn.addEventListener('click', () => {
        if (this.currentScreen === 'screen-overview' || this.currentScreen === 'screen-today') {
          this.openSideMenu();
        } else {
          this.navigateToScreen('screen-overview');
        }
      });
    }

    const headerRightBtn = document.getElementById('headerRightBtn');
    if (headerRightBtn) {
      headerRightBtn.addEventListener('click', () => {
        this.showToast('Thông báo: Lịch giao ca chung 1 xe giữa Thịnh & Bu');
      });
    }

    document.querySelectorAll('.screen-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        if (target) this.navigateToScreen(target);
      });
    });

    const savedUser = localStorage.getItem('grab_current_user') || 'thinh';
    const selector = document.getElementById('deviceUserSelector');
    if (selector) selector.value = savedUser;
  }

  // Đổi tài khoản thiết bị này là của Thịnh hay của Bu
  switchDeviceUser(driverId) {
    if (window.grabSync) window.grabSync.setDeviceUser(driverId);
    const driverName = driverId === 'thinh' ? 'Thịnh' : 'Bu';
    this.showToast(`📱 Thiết bị này được đặt là máy của: ${driverName}`);
    
    const tripDriverSelect = document.getElementById('tripDriverSelect');
    if (tripDriverSelect) tripDriverSelect.value = driverId;
  }

  openSideMenu() {
    const drawer = document.getElementById('sideDrawerMenu');
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) drawer.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
    this.updateDrawerDriverState();
  }

  closeSideMenu() {
    const drawer = document.getElementById('sideDrawerMenu');
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
  }

  navigateToScreenFromDrawer(screenId) {
    this.closeSideMenu();
    this.navigateToScreen(screenId);
  }

  updateDrawerDriverState() {
    const curDriver = (this.data && this.data.vehicle && this.data.vehicle.currentDriverId) || 'thinh';
    const btnT = document.getElementById('drawerBtnThinh');
    const btnB = document.getElementById('drawerBtnBu');
    if (btnT && btnB) {
      if (curDriver === 'thinh') {
        btnT.classList.add('active');
        btnB.classList.remove('active');
      } else {
        btnB.classList.add('active');
        btnT.classList.remove('active');
      }
    }
    document.querySelectorAll('.drawer-item-card, .drawer-nav-item').forEach(item => {
      if (item.getAttribute('data-screen') === this.currentScreen) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  navigateToScreen(screenId) {
    document.querySelectorAll('.screen-view').forEach(view => view.classList.remove('active'));
    const targetView = document.getElementById(screenId);
    if (targetView) {
      targetView.classList.add('active');
      this.currentScreen = screenId;
    }

    const content = document.getElementById('appContent');
    if (content) content.scrollTop = 0;

    this.updateHeaderForScreen(screenId);

    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      if (item.getAttribute('data-target') === screenId) item.classList.add('active');
      else item.classList.remove('active');
    });

    document.querySelectorAll('.screen-btn').forEach(btn => {
      if (btn.getAttribute('data-target') === screenId) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  updateHeaderForScreen(screenId) {
    const titleEl = document.getElementById('headerTitle');
    const subtitleEl = document.getElementById('headerSubtitle');
    const leftIcon = document.getElementById('headerLeftIcon');
    const rightIcon = document.getElementById('headerRightIcon');
    const notifBadge = document.getElementById('notifBadge');

    const hamburgerSvg = `<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>`;
    const backArrowSvg = `<polyline points="15 18 9 12 15 6"/>`;
    const bellSvg = `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`;
    const calendarSvg = `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`;

    if (notifBadge) notifBadge.style.display = 'none';

    switch (screenId) {
      case 'screen-overview':
        titleEl.textContent = 'Quản lý chạy Grab';
        subtitleEl.textContent = 'Cùng nhau kiếm thêm thu nhập';
        subtitleEl.style.display = 'block';
        leftIcon.innerHTML = hamburgerSvg;
        rightIcon.innerHTML = bellSvg;
        if (notifBadge) notifBadge.style.display = 'block';
        break;

      case 'screen-schedule':
        titleEl.textContent = 'Lịch chạy';
        subtitleEl.style.display = 'none';
        leftIcon.innerHTML = backArrowSvg;
        rightIcon.innerHTML = calendarSvg;
        break;

      case 'screen-income':
        titleEl.textContent = 'Thu nhập';
        subtitleEl.style.display = 'none';
        leftIcon.innerHTML = backArrowSvg;
        rightIcon.innerHTML = calendarSvg;
        break;

      case 'screen-notes':
        titleEl.textContent = 'Chốt / Note cuối ngày';
        subtitleEl.style.display = 'none';
        leftIcon.innerHTML = backArrowSvg;
        rightIcon.innerHTML = calendarSvg;
        break;

      case 'screen-images':
        titleEl.textContent = 'Hình ảnh';
        subtitleEl.style.display = 'none';
        leftIcon.innerHTML = backArrowSvg;
        rightIcon.innerHTML = calendarSvg;
        break;

      case 'screen-reports':
        titleEl.textContent = 'Báo cáo';
        subtitleEl.style.display = 'none';
        leftIcon.innerHTML = backArrowSvg;
        rightIcon.innerHTML = calendarSvg;
        break;

      case 'screen-closing':
        titleEl.textContent = 'Chốt ngày';
        subtitleEl.style.display = 'none';
        leftIcon.innerHTML = backArrowSvg;
        rightIcon.innerHTML = calendarSvg;
        break;

      case 'screen-today':
        titleEl.textContent = 'Hôm nay';
        subtitleEl.textContent = this.getTodayInfo().displayStr;
        subtitleEl.style.display = 'block';
        leftIcon.innerHTML = hamburgerSvg;
        rightIcon.innerHTML = bellSvg;
        break;
    }
  }

  // Đổi người giữ xe và phát sóng qua Realtime Sync
  switchActiveDriver(driverId) {
    this.data.vehicle.currentDriverId = driverId;
    const driverName = driverId === 'thinh' ? 'Thịnh' : 'Bu';
    this.showToast(`Đã chuyển quyền sử dụng xe sang: ${driverName}`);
    this.saveState();
    this.renderOverview();
    if (window.grabSync) window.grabSync.broadcast('SWITCH_DRIVER', { driverId });
  }

  renderAll() {
    this.recalculateBalances();

    // Cập nhật tất cả label ngày hôm nay theo thời gian thực
    const today = this.getTodayInfo();
    ['scheduleDateText', 'notesDateText', 'galleryDateText'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = today.displayStr;
    });

    this.renderOverview();
    this.renderMaintenanceWidget();
    this.renderCalendarBook();
    this.renderSchedule();
    this.renderIncome();
    this.renderNotes();
    this.renderGallery();
    this.renderReports();
    this.renderClosing();
    this.renderSpliitSettlement();
    this.renderClosedHistory();
    this.renderToday();
  }

  // ===================================================
  // 1. RENDER TỔNG QUAN (PHẦN 3)
  // ===================================================
  renderOverview() {
    const curDriver = this.data.vehicle.currentDriverId || 'thinh';
    const cardThinh = document.getElementById('cardThinhStatus');
    const cardBu = document.getElementById('cardBuStatus');
    const overviewStatus = document.getElementById('overviewVehicleStatus');

    if (cardThinh && cardBu) {
      if (curDriver === 'thinh') {
        cardThinh.className = 'driver-pill-card active-driver';
        cardThinh.querySelector('.badge-status').className = 'badge-status running dot';
        cardThinh.querySelector('.badge-status').textContent = 'Đang chạy';

        cardBu.className = 'driver-pill-card';
        cardBu.querySelector('.badge-status').className = 'badge-status available dot';
        cardBu.querySelector('.badge-status').textContent = 'Sẵn sàng';
      } else {
        cardBu.className = 'driver-pill-card active-driver';
        cardBu.querySelector('.badge-status').className = 'badge-status running dot';
        cardBu.querySelector('.badge-status').textContent = 'Đang chạy';

        cardThinh.className = 'driver-pill-card';
        cardThinh.querySelector('.badge-status').className = 'badge-status available dot';
        cardThinh.querySelector('.badge-status').textContent = 'Sẵn sàng';
      }
    }

    if (overviewStatus) {
      const hasTrips = (this.data.trips || []).length > 0;
      overviewStatus.className = hasTrips ? 'badge-status running dot' : 'badge-status available dot';
      overviewStatus.textContent = hasTrips ? 'Đang hoạt động' : 'Sẵn sàng';
    }

    const plateEl = document.querySelector('.vehicle-plate');
    if (plateEl && this.data.vehicle) {
      plateEl.textContent = this.data.vehicle.plate || '59E2-059.57';
    }

    // Doanh thu & số chuyến — lọc theo driver đang giữ máy
    const totalAmountEl = document.getElementById('overviewTotalAmount');
    const totalTripsEl = document.getElementById('overviewTotalTrips');
    const cashEl = document.getElementById('overviewCash');
    const transferEl = document.getElementById('overviewTransfer');
    const cardTitleEl = document.getElementById('overviewCardTitle');

    const dc = this.data.dailyClosing || {};
    const d = (curDriver === 'thinh' ? dc.thinh : dc.bu) || {};
    const driverName = curDriver === 'thinh' ? 'Thịnh' : 'Bu';
    const hasDriverData = d.trips != null;

    // Nếu có per-driver data, dùng; fallback về incomeOverview (tổng 2 người)
    const dispTotal    = hasDriverData ? (d.revenue  || 0) : this.data.incomeOverview.total;
    const dispTrips    = hasDriverData ? (d.trips    || 0) : this.data.incomeOverview.totalTrips;
    const dispCash     = hasDriverData ? (d.cash     || 0) : this.data.incomeOverview.cash;
    const dispTransfer = hasDriverData ? (d.transfer || 0) : this.data.incomeOverview.transfer;

    if (cardTitleEl) cardTitleEl.textContent = `Thu nhập ${driverName} hôm nay`;
    if (totalAmountEl) totalAmountEl.textContent = this.formatMoney(dispTotal);
    if (totalTripsEl) totalTripsEl.textContent = dispTrips;
    if (cashEl) cashEl.textContent = this.formatMoney(dispCash);
    if (transferEl) transferEl.textContent = this.formatMoney(dispTransfer);

    // So sánh với hôm qua (chỉ hiện khi có chênh lệch thực tế)
    const trendEl = document.getElementById('overviewTrendIndicator');
    if (trendEl) {
      const diff = (this.data.incomeOverview && this.data.incomeOverview.diffYesterday) || 0;
      if (!this.data.incomeOverview || this.data.incomeOverview.total === 0 || diff === 0) {
        trendEl.style.display = 'none';
      } else if (diff > 0) {
        trendEl.style.display = 'inline-flex';
        trendEl.innerHTML = `<span>↑ +${this.formatMoney(diff)} so với hôm qua</span>`;
        trendEl.className = 'trend-indicator';
      } else {
        trendEl.style.display = 'inline-flex';
        trendEl.innerHTML = `<span>↓ -${this.formatMoney(Math.abs(diff))} so với hôm qua</span>`;
        trendEl.className = 'trend-indicator down';
      }
    }

    // Card Thịnh
    const thinhAmtEl = document.getElementById('thinhStatAmount');
    const thinhTripsEl = document.getElementById('thinhStatTrips');
    const thinhCashEl = document.getElementById('thinhStatCash');
    const thinhTransEl = document.getElementById('thinhStatTransfer');

    if (thinhAmtEl) thinhAmtEl.textContent = this.formatMoney(this.data.incomeOverview.thinh.total);
    if (thinhTripsEl) thinhTripsEl.textContent = `${this.data.incomeOverview.thinh.trips} chuyến`;
    if (thinhCashEl) thinhCashEl.textContent = this.formatMoney(this.data.incomeOverview.thinh.cash);
    if (thinhTransEl) thinhTransEl.textContent = this.formatMoney(this.data.incomeOverview.thinh.transfer);

    // Card Bu
    const buAmtEl = document.getElementById('buStatAmount');
    const buTripsEl = document.getElementById('buStatTrips');
    const buCashEl = document.getElementById('buStatCash');
    const buTransEl = document.getElementById('buStatTransfer');

    if (buAmtEl) buAmtEl.textContent = this.formatMoney(this.data.incomeOverview.bu.total);
    if (buTripsEl) buTripsEl.textContent = `${this.data.incomeOverview.bu.trips} chuyến`;
    if (buCashEl) buCashEl.textContent = this.formatMoney(this.data.incomeOverview.bu.cash);
    if (buTransEl) buTransEl.textContent = this.formatMoney(this.data.incomeOverview.bu.transfer);
  }

  // ===================================================
  // 2. RENDER CUỐN LỊCH & LỊCH CHẠY (PHẦN 4)
  // ===================================================
  renderCalendarBook() {
    const grid = document.getElementById('calendarDaysGrid');
    const monthTitle = document.getElementById('calendarMonthTitle');
    if (!grid || !monthTitle) return;

    monthTitle.innerHTML = `
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0C7247" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      Tháng ${this.currentCalMonth}, ${this.currentCalYear}
    `;

    const firstDayIndex = (new Date(this.currentCalYear, this.currentCalMonth - 1, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(this.currentCalYear, this.currentCalMonth, 0).getDate();

    let html = '';
    for (let i = 0; i < firstDayIndex; i++) {
      html += `<div class="cal-day-cell empty"></div>`;
    }

    const hasThinhShifts = (this.data.schedules || []).some(s => s.thinhStatus === 'completed');
    const hasBuShifts = (this.data.schedules || []).some(s => s.buStatus === 'completed');

    const today = this.getTodayInfo();

    for (let d = 1; d <= daysInMonth; d++) {
      const isSelected = (d === this.selectedDay);
      const isToday = (d === today.day && this.currentCalMonth === today.month && this.currentCalYear === today.year);

      let dotsHtml = '';
      if (isToday) {
        if (hasThinhShifts) dotsHtml += `<span class="cal-dot thinh" title="Thịnh chạy"></span>`;
        if (hasBuShifts) dotsHtml += `<span class="cal-dot bu" title="Bu chạy"></span>`;
      }

      html += `
        <div class="cal-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" onclick="app.selectCalendarDate(${d})" title="${isToday ? 'Hôm nay' : `Ngày ${d}`}">
          <span>${d}</span>
          <div class="cal-day-dots">${dotsHtml}</div>
        </div>
      `;
    }

    grid.innerHTML = html;
    this.updateScheduleDateLabel();
  }

  updateScheduleDateLabel() {
    const dateObj = new Date(this.currentCalYear, this.currentCalMonth - 1, this.selectedDay);
    const dayOfWeek = dateObj.getDay();
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = dayNames[dayOfWeek];
    const dd = String(this.selectedDay).padStart(2, '0');
    const mm = String(this.currentCalMonth).padStart(2, '0');
    const yyyy = this.currentCalYear;
    const dateStr = `${dayName}, ${dd}/${mm}/${yyyy}`;

    const dateLabel = document.getElementById('selectedScheduleDateLabel');
    if (dateLabel) {
      dateLabel.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0C7247" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${dateStr}
      `;
    }
    return dateStr;
  }

  selectCalendarDate(day) {
    this.selectedDay = day;
    const dateStr = this.updateScheduleDateLabel();
    this.renderCalendarBook();
    this.renderSchedule();
    this.showToast(`📅 Đã mở lịch ngày ${dateStr}`);
  }

  goToTodaySchedule() {
    const today = this.getTodayInfo();
    this.currentCalYear = today.year;
    this.currentCalMonth = today.month;
    this.selectedDay = today.day;
    this.selectCalendarDate(today.day);
    this.showToast(`📅 Đã chuyển về đúng ngày hôm nay (${today.displayStr})!`);
  }

  changeCalendarMonth(delta) {
    this.currentCalMonth += delta;
    if (this.currentCalMonth > 12) {
      this.currentCalMonth = 1;
      this.currentCalYear++;
    } else if (this.currentCalMonth < 1) {
      this.currentCalMonth = 12;
      this.currentCalYear--;
    }
    this.renderCalendarBook();
    this.showToast(`Cuốn lịch: Tháng ${this.currentCalMonth}/${this.currentCalYear}`);
  }

  renderSchedule() {
    const container = document.getElementById('scheduleListRows');
    if (!container) return;

    let html = '';
    (this.data.schedules || []).forEach(slot => {
      const thinhBadge = this.getScheduleBadgeHtml(slot.thinh, slot.thinhStatus);
      const buBadge = this.getScheduleBadgeHtml(slot.bu, slot.buStatus);

      html += `
        <div class="schedule-row">
          <span class="time-slot-label">${slot.timeSlot}</span>
          <div class="schedule-cell" onclick="app.openSlotAction('${slot.timeSlot}', 'thinh')">${thinhBadge}</div>
          <div class="schedule-cell" onclick="app.openSlotAction('${slot.timeSlot}', 'bu')">${buBadge}</div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  getScheduleBadgeHtml(text, status) {
    if (status === 'completed') {
      return `<span class="badge-status completed dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> ${text}</span>`;
    } else if (status === 'available') {
      return `<span class="badge-status available dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> ${text}</span>`;
    } else {
      return `<span class="badge-status off dot">${text}</span>`;
    }
  }

  // Mở modal thao tác ca chạy trực tiếp
  openSlotAction(timeSlot, driverId) {
    this.activeSlot = { timeSlot, driverId };
    const driverName = driverId === 'thinh' ? 'Thịnh' : 'Bu';
    const modal = document.getElementById('slotActionModal');
    const titleEl = document.getElementById('slotActionTitle');
    const descEl = document.getElementById('slotActionDesc');

    if (titleEl) titleEl.textContent = `Quản Lý Ca Chạy • ${driverName}`;
    if (descEl) descEl.textContent = `Khung giờ: ${timeSlot} (Chung xe Air Blade 125)`;
    if (modal) modal.classList.add('active');
  }

  setSlotStatus(status) {
    if (!this.activeSlot) return;
    const { timeSlot, driverId } = this.activeSlot;
    const otherDriverId = driverId === 'thinh' ? 'bu' : 'thinh';
    const slotObj = this.data.schedules.find(s => s.timeSlot === timeSlot);
    if (!slotObj) return;

    if (status === 'cancel' || status === 'off') {
      if (driverId === 'thinh') {
        slotObj.thinh = 'Nghỉ';
        slotObj.thinhStatus = 'off';
      } else {
        slotObj.bu = 'Nghỉ';
        slotObj.buStatus = 'off';
      }
      this.showToast(`Đã hủy ca ${timeSlot}`);
    } else {
      // KIỂM TRA XUNG ĐỘT TRÙNG LỊCH CHUNG 1 XE (PHẦN 4)
      const otherStatus = driverId === 'thinh' ? slotObj.buStatus : slotObj.thinhStatus;
      if (otherStatus && otherStatus !== 'off') {
        alert('Xe đã có lịch trong khoảng thời gian này.');
        return;
      }

      const statusText = status === 'completed' ? 'Đã chạy' : 'Trống';
      if (driverId === 'thinh') {
        slotObj.thinh = statusText;
        slotObj.thinhStatus = status;
      } else {
        slotObj.bu = statusText;
        slotObj.buStatus = status;
      }
      const driverName = driverId === 'thinh' ? 'Thịnh' : 'Bu';
      this.showToast(`✓ Đã đăng ký ca ${timeSlot} cho ${driverName}!`);
    }

    this.saveState();
    this.renderCalendarBook();
    this.renderSchedule();
    this.closeModal('slotActionModal');

    if (window.grabSync) window.grabSync.broadcast('UPDATE_SCHEDULE', { schedules: this.data.schedules });
  }

  handleSaveSchedule(e) {
    e.preventDefault();
    const driverId = document.getElementById('scheduleDriverSelect').value;
    const timeSlot = document.getElementById('scheduleTimeSlotSelect').value;
    const status = document.getElementById('scheduleStatusSelect').value;

    const slotObj = this.data.schedules.find(s => s.timeSlot === timeSlot);
    if (!slotObj) return;

    const otherStatus = driverId === 'thinh' ? slotObj.buStatus : slotObj.thinhStatus;
    if (status !== 'off' && (otherStatus && otherStatus !== 'off')) {
      alert('Xe đã có lịch trong khoảng thời gian này.');
      return;
    }

    if (driverId === 'thinh') {
      slotObj.thinh = status === 'completed' ? 'Đã chạy' : (status === 'available' ? 'Trống' : 'Nghỉ');
      slotObj.thinhStatus = status;
    } else {
      slotObj.bu = status === 'completed' ? 'Đã chạy' : (status === 'available' ? 'Trống' : 'Nghỉ');
      slotObj.buStatus = status;
    }

    this.saveState();
    this.renderCalendarBook();
    this.renderSchedule();
    this.closeModal('scheduleModal');
    this.showToast(`Đã lưu ca ${timeSlot} cho ${driverId === 'thinh' ? 'Thịnh' : 'Bu'}`);

    if (window.grabSync) window.grabSync.broadcast('UPDATE_SCHEDULE', { schedules: this.data.schedules });
  }

  // ===================================================
  // 3. RENDER THU NHẬP & CHUYẾN ĐI (PHẦN 5 & 6)
  // ===================================================
  renderIncome() {
    const incTotal = document.getElementById('incomeScreenTotal');
    const incCash = document.getElementById('incomeScreenCash');
    const incTransfer = document.getElementById('incomeScreenTransfer');
    const incTrips = document.getElementById('incomeScreenTrips');

    if (incTotal) incTotal.textContent = this.formatMoney(this.data.incomeOverview.total);
    if (incCash) incCash.textContent = this.formatMoney(this.data.incomeOverview.cash);
    if (incTransfer) incTransfer.textContent = this.formatMoney(this.data.incomeOverview.transfer);
    if (incTrips) incTrips.textContent = this.data.trips.length;

    const tripsContainer = document.getElementById('tripsListContainer');
    if (!tripsContainer) return;

    if (!this.data.trips || this.data.trips.length === 0) {
      tripsContainer.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">
          Chưa có chuyến đi nào trong ngày.<br>Bấm "Thêm chuyến" bên dưới để ghi nhận.
        </div>
      `;
      return;
    }

    let html = '';
    this.data.trips.forEach(trip => {
      const isCash = trip.type === 'cash';
      const badgeClass = isCash ? 'trip-badge-cash' : 'trip-badge-transfer';
      const badgeText = isCash ? 'Tiền mặt' : 'Chuyển khoản';
      const driverName = trip.driverId === 'thinh' ? 'Thịnh' : 'Bu';
      const driverBg = trip.driverId === 'thinh' ? '#E8F5E9' : '#E7F5FF';
      const driverColor = trip.driverId === 'thinh' ? 'var(--driver-thinh)' : 'var(--driver-bu)';

      html += `
        <div class="trip-card-item" onclick="app.openTripActions('${trip.id}')" title="Bấm để xem/sửa/xóa chuyến">
          <div class="trip-item-left">
            <div class="trip-item-top">
              <span class="trip-time">${trip.time}</span>
              <span class="trip-amount">${this.formatMoney(trip.amount)}</span>
              <span class="${badgeClass}">${badgeText}</span>
              <span class="trip-driver-tag" style="background: ${driverBg}; color: ${driverColor};">${driverName}</span>
            </div>
            <span class="trip-desc">${trip.note}</span>
          </div>
          <span style="color: #A0AEC0; font-size: 16px;">✎</span>
        </div>
      `;
    });
    tripsContainer.innerHTML = html;
  }

  openTripActions(tripId) {
    const trip = (this.data.trips || []).find(t => t.id === tripId);
    if (!trip) return;

    document.getElementById('editTripId').value = trip.id;
    document.getElementById('editTripDriver').value = trip.driverId;
    document.getElementById('editTripTime').value = trip.time;
    document.getElementById('editTripAmount').value = trip.amount;
    document.getElementById('editTripType').value = trip.type;
    document.getElementById('editTripNote').value = trip.note;

    this.openModal('tripDetailModal');
  }

  handleUpdateTrip(e) {
    e.preventDefault();
    const id = document.getElementById('editTripId').value;
    const trip = (this.data.trips || []).find(t => t.id === id);
    if (!trip) return;

    trip.driverId = document.getElementById('editTripDriver').value;
    trip.time = document.getElementById('editTripTime').value;
    trip.amount = parseInt(document.getElementById('editTripAmount').value) || 0;
    trip.type = document.getElementById('editTripType').value;
    trip.note = document.getElementById('editTripNote').value;

    this.saveState();
    this.recalculateBalances();
    this.renderAll();
    this.closeModal('tripDetailModal');
    this.showToast('✓ Đã cập nhật thông tin chuyến đi!');
  }

  handleDeleteCurrentTrip() {
    const id = document.getElementById('editTripId').value;
    if (!confirm('Bạn có chắc chắn muốn xóa chuyến đi này không?')) return;

    this.data.trips = (this.data.trips || []).filter(t => t.id !== id);
    this.saveState();
    this.recalculateBalances();
    this.renderAll();
    this.closeModal('tripDetailModal');
    this.showToast('🗑️ Đã xóa chuyến đi thành công!');
  }

  handleSaveTrip(e) {
    e.preventDefault();
    const driverId = document.getElementById('tripDriverSelect').value;
    const time = document.getElementById('tripTimeInput').value || '18:00';
    const amount = parseInt(document.getElementById('tripAmountInput').value) || 0;
    const type = document.getElementById('tripTypeSelect').value;
    const note = document.getElementById('tripNoteInput').value || 'Chuyến xe Grab';

    if (amount <= 0) {
      this.showToast('Vui lòng nhập số tiền hợp lệ!');
      return;
    }

    const newTrip = {
      id: 'trip-' + Date.now(),
      time,
      amount,
      type,
      note,
      driverId
    };

    if (!this.data.trips) this.data.trips = [];
    this.data.trips.unshift(newTrip);
    this.recalculateBalances();
    this.saveState();
    this.renderAll();
    this.closeModal('tripModal');
    if (e && e.target && typeof e.target.reset === 'function') e.target.reset();

    const driverName = driverId === 'thinh' ? 'Thịnh' : 'Bu';
    this.showToast(`✓ Đã thêm chuyến ${this.formatMoney(amount)} cho ${driverName}!`);

    if (window.grabSync) window.grabSync.broadcast('ADD_TRIP', { trip: newTrip });
  }

  // ===================================================
  // 4. RENDER GHI CHÚ & TIMELINE (PHẦN 7)
  // ===================================================
  renderNotes() {
    const container = document.getElementById('timelineNotesContainer');
    if (!container) return;

    if (!this.data.notes || this.data.notes.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">
          Chưa có ghi chú nào trong ngày.<br>Nhập nội dung ở ô trên để thêm note nhanh.
        </div>
      `;
    } else {
      let html = '';
      this.data.notes.forEach(note => {
        let nodeClass = '';
        if (note.tagColor === '#1971C2') nodeClass = 'blue';
        else if (note.tagColor === '#0C7247') nodeClass = 'green';
        else if (note.tagColor === '#E03131') nodeClass = 'red';
        else if (note.tagColor === '#868E96') nodeClass = 'gray';

        const imageThumbHtml = note.hasImage ? `
          <div class="timeline-thumb" onclick="app.openLightboxGraphic('petrol', 'Hóa đơn đổ xăng')">
            <span>⛽ Chi tiết</span>
          </div>
        ` : '';

        html += `
          <div class="timeline-item" onclick="app.openNoteActions('${note.id}')" title="Bấm để sửa/xóa ghi chú">
            <div class="timeline-node ${nodeClass}"></div>
            <div class="timeline-header">
              <span class="timeline-time">${note.time}</span>
              <span style="font-size: 11px; color: var(--text-muted);">✎ Sửa</span>
            </div>
            <div class="timeline-content">${note.content}</div>
            <div class="timeline-sub">${note.driver} • ${note.date}</div>
            ${imageThumbHtml}
          </div>
        `;
      });
      container.innerHTML = html;
    }

    // Cập nhật card Chốt tài chính cuối ngày trên Screen 4 (Bảo đảm tự động reset sạch 0đ)
    const finTotalRev = document.getElementById('finTotalRev');
    const finCash = document.getElementById('finCash');
    const finTransfer = document.getElementById('finTransfer');
    const finWallet = document.getElementById('finWallet');
    const finFuel = document.getElementById('finFuel');
    const finOther = document.getElementById('finOther');

    const totalFuel = ((this.data.dailyClosing && this.data.dailyClosing.thinh && this.data.dailyClosing.thinh.fuelExpense) || 0) +
                      ((this.data.dailyClosing && this.data.dailyClosing.bu && this.data.dailyClosing.bu.fuelExpense) || 0);
    const totalOther = ((this.data.dailyClosing && this.data.dailyClosing.thinh && this.data.dailyClosing.thinh.otherExpense) || 0) +
                       ((this.data.dailyClosing && this.data.dailyClosing.bu && this.data.dailyClosing.bu.otherExpense) || 0);
    const walletRem = (this.data.todaySummary && this.data.todaySummary.walletRemaining) || 
                      (this.data.dailyClosing && this.data.dailyClosing.walletRemaining) || 0;

    if (finTotalRev) finTotalRev.value = this.formatMoney((this.data.incomeOverview && this.data.incomeOverview.total) || 0);
    if (finCash) finCash.value = this.formatMoney((this.data.incomeOverview && this.data.incomeOverview.cash) || 0);
    if (finTransfer) finTransfer.value = this.formatMoney((this.data.incomeOverview && this.data.incomeOverview.transfer) || 0);
    if (finWallet) finWallet.value = this.formatMoney(walletRem);
    if (finFuel) finFuel.value = this.formatMoney(totalFuel);
    if (finOther) finOther.value = this.formatMoney(totalOther);
  }

  openNoteActions(noteId) {
    const note = (this.data.notes || []).find(n => n.id === noteId);
    if (!note) return;

    document.getElementById('editNoteId').value = note.id;
    document.getElementById('editNoteContent').value = note.content;
    document.getElementById('editNoteDriver').value = note.driver;
    this.openModal('noteActionModal');
  }

  handleUpdateNote(e) {
    e.preventDefault();
    const id = document.getElementById('editNoteId').value;
    const note = (this.data.notes || []).find(n => n.id === id);
    if (!note) return;

    note.content = document.getElementById('editNoteContent').value;
    note.driver = document.getElementById('editNoteDriver').value;
    note.tagColor = note.driver === 'Thịnh' ? '#0C7247' : '#1971C2';

    this.saveState();
    this.renderNotes();
    this.closeModal('noteActionModal');
    this.showToast('✓ Đã cập nhật ghi chú!');
  }

  handleDeleteCurrentNote() {
    const id = document.getElementById('editNoteId').value;
    if (!confirm('Bạn có chắc chắn muốn xóa ghi chú này không?')) return;

    this.data.notes = (this.data.notes || []).filter(n => n.id !== id);
    this.saveState();
    this.renderNotes();
    this.closeModal('noteActionModal');
    this.showToast('🗑️ Đã xóa ghi chú!');
  }

  submitQuickNote() {
    const input = document.getElementById('quickNoteInput');
    if (!input || !input.value.trim()) {
      this.showToast('Vui lòng nhập nội dung ghi chú!');
      return;
    }

    const curDeviceUser = localStorage.getItem('grab_current_user') || 'thinh';
    const curDriverName = curDeviceUser === 'thinh' ? 'Thịnh' : 'Bu';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newNote = {
      id: 'note-' + Date.now(),
      time: timeStr,
      content: input.value.trim(),
      driver: curDriverName,
      date: '12/09/2026',
      type: 'info',
      tagColor: curDriverName === 'Thịnh' ? '#0C7247' : '#1971C2'
    };

    if (!this.data.notes) this.data.notes = [];
    this.data.notes.unshift(newNote);
    this.saveState();
    this.renderNotes();
    input.value = '';
    this.showToast('Đã lưu ghi chú mới!');

    if (window.grabSync) window.grabSync.broadcast('ADD_NOTE', { note: newNote });
  }

  // ===================================================
  // 5. RENDER HÌNH ẢNH CHỐT SỔ (PHẦN 8)
  // ===================================================
  renderGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    let html = '';
    (this.data.closingImages || []).forEach(img => {
      const graphicBox = this.generateGraphicPreview(img.previewType, img.customDataUrl);
      html += `
        <div class="gallery-card" onclick="app.openLightboxImage('${img.id}')" title="Bấm để xem/xóa ảnh">
          <div class="gallery-preview-box">
            ${graphicBox}
          </div>
          <div class="gallery-info">
            <span class="gallery-title">${img.title}</span>
            <span class="gallery-time">${img.time}</span>
          </div>
        </div>
      `;
    });

    html += `
      <div class="add-photo-card" onclick="app.openModal('imageModal')">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <span>Thêm ảnh</span>
      </div>
    `;

    grid.innerHTML = html;
  }

  generateGraphicPreview(type, customUrl) {
    if (customUrl) {
      return `<img src="${customUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="preview">`;
    }

    switch (type) {
      case 'app_summary':
        return `
          <div style="width: 100%; height: 100%; background: #0E7444; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; font-size: 11px;">
            <div style="font-weight: 700; color: #FFF; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">GrabDriver Thu Nhập</div>
            <div style="text-align: center;">
              <div style="font-size: 16px; font-weight: 800; color: #86EFAC;">620.000đ</div>
              <div style="font-size: 10px; color: #DCFCE7;">12 chuyến hoàn thành</div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 9px; color: #BBF7D0;">
              <span>TM: 320k</span>
              <span>CK: 300k</span>
            </div>
          </div>
        `;
      case 'bank_transfer':
        return `
          <div style="width: 100%; height: 100%; background: #064E3B; padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; text-align: center;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #10B981; display: flex; align-items: center; justify-content: center; color: #FFF; font-weight: 800; font-size: 13px;">✓</div>
            <div style="font-size: 10px; color: #A7F3D0;">Chuyển khoản thành công</div>
            <div style="font-size: 15px; font-weight: 800; color: #FFF;">+300.000đ</div>
            <div style="font-size: 9px; color: #6EE7B7;">Nội dung: Grab Bu</div>
          </div>
        `;
      case 'fuel_pump':
        return `
          <div style="width: 100%; height: 100%; background: #1E293B; padding: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px solid #334155;">
            <div style="background: #0284C7; color: #FFF; font-size: 9px; padding: 2px 6px; border-radius: 3px; margin-bottom: 4px;">PETROLIMEX</div>
            <div style="background: #0F172A; border: 1px solid #475569; padding: 4px 10px; border-radius: 4px; color: #38BDF8; font-family: monospace; font-size: 14px; font-weight: 700;">
              100.000 Đ
            </div>
            <div style="font-size: 9px; color: #94A3B8; margin-top: 4px;">RON 95-III • 4.12 L</div>
          </div>
        `;
      case 'odometer':
        return `
          <div style="width: 100%; height: 100%; background: #0B0F19; padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div style="font-size: 10px; color: #F59E0B; margin-bottom: 4px;">● AIR BLADE 125</div>
            <div style="display: flex; align-items: baseline; gap: 4px;">
              <span style="font-size: 8px; color: #64748B;">ODO</span>
              <span style="font-size: 18px; font-weight: 800; color: #F8FAFC; font-family: monospace;">4523</span>
              <span style="font-size: 9px; color: #94A3B8;">km</span>
            </div>
            <div style="font-size: 8px; color: #10B981; margin-top: 2px;">Bình xăng: 85%</div>
          </div>
        `;
      case 'receipt':
        return `
          <div style="width: 100%; height: 100%; background: #F8FAFC; color: #1E293B; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; border: 1px dashed #94A3B8; font-size: 9px;">
            <div style="text-align: center; font-weight: 700; border-bottom: 1px solid #CBD5E1; padding-bottom: 2px;">TIỆM SỬA XE QUANG</div>
            <div>
              <div>1. Vá vỏ bánh sau: 20.000đ</div>
              <div>2. Tăng xích xe: 10.000đ</div>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; border-top: 1px solid #CBD5E1; padding-top: 2px;">
              <span>Tổng:</span>
              <span>30.000đ</span>
            </div>
          </div>
        `;
      default:
        return `<div style="color: #94A3B8; font-size: 12px; display: flex; align-items: center; justify-content: center; height: 100%;">Chứng từ hình ảnh</div>`;
    }
  }

  handleImgCategoryChange(select) {
    const fileBox = document.getElementById('fileUploadContainer');
    if (select.value === 'custom_file') {
      fileBox.style.display = 'block';
    } else {
      fileBox.style.display = 'none';
    }
  }

  handleSaveImage(e) {
    e.preventDefault();
    const title = document.getElementById('imgTitleInput').value || 'Ảnh chứng từ';
    const time = document.getElementById('imgTimeInput').value || '21:00';
    const cat = document.getElementById('imgCategorySelect').value;
    const fileInput = document.getElementById('imgFileInput');

    const saveAndClose = (dataUrl = null) => {
      const newImg = {
        id: 'img-' + Date.now(),
        title: title + ` ${time}`,
        time,
        category: cat,
        description: title,
        previewType: cat,
        customDataUrl: dataUrl
      };
      if (!this.data.closingImages) this.data.closingImages = [];
      this.data.closingImages.unshift(newImg);
      this.saveState();
      this.renderGallery();
      this.closeModal('imageModal');
      if (e && e.target && typeof e.target.reset === 'function') e.target.reset();
      this.showToast('Đã lưu ảnh chứng từ chốt sổ!');
    };

    if (cat === 'custom_file' && fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => saveAndClose(ev.target.result);
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      saveAndClose();
    }
  }

  openLightboxImage(imgId) {
    const img = (this.data.closingImages || []).find(i => i.id === imgId);
    if (!img) return;

    this.activeLightboxImgId = imgId;
    const modal = document.getElementById('photoLightbox');
    const title = document.getElementById('lightboxTitle');
    const content = document.getElementById('lightboxContent');
    const caption = document.getElementById('lightboxCaption');

    title.textContent = img.title;
    caption.textContent = `${img.description} • Thời gian: ${img.time}`;
    content.innerHTML = `<div style="width: 320px; height: 380px; max-width: 90%; border-radius: 12px; overflow: hidden;">${this.generateGraphicPreview(img.previewType, img.customDataUrl)}</div>`;
    modal.classList.add('active');
  }

  openLightboxGraphic(type, titleText) {
    this.activeLightboxImgId = null;
    const modal = document.getElementById('photoLightbox');
    const title = document.getElementById('lightboxTitle');
    const content = document.getElementById('lightboxContent');
    const caption = document.getElementById('lightboxCaption');

    title.textContent = titleText;
    caption.textContent = 'Chứng từ hình ảnh kèm ghi chú';
    content.innerHTML = `<div style="width: 300px; height: 340px; border-radius: 12px; overflow: hidden;">${this.generateGraphicPreview(type)}</div>`;
    modal.classList.add('active');
  }

  deleteCurrentLightboxImage() {
    if (!this.activeLightboxImgId) {
      this.showToast('Không có ảnh nào đang chọn để xóa!');
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa ảnh chứng từ này không?')) return;

    this.data.closingImages = (this.data.closingImages || []).filter(i => i.id !== this.activeLightboxImgId);
    this.saveState();
    this.renderGallery();
    this.closeLightbox();
    this.showToast('🗑️ Đã xóa ảnh chứng từ!');
  }

  closeLightbox() {
    const modal = document.getElementById('photoLightbox');
    if (modal) modal.classList.remove('active');
  }

  // ===================================================
  // 6. RENDER BÁO CÁO (PHẦN 11) - TÍCH HỢP CHART.JS
  // ===================================================
  renderReports() {
    // Cập nhật số liệu text báo cáo
    const setSafe = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setSafe('repOverviewRevenue', this.formatMoney(this.data.incomeOverview.total));
    setSafe('repOverviewCash', this.formatMoney(this.data.incomeOverview.cash));
    setSafe('repOverviewTransfer', `🏦 CK: ${this.formatMoney(this.data.incomeOverview.transfer)}`);
    setSafe('repOverviewTrips', `🚗 ${this.data.incomeOverview.totalTrips} chuyến`);

    setSafe('repThinhAmount', this.formatMoney(this.data.incomeOverview.thinh.total));
    setSafe('repThinhCash', this.formatMoney(this.data.incomeOverview.thinh.cash));
    setSafe('repThinhTransfer', this.formatMoney(this.data.incomeOverview.thinh.transfer));
    setSafe('repThinhTrips', this.data.incomeOverview.thinh.trips);
    setSafe('repThinhHours', this.calculateDriverHours('thinh'));

    setSafe('repBuAmount', this.formatMoney(this.data.incomeOverview.bu.total));
    setSafe('repBuCash', this.formatMoney(this.data.incomeOverview.bu.cash));
    setSafe('repBuTransfer', this.formatMoney(this.data.incomeOverview.bu.transfer));
    setSafe('repBuTrips', this.data.incomeOverview.bu.trips);
    setSafe('repBuHours', this.calculateDriverHours('bu'));

    // Gọi vẽ biểu đồ Chart.js
    this.renderCharts();
  }

  renderCharts() {
    if (typeof Chart === 'undefined') return;

    // 1. Biểu đồ cột: So sánh doanh thu Thịnh vs Bu theo ngày
    const barCanvas = document.getElementById('chartRevenueComparison');
    if (barCanvas) {
      const days = (this.data.reports && this.data.reports.chartDays) || [
        { label: "09/09", thinh: 0, bu: 0 },
        { label: "10/09", thinh: 0, bu: 0 },
        { label: "11/09", thinh: 0, bu: 0 },
        { label: "12/09", thinh: 0, bu: 0 }
      ];

      const labels = days.map(d => d.label || d.date);
      const dataThinh = days.map(d => (d.date === '12/09' || d.label === '12/09') ? (this.data.incomeOverview.thinh.total || 0) : (d.thinh || 0));
      const dataBu = days.map(d => (d.date === '12/09' || d.label === '12/09') ? (this.data.incomeOverview.bu.total || 0) : (d.bu || 0));

      if (this.chartRevenue) {
        this.chartRevenue.destroy();
      }

      const ctx = barCanvas.getContext('2d');
      this.chartRevenue = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Thịnh',
              data: dataThinh,
              backgroundColor: '#0C7247',
              borderRadius: 6,
              barPercentage: 0.65
            },
            {
              label: 'Bu',
              data: dataBu,
              backgroundColor: '#1971C2',
              borderRadius: 6,
              barPercentage: 0.65
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
                label: (context) => `${context.dataset.label}: ${this.formatMoney(context.raw)}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (val) => val >= 1000 ? (val / 1000) + 'k' : val,
                font: { size: 10 }
              },
              grid: { color: 'rgba(0,0,0,0.05)' }
            },
            x: {
              grid: { display: false },
              ticks: { font: { size: 11, weight: 'bold' } }
            }
          }
        }
      });
    }

    // 2. Biểu đồ tròn (Doughnut): Cơ cấu Tiền mặt & Chuyển khoản
    const distCanvas = document.getElementById('chartPaymentDistribution');
    if (distCanvas) {
      const cash = (this.data.incomeOverview && this.data.incomeOverview.cash) || 0;
      const transfer = (this.data.incomeOverview && this.data.incomeOverview.transfer) || 0;
      const hasData = (cash + transfer) > 0;

      if (this.chartDist) {
        this.chartDist.destroy();
      }

      const ctxDist = distCanvas.getContext('2d');
      this.chartDist = new Chart(ctxDist, {
        type: 'doughnut',
        data: {
          labels: ['Tiền mặt', 'Chuyển khoản'],
          datasets: [{
            data: hasData ? [cash, transfer] : [1, 1],
            backgroundColor: hasData ? ['#10B981', '#3B82F6'] : ['#E2E8F0', '#CBD5E1'],
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { font: { size: 11, weight: '600' }, boxWidth: 12 }
            },
            tooltip: {
              callbacks: {
                label: (context) => hasData ? `${context.label}: ${this.formatMoney(context.raw)}` : 'Chưa có doanh thu'
              }
            }
          }
        }
      });
    }
  }

  calculateDriverHours(driverId) {
    let totalMinutes = 0;
    (this.data.schedules || []).forEach(slot => {
      const status = driverId === 'thinh' ? slot.thinhStatus : slot.buStatus;
      if (status === 'completed') {
        const parts = (slot.timeSlot || '').split(' - ');
        if (parts.length === 2) {
          const [startH, startM] = parts[0].split(':').map(Number);
          let [endH, endM] = parts[1].split(':').map(Number);
          if (endH === 0 && startH > 12) endH = 24;
          const startTotal = startH * 60 + (startM || 0);
          const endTotal = endH * 60 + (endM || 0);
          const diff = endTotal - startTotal;
          if (diff > 0) totalMinutes += diff;
        }
      }
    });

    if (totalMinutes === 0) return '0h 00p';
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${String(m).padStart(2, '0')}p`;
  }

  // ===================================================
  // 7. RENDER CHỐT NGÀY & ĐỐI SOÁT (PHẦN 9 & 10)
  // ===================================================
  renderClosing() {
    const t = this.data.dailyClosing.thinh;
    const b = this.data.dailyClosing.bu;
    const setSafe = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    // Luôn hiển thị ngày hôm nay theo thời gian thực
    setSafe('closingDateLabel', this.getTodayInfo().displayStr);

    setSafe('closeThinhTrips', t.trips);
    setSafe('closeThinhRev', this.formatMoney(t.revenue));
    setSafe('closeThinhCash', this.formatMoney(t.cash));
    setSafe('closeThinhTransfer', this.formatMoney(t.transfer));
    setSafe('closeThinhTip', this.formatMoney(t.tip));
    setSafe('closeThinhFuel', '-' + this.formatMoney(t.fuelExpense));
    setSafe('closeThinhOther', '-' + this.formatMoney(t.otherExpense));
    setSafe('closeThinhNet', this.formatMoney(t.netIncome));

    setSafe('closeBuTrips', b.trips);
    setSafe('closeBuRev', this.formatMoney(b.revenue));
    setSafe('closeBuCash', this.formatMoney(b.cash));
    setSafe('closeBuTransfer', this.formatMoney(b.transfer));
    setSafe('closeBuTip', this.formatMoney(b.tip));
    setSafe('closeBuFuel', '-' + this.formatMoney(b.fuelExpense));
    setSafe('closeBuOther', '-' + this.formatMoney(b.otherExpense));
    setSafe('closeBuNet', this.formatMoney(b.netIncome));

    // Thẻ đối soát bù trừ Spliit Engine
    this.renderSpliitSettlement();
  }

  // ===================================================
  // SPLIIT: ĐỐI SOÁT & QUYẾT TOÁN BÙ TRỪ TỰ ĐỘNG
  // ===================================================
  renderSpliitSettlement() {
    const t = (this.data.dailyClosing && this.data.dailyClosing.thinh) || {};
    const b = (this.data.dailyClosing && this.data.dailyClosing.bu) || {};
    const setSafe = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setSafe('closeDoiSoatCashThinh', this.formatMoney(t.cash || 0));
    setSafe('closeDoiSoatCashBu', this.formatMoney(b.cash || 0));

    // Tính tổng chi phí xe dùng chung (chia 50-50)
    let sharedExpense = 0;
    ((this.data.vehicleMaintenance && this.data.vehicleMaintenance.logs) || []).forEach(log => {
      sharedExpense += (parseInt(log.cost) || 0);
    });
    sharedExpense += ((t.otherExpense || 0) + (b.otherExpense || 0));

    setSafe('spliitSharedExpense', this.formatMoney(sharedExpense) + ` (Mỗi người: ${this.formatMoney(Math.round(sharedExpense / 2))})`);

    // Spliit Formula:
    // Chênh lệch giữa Tiền mặt đang giữ vs Thu nhập ròng được hưởng
    const diffThinh = (t.cash || 0) - (t.netIncome || 0);
    const ketLuanEl = document.getElementById('closeDoiSoatKetLuan');
    const statusBadge = document.getElementById('spliitStatusBadge');

    const isSettled = this.data.settlement && this.data.settlement.isSettled;

    if (isSettled) {
      if (statusBadge) {
        statusBadge.textContent = 'Đã sòng phẳng 🟢';
        statusBadge.className = 'badge-status completed dot';
      }
      if (ketLuanEl) {
        ketLuanEl.innerHTML = `✓ Hai bên đã chuyển khoản quyết toán xong! (Sòng phẳng 0đ)`;
        ketLuanEl.style.color = '#0C7247';
      }
      return;
    }

    if (statusBadge) {
      statusBadge.textContent = 'Chờ quyết toán 🟡';
      statusBadge.className = 'badge-status available dot';
    }

    if (ketLuanEl) {
      if (diffThinh === 0) {
        ketLuanEl.innerHTML = `👉 Hai bên đối soát sòng phẳng (Không ai nợ ai)!`;
        ketLuanEl.style.color = '#0C7247';
      } else if (diffThinh > 0) {
        ketLuanEl.innerHTML = `👉 <strong>THỊNH</strong> cần chuyển khoản trả <strong>BU</strong>: <span style="color: #E03131; font-size: 15px;">${this.formatMoney(diffThinh)}</span>`;
      } else {
        ketLuanEl.innerHTML = `👉 <strong>BU</strong> cần chuyển khoản trả <strong>THỊNH</strong>: <span style="color: #0C7247; font-size: 15px;">${this.formatMoney(Math.abs(diffThinh))}</span>`;
      }
    }
  }

  handleSettleUp() {
    if (!this.data.settlement) this.data.settlement = {};
    this.data.settlement.isSettled = true;
    this.data.settlement.lastSettledDate = new Date().toLocaleDateString('vi-VN');
    if (!this.data.settlement.history) this.data.settlement.history = [];
    this.data.settlement.history.unshift({
      id: 'settle-' + Date.now(),
      date: new Date().toLocaleString('vi-VN'),
      note: 'Xác nhận chuyển khoản quyết toán bù trừ sòng phẳng'
    });

    this.saveState();
    this.renderSpliitSettlement();
    this.showToast('✓ Đã xác nhận quyết toán bù trừ Spliit thành công!');
    if (window.grabSync) window.grabSync.broadcast('SETTLE_UP', { settledDate: this.data.settlement.lastSettledDate });
  }

  // ===================================================
  // LUBELOGGER: QUẢN LÝ & BẢO DƯỠNG XE AIR BLADE
  // ===================================================
  renderMaintenanceWidget() {
    const vm = this.data.vehicleMaintenance || {};
    const curOdo = parseInt(vm.currentOdo) || 0;
    const oilEngineInterval = parseInt(vm.oilChangeInterval) || 1500;
    const lastOilEngine = parseInt(vm.lastOilChangeOdo) || 0;
    const gearOilInterval = parseInt(vm.gearOilInterval) || 5000;
    const lastGearOil = parseInt(vm.lastGearOilOdo) || 0;

    // Nhớt máy
    const runEngine = Math.max(0, curOdo - lastOilEngine);
    const remEngine = oilEngineInterval - runEngine;
    const pctEngine = Math.min(100, Math.max(0, Math.round((runEngine / oilEngineInterval) * 100)));

    // Nhớt láp
    const runGear = Math.max(0, curOdo - lastGearOil);
    const remGear = gearOilInterval - runGear;
    const pctGear = Math.min(100, Math.max(0, Math.round((runGear / gearOilInterval) * 100)));

    const getColor = (rem) => {
      if (rem <= 0) return '#E03131';
      if (rem <= 200) return '#F59F00';
      return '#10B981';
    };

    const getBadge = (rem) => {
      if (rem <= 0) return '<span class="badge-status off dot">Quá hạn</span>';
      if (rem <= 200) return '<span class="badge-status available dot">Sắp tới hạn</span>';
      return '<span class="badge-status running dot">Tốt</span>';
    };

    // Update Dashboard Widget
    const odoDisplay = document.getElementById('maintOdoDisplay');
    const statusBadge = document.getElementById('maintStatusBadge');
    const oilText = document.getElementById('maintOilText');
    const oilBar = document.getElementById('maintOilBar');
    const gearText = document.getElementById('maintGearOilText');
    const gearBar = document.getElementById('maintGearOilBar');

    if (odoDisplay) odoDisplay.textContent = `${curOdo.toLocaleString('vi-VN')} km`;
    if (oilText) oilText.textContent = remEngine <= 0 ? `Quá ${Math.abs(remEngine)} km!` : `Còn ${remEngine} km`;
    if (oilBar) {
      oilBar.style.width = `${pctEngine}%`;
      oilBar.style.backgroundColor = getColor(remEngine);
    }
    if (gearText) gearText.textContent = remGear <= 0 ? `Quá ${Math.abs(remGear)} km!` : `Còn ${remGear} km`;
    if (gearBar) {
      gearBar.style.width = `${pctGear}%`;
      gearBar.style.backgroundColor = getColor(remGear);
    }

    if (statusBadge) {
      if (remEngine <= 0 || remGear <= 0) {
        statusBadge.textContent = 'Cần bảo dưỡng!';
        statusBadge.className = 'badge-status off dot';
      } else if (remEngine <= 200 || remGear <= 200) {
        statusBadge.textContent = 'Sắp tới hạn';
        statusBadge.className = 'badge-status available dot';
      } else {
        statusBadge.textContent = 'Xe chạy tốt';
        statusBadge.className = 'badge-status running dot';
      }
    }

    // Update inside Maintenance Modal
    const modalOdo = document.getElementById('modalOdoCurrentDisplay');
    const badgeOilEng = document.getElementById('badgeMaintOilEngine');
    const textOilEng = document.getElementById('textMaintOilEngine');
    const badgeOilGr = document.getElementById('badgeMaintOilGear');
    const textOilGr = document.getElementById('textMaintOilGear');
    const historyList = document.getElementById('maintHistoryList');

    if (modalOdo) modalOdo.textContent = `${curOdo.toLocaleString('vi-VN')} km`;
    if (badgeOilEng) badgeOilEng.innerHTML = getBadge(remEngine);
    if (textOilEng) textOilEng.textContent = `Lần thay gần nhất: ${lastOilEngine.toLocaleString('vi-VN')} km (Đã chạy ${runEngine} km / ${oilEngineInterval} km)`;
    if (badgeOilGr) badgeOilGr.innerHTML = getBadge(remGear);
    if (textOilGr) textOilGr.textContent = `Lần thay gần nhất: ${lastGearOil.toLocaleString('vi-VN')} km (Đã chạy ${runGear} km / ${gearOilInterval} km)`;

    if (historyList) {
      const logs = vm.logs || [];
      if (logs.length === 0) {
        historyList.innerHTML = `<div style="text-align: center; color: #94A3B8; font-size: 11px; padding: 10px;">Chưa có lịch sử bảo dưỡng nào</div>`;
      } else {
        historyList.innerHTML = logs.map(l => `
          <div class="maint-history-item">
            <div>
              <strong style="color: #1E293B;">${l.name}</strong>
              <div style="color: #64748B; font-size: 10.5px;">${l.date} • ODO: ${l.odo || curOdo} km • ${l.paidBy === 'thinh' ? 'Thịnh trả' : 'Bu trả'}</div>
            </div>
            <div style="font-weight: 800; color: #E03131;">${this.formatMoney(l.cost || 0)}</div>
          </div>
        `).join('');
      }
    }
  }

  openMaintenanceModal() {
    const vm = this.data.vehicleMaintenance || {};
    const inputOdo = document.getElementById('modalInputOdo');
    if (inputOdo) inputOdo.value = vm.currentOdo || '';
    this.renderMaintenanceWidget();
    this.openModal('maintenanceModal');
  }

  handleUpdateOdo() {
    const input = document.getElementById('modalInputOdo');
    if (!input || !input.value) {
      alert('Vui lòng nhập số ODO hợp lệ');
      return;
    }
    const val = parseInt(input.value);
    if (val < 0) return;

    if (!this.data.vehicleMaintenance) this.data.vehicleMaintenance = {};
    this.data.vehicleMaintenance.currentOdo = val;
    this.saveState();
    this.renderMaintenanceWidget();
    this.showToast(`✓ Đã cập nhật số ODO xe: ${val.toLocaleString('vi-VN')} km!`);
  }

  quickLogMaintenance(type) {
    if (!this.data.vehicleMaintenance) this.data.vehicleMaintenance = {};
    const curOdo = this.data.vehicleMaintenance.currentOdo || 12850;
    const nowStr = new Date().toLocaleDateString('vi-VN');

    if (type === 'oil_engine') {
      this.data.vehicleMaintenance.lastOilChangeOdo = curOdo;
      if (!this.data.vehicleMaintenance.logs) this.data.vehicleMaintenance.logs = [];
      this.data.vehicleMaintenance.logs.unshift({
        id: 'maint-' + Date.now(),
        date: nowStr,
        odo: curOdo,
        type: 'oil_engine',
        name: 'Thay nhớt máy Motul Scooter',
        cost: 130000,
        paidBy: this.data.vehicle.currentDriverId || 'thinh',
        note: 'Ghi nhận nhanh tại mốc ' + curOdo + ' km'
      });
      this.showToast('✓ Đã cập nhật mốc thay nhớt máy mới!');
    } else if (type === 'oil_gear') {
      this.data.vehicleMaintenance.lastGearOilOdo = curOdo;
      if (!this.data.vehicleMaintenance.logs) this.data.vehicleMaintenance.logs = [];
      this.data.vehicleMaintenance.logs.unshift({
        id: 'maint-' + Date.now(),
        date: nowStr,
        odo: curOdo,
        type: 'oil_gear',
        name: 'Thay nhớt hộp số (láp)',
        cost: 45000,
        paidBy: this.data.vehicle.currentDriverId || 'thinh',
        note: 'Ghi nhận nhanh tại mốc ' + curOdo + ' km'
      });
      this.showToast('✓ Đã cập nhật mốc thay nhớt láp mới!');
    }

    this.saveState();
    this.renderMaintenanceWidget();
    this.renderSpliitSettlement();
  }

  handleSaveMaintenance(e) {
    e.preventDefault();
    const name = document.getElementById('maintNameInput').value;
    const cost = parseInt(document.getElementById('maintCostInput').value) || 0;
    const paidBy = document.getElementById('maintPaidBySelect').value;
    const note = document.getElementById('maintNoteInput').value;
    const curOdo = (this.data.vehicleMaintenance && this.data.vehicleMaintenance.currentOdo) || 12850;
    const nowStr = new Date().toLocaleDateString('vi-VN');

    if (!this.data.vehicleMaintenance.logs) this.data.vehicleMaintenance.logs = [];
    this.data.vehicleMaintenance.logs.unshift({
      id: 'maint-' + Date.now(),
      date: nowStr,
      odo: curOdo,
      type: 'repair',
      name: name,
      cost: cost,
      paidBy: paidBy,
      note: note
    });

    if (this.data.settlement) this.data.settlement.isSettled = false;

    if (!this.data.notes) this.data.notes = [];
    this.data.notes.unshift({
      id: 'note-' + Date.now(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      content: `${name} (${this.formatMoney(cost)}) • Chung 1 xe`,
      driver: paidBy === 'thinh' ? 'Thịnh' : 'Bu',
      date: nowStr,
      type: 'vehicle',
      tagColor: '#1971C2'
    });

    this.saveState();
    this.renderMaintenanceWidget();
    this.renderSpliitSettlement();
    this.renderNotes();
    this.closeModal('maintenanceModal');
    this.showToast('✓ Đã lưu chi phí bảo dưỡng & đồng bộ bù trừ 50-50!');
  }

  executeDailyClose() {
    const walletInput = document.getElementById('closeInputWallet');
    const fuelInput = document.getElementById('closeInputFuel');
    const otherInput = document.getElementById('closeInputOther');

    const walletVal = walletInput && walletInput.value ? parseInt(walletInput.value) : (this.data.todaySummary.walletRemaining || 0);
    const fuelVal = fuelInput && fuelInput.value ? parseInt(fuelInput.value) : 0;
    const otherVal = otherInput && otherInput.value ? parseInt(otherInput.value) : 0;

    if (fuelVal > 0) {
      this.data.dailyClosing.thinh.fuelExpense = fuelVal;
    }
    if (otherVal > 0) {
      this.data.dailyClosing.thinh.otherExpense = otherVal;
    }
    this.data.todaySummary.walletRemaining = walletVal;
    this.data.dailyClosing.walletRemaining = walletVal;
    this.data.dailyClosing.isClosed = true;

    // Lưu bản chốt vào lịch sử (PHẦN 12)
    const historyItem = {
      id: 'close-' + Date.now(),
      date: '12/09/2026',
      dateLabel: 'Thứ 6, 12/09/2026',
      totalRevenue: this.data.incomeOverview.total,
      cash: this.data.incomeOverview.cash,
      transfer: this.data.incomeOverview.transfer,
      walletRemaining: walletVal,
      tip: (this.data.dailyClosing.thinh.tip || 0) + (this.data.dailyClosing.bu.tip || 0),
      fuelExpense: (this.data.dailyClosing.thinh.fuelExpense || 0) + (this.data.dailyClosing.bu.fuelExpense || 0),
      otherExpense: (this.data.dailyClosing.thinh.otherExpense || 0) + (this.data.dailyClosing.bu.otherExpense || 0),
      photosCount: (this.data.closingImages || []).length,
      notesCount: (this.data.notes || []).length,
      tripsCount: (this.data.trips || []).length,
      thinhRev: this.data.incomeOverview.thinh.total,
      buRev: this.data.incomeOverview.bu.total,
      timestamp: new Date().toISOString()
    };

    if (!this.data.closedHistory) this.data.closedHistory = [];
    this.data.closedHistory.unshift(historyItem);

    this.recalculateBalances();
    this.saveState();
    this.renderAll();
    this.showToast('✓ Đã chốt sổ ngày Thứ 6, 12/09/2026 cho Thịnh & Bu!');

    if (window.grabSync) window.grabSync.broadcast('DAILY_CLOSE', { closing: this.data.dailyClosing });
    setTimeout(() => {
      this.navigateToScreen('screen-today');
    }, 600);
  }

  // ===================================================
  // 8. RENDER LỊCH SỬ CHỐT NGÀY (PHẦN 12)
  // ===================================================
  renderClosedHistory() {
    const container = document.getElementById('closedHistoryContainer');
    const countEl = document.getElementById('closedHistoryCount');
    if (!container) return;

    const list = this.data.closedHistory || [];
    if (countEl) countEl.textContent = `${list.length} ngày`;

    if (list.length === 0) {
      container.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 10px;">Chưa có ngày nào được chốt</div>`;
      return;
    }

    let html = '';
    list.forEach(item => {
      html += `
        <div class="card" style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px; cursor: pointer;" onclick="app.openHistoryDetail('${item.id}')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 13px; color: var(--text-main);">${item.dateLabel}</strong>
            <span class="badge-status completed dot" style="font-size: 10px;">Đã chốt</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted);">
            <span>Doanh thu: <strong style="color: var(--primary-green);">${this.formatMoney(item.totalRevenue)}</strong></span>
            <span>Ví còn: <strong>${this.formatMoney(item.walletRemaining)}</strong></span>
            <span>📷 ${item.photosCount} ảnh</span>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  openHistoryDetail(closedId) {
    const item = (this.data.closedHistory || []).find(h => h.id === closedId);
    if (!item) return;

    const titleEl = document.getElementById('historyDetailTitle');
    const contentEl = document.getElementById('historyDetailContent');
    if (!titleEl || !contentEl) return;

    titleEl.textContent = `Chi Tiết Bản Chốt: ${item.dateLabel}`;
    contentEl.innerHTML = `
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 10px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Tổng doanh thu:</span>
          <strong style="color: var(--primary-green); font-size: 15px;">${this.formatMoney(item.totalRevenue)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Tiền mặt:</span>
          <strong>${this.formatMoney(item.cash)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Chuyển khoản:</span>
          <strong>${this.formatMoney(item.transfer)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Tiền còn trong ví:</span>
          <strong>${this.formatMoney(item.walletRemaining)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Tiền tip:</span>
          <strong>${this.formatMoney(item.tip)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Tiền xăng:</span>
          <strong style="color: var(--accent-red);">${this.formatMoney(item.fuelExpense)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Chi phí khác:</span>
          <strong style="color: var(--accent-red);">${this.formatMoney(item.otherExpense)}</strong>
        </div>
      </div>
      <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
        <div>👤 Thịnh: ${this.formatMoney(item.thinhRev)} | Bu: ${this.formatMoney(item.buRev)}</div>
        <div>🚗 Tổng số chuyến: ${item.tripsCount} | 📝 Ghi chú: ${item.notesCount} | 📷 Ảnh: ${item.photosCount}</div>
      </div>
    `;

    this.openModal('historyDetailModal');
  }

  // ===================================================
  // 9. RENDER MÀN HÌNH HÔM NAY
  // ===================================================
  renderToday() {
    const setSafe = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    const curDriver = this.data.vehicle.currentDriverId || 'thinh';
    const dc = this.data.dailyClosing || {};
    // Nếu có dữ liệu per-driver (dailyClosing), dùng của driver đang chọn
    // Fallback về todaySummary (tổng 2 người) nếu chưa có
    const d = (curDriver === 'thinh' ? dc.thinh : dc.bu) || {};
    const s = this.data.todaySummary || {};

    const hasDriverData = d.trips != null;
    const trips     = hasDriverData ? (d.trips     || 0) : (s.trips || 0);
    const rev       = hasDriverData ? (d.revenue   || 0) : (s.totalRevenue || 0);
    const cash      = hasDriverData ? (d.cash      || 0) : (s.cash || 0);
    const transfer  = hasDriverData ? (d.transfer  || 0) : (s.transfer || 0);
    const fuel      = hasDriverData ? (d.fuelExpense   || 0) : (s.fuelExpense || 0);
    const other     = hasDriverData ? (d.otherExpense  || 0) : (s.otherExpense || 0);
    const net       = hasDriverData ? (d.netIncome || 0) : (s.netIncome || 0);

    setSafe('todaySumTrips', trips);
    setSafe('todaySumRev', this.formatMoney(rev));
    setSafe('todaySumCash', this.formatMoney(cash));
    setSafe('todaySumTransfer', this.formatMoney(transfer));
    setSafe('todaySumFuel', this.formatMoney(fuel));
    setSafe('todaySumOther', this.formatMoney(other));
    setSafe('todaySumNet', this.formatMoney(net));
    setSafe('todayWalletRemaining', this.formatMoney(s.walletRemaining || 0));

    // Đổi label theo driver
    const driverName = curDriver === 'thinh' ? 'Thịnh' : 'Bu';
    setSafe('todaySumNetLabel', `Thu nhập thực nhận ${driverName}`);
  }

  // ===================================================
  // QUÉT ẢNH TỰ ĐỘNG (TESSERACT.JS OCR ENGINES)
  // ===================================================
  async handleOcrScanTrip(fileInput) {
    if (!fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    const notice = document.getElementById('ocrScanningNotice');
    const bar = document.getElementById('ocrProgressBarFill');
    const pct = document.getElementById('ocrPercentText');
    const status = document.getElementById('ocrStatusText');

    if (notice) notice.style.display = 'block';
    if (bar) bar.style.width = '10%';
    if (pct) pct.textContent = '10%';
    if (status) status.textContent = '⏳ Tesseract OCR: Đang nạp mô hình...';

    try {
      const scanned = await window.grabOCR.scanImage(file, (percent) => {
        if (bar) bar.style.width = `${percent}%`;
        if (pct) pct.textContent = `${percent}%`;
        if (status) {
          status.textContent = percent < 90 ? `⏳ Tesseract OCR: Đang quét ký tự (${percent}%)...` : '✨ Đang trích xuất số tiền & chuyến...';
        }
      });

      if (scanned.amount) document.getElementById('tripAmountInput').value = scanned.amount;
      if (scanned.time) document.getElementById('tripTimeInput').value = scanned.time;
      if (scanned.paymentType) document.getElementById('tripTypeSelect').value = scanned.paymentType;
      if (scanned.note) document.getElementById('tripNoteInput').value = scanned.note;
      if (scanned.driverHint) {
        document.getElementById('tripDriverSelect').value = scanned.driverHint;
      }
      this.showToast(`✨ Tesseract OCR nhận diện (${scanned.method}): ${this.formatMoney(scanned.amount)} (${scanned.paymentType === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'})!`);
    } catch (e) {
      console.error(e);
      this.showToast('Không thể phân tích ảnh. Vui lòng nhập thủ công!');
    } finally {
      setTimeout(() => {
        if (notice) notice.style.display = 'none';
        if (bar) bar.style.width = '0%';
        if (pct) pct.textContent = '0%';
      }, 800);
      fileInput.value = '';
    }
  }

  async handleOcrScanExpense(fileInput) {
    if (!fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    const notice = document.getElementById('ocrExpenseScanningNotice');
    const bar = document.getElementById('ocrExpenseProgressBarFill');
    const pct = document.getElementById('ocrExpensePercentText');
    const status = document.getElementById('ocrExpenseStatusText');

    if (notice) notice.style.display = 'block';
    if (bar) bar.style.width = '10%';
    if (pct) pct.textContent = '10%';
    if (status) status.textContent = '⏳ Tesseract OCR: Đang nạp mô hình...';

    try {
      const scanned = await window.grabOCR.scanImage(file, (percent) => {
        if (bar) bar.style.width = `${percent}%`;
        if (pct) pct.textContent = `${percent}%`;
        if (status) {
          status.textContent = percent < 90 ? `⏳ Tesseract OCR: Đang quét hóa đơn (${percent}%)...` : '✨ Đang phân tích chi phí...';
        }
      });

      if (scanned.amount) document.getElementById('expenseAmountInput').value = scanned.amount;
      if (scanned.note) document.getElementById('expenseNoteInput').value = scanned.note;
      if (scanned.category === 'fuel_pump') {
        document.getElementById('expenseTypeSelect').value = 'fuel';
      } else if (scanned.category === 'maintenance') {
        document.getElementById('expenseTypeSelect').value = 'maintain';
      }
      if (scanned.driverHint) {
        document.getElementById('expenseDriverSelect').value = scanned.driverHint;
      }
      this.showToast(`✨ Tesseract OCR nhận diện hóa đơn (${scanned.method}): ${this.formatMoney(scanned.amount)}!`);
    } catch (e) {
      console.error(e);
      this.showToast('Không thể đọc hóa đơn. Vui lòng nhập số tiền tay!');
    } finally {
      setTimeout(() => {
        if (notice) notice.style.display = 'none';
        if (bar) bar.style.width = '0%';
        if (pct) pct.textContent = '0%';
      }, 800);
      fileInput.value = '';
    }
  }

  // Thao tác Tabs
  setOverviewPeriod(btn, period) {
    btn.parentElement.querySelectorAll('.pill-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    if (period === 'today') {
      this.recalculateBalances();
    } else if (period === 'week') {
      const curTotal = this.data.incomeOverview.total;
      this.data.incomeOverview.total = curTotal + 3630000;
      this.data.incomeOverview.thinh.total += 1880000;
      this.data.incomeOverview.bu.total += 1750000;
    } else {
      const curTotal = this.data.incomeOverview.total;
      this.data.incomeOverview.total = curTotal + 17980000;
      this.data.incomeOverview.thinh.total += 9480000;
      this.data.incomeOverview.bu.total += 8500000;
    }
    this.renderOverview();
    this.showToast(`Đã chuyển xem thống kê: ${btn.textContent}`);
  }

  setScheduleTab(btn, tab) {
    btn.parentElement.querySelectorAll('.pill-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    this.showToast(tab === 'personal' ? 'Hiển thị ca cá nhân' : 'Hiển thị lịch chung 2 người (1 xe)');
  }

  setIncomeTab(btn, tab) {
    btn.parentElement.querySelectorAll('.pill-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    this.showToast(`Thu nhập: ${btn.textContent}`);
  }

  setNoteMainTab(btn, tab) {
    btn.parentElement.querySelectorAll('.pill-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
  }

  setImageTab(btn, tab) {
    btn.parentElement.querySelectorAll('.pill-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    this.showToast(`Hình ảnh: ${btn.textContent}`);
  }

  setReportPeriod(btn, period) {
    btn.parentElement.querySelectorAll('.pill-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    this.showToast(`Báo cáo: ${btn.textContent}`);
  }

  prevScheduleDay() {
    if (this.selectedDay > 1) {
      this.selectCalendarDate(this.selectedDay - 1);
    } else {
      this.showToast('Đầu tháng 9/2026');
    }
  }

  nextScheduleDay() {
    const maxDays = new Date(this.currentCalYear, this.currentCalMonth, 0).getDate();
    if (this.selectedDay < maxDays) {
      this.selectCalendarDate(this.selectedDay + 1);
    } else {
      this.showToast('Cuối tháng 9/2026');
    }
  }

  openBottomSheet() {
    const modal = document.getElementById('bottomSheetModal');
    if (modal) modal.classList.add('active');
  }

  closeBottomSheet(e) {
    if (e && e.target !== e.currentTarget) return;
    const modal = document.getElementById('bottomSheetModal');
    if (modal) modal.classList.remove('active');
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const timeInput = modal.querySelector('input[type="time"]');
      if (timeInput && !timeInput.value) timeInput.value = timeStr;

      const curDeviceUser = localStorage.getItem('grab_current_user') || 'thinh';
      const driverSelect = modal.querySelector('#tripDriverSelect') || modal.querySelector('#scheduleDriverSelect') || modal.querySelector('#expenseDriverSelect');
      if (driverSelect) driverSelect.value = curDeviceUser;
    }
  }

  closeModal(modalId, e) {
    if (e && e.target !== e.currentTarget) return;
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  handleSaveExpense(e) {
    e.preventDefault();
    const driver = document.getElementById('expenseDriverSelect').value;
    const amount = parseInt(document.getElementById('expenseAmountInput').value) || 0;
    const note = document.getElementById('expenseNoteInput').value || 'Chi phí xe';
    const type = document.getElementById('expenseTypeSelect').value;
    const driverName = driver === 'thinh' ? 'Thịnh' : 'Bu';

    if (amount <= 0) {
      this.showToast('Vui lòng nhập số tiền chi phí hợp lệ!');
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (type === 'fuel') {
      this.data.dailyClosing[driver].fuelExpense = (this.data.dailyClosing[driver].fuelExpense || 0) + amount;
    } else {
      this.data.dailyClosing[driver].otherExpense = (this.data.dailyClosing[driver].otherExpense || 0) + amount;
    }

    const newNote = {
      id: 'note-' + Date.now(),
      time: timeStr,
      content: `${note} ${this.formatMoney(amount)}`,
      driver: driverName,
      date: '12/09/2026',
      type: 'expense',
      tagColor: '#1971C2'
    };

    if (!this.data.notes) this.data.notes = [];
    this.data.notes.unshift(newNote);
    this.recalculateBalances();
    this.saveState();
    this.renderAll();
    this.closeModal('expenseModal');
    if (e && e.target && typeof e.target.reset === 'function') e.target.reset();
    this.showToast(`Đã lưu chi phí ${this.formatMoney(amount)} của ${driverName}`);

    if (window.grabSync) window.grabSync.broadcast('ADD_NOTE', { note: newNote });
  }

  saveFinancialClosing() {
    const finWallet = document.getElementById('finWallet');
    const finFuel = document.getElementById('finFuel');
    const finOther = document.getElementById('finOther');
    
    if (finWallet) {
      const w = parseInt(finWallet.value.replace(/\D/g, '')) || 0;
      this.data.todaySummary.walletRemaining = w;
      this.data.dailyClosing.walletRemaining = w;
    }
    if (finFuel) {
      const f = parseInt(finFuel.value.replace(/\D/g, '')) || 0;
      this.data.dailyClosing.thinh.fuelExpense = f;
    }
    if (finOther) {
      const o = parseInt(finOther.value.replace(/\D/g, '')) || 0;
      this.data.dailyClosing.thinh.otherExpense = o;
    }
    this.saveState();
    this.recalculateBalances();
    this.renderAll();
    this.showToast('✓ Đã lưu chốt tài chính cuối ngày thành công!');
  }

  openWalletDetails() {
    const rem = (this.data.todaySummary && this.data.todaySummary.walletRemaining) || 0;
    this.showToast(`Số dư ví GrabDriver còn lại: ${this.formatMoney(rem)}`);
  }

  recordVoiceNote() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.interimResults = false;
      recognition.onstart = () => this.showToast('🎤 Đang lắng nghe bạn nói...');
      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        const input = document.getElementById('quickNoteInput');
        if (input) input.value = text;
        this.showToast(`Đã nhận diện: "${text}"`);
      };
      recognition.onerror = () => this.showToast('Không nhận diện được giọng nói.');
      recognition.start();
    } else {
      this.showToast('🎤 Đang ghi âm giọng nói... (Đã lưu mô phỏng)');
      const input = document.getElementById('quickNoteInput');
      if (input) input.value = 'Khách vừa gửi tip thêm 20k';
    }
  }

  toggleTripFilter() {
    this.showToast('Bộ lọc: Tất cả chuyến đi trong ngày');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new GrabApp();
});
