/**
 * FINTRACK PRO — AI AGENT MAIN FACADE
 * Quản lý Provider, Feature Flags, Rate Limiting, Observability, và Điều phối các Sub-Agents
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const providers = require('./ai-provider.js');
    const expenseParserMod = require('./expense-parser.js');
    const insightsMod = require('./financial-insights.js');
    const receiptMod = require('./receipt-parser.js');
    module.exports = factory(providers, expenseParserMod, insightsMod, receiptMod);
  } else {
    root.AIAgent = factory(root.AIProviders, root.ExpenseParser, root.FinancialInsights, root.ReceiptParser);
  }
})(typeof self !== 'undefined' ? self : this, function (AIProviders, ExpenseParserMod, InsightsMod, ReceiptMod) {
  'use strict';

  class AIAgentFacade {
    constructor(config = {}) {
      // 1. Feature Flags (Rule 36)
      this.featureFlags = {
        AI_ENABLED: config.AI_ENABLED !== undefined ? config.AI_ENABLED : true,
        AI_NL_TRANSACTION_ENABLED: config.AI_NL_TRANSACTION_ENABLED !== undefined ? config.AI_NL_TRANSACTION_ENABLED : true,
        AI_INSIGHTS_ENABLED: config.AI_INSIGHTS_ENABLED !== undefined ? config.AI_INSIGHTS_ENABLED : true,
        AI_RECEIPT_ENABLED: config.AI_RECEIPT_ENABLED !== undefined ? config.AI_RECEIPT_ENABLED : true
      };

      // 2. Providers: Mặc định dùng MockLocalAIProvider an toàn và offline
      this.localProvider = new AIProviders.MockLocalAIProvider();
      this.geminiProvider = new AIProviders.GeminiProvider({ apiKey: config.geminiApiKey || '' });
      this.activeProviderType = config.activeProviderType || 'local'; // 'local' | 'gemini'
      this.activeProvider = this.activeProviderType === 'gemini' && config.geminiApiKey ? this.geminiProvider : this.localProvider;

      // 3. Sub-agents
      this.expenseParser = new ExpenseParserMod.ExpenseParser(this.activeProvider);
      this.financialInsights = new InsightsMod.FinancialInsightsAgent(this.activeProvider);
      this.receiptParser = new ReceiptMod.ReceiptParser(this.activeProvider);

      // 4. Rate Limiting (Rule 23)
      this.rateLimit = {
        maxPerMinute: config.maxPerMinute || 20,
        requestsThisMinute: 0,
        lastResetTime: Date.now()
      };

      // 5. Observability Buffer (Rule 27)
      this.auditLogs = [];
      this.maxAuditLogs = 50;
    }

    setFeatureFlag(flagName, value) {
      if (this.featureFlags.hasOwnProperty(flagName)) {
        this.featureFlags[flagName] = Boolean(value);
      }
    }

    setGeminiApiKey(key) {
      this.geminiProvider.setApiKey(key);
      if (key && key.trim().length > 10) {
        this.activeProviderType = 'gemini';
        this.activeProvider = this.geminiProvider;
      } else {
        this.activeProviderType = 'local';
        this.activeProvider = this.localProvider;
      }
      this.expenseParser.setProvider(this.activeProvider);
      this.financialInsights.setProvider(this.activeProvider);
      this.receiptParser.setProvider(this.activeProvider);
    }

    useLocalProvider() {
      this.activeProviderType = 'local';
      this.activeProvider = this.localProvider;
      this.expenseParser.setProvider(this.activeProvider);
      this.financialInsights.setProvider(this.activeProvider);
      this.receiptParser.setProvider(this.activeProvider);
    }

    /**
     * Báo cáo trạng thái an toàn Secret (Rule 4)
     */
    getSecurityAuditStatus() {
      // Trong mô hình Client-side PWA, không có server bí mật
      return {
        provider: this.activeProviderType,
        backendSecurityStatus: 'AI BACKEND SECURITY: NOT PRODUCTION READY',
        details: 'Client-side API Key model requires Cloud Function / Backend Proxy for enterprise secret protection. Local mock engine is 100% privacy-safe and offline.'
      };
    }

    _checkRateLimit() {
      const now = Date.now();
      if (now - this.rateLimit.lastResetTime > 60000) {
        this.rateLimit.requestsThisMinute = 0;
        this.rateLimit.lastResetTime = now;
      }
      if (this.rateLimit.requestsThisMinute >= this.rateLimit.maxPerMinute) {
        return false;
      }
      this.rateLimit.requestsThisMinute++;
      return true;
    }

    _logObservability(entry) {
      this.auditLogs.unshift({
        aiRequestId: entry.aiRequestId,
        feature: entry.feature,
        provider: this.activeProviderType,
        latencyMs: entry.latencyMs,
        status: entry.status,
        timestamp: new Date().toISOString()
      });
      if (this.auditLogs.length > this.maxAuditLogs) {
        this.auditLogs.pop();
      }
    }

    /**
     * Parse văn bản giao dịch tự nhiên (NL Logging)
     */
    async parseExpense(userText, options = {}) {
      const startTime = Date.now();
      const aiRequestId = options.aiRequestId || `nl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      if (!this.featureFlags.AI_ENABLED || !this.featureFlags.AI_NL_TRANSACTION_ENABLED) {
        return {
          status: 'DISABLED',
          proposals: [],
          errors: ['Tính năng AI ghi chép đang tạm tắt trong cài đặt.'],
          aiRequestId
        };
      }

      if (!this._checkRateLimit()) {
        return {
          status: 'RATE_LIMITED',
          proposals: [],
          errors: ['Bạn đã thực hiện quá nhiều yêu cầu AI trong 1 phút. Vui lòng chờ giây lát.'],
          aiRequestId
        };
      }

      const res = await this.expenseParser.parseExpenseText(userText, {
        aiRequestId,
        availableWallets: options.availableWallets
      });

      this._logObservability({
        aiRequestId,
        feature: 'nl_transaction',
        latencyMs: Date.now() - startTime,
        status: res.status
      });

      return res;
    }

    /**
     * Phân tích thông minh báo cáo tài chính
     */
    async generateFinancialInsights(transactions, wallets, budget) {
      const startTime = Date.now();
      const aiRequestId = `ins-${Date.now()}`;

      if (!this.featureFlags.AI_ENABLED || !this.featureFlags.AI_INSIGHTS_ENABLED) {
        return {
          status: 'DISABLED',
          summary: 'Tính năng AI Phân tích đang tắt trong cài đặt.',
          observations: [],
          suggestions: [],
          confidence: 'data_based'
        };
      }

      if (!this._checkRateLimit()) {
        return {
          status: 'RATE_LIMITED',
          summary: 'Quá giới hạn tần suất yêu cầu AI trong phút này.',
          observations: [],
          suggestions: [],
          confidence: 'data_based'
        };
      }

      const res = await this.financialInsights.analyze(transactions, wallets, budget);

      this._logObservability({
        aiRequestId,
        feature: 'financial_insights',
        latencyMs: Date.now() - startTime,
        status: res.status
      });

      return res;
    }

    /**
     * Nhận diện hóa đơn / chuyển khoản
     */
    async parseReceiptImage(imageSource, options = {}) {
      const startTime = Date.now();
      const aiRequestId = `ocr-${Date.now()}`;

      if (!this.featureFlags.AI_ENABLED || !this.featureFlags.AI_RECEIPT_ENABLED) {
        return {
          status: 'DISABLED',
          proposal: null,
          errors: ['Tính năng AI OCR đang tạm tắt trong cài đặt.']
        };
      }

      if (!this._checkRateLimit()) {
        return {
          status: 'RATE_LIMITED',
          proposal: null,
          errors: ['Vui lòng chờ ít giây trước khi tải lên hóa đơn tiếp theo.']
        };
      }

      const res = await this.receiptParser.parseReceipt(imageSource, { aiRequestId, ...options });

      this._logObservability({
        aiRequestId,
        feature: 'receipt_ocr',
        latencyMs: Date.now() - startTime,
        status: res.status
      });

      return res;
    }
  }

  return {
    AIAgentFacade
  };
});
