/**
 * Media Processor - Chuẩn bị media parts cho Gemini API
 */

import type { Content } from '@google/genai';
import { debugLog } from '../../core/logger/logger.js';
import type { MediaPart } from '../../infrastructure/gemini/gemini.provider.js';
import { CONFIG } from '../../shared/constants/config.js';
import {
  fetchAndConvertToTextBase64,
  fetchDocxAndConvertToPdfBase64,
  getMimeTypeFromExt,
  isDocxConvertible,
  isGeminiSupported,
  isTextConvertible,
} from '../../shared/utils/httpClient.js';
import type { ClassifiedMessage } from './classifier.js';
import type { QuoteMedia } from './quote.parser.js';

/**
 * Check xem history đã có media (inlineData) từ USER chưa
 * Chỉ check media từ role='user' vì:
 * - Media từ user: AI đã thấy binary data → có thể skip fetch
 * - Media từ model (bot gửi từ tool): AI chỉ biết "đã gửi thành công", chưa thấy binary → cần fetch
 */
function historyHasUserMedia(history: Content[]): boolean {
  for (const content of history) {
    // Chỉ check media từ user, không check từ model
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
  switch (type) {
    case 'image':
      return 'hình ảnh';
    case 'video':
      return 'video';
    case 'audio':
      return 'audio/voice';
    case 'sticker':
      return 'sticker';
    case 'file':
      return 'file';
    default:
      return 'media';
  }
}

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
    if (item.type === 'sticker' && item.stickerId) {
      try {
        const details = await api.getStickersDetail(item.stickerId);
        const url = details?.[0]?.stickerUrl || details?.[0]?.stickerSpriteUrl;
        if (url) media.push({ type: 'image', url, mimeType: 'image/png' });
      } catch {
        debugLog('MEDIA', `Failed to get sticker ${item.stickerId}`);
      }
    } else if (item.type === 'image' && item.url) {
      media.push({
        type: 'image',
        url: item.url,
        mimeType: item.mimeType || 'image/jpeg',
      });
    } else if (item.type === 'doodle' && item.url) {
      // Doodle (vẽ hình) - xử lý như image
      media.push({
        type: 'image',
        url: item.url,
        mimeType: item.mimeType || 'image/jpeg',
      });
    } else if (item.type === 'gif' && item.url) {
      // GIF - xử lý như image
      media.push({
        type: 'image',
        url: item.url,
        mimeType: 'image/gif',
      });
    } else if (item.type === 'video') {
      if (item.url && item.fileSize && item.fileSize < 20 * 1024 * 1024) {
        media.push({ type: 'video', url: item.url, mimeType: 'video/mp4' });
      } else if (item.thumbUrl) {
        console.log(`[Bot] 🖼️ Video quá lớn, dùng thumbnail`);
        media.push({
          type: 'image',
          url: item.thumbUrl,
          mimeType: 'image/jpeg',
        });
        notes.push(`(Video ${item.duration || 0}s quá lớn, chỉ có thumbnail)`);
      }
    } else if (item.type === 'voice' && item.url) {
      media.push({
        type: 'audio',
        url: item.url,
        mimeType: item.mimeType || 'audio/aac',
      });
    } else if (item.type === 'file' && item.url && item.fileExt) {
      if (isGeminiSupported(item.fileExt)) {
        media.push({
          type: 'file',
          url: item.url,
          mimeType: getMimeTypeFromExt(item.fileExt),
        });
      } else if (isDocxConvertible(item.fileExt)) {
        // Convert DOCX sang PDF
        const maxSizeMB = CONFIG.fetch?.maxTextConvertSizeMB ?? 20;
        const maxSize = maxSizeMB * 1024 * 1024;
        if (item.fileSize && item.fileSize > maxSize) {
          const sizeMB = (item.fileSize / 1024 / 1024).toFixed(1);
          console.log(`[Bot] ⚠️ File quá lớn để convert: ${sizeMB}MB`);
          notes.push(`(File "${item.fileName}" quá lớn ${sizeMB}MB, max ${maxSizeMB}MB)`);
        } else {
          console.log(`[Bot] 📄 Convert DOCX sang PDF: ${item.fileName}`);
          const base64 = await fetchDocxAndConvertToPdfBase64(item.url);
          if (base64) media.push({ type: 'file', base64, mimeType: 'application/pdf' });
          else notes.push(`(File "${item.fileName}" không convert được)`);
        }
      } else if (isTextConvertible(item.fileExt)) {
        // Check file size trước khi convert (từ config)
        const maxSizeMB = CONFIG.fetch?.maxTextConvertSizeMB ?? 20;
        const maxSize = maxSizeMB * 1024 * 1024;
        if (item.fileSize && item.fileSize > maxSize) {
          const sizeMB = (item.fileSize / 1024 / 1024).toFixed(1);
          console.log(`[Bot] ⚠️ File quá lớn để convert: ${sizeMB}MB`);
          notes.push(`(File "${item.fileName}" quá lớn ${sizeMB}MB, max ${maxSizeMB}MB)`);
        } else {
          console.log(`[Bot] 📝 Convert file sang text: ${item.fileExt}`);
          const base64 = await fetchAndConvertToTextBase64(item.url);
          if (base64) media.push({ type: 'file', base64, mimeType: 'text/plain' });
          else notes.push(`(File "${item.fileName}" không đọc được)`);
        }
      } else {
        notes.push(`(File "${item.fileName}" định dạng .${item.fileExt} không hỗ trợ)`);
      }
    }
  }

  return { media, notes };
}

/**
 * Thêm media từ quote vào danh sách media
 * Nếu media đã có trong history thì chỉ thêm note nhắc AI, không fetch lại
 */
export async function addQuoteMedia(
  api: any,
  quoteMedia: QuoteMedia,
  media: MediaPart[],
  notes: string[],
  history?: Content[],
): Promise<void> {
  // Check nếu history đã có media TỪ USER thì không cần fetch lại
  // Lưu ý: Media từ bot (tool generate) không được skip vì AI chưa thấy binary data
  if (history && historyHasUserMedia(history)) {
    const mediaDesc = getMediaTypeDescription(quoteMedia.type);
    console.log(`[Bot] 📎 Quote media (${quoteMedia.type}) đã có trong history từ user, skip fetch`);
    notes.push(`(User đang reply tin nhắn có ${mediaDesc} ở trên, hãy tham khảo ${mediaDesc} đó)`);
    return;
  }

  if (quoteMedia.type === 'image' && quoteMedia.url) {
    console.log(`[Bot] 📎 Đang fetch ảnh từ quote...`);
    media.push({
      type: 'image',
      url: quoteMedia.url,
      mimeType: quoteMedia.mimeType || 'image/jpeg',
    });
  } else if (quoteMedia.type === 'video') {
    if (quoteMedia.url) {
      console.log(`[Bot] 📎 Đang fetch video từ quote...`);
      media.push({
        type: 'video',
        url: quoteMedia.url,
        mimeType: 'video/mp4',
      });
    } else if (quoteMedia.thumbUrl) {
      console.log(`[Bot] 📎 Đang fetch thumbnail video từ quote...`);
      media.push({
        type: 'image',
        url: quoteMedia.thumbUrl,
        mimeType: 'image/jpeg',
      });
      notes.push(`(Video ${quoteMedia.duration || 0}s từ tin cũ, chỉ có thumbnail)`);
    }
  } else if (quoteMedia.type === 'audio' && quoteMedia.url) {
    console.log(`[Bot] 📎 Đang fetch audio từ quote...`);
    media.push({
      type: 'audio',
      url: quoteMedia.url,
      mimeType: quoteMedia.mimeType || 'audio/aac',
    });
  } else if (quoteMedia.type === 'sticker' && quoteMedia.stickerId) {
    console.log(`[Bot] 📎 Đang fetch sticker từ quote: ${quoteMedia.stickerId}`);
    try {
      const details = await api.getStickersDetail(quoteMedia.stickerId);
      const stickerUrl = details?.[0]?.stickerUrl || details?.[0]?.stickerSpriteUrl;
      if (stickerUrl) {
        media.push({ type: 'image', url: stickerUrl, mimeType: 'image/png' });
      }
    } catch (e) {
      debugLog('QUOTE', `Failed to get sticker ${quoteMedia.stickerId}: ${e}`);
      notes.push('(Không thể load sticker từ tin cũ)');
    }
  } else if (quoteMedia.type === 'file' && quoteMedia.url) {
    console.log(`[Bot] 📎 Đang fetch file từ quote: ${quoteMedia.title || quoteMedia.fileExt}`);
    const ext = quoteMedia.fileExt || '';
    if (isGeminiSupported(ext)) {
      media.push({
        type: 'file',
        url: quoteMedia.url,
        mimeType: getMimeTypeFromExt(ext),
      });
    } else if (isDocxConvertible(ext)) {
      console.log(`[Bot] 📄 Convert DOCX sang PDF từ quote: ${quoteMedia.title}`);
      const base64 = await fetchDocxAndConvertToPdfBase64(quoteMedia.url);
      if (base64) {
        media.push({ type: 'file', base64, mimeType: 'application/pdf' });
      } else {
        notes.push(`(File "${quoteMedia.title}" từ tin cũ không convert được)`);
      }
    } else if (isTextConvertible(ext)) {
      const base64 = await fetchAndConvertToTextBase64(quoteMedia.url);
      if (base64) {
        media.push({ type: 'file', base64, mimeType: 'text/plain' });
      } else {
        notes.push(`(File "${quoteMedia.title}" từ tin cũ không đọc được)`);
      }
    } else {
      notes.push(`(File "${quoteMedia.title}" định dạng .${ext} không hỗ trợ)`);
    }
  }
}
