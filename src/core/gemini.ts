import { GoogleGenAI, Content } from "@google/genai";
import { CONFIG } from "../config/env.js";
import { logger } from "../utils/logger.js";

// Lưu lịch sử chat trong bộ nhớ (ThreadID -> History)
const chatSessions = new Map<string, Content[]>();

const ai = new GoogleGenAI({ apiKey: CONFIG.GEMINI_API_KEY });

// System Instruction để định hình tính cách Bot
const SYSTEM_INSTRUCTION = `Bạn là ${CONFIG.BOT_NAME}, một trợ lý vui tính trên Zalo.
Quy tắc:
1. Trả lời ngắn gọn, tự nhiên, sử dụng teencode nhẹ nhàng nếu cần.
2. Nếu muốn gửi sticker biểu lộ cảm xúc, hãy thêm tag [STICKER: keyword] vào cuối câu (VD: [STICKER: haha]).
3. Không trả lời quá dài dòng trừ khi được hỏi chi tiết.`;

export async function getGeminiReply(
  threadId: string,
  userMessage: string,
  imageUrl?: string
): Promise<string> {
  try {
    // Lấy lịch sử cũ hoặc tạo mới
    let history = chatSessions.get(threadId) || [
      { role: "user", parts: [{ text: "Chào bạn" }] },
      { role: "model", parts: [{ text: "Chào bạn, mình có thể giúp gì?" }] },
    ];

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
      history: history,
    });

    // Xử lý Input (Text hoặc Multimodal Image)
    let messageText = userMessage;
    if (imageUrl) {
      messageText = `(Người dùng gửi ảnh: ${imageUrl}) ${userMessage}. Hãy mô tả ảnh hoặc trả lời câu hỏi liên quan.`;
    }

    const result = await chat.sendMessage({ parts: [{ text: messageText }] });

    // Cập nhật lịch sử
    history.push({ role: "user", parts: [{ text: messageText }] });
    history.push({ role: "model", parts: [{ text: result.text || "" }] });

    // Giới hạn lịch sử (giữ 20 cặp tin nhắn gần nhất)
    if (history.length > 40) {
      history = history.slice(-40);
    }
    chatSessions.set(threadId, history);

    return result.text || "Mình không hiểu lắm, bạn nói lại được không?";
  } catch (error) {
    logger.error("Gemini Error:", error);
    return "Xin lỗi, não mình đang lag xíu (Lỗi API AI).";
  }
}

// Xóa lịch sử chat của một thread
export function clearChatHistory(threadId: string): void {
  chatSessions.delete(threadId);
  logger.info(`Đã xóa lịch sử chat của thread: ${threadId}`);
}
