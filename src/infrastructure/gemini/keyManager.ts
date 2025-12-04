/**
 * Gemini API Key Manager - Quản lý và xoay vòng API keys
 * Hỗ trợ nhiều key, tự động chuyển khi gặp lỗi 429 (rate limit)
 */
import { GoogleGenAI } from '@google/genai';
import { debugLog } from '../../core/logger/logger.js';

// Parse keys từ env (hỗ trợ comma-separated)
function parseApiKeys(): string[] {
  const keysEnv = Bun.env.GEMINI_API_KEY || Bun.env.GEMINI_API_KEYS || '';
  const keys = keysEnv
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k && k !== 'your_gemini_api_key_here');

  if (keys.length === 0) {
    console.error('❌ Vui lòng cấu hình GEMINI_API_KEY hoặc GEMINI_API_KEYS trong file .env');
    process.exit(1);
  }

  return keys;
}

class GeminiKeyManager {
  private keys: string[];
  private currentIndex = 0;
  private aiInstances: Map<number, GoogleGenAI> = new Map();
  private failedKeys: Set<number> = new Set(); // Track keys đang bị rate limit
  private failedKeyTimestamps: Map<number, number> = new Map(); // Thời điểm key bị fail

  // Thời gian chờ trước khi thử lại key đã fail (5 phút)
  private readonly KEY_COOLDOWN_MS = 5 * 60 * 1000;

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
   * Reset failed keys đã hết cooldown
   */
  private resetCooledDownKeys(): void {
    const now = Date.now();
    for (const [index, timestamp] of this.failedKeyTimestamps) {
      if (now - timestamp >= this.KEY_COOLDOWN_MS) {
        this.failedKeys.delete(index);
        this.failedKeyTimestamps.delete(index);
        debugLog('KEY_MANAGER', `Key #${index + 1} cooldown ended, available again`);
      }
    }
  }

  /**
   * Đánh dấu key hiện tại bị rate limit
   */
  markCurrentKeyFailed(): void {
    this.failedKeys.add(this.currentIndex);
    this.failedKeyTimestamps.set(this.currentIndex, Date.now());
    debugLog('KEY_MANAGER', `Key #${this.currentIndex + 1} marked as rate limited`);
  }

  /**
   * Chuyển sang key tiếp theo
   * @returns true nếu chuyển thành công, false nếu không còn key khả dụng
   */
  rotateToNextKey(): boolean {
    if (this.keys.length === 1) {
      debugLog('KEY_MANAGER', 'Only 1 key available, cannot rotate');
      return false;
    }

    // Reset các key đã hết cooldown
    this.resetCooledDownKeys();

    const startIndex = this.currentIndex;
    let attempts = 0;

    // Tìm key tiếp theo chưa bị fail
    do {
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      attempts++;

      if (!this.failedKeys.has(this.currentIndex)) {
        console.log(
          `[KeyManager] 🔄 Chuyển sang key #${this.currentIndex + 1}/${this.keys.length}`,
        );
        debugLog('KEY_MANAGER', `Rotated to key #${this.currentIndex + 1}`);
        return true;
      }
    } while (this.currentIndex !== startIndex && attempts < this.keys.length);

    // Nếu tất cả keys đều fail, reset và thử key đầu tiên
    if (this.failedKeys.size >= this.keys.length) {
      console.log('[KeyManager] ⚠️ Tất cả keys đều bị rate limit, reset và thử lại...');
      this.failedKeys.clear();
      this.failedKeyTimestamps.clear();
      this.currentIndex = 0;
      return true;
    }

    debugLog('KEY_MANAGER', 'No available key to rotate to');
    return false;
  }

  /**
   * Xử lý lỗi 429 - đánh dấu key fail và chuyển sang key khác
   * @returns true nếu đã chuyển key thành công
   */
  handleRateLimitError(): boolean {
    this.markCurrentKeyFailed();
    return this.rotateToNextKey();
  }

  /**
   * Reset tất cả trạng thái (dùng khi muốn clear cache)
   */
  reset(): void {
    this.currentIndex = 0;
    this.failedKeys.clear();
    this.failedKeyTimestamps.clear();
    debugLog('KEY_MANAGER', 'Reset all key states');
  }

  /**
   * Lấy thông tin status của tất cả keys
   */
  getStatus(): { index: number; masked: string; available: boolean }[] {
    this.resetCooledDownKeys();
    return this.keys.map((key, index) => ({
      index: index + 1,
      masked: `${key.substring(0, 8)}...${key.substring(key.length - 4)}`,
      available: !this.failedKeys.has(index),
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
