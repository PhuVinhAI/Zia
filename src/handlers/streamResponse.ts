import { ThreadType, Reactions } from "../services/zalo.js";
import { getRawHistory } from "../utils/history.js";
import { createRichMessage } from "../utils/richText.js";
import { ReactionType } from "../config/schema.js";
import { StreamCallbacks } from "../services/streaming.js";
import {
  saveSentMessage,
  getSentMessage,
  removeSentMessage,
} from "../utils/messageStore.js";

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

// Lưu tin nhắn pending để lấy ID khi selfListen nhận được
const pendingMessages = new Map<
  string,
  (msgId: string, cliMsgId: string) => void
>();

/**
 * Đăng ký listener để bắt tin nhắn của chính mình (selfListen)
 * Gọi 1 lần khi khởi động
 */
export function setupSelfMessageListener(api: any) {
  api.listener.on("message", (message: any) => {
    if (!message.isSelf) return;

    const content = message.data?.content;
    const threadId = message.threadId;
    const msgId = message.data?.msgId;
    const cliMsgId = message.data?.cliMsgId;

    if (!msgId || !cliMsgId) return;

    // Tìm pending message và resolve
    const key = `${threadId}:${content}`;
    const resolver = pendingMessages.get(key);
    if (resolver) {
      resolver(msgId, cliMsgId);
      pendingMessages.delete(key);
    }

    // Lưu vào store để có thể thu hồi sau
    saveSentMessage(threadId, msgId, cliMsgId, content);
  });
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
    // quoteIndex >= 0: quote tin user (từ history)
    // quoteIndex < 0: quote tin bot đã gửi (từ messageStore, -1 = mới nhất)
    onMessage: async (text: string, quoteIndex?: number) => {
      messageCount++;

      // Xác định quote message nếu có
      let quoteData: any = undefined;
      if (quoteIndex !== undefined) {
        if (quoteIndex >= 0) {
          // Quote tin nhắn user từ history
          const rawHistory = getRawHistory(threadId);
          if (quoteIndex < rawHistory.length) {
            const historyMsg = rawHistory[quoteIndex];
            if (historyMsg?.data?.msgId) {
              quoteData = historyMsg.data;
              console.log(`[Bot] 📎 Quote tin user #${quoteIndex}`);
            }
          }
        } else {
          // Quote tin nhắn bot đã gửi (index âm: -1 = mới nhất)
          const botMsg = getSentMessage(threadId, quoteIndex);
          if (botMsg) {
            quoteData = {
              msgId: botMsg.msgId,
              cliMsgId: botMsg.cliMsgId,
              msg: botMsg.content,
            };
            console.log(`[Bot] 📎 Quote tin bot #${quoteIndex}`);
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

    // Thu hồi tin nhắn theo index
    onUndo: async (index: number) => {
      const msg = getSentMessage(threadId, index);
      if (!msg) {
        console.log(
          `[Bot] ⚠️ Không tìm thấy tin nhắn index ${index} để thu hồi`
        );
        return;
      }

      try {
        await api.undo(
          { msgId: msg.msgId, cliMsgId: msg.cliMsgId },
          threadId,
          ThreadType.User
        );
        removeSentMessage(threadId, msg.msgId);
        console.log(
          `[Bot] 🗑️ Đã thu hồi tin nhắn: "${msg.content.substring(0, 30)}..."`
        );
      } catch (e) {
        console.error("[Bot] Lỗi thu hồi tin nhắn:", e);
      }
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
