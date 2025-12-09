/**
 * Gemini Service - Re-export từ các sub-modules
 *
 * Cấu trúc:
 * - geminiConfig.ts: Cấu hình và khởi tạo
 * - geminiChat.ts: Quản lý chat sessions
 * - geminiStream.ts: Xử lý streaming
 */
import type { Content } from '@google/genai';
import { CONFIG } from '../../../../core/config/config.js';
import {
  debugLog,
  logAIHistory,
  logAIResponse,
  logError,
  logStep,
} from '../../../../core/logger/logger.js';
import {
  type AIResponse,
  DEFAULT_RESPONSE,
  parseAIResponse,
} from '../../../../shared/types/config.schema.js';
import { checkInputTokens } from '../../../../shared/utils/tokenCounter.js';
import {
  buildMessageParts,
  deleteChatSession,
  getChatSession,
  isRetryableError,
  sleep,
} from './geminiChat.js';
import { keyManager, type MediaPart } from './geminiConfig.js';
import { isRateLimitError } from './keyManager.js';

export { parseAIResponse } from '../../../../shared/types/config.schema.js';
export { deleteChatSession, getChatSession } from './geminiChat.js';
export type { MediaPart, MediaType } from './geminiConfig.js';
// Re-exports
export {
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
  characterPrompt?: string,
): Promise<AIResponse> {
  const mediaTypes = media?.map((m) => m.type) || [];
  logStep('generateContent', {
    type: media?.length ? 'with-media' : 'text-only',
    mediaCount: media?.length || 0,
    mediaTypes,
    promptLength: prompt.length,
    hasThread: !!threadId,
  });

  // Build parts trước để đếm token chính xác (bao gồm cả media)
  const parts = await buildMessageParts(prompt, media);

  // Kiểm tra token đầu vào (prompt + media) trước khi gọi AI
  const inputContent: Content = { role: 'user', parts };
  const tokenCheck = await checkInputTokens([inputContent], CONFIG.maxInputTokens);

  if (!tokenCheck.allowed) {
    console.log(
      `[Gemini] ⚠️ Token limit exceeded: ${tokenCheck.totalTokens}/${tokenCheck.maxTokens}`,
    );
    debugLog('GEMINI', `Token limit exceeded: ${tokenCheck.totalTokens}/${tokenCheck.maxTokens}`);

    // Trả về response với thông báo lỗi
    return {
      reactions: [],
      messages: [
        {
          text: tokenCheck.message || 'Token limit exceeded',
          sticker: '',
          quoteIndex: -1,
        },
      ],
      undoIndexes: [],
    };
  }

  const sessionId = threadId || `temp_${Date.now()}`;

  if (media?.length) {
    console.log(
      `[Gemini] 📦 Xử lý: ${media.length} media (${[...new Set(mediaTypes)].join(', ')})`,
    );
  }

  let lastError: any = null;
  let skipDelay = false; // Skip delay khi vừa đổi key (rate limit)

  // Retry loop
  for (let attempt = 0; attempt <= CONFIG.retry.maxRetries; attempt++) {
    if (attempt > 0 && !skipDelay) {
      const delayMs = CONFIG.retry.baseDelayMs * 2 ** (attempt - 1);
      console.log(`[Gemini] 🔄 Retry ${attempt}/${CONFIG.retry.maxRetries} sau ${delayMs}ms...`);
      debugLog('GEMINI', `Retry attempt ${attempt}, delay=${delayMs}ms`);
      await sleep(delayMs);
    }
    skipDelay = false; // Reset flag

    if (attempt > 0) {
      deleteChatSession(sessionId);
    }

    try {
      const chat = getChatSession(sessionId, history, characterPrompt);
      debugLog('GEMINI', `Using chat session: ${sessionId}, history=${history?.length || 0}, hasCharacter=${!!characterPrompt}`);

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

      // Xử lý lỗi 429 (rate limit) - chuyển key/model và gọi NGAY
      if (isRateLimitError(error)) {
        const rotated = keyManager.handleRateLimitError();
        if (rotated && attempt < CONFIG.retry.maxRetries) {
          console.log(
            `[Gemini] ⚠️ Lỗi 429: Rate limit, chuyển sang key #${keyManager.getCurrentKeyIndex()}/${keyManager.getTotalKeys()} (${keyManager.getCurrentModelName()}) - gọi ngay`,
          );
          debugLog(
            'GEMINI',
            `Rate limit, rotated to key #${keyManager.getCurrentKeyIndex()}, model=${keyManager.getCurrentModelName()}, calling immediately`,
          );
          skipDelay = true; // Đổi key rồi, gọi ngay không cần delay
          continue;
        }
      }

      // Xử lý các lỗi retryable khác (503, etc.) - CẦN delay
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
