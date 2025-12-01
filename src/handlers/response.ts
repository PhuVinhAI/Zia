import { ThreadType, Reactions } from "../services/zalo.js";
import { getHistory } from "../utils/history.js";

// Lấy reaction từ response AI
function getReactionFromResponse(text: string): {
  reaction: any;
  cleanText: string;
} {
  const reactionMap: Record<string, any> = {
    "[HEART]": Reactions.HEART,
    "[HAHA]": Reactions.HAHA,
    "[WOW]": Reactions.WOW,
    "[SAD]": Reactions.SAD,
    "[ANGRY]": Reactions.ANGRY,
    "[LIKE]": Reactions.LIKE,
  };

  let reaction = Reactions.LIKE;
  let cleanText = text;

  for (const [tag, react] of Object.entries(reactionMap)) {
    if (text.includes(tag)) {
      reaction = react;
      cleanText = text.replace(tag, "").trim();
      break;
    }
  }

  return { reaction, cleanText };
}

export async function sendResponse(
  api: any,
  responseText: string,
  threadId: string,
  originalMessage?: any
): Promise<void> {
  const { reaction, cleanText: textAfterReaction } =
    getReactionFromResponse(responseText);

  // Thả reaction
  if (originalMessage) {
    try {
      await api.addReaction(reaction, originalMessage);
      console.log(`[Bot] 💖 Đã thả reaction!`);
    } catch (e) {
      console.error("[Bot] Lỗi thả reaction:", e);
    }
  }

  // Kiểm tra quote
  const quoteRegex = /\[QUOTE:(\d+)\]/i;
  const quoteMatch = textAfterReaction.match(quoteRegex);
  let messageToQuote = originalMessage;
  let cleanText = textAfterReaction;

  if (quoteMatch) {
    const quoteIndex = parseInt(quoteMatch[1]);
    const history = getHistory(threadId);

    if (quoteIndex >= 0 && quoteIndex < history.length) {
      const historyMsg = history[quoteIndex];
      if (historyMsg?.data?.msgId && !historyMsg.isSelf) {
        messageToQuote = historyMsg;
        console.log(`[Bot] 📎 Quote tin nhắn #${quoteIndex}`);
      }
    }
    cleanText = textAfterReaction.replace(quoteMatch[0], "").trim();
  }

  // Kiểm tra sticker
  const stickerRegex = /\[STICKER:\s*(.*?)\]/i;
  const stickerMatch = cleanText.match(stickerRegex);
  let finalMessage = cleanText;
  let stickerKeyword: string | null = null;

  if (stickerMatch) {
    stickerKeyword = stickerMatch[1].trim();
    finalMessage = cleanText.replace(stickerMatch[0], "").trim();
  }

  // Gửi tin nhắn
  if (finalMessage) {
    try {
      if (messageToQuote?.data?.msgId) {
        await api.sendMessage(
          { msg: `🤖 AI: ${finalMessage}`, quote: messageToQuote.data },
          threadId,
          ThreadType.User
        );
      } else {
        await api.sendMessage(
          `🤖 AI: ${finalMessage}`,
          threadId,
          ThreadType.User
        );
      }
    } catch (e) {
      console.error("[Bot] Lỗi gửi tin nhắn với quote:", e);
      await api.sendMessage(
        `🤖 AI: ${finalMessage}`,
        threadId,
        ThreadType.User
      );
    }
  }

  // Gửi sticker
  if (stickerKeyword) {
    try {
      console.log(`[Bot] 🎨 Tìm sticker: "${stickerKeyword}"`);
      const stickerIds = await api.getStickers(stickerKeyword);

      if (stickerIds && stickerIds.length > 0) {
        const randomId =
          stickerIds[Math.floor(Math.random() * stickerIds.length)];
        const stickerDetails = await api.getStickersDetail(randomId);

        if (stickerDetails && stickerDetails[0]) {
          await new Promise((r) => setTimeout(r, 1000));
          await api.sendSticker(stickerDetails[0], threadId, ThreadType.User);
          console.log(`[Bot] ✅ Đã gửi sticker!`);
        }
      }
    } catch (e) {
      console.error("[Bot] Lỗi gửi sticker:", e);
    }
  }
}
