import { GoogleGenAI } from "@google/genai";
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
  const matches = text.matchAll(YOUTUBE_REGEX);
  const urls: string[] = [];
  for (const match of matches) {
    urls.push(`https://www.youtube.com/watch?v=${match[1]}`);
  }
  return urls;
}

// ═══════════════════════════════════════════════════
// MEDIA PART TYPES
// ═══════════════════════════════════════════════════

export type MediaType = "image" | "video" | "audio" | "file" | "youtube";

export interface MediaPart {
  type: MediaType;
  url?: string;
  mimeType?: string;
  base64?: string; // Nếu đã có base64 sẵn (file đã convert)
}

// ═══════════════════════════════════════════════════
// UNIFIED GENERATE CONTENT - XỬ LÝ TẤT CẢ
// ═══════════════════════════════════════════════════

/**
 * Generate content thống nhất - xử lý mọi loại input
 *
 * @param prompt - Text prompt
 * @param media - Array các media parts (optional)
 *
 * Ví dụ:
 * - Text only: generateContent("Xin chào")
 * - 1 ảnh: generateContent("Mô tả ảnh", [{ type: "image", url: "..." }])
 * - Nhiều ảnh: generateContent("So sánh", [{ type: "image", url: "..." }, { type: "image", url: "..." }])
 * - Mixed: generateContent("Xem hết", [{ type: "image", url: "..." }, { type: "video", url: "..." }])
 * - YouTube: generateContent("Tóm tắt video", [{ type: "youtube", url: "https://youtube.com/..." }])
 * - File đã convert: generateContent("Đọc file", [{ type: "file", base64: "...", mimeType: "text/plain" }])
 */
export async function generateContent(
  prompt: string,
  media?: MediaPart[]
): Promise<AIResponse> {
  try {
    // Nếu không có media → text only
    if (!media || media.length === 0) {
      logStep("generateContent", {
        type: "text-only",
        promptLength: prompt.length,
      });
      debugLog("GEMINI", `Text-only prompt: ${prompt.substring(0, 200)}...`);

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `${getPrompt()}\n\nUser: ${prompt}`,
        config: GEMINI_CONFIG,
      });

      const rawText = response.text || "{}";
      logAIResponse(prompt, rawText);
      return parseAIResponse(rawText);
    }

    // Có media → build contents array
    const mediaTypes = media.map((m) => m.type);
    const hasYouTube = media.some((m) => m.type === "youtube");

    console.log(
      `[Gemini] 📦 Xử lý: ${media.length} media (${[
        ...new Set(mediaTypes),
      ].join(", ")})`
    );
    logStep("generateContent", {
      mediaCount: media.length,
      types: mediaTypes,
      promptLength: prompt.length,
    });

    const contents: any[] = [{ text: `${getPrompt()}\n\n${prompt}` }];
    let loadedCount = 0;
    const errors: string[] = [];

    for (const part of media) {
      try {
        if (part.type === "youtube" && part.url) {
          // YouTube → dùng fileData
          contents.push({ fileData: { fileUri: part.url } });
          loadedCount++;
          debugLog("GEMINI", `Added YouTube: ${part.url}`);
        } else if (part.base64) {
          // Đã có base64 sẵn (file đã convert)
          contents.push({
            inlineData: {
              data: part.base64,
              mimeType: part.mimeType || "application/octet-stream",
            },
          });
          loadedCount++;
          debugLog(
            "GEMINI",
            `Added pre-converted: ${part.base64.length} chars (${part.mimeType})`
          );
        } else if (part.url) {
          // Cần fetch URL → base64
          const base64Data = await fetchAsBase64(part.url);
          if (base64Data) {
            contents.push({
              inlineData: {
                data: base64Data,
                mimeType: part.mimeType || "application/octet-stream",
              },
            });
            loadedCount++;
            debugLog(
              "GEMINI",
              `Loaded ${part.type}: ${base64Data.length} chars (${part.mimeType})`
            );
          } else {
            errors.push(`Không tải được ${part.type}`);
            debugLog("GEMINI", `Failed to load ${part.type}: ${part.url}`);
          }
        }
      } catch (e) {
        errors.push(`Lỗi ${part.type}`);
        debugLog("GEMINI", `Error loading ${part.type}: ${e}`);
      }
    }

    // Nếu không load được media nào (trừ YouTube)
    if (loadedCount === 0 && !hasYouTube) {
      debugLog("GEMINI", "No media loaded, falling back to text-only");
      // Thêm thông báo lỗi vào prompt
      const errorPrompt =
        errors.length > 0
          ? `${prompt}\n\n(Lưu ý: ${errors.join(", ")})`
          : prompt;
      return generateContent(errorPrompt);
    }

    debugLog(
      "GEMINI",
      `Sending ${loadedCount}/${media.length} media to Gemini`
    );

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: GEMINI_CONFIG,
    });

    const rawText = response.text || "{}";
    logAIResponse(
      `[${loadedCount} media] ${prompt.substring(0, 100)}`,
      rawText
    );
    return parseAIResponse(rawText);
  } catch (error) {
    logError("generateContent", error);
    console.error("Gemini Error:", error);
    return DEFAULT_RESPONSE;
  }
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

const VALID_REACTIONS = ["heart", "haha", "wow", "sad", "angry", "like"];

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
      VALID_REACTIONS.includes(reaction) &&
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

function getPlainText(buffer: string): string {
  return buffer
    .replace(/\[reaction:(\d+:)?\w+\]/gi, "")
    .replace(/\[sticker:\w+\]/gi, "")
    .replace(/\[quote:-?\d+\][\s\S]*?\[\/quote\]/gi, "")
    .replace(/\[msg\][\s\S]*?\[\/msg\]/gi, "")
    .replace(/\[undo:-?\d+\]/gi, "")
    .trim();
}

/**
 * Generate content với streaming - hỗ trợ cả text và media
 */
export async function generateContentStream(
  prompt: string,
  callbacks: StreamCallbacks,
  media?: MediaPart[]
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
    }`
  );

  try {
    let contents: any;

    if (!media || media.length === 0) {
      // Text only
      contents = `${getPrompt()}\n\nUser: ${prompt}`;
    } else {
      // Có media → build contents array
      const contentParts: any[] = [{ text: `${getPrompt()}\n\n${prompt}` }];

      for (const part of media) {
        if (part.type === "youtube" && part.url) {
          contentParts.push({ fileData: { fileUri: part.url } });
        } else if (part.base64) {
          contentParts.push({
            inlineData: {
              data: part.base64,
              mimeType: part.mimeType || "application/octet-stream",
            },
          });
        } else if (part.url) {
          const base64Data = await fetchAsBase64(part.url);
          if (base64Data) {
            contentParts.push({
              inlineData: {
                data: base64Data,
                mimeType: part.mimeType || "application/octet-stream",
              },
            });
          }
        }
      }

      contents = contentParts;
    }

    const response = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents,
      config: GEMINI_CONFIG,
    });

    for await (const chunk of response) {
      if (callbacks.signal?.aborted) {
        debugLog("STREAM", "Aborted");
        throw new Error("Aborted");
      }

      if (chunk.text) {
        state.buffer += chunk.text;
        await processStreamChunk(state, callbacks);
      }
    }

    logAIResponse(`[STREAM] ${prompt.substring(0, 50)}`, state.buffer);

    // Plain text còn lại
    const plainText = getPlainText(state.buffer);
    if (plainText && callbacks.onMessage) {
      await callbacks.onMessage(plainText);
    }

    await callbacks.onComplete?.();
    return state.buffer;
  } catch (error: any) {
    if (error.message === "Aborted" || callbacks.signal?.aborted) {
      debugLog("STREAM", "Stream aborted");
      return state.buffer;
    }
    logError("generateContentStream", error);
    callbacks.onError?.(error);
    return state.buffer;
  }
}
