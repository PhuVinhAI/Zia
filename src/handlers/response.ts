import { ThreadType, Reactions } from "../services/zalo.js";
import { getHistory } from "../utils/history.js";
import { createRichMessage } from "../utils/richText.js";

const reactionMap: Record<string, any> = {
  "[HEART]": Reactions.HEART,
  "[HAHA]": Reactions.HAHA,
  "[WOW]": Reactions.WOW,
  "[SAD]": Reactions.SAD,
  "[ANGRY]": Reactions.ANGRY,
  "[LIKE]": Reactions.LIKE,
};

// Parse một phần response
function parseResponsePart(text: string): {
  reaction: any | null;
  reactOnly: boolean;
  noReact: boolean;
  quote: number | null;
  sticker: string | null;
  message: string;
} {
  let cleanText = text;
  let reaction: any | null = null;
  let reactOnly = false;
  let noReact = false;
  let quote: number | null = null;
  let sticker: string | null = null;

  // Check react only
  if (cleanText.includes("[REACT_ONLY]")) {
    reactOnly = true;
    cleanText = cleanText.replace("[REACT_ONLY]", "").trim();
  }

  // Check no react
  if (cleanText.includes("[NO_REACT]")) {
    noReact = true;
    cleanText = cleanText.replace("[NO_REACT]", "").trim();
  }

  // Get reaction
  for (const [tag, react] of Object.entries(reactionMap)) {
    if (cleanText.includes(tag)) {
      reaction = react;
      cleanText = cleanText.replace(tag, "").trim();
      break;
    }
  }

  // Get quote
  const quoteMatch = cleanText.match(/\[QUOTE:(\d+)\]/i);
  if (quoteMatch) {
    quote = parseInt(quoteMatch[1]);
    cleanText = cleanText.replace(quoteMatch[0], "").trim();
  }

  // Get sticker
  const stickerMatch = cleanText.match(/\[STICKER:\s*(.*?)\]/i);
  if (stickerMatch) {
    sticker = stickerMatch[1].trim();
    cleanText = cleanText.replace(stickerMatch[0], "").trim();
  }

  return { reaction, reactOnly, noReact, quote, sticker, message: cleanText };
}

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
  responseText: string,
  threadId: string,
  originalMessage?: any
): Promise<void> {
  // Chia response thành nhiều phần bằng [NEXT]
  const parts = responseText
    .split(/\[NEXT\]/i)
    .map((p) => p.trim())
    .filter(Boolean);
  let hasReacted = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const parsed = parseResponsePart(part);

    // Thả reaction (chỉ lần đầu và nếu có reaction)
    if (!hasReacted && parsed.reaction && !parsed.noReact && originalMessage) {
      try {
        await api.addReaction(parsed.reaction, originalMessage);
        console.log(`[Bot] 💖 Đã thả reaction!`);
        hasReacted = true;
      } catch (e) {
        console.error("[Bot] Lỗi thả reaction:", e);
      }
    }

    // Nếu chỉ react thì skip phần còn lại
    if (parsed.reactOnly) continue;

    // Xác định quote message (chỉ khi AI chủ động quote)
    let quoteData: any = undefined;
    if (parsed.quote !== null) {
      const history = getHistory(threadId);
      if (parsed.quote >= 0 && parsed.quote < history.length) {
        const historyMsg = history[parsed.quote];
        if (historyMsg?.data?.msgId) {
          quoteData = historyMsg.data;
          console.log(`[Bot] 📎 Quote tin nhắn #${parsed.quote}`);
        }
      }
    }

    // Gửi tin nhắn text
    if (parsed.message) {
      try {
        const richMsg = createRichMessage(
          `🤖 AI: ${parsed.message}`,
          quoteData
        );
        await api.sendMessage(richMsg, threadId, ThreadType.User);
      } catch (e) {
        console.error("[Bot] Lỗi gửi tin nhắn:", e);
        await api.sendMessage(
          `🤖 AI: ${parsed.message}`,
          threadId,
          ThreadType.User
        );
      }
    }

    // Gửi sticker
    if (parsed.sticker) {
      if (parsed.message) await new Promise((r) => setTimeout(r, 800));
      await sendSticker(api, parsed.sticker, threadId);
    }

    // Delay giữa các tin nhắn
    if (i < parts.length - 1) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
    }
  }
}
