/**
 * Gemini Stream - Xử lý streaming responses
 */
import { Content } from "@google/genai";
import { CONFIG } from "../../shared/constants/config.js";
import {
  getChatSession,
  deleteChatSession,
  buildMessageParts,
  isRetryableError,
  sleep,
} from "./geminiChat.js";
import { MediaPart } from "./geminiConfig.js";
import {
  logAIResponse,
  logError,
  debugLog,
  logAIHistory,
} from "../../core/logger/logger.js";

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

// Regex patterns để strip tags
const TAG_PATTERNS = [
  /\[reaction:(\d+:)?\w+\]/gi,
  /\[sticker:\w+\]/gi,
  /\[quote:-?\d+\][\s\S]*?\[\/quote\]/gi,
  /\[msg\][\s\S]*?\[\/msg\]/gi,
  /\[undo:-?\d+\]/gi,
  /\[tool:\w+(?:\s+[^\]]*?)?\](?:\s*\{[\s\S]*?\}\s*\[\/tool\])?/gi,
];

function getPlainText(buffer: string): string {
  return TAG_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, ""),
    buffer
  ).trim();
}

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

/**
 * Generate content với streaming
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

  let hasPartialResponse = false;
  let lastError: any = null;

  const parts = await buildMessageParts(prompt, media);
  const sessionId = threadId || `temp_${Date.now()}`;

  // Retry loop
  for (let attempt = 0; attempt <= CONFIG.retry.maxRetries; attempt++) {
    if (attempt > 0) {
      state.buffer = "";
      state.sentReactions.clear();
      state.sentStickers.clear();
      state.sentMessages.clear();
      state.sentUndos.clear();
      hasPartialResponse = false;

      const delayMs = CONFIG.retry.baseDelayMs * Math.pow(2, attempt - 1);
      console.log(
        `[Gemini] 🔄 Retry ${attempt}/${CONFIG.retry.maxRetries} sau ${delayMs}ms...`
      );
      debugLog("STREAM", `Retry attempt ${attempt}, delay=${delayMs}ms`);
      await sleep(delayMs);

      deleteChatSession(sessionId);
    }

    try {
      const chat = getChatSession(sessionId, history);

      if (history && history.length > 0) {
        logAIHistory(sessionId, history);
      }

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

      if (isRetryableError(error) && attempt < CONFIG.retry.maxRetries) {
        console.log(
          `[Gemini] ⚠️ Lỗi ${
            error.status || error.code
          }: Model overloaded, sẽ retry...`
        );
        debugLog("STREAM", `Retryable error: ${error.status || error.code}`);
        continue;
      }

      break;
    }
  }

  logError("generateContentStream", lastError);
  callbacks.onError?.(lastError);

  if (threadId) deleteChatSession(threadId);

  return state.buffer;
}
