/**
 * Gemini Chat - Quản lý chat sessions
 */
import type { Chat, Content, Part } from '@google/genai';
import { debugLog } from '../../core/logger/logger.js';
import { CONFIG } from '../../shared/constants/config.js';
import { fetchAsBase64 } from '../../shared/utils/httpClient.js';
import { ai, GEMINI_CONFIG, GEMINI_MODEL, type MediaPart } from './geminiConfig.js';
import { getSystemPrompt } from './prompts.js';

// Chat session storage
const chatSessions = new Map<string, Chat>();

// Lấy SYSTEM_PROMPT động dựa trên config
const getPrompt = () => getSystemPrompt(CONFIG.useCharacter);

/**
 * Lấy hoặc tạo chat session cho thread
 */
export function getChatSession(threadId: string, history?: Content[]): Chat {
  let chat = chatSessions.get(threadId);

  if (!chat) {
    debugLog('GEMINI', `Creating new chat session for thread ${threadId}`);
    chat = ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        ...GEMINI_CONFIG,
        systemInstruction: getPrompt(),
      },
      history: history || [],
    });
    chatSessions.set(threadId, chat);
  }

  return chat;
}

/**
 * Xóa chat session
 */
export function deleteChatSession(threadId: string): void {
  chatSessions.delete(threadId);
}

/**
 * Build message parts từ prompt và media
 */
export async function buildMessageParts(prompt: string, media?: MediaPart[]): Promise<Part[]> {
  const parts: Part[] = [{ text: prompt }];

  if (!media || media.length === 0) {
    return parts;
  }

  for (const item of media) {
    try {
      if (item.type === 'youtube' && item.url) {
        parts.push({ fileData: { fileUri: item.url, mimeType: 'video/mp4' } });
        debugLog('GEMINI', `Added YouTube: ${item.url}`);
      } else if (item.base64) {
        parts.push({
          inlineData: {
            data: item.base64,
            mimeType: item.mimeType || 'application/octet-stream',
          },
        });
        debugLog('GEMINI', `Added pre-converted: ${item.mimeType}`);
      } else if (item.url) {
        const base64Data = await fetchAsBase64(item.url);
        if (base64Data) {
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: item.mimeType || 'application/octet-stream',
            },
          });
          debugLog('GEMINI', `Loaded ${item.type}: ${item.mimeType}`);
        }
      }
    } catch (e) {
      debugLog('GEMINI', `Error loading ${item.type}: ${e}`);
    }
  }

  return parts;
}

/**
 * Check if error is retryable (503, 429, etc.)
 */
export function isRetryableError(error: any): boolean {
  const status = error?.status || error?.code;
  return CONFIG.retry.retryableStatusCodes.includes(status);
}

/**
 * Sleep helper
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
