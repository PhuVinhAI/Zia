/**
 * Media Processor - Chuẩn bị media parts cho Gemini API
 * Sử dụng Strategy Pattern cho các media handlers
 */

import type { Content } from '@google/genai';
import { CONFIG } from '../../../core/config/config.js';
import { debugLog } from '../../../core/logger/logger.js';
import type { MediaPart } from '../../../infrastructure/ai/providers/gemini/gemini.provider.js';
import {
  fetchAndConvertToTextBase64,
  fetchDocxAndConvertToPdfBase64,
  getMimeTypeFromExt,
  isDocxConvertible,
  isGeminiSupported,
  isTextConvertible,
} from '../../../shared/utils/httpClient.js';
import type { ClassifiedMessage } from '../classifier.js';
import type { QuoteMedia } from '../services/quote.parser.js';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

type MediaHandler = (
  api: any,
  item: ClassifiedMessage,
  notes: string[],
) => Promise<MediaPart | null>;

// ═══════════════════════════════════════════════════
// MEDIA HANDLERS (Strategy Pattern)
// ═══════════════════════════════════════════════════

const mediaHandlers: Record<string, MediaHandler> = {
  sticker: async (api, item, notes) => {
    if (!item.stickerId) return null;
    try {
      const details = await api.getStickersDetail(item.stickerId);
      const url = details?.[0]?.stickerUrl || details?.[0]?.stickerSpriteUrl;
      if (url) return { type: 'image', url, mimeType: 'image/png' };
    } catch {
      debugLog('MEDIA', `Failed to get sticker ${item.stickerId}`);
      notes.push('(Không thể load sticker từ tin cũ)');
    }
    return null;
  },

  image: async (_api, item) => {
    if (!item.url) return null;
    return { type: 'image', url: item.url, mimeType: item.mimeType || 'image/jpeg' };
  },

  doodle: async (_api, item) => {
    if (!item.url) return null;
    return { type: 'image', url: item.url, mimeType: item.mimeType || 'image/jpeg' };
  },

  gif: async (_api, item) => {
    if (!item.url) return null;
    // Gemini không hỗ trợ image/gif, dùng image/png thay thế
    return { type: 'image', url: item.url, mimeType: 'image/png' };
  },

  video: async (_api, item, notes) => {
    // Nếu có URL và (không có fileSize hoặc fileSize < 20MB) → gửi video
    if (item.url && (!item.fileSize || item.fileSize < 20 * 1024 * 1024)) {
      return { type: 'video', url: item.url, mimeType: 'video/mp4' };
    }
    // Nếu video quá lớn hoặc không có URL → dùng thumbnail
    if (item.thumbUrl) {
      console.log(`[Bot] 🖼️ Video quá lớn, dùng thumbnail`);
      notes.push(`(Video ${item.duration || 0}s quá lớn, chỉ có thumbnail)`);
      return { type: 'image', url: item.thumbUrl, mimeType: 'image/jpeg' };
    }
    return null;
  },

  voice: async (_api, item) => {
    if (!item.url) return null;
    return { type: 'audio', url: item.url, mimeType: item.mimeType || 'audio/aac' };
  },

  // Alias for voice (quote parser uses 'audio' type)
  audio: async (_api, item) => {
    if (!item.url) return null;
    return { type: 'audio', url: item.url, mimeType: item.mimeType || 'audio/aac' };
  },

  file: async (_api, item, notes) => {
    if (!item.url || !item.fileExt) return null;

    const ext = item.fileExt;
    const maxSizeMB = CONFIG.fetch?.maxTextConvertSizeMB ?? 20;
    const maxSize = maxSizeMB * 1024 * 1024;

    // Gemini native support
    if (isGeminiSupported(ext)) {
      return { type: 'file', url: item.url, mimeType: getMimeTypeFromExt(ext) };
    }

    // DOC/DOCX → PDF conversion
    if (isDocxConvertible(ext)) {
      if (item.fileSize && item.fileSize > maxSize) {
        const sizeMB = (item.fileSize / 1024 / 1024).toFixed(1);
        console.log(`[Bot] ⚠️ File quá lớn để convert: ${sizeMB}MB`);
        notes.push(`(File "${item.fileName}" quá lớn ${sizeMB}MB, max ${maxSizeMB}MB)`);
        return null;
      }
      console.log(`[Bot] 📄 Convert ${ext.toUpperCase()} sang PDF: ${item.fileName}`);
      const base64 = await fetchDocxAndConvertToPdfBase64(item.url);
      if (base64) return { type: 'file', base64, mimeType: 'application/pdf' };
      notes.push(`(File "${item.fileName}" không convert được)`);
      return null;
    }

    // Text-based files → text conversion
    if (isTextConvertible(ext)) {
      if (item.fileSize && item.fileSize > maxSize) {
        const sizeMB = (item.fileSize / 1024 / 1024).toFixed(1);
        console.log(`[Bot] ⚠️ File quá lớn để convert: ${sizeMB}MB`);
        notes.push(`(File "${item.fileName}" quá lớn ${sizeMB}MB, max ${maxSizeMB}MB)`);
        return null;
      }
      console.log(`[Bot] 📝 Convert file sang text: ${ext}`);
      const base64 = await fetchAndConvertToTextBase64(item.url);
      if (base64) return { type: 'file', base64, mimeType: 'text/plain' };
      notes.push(`(File "${item.fileName}" không đọc được)`);
      return null;
    }

    notes.push(`(File "${item.fileName}" định dạng .${ext} không hỗ trợ)`);
    return null;
  },
};

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

/**
 * Check xem history đã có media (inlineData) từ USER chưa
 */
function historyHasUserMedia(history: Content[]): boolean {
  for (const content of history) {
    if (content.role !== 'user') continue;
    for (const part of content.parts || []) {
      if ('inlineData' in part && part.inlineData?.data) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Lấy mô tả media type cho note
 */
function getMediaTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    image: 'hình ảnh',
    video: 'video',
    audio: 'audio/voice',
    sticker: 'sticker',
    gif: 'GIF',
    doodle: 'hình vẽ tay',
    file: 'file',
  };
  return descriptions[type] || 'media';
}

// ═══════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Chuẩn bị MediaPart[] từ classified messages
 */
export async function prepareMediaParts(
  api: any,
  classified: ClassifiedMessage[],
): Promise<{ media: MediaPart[]; notes: string[] }> {
  const media: MediaPart[] = [];
  const notes: string[] = [];

  for (const item of classified) {
    const handler = mediaHandlers[item.type];
    if (handler) {
      const part = await handler(api, item, notes);
      if (part) media.push(part);
    }
  }

  return { media, notes };
}

/**
 * Thêm media từ quote vào danh sách media
 */
export async function addQuoteMedia(
  api: any,
  quoteMedia: QuoteMedia,
  media: MediaPart[],
  notes: string[],
  history?: Content[],
): Promise<void> {
  // Check nếu history đã có media TỪ USER thì không cần fetch lại
  if (history && historyHasUserMedia(history)) {
    const mediaDesc = getMediaTypeDescription(quoteMedia.type);
    console.log(
      `[Bot] 📎 Quote media (${quoteMedia.type}) đã có trong history từ user, skip fetch`,
    );
    notes.push(`(User đang reply tin nhắn có ${mediaDesc} ở trên, hãy tham khảo ${mediaDesc} đó)`);
    return;
  }

  // Convert QuoteMedia to ClassifiedMessage format for handler
  const item: ClassifiedMessage = {
    type: quoteMedia.type as any,
    message: null, // Quote không có message gốc
    url: quoteMedia.url,
    thumbUrl: quoteMedia.thumbUrl,
    duration: quoteMedia.duration,
    stickerId: quoteMedia.stickerId,
    mimeType: quoteMedia.mimeType,
    fileExt: quoteMedia.fileExt,
    fileName: quoteMedia.title,
  };

  const handler = mediaHandlers[quoteMedia.type];
  if (handler) {
    console.log(`[Bot] 📎 Đang fetch ${quoteMedia.type} từ quote...`);
    const part = await handler(api, item, notes);
    if (part) media.push(part);
  }
}
