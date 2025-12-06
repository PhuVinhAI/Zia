/**
 * Gemini Config - Cấu hình và khởi tạo Gemini API
 * Runtime: Bun
 */
import { debugLog } from '../../core/logger/logger.js';
import { setAIService } from '../../shared/types/ai.types.js';
import { keyManager } from './keyManager.js';

debugLog('GEMINI', 'Initializing Gemini API with Key Manager...');

// Export getter để luôn lấy AI instance hiện tại (có thể đã rotate)
export const getAI = () => keyManager.getCurrentAI();

// Backward compatibility - export ai như getter
export const ai = keyManager.getCurrentAI();

// Register AI service cho shared layer (dependency inversion)
// Sử dụng getter để luôn dùng key hiện tại
setAIService({
  countTokens: (params) => keyManager.getCurrentAI().models.countTokens(params),
});

// Re-export key manager utilities
export { keyManager, type GeminiModel, GEMINI_MODELS } from './keyManager.js';

// Model động - lấy từ keyManager (hỗ trợ fallback)
export const getGeminiModel = () => keyManager.getCurrentModel();

export const GEMINI_CONFIG = {
  temperature: 1,
  topP: 0.95,
  maxOutputTokens: 65536,
  thinkingConfig: {
    thinkingBudget: 8192,
  },
  tools: [{ googleSearch: {} }, { urlContext: {} }],
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
