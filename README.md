# FinTrack Pro — Quản Lý Tài Chính & Sổ Cái SSOT

Ứng dụng quản lý tài chính cá nhân & nhóm chuẩn di động (PWA), xây dựng trên nền tảng **React 18 & Vite** với kiến trúc Sổ Cái bất biến (**Firestore Ledger SSOT**), chuyển tiền nguyên tử (**Atomic Transfers**), và **AI Trợ Lý Tài Chính**.

---

## 🏛️ Kiến Trúc Hệ Thống (Architectural Layers)

```text
┌────────────────────────────────────────────────────────┐
│                   React 18 UI Layer                    │
│                                                        │
│ DashboardPage, CalendarPage, TransactionsPage,         │
│ WalletsPage, RankingPage, FriendsPage, SettingsPage    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                Application Services Layer              │
│                                                        │
│ firebaseService (CRUD, Sync, Batch Chunking)           │
│ aiService (Facade -> AI Agent Domain)                  │
│ ocrService (Facade -> Tesseract OCR Engine)            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Deterministic Finance Domain             │
│                                                        │
│ calculateOverview(), calculateNetCashFlow(),           │
│ reconcileBalancesFromLedger(), parseVND(), formatVND() │
│ (Hàm thuần túy, 0 phụ thuộc DOM, 0 phụ thuộc React)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                Firestore Ledger SSOT                   │
│                                                        │
│ users/{uid}/transactions = Sổ Cái Bất Biến (SSOT)      │
│ users/{uid}/wallets      = Materialized Projection     │
│ Offline Queue            = 400 ops Batch Chunking      │
│ Firestore Rules          = RBAC, IDOR & Chống Spoofing │
└────────────────────────────────────────────────────────┘
```

---

## 📁 Cấu Trúc Thư Mục (Project Structure)

```text
fintrack-pro/
├── src/                      # Toàn bộ mã nguồn ứng dụng React
│   ├── app/                  # App shell & Providers
│   ├── components/           # Components dùng chung & Modals
│   │   ├── layout/           # BottomNav, Toast, Status Bar
│   │   └── modals/           # AddTransaction, Transfer, AI Modals...
│   ├── constants/            # Dữ liệu sạch ban đầu (data.js, defaultData.js)
│   ├── context/              # AuthContext, FinanceContext
│   ├── domain/               # Logic tài chính thuần túy (finance.js, reconciliation.js)
│   ├── pages/                # Màn hình giao diện (Dashboard, Calendar, Wallets...)
│   ├── services/             # Dịch vụ tích hợp (firebase, ai, ocr)
│   │   ├── ai/               # AI Agent, parser, validator, insights
│   │   ├── firebase/         # Firebase sync engine & Firestore wrapper
│   │   └── ocr/              # Tesseract OCR receipt scanner
│   └── styles/               # CSS stylesheet hệ thống (style.css)
│
├── tests/                    # Toàn bộ 16 test suites tự động
│   ├── backend/              # Kiểm thử logic nghiệp vụ số học
│   ├── concurrency/          # Kiểm thử đồng thời đa thiết bị
│   ├── security/             # Kiểm thử Firestore Security Rules & IDOR
│   ├── friends/              # Kiểm thử tìm kiếm người dùng thật
│   ├── ledger/               # Kiểm thử Ledger SSOT, Drift & Idempotency
│   ├── migration/            # Kiểm thử di dời dữ liệu lịch sử
│   ├── offline/              # Kiểm thử hàng đợi offline chunking
│   ├── scale/                # Kiểm thử hiệu năng 100k transactions
│   ├── ai/                   # Kiểm thử Schema, Validator, Parser, Insights
│   └── fixtures/             # Dữ liệu baseline kiểm thử (127 txs)
│
├── scripts/                  # Scripts nghiệp vụ & kiểm định
│   ├── verify_final.js       # Script kiểm tra tổng hợp chuyên sâu 11 tiêu chí
│   ├── migrate_legacy_data.js# Script di dời dữ liệu lịch sử
│   └── audit_backend_deep.js # Công cụ kiểm tra sâu backend
│
├── docs/                     # Tài liệu kiến trúc & báo cáo nghiệm thu
│   ├── architecture/         # Bản vẽ kiến trúc & cấu trúc project
│   ├── audits/               # Báo cáo audit backend & audit migration
│   ├── migration/            # Báo cáo nghiệm thu React Migration
│   ├── reports/              # Báo cáo kiểm định tổng thể
│   └── legacy/               # Mã nguồn Vanilla JS lưu trữ tham chiếu
│
├── public/                   # Static assets (favicons, PWA icons)
│
├── firestore.rules           # Quy tắc bảo mật Firestore Cloud
├── firebase.json             # Cấu hình Firebase Hosting & Emulator
├── package.json              # Khai báo dependencies & test scripts
├── vite.config.mjs           # Cấu hình Vite bundler & path alias
├── index.html                # Entry point HTML
├── manifest.json             # Cấu hình PWA Web App Manifest
├── sw.js                     # Service Worker PWA
└── README.md                 # Tài liệu hướng dẫn sử dụng
```

---

## 🚀 Khởi Chạy Ứng Dụng (Getting Started)

### Cài đặt dependencies:
```bash
npm install
```

### Chạy môi trường phát triển (Dev Server):
```bash
npm run dev
# Mở trình duyệt tại http://localhost:3000
```

### Đóng gói sản phẩm (Production Build):
```bash
npm run build
```

---

## 🧪 Chạy Kiểm Thử (Running Tests)

FinTrack Pro có bộ test suite tự động 16 kịch bản không phụ thuộc bất kỳ framework giả lập nào:

```bash
# Chạy bộ test nghiệp vụ cốt lõi:
npm test

# Chạy toàn bộ 16 test suites:
npm run test:all

# Chạy riêng bộ test AI Agent:
npm run test:ai

# Chạy script kiểm định tổng thể:
npm run verify
```

---

## 🛡️ Nguyên Tắc Bất Biến Tài Chính

1. **Sổ Cái Bất Biến (Ledger SSOT)**: Mọi số dư ví, báo cáo thu chi, và hạn mức ngân sách đều được tính toán và đối soát từ `users/{uid}/transactions`.
2. **React State $\ne$ Source of Truth**: Trạng thái React chỉ là bộ đệm hiển thị (UI Cache).
3. **AI $\ne$ Financial Source of Truth**: AI chỉ đóng vai trò trợ lý đề xuất; người dùng bắt buộc phải bấm xác nhận trên giao diện trước khi ghi vào Sổ Cái.
4. **Tính Lũy Đẳng (Idempotency)**: Mỗi giao dịch có UUID duy nhất, chống ghi trùng lặp khi retry mạng.
5. **Chuyển Tiền Nguyên Tử (Atomic Transfers)**: Chuyển tiền giữa các ví thực thi qua Firestore `runTransaction`, chống thất thoát tiền tệ khi gặp sự cố mạng giữa chừng.
