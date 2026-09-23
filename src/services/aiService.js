/**
 * FINTRACK PRO — AI SERVICE LAYER
 * Cung cấp dịch vụ AI cho React Components, trỏ vào /ai domain
 */

export class AIService {
  constructor() {
    this.agent = typeof window !== 'undefined' ? window.aiAgent : null;
  }

  getAgent() {
    if (!this.agent && typeof window !== 'undefined') {
      this.agent = window.aiAgent;
    }
    return this.agent;
  }

  async parseExpense(userText, options = {}) {
    const agent = this.getAgent();
    if (!agent) {
      return { status: 'ERROR', proposals: [], errors: ['AI Agent chưa sẵn sàng'] };
    }
    return await agent.parseExpense(userText, options);
  }

  async generateFinancialInsights(transactions, wallets, budget) {
    const agent = this.getAgent();
    if (!agent) {
      return { status: 'ERROR', summary: 'AI Agent chưa sẵn sàng' };
    }
    return await agent.generateFinancialInsights(transactions, wallets, budget);
  }

  async parseReceiptImage(imageSource, options = {}) {
    const agent = this.getAgent();
    if (!agent) {
      return { status: 'ERROR', proposal: null, errors: ['AI Agent chưa sẵn sàng'] };
    }
    return await agent.parseReceiptImage(imageSource, options);
  }

  setGeminiApiKey(key) {
    const agent = this.getAgent();
    if (agent) agent.setGeminiApiKey(key);
  }

  useLocalProvider() {
    const agent = this.getAgent();
    if (agent) agent.useLocalProvider();
  }

  setFeatureFlag(flagName, value) {
    const agent = this.getAgent();
    if (agent) agent.setFeatureFlag(flagName, value);
  }
}

export const aiService = new AIService();
