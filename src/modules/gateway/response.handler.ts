import sharp from 'sharp';
import { debugLog, logError, logMessage, logStep, logZaloAPI } from '../../core/logger/logger.js';
import type { StreamCallbacks } from '../../infrastructure/gemini/gemini.provider.js';
import { Reactions, ThreadType } from '../../infrastructure/zalo/zalo.service.js';
import type { AIResponse } from '../../shared/types/config.schema.js';
import { getRawHistory } from '../../shared/utils/history.js';
import {
  getSentMessage,
  removeSentMessage,
  saveSentMessage,
} from '../../shared/utils/messageStore.js';
import { createRichMessage } from '../../shared/utils/richText.js';

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

async function sendLink(api: any, link: string, message: string | undefined, threadId: string) {
  try {
    debugLog('LINK', `Sending link: ${link}, message: ${message || '(none)'}`);

    const linkData: any = { link };
    if (message) linkData.msg = message;

    const result = await api.sendLink(linkData, threadId, ThreadType.User);
    logZaloAPI('sendLink', { linkData, threadId }, result);
    console.log(`[Bot] 🔗 Đã gửi link với preview!`);
    logMessage('OUT', threadId, { type: 'link', link, message });
  } catch (e: any) {
    logZaloAPI('sendLink', { link, threadId }, null, e);
    logError('sendLink', e);
  }
}

async function sendCard(api: any, userId: string | undefined, threadId: string) {
  try {
    // Nếu không có userId, gửi card của bot
    const targetUserId = userId || String(api.getContext().uid);
    debugLog('CARD', `Sending card for userId=${targetUserId}`);

    const cardData = { userId: targetUserId };
    const result = await api.sendCard(cardData, threadId, ThreadType.User);
    logZaloAPI('sendCard', { cardData, threadId }, result);
    console.log(`[Bot] 📇 Đã gửi danh thiếp!`);
    logMessage('OUT', threadId, { type: 'card', userId: targetUserId });
  } catch (e: any) {
    logZaloAPI('sendCard', { userId, threadId }, null, e);
    logError('sendCard', e);
  }
}

/**
 * Gửi ảnh từ URL
 */
async function sendImageFromUrl(
  api: any,
  url: string,
  caption: string | undefined,
  threadId: string,
) {
  try {
    debugLog('IMAGE', `Sending image from URL: ${url}`);
    console.log(`[Bot] 🖼️ Đang tải ảnh từ URL...`);

    // Tải ảnh về buffer
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Lấy metadata bằng sharp
    const metadata = await sharp(buffer).metadata();

    // Tạo attachment
    const attachment = {
      filename: `image_${Date.now()}.${metadata.format || 'jpg'}`,
      data: buffer,
      metadata: {
        width: metadata.width || 0,
        height: metadata.height || 0,
        totalSize: buffer.length,
      },
    };

    // Gửi ảnh
    const result = await api.sendMessage(
      {
        msg: caption ? `🤖 AI: ${caption}` : '',
        attachments: [attachment],
      },
      threadId,
      ThreadType.User,
    );

    logZaloAPI('sendMessage:image', { url, caption, threadId }, result);
    console.log(`[Bot] ✅ Đã gửi ảnh!`);
    logMessage('OUT', threadId, { type: 'image', url, caption });
  } catch (e: any) {
    logZaloAPI('sendMessage:image', { url, threadId }, null, e);
    logError('sendImageFromUrl', e);
    // Fallback: gửi link ảnh
    try {
      await api.sendMessage(
        `🤖 AI: Không tải được ảnh, đây là link: ${url}`,
        threadId,
        ThreadType.User,
      );
    } catch {}
  }
}

/**
 * Gửi voice message từ audio buffer
 */
async function sendVoiceFromBuffer(api: any, audioBuffer: Buffer, threadId: string) {
  try {
    debugLog('VOICE', `Sending voice message, size: ${audioBuffer.length} bytes`);
    console.log(`[Bot] 🎤 Đang upload voice...`);

    // 1. Upload file lên Zalo để lấy link
    const uploadResult = await api.uploadAttachment(
      {
        filename: `voice_${Date.now()}.mp3`,
        data: audioBuffer,
        metadata: { totalSize: audioBuffer.length, width: 0, height: 0 },
      },
      threadId,
      ThreadType.User,
    );

    // 2. Lấy URL từ kết quả upload
    const fileUrl = uploadResult[0]?.fileUrl || uploadResult[0]?.normalUrl;
    if (!fileUrl) {
      throw new Error('Không lấy được link file sau khi upload');
    }

    logZaloAPI('uploadAttachment:voice', { threadId, size: audioBuffer.length }, uploadResult);

    // 3. Gửi Voice Message bằng link vừa có
    const result = await api.sendVoice({ voiceUrl: fileUrl }, threadId, ThreadType.User);
    logZaloAPI('sendVoice', { voiceUrl: fileUrl, threadId }, result);

    console.log(`[Bot] ✅ Đã gửi voice message!`);
    logMessage('OUT', threadId, { type: 'voice', size: audioBuffer.length });
  } catch (e: any) {
    logZaloAPI('sendVoice', { threadId }, null, e);
    logError('sendVoiceFromBuffer', e);
    throw e;
  }
}

async function sendSticker(api: any, keyword: string, threadId: string) {
  try {
    console.log(`[Bot] 🎨 Tìm sticker: "${keyword}"`);
    debugLog('STICKER', `Searching sticker: "${keyword}"`);

    const stickerIds = await api.getStickers(keyword);
    logZaloAPI('getStickers', { keyword }, stickerIds);

    if (stickerIds?.length > 0) {
      const randomId = stickerIds[Math.floor(Math.random() * stickerIds.length)];
      const stickerDetails = await api.getStickersDetail(randomId);
      logZaloAPI('getStickersDetail', { stickerId: randomId }, stickerDetails);

      if (stickerDetails?.[0]) {
        const result = await api.sendSticker(stickerDetails[0], threadId, ThreadType.User);
        logZaloAPI('sendSticker', { sticker: stickerDetails[0], threadId }, result);
        console.log(`[Bot] ✅ Đã gửi sticker!`);
        logMessage('OUT', threadId, {
          type: 'sticker',
          keyword,
          stickerId: randomId,
        });
      }
    }
  } catch (e: any) {
    logZaloAPI('sendSticker', { keyword, threadId }, null, e);
    logError('sendSticker', e);
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
        const richMsg = createRichMessage(`🤖 AI: ${msg.text}`, quoteData);
        const result = await api.sendMessage(richMsg, threadId, ThreadType.User);
        logZaloAPI('sendMessage', { message: richMsg, threadId }, result);
        logMessage('OUT', threadId, {
          type: 'text',
          text: msg.text,
          quoteIndex: msg.quoteIndex,
        });
      } catch (e: any) {
        logError('sendResponse:text', e);
        await api.sendMessage(`🤖 AI: ${msg.text}`, threadId, ThreadType.User);
      }
    }

    if (msg.sticker) {
      if (msg.text) await new Promise((r) => setTimeout(r, 800));
      await sendSticker(api, msg.sticker, threadId);
    }

    if (msg.link) {
      if (msg.text || msg.sticker) await new Promise((r) => setTimeout(r, 500));
      await sendLink(api, msg.link, msg.text || undefined, threadId);
    }

    if (msg.card !== undefined) {
      if (msg.text || msg.sticker || msg.link) await new Promise((r) => setTimeout(r, 500));
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

    onLink: async (link: string, message?: string) => {
      messageCount++;
      await sendLink(api, link, message, threadId);
      await new Promise((r) => setTimeout(r, 300));
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

    onVoice: async (audioBuffer: Buffer) => {
      messageCount++;
      await sendVoiceFromBuffer(api, audioBuffer, threadId);
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
        const richMsg = createRichMessage(`🤖 AI: ${cleanText}`, quoteData);
        const result = await api.sendMessage(richMsg, threadId, ThreadType.User);
        logZaloAPI('sendMessage', { message: richMsg, threadId }, result);
        console.log(`[Bot] 📤 Streaming: Đã gửi tin nhắn #${messageCount}`);
        logMessage('OUT', threadId, {
          type: 'text',
          text: cleanText,
          quoteIndex,
        });
      } catch (e: any) {
        logError('onMessage', e);
        await api.sendMessage(`🤖 AI: ${cleanText}`, threadId, ThreadType.User);
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
        const undoData = { msgId: msg.msgId, cliMsgId: msg.cliMsgId };
        const result = await api.undo(undoData, threadId, ThreadType.User);
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

    onError: (error: Error) => {
      console.error('[Bot] ❌ Streaming error:', error);
      logError('streamError', error);
    },
  };
}
