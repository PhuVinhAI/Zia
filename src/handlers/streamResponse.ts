import { ThreadType, Reactions } from "../services/zalo.js";
import { getRawHistory } from "../utils/history.js";
import { createRichMessage } from "../utils/richText.js";
import { ReactionType } from "../config/schema.js";
import { StreamCallbacks } from "../services/streaming.js";

const reactionMap: Record<string, any> = {
  heart: Reactions.HEART,
  haha: Reactions.HAHA,
  wow: Reactions.WOW,
  sad: Reactions.SAD,
  angry: Reactions.ANGRY,
  like: Reactions.LIKE,
};

// Gửi sticker helper
async function sendSticker(api: any, keyword: string, threadId: string) {
  try {
    console.log(`[Bot] 🎨 Tìm sticker: "${keyword}"`);
    const stickerIds = await api.getStickers(keyword);
    if (stickerIds?.length > 0) {
      const randomId =
        stickerIds[Math.floor(Math.random() * stickerIds.length)];
      const stickerDetails = await api.getStickersDetail(randomId);
      if (stickerDetails?.[0]) {
        await api.sendSticker(stickerDetails[0], threadId, ThreadType.User);
        console.log(`[Bot] ✅ Đã gửi sticker!`);
      }
    }
  } catch (e) {
    console.error("[Bot] Lỗi gửi sticker:", e);
  }
}

/**
 * Tạo streaming callbacks để gửi response real-time
 */
export function createStreamCallbacks(
  api: any,
  threadId: string,
  originalMessage?: any
): StreamCallbacks {
  let messageCount = 0;

  return {
    // Gửi reaction ngay khi phát hiện
    onReaction: async (reaction: ReactionType) => {
      const reactionObj = reactionMap[reaction];
      if (reactionObj && originalMessage) {
        try {
          await api.addReaction(reactionObj, originalMessage);
          console.log(`[Bot] 💖 Streaming: Đã thả reaction: ${reaction}`);
        } catch (e) {
          console.error("[Bot] Lỗi thả reaction:", e);
        }
      }
    },

    // Gửi sticker ngay khi phát hiện
    onSticker: async (keyword: string) => {
      await sendSticker(api, keyword, threadId);
    },

    // Gửi tin nhắn ngay khi tag đóng
    onMessage: async (text: string, quoteIndex?: number) => {
      messageCount++;

      // Xác định quote message nếu có
      let quoteData: any = undefined;
      if (quoteIndex !== undefined && quoteIndex >= 0) {
        const rawHistory = getRawHistory(threadId);
        if (quoteIndex < rawHistory.length) {
          const historyMsg = rawHistory[quoteIndex];
          if (historyMsg?.data?.msgId) {
            quoteData = historyMsg.data;
            console.log(`[Bot] 📎 Streaming: Quote tin nhắn #${quoteIndex}`);
          }
        }
      }

      try {
        const richMsg = createRichMessage(`🤖 AI: ${text}`, quoteData);
        await api.sendMessage(richMsg, threadId, ThreadType.User);
        console.log(`[Bot] 📤 Streaming: Đã gửi tin nhắn #${messageCount}`);
      } catch (e) {
        console.error("[Bot] Lỗi gửi tin nhắn:", e);
        await api.sendMessage(`🤖 AI: ${text}`, threadId, ThreadType.User);
      }

      // Delay nhỏ giữa các tin nhắn để tự nhiên hơn
      await new Promise((r) => setTimeout(r, 300));
    },

    onComplete: () => {
      console.log(
        `[Bot] ✅ Streaming hoàn tất! Đã gửi ${messageCount} tin nhắn`
      );
    },

    onError: (error: Error) => {
      console.error("[Bot] ❌ Streaming error:", error);
    },
  };
}
