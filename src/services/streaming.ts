import { ai, GEMINI_MODEL, GEMINI_CONFIG } from "./gemini.js";
import { SYSTEM_PROMPT } from "../config/index.js";
import { ReactionType } from "../config/schema.js";

// Callback types cho streaming
export interface StreamCallbacks {
  onReaction?: (reaction: ReactionType) => Promise<void>;
  onSticker?: (keyword: string) => Promise<void>;
  onMessage?: (text: string, quoteIndex?: number) => Promise<void>;
  onUndo?: (index: number) => Promise<void>;
  onComplete?: () => void | Promise<void>;
  onError?: (error: Error) => void;
}

// Parser state để track các tag đang mở
interface ParserState {
  buffer: string;
  sentReactions: Set<string>;
  sentStickers: Set<string>;
  sentMessages: Set<string>;
  sentUndos: Set<string>;
  inMsgTag: boolean;
  inQuoteTag: boolean;
  quoteIndex: number;
}

const VALID_REACTIONS = ["heart", "haha", "wow", "sad", "angry", "like"];

/**
 * Parse và xử lý streaming content
 * Gửi ngay khi phát hiện tag hoàn chỉnh
 */
async function processStreamChunk(
  state: ParserState,
  callbacks: StreamCallbacks
): Promise<void> {
  const { buffer } = state;

  // 1. Parse [reaction:xxx] - gửi ngay khi phát hiện
  const reactionMatches = buffer.matchAll(/\[reaction:(\w+)\]/gi);
  for (const match of reactionMatches) {
    const reaction = match[1].toLowerCase();
    const key = `reaction:${reaction}`;
    if (
      VALID_REACTIONS.includes(reaction) &&
      !state.sentReactions.has(key) &&
      callbacks.onReaction
    ) {
      state.sentReactions.add(key);
      await callbacks.onReaction(reaction as ReactionType);
    }
  }

  // 2. Parse [sticker:xxx] - gửi ngay khi phát hiện
  const stickerMatches = buffer.matchAll(/\[sticker:(\w+)\]/gi);
  for (const match of stickerMatches) {
    const keyword = match[1];
    const key = `sticker:${keyword}`;
    if (!state.sentStickers.has(key) && callbacks.onSticker) {
      state.sentStickers.add(key);
      await callbacks.onSticker(keyword);
    }
  }

  // 3. Parse [quote:index]...[/quote] - gửi khi tag đóng
  const quoteMatches = buffer.matchAll(
    /\[quote:(\d+)\]([\s\S]*?)\[\/quote\]/gi
  );
  for (const match of quoteMatches) {
    const text = match[2].trim();
    const quoteIndex = parseInt(match[1]);
    const key = `quote:${quoteIndex}:${text}`;
    if (text && !state.sentMessages.has(key) && callbacks.onMessage) {
      state.sentMessages.add(key);
      await callbacks.onMessage(text, quoteIndex);
    }
  }

  // 4. Parse [msg]...[/msg] - gửi khi tag đóng
  const msgMatches = buffer.matchAll(/\[msg\]([\s\S]*?)\[\/msg\]/gi);
  for (const match of msgMatches) {
    const text = match[1].trim();
    const key = `msg:${text}`;
    if (text && !state.sentMessages.has(key) && callbacks.onMessage) {
      state.sentMessages.add(key);
      await callbacks.onMessage(text);
    }
  }

  // 5. Parse [undo:index] - thu hồi tin nhắn
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
 * Lấy plain text còn lại sau khi loại bỏ các tag đã xử lý
 */
function getPlainText(buffer: string): string {
  return buffer
    .replace(/\[reaction:\w+\]/gi, "")
    .replace(/\[sticker:\w+\]/gi, "")
    .replace(/\[quote:\d+\][\s\S]*?\[\/quote\]/gi, "")
    .replace(/\[msg\][\s\S]*?\[\/msg\]/gi, "")
    .replace(/\[undo:-?\d+\]/gi, "")
    .trim();
}

/**
 * Generate content với streaming - gửi response ngay khi có tag hoàn chỉnh
 */
export async function generateContentStream(
  prompt: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const state: ParserState = {
    buffer: "",
    sentReactions: new Set(),
    sentStickers: new Set(),
    sentMessages: new Set(),
    sentUndos: new Set(),
    inMsgTag: false,
    inQuoteTag: false,
    quoteIndex: -1,
  };

  try {
    const response = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: `${SYSTEM_PROMPT}\n\nUser: ${prompt}`,
      config: GEMINI_CONFIG,
    });

    for await (const chunk of response) {
      if (chunk.text) {
        state.buffer += chunk.text;
        // Process mỗi khi có chunk mới
        await processStreamChunk(state, callbacks);
      }
    }

    // Xử lý plain text còn lại (nếu có)
    const plainText = getPlainText(state.buffer);
    if (plainText && callbacks.onMessage) {
      await callbacks.onMessage(plainText);
    }

    await callbacks.onComplete?.();
  } catch (error) {
    console.error("[Streaming] Error:", error);
    callbacks.onError?.(error as Error);
  }
}

/**
 * Chat streaming với history (multi-turn)
 */
export async function chatStream(
  _threadId: string,
  message: string,
  callbacks: StreamCallbacks,
  history: any[] = []
): Promise<void> {
  const state: ParserState = {
    buffer: "",
    sentReactions: new Set(),
    sentStickers: new Set(),
    sentMessages: new Set(),
    sentUndos: new Set(),
    inMsgTag: false,
    inQuoteTag: false,
    quoteIndex: -1,
  };

  try {
    const chat = ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        ...GEMINI_CONFIG,
      },
      history: history.length > 0 ? history : undefined,
    });

    const stream = await chat.sendMessageStream({ message });

    for await (const chunk of stream) {
      if (chunk.text) {
        state.buffer += chunk.text;
        await processStreamChunk(state, callbacks);
      }
    }

    // Xử lý plain text còn lại
    const plainText = getPlainText(state.buffer);
    if (plainText && callbacks.onMessage) {
      await callbacks.onMessage(plainText);
    }

    await callbacks.onComplete?.();
  } catch (error) {
    console.error("[Chat Streaming] Error:", error);
    callbacks.onError?.(error as Error);
  }
}
