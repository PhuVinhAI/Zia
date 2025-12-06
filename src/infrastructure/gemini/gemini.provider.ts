/**
 * Gemini Service - Re-export từ các sub-modules
 *
 * Cấu trúc:
 * - geminiConfig.ts: Cấu hình và khởi tạo
 * - geminiChat.ts: Quản lý chat sessions
 * - geminiStream.ts: Xử lý streaming
 */
import type { Content } from '@google/genai';
import {
  debugLog,
  logAIHistory,
  logAIResponse,
  logError,
  logStep,
} from '../../core/logger/logger.js';
import { CONFIG } from '../../shared/constants/config.js';
import {
  type AIResponse,
  DEFAULT_RESPONSE,
  parseAIResponse,
} from '../../shared/types/config.schema.js';
import {
  buildMessageParts,
  deleteChatSession,
  getChatSession,
  isRetryableError,
  sleep,
} from './geminiChat.js';
import { keyManager, type MediaPart } from './geminiConfig.js';
import { isRateLimitError } from './keyManager.js';

export { parseAIResponse } from '../../shared/types/config.schema.js';
export { deleteChatSession, getChatSession } from './geminiChat.js';
export type { MediaPart, MediaType } from './geminiConfig.js';
// Re-exports
export {
  ai,
  extractYouTubeUrls,
  GEMINI_CONFIG,
  getAI,
  getGeminiModel,
  keyManager,
} from './geminiConfig.js';
export type { StreamCallbacks } from './geminiStream.js';
export { generateContentStream } from './geminiStream.js';
export { isRateLimitError } from './keyManager.js';

/**
 * Generate content sử dụng Chat session (non-streaming)
 */
export async function generateContent(
  prompt: string,
  media?: MediaPart[],
  threadId?: string,
  history?: Content[],
): Promise<AIResponse> {
  const mediaTypes = media?.map((m) => m.type) || [];
  logStep('generateContent', {
    type: media?.length ? 'with-media' : 'text-only',
    mediaCount: media?.length || 0,
    mediaTypes,
    promptLength: prompt.length,
    hasThread: !!threadId,
  });

  const parts = await buildMessageParts(prompt, media);
  const sessionId = threadId || `temp_${Date.now()}`;

  if (media?.length) {
    console.log(
      `[Gemini] 📦 Xử lý: ${media.length} media (${[...new Set(mediaTypes)].join(', ')})`,
    );
  }

  let lastError: any = null;

  // Retry loop
  for (let attempt = 0; attempt <= CONFIG.retry.maxRetries; attempt++) {
    if (attempt > 0) {
      const delayMs = CONFIG.retry.baseDelayMs * 2 ** (attempt - 1);
      console.log(`[Gemini] 🔄 Retry ${attempt}/${CONFIG.retry.maxRetries} sau ${delayMs}ms...`);
      debugLog('GEMINI', `Retry attempt ${attempt}, delay=${delayMs}ms`);
      await sleep(delayMs);

      deleteChatSession(sessionId);
    }

    try {
      const chat = getChatSession(sessionId, history);
      debugLog('GEMINI', `Using chat session: ${sessionId}, history=${history?.length || 0}`);

      if (history && history.length > 0) {
        logAIHistory(sessionId, history);
      }

      const response = await chat.sendMessage({ message: parts });
      const rawText = response.text || '{}';

      if (attempt > 0) {
        console.log(`[Gemini] ✅ Retry thành công sau ${attempt} lần thử`);
      }

      if (!threadId) deleteChatSession(sessionId);

      logAIResponse(prompt.substring(0, 100), rawText);
      return parseAIResponse(rawText);
    } catch (error: any) {
      lastError = error;

      // Xử lý lỗi 429 (rate limit) - chuyển key/model
      if (isRateLimitError(error)) {
        const rotated = keyManager.handleRateLimitError();
        if (rotated && attempt < CONFIG.retry.maxRetries) {
          console.log(
            `[Gemini] ⚠️ Lỗi 429: Rate limit, chuyển sang key #${keyManager.getCurrentKeyIndex()}/${keyManager.getTotalKeys()} (${keyManager.getCurrentModelName()})`,
          );
          debugLog(
            'GEMINI',
            `Rate limit, rotated to key #${keyManager.getCurrentKeyIndex()}, model=${keyManager.getCurrentModelName()}`,
          );
          deleteChatSession(sessionId);
          continue;
        }
      }

      // Xử lý các lỗi retryable khác (503, etc.)
      if (isRetryableError(error) && attempt < CONFIG.retry.maxRetries) {
        console.log(`[Gemini] ⚠️ Lỗi ${error.status || error.code}: Model overloaded, sẽ retry...`);
        debugLog('GEMINI', `Retryable error: ${error.status || error.code}`);
        continue;
      }

      break;
    }
  }

  logError('generateContent', lastError);
  console.error('Gemini Error:', lastError);

  if (threadId) {
    debugLog('GEMINI', `Error with chat session, resetting thread ${threadId}`);
    deleteChatSession(threadId);
  }

  return DEFAULT_RESPONSE;
}
