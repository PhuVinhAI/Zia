/**
 * Gemini Config - Cấu hình và khởi tạo Gemini API
 * Runtime: Bun
 *
 * Tất cả API calls đều khớp với official examples:
 * - https://github.com/googleapis/js-genai/blob/main/codegen_instructions.md
 * - https://googleapis.github.io/js-genai/release_docs/index.html
 */
import { HarmBlockThreshold, HarmCategory, ThinkingLevel } from '@google/genai';
import { CONFIG } from '../../../../core/config/config.js';
import { debugLog } from '../../../../core/logger/logger.js';
import { setAIService } from '../../../../shared/types/ai.types.js';
import { keyManager } from './keyManager.js';

debugLog('GEMINI', 'Initializing Gemini API with Key Manager...');

// Export getter để luôn lấy AI instance hiện tại (có thể đã rotate)
export const getAI = () => keyManager.getCurrentAI();

// Register AI service cho shared layer (dependency inversion)
// Sử dụng getter để luôn dùng key hiện tại
setAIService({
  countTokens: (params) => keyManager.getCurrentAI().models.countTokens(params),
});

// Re-export key manager utilities
export { GEMINI_MODELS, type GeminiModel, keyManager } from './keyManager.js';

// Model động - lấy từ keyManager (hỗ trợ fallback)
export const getGeminiModel = () => keyManager.getCurrentModel();

// Safety settings - tắt các bộ lọc không liên quan NSFW để tránh response rỗng.
// HARM_CATEGORY_SEXUALLY_EXPLICIT dùng Gemini default (chặn nội dung người lớn).
// Xem: https://googleapis.github.io/js-genai/release_docs/index.html (Safety configurations)
const SAFETY_SETTINGS: Array<{ category: HarmCategory; threshold: HarmBlockThreshold }> = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.OFF },
];

/**
 * Detect Gemini 3 series models — để chọn `thinkingLevel` (Gemini 3) thay vì `thinkingBudget` (Gemini 2.5).
 * Theo codegen_instructions.md chính thức của @google/genai:
 * - Gemini 2.5: dùng `thinkingConfig.thinkingBudget`
 * - Gemini 3:   khuyến nghị `thinkingConfig.thinkingLevel` ('MINIMAL'|'LOW'|'MEDIUM'|'HIGH')
 */
function isGemini3Model(model: string): boolean {
  const id = model.replace(/^models\//, '');
  return /^gemini-3-/.test(id);
}

/**
 * Shape của thinkingConfig theo @google/genai GenerateContentConfig:
 * - Thinking 2.5: `{ thinkingBudget?: number; includeThoughts?: boolean }`
 * - Thinking 3:   `{ thinkingLevel?: ThinkingLevel; includeThoughts?: boolean }`
 * Dùng union để giữ type-safety khi truyền vào SDK.
 * Xem: https://github.com/googleapis/js-genai/blob/main/codegen_instructions.md (Thinking)
 */
type ThinkingConfig = { thinkingBudget?: number; thinkingLevel?: ThinkingLevel; includeThoughts?: boolean };

/**
 * Build `thinkingConfig` phù hợp với từng dòng model — match chính xác official examples.
 */
function buildThinkingConfig(): ThinkingConfig {
  if (isGemini3Model(getGeminiModel())) {
    return { thinkingLevel: (CONFIG.gemini?.thinkingLevel ?? 'MEDIUM') as ThinkingLevel };
  }
  return { thinkingBudget: CONFIG.gemini?.thinkingBudget ?? 8192 };
}

/**
 * GEMINI_CONFIG — config object passed to `ai.chats.create({ config })` and `ai.models.*` calls.
 * Shape khớp với `GenerateContentConfig` trong @google/genai (xem official docs).
 */
export const GEMINI_CONFIG = {
  get temperature() {
    return CONFIG.gemini?.temperature ?? 1;
  },
  get topP() {
    return CONFIG.gemini?.topP ?? 0.95;
  },
  get maxOutputTokens() {
    return CONFIG.gemini?.maxOutputTokens ?? 65536;
  },
  get thinkingConfig(): ThinkingConfig {
    return buildThinkingConfig();
  },
  // Built-in URL reading tool — xem https://ai.google.dev/gemini-api/docs/url-context
  tools: [{ urlContext: {} }],
  safetySettings: SAFETY_SETTINGS,
};

// Regex để detect YouTube URL
const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;

export function extractYouTubeUrls(text: string): string[] {
  return [...text.matchAll(YOUTUBE_REGEX)].map((m) => `https://www.youtube.com/watch?v=${m[1]}`);
}

// Media types
export type MediaType = 'image' | 'video' | 'audio' | 'file' | 'youtube';

export interface MediaPart {
  type: MediaType;
  url?: string;
  mimeType?: string;
  base64?: string;
}
