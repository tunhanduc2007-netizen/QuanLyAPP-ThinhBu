// Dữ liệu khởi tạo chuẩn: Trạng thái SẠCH (Clean State)
// 0 chuyến, 0 doanh thu, 0 chi phí, 0 note, 0 ảnh, chưa chốt ngày
const CLEAN_DATA = {
  vehicle: {
    model: "Air Blade 125",
    plate: "59E2-059.57",
    currentDriverId: "thinh", // Thịnh hoặc Bu
    status: "Sẵn sàng"
  },
  drivers: {
    thinh: {
      id: "thinh",
      name: "Thịnh",
      color: "#0C7247",
      avatarBg: "#E8F5E9",
      avatarColor: "#0C7247",
      status: "Sẵn sàng"
    },
    bu: {
      id: "bu",
      name: "Bu",
      color: "#1971C2",
      avatarBg: "#E7F5FF",
      avatarColor: "#1971C2",
      status: "Sẵn sàng"
    }
  },
  currentDate: "2026-09-12",
  displayDate: "Thứ 6, 12/09/2026",
  
  // Doanh thu ban đầu bằng 0
  incomeOverview: {
    total: 0,
    diffYesterday: 0,
    totalTrips: 0,
    cash: 0,
    transfer: 0,
    thinh: {
      total: 0,
      trips: 0,
      cash: 0,
      transfer: 0
    },
    bu: {
      total: 0,
      trips: 0,
      cash: 0,
      transfer: 0
    }
  },

  // Khung giờ chạy sạch: Tất cả đều Trống
  schedules: [
    { timeSlot: "05:00 - 08:00", thinh: "Trống", bu: "Trống", thinhStatus: "available", buStatus: "available" },
    { timeSlot: "08:00 - 11:00", thinh: "Trống", bu: "Trống", thinhStatus: "available", buStatus: "available" },
    { timeSlot: "11:00 - 13:00", thinh: "Trống", bu: "Trống", thinhStatus: "available", buStatus: "available" },
    { timeSlot: "13:00 - 16:00", thinh: "Trống", bu: "Trống", thinhStatus: "available", buStatus: "available" },
    { timeSlot: "16:00 - 19:00", thinh: "Trống", bu: "Trống", thinhStatus: "available", buStatus: "available" },
    { timeSlot: "19:00 - 22:00", thinh: "Trống", bu: "Trống", thinhStatus: "available", buStatus: "available" },
    { timeSlot: "22:00 - 00:00", thinh: "Trống", bu: "Trống", thinhStatus: "available", buStatus: "available" }
  ],

  // 0 chuyến đi
  trips: [],

  // 0 ghi chú
  notes: [],

  // 0 ảnh chứng từ
  closingImages: [],

  // Báo cáo ban đầu = 0
  reports: {
    overview: {
      revenue: 0,
      trips: 0,
      cash: 0,
      transfer: 0
    },
    thinh: {
      revenue: 0,
      cash: 0,
      transfer: 0,
      trips: 0,
      hours: "0h 00p"
    },
    bu: {
      revenue: 0,
      cash: 0,
      transfer: 0,
      trips: 0,
      hours: "0h 00p"
    },
    chartDays: [
      { date: "09/09", label: "09/09", thinh: 0, bu: 0 },
      { date: "10/09", label: "10/09", thinh: 0, bu: 0 },
      { date: "11/09", label: "11/09", thinh: 0, bu: 0 },
      { date: "12/09", label: "12/09", thinh: 0, bu: 0 }
    ]
  },

  // Bản chốt ngày ban đầu: Chưa chốt
  dailyClosing: {
    date: "Thứ 6, 12/09/2026",
    isClosed: false,
    walletRemaining: 0,
    fuelExpense: 0,
    otherExpense: 0,
    tip: 0,
    thinh: {
      status: "Chưa chốt",
      trips: 0,
      revenue: 0,
      cash: 0,
      transfer: 0,
      tip: 0,
      fuelExpense: 0,
      otherExpense: 0,
      netIncome: 0
    },
    bu: {
      status: "Chưa chốt",
      trips: 0,
      revenue: 0,
      cash: 0,
      transfer: 0,
      tip: 0,
      fuelExpense: 0,
      otherExpense: 0,
      netIncome: 0
    }
  },

  // Lịch sử các ngày đã chốt
  closedHistory: [],

  // Màn hình Hôm nay ban đầu = 0
  todaySummary: {
    quote: "Cố gắng mỗi ngày để ngày mai tốt hơn!",
    trips: 0,
    totalRevenue: 0,
    cash: 0,
    transfer: 0,
    fuelExpense: 0,
    otherExpense: 0,
    netIncome: 0,
    walletRemaining: 0,
    highlights: []
  },

  // LubeLogger - Nhật ký bảo dưỡng & cảnh báo định kỳ xe Air Blade 125
  vehicleMaintenance: {
    currentOdo: 0,
    oilChangeInterval: 1500,
    lastOilChangeOdo: 0,
    gearOilInterval: 5000,
    lastGearOilOdo: 0,
    airFilterInterval: 10000,
    lastAirFilterOdo: 0,
    logs: []
  },

  // Spliit - Lịch sử quyết toán nợ giữa Thịnh & Bu
  settlement: {
    lastSettledDate: null,
    history: []
  }
};

// Dữ liệu mẫu (Reference Demo) khi người dùng muốn nạp lại demo để đối chiếu UI
const DEMO_DATA = {
  vehicle: {
    model: "Air Blade 125",
    plate: "59E2-059.57",
    currentDriverId: "thinh",
    status: "Đang chạy"
  },
  drivers: {
    thinh: { id: "thinh", name: "Thịnh", color: "#0C7247", avatarBg: "#E8F5E9", avatarColor: "#0C7247", status: "Đang chạy" },
    bu: { id: "bu", name: "Bu", color: "#1971C2", avatarBg: "#E7F5FF", avatarColor: "#1971C2", status: "Sẵn sàng" }
  },
  currentDate: "2026-09-12",
  displayDate: "Thứ 6, 12/09/2026",
  incomeOverview: {
    total: 620000,
    diffYesterday: 120000,
    totalTrips: 12,
    cash: 320000,
    transfer: 300000,
    thinh: { total: 320000, trips: 6, cash: 180000, transfer: 140000 },
    bu: { total: 300000, trips: 6, cash: 140000, transfer: 160000 }
  },
  schedules: [
    { timeSlot: "05:00 - 08:00", thinh: "Đã chạy", bu: "Đã chạy", thinhStatus: "completed", buStatus: "completed" },
    { timeSlot: "08:00 - 11:00", thinh: "Đã chạy", bu: "Trống", thinhStatus: "completed", buStatus: "available" },
    { timeSlot: "11:00 - 13:00", thinh: "Nghỉ", bu: "Nghỉ", thinhStatus: "off", buStatus: "off" },
    { timeSlot: "13:00 - 16:00", thinh: "Trống", bu: "Đã chạy", thinhStatus: "available", buStatus: "completed" },
    { timeSlot: "16:00 - 19:00", thinh: "Trống", bu: "Trống", thinhStatus: "available", buStatus: "available" },
    { timeSlot: "19:00 - 22:00", thinh: "Trống", bu: "Trống", thinhStatus: "available", buStatus: "available" },
    { timeSlot: "22:00 - 00:00", thinh: "Trống", bu: "Trống", thinhStatus: "available", buStatus: "available" }
  ],
  trips: [
    { id: "trip-1", time: "08:15", amount: 50000, type: "cash", note: "Đón khách sân bay", driverId: "thinh" },
    { id: "trip-2", time: "09:40", amount: 70000, type: "transfer", note: "Đi chợ, 2 khách", driverId: "thinh" },
    { id: "trip-3", time: "11:20", amount: 45000, type: "cash", note: "Giao đồ ăn", driverId: "thinh" },
    { id: "trip-4", time: "13:10", amount: 60000, type: "transfer", note: "Đi công ty", driverId: "bu" },
    { id: "trip-5", time: "15:45", amount: 80000, type: "cash", note: "Đón khách sân bay", driverId: "bu" },
    { id: "trip-6", time: "17:30", amount: 100000, type: "transfer", note: "Đi tỉnh", driverId: "bu" }
  ],
  notes: [
    { id: "note-1", time: "21:30", content: "Khách chuyển khoản sau 50k", driver: "Thịnh", date: "12/09/2026", type: "income", tagColor: "#F59F00" },
    { id: "note-2", time: "19:40", content: "Đổ xăng 100k", driver: "Bu", date: "12/09/2026", type: "expense", tagColor: "#1971C2", hasImage: true, previewType: "petrol" },
    { id: "note-3", time: "18:20", content: "Khách tip 20k", driver: "Thịnh", date: "12/09/2026", type: "tip", tagColor: "#0C7247" },
    { id: "note-4", time: "16:10", content: "Xe hơi rung, kiểm tra lại 🔧", driver: "Bu", date: "12/09/2026", type: "vehicle", tagColor: "#1971C2" },
    { id: "note-5", time: "12:05", content: "Hủy chuyến (khách báo trễ)", driver: "Thịnh", date: "12/09/2026", type: "cancel", tagColor: "#E03131" },
    { id: "note-6", time: "09:30", content: "Có khoản cần kiểm tra lại", driver: "Bu", date: "12/09/2026", type: "warning", tagColor: "#868E96" }
  ],
  closingImages: [
    { id: "img-1", title: "Ảnh chốt đơn 20:30", time: "20:30", category: "app", description: "Tổng kết đơn app Grab Driver", previewType: "app_summary" },
    { id: "img-2", title: "GD ngân hàng 19:45", time: "19:45", category: "bank", description: "Chuyển khoản thành công +300.000đ", previewType: "bank_transfer" },
    { id: "img-3", title: "Đổ xăng 17:20", time: "17:20", category: "petrol", description: "Cột bơm xăng Petrolimex 100.000đ", previewType: "fuel_pump" },
    { id: "img-4", title: "Đồng hồ xe 16:10", time: "16:10", category: "odometer", description: "Số ODO 4523 km", previewType: "odometer" },
    { id: "img-5", title: "Hóa đơn chi phí 12:05", time: "12:05", category: "receipt", description: "Bảo dưỡng và vá vỏ 30.000đ", previewType: "receipt" }
  ],
  reports: {
    overview: { revenue: 1160000, trips: 22, cash: 600000, transfer: 560000 },
    thinh: { revenue: 620000, cash: 320000, transfer: 300000, trips: 12, hours: "8h 30p" },
    bu: { revenue: 540000, cash: 280000, transfer: 260000, trips: 10, hours: "7h 50p" },
    chartDays: [
      { date: "09/09", label: "09/09", thinh: 450000, bu: 380000 },
      { date: "10/09", label: "10/09", thinh: 520000, bu: 490000 },
      { date: "11/09", label: "11/09", thinh: 580000, bu: 620000 },
      { date: "12/09", label: "12/09", thinh: 620000, bu: 540000 }
    ]
  },
  dailyClosing: {
    date: "Thứ 6, 12/09/2026",
    isClosed: true,
    walletRemaining: 620000,
    fuelExpense: 190000,
    otherExpense: 30000,
    tip: 35000,
    thinh: { status: "Đã chốt", trips: 12, revenue: 620000, cash: 320000, transfer: 300000, tip: 20000, fuelExpense: 100000, otherExpense: 20000, netIncome: 520000 },
    bu: { status: "Đã chốt", trips: 10, revenue: 540000, cash: 280000, transfer: 260000, tip: 15000, fuelExpense: 90000, otherExpense: 10000, netIncome: 445000 }
  },
  closedHistory: [],
  todaySummary: {
    quote: "Cố gắng mỗi ngày để ngày mai tốt hơn!",
    trips: 22,
    totalRevenue: 1160000,
    cash: 600000,
    transfer: 560000,
    fuelExpense: 190000,
    otherExpense: 30000,
    netIncome: 965000,
    walletRemaining: 620000,
    highlights: ["Khách chuyển khoản sau 50k", "Đổ xăng 100k", "Có khoản cần kiểm tra lại"]
  },

  // LubeLogger - Nhật ký bảo dưỡng & cảnh báo định kỳ xe Air Blade 125
  vehicleMaintenance: {
    currentOdo: 12850,
    oilChangeInterval: 1500,
    lastOilChangeOdo: 11500, // Đã chạy 1350 km -> Còn 150 km sắp tới hạn (Vàng)
    gearOilInterval: 5000,
    lastGearOilOdo: 10000, // Đã chạy 2850 km -> Còn 2150 km (Xanh)
    airFilterInterval: 10000,
    lastAirFilterOdo: 5000,
    logs: [
      { id: "maint-1", date: "01/09/2026", odo: 11500, type: "oil_engine", name: "Thay nhớt máy Motul Scooter", cost: 130000, paidBy: "thinh", note: "Định kỳ tại tiệm sửa xe chú Bảy" },
      { id: "maint-2", date: "15/08/2026", odo: 10000, type: "oil_gear", name: "Thay nhớt hộp số (láp)", cost: 45000, paidBy: "bu", note: "Nhớt láp Castrol Scooter" },
      { id: "maint-3", date: "10/08/2026", odo: 9800, type: "tire", name: "Vá vỏ xe sau", cost: 30000, paidBy: "thinh", note: "Dính đinh đường Nguyễn Thị Minh Khai" }
    ]
  },

  // Spliit - Lịch sử quyết toán nợ giữa Thịnh & Bu
  settlement: {
    lastSettledDate: "11/09/2026",
    history: [
      { id: "set-1", date: "11/09/2026", payer: "bu", receiver: "thinh", amount: 65000, note: "Quyết toán tiền chia nhớt máy & tiền mặt chốt ngày" }
    ]
  }
};

// Mặc định nạp dữ liệu sạch
const INITIAL_DATA = CLEAN_DATA;
