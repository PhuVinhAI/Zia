// TypeScript interface
export interface AIMessage {
  text: string;
  sticker: string;
  quoteIndex: number;
}

export interface AIResponse {
  reaction: "heart" | "haha" | "wow" | "sad" | "angry" | "like" | "none";
  messages: AIMessage[];
}

// Default response khi parse lỗi
export const DEFAULT_RESPONSE: AIResponse = {
  reaction: "like",
  messages: [
    { text: "Xin lỗi, mình gặp lỗi rồi!", sticker: "", quoteIndex: -1 },
  ],
};

// Parse AI response từ text với tag []
export function parseAIResponse(text: string): AIResponse {
  try {
    const result: AIResponse = {
      reaction: "none",
      messages: [],
    };

    // Parse [reaction:xxx]
    const reactionMatch = text.match(/\[reaction:(\w+)\]/i);
    if (reactionMatch) {
      const r = reactionMatch[1].toLowerCase();
      if (
        ["heart", "haha", "wow", "sad", "angry", "like", "none"].includes(r)
      ) {
        result.reaction = r as AIResponse["reaction"];
      }
    }

    // Parse [sticker:xxx]
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

    // Lấy text thuần (loại bỏ các tag)
    let plainText = text
      .replace(/\[reaction:\w+\]/gi, "")
      .replace(/\[sticker:\w+\]/gi, "")
      .replace(/\[quote:\d+\][\s\S]*?\[\/quote\]/gi, "")
      .trim();

    // Nếu có text thuần, thêm vào messages
    if (plainText) {
      result.messages.unshift({
        text: plainText,
        sticker: "",
        quoteIndex: -1,
      });
    }

    // Nếu không có message nào, trả về default
    if (result.messages.length === 0 && result.reaction === "none") {
      return DEFAULT_RESPONSE;
    }

    return result;
  } catch (e) {
    console.error("[Parser] Error:", e, "Text:", text);
    return DEFAULT_RESPONSE;
  }
}
