/**
 * Imagen Key Manager - Quản lý và xoay vòng API keys + Imagen models
 * Hỗ trợ nhiều key, tự động chuyển khi gặp lỗi 429 (rate limit)
 * Tự động fallback model: 4.0-generate → 4.0-ultra → 4.0-fast
 *
 * Model: @google/genai (unified SDK).
 * Auth: chia sẻ BIẾN MÔI TRƯỜNG `GEMINI_API_KEY` (cùng Google AI Studio account
 *      với Gemini text) — nhưng STATE rate-limit (`rateLimitedKeys`,
 *      `blockedModels`) là ĐỘC LẬP với geminiKeyManager. Rate-limit ở Imagen
 *      không tự động áp dụng cho Gemini text và ngược lại.
 * Docs: https://ai.google.dev/gemini-api/docs/image-generation
 */
import { GoogleGenAI } from '@google/genai';
import { CONFIG } from '../../../../core/config/config.js';
import { debugLog } from '../../../../core/logger/logger.js';

// Danh sách Imagen models theo thứ tự ưu tiên (từ config).
// Per https://ai.google.dev/gemini-api/docs/imagen:
const getImagenModels = () =>
  CONFIG.imagen?.models ?? [
    'imagen-4.0-generate-001',
    'imagen-4.0-ultra-generate-001',
    'imagen-4.0-fast-generate-001',
  ];

const imagenModels = getImagenModels();
if (imagenModels.length === 0) {
  throw new Error(
    '[ImagenManager] ❌ `imagen.models` rỗng trong settings.json — cần ít nhất 1 model ID',
  );
}

export const IMAGEN_MODELS = imagenModels;

export type ImagenModel = string;

// Tạo tên hiển thị đẹp từ model id
function getModelName(model: string): string {
  const name = model.replace('imagen-', '').replace(/-/g, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Cache MODEL_NAMES để tránh tính toán lại
const MODEL_NAMES: Record<string, string> = {};
function getModelDisplayName(model: string): string {
  if (!MODEL_NAMES[model]) {
    MODEL_NAMES[model] = getModelName(model);
  }
  return MODEL_NAMES[model];
}

// Thời gian block theo loại rate limit (từ config, dùng chung với Gemini nếu không set)
const getRateLimitDurations = () => ({
  minute: CONFIG.imagen?.rateLimitMinuteMs ?? 120000,
  day: CONFIG.imagen?.rateLimitDayMs ?? 86400000,
});

// Thời gian block cho permission denied
const PERMISSION_DENIED_BLOCK_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

// Parse keys từ env (chia sẻ với Gemini: GEMINI_API_KEY, GEMINI_API_KEY_<n>)
function parseApiKeys(): string[] {
  const keys: string[] = [];

  const keysEnv = Bun.env.GEMINI_API_KEY || Bun.env.GEMINI_API_KEYS || '';
  if (keysEnv) {
    const parsed = keysEnv
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k && !k.startsWith('your_'));
    keys.push(...parsed);
  }

  const envKeys = Object.keys(Bun.env).filter((k) => /^GEMINI_API_KEY_\d+$/.test(k));
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

  const uniqueKeys = [...new Set(keys)];

  if (uniqueKeys.length === 0) {
    console.error(
      '❌ Chưa cấu hình GEMINI_API_KEY (Imagen dùng chung Gemini API). Vui lòng cấu hình GEMINI_API_KEY hoặc GEMINI_API_KEY_1, GEMINI_API_KEY_2... trong file .env',
    );
    // Intentional: mirrors geminiKeyManager. Imagen shares bot startup contract with Gemini text;
    // tests mocking this must mock `process.exit` để tránh kết thúc runner.
    process.exit(1);
  }

  return uniqueKeys;
}

class ImagenKeyManager {
  private keys: string[];
  private currentKeyIndex = 0;
  private currentModelIndex = 0;
  private aiInstances: Map<number, GoogleGenAI> = new Map();
  private rateLimitedKeys: Map<number, { blockedUntil: number; retryCount: number }> = new Map();
  private blockedModels: Map<number, number> = new Map();

  constructor() {
    this.keys = parseApiKeys();
    debugLog('IMAGEN_MANAGER', `Loaded ${this.keys.length} API key(s) for Imagen`);
    this.checkBlockedModels();
    this.getOrCreateInstance(0);
  }

  /** Check và unblock keys đã hết thời gian chờ */
  private checkBlockedKeys(): void {
    const now = Date.now();
    for (const [keyIndex, data] of this.rateLimitedKeys) {
      if (now >= data.blockedUntil) {
        this.rateLimitedKeys.delete(keyIndex);
        debugLog('IMAGEN_MANAGER', `Key #${keyIndex + 1} unblocked (rate limit expired)`);
      }
    }
  }

  /** Check và unblock models đã hết thời gian chờ */
  private checkBlockedModels(): void {
    const now = Date.now();
    let unblocked = false;

    this.checkBlockedKeys();

    for (let i = 0; i < IMAGEN_MODELS.length; i++) {
      const blockedUntil = this.blockedModels.get(i);
      if (blockedUntil && now >= blockedUntil) {
        this.blockedModels.delete(i);
        console.log(
          `[ImagenManager] ✅ Model ${getModelDisplayName(IMAGEN_MODELS[i])} đã hết thời gian chờ, có thể sử dụng lại`,
        );
        debugLog('IMAGEN_MANAGER', `Model ${IMAGEN_MODELS[i]} unblocked`);
        if (!unblocked) {
          this.currentModelIndex = i;
          this.currentKeyIndex = 0;
          this.rateLimitedKeys.clear();
          console.log(`[ImagenManager] 🔄 Quay lại model ${getModelDisplayName(IMAGEN_MODELS[i])}`);
          unblocked = true;
        }
      }
    }
  }

  private getOrCreateInstance(index: number): GoogleGenAI {
    if (!this.aiInstances.has(index)) {
      const instance = new GoogleGenAI({ apiKey: this.keys[index] });
      this.aiInstances.set(index, instance);
      debugLog('IMAGEN_MANAGER', `Created AI instance for key #${index + 1}`);
    }
    return this.aiInstances.get(index)!;
  }

  getCurrentAI(): GoogleGenAI {
    return this.getOrCreateInstance(this.currentKeyIndex);
  }

  getCurrentModel(): ImagenModel {
    this.checkBlockedModels();
    return IMAGEN_MODELS[this.currentModelIndex];
  }

  getCurrentModelName(): string {
    return getModelDisplayName(this.getCurrentModel());
  }

  getCurrentKeyIndex(): number {
    return this.currentKeyIndex + 1;
  }

  getTotalKeys(): number {
    return this.keys.length;
  }

  private markCurrentKeyRateLimited(): { isDaily: boolean } {
    const existing = this.rateLimitedKeys.get(this.currentKeyIndex);
    const retryCount = (existing?.retryCount || 0) + 1;
    const isDaily = retryCount > 1;
    const rateLimits = getRateLimitDurations();
    const duration = isDaily ? rateLimits.day : rateLimits.minute;
    const blockedUntil = Date.now() + duration;
    this.rateLimitedKeys.set(this.currentKeyIndex, { blockedUntil, retryCount });
    return { isDaily };
  }

  private blockCurrentModel(isDaily: boolean): void {
    const rateLimits = getRateLimitDurations();
    const duration = isDaily ? rateLimits.day : rateLimits.minute;
    const blockedUntil = Date.now() + duration;
    this.blockedModels.set(this.currentModelIndex, blockedUntil);
    console.log(
      `[ImagenManager] 🚫 Model ${getModelDisplayName(IMAGEN_MODELS[this.currentModelIndex])} bị block ${isDaily ? '24h (daily limit)' : '2 phút'}`,
    );
  }

  private rotateToNextModel(): boolean {
    for (let i = 1; i < IMAGEN_MODELS.length; i++) {
      const nextIndex = (this.currentModelIndex + i) % IMAGEN_MODELS.length;
      if (!this.blockedModels.has(nextIndex)) {
        this.currentModelIndex = nextIndex;
        this.rateLimitedKeys.clear();
        this.currentKeyIndex = 0;
        console.log(`[ImagenManager] 🔄 Chuyển sang model ${getModelDisplayName(IMAGEN_MODELS[nextIndex])}`);
        return true;
      }
    }
    return false;
  }

  rotateToNextKey(): boolean {
    this.checkBlockedKeys();
    if (this.keys.length === 1) {
      debugLog('IMAGEN_MANAGER', 'Only 1 key available, cannot rotate');
      return false;
    }
    const startIndex = this.currentKeyIndex;
    let attempts = 0;
    const now = Date.now();
    do {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      attempts++;
      const data = this.rateLimitedKeys.get(this.currentKeyIndex);
      if (!data || now >= data.blockedUntil) {
        if (data && now >= data.blockedUntil) {
          this.rateLimitedKeys.delete(this.currentKeyIndex);
        }
        console.log(
          `[ImagenManager] 🔄 Chuyển sang key #${this.currentKeyIndex + 1}/${this.keys.length} (${this.getCurrentModelName()})`,
        );
        return true;
      }
    } while (this.currentKeyIndex !== startIndex && attempts < this.keys.length);
    return false;
  }

  handlePermissionDeniedError(): boolean {
    const blockedUntil = Date.now() + PERMISSION_DENIED_BLOCK_MS;
    this.rateLimitedKeys.set(this.currentKeyIndex, { blockedUntil, retryCount: 999 });
    console.log(
      `[ImagenManager] 🚫 Key #${this.currentKeyIndex + 1} bị PERMISSION_DENIED (403), block 7 ngày`,
    );
    return this.rotateToNextKey();
  }

  handleRateLimitError(): boolean {
    const { isDaily } = this.markCurrentKeyRateLimited();
    console.log(`[ImagenManager] ⏳ Key #${this.currentKeyIndex + 1} bị rate limit ${isDaily ? '24h (daily limit)' : '2 phút'}`);

    if (this.rotateToNextKey()) {
      return true;
    }

    console.log(
      `[ImagenManager] ⚠️ Tất cả ${this.keys.length} keys đều bị rate limit cho model ${this.getCurrentModelName()}`,
    );
    this.blockCurrentModel(isDaily);

    if (this.rotateToNextModel()) {
      return true;
    }

    console.log('[ImagenManager] ❌ Tất cả Imagen models đều bị block');
    return false;
  }
}

// Singleton instance
export const imagenKeyManager = new ImagenKeyManager();

/** Check if error is a rate limit error (429) */
export function isImagenRateLimitError(error: any): boolean {
  const status = error?.status || error?.code;
  return status === 429;
}

/** Check if error is a permission denied error (403) */
export function isImagenPermissionDeniedError(error: any): boolean {
  const status = error?.status || error?.code;
  const message = error?.message || '';
  return (
    status === 403 ||
    message.includes('PERMISSION_DENIED') ||
    message.includes('does not have permission')
  );
}
