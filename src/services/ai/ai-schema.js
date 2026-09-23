/**
 * FINTRACK PRO — AI SCHEMA DEFINITIONS & VALIDATOR
 * Đảm bảo mọi output từ LLM / AI Providers đều tuân thủ cấu trúc dữ liệu chặt chẽ
 * Hỗ trợ song song cả môi trường Browser (window.AISchema) và Node.js (module.exports)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AISchema = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ALLOWED_TRANSACTION_TYPES = ['income', 'expense', 'transfer'];
  const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

  /**
   * Validate một Transaction Proposal đơn lẻ
   * @param {Object} tx 
   * @returns {{ valid: boolean, errors: string[] }}
   */
  function validateTransactionProposal(tx) {
    const errors = [];

    if (!tx || typeof tx !== 'object') {
      return { valid: false, errors: ['Transaction proposal must be a non-null object'] };
    }

    // 1. Type validation
    if (!tx.type || !ALLOWED_TRANSACTION_TYPES.includes(tx.type)) {
      errors.push(`Invalid or missing transaction type: "${tx.type}". Allowed: ${ALLOWED_TRANSACTION_TYPES.join(', ')}`);
    }

    // 2. Amount validation
    if (typeof tx.amount !== 'number' || isNaN(tx.amount) || !Number.isFinite(tx.amount)) {
      errors.push('Transaction amount must be a finite number');
    } else if (tx.amount <= 0) {
      errors.push(`Transaction amount must be strictly greater than 0, received: ${tx.amount}`);
    } else if (tx.amount > 1e15) {
      errors.push(`Transaction amount exceeds reasonable bounds: ${tx.amount}`);
    }

    // 3. Currency validation
    if (tx.currency && tx.currency !== 'VND') {
      errors.push(`Unsupported currency: "${tx.currency}". Currently only "VND" is supported`);
    }

    // 4. Date validation (YYYY-MM-DD)
    if (!tx.date || !DATE_REGEX.test(tx.date)) {
      errors.push(`Transaction date must follow YYYY-MM-DD format, received: "${tx.date}"`);
    } else {
      const parsed = new Date(tx.date);
      if (isNaN(parsed.getTime())) {
        errors.push(`Transaction date is not a valid calendar date: "${tx.date}"`);
      }
    }

    // 5. Time validation (HH:mm) if provided
    if (tx.time && !TIME_REGEX.test(tx.time)) {
      errors.push(`Transaction time must follow HH:mm format, received: "${tx.time}"`);
    }

    // 6. Category validation
    if (tx.type !== 'transfer') {
      if (!tx.category || typeof tx.category !== 'string' || tx.category.trim() === '') {
        errors.push('Transaction category must be a non-empty string');
      }
    }

    // 7. Wallet hints
    if (tx.type === 'transfer') {
      if (!tx.fromWalletHint || typeof tx.fromWalletHint !== 'string') {
        errors.push('Transfer proposal requires "fromWalletHint" string');
      }
      if (!tx.toWalletHint || typeof tx.toWalletHint !== 'string') {
        errors.push('Transfer proposal requires "toWalletHint" string');
      }
    } else {
      if (!tx.walletHint || typeof tx.walletHint !== 'string') {
        errors.push('Transaction proposal requires "walletHint" string');
      }
    }

    // 8. Description
    if (typeof tx.description !== 'string') {
      errors.push('Transaction description must be a string');
    }

    // 9. Arithmetic consistency check (if quantity and unitPrice are given)
    if (tx.quantity !== undefined && tx.unitPrice !== undefined) {
      if (typeof tx.quantity !== 'number' || tx.quantity <= 0) {
        errors.push('Quantity must be a positive number');
      }
      if (typeof tx.unitPrice !== 'number' || tx.unitPrice <= 0) {
        errors.push('UnitPrice must be a positive number');
      }
      if (Number.isFinite(tx.quantity) && Number.isFinite(tx.unitPrice)) {
        const expectedTotal = Math.round(tx.quantity * tx.unitPrice);
        if (Math.abs(expectedTotal - tx.amount) > 1) {
          errors.push(`Arithmetic mismatch: quantity (${tx.quantity}) * unitPrice (${tx.unitPrice}) = ${expectedTotal}, but amount is ${tx.amount}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate danh sách Transaction Proposals
   * @param {Object} payload 
   * @returns {{ valid: boolean, errors: string[] }}
   */
  function validateTransactionProposalBatch(payload) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, errors: ['Proposal payload must be an object'] };
    }

    if (!Array.isArray(payload.transactions)) {
      return { valid: false, errors: ['Field "transactions" must be an array'] };
    }

    if (payload.transactions.length === 0) {
      return { valid: false, errors: ['Field "transactions" array cannot be empty'] };
    }

    const allErrors = [];
    payload.transactions.forEach((tx, idx) => {
      const res = validateTransactionProposal(tx);
      if (!res.valid) {
        res.errors.forEach(err => allErrors.push(`[Tx #${idx + 1}] ${err}`));
      }
    });

    return {
      valid: allErrors.length === 0,
      errors: allErrors
    };
  }

  /**
   * Validate Financial Insight Response Schema
   * @param {Object} data 
   * @returns {{ valid: boolean, errors: string[] }}
   */
  function validateFinancialInsightResponse(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Insight response must be an object'] };
    }

    if (typeof data.summary !== 'string' || data.summary.trim() === '') {
      errors.push('Field "summary" must be a non-empty string');
    }

    if (!Array.isArray(data.observations)) {
      errors.push('Field "observations" must be an array');
    } else {
      data.observations.forEach((obs, idx) => {
        if (!obs || typeof obs !== 'object') {
          errors.push(`Observation #${idx} must be an object`);
        } else {
          if (!obs.type || typeof obs.type !== 'string') errors.push(`Observation #${idx} missing string "type"`);
          if (!obs.title || typeof obs.title !== 'string') errors.push(`Observation #${idx} missing string "title"`);
          if (obs.value === undefined) errors.push(`Observation #${idx} missing "value"`);
          if (!obs.evidence || typeof obs.evidence !== 'string') errors.push(`Observation #${idx} missing string "evidence"`);
        }
      });
    }

    if (!Array.isArray(data.suggestions)) {
      errors.push('Field "suggestions" must be an array of strings');
    }

    if (data.confidence !== 'data_based' && data.confidence !== 'inference') {
      errors.push(`Field "confidence" must be "data_based" or "inference", received "${data.confidence}"`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate Receipt / Bank Transfer OCR extraction
   * @param {Object} data 
   * @returns {{ valid: boolean, errors: string[] }}
   */
  function validateReceiptExtraction(data) {
    const errors = [];
    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Receipt extraction must be an object'] };
    }

    if (typeof data.amount !== 'number' || isNaN(data.amount) || data.amount <= 0) {
      errors.push('Receipt amount must be a positive number');
    }

    if (data.date && !DATE_REGEX.test(data.date)) {
      errors.push(`Receipt date must follow YYYY-MM-DD format if provided, received: "${data.date}"`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  return {
    validateTransactionProposal,
    validateTransactionProposalBatch,
    validateFinancialInsightResponse,
    validateReceiptExtraction,
    ALLOWED_TRANSACTION_TYPES
  };
});
