import { API, ThreadType, Message } from "zca-js";
import { getGeminiReply, clearChatHistory } from "../core/gemini.js";
import { handleStickerResponse } from "./sticker.js";
import { logger } from "../utils/logger.js";

export async function onIncomingMessage(
  api: API,
  message: Message
): Promise<void> {
  // Bỏ qua tin nhắn bản thân
  if (message.isSelf) return;

  const threadId = message.threadId;
  const type = message.type as ThreadType;
  const content = message.data?.content;

  // Kiểm tra loại tin nhắn - chỉ xử lý text
  const isText = typeof content === "string";
  if (!isText || !content) return;

  logger.message(threadId, content);

  // Lệnh đặc biệt: xóa lịch sử chat
  if (
    content.toLowerCase() === "/reset" ||
    content.toLowerCase() === "/clear"
  ) {
    clearChatHistory(threadId);
    await api.sendMessage(
      "Đã xóa lịch sử trò chuyện! Bắt đầu lại từ đầu nhé 🔄",
      threadId,
      type
    );
    return;
  }

  try {
    // 1. Gửi sự kiện Typing (Đang soạn tin...)
    await api.sendTypingEvent(threadId, type);

    // 2. Gọi AI
    const aiResponse = await getGeminiReply(threadId, content);

    // 3. Xử lý phản hồi (Tách sticker và gửi)
    if (aiResponse) {
      await handleStickerResponse(api, aiResponse, threadId, type);
    }
  } catch (error) {
    logger.error("Handler Error:", error);
    await api.sendMessage("Có lỗi xảy ra, thử lại sau nhé!", threadId, type);
  }
}
