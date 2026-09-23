/**
 * FINTRACK PRO — FINANCIAL INSIGHTS AGENT
 * Tính toán số liệu tài chính tổng hợp bằng Deterministic Code trước khi chuyển sang AI
 * Tuyệt đối không cho phép AI tự tạo ra số liệu hoặc đưa ra tư vấn tài chính trái phép
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const schema = require('./ai-schema.js');
    module.exports = factory(schema);
  } else {
    root.FinancialInsights = factory(root.AISchema);
  }
})(typeof self !== 'undefined' ? self : this, function (AISchema) {
  'use strict';

  class FinancialInsightsAgent {
    constructor(provider) {
      this.provider = provider;
    }

    setProvider(provider) {
      this.provider = provider;
    }

    /**
     * Tạo sanitized financial context loại bỏ 100% PII, UIDs, tokens
     * Tính toán các chỉ số định lượng hoàn toàn bằng Javascript code
     * @param {Array} transactions 
     * @param {Object} wallets 
     * @param {Object} budget 
     * @param {Object} options 
     */
    buildSanitizedContext(transactions = [], wallets = {}, budget = null, options = {}) {
      let totalIncome = 0;
      let totalExpense = 0;
      const categoryTotals = {};
      const dates = [];

      transactions.forEach(tx => {
        const amt = Number(tx.amount) || 0;
        if (tx.isoDate) dates.push(tx.isoDate);

        if (tx.type === 'income') {
          totalIncome += amt;
        } else if (tx.type === 'expense') {
          totalExpense += amt;
          const cat = tx.category || 'Khác';
          categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
        }
      });

      const netCashFlow = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? Number(((netCashFlow / totalIncome) * 100).toFixed(2)) : 0;

      // Danh mục chi tiêu theo tỷ trọng giảm dần
      const categorySummary = Object.entries(categoryTotals)
        .map(([category, amount]) => ({
          category,
          amount,
          share: totalExpense > 0 ? Number(((amount / totalExpense) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.amount - a.amount);

      // Tính số ngày và chi tiêu trung bình
      const distinctDays = Math.max(1, new Set(dates).size);
      const dailyAverageExpense = Math.round(totalExpense / distinctDays);

      // Tính phần trăm sử dụng ngân sách nếu có
      let budgetUtilization = null;
      let remainingDailyBudget = null;
      if (budget && typeof budget.monthlyLimit === 'number' && budget.monthlyLimit > 0) {
        budgetUtilization = Number(((totalExpense / budget.monthlyLimit) * 100).toFixed(1));
        const remainingBudget = Math.max(0, budget.monthlyLimit - totalExpense);
        const daysLeftInMonth = 10; // Tham số ngày còn lại trong kỳ
        remainingDailyBudget = Math.round(remainingBudget / daysLeftInMonth);
      }

      dates.sort();
      const startDate = dates[0] || '2026-09-01';
      const endDate = dates[dates.length - 1] || '2026-09-23';

      return {
        period: {
          start: startDate,
          end: endDate
        },
        transactionCount: transactions.length,
        income: totalIncome,
        expense: totalExpense,
        net: netCashFlow,
        savingsRate: savingsRate,
        dailyAverageExpense: dailyAverageExpense,
        categorySummary: categorySummary.slice(0, 5), // Top 5 danh mục
        budgetUtilization: budgetUtilization,
        remainingDailyBudget: remainingDailyBudget
      };
    }

    /**
     * Phân tích tài chính thông minh dựa trên context đã được làm sạch
     * @param {Array} transactions 
     * @param {Object} wallets 
     * @param {Object} budget 
     * @returns {Promise<Object>}
     */
    async analyze(transactions = [], wallets = {}, budget = null) {
      const sanitizedContext = this.buildSanitizedContext(transactions, wallets, budget);

      // Nếu không có dữ liệu giao dịch
      if (sanitizedContext.transactionCount === 0 || (sanitizedContext.income === 0 && sanitizedContext.expense === 0)) {
        return {
          status: 'INSUFFICIENT_DATA',
          summary: 'Chưa có đủ dữ liệu giao dịch trong kỳ để phân tích xu hướng chi tiêu.',
          observations: [],
          suggestions: ['Hãy thêm giao dịch thu nhập và chi tiêu để hệ thống tạo phân tích dòng tiền.'],
          confidence: 'data_based',
          sanitizedContext
        };
      }

      const systemPrompt = `
You are FinTrack Pro's Financial Insights Assistant.
Role: Help the user understand their OWN financial numbers clearly.
Rules:
1. Ground every claim on the provided numbers. NEVER invent amounts, balances, or transactions.
2. Label inferences as interpretations ("Dựa trên số liệu...").
3. DO NOT provide unlicensed financial advice (no stock picking, crypto recommendations, or loan advertisements).
4. Output strictly structured JSON conforming to the contract:
{
  "summary": string,
  "observations": [
    { "type": string, "title": string, "value": string, "evidence": string }
  ],
  "suggestions": string[],
  "confidence": "data_based"
}
`.trim();

      try {
        const rawResult = await this.provider.analyzeFinancialData({
          systemPrompt,
          sanitizedContext
        });

        // Validate Schema cho response
        const schemaRes = AISchema.validateFinancialInsightResponse(rawResult);
        if (!schemaRes.valid) {
          // Fallback an toàn nếu AI trả về sai schema
          return {
            status: 'PARTIAL',
            summary: `Tổng quan: Thu ${sanitizedContext.income.toLocaleString('vi-VN')}đ, Chi ${sanitizedContext.expense.toLocaleString('vi-VN')}đ, Dòng tiền ròng: ${sanitizedContext.net.toLocaleString('vi-VN')}đ.`,
            observations: [
              {
                type: 'savings_rate',
                title: 'Tỷ lệ tích lũy',
                value: `${sanitizedContext.savingsRate}%`,
                evidence: 'Tính toán trực tiếp từ tổng thu và tổng chi.'
              }
            ],
            suggestions: ['Duy trì ghi chép đều đặn các khoản chi tiêu.'],
            confidence: 'data_based',
            sanitizedContext
          };
        }

        return {
          status: 'SUCCESS',
          ...rawResult,
          sanitizedContext
        };
      } catch (err) {
        return {
          status: 'ERROR',
          summary: 'Không thể tạo phân tích tự động lúc này.',
          observations: [],
          suggestions: [],
          confidence: 'data_based',
          error: err.message,
          sanitizedContext
        };
      }
    }
  }

  return {
    FinancialInsightsAgent
  };
});
