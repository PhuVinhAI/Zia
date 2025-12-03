/**
 * Media Processor - Chuẩn bị media parts cho Gemini API
 */

import { debugLog } from '../../core/logger/logger.js';
import type { MediaPart } from '../../infrastructure/gemini/gemini.provider.js';
import { CONFIG } from '../../shared/constants/config.js';
import {
  fetchAndConvertToTextBase64,
  isGeminiSupported,
  isTextConvertible,
} from '../../shared/utils/fetch.js';
import type { ClassifiedMessage } from './classifier.js';
import type { QuoteMedia } from './quote.parser.js';

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
          mimeType: item.mimeType || 'application/octet-stream',
        });
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
 */
export async function addQuoteMedia(
  api: any,
  quoteMedia: QuoteMedia,
  media: MediaPart[],
  notes: string[],
): Promise<void> {
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
        mimeType: quoteMedia.mimeType || 'application/octet-stream',
      });
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
