/**
 * FINTRACK PRO — OCR SERVICE LAYER
 * Cung cấp dịch vụ quét ảnh hóa đơn cho React Components, trỏ vào ocr-engine.js
 */

export class OCRService {
  constructor() {
    this.engine = typeof window !== 'undefined' ? window.grabOCR : null;
  }

  getEngine() {
    if (!this.engine && typeof window !== 'undefined') {
      this.engine = window.grabOCR;
    }
    return this.engine;
  }

  async scanImage(imageSource, progressCallback) {
    const engine = this.getEngine();
    if (!engine) {
      throw new Error('OCR Engine chưa sẵn sàng');
    }
    return await engine.scanImage(imageSource, progressCallback);
  }
}

export const ocrService = new OCRService();
