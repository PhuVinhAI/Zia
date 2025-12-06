/**
 * Gemini API Key Manager - Quản lý và xoay vòng API keys
 * Hỗ trợ nhiều key, tự động chuyển khi gặp lỗi 429 (rate limit)
 */
import { GoogleGenAI } from '@google/genai';
import { debugLog } from '../../core/logger/logger.js';

// Parse keys từ env
// Hỗ trợ 2 cách:
// 1. Comma-separated: GEMINI_API_KEY=key1,key2,key3
// 2. Dọc (nhiều biến): GEMINI_API_KEY_1=key1, GEMINI_API_KEY_2=key2, ...
function parseApiKeys(): string[] {
  const keys: string[] = [];

  // Cách 1: Đọc từ GEMINI_API_KEY hoặc GEMINI_API_KEYS (comma-separated)
  const keysEnv = Bun.env.GEMINI_API_KEY || Bun.env.GEMINI_API_KEYS || '';
  if (keysEnv) {
    const parsed = keysEnv
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k && !k.startsWith('your_'));
    keys.push(...parsed);
  }

  // Cách 2: Đọc từ GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... (dọc)
  for (let i = 1; i <= 20; i++) {
    const key = Bun.env[`GEMINI_API_KEY_${i}`]?.trim();
    if (key && !key.startsWith('your_')) {
      keys.push(key);
    }
  }

  // Loại bỏ duplicate
  const uniqueKeys = [...new Set(keys)];

  if (uniqueKeys.length === 0) {
    console.error('❌ Vui lòng cấu hình GEMINI_API_KEY hoặc GEMINI_API_KEY_1, GEMINI_API_KEY_2... trong file .env');
    process.exit(1);
  }

  return uniqueKeys;
}

class GeminiKeyManager {
  private keys: string[];
  private currentIndex = 0;
  private aiInstances: Map<number, GoogleGenAI> = new Map();
  private rateLimitedKeys: Set<number> = new Set(); // Track keys đang bị rate limit (429)

  constructor() {
    this.keys = parseApiKeys();
    debugLog('KEY_MANAGER', `Loaded ${this.keys.length} API key(s)`);

    // Khởi tạo instance đầu tiên
    this.getOrCreateInstance(0);
  }

  /**
   * Lấy hoặc tạo GoogleGenAI instance cho key index
   */
  private getOrCreateInstance(index: number): GoogleGenAI {
    if (!this.aiInstances.has(index)) {
      const instance = new GoogleGenAI({ apiKey: this.keys[index] });
      this.aiInstances.set(index, instance);
      debugLog('KEY_MANAGER', `Created AI instance for key #${index + 1}`);
    }
    return this.aiInstances.get(index)!;
  }

  /**
   * Lấy AI instance hiện tại
   */
  getCurrentAI(): GoogleGenAI {
    return this.getOrCreateInstance(this.currentIndex);
  }

  /**
   * Lấy key hiện tại (masked cho logging)
   */
  getCurrentKeyMasked(): string {
    const key = this.keys[this.currentIndex];
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  }

  /**
   * Lấy index hiện tại (1-based cho display)
   */
  getCurrentKeyIndex(): number {
    return this.currentIndex + 1;
  }

  /**
   * Tổng số keys
   */
  getTotalKeys(): number {
    return this.keys.length;
  }

  /**
   * Đánh dấu key hiện tại bị rate limit
   */
  private markCurrentKeyRateLimited(): void {
    this.rateLimitedKeys.add(this.currentIndex);
    debugLog('KEY_MANAGER', `Key #${this.currentIndex + 1} marked as rate limited`);
  }

  /**
   * Chuyển sang key tiếp theo (không bị rate limit)
   * @returns true nếu chuyển thành công, false nếu không còn key khả dụng
   */
  rotateToNextKey(): boolean {
    if (this.keys.length === 1) {
      debugLog('KEY_MANAGER', 'Only 1 key available, cannot rotate');
      return false;
    }

    const startIndex = this.currentIndex;
    let attempts = 0;

    // Tìm key tiếp theo chưa bị rate limit
    do {
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      attempts++;

      if (!this.rateLimitedKeys.has(this.currentIndex)) {
        console.log(
          `[KeyManager] 🔄 Chuyển sang key #${this.currentIndex + 1}/${this.keys.length}`,
        );
        debugLog('KEY_MANAGER', `Rotated to key #${this.currentIndex + 1}`);
        return true;
      }
    } while (this.currentIndex !== startIndex && attempts < this.keys.length);

    // Nếu tất cả keys đều bị rate limit, reset và thử key đầu tiên
    if (this.rateLimitedKeys.size >= this.keys.length) {
      console.log('[KeyManager] ⚠️ Tất cả keys đều bị rate limit, reset và thử lại...');
      this.rateLimitedKeys.clear();
      this.currentIndex = 0;
      return true;
    }

    debugLog('KEY_MANAGER', 'No available key to rotate to');
    return false;
  }

  /**
   * Xử lý lỗi 429 (rate limit) - đánh dấu key và chuyển sang key khác
   * Gọi ngay key mới, không cần delay
   * @returns true nếu đã chuyển key thành công
   */
  handleRateLimitError(): boolean {
    this.markCurrentKeyRateLimited();
    return this.rotateToNextKey();
  }

  /**
   * Reset tất cả trạng thái (dùng khi muốn clear cache)
   */
  reset(): void {
    this.currentIndex = 0;
    this.rateLimitedKeys.clear();
    debugLog('KEY_MANAGER', 'Reset all key states');
  }

  /**
   * Lấy thông tin status của tất cả keys
   */
  getStatus(): { index: number; masked: string; available: boolean }[] {
    return this.keys.map((key, index) => ({
      index: index + 1,
      masked: `${key.substring(0, 8)}...${key.substring(key.length - 4)}`,
      available: !this.rateLimitedKeys.has(index),
    }));
  }
}

// Singleton instance
export const keyManager = new GeminiKeyManager();

/**
 * Check if error is a rate limit error (429)
 */
export function isRateLimitError(error: any): boolean {
  const status = error?.status || error?.code;
  return status === 429;
}
