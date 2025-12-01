import { API, ThreadType } from "zca-js";
import { logger } from "../utils/logger.js";

export async function handleStickerResponse(
  api: API,
  responseText: string,
  threadId: string,
  type: ThreadType
): Promise<void> {
  // Regex tìm tag [STICKER: keyword]
  const stickerRegex = /\[STICKER:\s*(.*?)\]/i;
  const match = responseText.match(stickerRegex);

  let finalMessage = responseText;
  let stickerKeyword: string | null = null;

  if (match) {
    stickerKeyword = match[1];
    // Xóa tag khỏi tin nhắn hiển thị
    finalMessage = responseText.replace(match[0], "").trim();
  }

  // 1. Gửi tin nhắn văn bản đã lọc
  if (finalMessage) {
    await api.sendMessage(finalMessage, threadId, type);
  }

  // 2. Tìm và gửi sticker nếu có keyword
  if (stickerKeyword) {
    try {
      const stickerIds = await api.getStickers(stickerKeyword);
      if (stickerIds && stickerIds.length > 0) {
        // Chọn ngẫu nhiên
        const randomId =
          stickerIds[Math.floor(Math.random() * stickerIds.length)];
        const stickerDetails = await api.getStickersDetail(randomId);

        if (stickerDetails[0]) {
          // Delay nhẹ cho tự nhiên
          setTimeout(() => {
            api.sendSticker(stickerDetails[0], threadId, type);
          }, 1500);
        }
      }
    } catch (e) {
      logger.error("Lỗi gửi sticker:", e);
    }
  }
}
