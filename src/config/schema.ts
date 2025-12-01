// JSON Schema cho AI Response - Structured Output
export const AI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reaction: {
      type: "string",
      enum: ["heart", "haha", "wow", "sad", "angry", "like", "none"],
      description:
        "Reaction để thả vào tin nhắn người dùng. 'none' = không thả reaction",
    },
    messages: {
      type: "array",
      description: "Danh sách các tin nhắn để gửi (có thể nhiều tin)",
      items: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Nội dung tin nhắn text. Để trống nếu chỉ gửi sticker",
          },
          sticker: {
            type: "string",
            description:
              "Keyword sticker để gửi (hello, hi, love, haha, sad, cry, angry, wow, ok, thanks, sorry). Để trống nếu không gửi sticker",
          },
          quoteIndex: {
            type: "integer",
            description:
              "Index tin nhắn trong lịch sử để quote. -1 = không quote",
          },
        },
        required: ["text", "sticker", "quoteIndex"],
      },
    },
  },
  required: ["reaction", "messages"],
};

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
