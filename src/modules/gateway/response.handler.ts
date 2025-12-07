import sharp from 'sharp';
import { debugLog, logError, logMessage, logStep, logZaloAPI } from '../../core/logger/logger.js';
import type { StreamCallbacks } from '../../infrastructure/gemini/gemini.provider.js';
import { Reactions, ThreadType } from '../../infrastructure/zalo/zalo.service.js';
import type { AIResponse } from '../../shared/types/config.schema.js';
import { getRawHistory } from '../../shared/utils/history.js';
import { http } from '../../shared/utils/httpClient.js';
import {
  type CodeBlock,
  getFileExtension,
  type MediaImage,
  parseMarkdownToZalo,
} from '../../shared/utils/markdownToZalo.js';
import { splitMessage } from '../../shared/utils/messageChunker.js';
import {
  getSentMessage,
  removeSentMessage,
  saveSentMessage,
} from '../../shared/utils/messageStore.js';

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

// ═══════════════════════════════════════════════════
// MENTION PARSER
// ═══════════════════════════════════════════════════

interface MentionInfo {
  pos: number;
  uid: string;
  len: number;
}

/**
 * Parse cú pháp [mention:ID:Name] từ text
 * Input: "Chào [mention:123456:Nguyễn Văn A] nhé"
 * Output: { text: "Chào @Nguyễn Văn A nhé", mentions: [{ uid: '123456', len: 13, pos: 5 }] }
 */
function parseMentions(text: string): { text: string; mentions: MentionInfo[] } {
  const mentions: MentionInfo[] = [];

  // Regex tìm [mention:ID] hoặc [mention:ID:Name]
  const regex = /\[mention:(\d+)(?::([^\]]+))?\]/g;

  // Tìm tất cả matches trước
  const replacements: { start: number; end: number; replacement: string; uid: string }[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const originalTag = match[0];
    const uid = match[1];
    const name = match[2] || uid; // Dùng tên nếu có, không thì dùng ID
    const mentionText = `@${name}`;

    replacements.push({
      start: match.index,
      end: match.index + originalTag.length,
      replacement: mentionText,
      uid: uid,
    });
  }

  // Thực hiện thay thế từ cuối lên đầu để không làm hỏng index
  let processedText = text;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    const before = processedText.substring(0, r.start);
    const after = processedText.substring(r.end);
    processedText = before + r.replacement + after;
  }

  // Tính lại position sau khi thay thế (từ đầu đến cuối)
  let offset = 0;
  for (const r of replacements) {
    const newPos = r.start + offset;

    mentions.push({
      pos: newPos,
      uid: r.uid,
      len: r.replacement.length,
    });

    // Cập nhật offset cho lần thay thế tiếp theo
    offset += r.replacement.length - (r.end - r.start);
  }

  return { text: processedText, mentions };
}

// Store để lưu ThreadType cho mỗi thread (User hoặc Group)
const threadTypeStore = new Map<string, number>();

/**
 * Lưu ThreadType cho thread
 */
export function setThreadType(threadId: string, threadType: number): void {
  threadTypeStore.set(threadId, threadType);
}

/**
 * Lấy ThreadType cho thread (mặc định là User)
 */
export function getThreadType(threadId: string): number {
  return threadTypeStore.get(threadId) ?? ThreadType.User;
}

/**
 * Gửi tin nhắn text với auto-chunking nếu quá dài
 * Tự động chia nhỏ tin nhắn để tránh lỗi "Nội dung quá dài"
 *
 * FLOW MỚI: Parse mentions → Parse markdown → extract code/table/mermaid → chunk text còn lại
 * Điều này đảm bảo code blocks, tables, mermaid không bị cắt giữa chừng
 */
async function sendTextWithChunking(
  api: any,
  text: string,
  threadId: string,
  quoteData?: any,
): Promise<void> {
  const threadType = getThreadType(threadId);

  // 1. Parse mentions TRƯỚC (chuyển [mention:ID:Name] thành @Name)
  const { text: textWithMentions, mentions } = parseMentions(text);

  // 2. Parse markdown để extract code blocks, tables, mermaid
  const parsed = await parseMarkdownToZalo(textWithMentions);

  // Chunk phần text đã được clean (không còn code blocks, tables)
  const chunks = splitMessage(parsed.text);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const isFirstChunk = i === 0;
    const isLastChunk = i === chunks.length - 1;

    try {
      // Parse inline styles cho chunk (bold, italic, links trong text)
      // Không cần parse lại code blocks vì đã extract ở trên
      const chunkParsed = await parseMarkdownToZalo(chunk);

      if (chunkParsed.text.trim()) {
        const richMsg: any = { msg: chunkParsed.text };
        if (chunkParsed.styles.length > 0) {
          richMsg.styles = chunkParsed.styles;
        }

        // Thêm mentions vào tin nhắn (chỉ ở chunk đầu tiên nếu có mentions)
        // Lọc mentions nằm trong chunk hiện tại
        if (isFirstChunk && mentions.length > 0) {
          // Lọc mentions nằm trong chunk hiện tại
          const chunkMentions = mentions.filter((m) => m.pos < chunkParsed.text.length);

          if (chunkMentions.length > 0) {
            richMsg.mentions = chunkMentions;
            debugLog('MENTION', `Adding ${chunkMentions.length} mentions to message`);
          }
        }

        // Chỉ quote ở chunk đầu tiên
        if (isFirstChunk && quoteData) {
          richMsg.quote = quoteData;
        }

        const result = await api.sendMessage(richMsg, threadId, threadType);
        logZaloAPI(
          'sendMessage',
          { message: richMsg, threadId, chunk: i + 1, total: chunks.length },
          result,
        );
        logMessage('OUT', threadId, { type: 'text', text: chunkParsed.text, chunk: i + 1 });
      }

      // Gửi images (tables, mermaid) - từ parsed gốc, chỉ ở chunk cuối
      if (isLastChunk) {
        for (const img of parsed.images) {
          await new Promise((r) => setTimeout(r, 300));
          await sendMediaImage(api, img, threadId);
        }
      }

      // Gửi code files - từ parsed gốc, chỉ ở chunk cuối
      if (isLastChunk) {
        for (const codeBlock of parsed.codeBlocks) {
          await new Promise((r) => setTimeout(r, 300));
          await sendCodeFile(api, codeBlock, threadId);
        }
      }

      // Gửi links - từ parsed gốc, chỉ ở chunk cuối
      if (isLastChunk) {
        for (const link of parsed.links) {
          await new Promise((r) => setTimeout(r, 300));
          await sendLink(api, link.url, link.text, threadId);
        }
      }

      // Delay giữa các chunks
      if (!isLastChunk) {
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (e: any) {
      logError('sendTextWithChunking', e);
      // Fallback: gửi text thuần
      try {
        await api.sendMessage(chunk, threadId, threadType);
      } catch (fallbackErr: any) {
        logError('sendTextWithChunking:fallback', fallbackErr);
      }
    }
  }

  if (chunks.length > 1) {
    console.log(`[Bot] 📨 Đã chia tin nhắn thành ${chunks.length} phần`);
  }
}

async function sendLink(api: any, link: string, message: string | undefined, threadId: string) {
  try {
    debugLog('LINK', `Sending link: ${link}, message: ${message || '(none)'}`);
    const threadType = getThreadType(threadId);

    const linkData: any = { link };
    if (message) linkData.msg = message;

    const result = await api.sendLink(linkData, threadId, threadType);
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

/**
 * Gửi ảnh từ URL
 * Sử dụng headers giả lập browser đầy đủ để tránh bị chặn 403 Forbidden
 */
async function sendImageFromUrl(
  api: any,
  url: string,
  caption: string | undefined,
  threadId: string,
) {
  const threadType = getThreadType(threadId);
  try {
    debugLog('IMAGE', `Sending image from URL: ${url}`);
    console.log(`[Bot] 🖼️ Đang tải ảnh từ URL...`);

    // Tải ảnh về buffer với headers giả lập browser đầy đủ để tránh bị chặn
    const response = await http.get(url, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
        Referer: new URL(url).origin,
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
    });

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
        msg: caption || '',
        attachments: [attachment],
      },
      threadId,
      threadType,
    );

    logZaloAPI('sendMessage:image', { url, caption, threadId }, result);
    console.log(`[Bot] ✅ Đã gửi ảnh!`);
    logMessage('OUT', threadId, { type: 'image', url, caption });
  } catch (e: any) {
    logZaloAPI('sendMessage:image', { url, threadId }, null, e);
    logError('sendImageFromUrl', e);

    // Fallback: gửi link ảnh với thông báo rõ ràng hơn
    const errorMsg = e.message || 'Unknown error';
    const isBlocked = errorMsg.includes('403');
    const isNotFound = errorMsg.includes('404');

    try {
      if (isBlocked) {
        await api.sendMessage(
          `⚠️ Nguồn ảnh bị chặn truy cập. Link gốc: ${url}`,
          threadId,
          threadType,
        );
      } else if (isNotFound) {
        await api.sendMessage(`⚠️ Ảnh không còn tồn tại hoặc đã bị xóa.`, threadId, threadType);
      } else {
        await api.sendMessage(`⚠️ Không tải được ảnh: ${url}`, threadId, threadType);
      }
    } catch {}
  }
}

async function sendSticker(api: any, keyword: string, threadId: string) {
  try {
    console.log(`[Bot] 🎨 Tìm sticker: "${keyword}"`);
    debugLog('STICKER', `Searching sticker: "${keyword}"`);
    const threadType = getThreadType(threadId);

    const stickerIds = await api.getStickers(keyword);
    logZaloAPI('getStickers', { keyword }, stickerIds);

    if (stickerIds?.length > 0) {
      const randomId = stickerIds[Math.floor(Math.random() * stickerIds.length)];
      const stickerDetails = await api.getStickersDetail(randomId);
      logZaloAPI('getStickersDetail', { stickerId: randomId }, stickerDetails);

      if (stickerDetails?.[0]) {
        const result = await api.sendSticker(stickerDetails[0], threadId, threadType);
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

/**
 * Gửi media image (table/mermaid PNG) từ buffer
 */
async function sendMediaImage(api: any, image: MediaImage, threadId: string) {
  try {
    const typeLabel = image.type === 'table' ? 'bảng' : 'sơ đồ';
    debugLog('MEDIA_IMG', `Sending ${image.type} image: ${image.filename}`);
    console.log(`[Bot] 📊 Đang gửi ${typeLabel} dạng ảnh...`);
    const threadType = getThreadType(threadId);

    const metadata = await sharp(image.buffer).metadata();

    const attachment = {
      filename: image.filename,
      data: image.buffer,
      metadata: {
        width: metadata.width || 0,
        height: metadata.height || 0,
        totalSize: image.buffer.length,
      },
    };

    const result = await api.sendMessage(
      { msg: '', attachments: [attachment] },
      threadId,
      threadType,
    );

    logZaloAPI(
      'sendMessage:mediaImage',
      { filename: image.filename, type: image.type, threadId },
      result,
    );
    console.log(`[Bot] ✅ Đã gửi ${typeLabel}!`);
    logMessage('OUT', threadId, {
      type: 'mediaImage',
      filename: image.filename,
      mediaType: image.type,
    });
  } catch (e: any) {
    logZaloAPI('sendMessage:mediaImage', { threadId }, null, e);
    logError('sendMediaImage', e);
  }
}

/**
 * Gửi code block dạng file
 */
async function sendCodeFile(api: any, codeBlock: CodeBlock, threadId: string) {
  try {
    const ext = getFileExtension(codeBlock.language);
    const filename = `code_${Date.now()}.${ext}`;
    const buffer = Buffer.from(codeBlock.code, 'utf-8');

    debugLog('CODE_FILE', `Sending code file: ${filename}`);
    console.log(`[Bot] 📄 Đang gửi file code (${codeBlock.language})...`);
    const threadType = getThreadType(threadId);

    const attachment = {
      filename,
      data: buffer,
      metadata: {
        totalSize: buffer.length,
      },
    };

    const result = await api.sendMessage(
      { msg: '', attachments: [attachment] },
      threadId,
      threadType,
    );

    logZaloAPI(
      'sendMessage:codeFile',
      { filename, language: codeBlock.language, threadId },
      result,
    );
    console.log(`[Bot] ✅ Đã gửi file code!`);
    logMessage('OUT', threadId, { type: 'codeFile', filename, language: codeBlock.language });
  } catch (e: any) {
    logZaloAPI('sendMessage:codeFile', { threadId }, null, e);
    logError('sendCodeFile', e);
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

    onError: (error: Error) => {
      console.error('[Bot] ❌ Streaming error:', error);
      logError('streamError', error);
    },
  };
}
