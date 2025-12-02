// TypeScript interface
export type ReactionType = "heart" | "haha" | "wow" | "sad" | "angry" | "like";

export interface AIMessage {
  text: string;
  sticker: string;
  quoteIndex: number;
}

export interface AIResponse {
  reactions: ReactionType[]; // Nhiều reaction
  messages: AIMessage[];
}

// Default response khi parse lỗi
export const DEFAULT_RESPONSE: AIResponse = {
  reactions: ["like"],
  messages: [
    { text: "Xin lỗi, mình gặp lỗi rồi!", sticker: "", quoteIndex: -1 },
  ],
};

const VALID_REACTIONS = ["heart", "haha", "wow", "sad", "angry", "like"];

// Parse AI response từ text với tag []
export function parseAIResponse(text: string): AIResponse {
  try {
    const result: AIResponse = {
      reactions: [],
      messages: [],
    };

    // Parse tất cả [reaction:xxx] - hỗ trợ nhiều reaction
    const reactionMatches = text.matchAll(/\[reaction:(\w+)\]/gi);
    for (const match of reactionMatches) {
      const r = match[1].toLowerCase();
      if (VALID_REACTIONS.includes(r) && r !== "none") {
        result.reactions.push(r as ReactionType);
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

    // Lấy text thuần (loại bỏ các tag)
    let plainText = text
      .replace(/\[reaction:\w+\]/gi, "")
      .replace(/\[sticker:\w+\]/gi, "")
      .replace(/\[quote:\d+\][\s\S]*?\[\/quote\]/gi, "")
      .replace(/\[msg\][\s\S]*?\[\/msg\]/gi, "")
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
      return DEFAULT_RESPONSE;
    }

    return result;
  } catch (e) {
    console.error("[Parser] Error:", e, "Text:", text);
    return DEFAULT_RESPONSE;
  }
}
