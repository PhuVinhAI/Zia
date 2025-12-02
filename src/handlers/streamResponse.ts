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
import {
  logMessage,
  logZaloAPI,
  debugLog,
  logStep,
  logError,
} from "../utils/logger.js";

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
    debugLog("STICKER", `Searching sticker: "${keyword}"`);

    // API: getStickers
    const stickerIds = await api.getStickers(keyword);
    logZaloAPI("getStickers", { keyword }, stickerIds);
    debugLog("STICKER", `Found ${stickerIds?.length || 0} stickers`);

    if (stickerIds?.length > 0) {
      const randomId =
        stickerIds[Math.floor(Math.random() * stickerIds.length)];
      debugLog("STICKER", `Selected: ${randomId}`);

      // API: getStickersDetail
      const stickerDetails = await api.getStickersDetail(randomId);
      logZaloAPI("getStickersDetail", { stickerId: randomId }, stickerDetails);

      if (stickerDetails?.[0]) {
        // API: sendSticker
        const result = await api.sendSticker(
          stickerDetails[0],
          threadId,
          ThreadType.User
        );
        logZaloAPI(
          "sendSticker",
          { sticker: stickerDetails[0], threadId },
          result
        );

        console.log(`[Bot] ✅ Đã gửi sticker!`);
        logMessage("OUT", threadId, {
          type: "sticker",
          keyword,
          stickerId: randomId,
        });
      }
    } else {
      debugLog("STICKER", `No stickers found for "${keyword}"`);
    }
  } catch (e: any) {
    logZaloAPI("sendSticker", { keyword, threadId }, null, e);
    logError("sendSticker", e);
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
  debugLog("SELF_LISTEN", "Setting up self message listener");

  api.listener.on("message", (message: any) => {
    if (!message.isSelf) return;

    const content = message.data?.content;
    const threadId = message.threadId;
    const msgId = message.data?.msgId;
    const cliMsgId = message.data?.cliMsgId;

    if (!msgId || !cliMsgId) return;

    debugLog(
      "SELF_LISTEN",
      `Self message received: thread=${threadId}, msgId=${msgId}`
    );

    // Convert content thành string để lưu trữ
    // - Text: giữ nguyên
    // - Object (sticker, ảnh...): convert sang JSON string
    const contentStr =
      typeof content === "string" ? content : JSON.stringify(content);

    // Tìm pending message và resolve (chỉ cho text)
    if (typeof content === "string") {
      const key = `${threadId}:${content}`;
      const resolver = pendingMessages.get(key);
      if (resolver) {
        debugLog("SELF_LISTEN", `Resolved pending message: ${key}`);
        resolver(msgId, cliMsgId);
        pendingMessages.delete(key);
      }
    }

    // Lưu vào store để có thể thu hồi sau (mọi loại tin nhắn)
    saveSentMessage(threadId, msgId, cliMsgId, contentStr);
    debugLog(
      "SELF_LISTEN",
      `Saved to message store: msgId=${msgId}, content="${contentStr.substring(
        0,
        50
      )}..."`
    );
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
  const pendingStickers: string[] = []; // Queue sticker để gửi sau cùng

  debugLog("STREAM_CB", `Creating stream callbacks for thread: ${threadId}`);
  logStep("createStreamCallbacks", { threadId });

  return {
    // Gửi reaction ngay khi phát hiện
    onReaction: async (reaction: ReactionType) => {
      debugLog("STREAM_CB", `onReaction: ${reaction}`);
      const reactionObj = reactionMap[reaction];
      if (reactionObj && originalMessage) {
        try {
          // API: addReaction
          const result = await api.addReaction(reactionObj, originalMessage);
          logZaloAPI(
            "addReaction",
            { reaction, reactionObj, msgId: originalMessage?.data?.msgId },
            result
          );

          console.log(`[Bot] 💖 Streaming: Đã thả reaction: ${reaction}`);
          logMessage("OUT", threadId, { type: "reaction", reaction });
        } catch (e: any) {
          logZaloAPI("addReaction", { reaction, threadId }, null, e);
          logError("onReaction", e);
          console.error("[Bot] Lỗi thả reaction:", e);
        }
      }
    },

    // Queue sticker để gửi sau cùng (tránh bị đảo thứ tự)
    onSticker: async (keyword: string) => {
      pendingStickers.push(keyword);
      console.log(`[Bot] 🎨 Queue sticker: "${keyword}"`);
      debugLog(
        "STREAM_CB",
        `onSticker queued: "${keyword}", total=${pendingStickers.length}`
      );
    },

    // Gửi tin nhắn ngay khi tag đóng
    // quoteIndex >= 0: quote tin user (từ history)
    // quoteIndex < 0: quote tin bot đã gửi (từ messageStore, -1 = mới nhất)
    onMessage: async (text: string, quoteIndex?: number) => {
      messageCount++;
      debugLog(
        "STREAM_CB",
        `onMessage #${messageCount}: "${text.substring(
          0,
          50
        )}...", quoteIndex=${quoteIndex}`
      );

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
              debugLog(
                "STREAM_CB",
                `Quote user message #${quoteIndex}: msgId=${quoteData.msgId}`
              );
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
            debugLog(
              "STREAM_CB",
              `Quote bot message #${quoteIndex}: msgId=${quoteData.msgId}`
            );
          }
        }
      }

      try {
        const richMsg = createRichMessage(`🤖 AI: ${text}`, quoteData);

        // API: sendMessage
        const result = await api.sendMessage(
          richMsg,
          threadId,
          ThreadType.User
        );
        logZaloAPI(
          "sendMessage",
          { message: richMsg, threadId, quoteData },
          result
        );

        console.log(`[Bot] 📤 Streaming: Đã gửi tin nhắn #${messageCount}`);
        logMessage("OUT", threadId, { type: "text", text, quoteIndex });
      } catch (e: any) {
        logZaloAPI("sendMessage", { text, threadId }, null, e);
        logError("onMessage", e);
        console.error("[Bot] Lỗi gửi tin nhắn:", e);
        await api.sendMessage(`🤖 AI: ${text}`, threadId, ThreadType.User);
      }

      // Delay nhỏ giữa các tin nhắn để tự nhiên hơn
      await new Promise((r) => setTimeout(r, 300));
    },

    // Thu hồi tin nhắn theo index
    onUndo: async (index: number) => {
      debugLog("STREAM_CB", `onUndo: index=${index}`);
      const msg = getSentMessage(threadId, index);
      if (!msg) {
        console.log(
          `[Bot] ⚠️ Không tìm thấy tin nhắn index ${index} để thu hồi`
        );
        debugLog(
          "STREAM_CB",
          `Undo failed: message not found at index ${index}`
        );
        return;
      }

      try {
        const undoData = { msgId: msg.msgId, cliMsgId: msg.cliMsgId };

        // API: undo
        const result = await api.undo(undoData, threadId, ThreadType.User);
        logZaloAPI("undo", { undoData, threadId }, result);

        removeSentMessage(threadId, msg.msgId);
        console.log(
          `[Bot] 🗑️ Đã thu hồi tin nhắn: "${msg.content.substring(0, 30)}..."`
        );
        logMessage("OUT", threadId, { type: "undo", msgId: msg.msgId });
        debugLog("STREAM_CB", `Undo success: msgId=${msg.msgId}`);
      } catch (e: any) {
        logZaloAPI("undo", { msgId: msg.msgId, threadId }, null, e);
        logError("onUndo", e);
        console.error("[Bot] Lỗi thu hồi tin nhắn:", e);
      }
    },

    onComplete: async () => {
      debugLog(
        "STREAM_CB",
        `onComplete: ${messageCount} messages, ${pendingStickers.length} stickers`
      );

      // Gửi tất cả sticker sau khi hoàn tất (để không bị đảo thứ tự)
      for (const keyword of pendingStickers) {
        await sendSticker(api, keyword, threadId);
      }

      console.log(
        `[Bot] ✅ Streaming hoàn tất! Đã gửi ${messageCount} tin nhắn${
          pendingStickers.length > 0
            ? ` + ${pendingStickers.length} sticker`
            : ""
        }`
      );
      logStep("streamComplete", {
        threadId,
        messageCount,
        stickerCount: pendingStickers.length,
      });
    },

    onError: (error: Error) => {
      console.error("[Bot] ❌ Streaming error:", error);
      logError("streamError", error);
    },
  };
}
