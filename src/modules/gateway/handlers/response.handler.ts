import {
  debugLog,
  logError,
  logMessage,
  logStep,
  logZaloAPI,
} from '../../../core/logger/logger.js';
import type { StreamCallbacks } from '../../../infrastructure/gemini/gemini.provider.js';
import { Reactions } from '../../../infrastructure/zalo/zalo.service.js';
import type { AIResponse } from '../../../shared/types/config.schema.js';
import { getRawHistory } from '../../../shared/utils/history/history.js';
import { splitMessage } from '../../../shared/utils/message/messageChunker.js';
import {
  getThreadType,
  sendImageFromUrl,
  sendSticker,
  sendTextMessage,
  setThreadType,
} from '../../../shared/utils/message/messageSender.js';
import {
  getSentMessage,
  removeSentMessage,
  saveSentMessage,
} from '../../../shared/utils/message/messageStore.js';

// Re-export để các module khác có thể import từ đây (backward compatibility)
export { getThreadType, setThreadType } from '../../../shared/utils/message/messageSender.js';

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

/**
 * Wrapper để gửi tin nhắn text với auto-chunking
 * Sử dụng shared sendTextMessage với source='gateway'
 */
async function sendTextWithChunking(
  api: any,
  text: string,
  threadId: string,
  quoteData?: any,
): Promise<void> {
  await sendTextMessage(api, text, threadId, {
    quoteData,
    source: 'gateway',
  });
}

async function sendCard(api: any, userId: string | undefined, threadId: string) {
  try {
    // Nếu không có userId, gửi card của bot
    const targetUserId = userId || String(api.getContext().uid);
    debugLog('CARD', `Sending card for userId=${targetUserId}`);
    const threadType = getThreadType(threadId);

    const cardData = { userId: targetUserId };
    const result = await api.sendCard(cardData, threadId, threadType);
    logZaloAPI('sendCard', { cardData, threadId }, result);
    console.log(`[Bot] 📇 Đã gửi danh thiếp!`);
    logMessage('OUT', threadId, { type: 'card', userId: targetUserId });
  } catch (e: any) {
    logZaloAPI('sendCard', { userId, threadId }, null, e);
    logError('sendCard', e);
  }
}

// ═══════════════════════════════════════════════════
// SELF MESSAGE LISTENER (cho tính năng thu hồi)
// ═══════════════════════════════════════════════════

export function setupSelfMessageListener(api: any) {
  debugLog('SELF_LISTEN', 'Setting up self message listener');

  api.listener.on('message', (message: any) => {
    if (!message.isSelf) return;

    const content = message.data?.content;
    const threadId = message.threadId;
    const msgId = message.data?.msgId;
    const cliMsgId = message.data?.cliMsgId;

    if (!msgId || !cliMsgId) return;

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    saveSentMessage(threadId, msgId, cliMsgId, contentStr);
    debugLog('SELF_LISTEN', `Saved: msgId=${msgId}`);
  });
}

// ═══════════════════════════════════════════════════
// SHARED QUOTE RESOLVER
// ═══════════════════════════════════════════════════

function resolveQuoteData(
  quoteIndex: number | undefined,
  threadId: string,
  batchMessages?: any[],
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
  batchMessages?: any[],
): Promise<void> {
  let reactionType = reaction;
  let targetMsg = originalMessage;

  if (reaction.includes(':')) {
    const [indexStr, type] = reaction.split(':');
    reactionType = type;
    const index = parseInt(indexStr, 10);
    if (batchMessages && index >= 0 && index < batchMessages.length) {
      targetMsg = batchMessages[index];
    }
  }

  const reactionObj = reactionMap[reactionType];
  if (reactionObj && targetMsg) {
    try {
      const result = await api.addReaction(reactionObj, targetMsg);
      logZaloAPI('addReaction', { reaction: reactionType, msgId: targetMsg?.data?.msgId }, result);
      console.log(`[Bot] 💖 Đã thả reaction: ${reactionType}`);
      logMessage('OUT', threadId, { type: 'reaction', reaction: reactionType });
    } catch (e: any) {
      logError('handleReaction', e);
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
  allMessages?: any[],
): Promise<void> {
  debugLog(
    'RESPONSE',
    `sendResponse: thread=${threadId}, reactions=${response.reactions.length}, messages=${response.messages.length}`,
  );
  logStep('sendResponse:start', {
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
      allMessages,
    );

    if (msg.text) {
      try {
        // Sử dụng sendTextWithChunking để tự động chia nhỏ tin nhắn dài
        await sendTextWithChunking(api, msg.text, threadId, quoteData);
      } catch (e: any) {
        logError('sendResponse:text', e);
        // Fallback cuối cùng: thử gửi text thuần với chunking thủ công
        const threadType = getThreadType(threadId);
        const chunks = splitMessage(msg.text);
        for (const chunk of chunks) {
          try {
            await api.sendMessage(chunk, threadId, threadType);
            await new Promise((r) => setTimeout(r, 300));
          } catch {}
        }
      }
    }

    if (msg.sticker) {
      if (msg.text) await new Promise((r) => setTimeout(r, 800));
      await sendSticker(api, msg.sticker, threadId);
    }

    if (msg.card !== undefined) {
      if (msg.text || msg.sticker) await new Promise((r) => setTimeout(r, 500));
      await sendCard(api, msg.card || undefined, threadId);
    }

    if (i < response.messages.length - 1) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
    }
  }

  logStep('sendResponse:end', { threadId });
}

// ═══════════════════════════════════════════════════
// STREAMING CALLBACKS
// ═══════════════════════════════════════════════════

// Regex để detect và strip tool tags từ text
const TOOL_TAG_REGEX = /\[tool:\w+(?:\s+[^\]]*?)?\](?:\s*\{[\s\S]*?\}\s*\[\/tool\])?/gi;

function stripToolTags(text: string): string {
  return text.replace(TOOL_TAG_REGEX, '').trim();
}

function hasToolTags(text: string): boolean {
  TOOL_TAG_REGEX.lastIndex = 0;
  return TOOL_TAG_REGEX.test(text);
}

export function createStreamCallbacks(
  api: any,
  threadId: string,
  originalMessage?: any,
  messages?: any[],
  enableToolDetection: boolean = false,
): StreamCallbacks & { hasResponse: () => boolean } {
  let messageCount = 0;
  let reactionCount = 0;
  const pendingStickers: string[] = [];
  let completed = false; // Prevent double onComplete
  let toolDetected = false; // Track if tool was detected

  debugLog(
    'STREAM_CB',
    `Creating callbacks: thread=${threadId}, messages=${
      messages?.length || 0
    }, toolDetection=${enableToolDetection}`,
  );

  return {
    // Helper để check xem đã có response nào chưa
    hasResponse: () => messageCount > 0 || reactionCount > 0,

    onReaction: async (reaction: string) => {
      reactionCount++;
      await handleReaction(api, reaction, threadId, originalMessage, messages);
    },

    onSticker: async (keyword: string) => {
      pendingStickers.push(keyword);
      console.log(`[Bot] 🎨 Queue sticker: "${keyword}"`);
    },

    onCard: async (userId?: string) => {
      messageCount++;
      await sendCard(api, userId, threadId);
      await new Promise((r) => setTimeout(r, 300));
    },

    onImage: async (url: string, caption?: string) => {
      messageCount++;
      await sendImageFromUrl(api, url, caption, threadId);
      await new Promise((r) => setTimeout(r, 500));
    },

    onMessage: async (text: string, quoteIndex?: number) => {
      // Strip tool tags từ text trước khi gửi
      const cleanText = stripToolTags(text);

      // Nếu text chỉ có tool tags (sau khi strip thì rỗng), không gửi
      if (!cleanText) {
        if (hasToolTags(text)) {
          toolDetected = true;
          debugLog('STREAM_CB', `Tool detected in message, skipping send`);
        }
        return;
      }

      messageCount++;
      const quoteData = resolveQuoteData(quoteIndex, threadId, messages);

      try {
        // Sử dụng sendTextWithChunking để tự động chia nhỏ tin nhắn dài
        await sendTextWithChunking(api, cleanText, threadId, quoteData);
        console.log(`[Bot] 📤 Streaming: Đã gửi tin nhắn #${messageCount}`);
      } catch (e: any) {
        logError('onMessage', e);
        // Fallback: gửi text thuần với chunking
        const chunks = splitMessage(cleanText);
        for (const chunk of chunks) {
          try {
            const threadType = getThreadType(threadId);
            await api.sendMessage(chunk, threadId, threadType);
            await new Promise((r) => setTimeout(r, 300));
          } catch {}
        }
      }
      await new Promise((r) => setTimeout(r, 300));
    },

    onUndo: async (index: number) => {
      const msg = getSentMessage(threadId, index);
      if (!msg) {
        console.log(`[Bot] ⚠️ Không tìm thấy tin nhắn index ${index} để thu hồi`);
        return;
      }
      try {
        const threadType = getThreadType(threadId);
        const undoData = { msgId: msg.msgId, cliMsgId: msg.cliMsgId };
        const result = await api.undo(undoData, threadId, threadType);
        logZaloAPI('undo', { undoData, threadId }, result);
        removeSentMessage(threadId, msg.msgId);
        console.log(`[Bot] 🗑️ Đã thu hồi tin nhắn`);
        logMessage('OUT', threadId, { type: 'undo', msgId: msg.msgId });
      } catch (e: any) {
        logError('onUndo', e);
      }
    },

    onComplete: async () => {
      // Prevent double execution
      if (completed) {
        debugLog('STREAM_CB', 'onComplete already called, skipping');
        return;
      }
      completed = true;

      // Nếu tool detected và chưa gửi tin nhắn nào, không gửi sticker
      if (toolDetected && messageCount === 0) {
        debugLog('STREAM_CB', 'Tool detected, skipping stickers');
        console.log(`[Bot] 🔧 Phát hiện tool call, đang xử lý...`);
        logStep('streamComplete', {
          threadId,
          messageCount,
          stickerCount: 0,
          toolDetected: true,
        });
        return;
      }

      // Gửi stickers đã queue (chỉ khi không bị abort hoặc có partial response)
      for (const keyword of pendingStickers) {
        await sendSticker(api, keyword, threadId);
      }
      console.log(
        `[Bot] ✅ Streaming hoàn tất! ${messageCount} tin nhắn${
          pendingStickers.length > 0 ? ` + ${pendingStickers.length} sticker` : ''
        }`,
      );
      logStep('streamComplete', {
        threadId,
        messageCount,
        stickerCount: pendingStickers.length,
      });
    },

    onError: async (error: Error) => {
      console.error('[Bot] ❌ Streaming error:', error);
      logError('streamError', error);

      // Gửi tin nhắn thông báo lỗi cho người dùng nếu chưa có response nào
      if (messageCount === 0 && reactionCount === 0) {
        try {
          const threadType = getThreadType(threadId);
          const errorMessage = error.message || '';

          // Kiểm tra nếu là lỗi rate limit (hết quota)
          const isQuotaError =
            errorMessage.includes('quota') ||
            errorMessage.includes('rate limit') ||
            errorMessage.includes('429') ||
            errorMessage.includes('All models are blocked');

          const userFriendlyMessage = isQuotaError
            ? '⚠️ Hệ thống đang quá tải, vui lòng thử lại sau 1-2 phút nhé!'
            : '⚠️ Có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau!';

          await api.sendMessage(userFriendlyMessage, threadId, threadType);
          console.log(`[Bot] 📤 Đã gửi thông báo lỗi cho người dùng`);
          logMessage('OUT', threadId, { type: 'error', error: errorMessage });
        } catch (sendError: any) {
          logError('onError:sendMessage', sendError);
        }
      }
    },
  };
}
