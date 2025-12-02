import { GoogleGenAI, Chat, Content, Part } from "@google/genai";
import { CONFIG } from "../config/index.js";
import { getSystemPrompt } from "../config/prompts.js";
import {
  AIResponse,
  DEFAULT_RESPONSE,
  parseAIResponse,
} from "../config/schema.js";
import { fetchAsBase64 } from "../utils/fetch.js";
import { logAIResponse, logError, debugLog, logStep } from "../utils/logger.js";

// Lấy SYSTEM_PROMPT động dựa trên config
const getPrompt = () => getSystemPrompt(CONFIG.useCharacter);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
  console.error("❌ Vui lòng cấu hình GEMINI_API_KEY trong file .env");
  process.exit(1);
}

debugLog("GEMINI", "Initializing Gemini API...");

export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ============ GEMINI CONFIG ============
export const GEMINI_MODEL = "gemini-2.5-flash";

export const GEMINI_CONFIG = {
  temperature: 1,
  topP: 0.95,
  maxOutputTokens: 65536,
  thinkingConfig: {
    thinkingBudget: 8192,
  },
  tools: [{ googleSearch: {} }, { urlContext: {} }],
};
// ========================================

export { parseAIResponse } from "../config/schema.js";

// Regex để detect YouTube URL
const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;

export function extractYouTubeUrls(text: string): string[] {
  return [...text.matchAll(YOUTUBE_REGEX)].map(
    (m) => `https://www.youtube.com/watch?v=${m[1]}`
  );
}

// ═══════════════════════════════════════════════════
// MEDIA PART TYPES
// ═══════════════════════════════════════════════════

export type MediaType = "image" | "video" | "audio" | "file" | "youtube";

export interface MediaPart {
  type: MediaType;
  url?: string;
  mimeType?: string;
  base64?: string;
}

// ═══════════════════════════════════════════════════
// CHAT SESSION MANAGER - Quản lý multi-turn conversation
// ═══════════════════════════════════════════════════

const chatSessions = new Map<string, Chat>();

/**
 * Lấy hoặc tạo chat session cho thread
 */
export function getChatSession(threadId: string, history?: Content[]): Chat {
  let chat = chatSessions.get(threadId);

  if (!chat) {
    debugLog("GEMINI", `Creating new chat session for thread ${threadId}`);
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

// ═══════════════════════════════════════════════════
// BUILD MESSAGE PARTS - Chuẩn bị content cho sendMessage
// ═══════════════════════════════════════════════════

/**
 * Build message parts từ prompt và media
 */
async function buildMessageParts(
  prompt: string,
  media?: MediaPart[]
): Promise<Part[]> {
  const parts: Part[] = [{ text: prompt }];

  if (!media || media.length === 0) {
    return parts;
  }

  for (const item of media) {
    try {
      if (item.type === "youtube" && item.url) {
        // YouTube URL được Gemini xử lý trực tiếp qua fileData
        parts.push({ fileData: { fileUri: item.url, mimeType: "video/mp4" } });
        debugLog("GEMINI", `Added YouTube: ${item.url}`);
      } else if (item.base64) {
        parts.push({
          inlineData: {
            data: item.base64,
            mimeType: item.mimeType || "application/octet-stream",
          },
        });
        debugLog("GEMINI", `Added pre-converted: ${item.mimeType}`);
      } else if (item.url) {
        const base64Data = await fetchAsBase64(item.url);
        if (base64Data) {
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: item.mimeType || "application/octet-stream",
            },
          });
          debugLog("GEMINI", `Loaded ${item.type}: ${item.mimeType}`);
        }
      }
    } catch (e) {
      debugLog("GEMINI", `Error loading ${item.type}: ${e}`);
    }
  }

  return parts;
}

// ═══════════════════════════════════════════════════
// GENERATE CONTENT - Dùng Chat API
// ═══════════════════════════════════════════════════

/**
 * Generate content sử dụng Chat session (multi-turn)
 * Có retry logic cho lỗi 503 (model overloaded)
 */
export async function generateContent(
  prompt: string,
  media?: MediaPart[],
  threadId?: string,
  history?: Content[]
): Promise<AIResponse> {
  const mediaTypes = media?.map((m) => m.type) || [];
  logStep("generateContent", {
    type: media?.length ? "with-media" : "text-only",
    mediaCount: media?.length || 0,
    mediaTypes,
    promptLength: prompt.length,
    hasThread: !!threadId,
  });

  // Build message parts một lần
  const parts = await buildMessageParts(prompt, media);
  const sessionId = threadId || `temp_${Date.now()}`;

  if (media?.length) {
    console.log(
      `[Gemini] 📦 Xử lý: ${media.length} media (${[
        ...new Set(mediaTypes),
      ].join(", ")})`
    );
  }

  let lastError: any = null;

  // Retry loop
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    if (attempt > 0) {
      const delayMs = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1);
      console.log(
        `[Gemini] 🔄 Retry ${attempt}/${RETRY_CONFIG.maxRetries} sau ${delayMs}ms...`
      );
      debugLog("GEMINI", `Retry attempt ${attempt}, delay=${delayMs}ms`);
      await sleep(delayMs);

      // Reset chat session trước khi retry
      deleteChatSession(sessionId);
    }

    try {
      const chat = getChatSession(sessionId, history);
      debugLog(
        "GEMINI",
        `Using chat session: ${sessionId}, history=${history?.length || 0}`
      );

      const response = await chat.sendMessage({ message: parts });
      const rawText = response.text || "{}";

      // Success!
      if (attempt > 0) {
        console.log(`[Gemini] ✅ Retry thành công sau ${attempt} lần thử`);
      }

      if (!threadId) deleteChatSession(sessionId);

      logAIResponse(prompt.substring(0, 100), rawText);
      return parseAIResponse(rawText);
    } catch (error: any) {
      lastError = error;

      // Check if retryable
      if (isRetryableError(error) && attempt < RETRY_CONFIG.maxRetries) {
        console.log(
          `[Gemini] ⚠️ Lỗi ${
            error.status || error.code
          }: Model overloaded, sẽ retry...`
        );
        debugLog("GEMINI", `Retryable error: ${error.status || error.code}`);
        continue;
      }

      break;
    }
  }

  // Hết retry hoặc lỗi không retry được
  logError("generateContent", lastError);
  console.error("Gemini Error:", lastError);

  if (threadId) {
    debugLog("GEMINI", `Error with chat session, resetting thread ${threadId}`);
    deleteChatSession(threadId);
  }

  return DEFAULT_RESPONSE;
}

// ═══════════════════════════════════════════════════
// STREAMING SUPPORT
// ═══════════════════════════════════════════════════

export interface StreamCallbacks {
  onReaction?: (reaction: string) => Promise<void>;
  onSticker?: (keyword: string) => Promise<void>;
  onMessage?: (text: string, quoteIndex?: number) => Promise<void>;
  onUndo?: (index: number) => Promise<void>;
  onComplete?: () => void | Promise<void>;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

interface ParserState {
  buffer: string;
  sentReactions: Set<string>;
  sentStickers: Set<string>;
  sentMessages: Set<string>;
  sentUndos: Set<string>;
}

const VALID_REACTIONS = new Set([
  "heart",
  "haha",
  "wow",
  "sad",
  "angry",
  "like",
]);

async function processStreamChunk(
  state: ParserState,
  callbacks: StreamCallbacks
): Promise<void> {
  if (callbacks.signal?.aborted) throw new Error("Aborted");

  const { buffer } = state;

  // Parse [reaction:xxx] hoặc [reaction:INDEX:xxx]
  const reactionMatches = buffer.matchAll(/\[reaction:(\d+:)?(\w+)\]/gi);
  for (const match of reactionMatches) {
    const indexPart = match[1];
    const reaction = match[2].toLowerCase();
    const key = indexPart
      ? `reaction:${indexPart}${reaction}`
      : `reaction:${reaction}`;
    if (
      VALID_REACTIONS.has(reaction) &&
      !state.sentReactions.has(key) &&
      callbacks.onReaction
    ) {
      state.sentReactions.add(key);
      await callbacks.onReaction(
        indexPart ? `${indexPart.replace(":", "")}:${reaction}` : reaction
      );
    }
  }

  // Parse [sticker:xxx]
  const stickerMatches = buffer.matchAll(/\[sticker:(\w+)\]/gi);
  for (const match of stickerMatches) {
    const keyword = match[1];
    const key = `sticker:${keyword}`;
    if (!state.sentStickers.has(key) && callbacks.onSticker) {
      state.sentStickers.add(key);
      await callbacks.onSticker(keyword);
    }
  }

  // Parse [quote:index]...[/quote]
  const quoteMatches = buffer.matchAll(
    /\[quote:(-?\d+)\]([\s\S]*?)\[\/quote\]/gi
  );
  for (const match of quoteMatches) {
    const quoteIndex = parseInt(match[1]);
    const text = match[2].trim();
    const key = `quote:${quoteIndex}:${text}`;
    if (text && !state.sentMessages.has(key) && callbacks.onMessage) {
      state.sentMessages.add(key);
      await callbacks.onMessage(text, quoteIndex);
    }
  }

  // Parse [msg]...[/msg]
  const msgMatches = buffer.matchAll(/\[msg\]([\s\S]*?)\[\/msg\]/gi);
  for (const match of msgMatches) {
    const text = match[1].trim();
    const key = `msg:${text}`;
    if (text && !state.sentMessages.has(key) && callbacks.onMessage) {
      state.sentMessages.add(key);
      await callbacks.onMessage(text);
    }
  }

  // Parse [undo:index]
  const undoMatches = buffer.matchAll(/\[undo:(-?\d+)\]/gi);
  for (const match of undoMatches) {
    const index = parseInt(match[1]);
    const key = `undo:${index}`;
    if (!state.sentUndos.has(key) && callbacks.onUndo) {
      state.sentUndos.add(key);
      await callbacks.onUndo(index);
    }
  }
}

// Regex patterns để strip tags
const TAG_PATTERNS = [
  /\[reaction:(\d+:)?\w+\]/gi,
  /\[sticker:\w+\]/gi,
  /\[quote:-?\d+\][\s\S]*?\[\/quote\]/gi,
  /\[msg\][\s\S]*?\[\/msg\]/gi,
  /\[undo:-?\d+\]/gi,
];

function getPlainText(buffer: string): string {
  return TAG_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, ""),
    buffer
  ).trim();
}

// ═══════════════════════════════════════════════════
// RETRY CONFIG
// ═══════════════════════════════════════════════════

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 2000, // 2s, 4s, 8s (exponential)
  retryableStatusCodes: [503, 429, 500, 502, 504],
};

/**
 * Check if error is retryable (503, 429, etc.)
 */
function isRetryableError(error: any): boolean {
  const status = error?.status || error?.code;
  return RETRY_CONFIG.retryableStatusCodes.includes(status);
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate content với streaming - dùng Chat API
 * Có retry logic cho lỗi 503 (model overloaded)
 */
export async function generateContentStream(
  prompt: string,
  callbacks: StreamCallbacks,
  media?: MediaPart[],
  threadId?: string,
  history?: Content[]
): Promise<string> {
  const state: ParserState = {
    buffer: "",
    sentReactions: new Set(),
    sentStickers: new Set(),
    sentMessages: new Set(),
    sentUndos: new Set(),
  };

  debugLog(
    "STREAM",
    `Starting stream: prompt="${prompt.substring(0, 100)}...", media=${
      media?.length || 0
    }, thread=${threadId || "none"}`
  );

  // Flag để track xem đã gửi response nào chưa
  let hasPartialResponse = false;
  let lastError: any = null;

  // Build message parts một lần
  const parts = await buildMessageParts(prompt, media);
  const sessionId = threadId || `temp_${Date.now()}`;

  // Retry loop
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    // Reset state cho mỗi attempt (trừ lần đầu)
    if (attempt > 0) {
      state.buffer = "";
      state.sentReactions.clear();
      state.sentStickers.clear();
      state.sentMessages.clear();
      state.sentUndos.clear();
      hasPartialResponse = false;

      const delayMs = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1);
      console.log(
        `[Gemini] 🔄 Retry ${attempt}/${RETRY_CONFIG.maxRetries} sau ${delayMs}ms...`
      );
      debugLog("STREAM", `Retry attempt ${attempt}, delay=${delayMs}ms`);
      await sleep(delayMs);

      // Reset chat session trước khi retry
      deleteChatSession(sessionId);
    }

    try {
      const chat = getChatSession(sessionId, history);
      const response = await chat.sendMessageStream({ message: parts });

      for await (const chunk of response) {
        if (callbacks.signal?.aborted) {
          debugLog("STREAM", "Aborted");
          hasPartialResponse = state.buffer.length > 0;
          throw new Error("Aborted");
        }

        if (chunk.text) {
          state.buffer += chunk.text;
          await processStreamChunk(state, callbacks);
          if (state.sentMessages.size > 0 || state.sentReactions.size > 0) {
            hasPartialResponse = true;
          }
        }
      }

      // Success!
      if (attempt > 0) {
        console.log(`[Gemini] ✅ Retry thành công sau ${attempt} lần thử`);
      }

      logAIResponse(`[STREAM] ${prompt.substring(0, 50)}`, state.buffer);

      const plainText = getPlainText(state.buffer);
      if (plainText && callbacks.onMessage) {
        await callbacks.onMessage(plainText);
      }

      if (!threadId) deleteChatSession(sessionId);

      await callbacks.onComplete?.();
      return state.buffer;
    } catch (error: any) {
      lastError = error;

      // Abort không retry
      if (error.message === "Aborted" || callbacks.signal?.aborted) {
        debugLog(
          "STREAM",
          `Stream aborted, hasPartialResponse=${hasPartialResponse}`
        );
        if (hasPartialResponse && callbacks.onComplete) {
          debugLog("STREAM", "Calling onComplete for partial response");
          await callbacks.onComplete();
        }
        return state.buffer;
      }

      // Check if retryable
      if (isRetryableError(error) && attempt < RETRY_CONFIG.maxRetries) {
        console.log(
          `[Gemini] ⚠️ Lỗi ${
            error.status || error.code
          }: Model overloaded, sẽ retry...`
        );
        debugLog("STREAM", `Retryable error: ${error.status || error.code}`);
        continue; // Retry
      }

      // Non-retryable error hoặc hết retry
      break;
    }
  }

  // Hết retry hoặc lỗi không retry được
  logError("generateContentStream", lastError);
  callbacks.onError?.(lastError);

  if (threadId) deleteChatSession(threadId);

  return state.buffer;
}
