/**
 * FINTRACK PRO — DETERMINISTIC AI VALIDATOR & NORMALIZER
 * Thực thi các kiểm tra số học, phân giải ví, danh mục, và múi giờ Asia/Ho_Chi_Minh
 * BẢO ĐẢM NGUYÊN TẮC: AI KHÔNG PHẢI FINANCIAL SOURCE OF TRUTH.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const schema = require('./ai-schema.js');
    module.exports = factory(schema);
  } else {
    root.AIValidator = factory(root.AISchema);
  }
})(typeof self !== 'undefined' ? self : this, function (AISchema) {
  'use strict';

  // Danh mục tiêu chuẩn trong FinTrack Pro
  const KNOWN_EXPENSE_CATEGORIES = [
    'Ăn uống', 'Xăng xe', 'Grab', 'Sửa xe', 'Sinh hoạt', 'Mua sắm', 
    'Phí đường bộ', 'Bảo hiểm', 'Khác'
  ];

  const KNOWN_INCOME_CATEGORIES = [
    'Grab', 'Kinh doanh', 'Lương', 'Thưởng', 'Khác'
  ];

  // Từ khóa ánh xạ danh mục tiếng Việt
  const CATEGORY_SYNONYMS = {
    'Ăn uống': ['ăn', 'uống', 'cà phê', 'cafe', 'cf', 'cơm', 'trưa', 'sáng', 'tối', 'phở', 'bún', 'trà sữa', 'bánh mì', 'nhậu'],
    'Xăng xe': ['xăng', 'petrolimex', 'ron 95', 'e5', 'dầu', 'đổ xăng', 'cây xăng'],
    'Grab': ['grab', 'cuốc', 'chuyến', 'chạy grab', 'khách', 'cước'],
    'Sửa xe': ['thay nhớt', 'nhớt', 'sửa xe', 'vá xe', 'rửa xe', 'bảo dưỡng', 'thay lốp', 'bình ắc quy'],
    'Sinh hoạt': ['điện', 'nước', 'tiền nhà', 'internet', 'wifi', 'rác', 'tiêu dùng'],
    'Mua sắm': ['mua đồ', 'quần áo', 'siêu thị', 'shopee', 'lazada', 'tiki', 'đồ dùng'],
    'Lương': ['lương', 'salary', 'thu nhập cố định'],
    'Thưởng': ['thưởng', 'bonus', 'tip', 'tiền boa']
  };

  /**
   * Lấy ngày hôm nay theo chuẩn múi giờ Asia/Ho_Chi_Minh (GMT+7)
   * Trả về định dạng YYYY-MM-DD
   */
  function getVietnamTodayDate(refDate = new Date()) {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(refDate); // Returns YYYY-MM-DD
    } catch (e) {
      // Fallback nếu môi trường không hỗ trợ IANA timezone
      const utc = refDate.getTime() + (refDate.getTimezoneOffset() * 60000);
      const vnTime = new Date(utc + (3600000 * 7));
      const y = vnTime.getFullYear();
      const m = String(vnTime.getMonth() + 1).padStart(2, '0');
      const d = String(vnTime.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  /**
   * Phân giải chuỗi thời gian tương đối sang YYYY-MM-DD (Asia/Ho_Chi_Minh)
   * @param {string} temporalHint 
   * @param {string|Date} baseDate 
   * @returns {string} YYYY-MM-DD
   */
  function resolveTemporalDate(temporalHint, baseDate = new Date()) {
    const todayStr = getVietnamTodayDate(baseDate instanceof Date ? baseDate : new Date(baseDate));
    if (!temporalHint) return todayStr;

    const lower = String(temporalHint).toLowerCase().trim();

    // Khớp ngày cụ thể dạng DD/MM hoặc DD-MM hoặc YYYY-MM-DD
    const isoMatch = lower.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return lower;

    const dmyMatch = lower.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?$/);
    if (dmyMatch) {
      const day = String(dmyMatch[1]).padStart(2, '0');
      const month = String(dmyMatch[2]).padStart(2, '0');
      const year = dmyMatch[3] || todayStr.split('-')[0];
      return `${year}-${month}-${day}`;
    }

    const [curY, curM, curD] = todayStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(curY, curM - 1, curD));

    if (/hôm nay|sáng nay|trưa nay|chiều nay|tối nay|vừa|vừa mới/i.test(lower)) {
      return todayStr;
    }
    if (/hôm qua|sáng qua|trưa qua|chiều qua|tối qua/i.test(lower)) {
      dateObj.setUTCDate(dateObj.getUTCDate() - 1);
      return dateObj.toISOString().slice(0, 10);
    }
    if (/hôm kia/i.test(lower)) {
      dateObj.setUTCDate(dateObj.getUTCDate() - 2);
      return dateObj.toISOString().slice(0, 10);
    }
    if (/tuần trước/i.test(lower)) {
      dateObj.setUTCDate(dateObj.getUTCDate() - 7);
      return dateObj.toISOString().slice(0, 10);
    }

    return todayStr;
  }

  /**
   * Phân giải Wallet Hint sang ví thực tế trong FinTrack Pro
   * @param {string} hint 
   * @param {Array<{id: string, name: string}>} availableWallets 
   * @returns {{ resolvedWallet: string|null, walletId: string|null, ambiguous: boolean }}
   */
  function resolveWallet(hint, availableWallets = [
    { id: 'acc-cash', name: 'Tiền mặt' },
    { id: 'acc-bank', name: 'Ngân hàng' }
  ]) {
    if (!hint || typeof hint !== 'string') {
      return { resolvedWallet: null, walletId: null, ambiguous: true };
    }

    const clean = hint.toLowerCase().trim();

    const isCash = /tiền mặt|tien mat|cash|ví tiền mặt|vi tien mat|ví giấy|vi giay|tiền túi/i.test(clean);
    const isBank = /ngân hàng|ngan hang|bank|chuyển khoản|ck|banking|vcb|vietcombank|momo|techcombank|mb|tpbank/i.test(clean);

    if (isCash && !isBank) {
      const w = availableWallets.find(w => w.name === 'Tiền mặt' || w.id === 'acc-cash');
      return { resolvedWallet: w ? w.name : 'Tiền mặt', walletId: w ? w.id : 'acc-cash', ambiguous: false };
    }

    if (isBank && !isCash) {
      const w = availableWallets.find(w => w.name === 'Ngân hàng' || w.id === 'acc-bank');
      return { resolvedWallet: w ? w.name : 'Ngân hàng', walletId: w ? w.id : 'acc-bank', ambiguous: false };
    }

    // Nếu chỉ nói "ví" hoặc không rõ ràng
    return { resolvedWallet: null, walletId: null, ambiguous: true };
  }

  /**
   * Phân giải Danh mục sang Category chuẩn
   * @param {string} hint 
   * @param {'income'|'expense'} type 
   * @returns {{ resolvedCategory: string, needsConfirmation: boolean }}
   */
  function resolveCategory(hint, type = 'expense') {
    if (!hint || typeof hint !== 'string') {
      return { resolvedCategory: 'Khác', needsConfirmation: true };
    }

    const clean = hint.trim();
    const allowed = type === 'income' ? KNOWN_INCOME_CATEGORIES : KNOWN_EXPENSE_CATEGORIES;

    // 1. Khớp chính xác
    const exact = allowed.find(c => c.toLowerCase() === clean.toLowerCase());
    if (exact) {
      return { resolvedCategory: exact, needsConfirmation: false };
    }

    // 2. Khớp từ đồng nghĩa với unicode word boundary
    const cleanLower = clean.toLowerCase();
    for (const [catName, keywords] of Object.entries(CATEGORY_SYNONYMS)) {
      if (allowed.includes(catName)) {
        for (const k of keywords) {
          const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'iu');
          if (regex.test(cleanLower)) {
            return { resolvedCategory: catName, needsConfirmation: false };
          }
        }
      }
    }

    // 3. Không thể suy diễn an toàn -> Cần người dùng xác nhận
    return { resolvedCategory: 'Khác', originalHint: clean, needsConfirmation: true };
  }

  /**
   * Tính toán và chuẩn hóa số tiền bằng Deterministic Math Engine
   * AI không được tự quyết định phép tính sai
   * @param {Object} tx 
   * @returns {{ amount: number, quantity?: number, unitPrice?: number }}
   */
  function normalizeAndVerifyAmount(tx) {
    let finalAmount = tx.amount;

    if (typeof tx.quantity === 'number' && typeof tx.unitPrice === 'number') {
      if (tx.quantity > 0 && tx.unitPrice > 0) {
        // Phép tính nhân deterministic
        const deterministicTotal = Math.round(tx.quantity * tx.unitPrice);
        finalAmount = deterministicTotal;
      }
    }

    // Làm tròn số nguyên đối với VNĐ
    finalAmount = Math.round(finalAmount);

    return {
      amount: finalAmount,
      quantity: tx.quantity,
      unitPrice: tx.unitPrice
    };
  }

  /**
   * Kiểm tra một đề xuất giao dịch có bị thiếu thông tin hoặc mơ hồ hay không
   * @param {string} text 
   * @returns {{ ambiguous: boolean, reason?: string }}
   */
  function checkAdversarialAndAmbiguity(text) {
    if (!text || typeof text !== 'string') {
      return { ambiguous: true, reason: 'Nội dung rỗng' };
    }

    const clean = text.toLowerCase().trim();

    // Mơ hồ: Không có số tiền hoặc chỉ nói chung chung
    const ambiguousPhrases = [
      'chiều nay trả tiền',
      'mua đồ',
      'vừa chuyển tiền',
      'trả nợ',
      'đi chợ',
      'vừa nhận tiền'
    ];

    if (ambiguousPhrases.includes(clean)) {
      return { ambiguous: true, reason: 'Thiếu số tiền hoặc thông tin giao dịch cụ thể' };
    }

    // Kiểm tra xem có chứa số hoặc đơn vị tiền tệ hợp lệ hay không (tránh match 'tr' trong 'transfer' hay 'instructions')
    const hasNumber = /\d+|((?:^|[^\p{L}\p{N}])(?:nghìn|ngàn|triệu|k)(?:[^\p{L}\p{N}]|$))/iu.test(clean);
    if (!hasNumber) {
      return { ambiguous: true, reason: 'Không tìm thấy số tiền trong câu' };
    }

    return { ambiguous: false };
  }

  /**
   * Chuẩn hóa và xác thực toàn diện một Transaction Proposal
   * @param {Object} rawProposal 
   * @param {Object} options 
   * @returns {{ status: 'VALID'|'NEEDS_CONFIRMATION'|'REJECTED', proposal: Object, errors: string[] }}
   */
  function validateAndNormalizeProposal(rawProposal, options = {}) {
    const errors = [];

    // 1. Phân giải ngày giờ theo múi giờ Việt Nam trước
    const resolvedDate = resolveTemporalDate(rawProposal ? rawProposal.date : null);
    const candidate = { ...(rawProposal || {}), date: resolvedDate };

    // 2. Validate Schema cơ bản
    const schemaCheck = AISchema.validateTransactionProposal(candidate);
    if (!schemaCheck.valid) {
      return {
        status: 'REJECTED',
        proposal: null,
        errors: schemaCheck.errors
      };
    }

    // 3. Deterministic Math Engine
    const { amount, quantity, unitPrice } = normalizeAndVerifyAmount(candidate);
    if (amount <= 0 || !Number.isFinite(amount)) {
      return {
        status: 'REJECTED',
        proposal: null,
        errors: ['Số tiền sau tính toán phải lớn hơn 0 và là số hữu hạn']
      };
    }

    // 4. Phân giải ví
    let resolvedWallet = null;
    let walletAmbiguous = false;
    let fromWallet = null;
    let toWallet = null;

    if (rawProposal.type === 'transfer') {
      const resFrom = resolveWallet(rawProposal.fromWalletHint, options.availableWallets);
      const resTo = resolveWallet(rawProposal.toWalletHint, options.availableWallets);
      fromWallet = resFrom.resolvedWallet;
      toWallet = resTo.resolvedWallet;
      if (resFrom.ambiguous || resTo.ambiguous || fromWallet === toWallet) {
        walletAmbiguous = true;
      }
    } else {
      const resWallet = resolveWallet(rawProposal.walletHint, options.availableWallets);
      resolvedWallet = resWallet.resolvedWallet;
      walletAmbiguous = resWallet.ambiguous;
    }

    // 5. Phân giải danh mục
    let resolvedCat = rawProposal.category;
    let catNeedsConfirm = false;
    if (rawProposal.type !== 'transfer') {
      const catRes = resolveCategory(rawProposal.category, rawProposal.type);
      resolvedCat = catRes.resolvedCategory;
      catNeedsConfirm = catRes.needsConfirmation;
    }

    // 6. Xây dựng Proposal hoàn chỉnh
    const normalized = {
      type: rawProposal.type,
      amount: amount,
      currency: 'VND',
      category: resolvedCat,
      wallet: resolvedWallet,
      walletHint: rawProposal.walletHint,
      fromWallet: fromWallet,
      toWallet: toWallet,
      fromWalletHint: rawProposal.fromWalletHint,
      toWalletHint: rawProposal.toWalletHint,
      date: resolvedDate,
      time: rawProposal.time || '12:00',
      description: String(rawProposal.description || '').slice(0, 200),
      quantity: quantity,
      unitPrice: unitPrice,
      walletAmbiguous: walletAmbiguous,
      categoryAmbiguous: catNeedsConfirm,
      requiresManualClarification: walletAmbiguous || catNeedsConfirm
    };

    const status = normalized.requiresManualClarification ? 'NEEDS_CONFIRMATION' : 'VALID';

    return {
      status,
      proposal: normalized,
      errors: []
    };
  }

  return {
    getVietnamTodayDate,
    resolveTemporalDate,
    resolveWallet,
    resolveCategory,
    normalizeAndVerifyAmount,
    checkAdversarialAndAmbiguity,
    validateAndNormalizeProposal,
    KNOWN_EXPENSE_CATEGORIES,
    KNOWN_INCOME_CATEGORIES
  };
});
