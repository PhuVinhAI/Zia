/**
 * Gemini API Key Manager - Quản lý và xoay vòng API keys + models
 * Hỗ trợ nhiều key, tự động chuyển khi gặp lỗi 429 (rate limit)
 * Tự động fallback model: 2.5 pro → flash-latest → flash-lite-latest
 */
import { GoogleGenAI } from '@google/genai';
import { debugLog } from '../../core/logger/logger.js';

// Danh sách models theo thứ tự ưu tiên
export const GEMINI_MODELS = [
  'models/gemini-2.5-pro',
  'models/gemini-flash-latest',
  'models/gemini-robotics-er-1.5-preview',
  'models/gemini-flash-lite-latest',
] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number];

const MODEL_NAMES: Record<GeminiModel, string> = {
  'models/gemini-2.5-pro': '2.5 Pro',
  'models/gemini-flash-latest': 'Flash Latest',
  'models/gemini-robotics-er-1.5-preview': 'Robotics ER 1.5',
  'models/gemini-flash-lite-latest': 'Flash Lite Latest',
};

// Thời gian block model (24 giờ)
const MODEL_BLOCK_DURATION_MS = 24 * 60 * 60 * 1000;

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
    console.error(
      '❌ Vui lòng cấu hình GEMINI_API_KEY hoặc GEMINI_API_KEY_1, GEMINI_API_KEY_2... trong file .env',
    );
    process.exit(1);
  }

  return uniqueKeys;
}

class GeminiKeyManager {
  private keys: string[];
  private currentKeyIndex = 0;
  private currentModelIndex = 0;
  private aiInstances: Map<number, GoogleGenAI> = new Map();
  private rateLimitedKeys: Set<number> = new Set(); // Track keys đang bị rate limit (429)
  private blockedModels: Map<number, number> = new Map(); // modelIndex -> blockedUntil timestamp

  constructor() {
    this.keys = parseApiKeys();
    debugLog('KEY_MANAGER', `Loaded ${this.keys.length} API key(s)`);

    // Check và restore model availability
    this.checkBlockedModels();

    // Khởi tạo instance đầu tiên
    this.getOrCreateInstance(0);
  }

  /**
   * Check và unblock models đã hết thời gian chờ
   * Ưu tiên theo thứ tự: 2.5 pro > flash-latest > flash-lite-latest
   */
  private checkBlockedModels(): void {
    const now = Date.now();
    let unblocked = false;

    // Check từ model ưu tiên cao nhất
    for (let i = 0; i < GEMINI_MODELS.length; i++) {
      const blockedUntil = this.blockedModels.get(i);
      if (blockedUntil && now >= blockedUntil) {
        this.blockedModels.delete(i);
        console.log(
          `[KeyManager] ✅ Model ${MODEL_NAMES[GEMINI_MODELS[i]]} đã hết thời gian chờ, có thể sử dụng lại`,
        );
        debugLog('KEY_MANAGER', `Model ${GEMINI_MODELS[i]} unblocked`);

        // Chuyển về model ưu tiên cao nhất vừa được unblock
        if (!unblocked) {
          this.currentModelIndex = i;
          this.rateLimitedKeys.clear(); // Reset keys khi đổi model
          unblocked = true;
        }
      }
    }
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
    return this.getOrCreateInstance(this.currentKeyIndex);
  }

  /**
   * Lấy model hiện tại
   */
  getCurrentModel(): GeminiModel {
    this.checkBlockedModels(); // Check trước khi trả về
    return GEMINI_MODELS[this.currentModelIndex];
  }

  /**
   * Lấy tên model hiện tại (cho display)
   */
  getCurrentModelName(): string {
    return MODEL_NAMES[this.getCurrentModel()];
  }

  /**
   * Lấy key hiện tại (masked cho logging)
   */
  getCurrentKeyMasked(): string {
    const key = this.keys[this.currentKeyIndex];
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  }

  /**
   * Lấy index hiện tại (1-based cho display)
   */
  getCurrentKeyIndex(): number {
    return this.currentKeyIndex + 1;
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
    this.rateLimitedKeys.add(this.currentKeyIndex);
    debugLog('KEY_MANAGER', `Key #${this.currentKeyIndex + 1} marked as rate limited`);
  }

  /**
   * Đánh dấu model hiện tại không sử dụng trong 24h
   */
  private blockCurrentModel(): void {
    const blockedUntil = Date.now() + MODEL_BLOCK_DURATION_MS;
    this.blockedModels.set(this.currentModelIndex, blockedUntil);
    const model = GEMINI_MODELS[this.currentModelIndex];
    console.log(
      `[KeyManager] 🚫 Model ${MODEL_NAMES[model]} bị block 24h (tất cả keys đều rate limit)`,
    );
    debugLog('KEY_MANAGER', `Model ${model} blocked until ${new Date(blockedUntil).toISOString()}`);
  }

  /**
   * Chuyển sang model tiếp theo (không bị block)
   * @returns true nếu chuyển thành công
   */
  private rotateToNextModel(): boolean {
    const startIndex = this.currentModelIndex;

    for (let i = 1; i < GEMINI_MODELS.length; i++) {
      const nextIndex = (this.currentModelIndex + i) % GEMINI_MODELS.length;

      if (!this.blockedModels.has(nextIndex)) {
        this.currentModelIndex = nextIndex;
        this.rateLimitedKeys.clear(); // Reset keys khi đổi model
        this.currentKeyIndex = 0;

        const model = GEMINI_MODELS[nextIndex];
        console.log(`[KeyManager] 🔄 Chuyển sang model ${MODEL_NAMES[model]}`);
        debugLog('KEY_MANAGER', `Rotated to model ${model}`);
        return true;
      }
    }

    debugLog('KEY_MANAGER', 'All models are blocked');
    return false;
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

    const startIndex = this.currentKeyIndex;
    let attempts = 0;

    // Tìm key tiếp theo chưa bị rate limit
    do {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      attempts++;

      if (!this.rateLimitedKeys.has(this.currentKeyIndex)) {
        console.log(
          `[KeyManager] 🔄 Chuyển sang key #${this.currentKeyIndex + 1}/${this.keys.length} (${this.getCurrentModelName()})`,
        );
        debugLog('KEY_MANAGER', `Rotated to key #${this.currentKeyIndex + 1}`);
        return true;
      }
    } while (this.currentKeyIndex !== startIndex && attempts < this.keys.length);

    debugLog('KEY_MANAGER', 'No available key to rotate to');
    return false;
  }

  /**
   * Xử lý lỗi 429 (rate limit) - đánh dấu key và chuyển sang key khác
   * Nếu tất cả keys đều rate limit → block model 24h và chuyển model
   * @returns true nếu đã chuyển key/model thành công
   */
  handleRateLimitError(): boolean {
    this.markCurrentKeyRateLimited();

    // Thử chuyển key trước
    if (this.rotateToNextKey()) {
      return true;
    }

    // Tất cả keys đều rate limit → block model và chuyển model
    console.log(
      `[KeyManager] ⚠️ Tất cả ${this.keys.length} keys đều bị rate limit cho model ${this.getCurrentModelName()}`,
    );
    this.blockCurrentModel();

    // Thử chuyển sang model khác
    if (this.rotateToNextModel()) {
      return true;
    }

    // Tất cả models đều bị block
    console.log('[KeyManager] ❌ Tất cả models đều bị block, không thể tiếp tục');
    return false;
  }

  /**
   * Reset tất cả trạng thái (dùng khi muốn clear cache)
   */
  reset(): void {
    this.currentKeyIndex = 0;
    this.currentModelIndex = 0;
    this.rateLimitedKeys.clear();
    this.blockedModels.clear();
    debugLog('KEY_MANAGER', 'Reset all key and model states');
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

  /**
   * Lấy thông tin status của tất cả models
   */
  getModelStatus(): {
    model: GeminiModel;
    name: string;
    available: boolean;
    blockedUntil?: Date;
  }[] {
    const now = Date.now();
    return GEMINI_MODELS.map((model, index) => {
      const blockedUntil = this.blockedModels.get(index);
      return {
        model,
        name: MODEL_NAMES[model],
        available: !blockedUntil || now >= blockedUntil,
        blockedUntil: blockedUntil ? new Date(blockedUntil) : undefined,
      };
    });
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
