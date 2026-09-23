# FINTRACK PRO — REACT MIGRATION AUDIT & DEPENDENCY MAP

## 1. TỔNG QUAN KIẾN TRÚC HIỆN TẠI (CURRENT ARCHITECTURE)

FinTrack Pro hiện tại là ứng dụng Single Page Application (SPA / PWA) xây dựng theo mô hình Vanilla JavaScript hướng đối tượng kết hợp Firebase Client SDK.

```text
┌─────────────────────────────────────────────────────────────┐
│                      index.html                             │
│       (Mobile Viewport, Dynamic Island, 18+ App Screens)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
        ┌────────────┐  ┌─────────────┐  ┌───────────┐
        │   app.js   │  │firebase-sync│  │  data.js  │
        │(FinanceApp)│  │(GrabCloud)  │  │(DEFAULT)  │
        └──────┬─────┘  └──────┬──────┘  └─────┬─────┘
               │               │               │
               ▼               ▼               ▼
        ┌────────────┐  ┌─────────────┐  ┌───────────┐
        │ ocr-engine │  │  /ai/*      │  │ style.css │
        │ (GrabOCR)  │  │ (AIAgent)   │  │ (Vanilla) │
        └────────────┘  └─────────────┘  └───────────┘
```

### Các lớp kiến trúc cốt lõi:
1. **Financial Source of Truth (SSOT)**:
   - `users/{uid}/transactions` (Firestore Subcollection): Sổ cái tài chính bất biến. Mỗi giao dịch có `id` ổn định (idempotency key), `amount`, `type`, `account`, `isoDate`.
   - `users/{uid}/wallets` (Firestore Subcollection): Materialized Projection (bản chiếu số dư tức thời của Ví Tiền mặt và Ví Ngân hàng).
   - `fintrack_user_data/{roomId}`: Legacy snapshot document, chỉ đóng vai trò backup/fallback nếu subcollection rỗng.
2. **Reconciliation Engine**:
   - `reconcileBalancesFromLedger()`: Khôi phục và đối soát số dư ví từ 100% lịch sử giao dịch trong Ledger. Nếu phát hiện sai lệch (drift), ví tự động căn chỉnh theo Ledger.
3. **Atomic Transfers**:
   - `executeAtomicTransfer()`: Sử dụng Firestore `runTransaction` để bảo đảm tính nguyên tử (ACID). Nếu số dư ví nguồn không đủ hoặc xảy ra lỗi mạng giữa chừng, toàn bộ giao dịch rollback hoàn toàn.
4. **Offline Queue & Reconnection**:
   - Lưu trữ tại `localStorage.getItem('fintrack_offline_queue_' + uid)`.
   - Khi có kết nối lại, `reconcileOfflineQueue()` chia nhỏ các batch (Chunking 400 ops/batch) và đẩy tuần tự lên Cloud.
5. **AI Agent Domain Layer (`/ai`)**:
   - Tách biệt hoàn toàn trong thư mục `/ai` (`ai-schema.js`, `ai-validator.js`, `ai-provider.js`, `expense-parser.js`, `financial-insights.js`, `receipt-parser.js`, `ai-agent.js`).
   - Tuân thủ nguyên tắc: `AI ≠ Financial Source of Truth`. AI chỉ tạo Structured Proposal; Deterministic Validator kiểm tra số học và múi giờ; Người dùng bắt buộc phải bấm Xác nhận trên UI trước khi ghi vào Ledger.

---

## 2. BẢN ĐỒ PHỤ THUỘC (DEPENDENCY MAP)

```text
index.html
├── data.js (exports DEFAULT_FINANCE_DATA, STORAGE_FINANCE_KEY)
├── ocr-engine.js (window.grabOCR)
├── firebase-sync.js (window.grabSync -> Firebase Firestore SDK)
├── ai/ai-schema.js
├── ai/ai-validator.js (requires ai-schema)
├── ai/ai-provider.js (requires ai-validator)
├── ai/expense-parser.js (requires ai-schema, ai-validator)
├── ai/financial-insights.js (requires ai-schema)
├── ai/receipt-parser.js (requires ai-schema, ai-validator)
├── ai/ai-agent.js (requires all /ai/* modules -> window.AIAgent)
└── app.js (window.app = new FinanceApp())
      ├── calls window.grabSync.writeTransactionDoc()
      ├── calls window.grabSync.writeWalletDoc()
      ├── calls window.grabSync.executeAtomicTransfer()
      ├── calls window.grabSync.reconcileOfflineQueue()
      ├── calls window.grabSync.syncPublicProfile()
      ├── calls window.grabSync.searchPublicUsers()
      ├── calls window.aiAgent.parseExpense()
      ├── calls window.aiAgent.generateFinancialInsights()
      ├── calls window.aiAgent.parseReceiptImage()
      └── binds DOM events for 18 screens and 4 modals
```

### Chi tiết phụ thuộc trong Test Suites:
- `test_backend_logic.js`: Kiểm thử độc lập logic nghiệp vụ tài chính sạch (Invariants, Transfer, Budget, XSS, parseVND).
- `verify_final.js`: Kiểm tra tĩnh source code (`fs.readFileSync('firebase-sync.js')`, `fs.readFileSync('app.js')`), kiểm thử bảo mật Firestore Rules, chống UID Spoofing, RBAC, Atomic Transfer Rollback, Multi-Device Concurrency, Scale 100k txs, Timezone `Asia/Ho_Chi_Minh`.
- `test_ledger_ssot.js`: Kiểm thử Ledger là nguồn chân thực duy nhất, phát hiện và sửa drift số dư ví.
- `test_idempotency.js`: Kiểm thử tính lũy đẳng (chống ghi trùng khi retry mạng).
- `test_offline_queue.js`: Kiểm thử chunking batch của hàng đợi ngoại tuyến.
- `test_friend_search.js`: Kiểm thử thuật toán tìm kiếm người dùng thật trên Firestore Directory.
- `test_ai_*.js` (6 test suites): Kiểm thử schema, validation, parser, idempotency, insights, và OCR.

---

## 3. PHÂN LOẠI 118 PHƯƠNG THỨC TRONG `app.js` (CODE CLASSIFICATION)

Toàn bộ 118 methods của class `FinanceApp` trong `app.js` được phân loại chuẩn xác theo 11 miền trách nhiệm:

| Nhóm chức năng | Số lượng | Danh sách các phương thức | Hướng xử lý khi migrate sang React |
| :--- | :---: | :--- | :--- |
| **FINANCIAL DOMAIN** | 6 | `reconcileBalancesFromLedger`, `recalculateBalances`, `executeTransfer`, `addFundToGoal`, `parseVND`, `formatVND` | **Trích xuất nguyên vẹn** sang `src/domain/finance.js` & `src/domain/reconciliation.js`. Không phụ thuộc DOM, không phụ thuộc React. |
| **FIREBASE DATA ACCESS** | 10 | `writeTransactionDoc`, `writeWalletDoc`, `executeAtomicTransfer`, `reconcileOfflineQueue`, `loadFirestoreLedger`, `syncLeaderboardEntry`, `syncPublicProfile`, `searchPublicUsers`, `syncFriendToCloud`, `removeFriendFromCloud` | Giữ nguyên trong `firebase-sync.js` và bọc qua `src/services/*Service.js` để React hooks tiêu thụ an toàn. |
| **STATE & STORAGE** | 6 | `initData`, `saveData`, `resetAllDataClean`, `saveSetting`, `saveLocalAccount`, `removeLocalAccount`, `getLocalAccounts` | Chuyển thành React Context / Custom Hooks (`useFinanceData`, `useSettings`). |
| **AUTH DOMAIN** | 6 | `initAuthListener`, `switchAuthTab`, `togglePasswordVisibility`, `normalizeUserToEmail`, `loginAsGuest`, `handleLoginSuccess`, `logout` | Đóng gói thành `src/hooks/useAuth.js` và `src/services/authService.js`. |
| **AI AGENT DOMAIN** | 15 | `initAIAgent`, `saveAISettings`, `toggleAIFeature`, `changeAIProvider`, `saveGeminiApiKey`, `openAIAssistantModal`, `closeAIAssistantModal`, `fillAIPrompt`, `handleAIExtractSubmit`, `openAIProposalModal`, `closeAIProposalModal`, `renderAIProposals`, `commitConfirmedAITransactions`, `openAIInsightsModal`, `closeAIInsightsModal` | Chuyển các hàm UI thành React Modals (`AIAssistantModal`, `AIProposalModal`, `AIInsightsModal`). Nghiệp vụ AI gọi qua `src/services/aiService.js` trỏ vào `/ai`. |
| **OCR DOMAIN** | 2 | `handleReceiptImage`, `handleReceiptFileSelected` | Chuyển thành `src/services/ocrService.js` tái sử dụng `ocr-engine.js`. |
| **UTILITY** | 12 | `escapeHtml`, `generateAppUUID`, `getDefaultAvatarUrl`, `getAvatarUrl`, `generateFriendTag`, `getMyFriendTag`, `getCategoryIcon`, `initClock`, `initViewportHeight`, `animateNumber`, `showToast`, `playCoinSound`, `triggerConfetti`, `triggerHaptic`, `initCurrencyMasks`, `initPullToRefresh` | Chuyển sang `src/utils/` và custom UI hooks (`useToast`, `useAudio`). |
| **UI & NAVIGATION** | 61 | `navTo`, `goBack`, `updateBottomNavState`, `renderDashboard`, `renderDashboardChart`, `updateDashboardChart`, `renderCalendar`, `selectCalendarDate`, `changeMonth`, `setCalendarView`, `renderCalendarDayDetail`, `renderTransactionsList`, `loadMoreTransactions`, `filterTxTab`, `searchTransactions`, `openAddTx`, `setAddType`, `formatAddAmount`, `quickFill`, `openCategorySheet`, `chooseCategory`, `closeCategorySheet`, `selectAccount`, `openAccountSheet`, `submitNewTransaction`, `renderRanking`, `setRankingMetric`, `setRankingPeriod`, `toggleRankPrivacy`, `renderGroups`, `setGroupPeriod`, `renderBudgets`, `renderGoals`, `openNewGoalModal`, `closeNewGoalModal`, `submitNewGoal`, `renderAnalyticsCharts`, `setAnalyticsPeriod`, `renderIncomeSources`, `renderIncomeSourcesPie`, `renderWallets`, `openTransferModal`, `handleTransferFromChange`, `closeTransferModal`, `renderNotifications`, `filterNotifs`, `applyTheme`, `toggleDarkMode`, `renderProfile`, `renderFriends`, `switchFriendsTab`, `clearFriendSearch`, `searchAndAddFriend`, `renderFriendSearchResults`, `confirmAddFriend`, `acceptFriendRequest`, `declineFriendRequest`, `removeFriend`, `inviteFriendToGroup`, `copyMyFriendTag`, `openFriendQrModal`, `closeFriendQrModal`, `renderAll` | **Chuyển thành các React Components và Pages**. Sử dụng React state thay vì trực tiếp thao tác `innerHTML` trên DOM. |

---

## 4. CÁC LUỒNG TÀI CHÍNH TỐI QUAN TRỌNG (FINANCIAL CRITICAL PATHS)

### Luồng 1: Thêm Giao dịch Mới (Transaction Ingestion Path)
```text
React AddTransaction Form / AI Proposal Confirm
                     │
                     ▼
       validate inputs (amount > 0, date, wallet)
                     │
                     ▼
       newTx = { id: stableUUID, ...tx }
                     │
                     ▼
       data.transactions.unshift(newTx)
                     │
                     ▼
       targetWallet.balance +=/- amount
                     │
                     ▼
       recalculateBalances()
                     │
                     ▼
       saveData() (localStorage)
                     │
                     ▼
       firebase-sync: writeTransactionDoc(newTx)
       firebase-sync: writeWalletDoc(walletId, walletData)
                     │
                     ▼
       reconcileBalancesFromLedger() -> Drift Check (drift == 0)
```

### Luồng 2: Chuyển Tiền Liên Ví (Atomic Transfer Path)
```text
React Transfer Modal
         │
         ▼
Validate: fromWallet != toWallet, amount <= fromWallet.balance
         │
         ▼
transferService.executeTransfer()
         │
         ▼
firebase-sync: executeAtomicTransfer()
         │
         ▼
Firestore runTransaction (ACID)
  - Đọc fromRef, toRef, txRef
  - Kiểm tra txDoc.exists (Idempotency)
  - Kiểm tra fromDoc.balance >= amount
  - Ghi fromRef, toRef, txRef đồng thời
         │
         ▼
Cập nhật Local Projection & reconcileBalancesFromLedger()
```

### Luồng 3: Đồng Bộ Ngược Realtime Từ Ledger (Realtime Sync & Reconciliation)
```text
Firestore users/{uid}/transactions onSnapshot
                     │
                     ▼
Nhận cloudTxs[] -> Hợp nhất với local offline txs (deduplicate by id)
                     │
                     ▼
Sắp xếp theo ngày giảm dần
                     │
                     ▼
reconcileBalancesFromLedger() (Tính lại số dư ví từ 100% Ledger)
                     │
                     ▼
Cập nhật React State qua Custom Hook (Không render lại nếu không có thay đổi)
```

---

## 5. RỦI RO CHUYỂN ĐỔI (MIGRATION RISKS) & BIỆN PHÁP KIỂM SOÁT

| Rủi ro | Mức độ | Hậu quả tiềm ẩn | Biện pháp kiểm soát bắt buộc |
| :--- | :---: | :--- | :--- |
| **Phá vỡ kiểm tra tĩnh trong `verify_final.js`** | **CAO** | `verify_final.js` đọc `app.js` và `firebase-sync.js` bằng `fs.readFileSync` để kiểm tra chuỗi `executeAtomicTransfer`, `runTransaction`. Nếu xóa hoặc đổi tên file cũ, test suite sẽ FAIL. | **Không xóa hoặc làm hỏng `app.js` và `firebase-sync.js`**. Duy trì facade tương thích, cho phép React nạp trực tiếp hoặc import từ cùng một engine. |
| **React Re-render sinh duplicate transactions** | **CAO** | Khi re-render component form, nếu bấm submit nhiều lần có thể tạo nhiều transaction ID khác nhau. | Gắn stable client-generated UUID trước khi gửi, disable nút submit khi đang xử lý (`isSubmittingTx`). |
| **Mất tính lũy đẳng (Idempotency)** | **CAO** | Retry mạng hoặc đồng bộ offline tạo bản ghi trùng lặp. | Giữ nguyên cơ chế deduplicate theo `tx.id` trên cả Client RAM, Offline Queue và Firestore. |
| **Lọt rò rỉ bộ nhớ từ Firestore Listener** | **TRUNG BÌNH** | Mỗi React component mount lại gọi `onSnapshot` tạo hàng chục listener chạy ngầm. | Chỉ duy trì duy nhất 1 listener ở cấp độ Service/Root Provider, component chỉ subscribe qua Context hoặc hook. |
| **Xáo trộn giao diện PWA di động** | **TRUNG BÌNH** | Giao diện bị vỡ layout trên iPhone/Android khi chuyển sang React. | Tái sử dụng hệ thống CSS tokens và layout viewport di động đã được nghiệm thu trong `style.css`. |

---

## 6. DANH MỤC TỆP TIN (FILE MANAGEMENT STRATEGY)

### A. Tệp BẢO TỒN NGUYÊN VẸN (Files to Preserve)
- `firestore.rules`: Quy tắc bảo mật Firestore (không được sửa).
- `firebase.json`: Cấu hình Firebase Hosting/Firestore.
- `manifest.json` & `sw.js`: Cấu hình PWA và Service Worker offline.
- `migrate_legacy_data.js`: Công cụ di trú dữ liệu cũ.
- Toàn bộ các tệp test:
  - `test_backend_logic.js`
  - `test_concurrency.js`
  - `test_firestore_security.js`
  - `test_friend_search.js`
  - `test_idempotency.js`
  - `test_ledger_ssot.js`
  - `test_migration.js`
  - `test_offline_queue.js`
  - `test_scale.js`
  - `verify_final.js`
  - `test_ai_*.js` (6 file test AI)

### B. Tệp DI TRÚ LOGIC / TẠO MỚI (Files to Migrate / Create)
- `src/domain/`:
  - `finance.js`: Tính toán số dư, thu, chi, tăng trưởng, ngân sách, mục tiêu.
  - `reconciliation.js`: Đối soát Ledger SSOT, phát hiện và sửa drift.
- `src/services/`:
  - `firebaseService.js`: Wrapper an toàn cho Firestore và Realtime Sync.
  - `transactionService.js`: Xử lý thêm, sửa, xóa, tìm kiếm giao dịch.
  - `transferService.js`: Xử lý chuyển tiền nguyên tử (Atomic Transfer).
  - `aiService.js`: Giao tiếp với `/ai` domain.
  - `ocrService.js`: Giao tiếp với `ocr-engine.js`.
- `src/context/`:
  - `AuthContext.jsx`: Cung cấp thông tin xác thực Firebase.
  - `FinanceContext.jsx`: Cung cấp state và các action tài chính.
- `src/components/`:
  - `BottomNav.jsx`: Thanh điều hướng 5 tab.
  - `iOSStatusBar.jsx`: Dynamic Island & thanh trạng thái.
  - `TransactionCard.jsx`, `WalletCard.jsx`, `BudgetCard.jsx`, `GoalCard.jsx`.
  - `Modals/`: QuickAction, AddTransaction, TransferModal, AIAssistantModal, AIProposalModal, AIInsightsModal.
- `src/pages/`:
  - `Dashboard.jsx`, `CalendarPage.jsx`, `TransactionsPage.jsx`, `RankingPage.jsx`, `GroupsPage.jsx`, `BudgetsPage.jsx`, `GoalsPage.jsx`, `AnalyticsPage.jsx`, `WalletsPage.jsx`, `FriendsPage.jsx`, `SettingsPage.jsx`.

### C. Tệp TẠM THỜI DUY TRÌ & KHÔNG XÓA SỚM (Files to Keep for Backward Compatibility)
- `app.js` & `firebase-sync.js`: Duy trì để đảm bảo 100% test suite cũ (`verify_final.js`, `test_ledger_ssot.js`, v.v.) tiếp tục PASS mà không bị ảnh hưởng.
- `data.js`: Cung cấp hằng số `DEFAULT_FINANCE_DATA`.
- `ocr-engine.js`: Cung cấp engine OCR.
- `/ai/*`: Cung cấp AI Agent layer.
