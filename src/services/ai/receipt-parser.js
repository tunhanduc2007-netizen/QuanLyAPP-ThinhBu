/**
 * FINTRACK PRO — RECEIPT & BANK TRANSFER PARSER
 * Trích xuất giao dịch từ ảnh hóa đơn hoặc biên lai chuyển khoản ngân hàng
 * Bảo đảm quyền riêng tư: Xóa bỏ dữ liệu ảnh tạm ngay sau khi hoàn thành trích xuất
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const schema = require('./ai-schema.js');
    const validator = require('./ai-validator.js');
    module.exports = factory(schema, validator);
  } else {
    root.ReceiptParser = factory(root.AISchema, root.AIValidator);
  }
})(typeof self !== 'undefined' ? self : this, function (AISchema, AIValidator) {
  'use strict';

  class ReceiptParser {
    constructor(provider) {
      this.provider = provider;
    }

    setProvider(provider) {
      this.provider = provider;
    }

    /**
     * Xử lý ảnh hóa đơn hoặc biên lai chuyển khoản
     * @param {string|File} imageSource (dataUrl hoặc File)
     * @param {Object} options 
     * @returns {Promise<{ status: string, proposal: Object, errors: Array }>}
     */
    async parseReceipt(imageSource, options = {}) {
      const aiRequestId = options.aiRequestId || `receipt-${Date.now()}`;
      let temporaryBuffer = null;

      try {
        let dataUrl = imageSource;
        if (typeof File !== 'undefined' && imageSource instanceof File) {
          dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(imageSource);
          });
        }

        // Lưu tạm để xử lý
        temporaryBuffer = dataUrl;

        // Gọi Vision provider
        const rawExtraction = await this.provider.analyzeImage({
          imageSource: temporaryBuffer,
          prompt: 'Trích xuất số tiền, ngày, giờ, nơi bán hoặc người nhận từ hóa đơn này sang JSON có cấu trúc.'
        });

        // Schema validation
        const schemaRes = AISchema.validateReceiptExtraction(rawExtraction);
        if (!schemaRes.valid) {
          return {
            status: 'REJECTED',
            proposal: null,
            errors: schemaRes.errors
          };
        }

        const todayStr = AIValidator.getVietnamTodayDate();
        const resolvedDate = rawExtraction.date ? AIValidator.resolveTemporalDate(rawExtraction.date) : todayStr;
        const resolvedWalletRes = AIValidator.resolveWallet(rawExtraction.paymentMethod || 'tiền mặt');

        // Tạo Transaction Proposal chuẩn
        const proposal = {
          id: `tx-ocr-${aiRequestId}`,
          aiRequestId,
          type: 'expense',
          amount: Math.round(rawExtraction.amount),
          currency: 'VND',
          category: 'Ăn uống', // Default gợi ý, người dùng sẽ kiểm tra lại
          wallet: resolvedWalletRes.resolvedWallet || 'Tiền mặt',
          walletHint: rawExtraction.paymentMethod || 'Tiền mặt',
          date: resolvedDate,
          time: rawExtraction.time || '12:00',
          description: rawExtraction.merchant ? `Hóa đơn: ${rawExtraction.merchant}` : (rawExtraction.description || 'Hóa đơn mua sắm'),
          validationStatus: 'NEEDS_CONFIRMATION',
          requiresManualClarification: true
        };

        return {
          status: 'SUCCESS',
          proposal,
          errors: []
        };
      } catch (err) {
        return {
          status: 'ERROR',
          proposal: null,
          errors: [`Không thể nhận diện hóa đơn: ${err.message}`]
        };
      } finally {
        // QUYỀN RIÊNG TƯ (Rule 20): Hủy bỏ tham chiếu bộ nhớ ảnh tạm ngay lập tức
        temporaryBuffer = null;
      }
    }
  }

  return {
    ReceiptParser
  };
});
