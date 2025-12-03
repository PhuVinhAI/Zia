// TypeScript interface
// ReactionType có thể là "heart" hoặc "0:heart" (với index)
export type ReactionType = string;

export interface AIMessage {
  text: string;
  sticker: string;
  quoteIndex: number;
}

export interface AIResponse {
  reactions: ReactionType[]; // Nhiều reaction
  messages: AIMessage[];
  undoIndexes: number[]; // Index tin nhắn cần thu hồi (-1 = tin mới nhất)
}

// Default response khi parse lỗi
export const DEFAULT_RESPONSE: AIResponse = {
  reactions: ["like"],
  messages: [
    { text: "Xin lỗi, mình gặp lỗi rồi!", sticker: "", quoteIndex: -1 },
  ],
  undoIndexes: [],
};

const VALID_REACTIONS = new Set([
  "heart",
  "haha",
  "wow",
  "sad",
  "angry",
  "like",
]);

import { debugLog } from "../../core/logger/logger.js";

// Parse AI response từ text với tag []
export function parseAIResponse(text: string): AIResponse {
  debugLog("PARSE", `Input text length: ${text.length}`);

  try {
    const result: AIResponse = {
      reactions: [],
      messages: [],
      undoIndexes: [],
    };

    // Parse [reaction:xxx] hoặc [reaction:INDEX:xxx] - hỗ trợ nhiều reaction
    // Format 1: [reaction:heart] - thả vào tin cuối
    // Format 2: [reaction:0:heart] - thả vào tin index 0 trong batch
    const reactionMatches = text.matchAll(/\[reaction:(\d+:)?(\w+)\]/gi);
    for (const match of reactionMatches) {
      const indexPart = match[1]; // "0:" hoặc undefined
      const reactionType = match[2].toLowerCase();

      if (VALID_REACTIONS.has(reactionType) && reactionType !== "none") {
        if (indexPart) {
          // Có index: "0:heart" -> lưu dạng "0:heart"
          const index = indexPart.replace(":", "");
          result.reactions.push(`${index}:${reactionType}` as ReactionType);
        } else {
          // Không có index: "heart" -> lưu bình thường
          result.reactions.push(reactionType as ReactionType);
        }
      }
    }

    // Parse [sticker:xxx] - hỗ trợ nhiều sticker
    const stickerMatches = text.matchAll(/\[sticker:(\w+)\]/gi);
    for (const match of stickerMatches) {
      result.messages.push({
        text: "",
        sticker: match[1],
        quoteIndex: -1,
      });
    }

    // Parse [quote:index]nội dung[/quote]
    const quoteMatches = text.matchAll(
      /\[quote:(\d+)\]([\s\S]*?)\[\/quote\]/gi
    );
    for (const match of quoteMatches) {
      result.messages.push({
        text: match[2].trim(),
        sticker: "",
        quoteIndex: parseInt(match[1]),
      });
    }

    // Parse [msg]nội dung[/msg] - nhiều tin nhắn riêng biệt
    const msgMatches = text.matchAll(/\[msg\]([\s\S]*?)\[\/msg\]/gi);
    for (const match of msgMatches) {
      result.messages.push({
        text: match[1].trim(),
        sticker: "",
        quoteIndex: -1,
      });
    }

    // Parse [undo:index] - thu hồi tin nhắn đã gửi (-1 = tin mới nhất)
    const undoMatches = text.matchAll(/\[undo:(-?\d+)\]/gi);
    for (const match of undoMatches) {
      result.undoIndexes.push(parseInt(match[1]));
    }

    // Lấy text thuần (loại bỏ các tag)
    let plainText = text
      .replace(/\[reaction:(\d+:)?\w+\]/gi, "") // Hỗ trợ cả [reaction:heart] và [reaction:0:heart]
      .replace(/\[sticker:\w+\]/gi, "")
      .replace(/\[quote:\d+\][\s\S]*?\[\/quote\]/gi, "")
      .replace(/\[msg\][\s\S]*?\[\/msg\]/gi, "")
      .replace(/\[undo:-?\d+\]/gi, "")
      .trim();

    // Nếu có text thuần, thêm vào messages đầu tiên
    if (plainText) {
      result.messages.unshift({
        text: plainText,
        sticker: "",
        quoteIndex: -1,
      });
    }

    // Nếu không có gì, trả về default
    if (result.messages.length === 0 && result.reactions.length === 0) {
      debugLog("PARSE", "Empty result, returning default");
      return DEFAULT_RESPONSE;
    }

    debugLog(
      "PARSE",
      `Parsed: ${result.reactions.length} reactions, ${result.messages.length} messages, ${result.undoIndexes.length} undos`
    );
    return result;
  } catch (e) {
    console.error("[Parser] Error:", e, "Text:", text);
    debugLog("PARSE", `Error parsing: ${e}`);
    return DEFAULT_RESPONSE;
  }
}
