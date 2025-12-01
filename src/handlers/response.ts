import { ThreadType, Reactions } from "../services/zalo.js";
import { getHistory } from "../utils/history.js";
import { createRichMessage } from "../utils/richText.js";
import { AIResponse } from "../config/schema.js";

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

export async function sendResponse(
  api: any,
  response: AIResponse,
  threadId: string,
  originalMessage?: any
): Promise<void> {
  // Thả reaction
  if (response.reaction !== "none" && originalMessage) {
    const reaction = reactionMap[response.reaction];
    if (reaction) {
      try {
        await api.addReaction(reaction, originalMessage);
        console.log(`[Bot] 💖 Đã thả reaction: ${response.reaction}`);
      } catch (e) {
        console.error("[Bot] Lỗi thả reaction:", e);
      }
    }
  }

  // Gửi từng tin nhắn
  for (let i = 0; i < response.messages.length; i++) {
    const msg = response.messages[i];

    // Xác định quote message
    let quoteData: any = undefined;
    if (msg.quoteIndex >= 0) {
      const history = getHistory(threadId);
      if (msg.quoteIndex < history.length) {
        const historyMsg = history[msg.quoteIndex];
        if (historyMsg?.data?.msgId) {
          quoteData = historyMsg.data;
          console.log(`[Bot] 📎 Quote tin nhắn #${msg.quoteIndex}`);
        }
      }
    }

    // Gửi tin nhắn text
    if (msg.text) {
      try {
        const richMsg = createRichMessage(`🤖 AI: ${msg.text}`, quoteData);
        await api.sendMessage(richMsg, threadId, ThreadType.User);
      } catch (e) {
        console.error("[Bot] Lỗi gửi tin nhắn:", e);
        await api.sendMessage(`🤖 AI: ${msg.text}`, threadId, ThreadType.User);
      }
    }

    // Gửi sticker
    if (msg.sticker) {
      if (msg.text) await new Promise((r) => setTimeout(r, 800));
      await sendSticker(api, msg.sticker, threadId);
    }

    // Delay giữa các tin nhắn
    if (i < response.messages.length - 1) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
    }
  }
}
