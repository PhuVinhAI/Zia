/**
 * Gemini Stream - Xử lý streaming responses
 */
import type { Content } from '@google/genai';
import {
  debugLog,
  logAIHistory,
  logAIResponse,
  logError,
  logSystemPrompt,
} from '../../core/logger/logger.js';
import { CONFIG } from '../../shared/constants/config.js';
import {
  buildMessageParts,
  deleteChatSession,
  getChatSession,
  isRetryableError,
  sleep,
} from './geminiChat.js';
import { keyManager, type MediaPart } from './geminiConfig.js';
import { isRateLimitError } from './keyManager.js';
import { getSystemPrompt } from './prompts.js';

export interface StreamCallbacks {
  onReaction?: (reaction: string) => Promise<void>;
  onSticker?: (keyword: string) => Promise<void>;
  onMessage?: (text: string, quoteIndex?: number) => Promise<void>;
  onCard?: (userId?: string) => Promise<void>;
  onUndo?: (index: number) => Promise<void>;
  onImage?: (url: string, caption?: string) => Promise<void>;
  onComplete?: () => void | Promise<void>;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

interface ParserState {
  buffer: string;
  sentReactions: Set<string>;
  sentStickers: Set<string>;
  sentMessages: Set<string>;
  sentCards: Set<string>;
  sentUndos: Set<string>;
  sentImages: Set<string>;
}

const VALID_REACTIONS = new Set(['heart', 'haha', 'wow', 'sad', 'angry', 'like']);

// Regex patterns để strip tags
const TAG_PATTERNS = [
  /\[reaction:(\d+:)?\w+\]/gi,
  /\[sticker:\w+\]/gi,
  /\[quote:-?\d+\][\s\S]*?\[\/quote\]/gi,
  /\[msg\][\s\S]*?\[\/msg\]/gi,
  /\[undo:-?\d+\]/gi,
  /\[card(?::\d+)?\]/gi,
  /\[tool:\w+(?:\s+[^\]]*?)?\](?:\s*\{[\s\S]*?\}\s*\[\/tool\])?/gi,
  /\[image:https?:\/\/[^\]]+\][\s\S]*?\[\/image\]/gi,
];

function getPlainText(buffer: string): string {
  return TAG_PATTERNS.reduce((text, pattern) => text.replace(pattern, ''), buffer).trim();
}

// Inline tag patterns để strip khỏi text content
const INLINE_TAG_PATTERNS = [
  /\[reaction:(\d+:)?\w+\]/gi,
  /\[sticker:\w+\]/gi,
  /\[undo:-?\d+\]/gi,
  /\[card(?::\d+)?\]/gi,
];

function cleanInlineTags(text: string): string {
  return INLINE_TAG_PATTERNS.reduce((t, pattern) => t.replace(pattern, ''), text).trim();
}

/**
 * Xử lý các inline tags bên trong text block ([msg] hoặc [quote])
 * Extract và gửi sticker, reaction, link, card, undo trước khi gửi text
 */
async function processInlineTags(
  rawText: string,
  state: ParserState,
  callbacks: StreamCallbacks,
): Promise<void> {
  // Extract stickers
  for (const match of rawText.matchAll(/\[sticker:(\w+)\]/gi)) {
    const keyword = match[1];
    const key = `sticker:${keyword}`;
    if (!state.sentStickers.has(key) && callbacks.onSticker) {
      state.sentStickers.add(key);
      await callbacks.onSticker(keyword);
    }
  }

  // Extract reactions (không có index vì đang trong msg block)
  for (const match of rawText.matchAll(/\[reaction:(\d+:)?(\w+)\]/gi)) {
    const indexPart = match[1];
    const reaction = match[2].toLowerCase();
    const key = indexPart ? `reaction:${indexPart}${reaction}` : `reaction:${reaction}`;
    if (VALID_REACTIONS.has(reaction) && !state.sentReactions.has(key) && callbacks.onReaction) {
      state.sentReactions.add(key);
      await callbacks.onReaction(
        indexPart ? `${indexPart.replace(':', '')}:${reaction}` : reaction,
      );
    }
  }

  // Extract cards
  for (const match of rawText.matchAll(/\[card(?::(\d+))?\]/gi)) {
    const userId = match[1] || '';
    const key = `card:${userId}`;
    if (!state.sentCards.has(key) && callbacks.onCard) {
      state.sentCards.add(key);
      await callbacks.onCard(userId || undefined);
    }
  }

  // Extract undos
  for (const match of rawText.matchAll(/\[undo:(-?\d+)\]/gi)) {
    const index = parseInt(match[1], 10);
    const key = `undo:${index}`;
    if (!state.sentUndos.has(key) && callbacks.onUndo) {
      state.sentUndos.add(key);
      await callbacks.onUndo(index);
    }
  }
}

async function processStreamChunk(state: ParserState, callbacks: StreamCallbacks): Promise<void> {
  if (callbacks.signal?.aborted) throw new Error('Aborted');

  const { buffer } = state;

  // Parse top-level [reaction:xxx] hoặc [reaction:INDEX:xxx]
  for (const match of buffer.matchAll(/\[reaction:(\d+:)?(\w+)\]/gi)) {
    const indexPart = match[1];
    const reaction = match[2].toLowerCase();
    const key = indexPart ? `reaction:${indexPart}${reaction}` : `reaction:${reaction}`;
    if (VALID_REACTIONS.has(reaction) && !state.sentReactions.has(key) && callbacks.onReaction) {
      state.sentReactions.add(key);
      await callbacks.onReaction(
        indexPart ? `${indexPart.replace(':', '')}:${reaction}` : reaction,
      );
    }
  }

  // Parse top-level [sticker:xxx]
  for (const match of buffer.matchAll(/\[sticker:(\w+)\]/gi)) {
    const keyword = match[1];
    const key = `sticker:${keyword}`;
    if (!state.sentStickers.has(key) && callbacks.onSticker) {
      state.sentStickers.add(key);
      await callbacks.onSticker(keyword);
    }
  }

  // Parse [quote:index]...[/quote]
  for (const match of buffer.matchAll(/\[quote:(-?\d+)\]([\s\S]*?)\[\/quote\]/gi)) {
    const quoteIndex = parseInt(match[1], 10);
    const rawText = match[2].trim();
    const key = `quote:${quoteIndex}:${rawText}`;
    if (rawText && !state.sentMessages.has(key)) {
      state.sentMessages.add(key);
      await processInlineTags(rawText, state, callbacks);
      const cleanText = cleanInlineTags(rawText);
      if (cleanText && callbacks.onMessage) {
        await callbacks.onMessage(cleanText, quoteIndex);
      }
    }
  }

  // Parse [msg]...[/msg]
  for (const match of buffer.matchAll(/\[msg\]([\s\S]*?)\[\/msg\]/gi)) {
    const rawText = match[1].trim();
    const key = `msg:${rawText}`;
    if (rawText && !state.sentMessages.has(key)) {
      state.sentMessages.add(key);
      await processInlineTags(rawText, state, callbacks);
      const cleanText = cleanInlineTags(rawText);
      if (cleanText && callbacks.onMessage) {
        await callbacks.onMessage(cleanText);
      }
    }
  }

  // Parse top-level [undo:index]
  for (const match of buffer.matchAll(/\[undo:(-?\d+)\]/gi)) {
    const index = parseInt(match[1], 10);
    const key = `undo:${index}`;
    if (!state.sentUndos.has(key) && callbacks.onUndo) {
      state.sentUndos.add(key);
      await callbacks.onUndo(index);
    }
  }

  // Parse top-level [card:userId] hoặc [card]
  for (const match of buffer.matchAll(/\[card(?::(\d+))?\]/gi)) {
    const userId = match[1] || '';
    const key = `card:${userId}`;
    if (!state.sentCards.has(key) && callbacks.onCard) {
      state.sentCards.add(key);
      await callbacks.onCard(userId || undefined);
    }
  }

  // Parse top-level [image:url]caption[/image]
  for (const match of buffer.matchAll(/\[image:(https?:\/\/[^\]]+)\]([\s\S]*?)\[\/image\]/gi)) {
    const url = match[1];
    const caption = match[2].trim();
    const key = `image:${url}`;
    if (!state.sentImages.has(key) && callbacks.onImage) {
      state.sentImages.add(key);
      await callbacks.onImage(url, caption || undefined);
    }
  }
}

/**
 * Generate content với streaming
 */
export async function generateContentStream(
  prompt: string,
  callbacks: StreamCallbacks,
  media?: MediaPart[],
  threadId?: string,
  history?: Content[],
): Promise<string> {
  const state: ParserState = {
    buffer: '',
    sentReactions: new Set(),
    sentStickers: new Set(),
    sentMessages: new Set(),
    sentCards: new Set(),
    sentUndos: new Set(),
    sentImages: new Set(),
  };

  debugLog(
    'STREAM',
    `Starting stream: prompt="${prompt.substring(0, 100)}...", media=${
      media?.length || 0
    }, thread=${threadId || 'none'}`,
  );

  let hasPartialResponse = false;
  let lastError: any = null;

  const parts = await buildMessageParts(prompt, media);
  const sessionId = threadId || `temp_${Date.now()}`;

  let overloadRetries = 0; // Đếm số lần retry cho overload (503)
  const MAX_OVERLOAD_RETRIES = CONFIG.retry.maxRetries;

  // Main loop - chạy cho đến khi thành công hoặc hết key/retry
  while (true) {
    // Reset state cho mỗi lần thử
    state.buffer = '';
    state.sentReactions.clear();
    state.sentStickers.clear();
    state.sentMessages.clear();
    state.sentCards.clear();
    state.sentUndos.clear();
    state.sentImages.clear();
    hasPartialResponse = false;

    try {
      deleteChatSession(sessionId);
      const chat = getChatSession(sessionId, history);

      // Log system prompt
      logSystemPrompt(sessionId, getSystemPrompt(CONFIG.useCharacter));

      if (history && history.length > 0) {
        logAIHistory(sessionId, history);
      }

      const response = await chat.sendMessageStream({ message: parts });

      for await (const chunk of response) {
        if (callbacks.signal?.aborted) {
          debugLog('STREAM', 'Aborted');
          hasPartialResponse = state.buffer.length > 0;
          throw new Error('Aborted');
        }

        if (chunk.text) {
          state.buffer += chunk.text;
          await processStreamChunk(state, callbacks);
          if (state.sentMessages.size > 0 || state.sentReactions.size > 0) {
            hasPartialResponse = true;
          }
        }
      }

      if (overloadRetries > 0) {
        console.log(`[Gemini] ✅ Thành công sau ${overloadRetries} lần retry overload`);
      }

      logAIResponse(`[STREAM] ${prompt.substring(0, 50)}`, state.buffer);

      // Xử lý content nằm ngoài tags (tables, code blocks, plain text)
      const plainText = getPlainText(state.buffer);
      if (plainText && callbacks.onMessage) {
        const hasTableOrCode = /(\|[^\n]+\|\n\|[-:\s|]+\|)|(```\w*\n[\s\S]*?```)/.test(plainText);
        if (state.sentMessages.size === 0 || hasTableOrCode) {
          await callbacks.onMessage(plainText);
        }
      }

      if (!threadId) deleteChatSession(sessionId);

      await callbacks.onComplete?.();
      return state.buffer;
    } catch (error: any) {
      lastError = error;

      if (error.message === 'Aborted' || callbacks.signal?.aborted) {
        debugLog('STREAM', `Stream aborted, hasPartialResponse=${hasPartialResponse}`);
        if (hasPartialResponse && callbacks.onComplete) {
          debugLog('STREAM', 'Calling onComplete for partial response');
          await callbacks.onComplete();
        }
        return state.buffer;
      }

      // Xử lý lỗi 429 (rate limit) - đổi key/model và gọi ngay, KHÔNG delay
      if (isRateLimitError(error)) {
        const rotated = keyManager.handleRateLimitError();
        if (rotated) {
          console.log(
            `[Gemini] ⚠️ Lỗi 429: Rate limit, đổi sang key #${keyManager.getCurrentKeyIndex()}/${keyManager.getTotalKeys()} (${keyManager.getCurrentModelName()}) và gọi ngay`,
          );
          debugLog('STREAM', `Rate limit, rotated to key #${keyManager.getCurrentKeyIndex()}, model=${keyManager.getCurrentModelName()}, calling immediately`);
          continue; // Gọi ngay với key/model mới, không delay
        }
        // Không còn key/model khả dụng
        console.log('[Gemini] ❌ Tất cả keys và models đều bị rate limit/block');
        break;
      }

      // Xử lý lỗi 503 (overload) - retry với delay, KHÔNG đổi key
      if (isRetryableError(error) && overloadRetries < MAX_OVERLOAD_RETRIES) {
        overloadRetries++;
        const delayMs = CONFIG.retry.baseDelayMs * 2 ** (overloadRetries - 1);
        console.log(
          `[Gemini] ⚠️ Lỗi ${error.status || error.code}: Model overloaded, retry ${overloadRetries}/${MAX_OVERLOAD_RETRIES} sau ${delayMs}ms...`,
        );
        debugLog('STREAM', `Overload error, retry ${overloadRetries}, delay=${delayMs}ms`);
        await sleep(delayMs);
        continue;
      }

      // Lỗi khác hoặc hết retry
      break;
    }
  }

  logError('generateContentStream', lastError);
  callbacks.onError?.(lastError);

  if (threadId) deleteChatSession(threadId);

  return state.buffer;
}
