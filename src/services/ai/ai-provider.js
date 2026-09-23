/**
 * FINTRACK PRO — AI PROVIDER ABSTRACTION LAYER
 * Cung cấp interface trừu tượng AIProvider cùng 2 triển khai:
 * 1. MockLocalAIProvider: Phân tích heuristic/regex nội bộ offline, 0 chi phí, không phụ thuộc mạng, bảo mật 100%.
 * 2. GeminiProvider: Kết nối Google Gemini REST API (khi người dùng cung cấp API Key).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const validator = require('./ai-validator.js');
    module.exports = factory(validator);
  } else {
    root.AIProviders = factory(root.AIValidator);
  }
})(typeof self !== 'undefined' ? self : this, function (AIValidator) {
  'use strict';

  /**
   * Base AI Provider Interface
   */
  class AIProvider {
    constructor(name = 'BaseProvider') {
      this.name = name;
    }

    async generateStructuredOutput({ systemPrompt, prompt, schema }) {
      throw new Error(`generateStructuredOutput() not implemented on ${this.name}`);
    }

    async analyzeFinancialData({ systemPrompt, sanitizedContext }) {
      throw new Error(`analyzeFinancialData() not implemented on ${this.name}`);
    }

    async analyzeImage({ imageSource, prompt, schema }) {
      throw new Error(`analyzeImage() not implemented on ${this.name}`);
    }
  }

  /**
   * Helper phân tích số tiền tiếng Việt:
   * Hỗ trợ các biến thể: 450k, 4.5k, 4tr5, 450 nghìn, 450,000, 1.000.000, 1tr2, 5tr, 120k, 1.5 triệu, 2 triệu
   */
  function parseVietnameseCurrency(text) {
    if (!text) return null;
    const clean = String(text).toLowerCase().replace(/đ|vnd|đồng/g, '').trim();

    // 1. Dạng triệu kết hợp: "4tr5" -> 4,500,000; "1tr2" -> 1,200,000
    const trMatch = clean.match(/(\d+)\s*(?:tr|trieu|triệu)\s*(\d+)/i);
    if (trMatch) {
      const whole = parseInt(trMatch[1], 10);
      const fracPart = trMatch[2];
      const fracValue = parseInt(fracPart.padEnd(6, '0').slice(0, 6), 10);
      return (whole * 1000000) + fracValue;
    }

    // 2. Dạng số thập phân triệu: "1.5 triệu", "1,5 triệu", "5tr"
    const decTrMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:tr|trieu|triệu)/i);
    if (decTrMatch) {
      const num = parseFloat(decTrMatch[1].replace(',', '.'));
      return Math.round(num * 1000000);
    }

    // 3. Dạng số thập phân nghìn: "4.5k", "4,5k" -> 4,500
    const decKMatch = clean.match(/(\d+[.,]\d+)\s*(?:k|nghìn|ngàn)/i);
    if (decKMatch) {
      const num = parseFloat(decKMatch[1].replace(',', '.'));
      return Math.round(num * 1000);
    }

    // 4. Dạng nghìn: "450k", "120k", "70 nghìn", "70 ngàn"
    const kMatch = clean.match(/(\d+)\s*(?:k|nghìn|ngàn)/i);
    if (kMatch) {
      return parseInt(kMatch[1], 10) * 1000;
    }

    // 5. Dạng chuẩn có dấu phân cách: "1.000.000", "450,000", "50.000"
    const dotFormatMatch = clean.match(/(\d{1,3}(?:[.,]\d{3})+)/);
    if (dotFormatMatch) {
      return parseInt(dotFormatMatch[1].replace(/[.,]/g, ''), 10);
    }

    // 6. Dạng số nguyên thuần túy >= 1000
    const rawNumberMatch = clean.match(/\b([1-9]\d{3,14})\b/);
    if (rawNumberMatch) {
      return parseInt(rawNumberMatch[1], 10);
    }

    return null;
  }

  /**
   * MockLocalAIProvider: Provider thông minh hoạt động offline hoàn toàn
   * Hỗ trợ đầy đủ các yêu cầu kiểm thử và hoạt động không cần server/mạng
   */
  class MockLocalAIProvider extends AIProvider {
    constructor() {
      super('MockLocalAIProvider');
    }

    async generateStructuredOutput({ systemPrompt, prompt }) {
      const text = String(prompt || '').trim();
      const todayDate = AIValidator ? AIValidator.getVietnamTodayDate() : new Date().toISOString().slice(0, 10);

      // 1. Kiểm tra chuyển khoản liên ví: "chuyển 2 triệu từ ngân hàng sang tiền mặt"
      const transferMatch = text.match(/chuyển\s+([\d.,\s\p{L}]+?)\s+từ\s+([\p{L}\s]+?)\s+sang\s+([\p{L}\s]+)/iu);
      if (transferMatch) {
        const amt = parseVietnameseCurrency(transferMatch[1]) || 0;
        return {
          transactions: [
            {
              type: 'transfer',
              amount: amt,
              currency: 'VND',
              fromWalletHint: transferMatch[2].trim(),
              toWalletHint: transferMatch[3].trim(),
              date: todayDate,
              time: '12:00',
              description: text
            }
          ]
        };
      }

      // 2. Tách câu ghép nếu có nhiều giao dịch (dấu phẩy, chấm phẩy, chữ "và", "đồng thời")
      // Ví dụ: "Sáng nay chạy Grab được 450k tiền mặt, ăn trưa 45k"
      const segments = text.split(/[,;\n]|\bvà\b/i)
        .map(s => s.trim())
        .filter(s => s.length > 0 && parseVietnameseCurrency(s) !== null);

      if (segments.length === 0) {
        // Không tìm thấy số tiền nào
        return { transactions: [] };
      }

      const results = [];

      for (const seg of segments) {
        let amt = parseVietnameseCurrency(seg) || 0;
        const lowerSeg = seg.toLowerCase();

        // Kiểm tra phép nhân dạng "mua 3 ly cà phê 25k"
        let quantity = undefined;
        let unitPrice = undefined;
        const multMatch = lowerSeg.match(/(\d+)\s*(?:ly|cái|chiếc|phần|suất|chuyến|chai|gói|hộp)\s*(?:[\p{L}\s]+?)\s*(\d+[a-zA-Z\s]*)/u);
        if (multMatch) {
          quantity = parseInt(multMatch[1], 10);
          unitPrice = parseVietnameseCurrency(multMatch[2]);
          if (quantity > 0 && unitPrice > 0) {
            amt = quantity * unitPrice;
          }
        }

        // Xác định loại giao dịch (income / expense)
        const isIncome = /thu nhập|được|nhận|thu|lương|chạy grab|tiền về|cộng/i.test(lowerSeg) && !/mua|chi|ăn|đổ xăng|trả|uống/i.test(lowerSeg);
        const type = isIncome ? 'income' : 'expense';

        // Phân tích danh mục với unicode boundary
        let category = 'Khác';
        if (/(^|[^\p{L}\p{N}])(xăng|dầu|petrolimex|ron 95|e5)([^\\p{L}\\p{N}]|$)/iu.test(lowerSeg)) {
          category = 'Xăng xe';
        } else if (/(^|[^\p{L}\p{N}])(grab|chạy grab|cuốc|chuyến)([^\\p{L}\\p{N}]|$)/iu.test(lowerSeg)) {
          category = 'Grab';
        } else if (/(^|[^\p{L}\p{N}])(sửa|nhớt|bảo dưỡng|vá xe|rửa xe)([^\\p{L}\\p{N}]|$)/iu.test(lowerSeg)) {
          category = 'Sửa xe';
        } else if (/(^|[^\p{L}\p{N}])(cà phê|cafe|cf|ăn|trưa|uống|phở|bún|cơm|nhậu|trà sữa)([^\\p{L}\\p{N}]|$)/iu.test(lowerSeg)) {
          category = 'Ăn uống';
        } else if (/(^|[^\p{L}\p{N}])(mua|shopee|đồ|siêu thị)([^\\p{L}\\p{N}]|$)/iu.test(lowerSeg)) {
          category = 'Mua sắm';
        } else if (/(^|[^\p{L}\p{N}])(thu nhập|lương|salary)([^\\p{L}\\p{N}]|$)/iu.test(lowerSeg)) {
          category = isIncome ? 'Lương' : 'Khác';
        }

        // Phân tích ví
        let walletHint = 'tiền mặt';
        if (/ngân hàng|bank|chuyển khoản|ck|momo|techcombank|vcb/i.test(lowerSeg) || /ngân hàng/i.test(text.toLowerCase())) {
          walletHint = 'ngân hàng';
        } else if (/tiền mặt|cash/i.test(lowerSeg) || /tiền mặt/i.test(text.toLowerCase())) {
          walletHint = 'tiền mặt';
        }

        // Phân tích thời gian (nếu câu chứa "hôm qua", "sáng nay", v.v.)
        let dateHint = todayDate;
        if (/hôm qua|sáng qua|tối qua/i.test(text.toLowerCase())) {
          dateHint = 'hôm qua';
        }

        results.push({
          type: type,
          amount: amt,
          currency: 'VND',
          category: category,
          walletHint: walletHint,
          date: AIValidator ? AIValidator.resolveTemporalDate(dateHint) : todayDate,
          time: '12:00',
          description: seg,
          quantity: quantity,
          unitPrice: unitPrice
        });
      }

      return { transactions: results };
    }

    async analyzeFinancialData({ systemPrompt, sanitizedContext }) {
      const ctx = sanitizedContext || {};
      const inc = ctx.income || 0;
      const exp = ctx.expense || 0;
      const net = inc - exp;
      const savingsRate = inc > 0 ? ((net / inc) * 100).toFixed(1) : 0;
      const topCat = (ctx.categorySummary && ctx.categorySummary[0]) || { category: 'Chung', amount: exp, share: 100 };

      if (inc === 0 && exp === 0) {
        return {
          summary: 'Chưa có đủ dữ liệu giao dịch trong kỳ để phân tích chuyên sâu.',
          observations: [],
          suggestions: ['Hãy ghi chép các khoản chi tiêu và thu nhập hàng ngày để nhận báo cáo thông minh.'],
          confidence: 'data_based',
          status: 'INSUFFICIENT_DATA'
        };
      }

      return {
        summary: `Tổng thu nhập đạt ${inc.toLocaleString('vi-VN')}đ, tổng chi tiêu ${exp.toLocaleString('vi-VN')}đ. Dòng tiền ròng hiện tại là ${net >= 0 ? '+' : ''}${net.toLocaleString('vi-VN')}đ.`,
        observations: [
          {
            type: 'spending_change',
            title: `Danh mục chi tiêu lớn nhất: ${topCat.category}`,
            value: `${topCat.amount.toLocaleString('vi-VN')}đ`,
            evidence: `Chiếm ${topCat.share}% tổng chi tiêu trong kỳ quan sát.`
          },
          {
            type: 'savings_rate',
            title: 'Tỷ lệ tích lũy',
            value: `${savingsRate}%`,
            evidence: `Thu ${inc.toLocaleString('vi-VN')}đ và chi ${exp.toLocaleString('vi-VN')}đ.`
          }
        ],
        suggestions: [
          `Tiếp tục duy trì kiểm soát khoản chi cho ${topCat.category}.`,
          net > 0 ? 'Dòng tiền thặng dư, nên phân bổ vào ví tích lũy mục tiêu.' : 'Chi tiêu đang vượt quá thu nhập, cân nhắc cắt giảm các khoản không thiết yếu.'
        ],
        confidence: 'data_based'
      };
    }

    async analyzeImage({ imageSource, prompt }) {
      return {
        amount: 50000,
        currency: 'VND',
        date: AIValidator ? AIValidator.getVietnamTodayDate() : '2026-09-23',
        time: '12:00',
        merchant: 'Cửa hàng tiện lợi',
        description: 'Thanh toán hóa đơn',
        paymentMethod: 'Tiền mặt'
      };
    }
  }

  /**
   * GeminiProvider: Gọi Google Gemini API chính thức khi có key
   */
  class GeminiProvider extends AIProvider {
    constructor(config = {}) {
      super('GeminiProvider');
      this.apiKey = config.apiKey || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : null) || '';
      this.model = config.model || 'gemini-1.5-flash';
    }

    setApiKey(key) {
      this.apiKey = key;
    }

    async generateStructuredOutput({ systemPrompt, prompt }) {
      if (!this.apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nUSER INPUT: "${prompt}"\n\nReturn strict JSON adhering to schema.` }]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API Error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty response from Gemini API');

      return JSON.parse(rawText);
    }

    async analyzeFinancialData({ systemPrompt, sanitizedContext }) {
      if (!this.apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemPrompt}\n\nSANITIZED FINANCIAL CONTEXT (DETERMINISTIC):\n${JSON.stringify(sanitizedContext, null, 2)}\n\nProduce structured financial insights. DO NOT INVENT NUMBERS.` }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.2
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Gemini API Error ${res.status}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(rawText);
    }

    async analyzeImage({ imageSource, prompt }) {
      if (!this.apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }
      // Trích xuất base64 từ imageSource
      let base64Data = imageSource;
      let mimeType = 'image/jpeg';
      if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
        const parts = imageSource.split(',');
        mimeType = parts[0].match(/:(.*?);/)[1];
        base64Data = parts[1];
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Data } },
              { text: prompt || 'Extract receipt amount, date, time, merchant, description into structured JSON.' }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Gemini API Error ${res.status}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(rawText);
    }
  }

  return {
    AIProvider,
    MockLocalAIProvider,
    GeminiProvider,
    parseVietnameseCurrency
  };
});
