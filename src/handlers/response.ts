import { ThreadType, Reactions } from "../services/zalo.js";
import { getRawHistory } from "../utils/history.js";
import { createRichMessage } from "../utils/richText.js";
import { AIResponse } from "../config/schema.js";
import {
  logZaloAPI,
  logMessage,
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

    const stickerIds = await api.getStickers(keyword);
    logZaloAPI("getStickers", { keyword }, stickerIds);
    debugLog(
      "STICKER",
      `Found ${stickerIds?.length || 0} stickers for "${keyword}"`
    );

    if (stickerIds?.length > 0) {
      const randomId =
        stickerIds[Math.floor(Math.random() * stickerIds.length)];
      debugLog("STICKER", `Selected random sticker: ${randomId}`);

      const stickerDetails = await api.getStickersDetail(randomId);
      logZaloAPI("getStickersDetail", { stickerId: randomId }, stickerDetails);

      if (stickerDetails?.[0]) {
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

/**
 * Gửi response từ AI
 * @param allMessages - Danh sách tất cả tin nhắn trong batch (để quote/react đúng tin)
 */
export async function sendResponse(
  api: any,
  response: AIResponse,
  threadId: string,
  originalMessage?: any,
  allMessages?: any[]
): Promise<void> {
  debugLog(
    "RESPONSE",
    `sendResponse: thread=${threadId}, reactions=${
      response.reactions.length
    }, messages=${response.messages.length}, batchSize=${
      allMessages?.length || 1
    }`
  );
  logStep("sendResponse:start", {
    threadId,
    reactions: response.reactions,
    messageCount: response.messages.length,
    batchSize: allMessages?.length || 1,
  });

  // Thả nhiều reaction
  if (response.reactions.length > 0) {
    for (const r of response.reactions) {
      // Kiểm tra xem có phải reaction với index không (format: "0:heart" hoặc "heart")
      let reactionType = r;
      let targetMessage = originalMessage;

      if (r.includes(":")) {
        const [indexStr, type] = r.split(":");
        const index = parseInt(indexStr);
        reactionType = type;

        // Nếu có allMessages và index hợp lệ, lấy tin nhắn tương ứng
        if (allMessages && index >= 0 && index < allMessages.length) {
          targetMessage = allMessages[index];
          debugLog(
            "RESPONSE",
            `Reaction ${type} targeting message index ${index}`
          );
        }
      }

      const reaction = reactionMap[reactionType];
      if (reaction && targetMessage) {
        try {
          debugLog("RESPONSE", `Sending reaction: ${reactionType}`);
          const result = await api.addReaction(reaction, targetMessage);
          logZaloAPI(
            "addReaction",
            { reaction: reactionType, msgId: targetMessage?.data?.msgId },
            result
          );

          console.log(`[Bot] 💖 Đã thả reaction: ${reactionType}`);
          logMessage("OUT", threadId, {
            type: "reaction",
            reaction: reactionType,
          });

          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (e: any) {
          logZaloAPI(
            "addReaction",
            { reaction: reactionType, threadId },
            null,
            e
          );
          logError("sendResponse:reaction", e);
          console.error("[Bot] Lỗi thả reaction:", e);
        }
      }
    }
  }

  // Gửi từng tin nhắn
  for (let i = 0; i < response.messages.length; i++) {
    const msg = response.messages[i];
    debugLog(
      "RESPONSE",
      `Sending message ${i + 1}/${
        response.messages.length
      }: text="${msg.text?.substring(0, 50)}...", sticker=${
        msg.sticker
      }, quoteIndex=${msg.quoteIndex}`
    );

    // Xác định quote message
    let quoteData: any = undefined;
    if (msg.quoteIndex >= 0) {
      // Ưu tiên quote từ batch messages (nếu có)
      if (allMessages && msg.quoteIndex < allMessages.length) {
        const batchMsg = allMessages[msg.quoteIndex];
        if (batchMsg?.data?.msgId) {
          quoteData = batchMsg.data;
          console.log(`[Bot] 📎 Quote tin nhắn batch #${msg.quoteIndex}`);
          debugLog(
            "RESPONSE",
            `Quote batch message #${msg.quoteIndex}: msgId=${quoteData.msgId}`
          );
        }
      } else {
        // Fallback: quote từ history
        const rawHistory = getRawHistory(threadId);
        if (msg.quoteIndex < rawHistory.length) {
          const historyMsg = rawHistory[msg.quoteIndex];
          if (historyMsg?.data?.msgId) {
            quoteData = historyMsg.data;
            console.log(`[Bot] 📎 Quote tin nhắn history #${msg.quoteIndex}`);
            debugLog(
              "RESPONSE",
              `Quote history message #${msg.quoteIndex}: msgId=${quoteData.msgId}`
            );
          }
        }
      }
    }

    // Gửi tin nhắn text
    if (msg.text) {
      try {
        const richMsg = createRichMessage(`🤖 AI: ${msg.text}`, quoteData);
        debugLog(
          "RESPONSE",
          `Sending text message: ${msg.text.substring(0, 100)}...`
        );
        const result = await api.sendMessage(
          richMsg,
          threadId,
          ThreadType.User
        );
        logZaloAPI("sendMessage", { message: richMsg, threadId }, result);
        logMessage("OUT", threadId, {
          type: "text",
          text: msg.text,
          quoteIndex: msg.quoteIndex,
        });
      } catch (e: any) {
        logZaloAPI("sendMessage", { text: msg.text, threadId }, null, e);
        logError("sendResponse:text", e);
        console.error("[Bot] Lỗi gửi tin nhắn:", e);
        await api.sendMessage(`🤖 AI: ${msg.text}`, threadId, ThreadType.User);
      }
    }

    // Gửi sticker
    if (msg.sticker) {
      if (msg.text) await new Promise((r) => setTimeout(r, 800));
      debugLog("RESPONSE", `Sending sticker: ${msg.sticker}`);
      await sendSticker(api, msg.sticker, threadId);
    }

    // Delay giữa các tin nhắn
    if (i < response.messages.length - 1) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
    }
  }

  logStep("sendResponse:end", { threadId });
}
