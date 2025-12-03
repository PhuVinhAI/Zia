/**
 * History Converter - Convert Zalo messages sang Gemini Content format
 */
import type { Content, Part } from '@google/genai';
import { CONFIG } from '../constants/config.js';
import { fetchAsBase64 } from './fetch.js';
import { isSupportedMime } from './tokenCounter.js';

/** Lấy URL media từ message content */
export function getMediaUrl(content: any): string | null {
  return content?.href || content?.hdUrl || content?.thumbUrl || content?.thumb || null;
}

/** Lấy MIME type từ msgType */
export function getMimeType(msgType: string, content: any): string | null {
  if (msgType?.includes('photo') || msgType === 'webchat') return 'image/png';
  if (msgType?.includes('video')) return 'video/mp4';
  if (msgType?.includes('voice')) return 'audio/aac';
  if (msgType?.includes('sticker')) return 'image/png';
  if (msgType?.includes('file')) {
    const params = content?.params ? JSON.parse(content.params) : {};
    const ext = params?.fileExt?.toLowerCase()?.replace('.', '') || '';
    const mimeType = CONFIG.mimeTypes[ext];
    return mimeType && isSupportedMime(mimeType) ? mimeType : null;
  }
  return null;
}

/**
 * Convert raw Zalo message sang Gemini Content format (với media support)
 */
export async function toGeminiContent(msg: any): Promise<Content> {
  const role = msg.isSelf ? 'model' : 'user';
  const content = msg.data?.content;
  const msgType = msg.data?.msgType || '';
  const parts: Part[] = [];

  // Text message
  if (typeof content === 'string') {
    parts.push({ text: content });
    return { role, parts };
  }

  // Media messages
  const mediaUrl = getMediaUrl(content);
  const isMedia =
    msgType.includes('photo') ||
    msgType.includes('video') ||
    msgType.includes('voice') ||
    msgType.includes('sticker') ||
    msgType.includes('file') ||
    msgType === 'webchat';

  if (isMedia && mediaUrl) {
    try {
      // Thêm mô tả text
      let description = '';
      if (msgType.includes('sticker')) description = '[Sticker]';
      else if (msgType.includes('photo') || msgType === 'webchat') description = '[Hình ảnh]';
      else if (msgType.includes('video')) {
        const params = content?.params ? JSON.parse(content.params) : {};
        const duration = params?.duration ? Math.round(params.duration / 1000) : 0;
        description = `[Video ${duration}s]`;
      } else if (msgType.includes('voice')) {
        const params = content?.params ? JSON.parse(content.params) : {};
        const duration = params?.duration ? Math.round(params.duration / 1000) : 0;
        description = `[Voice ${duration}s]`;
      } else if (msgType.includes('file')) {
        const fileName = content?.title || 'file';
        description = `[File: ${fileName}]`;
      }

      if (description) {
        parts.push({ text: description });
      }

      // Fetch và thêm media data
      const mimeType = getMimeType(msgType, content);
      if (mimeType) {
        const base64Data = await fetchAsBase64(mediaUrl);
        if (base64Data) {
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType,
            },
          });
          console.log(`[History] 📎 Loaded media: ${description} (${mimeType})`);
        } else {
          parts.push({ text: `${description} (không tải được)` });
        }
      } else {
        // MIME type không được hỗ trợ, chỉ lưu text mô tả
        console.log(`[History] ⚠️ Skipped unsupported media: ${description}`);
      }
    } catch (e) {
      console.error('[History] Error loading media:', e);
      parts.push({ text: '[Media không tải được]' });
    }
  } else {
    // Fallback cho các loại khác
    parts.push({ text: '[Nội dung không xác định]' });
  }

  return { role, parts };
}
