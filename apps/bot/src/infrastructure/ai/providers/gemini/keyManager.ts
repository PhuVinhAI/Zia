/**
 * Gemini API Key Manager - Quản lý và xoay vòng API keys + models
 * Hỗ trợ nhiều key, tự động chuyển khi gặp lỗi 429 (rate limit)
 * Tự động fallback model: 2.5 pro → flash-latest → flash-lite-latest
 */
import { GoogleGenAI } from '@google/genai';
import { CONFIG } from '../../../../core/config/config.js';
import { debugLog } from '../../../../core/logger/logger.js';

// Danh sách models theo thứ tự ưu tiên (từ config).
// Per @google/genai docs (https://ai.google.dev/gemini-api/docs/models), latest stable Flash-Lite là `models/gemini-3.1-flash-lite`.
const getGeminiModels = () =>
  CONFIG.gemini?.models ?? [
    'models/gemini-3.1-flash-lite',
  ];

export const GEMINI_MODELS = getGeminiModels();

export type GeminiModel = string;

// Tạo tên model từ model path
function getModelName(model: string): string {
  const name = model.replace('models/', '').replace(/-/g, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Thời gian block theo loại rate limit (từ config)
const getRateLimitDurations = () => ({
  minute: CONFIG.gemini?.rateLimitMinuteMs ?? 120000, // 2 phút cho RPM
  day: CONFIG.gemini?.rateLimitDayMs ?? 86400000, // 24 giờ cho RPD
});

// Thời gian block cho permission denied (key invalid/revoked)
const PERMISSION_DENIED_BLOCK_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày (coi như vĩnh viễn)

// Cache MODEL_NAMES để tránh tính toán lại
const MODEL_NAMES: Record<string, string> = {};
function getModelDisplayName(model: string): string {
  if (!MODEL_NAMES[model]) {
    MODEL_NAMES[model] = getModelName(model);
  }
  return MODEL_NAMES[model];
}

// Parse keys từ env
// Hỗ trợ 2 cách:
// 1. Comma-separated: GEMINI_API_KEY=key1,key2,key3
// 2. Dọc (nhiều biến): GEMINI_API_KEY_1=key1, GEMINI_API_KEY_2=key2, ... (không giới hạn số lượng)
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

  // Cách 2: Đọc từ GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... (không giới hạn)
  // Quét tất cả env vars có pattern GEMINI_API_KEY_<số>
  const envKeys = Object.keys(Bun.env).filter((k) => /^GEMINI_API_KEY_\d+$/.test(k));
  // Sắp xếp theo số thứ tự
  envKeys.sort((a, b) => {
    const numA = parseInt(a.replace('GEMINI_API_KEY_', ''), 10);
    const numB = parseInt(b.replace('GEMINI_API_KEY_', ''), 10);
    return numA - numB;
  });
  for (const envKey of envKeys) {
    const key = Bun.env[envKey]?.trim();
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
  private rateLimitedKeys: Map<number, { blockedUntil: number; retryCount: number }> = new Map();
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
   * Check và unblock keys đã hết thời gian chờ
   */
  private checkBlockedKeys(): void {
    const now = Date.now();
    for (const [keyIndex, data] of this.rateLimitedKeys) {
      if (now >= data.blockedUntil) {
        this.rateLimitedKeys.delete(keyIndex);
        debugLog('KEY_MANAGER', `Key #${keyIndex + 1} unblocked (rate limit expired)`);
      }
    }
  }

  /**
   * Check và unblock models đã hết thời gian chờ
   * Ưu tiên theo thứ tự: 2.5 pro > flash-latest > flash-lite-latest
   */
  private checkBlockedModels(): void {
    const now = Date.now();
    let unblocked = false;

    // Check keys trước
    this.checkBlockedKeys();

    // Check từ model ưu tiên cao nhất
    for (let i = 0; i < GEMINI_MODELS.length; i++) {
      const blockedUntil = this.blockedModels.get(i);
      if (blockedUntil && now >= blockedUntil) {
        this.blockedModels.delete(i);
        console.log(
          `[KeyManager] ✅ Model ${getModelDisplayName(GEMINI_MODELS[i])} đã hết thời gian chờ, có thể sử dụng lại`,
        );
        debugLog('KEY_MANAGER', `Model ${GEMINI_MODELS[i]} unblocked`);

        // Chuyển về model ưu tiên cao nhất vừa được unblock
        if (!unblocked) {
          this.currentModelIndex = i;
          this.currentKeyIndex = 0;
          this.rateLimitedKeys.clear(); // Reset keys khi đổi model
          console.log(`[KeyManager] 🔄 Quay lại model ${getModelDisplayName(GEMINI_MODELS[i])}`);
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
    return getModelDisplayName(this.getCurrentModel());
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
   * Lần đầu: block 2 phút (có thể là per-minute limit)
   * Lần 2+: block 24h (chắc chắn là daily limit)
   */
  private markCurrentKeyRateLimited(): { duration: number; isDaily: boolean } {
    const existing = this.rateLimitedKeys.get(this.currentKeyIndex);
    const retryCount = (existing?.retryCount || 0) + 1;

    // Lần đầu: block 2 phút, lần 2+: block 24h
    const isDaily = retryCount > 1;
    const rateLimits = getRateLimitDurations();
    const duration = isDaily ? rateLimits.day : rateLimits.minute;
    const blockedUntil = Date.now() + duration;

    this.rateLimitedKeys.set(this.currentKeyIndex, { blockedUntil, retryCount });

    const durationText = isDaily ? '24h (daily limit confirmed)' : '2 phút (checking...)';
    debugLog(
      'KEY_MANAGER',
      `Key #${this.currentKeyIndex + 1} marked as rate limited (retry #${retryCount}) for ${durationText}`,
    );

    return { duration, isDaily };
  }

  /**
   * Đánh dấu model hiện tại không sử dụng
   * @param isDaily - true nếu đã xác định là daily limit
   */
  private blockCurrentModel(isDaily: boolean): void {
    const rateLimits = getRateLimitDurations();
    const duration = isDaily ? rateLimits.day : rateLimits.minute;
    const blockedUntil = Date.now() + duration;
    this.blockedModels.set(this.currentModelIndex, blockedUntil);
    const model = GEMINI_MODELS[this.currentModelIndex];

    const durationText = isDaily ? '24h (daily limit)' : '2 phút';
    console.log(
      `[KeyManager] 🚫 Model ${getModelDisplayName(model)} bị block ${durationText} (tất cả keys đều rate limit)`,
    );
    debugLog('KEY_MANAGER', `Model ${model} blocked until ${new Date(blockedUntil).toISOString()}`);
  }

  /**
   * Chuyển sang model tiếp theo (không bị block)
   * @returns true nếu chuyển thành công
   */
  private rotateToNextModel(): boolean {
    for (let i = 1; i < GEMINI_MODELS.length; i++) {
      const nextIndex = (this.currentModelIndex + i) % GEMINI_MODELS.length;

      if (!this.blockedModels.has(nextIndex)) {
        this.currentModelIndex = nextIndex;
        this.rateLimitedKeys.clear(); // Reset keys khi đổi model
        this.currentKeyIndex = 0;

        const model = GEMINI_MODELS[nextIndex];
        console.log(`[KeyManager] 🔄 Chuyển sang model ${getModelDisplayName(model)}`);
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
    // Check và unblock keys đã hết thời gian chờ trước
    this.checkBlockedKeys();

    if (this.keys.length === 1) {
      debugLog('KEY_MANAGER', 'Only 1 key available, cannot rotate');
      return false;
    }

    const startIndex = this.currentKeyIndex;
    let attempts = 0;
    const now = Date.now();

    // Tìm key tiếp theo chưa bị rate limit hoặc đã hết thời gian block
    do {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      attempts++;

      const data = this.rateLimitedKeys.get(this.currentKeyIndex);
      if (!data || now >= data.blockedUntil) {
        // Xóa khỏi danh sách nếu đã hết thời gian block
        if (data && now >= data.blockedUntil) {
          this.rateLimitedKeys.delete(this.currentKeyIndex);
        }
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
   * Xử lý lỗi 403 (permission denied) - block key vĩnh viễn và chuyển sang key khác
   * Lỗi này xảy ra khi key không hợp lệ, bị revoke, hoặc không có quyền truy cập model
   * @returns true nếu đã chuyển key thành công
   */
  handlePermissionDeniedError(): boolean {
    const blockedUntil = Date.now() + PERMISSION_DENIED_BLOCK_MS;
    this.rateLimitedKeys.set(this.currentKeyIndex, { blockedUntil, retryCount: 999 }); // retryCount cao để không retry

    console.log(
      `[KeyManager] 🚫 Key #${this.currentKeyIndex + 1} bị PERMISSION_DENIED (403), block 7 ngày`,
    );
    debugLog(
      'KEY_MANAGER',
      `Key #${this.currentKeyIndex + 1} blocked for 7 days due to PERMISSION_DENIED`,
    );

    // Thử chuyển sang key khác (không đổi model vì lỗi này do key, không phải model)
    return this.rotateToNextKey();
  }

  /**
   * Xử lý lỗi 429 (rate limit) - đánh dấu key và chuyển sang key khác
   * Logic thông minh:
   * - Lần đầu bị 429: block key 2 phút (có thể là per-minute limit)
   * - Sau 2 phút vẫn bị 429: block key 24h (xác định là daily limit)
   * @returns true nếu đã chuyển key/model thành công
   */
  handleRateLimitError(): boolean {
    const { isDaily } = this.markCurrentKeyRateLimited();

    const durationText = isDaily ? '24h (daily limit confirmed)' : '2 phút (checking...)';
    console.log(`[KeyManager] ⏳ Key #${this.currentKeyIndex + 1} bị rate limit ${durationText}`);

    // Thử chuyển key trước
    if (this.rotateToNextKey()) {
      return true;
    }

    // Tất cả keys đều rate limit → block model và chuyển model
    console.log(
      `[KeyManager] ⚠️ Tất cả ${this.keys.length} keys đều bị rate limit cho model ${this.getCurrentModelName()}`,
    );
    this.blockCurrentModel(isDaily);

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
  getStatus(): {
    index: number;
    masked: string;
    available: boolean;
    blockedUntil?: Date;
    retryCount?: number;
  }[] {
    const now = Date.now();
    return this.keys.map((key, index) => {
      const data = this.rateLimitedKeys.get(index);
      return {
        index: index + 1,
        masked: `${key.substring(0, 8)}...${key.substring(key.length - 4)}`,
        available: !data || now >= data.blockedUntil,
        blockedUntil: data && now < data.blockedUntil ? new Date(data.blockedUntil) : undefined,
        retryCount: data?.retryCount,
      };
    });
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
        name: getModelDisplayName(model),
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

/**
 * Check if error is a permission denied error (403)
 * Có thể do key không hợp lệ, bị revoke, hoặc không có quyền truy cập model
 */
export function isPermissionDeniedError(error: any): boolean {
  const status = error?.status || error?.code;
  const message = error?.message || '';
  return (
    status === 403 ||
    message.includes('PERMISSION_DENIED') ||
    message.includes('does not have permission')
  );
}
