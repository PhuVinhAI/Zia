import { ThreadType, Reactions } from "../services/zalo.js";
import { getRawHistory } from "../utils/history.js";
import { createRichMessage } from "../utils/richText.js";
import { AIResponse } from "../config/schema.js";
import { StreamCallbacks } from "../services/gemini.js";
import {
  saveSentMessage,
  getSentMessage,
  removeSentMessage,
} from "../utils/messageStore.js";
import {
  logZaloAPI,
  logMessage,
  debugLog,
  logStep,
  logError,
} from "../utils/logger.js";

// ═══════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════

const reactionMap: Record<string, any> = {
  heart: Reactions.HEART,
  haha: Reactions.HAHA,
  wow: Reactions.WOW,
  sad: Reactions.SAD,
  angry: Reactions.ANGRY,
  like: Reactions.LIKE,
};

async function sendSticker(api: any, keyword: string, threadId: string) {
  try {
    console.log(`[Bot] 🎨 Tìm sticker: "${keyword}"`);
    debugLog("STICKER", `Searching sticker: "${keyword}"`);

    const stickerIds = await api.getStickers(keyword);
    logZaloAPI("getStickers", { keyword }, stickerIds);

    if (stickerIds?.length > 0) {
      const randomId =
        stickerIds[Math.floor(Math.random() * stickerIds.length)];
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
    }
  } catch (e: any) {
    logZaloAPI("sendSticker", { keyword, threadId }, null, e);
    logError("sendSticker", e);
  }
}

// ═══════════════════════════════════════════════════
// SELF MESSAGE LISTENER (cho tính năng thu hồi)
// ═══════════════════════════════════════════════════

export function setupSelfMessageListener(api: any) {
  debugLog("SELF_LISTEN", "Setting up self message listener");

  api.listener.on("message", (message: any) => {
    if (!message.isSelf) return;

    const content = message.data?.content;
    const threadId = message.threadId;
    const msgId = message.data?.msgId;
    const cliMsgId = message.data?.cliMsgId;

    if (!msgId || !cliMsgId) return;

    const contentStr =
      typeof content === "string" ? content : JSON.stringify(content);
    saveSentMessage(threadId, msgId, cliMsgId, contentStr);
    debugLog("SELF_LISTEN", `Saved: msgId=${msgId}`);
  });
}

// ═══════════════════════════════════════════════════
// SHARED QUOTE RESOLVER
// ═══════════════════════════════════════════════════

function resolveQuoteData(
  quoteIndex: number | undefined,
  threadId: string,
  batchMessages?: any[]
): any {
  if (quoteIndex === undefined) return undefined;

  if (quoteIndex >= 0) {
    // Quote từ batch messages hoặc history
    if (batchMessages && quoteIndex < batchMessages.length) {
      const msg = batchMessages[quoteIndex];
      if (msg?.data?.msgId) {
        console.log(`[Bot] 📎 Quote tin #${quoteIndex}`);
        return msg.data;
      }
    }
    // Fallback to history
    const rawHistory = getRawHistory(threadId);
    if (quoteIndex < rawHistory.length) {
      const msg = rawHistory[quoteIndex];
      if (msg?.data?.msgId) return msg.data;
    }
  } else {
    // Quote tin bot đã gửi (index âm)
    const botMsg = getSentMessage(threadId, quoteIndex);
    if (botMsg) {
      console.log(`[Bot] 📎 Quote tin bot #${quoteIndex}`);
      return {
        msgId: botMsg.msgId,
        cliMsgId: botMsg.cliMsgId,
        msg: botMsg.content,
      };
    }
  }
  return undefined;
}

// ═══════════════════════════════════════════════════
// SHARED REACTION HANDLER
// ═══════════════════════════════════════════════════

async function handleReaction(
  api: any,
  reaction: string,
  threadId: string,
  originalMessage?: any,
  batchMessages?: any[]
): Promise<void> {
  let reactionType = reaction;
  let targetMsg = originalMessage;

  if (reaction.includes(":")) {
    const [indexStr, type] = reaction.split(":");
    reactionType = type;
    const index = parseInt(indexStr);
    if (batchMessages && index >= 0 && index < batchMessages.length) {
      targetMsg = batchMessages[index];
    }
  }

  const reactionObj = reactionMap[reactionType];
  if (reactionObj && targetMsg) {
    try {
      const result = await api.addReaction(reactionObj, targetMsg);
      logZaloAPI(
        "addReaction",
        { reaction: reactionType, msgId: targetMsg?.data?.msgId },
        result
      );
      console.log(`[Bot] 💖 Đã thả reaction: ${reactionType}`);
      logMessage("OUT", threadId, { type: "reaction", reaction: reactionType });
    } catch (e: any) {
      logError("handleReaction", e);
    }
  }
}

// ═══════════════════════════════════════════════════
// NON-STREAMING RESPONSE
// ═══════════════════════════════════════════════════

export async function sendResponse(
  api: any,
  response: AIResponse,
  threadId: string,
  originalMessage?: any,
  allMessages?: any[]
): Promise<void> {
  debugLog(
    "RESPONSE",
    `sendResponse: thread=${threadId}, reactions=${response.reactions.length}, messages=${response.messages.length}`
  );
  logStep("sendResponse:start", {
    threadId,
    reactions: response.reactions,
    messageCount: response.messages.length,
  });

  // Thả reactions
  for (const r of response.reactions) {
    await handleReaction(api, r, threadId, originalMessage, allMessages);
    await new Promise((r) => setTimeout(r, 300));
  }

  // Gửi messages
  for (let i = 0; i < response.messages.length; i++) {
    const msg = response.messages[i];
    const quoteData = resolveQuoteData(
      msg.quoteIndex >= 0 ? msg.quoteIndex : undefined,
      threadId,
      allMessages
    );

    if (msg.text) {
      try {
        const richMsg = createRichMessage(`🤖 AI: ${msg.text}`, quoteData);
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
        logError("sendResponse:text", e);
        await api.sendMessage(`🤖 AI: ${msg.text}`, threadId, ThreadType.User);
      }
    }

    if (msg.sticker) {
      if (msg.text) await new Promise((r) => setTimeout(r, 800));
      await sendSticker(api, msg.sticker, threadId);
    }

    if (i < response.messages.length - 1) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
    }
  }

  logStep("sendResponse:end", { threadId });
}

// ═══════════════════════════════════════════════════
// STREAMING CALLBACKS
// ═══════════════════════════════════════════════════

export function createStreamCallbacks(
  api: any,
  threadId: string,
  originalMessage?: any,
  messages?: any[]
): StreamCallbacks {
  let messageCount = 0;
  const pendingStickers: string[] = [];

  debugLog(
    "STREAM_CB",
    `Creating callbacks: thread=${threadId}, messages=${messages?.length || 0}`
  );

  return {
    onReaction: async (reaction: string) => {
      await handleReaction(api, reaction, threadId, originalMessage, messages);
    },

    onSticker: async (keyword: string) => {
      pendingStickers.push(keyword);
      console.log(`[Bot] 🎨 Queue sticker: "${keyword}"`);
    },

    onMessage: async (text: string, quoteIndex?: number) => {
      messageCount++;
      const quoteData = resolveQuoteData(quoteIndex, threadId, messages);

      try {
        const richMsg = createRichMessage(`🤖 AI: ${text}`, quoteData);
        const result = await api.sendMessage(
          richMsg,
          threadId,
          ThreadType.User
        );
        logZaloAPI("sendMessage", { message: richMsg, threadId }, result);
        console.log(`[Bot] 📤 Streaming: Đã gửi tin nhắn #${messageCount}`);
        logMessage("OUT", threadId, { type: "text", text, quoteIndex });
      } catch (e: any) {
        logError("onMessage", e);
        await api.sendMessage(`🤖 AI: ${text}`, threadId, ThreadType.User);
      }
      await new Promise((r) => setTimeout(r, 300));
    },

    onUndo: async (index: number) => {
      const msg = getSentMessage(threadId, index);
      if (!msg) {
        console.log(
          `[Bot] ⚠️ Không tìm thấy tin nhắn index ${index} để thu hồi`
        );
        return;
      }
      try {
        const undoData = { msgId: msg.msgId, cliMsgId: msg.cliMsgId };
        const result = await api.undo(undoData, threadId, ThreadType.User);
        logZaloAPI("undo", { undoData, threadId }, result);
        removeSentMessage(threadId, msg.msgId);
        console.log(`[Bot] 🗑️ Đã thu hồi tin nhắn`);
        logMessage("OUT", threadId, { type: "undo", msgId: msg.msgId });
      } catch (e: any) {
        logError("onUndo", e);
      }
    },

    onComplete: async () => {
      for (const keyword of pendingStickers) {
        await sendSticker(api, keyword, threadId);
      }
      console.log(
        `[Bot] ✅ Streaming hoàn tất! ${messageCount} tin nhắn${
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
