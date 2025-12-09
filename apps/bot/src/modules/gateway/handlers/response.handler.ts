import { CONFIG } from '../../../core/config/config.js';
import {
  debugLog,
  logError,
  logMessage,
  logStep,
  logZaloAPI,
} from '../../../core/logger/logger.js';
import type { StreamCallbacks } from '../../../infrastructure/ai/providers/gemini/gemini.provider.js';
import { Reactions } from '../../../infrastructure/messaging/zalo/zalo.service.js';
import type { AIResponse } from '../../../shared/types/config.schema.js';
import { getRawHistory } from '../../../shared/utils/history/history.js';
import { splitMessage } from '../../../shared/utils/message/messageChunker.js';
import {
  getThreadType,
  sendImageFromUrl,
  sendSticker,
  sendTextMessage,
} from '../../../shared/utils/message/messageSender.js';
import {
  getSentMessage,
  removeSentMessage,
  saveSentMessage,
} from '../../../shared/utils/message/messageStore.js';
import { fixStuckTags } from '../../../shared/utils/tagFixer.js';

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
    // Đảm bảo msgId và cliMsgId là string
    const msgId = message.data?.msgId ? String(message.data.msgId) : null;
    const cliMsgId = message.data?.cliMsgId ? String(message.data.cliMsgId) : '';

    // Chỉ cần msgId là đủ để lưu (cliMsgId có thể rỗng)
    if (!msgId) return;

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    saveSentMessage(threadId, msgId, cliMsgId, contentStr);
    debugLog('SELF_LISTEN', `Saved: msgId=${msgId}`);
  });
}

// ═══════════════════════════════════════════════════
// SHARED QUOTE RESOLVER
// ═══════════════════════════════════════════════════

/**
 * Resolve quote data từ index
 *
 * Logic:
 * 1. Index >= 0: Quote tin nhắn user
 *    - Ưu tiên tìm trong batch messages (tin nhắn vừa gửi trong lượt này)
 *    - Fix Bug 3: Nếu không tìm thấy trong batch, fallback tìm trong rawHistory
 * 2. Index < 0: Quote tin bot đã gửi (từ messageStore)
 *
 * LƯU Ý: AI được prompt với index từ batch hiện tại (0, 1, 2...)
 * Nếu AI dùng index lớn hơn batch size → thử tìm trong history (tin cũ)
 */
function resolveQuoteData(
  quoteIndex: number | undefined,
  threadId: string,
  batchMessages?: any[],
): any {
  if (quoteIndex === undefined) return undefined;

  const batchSize = batchMessages?.length || 0;
  debugLog(
    'QUOTE',
    `resolveQuoteData: index=${quoteIndex}, batchSize=${batchSize}, threadId=${threadId}`,
  );

  if (quoteIndex >= 0) {
    // Quote từ batch messages - ưu tiên tìm trong batch trước
    if (batchMessages && quoteIndex < batchMessages.length) {
      const msg = batchMessages[quoteIndex];
      if (msg?.data?.msgId) {
        const content = msg?.data?.content || '(no content)';
        const preview = typeof content === 'string' ? content.substring(0, 50) : JSON.stringify(content).substring(0, 50);
        debugLog('QUOTE', `✅ Quote batch #${quoteIndex}: msgId=${msg.data.msgId}, content="${preview}..."`);
        console.log(`[Bot] 📎 Quote tin batch #${quoteIndex}`);
        return msg.data;
      }
    }

    // Fix Bug 3: Index vượt quá batch size → thử tìm trong rawHistory (tin nhắn cũ)
    if (quoteIndex >= batchSize) {
      const rawHistory = getRawHistory(threadId);
      // rawHistory lưu theo thứ tự thời gian, index 0 = tin cũ nhất
      // AI có thể muốn quote tin gần đây trong history
      // Tính index từ cuối history: quoteIndex = 0 → tin mới nhất trong history
      const historyIndex = rawHistory.length - 1 - (quoteIndex - batchSize);
      
      if (historyIndex >= 0 && historyIndex < rawHistory.length) {
        const historyMsg = rawHistory[historyIndex];
        if (historyMsg?.data?.msgId) {
          const content = historyMsg?.data?.content || '(no content)';
          const preview = typeof content === 'string' ? content.substring(0, 50) : String(content).substring(0, 50);
          debugLog('QUOTE', `✅ Quote history #${quoteIndex} (historyIdx=${historyIndex}): msgId=${historyMsg.data.msgId}, content="${preview}..."`);
          console.log(`[Bot] 📎 Quote tin cũ từ history #${quoteIndex}`);
          return historyMsg.data;
        }
      }
      
      debugLog(
        'QUOTE',
        `⚠️ Index ${quoteIndex} không tìm thấy trong batch (${batchSize}) hoặc history (${rawHistory.length})`,
      );
      console.log(`[Bot] ⚠️ Quote index ${quoteIndex} không hợp lệ, bỏ qua`);
      return undefined;
    }

    debugLog('QUOTE', `❌ No message found for index ${quoteIndex} in batch`);
    return undefined;
  }

  // Quote tin bot đã gửi (index âm)
  const botMsg = getSentMessage(threadId, quoteIndex);
  if (botMsg) {
    debugLog('QUOTE', `✅ Quote bot #${quoteIndex}: msgId=${botMsg.msgId}`);
    console.log(`[Bot] 📎 Quote tin bot #${quoteIndex}`);
    return {
      msgId: botMsg.msgId,
      cliMsgId: botMsg.cliMsgId,
      msg: botMsg.content,
    };
  }
  debugLog('QUOTE', `❌ No bot message found for index ${quoteIndex}`);
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
  if (!reactionObj || !targetMsg) {
    debugLog('REACTION', `Skip reaction: no reactionObj or targetMsg`);
    return;
  }

  // Kiểm tra nếu targetMsg là fake reaction message (không có msgId thực)
  // Fake message được tạo khi user thả reaction vào tin nhắn bot
  if (targetMsg?.data?._isReaction || !targetMsg?.data?.msgId) {
    debugLog('REACTION', `Skip reaction: targetMsg is fake reaction message or has no msgId`);
    return;
  }

  try {
    const result = await api.addReaction(reactionObj, targetMsg);
    logZaloAPI('addReaction', { reaction: reactionType, msgId: targetMsg?.data?.msgId }, result);
    console.log(`[Bot] 💖 Đã thả reaction: ${reactionType}`);
    logMessage('OUT', threadId, { type: 'reaction', reaction: reactionType });
  } catch (e: any) {
    logError('handleReaction', e);
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
  const reactionDelay = CONFIG.responseHandler?.reactionDelayMs ?? 300;
  for (const r of response.reactions) {
    await handleReaction(api, r, threadId, originalMessage, allMessages);
    await new Promise((r) => setTimeout(r, reactionDelay));
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
      const chunkDelay = CONFIG.responseHandler?.chunkDelayMs ?? 300;
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
            await new Promise((r) => setTimeout(r, chunkDelay));
          } catch {}
        }
      }
    }

    if (msg.sticker) {
      const stickerDelay = CONFIG.responseHandler?.stickerDelayMs ?? 800;
      if (msg.text) await new Promise((r) => setTimeout(r, stickerDelay));
      await sendSticker(api, msg.sticker, threadId);
    }

    if (msg.card !== undefined) {
      const cardDelay = CONFIG.responseHandler?.cardDelayMs ?? 500;
      if (msg.text || msg.sticker) await new Promise((r) => setTimeout(r, cardDelay));
      await sendCard(api, msg.card || undefined, threadId);
    }

    if (i < response.messages.length - 1) {
      const msgDelayMin = CONFIG.responseHandler?.messageDelayMinMs ?? 500;
      const msgDelayMax = CONFIG.responseHandler?.messageDelayMaxMs ?? 1000;
      await new Promise((r) =>
        setTimeout(r, msgDelayMin + Math.random() * (msgDelayMax - msgDelayMin)),
      );
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
  // Fix stuck tags trước khi strip
  const fixed = fixStuckTags(text);
  return fixed.replace(TOOL_TAG_REGEX, '').trim();
}

function hasToolTags(text: string): boolean {
  TOOL_TAG_REGEX.lastIndex = 0;
  return TOOL_TAG_REGEX.test(text);
}

/**
 * Loại bỏ nội dung nhại lại - khi AI lặp lại tin nhắn gốc trong quote
 * Ví dụ: "Tin nhắn gốc của user - Câu trả lời" → "Câu trả lời"
 */
function removeEchoedContent(quoteContent: string, originalText: string): string {
  if (!originalText) return quoteContent;

  // Normalize để so sánh
  const normalize = (t: string) =>
    t
      .toLowerCase()
      .replace(/[?!.,;:]+$/g, '')
      .trim();

  const normalizedOriginal = normalize(originalText);
  const normalizedQuote = normalize(quoteContent);

  // Fix Bug: Nếu originalText sau khi normalize là rỗng (chỉ có dấu câu như "." "?" "!")
  // thì không cắt gì cả, trả về quoteContent nguyên vẹn
  if (!normalizedOriginal) {
    return quoteContent;
  }

  // Nếu quote bắt đầu bằng tin nhắn gốc, loại bỏ phần đó
  if (normalizedQuote.startsWith(normalizedOriginal)) {
    const remaining = quoteContent.slice(originalText.length).trim();
    // Loại bỏ các ký tự phân cách đầu tiên nếu có (: - → > etc.)
    return remaining.replace(/^[:\-–—→>]+\s*/, '').trim() || quoteContent;
  }

  // Nếu quote chứa tin nhắn gốc ở đầu với dấu ngoặc kép
  const escapedOriginal = originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const quotedPattern = new RegExp(`^["']?${escapedOriginal}["']?\\s*[:\\-–—→>]?\\s*`, 'i');
  if (quotedPattern.test(quoteContent)) {
    return quoteContent.replace(quotedPattern, '').trim() || quoteContent;
  }

  return quoteContent;
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
      const cardDelay = CONFIG.responseHandler?.cardDelayMs ?? 500;
      await new Promise((r) => setTimeout(r, cardDelay));
    },

    onImage: async (url: string, caption?: string) => {
      messageCount++;
      await sendImageFromUrl(api, url, caption, threadId);
      const imageDelay = CONFIG.responseHandler?.imageDelayMs ?? 500;
      await new Promise((r) => setTimeout(r, imageDelay));
    },

    onMessage: async (text: string, quoteIndex?: number) => {
      // Strip tool tags từ text trước khi gửi
      let cleanText = stripToolTags(text);

      // Nếu text chỉ có tool tags (sau khi strip thì rỗng), không gửi
      if (!cleanText) {
        if (hasToolTags(text)) {
          toolDetected = true;
          debugLog('STREAM_CB', `Tool detected in message, skipping send`);
        }
        return;
      }

      // Loại bỏ nội dung nhại lại nếu đang quote tin nhắn
      if (quoteIndex !== undefined && quoteIndex >= 0 && messages && messages[quoteIndex]) {
        const originalMsg = messages[quoteIndex];
        // Fix Bug 1: Kiểm tra kiểu dữ liệu trước khi gọi toString() để tránh crash với reaction message
        const rawContent = originalMsg?.data?.content || originalMsg?.content;
        const originalText = (typeof rawContent === 'string' ? rawContent : 
          (rawContent != null ? String(rawContent) : '')).trim();

        if (originalText) {
          // Loại bỏ nếu AI lặp lại tin nhắn gốc ở đầu
          cleanText = removeEchoedContent(cleanText, originalText);
        }
      }

      // Nếu sau khi loại bỏ nhại lại mà rỗng, không gửi
      if (!cleanText.trim()) {
        debugLog('STREAM_CB', `Empty after removing echoed content, skipping`);
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
        const chunkDelayMs = CONFIG.responseHandler?.chunkDelayMs ?? 300;
        for (const chunk of chunks) {
          try {
            const threadType = getThreadType(threadId);
            await api.sendMessage(chunk, threadId, threadType);
            await new Promise((r) => setTimeout(r, chunkDelayMs));
          } catch {}
        }
      }
      const chunkDelay = CONFIG.responseHandler?.chunkDelayMs ?? 300;
      await new Promise((r) => setTimeout(r, chunkDelay));
    },

    onUndo: async (index: number) => {
      // Fix Bug Undo: Hỗ trợ cả index âm (mới nhất) và index dương (tin cũ hơn trong cache)
      // index = -1: tin mới nhất, -2: tin thứ 2 từ cuối, ...
      // index = 0: tin cũ nhất trong cache, 1: tin thứ 2 từ đầu, ...
      const msg = getSentMessage(threadId, index);
      if (!msg) {
        console.log(`[Bot] ⚠️ Không tìm thấy tin nhắn index ${index} để thu hồi`);
        debugLog('UNDO', `Message not found: index=${index}, threadId=${threadId}`);
        
        // Gửi thông báo cho user biết không thể thu hồi
        try {
          const threadType = getThreadType(threadId);
          await api.sendMessage(
            '⚠️ Mình không tìm thấy tin nhắn đó trong bộ nhớ. Có thể tin nhắn đã quá cũ (chỉ lưu 20 tin gần nhất) hoặc đã bị thu hồi trước đó rồi.',
            threadId,
            threadType
          );
        } catch {}
        return;
      }
      
      // Kiểm tra thời gian - Zalo thường chỉ cho thu hồi trong 2-5 phút
      const messageAge = Date.now() - msg.timestamp;
      const maxUndoTimeMs = CONFIG.messageStore?.maxUndoTimeMs ?? 120000; // 2 phút mặc định
      
      if (messageAge > maxUndoTimeMs) {
        console.log(`[Bot] ⚠️ Tin nhắn quá cũ (${Math.round(messageAge / 1000)}s), có thể không thu hồi được`);
        debugLog('UNDO', `Message too old: age=${messageAge}ms, max=${maxUndoTimeMs}ms`);
      }
      
      try {
        const threadType = getThreadType(threadId);
        const undoData = { msgId: msg.msgId, cliMsgId: msg.cliMsgId };
        const result = await api.undo(undoData, threadId, threadType);
        logZaloAPI('undo', { undoData, threadId }, result);
        removeSentMessage(threadId, msg.msgId);
        
        // Log nội dung tin nhắn đã thu hồi để debug
        const contentPreview = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
        console.log(`[Bot] 🗑️ Đã thu hồi tin nhắn: "${contentPreview}"`);
        logMessage('OUT', threadId, { type: 'undo', msgId: msg.msgId, content: contentPreview });
      } catch (e: any) {
        logError('onUndo', e);
        
        // Thông báo lỗi cụ thể cho user
        const errorMsg = e.message || '';
        let userMessage = '⚠️ Không thể thu hồi tin nhắn này.';
        
        if (errorMsg.includes('timeout') || errorMsg.includes('expired')) {
          userMessage = '⚠️ Tin nhắn đã quá thời gian cho phép thu hồi (thường là 2 phút).';
        } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
          userMessage = '⚠️ Tin nhắn không tồn tại hoặc đã bị xóa trước đó.';
        }
        
        try {
          const threadType = getThreadType(threadId);
          await api.sendMessage(userMessage, threadId, threadType);
        } catch {}
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
