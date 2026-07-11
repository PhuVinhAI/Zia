/**
 * Message Sender - Shared module để gửi tin nhắn với hỗ trợ mention/tag
 * Dùng cho Gateway (response handler)
 *
 * Features:
 * - Parse cú pháp [mention:ID:Name] thành @Name với Zalo mention format
 * - Auto-chunking tin nhắn dài
 * - Parse markdown (bold, italic, code blocks, tables, mermaid)
 * - Gửi media images, code files, links
 */

import sharp from 'sharp';
import { CONFIG } from '../../../core/config/config.js';
import { debugLog, logError, logMessage, logZaloAPI } from '../../../core/logger/logger.js';
import { ThreadType } from '../../../infrastructure/messaging/zalo/zalo.service.js';
import { http } from '../httpClient.js';
import {
  type CodeBlock,
  getFileExtension,
  type MediaImage,
  parseMarkdownToZalo,
} from '../markdown/markdownToZalo.js';
import { fixStuckTags } from '../tagFixer.js';
import { splitMessage } from './messageChunker.js';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface MentionInfo {
  pos: number;
  uid: string;
  len: number;
}

export interface SendMessageOptions {
  /** Quote data để reply tin nhắn */
  quoteData?: any;
  /** Có parse markdown không (default: true) */
  parseMarkdown?: boolean;
  /** Có gửi media images (tables, mermaid) không (default: true) */
  sendMediaImages?: boolean;
  /** Có gửi code files không (default: true) */
  sendCodeFiles?: boolean;
  /** Có gửi links không (default: true) */
  sendLinks?: boolean;
  /** Có parse và gửi sticker [sticker:keyword] không (default: true) */
  sendStickers?: boolean;
  /** Source identifier cho logging */
  source?: string;
}

export interface SendMessageResult {
  success: boolean;
  chunks: number;
  msgId?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════
// THREAD TYPE STORE
// ═══════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════
// MENTION PARSER
// ═══════════════════════════════════════════════════

/**
 * Parse cú pháp [mention:ID:Name] từ text
 * Input: "Chào [mention:123456:Nguyễn Văn A] nhé"
 * Output: { text: "Chào @Nguyễn Văn A nhé", mentions: [{ uid: '123456', len: 13, pos: 5 }] }
 */
export function parseMentions(inputText: string): { text: string; mentions: MentionInfo[] } {
  const mentions: MentionInfo[] = [];

  // Fix stuck tags trước
  const text = inputText.replace(/\]([^\s[\]])/g, '] $1').replace(/([^\s[\]])\[/g, '$1 [');

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

// ═══════════════════════════════════════════════════
// MEDIA SENDERS
// ═══════════════════════════════════════════════════

/**
 * Gửi media image (table/mermaid PNG) từ buffer
 */
export async function sendMediaImage(api: any, image: MediaImage, threadId: string): Promise<void> {
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
export async function sendCodeFile(
  api: any,
  codeBlock: CodeBlock,
  threadId: string,
): Promise<void> {
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

/**
 * Gửi link với preview
 */
export async function sendLink(
  api: any,
  link: string,
  message: string | undefined,
  threadId: string,
): Promise<void> {
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

/**
 * Gửi sticker theo keyword
 */
export async function sendSticker(api: any, keyword: string, threadId: string): Promise<void> {
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
 * Parse tag [sticker:keyword] từ text
 * Trả về danh sách keywords và text đã loại bỏ sticker tags
 */
export function parseStickers(text: string): { text: string; stickers: string[] } {
  // Fix stuck tags trước
  const fixedText = fixStuckTags(text);

  const stickers: string[] = [];
  const regex = /\[sticker:(\w+)\]/gi;
  let match;

  while ((match = regex.exec(fixedText)) !== null) {
    stickers.push(match[1]);
  }

  // Loại bỏ sticker tags khỏi text
  const cleanText = fixedText.replace(regex, '').trim();

  return { text: cleanText, stickers };
}

/**
 * Gửi ảnh từ URL
 */
export async function sendImageFromUrl(
  api: any,
  url: string,
  caption: string | undefined,
  threadId: string,
): Promise<void> {
  const threadType = getThreadType(threadId);
  try {
    debugLog('IMAGE', `Sending image from URL: ${url}`);
    console.log(`[Bot] 🖼️ Đang tải ảnh từ URL...`);

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

    const metadata = await sharp(buffer).metadata();

    const attachment = {
      filename: `image_${Date.now()}.${metadata.format || 'jpg'}`,
      data: buffer,
      metadata: {
        width: metadata.width || 0,
        height: metadata.height || 0,
        totalSize: buffer.length,
      },
    };

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

// ═══════════════════════════════════════════════════
// MAIN SEND MESSAGE FUNCTION
// ═══════════════════════════════════════════════════

/**
 * Gửi tin nhắn text với đầy đủ tính năng:
 * - Parse mentions [mention:ID:Name]
 * - Parse markdown (bold, italic, code blocks, tables, mermaid)
 * - Auto-chunking tin nhắn dài
 * - Gửi media images, code files, links
 *
 * @param api - Zalo API instance
 * @param text - Nội dung tin nhắn (có thể chứa [mention:ID:Name] và markdown)
 * @param threadId - ID của thread (group hoặc user)
 * @param options - Các tùy chọn bổ sung
 */
export async function sendTextMessage(
  api: any,
  text: string,
  threadId: string,
  options: SendMessageOptions = {},
): Promise<SendMessageResult> {
  const {
    quoteData,
    parseMarkdown = true,
    sendMediaImages = true,
    sendCodeFiles = true,
    sendLinks = true,
    sendStickers = true,
    source = 'unknown',
  } = options;

  const threadType = getThreadType(threadId);

  debugLog('MSG_SENDER', `[${source}] Sending message to ${threadId}: ${text.substring(0, 50)}...`);

  try {
    // 0. Parse stickers TRƯỚC (extract [sticker:keyword] tags)
    let stickers: string[] = [];
    let textWithoutStickers = text;
    if (sendStickers) {
      const stickerResult = parseStickers(text);
      stickers = stickerResult.stickers;
      textWithoutStickers = stickerResult.text;
      if (stickers.length > 0) {
        debugLog('MSG_SENDER', `[${source}] Found ${stickers.length} sticker tags`);
      }
    }

    // 1. Parse markdown TRƯỚC để extract code blocks, tables, mermaid và clean markdown syntax
    // QUAN TRỌNG: Phải parse markdown trước mentions vì markdown syntax (**bold**, *italic*)
    // sẽ thay đổi độ dài text, làm lệch vị trí (pos) của mentions
    let parsed: Awaited<ReturnType<typeof parseMarkdownToZalo>>;
    if (parseMarkdown) {
      parsed = await parseMarkdownToZalo(textWithoutStickers);
    } else {
      parsed = {
        text: textWithoutStickers,
        styles: [],
        images: [],
        codeBlocks: [],
        links: [],
      };
    }

    // 2. Parse mentions SAU khi markdown đã được clean
    // Lúc này text đã không còn markdown syntax, pos sẽ chính xác
    const { text: textWithMentions, mentions } = parseMentions(parsed.text);
    parsed.text = textWithMentions;

    // 3. Chunk phần text đã được clean
    const chunks = splitMessage(parsed.text);
    let lastResult: any = null;

    // Tính offset cho mỗi chunk để adjust style positions
    let chunkOffset = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isFirstChunk = i === 0;
      const isLastChunk = i === chunks.length - 1;
      const chunkStart = chunkOffset;
      const chunkEnd = chunkStart + chunk.length;

      try {
        if (chunk.trim()) {
          const richMsg: any = { msg: chunk };

          // Filter và adjust styles cho chunk này
          // Style nằm trong chunk nếu: start >= chunkStart && start < chunkEnd
          if (parseMarkdown && parsed.styles.length > 0) {
            const chunkStyles = parsed.styles
              .filter((s) => {
                const styleEnd = s.start + s.len;
                // Style overlap với chunk
                return s.start < chunkEnd && styleEnd > chunkStart;
              })
              .map((s) => {
                // Adjust position relative to chunk start
                const adjustedStart = Math.max(0, s.start - chunkStart);
                const styleEnd = s.start + s.len;
                const adjustedEnd = Math.min(chunk.length, styleEnd - chunkStart);
                const adjustedLen = adjustedEnd - adjustedStart;

                return {
                  start: adjustedStart,
                  len: adjustedLen,
                  st: s.st,
                };
              })
              .filter((s) => s.len > 0); // Chỉ giữ styles có length > 0

            if (chunkStyles.length > 0) {
              richMsg.styles = chunkStyles;
            }
          }

          // Thêm mentions vào chunk đầu tiên
          if (isFirstChunk && mentions.length > 0) {
            const chunkMentions = mentions.filter((m) => m.pos < chunk.length);
            if (chunkMentions.length > 0) {
              richMsg.mentions = chunkMentions;
              debugLog('MSG_SENDER', `[${source}] Adding ${chunkMentions.length} mentions`);
            }
          }

          // Thêm quote vào chunk đầu tiên
          if (isFirstChunk && quoteData) {
            richMsg.quote = quoteData;
          }

          lastResult = await api.sendMessage(richMsg, threadId, threadType);
          logZaloAPI(
            'sendMessage',
            { message: richMsg, threadId, chunk: i + 1, total: chunks.length, source },
            lastResult,
          );
          logMessage('OUT', threadId, { type: 'text', text: chunk, chunk: i + 1, source });
        }

        // Update offset cho chunk tiếp theo
        chunkOffset += chunk.length;

        // Gửi media images ở chunk cuối
        const mediaDelayMs = CONFIG.messageSender?.mediaDelayMs ?? 300;
        if (isLastChunk && sendMediaImages) {
          for (const img of parsed.images) {
            await new Promise((r) => setTimeout(r, mediaDelayMs));
            await sendMediaImage(api, img, threadId);
          }
        }

        // Gửi code files ở chunk cuối
        if (isLastChunk && sendCodeFiles) {
          for (const codeBlock of parsed.codeBlocks) {
            await new Promise((r) => setTimeout(r, mediaDelayMs));
            await sendCodeFile(api, codeBlock, threadId);
          }
        }

        // Gửi links ở chunk cuối
        if (isLastChunk && sendLinks) {
          for (const link of parsed.links) {
            await new Promise((r) => setTimeout(r, mediaDelayMs));
            await sendLink(api, link.url, link.text, threadId);
          }
        }

        // Gửi stickers ở chunk cuối
        if (isLastChunk && sendStickers && stickers.length > 0) {
          for (const keyword of stickers) {
            await new Promise((r) => setTimeout(r, mediaDelayMs));
            await sendSticker(api, keyword, threadId);
          }
        }

        // Delay giữa các chunks
        const chunkDelayMs = CONFIG.messageSender?.chunkDelayMs ?? 400;
        if (!isLastChunk) {
          await new Promise((r) => setTimeout(r, chunkDelayMs));
        }
      } catch (e: any) {
        logError(`sendTextMessage:chunk[${source}]`, e);
        // Fallback: gửi text thuần
        try {
          lastResult = await api.sendMessage(chunk, threadId, threadType);
        } catch (fallbackErr: any) {
          logError(`sendTextMessage:fallback[${source}]`, fallbackErr);
        }
      }
    }

    if (chunks.length > 1) {
      console.log(`[Bot] 📨 [${source}] Đã chia tin nhắn thành ${chunks.length} phần`);
    }

    return {
      success: true,
      chunks: chunks.length,
      msgId: lastResult?.msgId,
    };
  } catch (error: any) {
    logError(`sendTextMessage[${source}]`, error);
    return {
      success: false,
      chunks: 0,
      error: error.message || 'Unknown error',
    };
  }
}
